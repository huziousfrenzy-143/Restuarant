import { Response } from 'express';
import { PaymentMethodService } from './payment-method.service';
import { CreatePaymentMethodInputSchema } from '@restaurant-saas/shared-schemas';
import { TenantRequest } from '../../middlewares/tenant.middleware';

export class PaymentMethodController {
  static async getPaymentMethods(req: TenantRequest, res: Response) {
    if (!req.tenantDb) {
      return res.status(500).json({ error: { code: 'TENANT_DB_UNAVAILABLE', message: 'Tenant database connection not initialized' } });
    }
    const data = await PaymentMethodService.getPaymentMethods(req.tenantDb);
    res.json({ data });
  }

  static async createPaymentMethod(req: TenantRequest, res: Response) {
    const parse = CreatePaymentMethodInputSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid payment method payload', details: parse.error.format() } });
    }

    if (!req.tenantDb) {
      return res.status(500).json({ error: { code: 'TENANT_DB_UNAVAILABLE', message: 'Tenant database connection not initialized' } });
    }

    const pm = await PaymentMethodService.createPaymentMethod(req.tenantDb, parse.data);
    res.status(201).json({ data: pm, message: `Payment method '${pm.name}' created and linked to ledger register!` });
  }

  static async updatePaymentMethod(req: TenantRequest, res: Response) {
    if (!req.tenantDb) {
      return res.status(500).json({ error: { code: 'TENANT_DB_UNAVAILABLE', message: 'Tenant database connection not initialized' } });
    }

    const updated = await PaymentMethodService.updatePaymentMethod(req.tenantDb, req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Payment method not found' } });
    }
    res.json({ data: updated, message: `Payment method '${updated.name}' updated` });
  }

  static async deletePaymentMethod(req: TenantRequest, res: Response) {
    if (!req.tenantDb) {
      return res.status(500).json({ error: { code: 'TENANT_DB_UNAVAILABLE', message: 'Tenant database connection not initialized' } });
    }

    const success = await PaymentMethodService.deletePaymentMethod(req.tenantDb, req.params.id);
    if (!success) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Payment method not found' } });
    }
    res.json({ message: 'Payment method deleted successfully' });
  }
}
