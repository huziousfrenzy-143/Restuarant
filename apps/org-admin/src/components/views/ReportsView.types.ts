import { Order, InventoryItem, Sale } from '@restaurant-saas/shared-schemas';

export interface ReportsViewProps {
  orders: Order[];
  inventory: InventoryItem[];
  sales: Sale[];
  onRefreshData?: () => void;
}

export type TimeFilter = 'today' | 'week' | 'month' | 'all';
