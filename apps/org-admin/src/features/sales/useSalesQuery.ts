import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { salesApi } from '../../api/sales.api';

export const SALES_QUERY_KEY = (orgId: string) => ['sales', orgId];

export function useSalesQuery(orgId: string) {
  return useQuery({
    queryKey: SALES_QUERY_KEY(orgId),
    queryFn: () => salesApi.getAll(orgId),
    enabled: Boolean(orgId)
  });
}

export function useCreateSaleMutation(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (saleData: any) => salesApi.create(orgId, saleData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: SALES_QUERY_KEY(orgId) });
    }
  });
}
