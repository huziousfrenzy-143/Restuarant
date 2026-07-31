import { Product } from '@restaurant-saas/shared-schemas';
import { apiGet, apiPost, apiPut, apiDelete } from './client';

export const productsApi = {
  getAll: (orgId: string) => apiGet<Product[]>(`/${orgId}/products`),
  create: (orgId: string, input: any) => apiPost<Product>(`/${orgId}/products`, input),
  update: (orgId: string, id: string, updates: any) => apiPut<Product>(`/${orgId}/products/${id}`, updates),
  delete: (orgId: string, id: string) => apiDelete<void>(`/${orgId}/products/${id}`)
};
