import { ProductCategory } from '@restaurant-saas/shared-schemas';
import { apiGet, apiPost, apiPut, apiDelete } from './client';

export const categoriesApi = {
  getAll: (orgId: string) => apiGet<ProductCategory[]>(`/${orgId}/categories`),
  create: (orgId: string, input: any) => apiPost<ProductCategory>(`/${orgId}/categories`, input),
  update: (orgId: string, id: string, updates: any) => apiPut<ProductCategory>(`/${orgId}/categories/${id}`, updates),
  delete: (orgId: string, id: string) => apiDelete<void>(`/${orgId}/categories/${id}`)
};
