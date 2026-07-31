import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clientsApi } from '../../api/clients.api';

export const CLIENTS_QUERY_KEY = (orgId: string) => ['clients', orgId];

export function useClientsQuery(orgId: string) {
  return useQuery({
    queryKey: CLIENTS_QUERY_KEY(orgId),
    queryFn: () => clientsApi.getAll(orgId),
    enabled: Boolean(orgId)
  });
}

export function useAddClientMutation(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: any) => clientsApi.create(orgId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CLIENTS_QUERY_KEY(orgId) });
    }
  });
}

export function useUpdateClientMutation(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: any }) => clientsApi.update(orgId, id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CLIENTS_QUERY_KEY(orgId) });
    }
  });
}

export function useDeleteClientMutation(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => clientsApi.delete(orgId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CLIENTS_QUERY_KEY(orgId) });
    }
  });
}

export function usePayCreditMutation(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ clientId, amount, paymentMethod }: { clientId: string; amount: number; paymentMethod: string }) =>
      clientsApi.payCredit(orgId, clientId, amount, paymentMethod),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CLIENTS_QUERY_KEY(orgId) });
      queryClient.invalidateQueries({ queryKey: ['sales', orgId] });
    }
  });
}
