import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { paymentMethodsApi } from '../../api/paymentMethods.api';
import { settingsApi } from '../../api/settings.api';

export const PAYMENT_METHODS_QUERY_KEY = (orgId: string) => ['payment-methods', orgId];

export function usePaymentMethodsQuery(orgId: string) {
  return useQuery({
    queryKey: PAYMENT_METHODS_QUERY_KEY(orgId),
    queryFn: () => paymentMethodsApi.getAll(orgId),
    enabled: Boolean(orgId)
  });
}

export function useAddPaymentMethodMutation(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: any) => paymentMethodsApi.create(orgId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PAYMENT_METHODS_QUERY_KEY(orgId) });
    }
  });
}

export function useUpdatePaymentMethodMutation(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: any }) => paymentMethodsApi.update(orgId, id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PAYMENT_METHODS_QUERY_KEY(orgId) });
    }
  });
}

export function useDeletePaymentMethodMutation(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => paymentMethodsApi.delete(orgId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PAYMENT_METHODS_QUERY_KEY(orgId) });
    }
  });
}

export function useUpdateSettingsMutation(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (updates: { name: string; phone: string; address: string; tax_rate: number }) => settingsApi.updateSettings(orgId, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org', orgId] });
    }
  });
}
