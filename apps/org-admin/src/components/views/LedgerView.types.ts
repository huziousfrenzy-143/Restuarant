import { LedgerAccount, LedgerEntry, Sale, PaymentMethod } from '@restaurant-saas/shared-schemas';

export interface LedgerViewProps {
  accounts: LedgerAccount[];
  entries: LedgerEntry[];
  sales: Sale[];
  paymentMethods: PaymentMethod[];
  onAddPaymentMethod: (input: { name: string; code: string; linked_account_id: string }) => void;
  onUpdatePaymentMethod?: (id: string, updates: any) => void;
  onDeletePaymentMethod?: (id: string) => void;
  onAddAccount?: (input: { name: string; type: string; balance?: number }) => void;
  onUpdateAccount?: (id: string, updates: any) => void;
  onDeleteAccount?: (id: string) => void;
  onAddManualEntry?: (input: { debit_account_id: string; credit_account_id: string; amount: number; description: string }) => void;
  onRefreshData?: () => void;
}

export type TimeFilter = 'today' | 'week' | 'month' | 'all';
