import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { inventoryApi } from '../../api/inventory.api';

export const INVENTORY_QUERY_KEY = (orgId: string) => ['inventory', orgId];

export function useInventoryQuery(orgId: string) {
  return useQuery({
    queryKey: INVENTORY_QUERY_KEY(orgId),
    queryFn: () => inventoryApi.getAll(orgId),
    enabled: Boolean(orgId)
  });
}

export function useAddInventoryMutation(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: any) => inventoryApi.create(orgId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INVENTORY_QUERY_KEY(orgId) });
    }
  });
}

export function useUpdateInventoryMutation(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: any }) => inventoryApi.update(orgId, id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INVENTORY_QUERY_KEY(orgId) });
    }
  });
}

export function useDeleteInventoryMutation(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => inventoryApi.delete(orgId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INVENTORY_QUERY_KEY(orgId) });
    }
  });
}
