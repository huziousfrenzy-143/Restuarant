import { LedgerAccount, LedgerEntry } from '@restaurant-saas/shared-schemas';
import { apiGet, apiPost, apiPut, apiDelete } from './client';

export const ledgerApi = {
  getAccounts: (orgId: string) => apiGet<LedgerAccount[]>(`/${orgId}/ledger/accounts`),
  createAccount: (orgId: string, input: any) => apiPost<LedgerAccount>(`/${orgId}/ledger/accounts`, input),
  updateAccount: (orgId: string, id: string, updates: any) => apiPut<LedgerAccount>(`/${orgId}/ledger/accounts/${id}`, updates),
  deleteAccount: (orgId: string, id: string) => apiDelete<void>(`/${orgId}/ledger/accounts/${id}`),

  getEntries: (orgId: string) => apiGet<LedgerEntry[]>(`/${orgId}/ledger/entries`),
  createEntry: (orgId: string, input: any) => apiPost<LedgerEntry>(`/${orgId}/ledger/entries`, input)
};
