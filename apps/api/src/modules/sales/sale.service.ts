import { SaleRepository } from './sale.repository';
import { TenantDbHelper } from '../../db/tenant-connection';

export class SaleService {
  static async getSales(tenantDb: TenantDbHelper) {
    return await tenantDb(async (client) => SaleRepository.findAll(client));
  }

  static async getTodayTotal(tenantDb: TenantDbHelper) {
    return await tenantDb(async (client) => SaleRepository.getTodayTotal(client));
  }

  static async recordSale(tenantDb: TenantDbHelper, payload: any, cashierId: string, cashierName: string) {
    return await tenantDb(async (client) => SaleRepository.create(client, payload, cashierId, cashierName));
  }
}
