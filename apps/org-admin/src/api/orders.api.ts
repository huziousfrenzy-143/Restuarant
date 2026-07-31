import { Order, OrderItem, OrderStatus } from '@restaurant-saas/shared-schemas';
import { apiGet, apiPost, apiPut, apiPatch } from './client';

export const ordersApi = {
  getAll: (orgId: string) => apiGet<Order[]>(`/${orgId}/orders`),
  create: (orgId: string, orderData: any) => apiPost<Order>(`/${orgId}/orders`, orderData),
  updateItems: (orgId: string, orderId: string, items: OrderItem[]) => apiPut<void>(`/${orgId}/orders/${orderId}/items`, { items }),
  updateStatus: (orgId: string, orderId: string, status: OrderStatus) => apiPatch<void>(`/${orgId}/orders/${orderId}/status`, { status })
};
