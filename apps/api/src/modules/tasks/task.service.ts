import { Response } from 'express';
import { PoolClient } from 'pg';
import { CreateTaskInputSchema, Task } from '@restaurant-saas/shared-schemas';
import { TenantRequest } from '../../middlewares/tenant.middleware';
import { TenantDbHelper } from '../../db/tenant-connection';
import { eventBus } from '../../utils/event-bus';

export class TaskRepository {
  static async findAll(client: PoolClient): Promise<Task[]> {
    const res = await client.query(
      `SELECT id, title, description, assigned_to_id, assigned_to_name, status, due_at, created_by
       FROM tasks
       ORDER BY due_at ASC`
    );
    return res.rows;
  }

  static async create(client: PoolClient, input: any, createdBy: string = 'Owner'): Promise<Task> {
    const newId = `tsk-${Date.now()}`;
    const dueAt = input.due_at || new Date(Date.now() + 4 * 3600000).toISOString();

    const res = await client.query(
      `INSERT INTO tasks (id, title, description, assigned_to_id, assigned_to_name, status, due_at, created_by)
       VALUES ($1, $2, $3, $4, $5, 'pending', $6, $7)
       RETURNING id, title, description, assigned_to_id, assigned_to_name, status, due_at, created_by`,
      [newId, input.title, input.description || '', input.assigned_to_id, input.assigned_to_name, dueAt, createdBy]
    );
    return res.rows[0];
  }

  static async update(client: PoolClient, id: string, input: any): Promise<Task | null> {
    const res = await client.query(
      `UPDATE tasks
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           assigned_to_id = COALESCE($3, assigned_to_id),
           assigned_to_name = COALESCE($4, assigned_to_name),
           status = COALESCE($5, status),
           due_at = COALESCE($6, due_at)
       WHERE id = $7
       RETURNING id, title, description, assigned_to_id, assigned_to_name, status, due_at, created_by`,
      [input.title, input.description, input.assigned_to_id, input.assigned_to_name, input.status, input.due_at, id]
    );
    return res.rows[0] || null;
  }

  static async delete(client: PoolClient, id: string): Promise<boolean> {
    const res = await client.query(`DELETE FROM tasks WHERE id = $1 RETURNING id`, [id]);
    return res.rowCount ? res.rowCount > 0 : false;
  }

  static async updateStatus(client: PoolClient, id: string, status: 'pending' | 'in_progress' | 'done'): Promise<Task | undefined> {
    const res = await client.query(
      `UPDATE tasks
       SET status = $1
       WHERE id = $2
       RETURNING id, title, description, assigned_to_id, assigned_to_name, status, due_at, created_by`,
      [status, id]
    );
    return res.rows[0];
  }
}

export class TaskService {
  static async getTasks(tenantDb: TenantDbHelper) {
    return await tenantDb(async (client) => TaskRepository.findAll(client));
  }

  static async createTask(tenantDb: TenantDbHelper, input: any, createdBy: string = 'Owner') {
    return await tenantDb(async (client) => TaskRepository.create(client, input, createdBy));
  }

  static async updateTask(tenantDb: TenantDbHelper, id: string, input: any) {
    return await tenantDb(async (client) => TaskRepository.update(client, id, input));
  }

  static async deleteTask(tenantDb: TenantDbHelper, id: string) {
    return await tenantDb(async (client) => TaskRepository.delete(client, id));
  }

  static async updateStatus(tenantDb: TenantDbHelper, id: string, status: any) {
    return await tenantDb(async (client) => TaskRepository.updateStatus(client, id, status));
  }
}

export class TaskController {
  static async getTasks(req: TenantRequest, res: Response) {
    if (!req.tenantDb) {
      return res.status(500).json({ error: { code: 'TENANT_DB_UNAVAILABLE', message: 'Tenant database connection not initialized' } });
    }
    const data = await TaskService.getTasks(req.tenantDb);
    res.json({ data });
  }

  static async createTask(req: TenantRequest, res: Response) {
    const parse = CreateTaskInputSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid payload', details: parse.error.format() } });
    }

    if (!req.tenantDb) {
      return res.status(500).json({ error: { code: 'TENANT_DB_UNAVAILABLE', message: 'Tenant database connection not initialized' } });
    }

    const createdBy = req.user?.name || 'Owner';
    const task = await TaskService.createTask(req.tenantDb, parse.data, createdBy);

    const orgId = req.params.orgId || req.user?.org_id;
    if (orgId) {
      eventBus.emitOrgEvent(orgId, 'tasks');
    }

    res.status(201).json({ data: task, message: 'Task assigned' });
  }

  static async updateTask(req: TenantRequest, res: Response) {
    if (!req.tenantDb) {
      return res.status(500).json({ error: { code: 'TENANT_DB_UNAVAILABLE', message: 'Tenant database connection not initialized' } });
    }

    const updated = await TaskService.updateTask(req.tenantDb, req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Task not found' } });
    }

    const orgId = req.params.orgId || req.user?.org_id;
    if (orgId) {
      eventBus.emitOrgEvent(orgId, 'tasks');
    }

    res.json({ data: updated, message: 'Task updated successfully' });
  }

  static async deleteTask(req: TenantRequest, res: Response) {
    if (!req.tenantDb) {
      return res.status(500).json({ error: { code: 'TENANT_DB_UNAVAILABLE', message: 'Tenant database connection not initialized' } });
    }

    const success = await TaskService.deleteTask(req.tenantDb, req.params.id);
    if (!success) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Task not found' } });
    }

    const orgId = req.params.orgId || req.user?.org_id;
    if (orgId) {
      eventBus.emitOrgEvent(orgId, 'tasks');
    }

    res.json({ message: 'Task deleted successfully' });
  }

  static async updateStatus(req: TenantRequest, res: Response) {
    const { id } = req.params;
    const { status } = req.body;

    if (!req.tenantDb) {
      return res.status(500).json({ error: { code: 'TENANT_DB_UNAVAILABLE', message: 'Tenant database connection not initialized' } });
    }

    const updated = await TaskService.updateStatus(req.tenantDb, id, status);
    if (!updated) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Task not found' } });
    }

    const orgId = req.params.orgId || req.user?.org_id;
    if (orgId) {
      eventBus.emitOrgEvent(orgId, 'tasks');
    }

    res.json({ data: updated });
  }
}
