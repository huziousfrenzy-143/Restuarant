import { PaymentMethod } from '@restaurant-saas/shared-schemas';
import { apiGet, apiPost, apiPut, apiDelete } from './client';

export const paymentMethodsApi = {
  getAll: (orgId: string) => apiGet<PaymentMethod[]>(`/${orgId}/payment-methods`),
  create: (orgId: string, input: any) => apiPost<PaymentMethod>(`/${orgId}/payment-methods`, input),
  update: (orgId: string, id: string, updates: any) => apiPut<PaymentMethod>(`/${orgId}/payment-methods/${id}`, updates),
  delete: (orgId: string, id: string) => apiDelete<void>(`/${orgId}/payment-methods/${id}`)
};
