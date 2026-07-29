import { Response } from 'express';
import { InventoryService } from './inventory.service';
import { CreateInventoryItemInputSchema } from '@restaurant-saas/shared-schemas';
import { TenantRequest } from '../../middlewares/tenant.middleware';

export class InventoryController {
  static async getItems(req: TenantRequest, res: Response) {
    if (!req.tenantDb) {
      return res.status(500).json({ error: { code: 'TENANT_DB_UNAVAILABLE', message: 'Tenant database connection not initialized' } });
    }
    const data = await InventoryService.getItems(req.tenantDb);
    res.json({ data });
  }

  static async getMovements(req: TenantRequest, res: Response) {
    if (!req.tenantDb) {
      return res.status(500).json({ error: { code: 'TENANT_DB_UNAVAILABLE', message: 'Tenant database connection not initialized' } });
    }
    const data = await InventoryService.getMovements(req.tenantDb);
    res.json({ data });
  }

  static async createItem(req: TenantRequest, res: Response) {
    const parse = CreateInventoryItemInputSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid payload', details: parse.error.format() } });
    }

    if (!req.tenantDb) {
      return res.status(500).json({ error: { code: 'TENANT_DB_UNAVAILABLE', message: 'Tenant database connection not initialized' } });
    }

    const item = await InventoryService.createItem(req.tenantDb, parse.data);
    res.status(201).json({ data: item, message: `Raw ingredient stock '${item.name}' registered` });
  }

  static async updateItem(req: TenantRequest, res: Response) {
    if (!req.tenantDb) {
      return res.status(500).json({ error: { code: 'TENANT_DB_UNAVAILABLE', message: 'Tenant database connection not initialized' } });
    }

    const updated = await InventoryService.updateItem(req.tenantDb, req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Inventory item not found' } });
    }
    res.json({ data: updated, message: `Stock item '${updated.name}' updated successfully` });
  }

  static async deleteItem(req: TenantRequest, res: Response) {
    if (!req.tenantDb) {
      return res.status(500).json({ error: { code: 'TENANT_DB_UNAVAILABLE', message: 'Tenant database connection not initialized' } });
    }

    const success = await InventoryService.deleteItem(req.tenantDb, req.params.id);
    if (!success) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Inventory item not found' } });
    }
    res.json({ message: 'Stock item deleted successfully' });
  }

  static async addMovement(req: TenantRequest, res: Response) {
    const { item_id, type, qty } = req.body;
    const userName = req.user?.name || 'Staff';

    if (!req.tenantDb) {
      return res.status(500).json({ error: { code: 'TENANT_DB_UNAVAILABLE', message: 'Tenant database connection not initialized' } });
    }

    const result = await InventoryService.recordMovement(req.tenantDb, item_id, type, qty, userName);
    if (!result) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Inventory item not found' } });
    }

    res.json({ data: result });
  }
}
