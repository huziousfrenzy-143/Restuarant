import { InventoryRepository } from './inventory.repository';
import { CreateInventoryItemInput } from '@restaurant-saas/shared-schemas';
import { TenantDbHelper } from '../../db/tenant-connection';

export class InventoryService {
  static async getItems(tenantDb: TenantDbHelper) {
    return await tenantDb(async (client) => InventoryRepository.findAll(client));
  }

  static async getMovements(tenantDb: TenantDbHelper) {
    return await tenantDb(async (client) => InventoryRepository.findMovements(client));
  }

  static async createItem(tenantDb: TenantDbHelper, input: CreateInventoryItemInput) {
    return await tenantDb(async (client) => InventoryRepository.createItem(client, input));
  }

  static async updateItem(tenantDb: TenantDbHelper, id: string, input: any) {
    return await tenantDb(async (client) => InventoryRepository.updateItem(client, id, input));
  }

  static async deleteItem(tenantDb: TenantDbHelper, id: string) {
    return await tenantDb(async (client) => InventoryRepository.deleteItem(client, id));
  }

  static async recordMovement(
    tenantDb: TenantDbHelper,
    itemId: string,
    type: 'purchase' | 'sale_deduction' | 'wastage' | 'adjustment',
    qty: number,
    createdBy: string
  ) {
    return await tenantDb(async (client) => InventoryRepository.recordMovement(client, itemId, type, qty, createdBy));
  }
}
