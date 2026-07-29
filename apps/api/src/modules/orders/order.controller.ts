import { Response } from 'express';
import { OrderService } from './order.service';
import { CreateOrderInputSchema, UpdateOrderInputSchema } from '@restaurant-saas/shared-schemas';
import { TenantRequest } from '../../middlewares/tenant.middleware';

export class OrderController {
  static async getOrders(req: TenantRequest, res: Response) {
    if (!req.tenantDb) {
      return res.status(500).json({ error: { code: 'TENANT_DB_UNAVAILABLE', message: 'Tenant database connection not initialized' } });
    }
    const data = await OrderService.getOrders(req.tenantDb);
    res.json({ data });
  }

  static async createOrder(req: TenantRequest, res: Response) {
    const parse = CreateOrderInputSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid order payload', details: parse.error.format() } });
    }

    if (!req.tenantDb) {
      return res.status(500).json({ error: { code: 'TENANT_DB_UNAVAILABLE', message: 'Tenant database connection not initialized' } });
    }

    const createdBy = req.user?.name || 'Cashier';
    const order = await OrderService.createOrder(req.tenantDb, parse.data, createdBy);

    res.status(201).json({ data: order, message: `Order ${order.order_number} created` });
  }

  static async updateOrderItems(req: TenantRequest, res: Response) {
    const parse = UpdateOrderInputSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid items payload', details: parse.error.format() } });
    }

    if (!req.tenantDb) {
      return res.status(500).json({ error: { code: 'TENANT_DB_UNAVAILABLE', message: 'Tenant database connection not initialized' } });
    }

    try {
      const order = await OrderService.updateOrderItems(req.tenantDb, req.params.id, parse.data.items);
      if (!order) {
        return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Order not found' } });
      }
      res.json({ data: order, message: `Order ${order.order_number} items updated successfully` });
    } catch (err: any) {
      res.status(400).json({ error: { code: 'ORDER_MODIFICATION_LOCKED', message: err.message } });
    }
  }

  static async updateOrderStatus(req: TenantRequest, res: Response) {
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Status is required' } });
    }

    if (!req.tenantDb) {
      return res.status(500).json({ error: { code: 'TENANT_DB_UNAVAILABLE', message: 'Tenant database connection not initialized' } });
    }

    const order = await OrderService.updateOrderStatus(req.tenantDb, req.params.id, status);
    if (!order) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Order not found' } });
    }

    res.json({ data: order, message: `Order ${order.order_number} status updated to ${status}` });
  }
}
