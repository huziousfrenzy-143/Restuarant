import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ledgerApi } from '../../api/ledger.api';

export const LEDGER_ACCOUNTS_QUERY_KEY = (orgId: string) => ['ledger-accounts', orgId];
export const LEDGER_ENTRIES_QUERY_KEY = (orgId: string) => ['ledger-entries', orgId];

export function useLedgerAccountsQuery(orgId: string) {
  return useQuery({
    queryKey: LEDGER_ACCOUNTS_QUERY_KEY(orgId),
    queryFn: () => ledgerApi.getAccounts(orgId),
    enabled: Boolean(orgId)
  });
}

export function useLedgerEntriesQuery(orgId: string) {
  return useQuery({
    queryKey: LEDGER_ENTRIES_QUERY_KEY(orgId),
    queryFn: () => ledgerApi.getEntries(orgId),
    enabled: Boolean(orgId)
  });
}

export function useAddAccountMutation(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: any) => ledgerApi.createAccount(orgId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LEDGER_ACCOUNTS_QUERY_KEY(orgId) });
    }
  });
}

export function useUpdateAccountMutation(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: any }) => ledgerApi.updateAccount(orgId, id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LEDGER_ACCOUNTS_QUERY_KEY(orgId) });
    }
  });
}

export function useDeleteAccountMutation(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => ledgerApi.deleteAccount(orgId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LEDGER_ACCOUNTS_QUERY_KEY(orgId) });
    }
  });
}

export function useAddEntryMutation(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: any) => ledgerApi.createEntry(orgId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: LEDGER_ENTRIES_QUERY_KEY(orgId) });
      queryClient.invalidateQueries({ queryKey: LEDGER_ACCOUNTS_QUERY_KEY(orgId) });
    }
  });
}
