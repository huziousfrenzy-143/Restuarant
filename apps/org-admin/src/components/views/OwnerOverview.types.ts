import { Order, InventoryItem } from '@restaurant-saas/shared-schemas';

export interface OwnerOverviewProps {
  orders: Order[];
  inventory: InventoryItem[];
  onSelectTab: (tab: string) => void;
  isLineMode: boolean;
}
