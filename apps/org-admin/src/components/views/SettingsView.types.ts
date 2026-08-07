import { Organization, PaymentMethod, LedgerAccount } from '@restaurant-saas/shared-schemas';

export interface SettingsViewProps {
  org: Organization;
  userOrgs?: any[];
  currentUser?: any;
  onSwitchOrg?: (targetOrgId: string) => void;
  paymentMethods?: PaymentMethod[];
  accounts?: LedgerAccount[];
  onChangePassword?: (curr: string, next: string) => Promise<{ success: boolean; message: string }>;
  onUpdateOrg?: (updates: { name: string; phone: string; address: string; tax_rate: number }) => void;
  onDeletePaymentMethod?: (id: string) => void;
}
