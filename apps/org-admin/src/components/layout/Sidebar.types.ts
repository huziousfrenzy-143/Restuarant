import { UserRole } from '@restaurant-saas/shared-schemas';

export interface SidebarProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
  isLineMode: boolean;
  userRole?: UserRole;
  onCloseMobileDrawer?: () => void;
  isMobileDrawer?: boolean;
}
