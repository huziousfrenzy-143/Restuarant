import { Organization } from '@restaurant-saas/shared-schemas';
import { apiPut } from './client';

export const settingsApi = {
  updateSettings: (orgId: string, updates: { name: string; phone: string; address: string; tax_rate: number }) =>
    apiPut<Organization>(`/${orgId}/settings`, updates)
};
