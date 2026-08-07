import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { API_BASE_URL } from '../config/api';
import { ORDERS_QUERY_KEY } from '../features/orders/useOrdersQuery';
import { INVENTORY_QUERY_KEY } from '../features/inventory/useInventoryQuery';
import { SALES_QUERY_KEY } from '../features/sales/useSalesQuery';
import { CLIENTS_QUERY_KEY } from '../features/clients/useClientsQuery';
import { TASKS_QUERY_KEY } from '../features/tasks/useTasksQuery';

export function useAppRealtime(orgId: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!orgId) return;

    // Use withCredentials: true so that the browser sends the auth cookies automatically.
    const source = new EventSource(`${API_BASE_URL}/${orgId}/stream`, { withCredentials: true });

    source.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'orders') {
          queryClient.invalidateQueries({ queryKey: ORDERS_QUERY_KEY(orgId) });
        } else if (data.type === 'inventory') {
          queryClient.invalidateQueries({ queryKey: INVENTORY_QUERY_KEY(orgId) });
        } else if (data.type === 'sales') {
          queryClient.invalidateQueries({ queryKey: SALES_QUERY_KEY(orgId) });
        } else if (data.type === 'clients') {
          queryClient.invalidateQueries({ queryKey: CLIENTS_QUERY_KEY(orgId) });
        } else if (data.type === 'tasks') {
          queryClient.invalidateQueries({ queryKey: TASKS_QUERY_KEY(orgId) });
        }
      } catch (err) {
        console.error('Failed to parse SSE message', err);
      }
    };

    source.onerror = (err) => {
      console.error('SSE Error:', err);
      // EventSource automatically attempts to reconnect on error.
    };

    return () => {
      source.close();
    };
  }, [orgId, queryClient]);
}
