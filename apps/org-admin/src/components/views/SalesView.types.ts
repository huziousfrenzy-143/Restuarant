import { Order, Sale, PaymentMethod } from '@restaurant-saas/shared-schemas';

export interface SalesViewProps {
  orders: Order[];
  sales: Sale[];
  paymentMethods: PaymentMethod[];
  onRefreshData?: () => void;
}

export type TimeFilter = 'today' | 'week' | 'month' | 'all';
