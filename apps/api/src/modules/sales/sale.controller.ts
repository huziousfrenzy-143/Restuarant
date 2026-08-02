import { Response } from 'express';
import { SaleService } from './sale.service';
import { CreateSaleInputSchema } from '@restaurant-saas/shared-schemas';
import { TenantRequest } from '../../middlewares/tenant.middleware';


export class SaleController {
  static async getSales(req: TenantRequest, res: Response) {
    if (!req.tenantDb) {
      return res.status(500).json({ error: { code: 'TENANT_DB_UNAVAILABLE', message: 'Tenant database connection not initialized' } });
    }
    const data = await SaleService.getSales(req.tenantDb);
    res.json({ data });
  }

  static async getTodayTotal(req: TenantRequest, res: Response) {
    if (!req.tenantDb) {
      return res.status(500).json({ error: { code: 'TENANT_DB_UNAVAILABLE', message: 'Tenant database connection not initialized' } });
    }
    const total = await SaleService.getTodayTotal(req.tenantDb);
    res.json({ data: { total } });
  }

  static async recordSale(req: TenantRequest, res: Response) {
    const parse = CreateSaleInputSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid sales payload', details: parse.error.format() } });
    }

    if (!req.tenantDb) {
      return res.status(500).json({ error: { code: 'TENANT_DB_UNAVAILABLE', message: 'Tenant database connection not initialized' } });
    }

    const cashierId = req.user?.id || 'usr-sales-1';
    const cashierName = req.user?.name || 'Cashier';

    const sale = await SaleService.recordSale(req.tenantDb, parse.data, cashierId, cashierName);
    res.status(201).json({ data: sale, message: `Sale receipt generated for ${sale.order_number}` });
  }
}
