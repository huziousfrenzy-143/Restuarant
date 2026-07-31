import { InventoryItem } from '@restaurant-saas/shared-schemas';
import { apiGet, apiPost, apiPut, apiDelete } from './client';

export const inventoryApi = {
  getAll: (orgId: string) => apiGet<InventoryItem[]>(`/${orgId}/inventory`),
  create: (orgId: string, input: any) => apiPost<InventoryItem>(`/${orgId}/inventory`, input),
  update: (orgId: string, id: string, updates: any) => apiPut<InventoryItem>(`/${orgId}/inventory/${id}`, updates),
  delete: (orgId: string, id: string) => apiDelete<void>(`/${orgId}/inventory/${id}`)
};
