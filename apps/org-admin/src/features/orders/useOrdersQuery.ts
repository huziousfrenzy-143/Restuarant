import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { OrderItem, OrderStatus } from '@restaurant-saas/shared-schemas';
import { ordersApi } from '../../api/orders.api';

export const ORDERS_QUERY_KEY = (orgId: string) => ['orders', orgId];

export function useOrdersQuery(orgId: string) {
  return useQuery({
    queryKey: ORDERS_QUERY_KEY(orgId),
    queryFn: () => ordersApi.getAll(orgId),
    enabled: Boolean(orgId),
    refetchInterval: 10000 // Poll KDS/Orders every 10s for real-time kitchen updates
  });
}

export function useCreateOrderMutation(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orderData: any) => ordersApi.create(orgId, orderData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ORDERS_QUERY_KEY(orgId) });
    }
  });
}

export function useUpdateOrderStatusMutation(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, status }: { orderId: string; status: OrderStatus }) => ordersApi.updateStatus(orgId, orderId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ORDERS_QUERY_KEY(orgId) });
    }
  });
}

export function useUpdateOrderItemsMutation(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orderId, items }: { orderId: string; items: OrderItem[] }) => ordersApi.updateItems(orgId, orderId, items),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ORDERS_QUERY_KEY(orgId) });
    }
  });
}
