import { UserRole } from '@restaurant-saas/shared-schemas';

export interface MobileBottomNavProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
  onToggleMobileMenu: () => void;
  userRole?: UserRole;
  isLineMode: boolean;
}
