import { User } from '@restaurant-saas/shared-schemas';
import { apiGet, apiPost, apiPut, apiDelete } from './client';

export const usersApi = {
  getAll: (orgId: string) => apiGet<User[]>(`/${orgId}/users`),
  create: (orgId: string, input: any) => apiPost<User>(`/${orgId}/users`, input),
  update: (orgId: string, id: string, updates: any) => apiPut<User>(`/${orgId}/users/${id}`, updates),
  delete: (orgId: string, id: string) => apiDelete<void>(`/${orgId}/users/${id}`)
};
