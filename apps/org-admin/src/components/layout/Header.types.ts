import { SubscriptionStatus } from '@restaurant-saas/shared-schemas';

export interface HeaderProps {
  orgName: string;
  subscriptionStatus: SubscriptionStatus;
  subscriptionExpiresAt: string;
  isLineMode: boolean;
  onToggleLineMode: () => void;
  activeTab: string;
  onSearchOpen: () => void;
  currentUser: any;
  userOrgs?: any[];
  activeOrgId?: string;
  onSwitchOrg?: (targetOrgId: string) => void;
  onToggleMobileMenu?: () => void;
  onLogout: () => void;
}
