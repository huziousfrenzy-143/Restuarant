import { Task } from '@restaurant-saas/shared-schemas';
import { apiGet, apiPost, apiPut, apiPatch, apiDelete } from './client';

export const tasksApi = {
  getAll: (orgId: string) => apiGet<Task[]>(`/${orgId}/tasks`),
  create: (orgId: string, input: any) => apiPost<Task>(`/${orgId}/tasks`, input),
  update: (orgId: string, id: string, updates: any) => apiPut<Task>(`/${orgId}/tasks/${id}`, updates),
  updateStatus: (orgId: string, id: string, status: string) => apiPatch<void>(`/${orgId}/tasks/${id}/status`, { status }),
  delete: (orgId: string, id: string) => apiDelete<void>(`/${orgId}/tasks/${id}`)
};
