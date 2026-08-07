import { 
  useOrdersQuery, 
  useUpdateOrderStatusMutation, 
  useUpdateOrderItemsMutation 
} from './useOrdersQuery';
import { useProductsQuery } from '../products/useProductsQuery';
import { useAppStore } from '../../store/useAppStore';

export const useOrdersController = () => {
  const orgId = useAppStore(s => s.org.id);
  const runAction = useAppStore(s => s.runAction);

  const { data: orders = [] } = useOrdersQuery(orgId);
  const { data: products = [] } = useProductsQuery(orgId);
  
  const updateOrderStatusMut = useUpdateOrderStatusMutation(orgId);
  const updateOrderItemsMut = useUpdateOrderItemsMutation(orgId);

  return {
    orders,
    products,
    onUpdateOrderStatus: (id: string, status: any) => runAction(`Updating Order Status (${status})...`, () => updateOrderStatusMut.mutateAsync({ orderId: id, status })),
    onUpdateOrderItems: (id: string, items: any[]) => runAction('Updating Order Items...', () => updateOrderItemsMut.mutateAsync({ orderId: id, items }))
  };
};
