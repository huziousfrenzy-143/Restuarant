import { Sale } from '@restaurant-saas/shared-schemas';
import { apiGet, apiPost } from './client';

export const salesApi = {
  getAll: (orgId: string) => apiGet<Sale[]>(`/${orgId}/sales`),
  create: (orgId: string, saleData: any) => apiPost<Sale>(`/${orgId}/sales`, saleData)
};
