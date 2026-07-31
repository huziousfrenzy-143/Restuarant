import { Client } from '@restaurant-saas/shared-schemas';
import { apiGet, apiPost, apiPut, apiDelete } from './client';

export const clientsApi = {
  getAll: (orgId: string) => apiGet<Client[]>(`/${orgId}/clients`),
  create: (orgId: string, input: any) => apiPost<Client>(`/${orgId}/clients`, input),
  update: (orgId: string, id: string, updates: any) => apiPut<Client>(`/${orgId}/clients/${id}`, updates),
  delete: (orgId: string, id: string) => apiDelete<void>(`/${orgId}/clients/${id}`),
  payCredit: (orgId: string, clientId: string, amount: number, paymentMethod: string) =>
    apiPost<void>(`/${orgId}/clients/${clientId}/pay-credit`, { amount, payment_method: paymentMethod })
};
