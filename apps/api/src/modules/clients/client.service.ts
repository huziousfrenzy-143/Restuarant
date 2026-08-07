import { Response } from 'express';
import { PoolClient } from 'pg';
import { CreateClientInputSchema, Client } from '@restaurant-saas/shared-schemas';
import { TenantRequest } from '../../middlewares/tenant.middleware';
import { TenantDbHelper } from '../../db/tenant-connection';
import { eventBus } from '../../utils/event-bus';

export class ClientRepository {
  static async findAll(client: PoolClient): Promise<Client[]> {
    const res = await client.query(
      `SELECT id, name, phone, address, notes, credit_balance
       FROM clients
       ORDER BY name ASC`
    );
    return res.rows;
  }

  static async create(client: PoolClient, input: any): Promise<Client> {
    const newId = `cli-${Date.now()}`;
    const res = await client.query(
      `INSERT INTO clients (id, name, phone, address, notes, credit_balance)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, phone, address, notes, credit_balance`,
      [newId, input.name, input.phone, input.address || '', input.notes || '', input.credit_balance || 0]
    );
    return res.rows[0];
  }

  static async update(client: PoolClient, id: string, input: any): Promise<Client | null> {
    const res = await client.query(
      `UPDATE clients
       SET name = COALESCE($1, name),
           phone = COALESCE($2, phone),
           address = COALESCE($3, address),
           notes = COALESCE($4, notes),
           credit_balance = COALESCE($5, credit_balance)
       WHERE id = $6
       RETURNING id, name, phone, address, notes, credit_balance`,
      [input.name, input.phone, input.address, input.notes, input.credit_balance, id]
    );
    return res.rows[0] || null;
  }

  static async delete(client: PoolClient, id: string): Promise<boolean> {
    const res = await client.query(`DELETE FROM clients WHERE id = $1 RETURNING id`, [id]);
    return res.rowCount ? res.rowCount > 0 : false;
  }
}

export class ClientService {
  static async getClients(tenantDb: TenantDbHelper) {
    return await tenantDb(async (client) => ClientRepository.findAll(client));
  }

  static async createClient(tenantDb: TenantDbHelper, input: any) {
    return await tenantDb(async (client) => ClientRepository.create(client, input));
  }

  static async updateClient(tenantDb: TenantDbHelper, id: string, input: any) {
    return await tenantDb(async (client) => ClientRepository.update(client, id, input));
  }

  static async deleteClient(tenantDb: TenantDbHelper, id: string) {
    return await tenantDb(async (client) => ClientRepository.delete(client, id));
  }
}

export class ClientController {
  static async getClients(req: TenantRequest, res: Response) {
    if (!req.tenantDb) {
      return res.status(500).json({ error: { code: 'TENANT_DB_UNAVAILABLE', message: 'Tenant database connection not initialized' } });
    }
    const data = await ClientService.getClients(req.tenantDb);
    res.json({ data });
  }

  static async createClient(req: TenantRequest, res: Response) {
    const parse = CreateClientInputSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid payload', details: parse.error.format() } });
    }

    if (!req.tenantDb) {
      return res.status(500).json({ error: { code: 'TENANT_DB_UNAVAILABLE', message: 'Tenant database connection not initialized' } });
    }

    const client = await ClientService.createClient(req.tenantDb, parse.data);

    const orgId = req.params.orgId || req.user?.org_id;
    if (orgId) {
      eventBus.emitOrgEvent(orgId, 'clients');
    }

    res.status(201).json({ data: client, message: `Customer '${client.name}' registered` });
  }

  static async updateClient(req: TenantRequest, res: Response) {
    if (!req.tenantDb) {
      return res.status(500).json({ error: { code: 'TENANT_DB_UNAVAILABLE', message: 'Tenant database connection not initialized' } });
    }

    const updated = await ClientService.updateClient(req.tenantDb, req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Client not found' } });
    }

    const orgId = req.params.orgId || req.user?.org_id;
    if (orgId) {
      eventBus.emitOrgEvent(orgId, 'clients');
    }

    res.json({ data: updated, message: `Customer '${updated.name}' updated successfully` });
  }

  static async payCredit(req: TenantRequest, res: Response) {
    if (!req.tenantDb) {
      return res.status(500).json({ error: { code: 'TENANT_DB_UNAVAILABLE', message: 'Tenant database connection not initialized' } });
    }

    const { amount, payment_method } = req.body;
    const clientId = req.params.id;

    const createdBy = req.user?.name || req.user?.email || 'System CRM';
    const cashierId = req.user?.id || 'usr-system';
    const cashierName = req.user?.name || 'System Cashier';

    const result = await req.tenantDb(async (client) => {
      const cliRes = await client.query(`SELECT * FROM clients WHERE id = $1`, [clientId]);
      if (cliRes.rows.length === 0) return null;

      const currentClient = cliRes.rows[0];
      const payAmount = Number(amount) > 0 ? Number(amount) : Number(currentClient.credit_balance);
      const newBalance = Math.max(0, Number(currentClient.credit_balance) - payAmount);

      const updatedCliRes = await client.query(
        `UPDATE clients SET credit_balance = $1 WHERE id = $2 RETURNING *`,
        [newBalance, clientId]
      );

      const orderId = `ord-cr-${Date.now()}`;
      const orderNumber = `CR-${Math.floor(Math.random() * 900) + 100}`;
      await client.query(
        `INSERT INTO orders (id, order_number, type, status, subtotal, tax, discount, total, client_id, client_name, created_by, created_at)
         VALUES ($1, $2, 'credit_payoff', 'completed', $3, 0, 0, $3, $4, $5, $6, NOW())`,
        [orderId, orderNumber, payAmount, currentClient.id, currentClient.name, createdBy]
      );

      const saleId = `sle-${Date.now()}`;
      await client.query(
        `INSERT INTO sales (id, order_id, order_number, payment_method, payment_method_name, amount_paid, amount_due, cashier_id, cashier_name, paid_at)
         VALUES ($1, $2, $3, $4, $5, $6, 0, $7, $8, NOW())`,
        [saleId, orderId, orderNumber, payment_method || 'cash', (payment_method || 'cash').toUpperCase(), payAmount, cashierId, cashierName]
      );

      return updatedCliRes.rows[0];
    });

    if (!result) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Client not found' } });
    }

    const orgId = req.params.orgId || req.user?.org_id;
    if (orgId) {
      eventBus.emitOrgEvent(orgId, 'clients');
      eventBus.emitOrgEvent(orgId, 'orders');
      eventBus.emitOrgEvent(orgId, 'sales');
    }

    res.json({ data: result, message: `Payment recorded and added to Revenue. Remaining due balance: $${result.credit_balance}` });
  }

  static async deleteClient(req: TenantRequest, res: Response) {
    if (!req.tenantDb) {
      return res.status(500).json({ error: { code: 'TENANT_DB_UNAVAILABLE', message: 'Tenant database connection not initialized' } });
    }

    const success = await ClientService.deleteClient(req.tenantDb, req.params.id);
    if (!success) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Client not found' } });
    }

    const orgId = req.params.orgId || req.user?.org_id;
    if (orgId) {
      eventBus.emitOrgEvent(orgId, 'clients');
    }

    res.json({ message: 'Customer profile deleted successfully' });
  }
}
