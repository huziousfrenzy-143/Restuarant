import { Order, OrderStatus } from '@restaurant-saas/shared-schemas';

export interface KDSViewProps {
  orders: Order[];
  onUpdateOrderStatus: (orderId: string, newStatus: OrderStatus) => void;
}
