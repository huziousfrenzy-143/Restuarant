import { InventoryItem, InventoryMovement, Product } from '@restaurant-saas/shared-schemas';

export interface InventoryViewProps {
  inventory: InventoryItem[];
  movements: InventoryMovement[];
  products: Product[];
  onLogMovement: (itemId: string, type: 'purchase' | 'wastage' | 'adjustment', qty: number) => void;
  onAddInventoryItem: (newItem: any) => void;
  onUpdateInventoryItem: (id: string, updates: any) => void;
  onDeleteInventoryItem: (id: string) => void;
}
