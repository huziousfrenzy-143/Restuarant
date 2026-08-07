import React from 'react';
import { LayoutDashboard, ShoppingCart, Flame, ClipboardList, Menu } from 'lucide-react';
import { UserRole } from '@restaurant-saas/shared-schemas';
import { MobileBottomNavProps } from './MobileBottomNav.types';

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  onSelectTab,
  onToggleMobileMenu,
  userRole = 'owner',
  isLineMode
}) => {
  if (userRole === 'chef') {
    // Chef only has access to KDS
    return (
      <nav className={`fixed bottom-0 inset-x-0 z-40 md:hidden border-t px-4 py-2 flex items-center justify-around pb-safe transition-colors ${
        isLineMode ? 'bg-[#1E2125] border-[#2C3036] text-[#ECEEF0]' : 'bg-surface border-mist text-ink'
      }`}>
        <button
          onClick={() => onSelectTab('kds')}
          className="flex flex-col items-center gap-1 text-primary font-bold text-[10px]"
        >
          <Flame className="w-5 h-5 text-primary" />
          <span>Kitchen KDS</span>
        </button>
      </nav>
    );
  }

  const mainItems = [
    { id: 'dashboard', label: 'Overview', icon: LayoutDashboard, roles: ['owner', 'admin'] },
    { id: 'pos', label: 'POS', icon: ShoppingCart, roles: ['owner', 'admin', 'salesman'] },
    { id: 'kds', label: 'KDS', icon: Flame, roles: ['owner', 'admin', 'chef'] },
    { id: 'orders', label: 'Orders', icon: ClipboardList, roles: ['owner', 'admin', 'salesman', 'delivery_boy'] }
  ].filter(i => i.roles.includes(userRole));

  return (
    <nav className={`fixed bottom-0 inset-x-0 z-40 md:hidden border-t px-2 py-1.5 flex items-center justify-around pb-safe shadow-lg transition-colors ${
      isLineMode ? 'bg-[#1E2125] border-[#2C3036] text-[#ECEEF0]' : 'bg-surface border-mist text-ink'
    }`}>
      {mainItems.map(item => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;

        return (
          <button
            key={item.id}
            onClick={() => onSelectTab(item.id)}
            className={`flex flex-col items-center gap-1 px-3 py-1 rounded-md text-[10px] font-mono font-bold transition-all ${
              isActive ? 'text-primary' : 'text-graphite hover:text-ink'
            }`}
          >
            <Icon className={`w-5 h-5 ${isActive ? 'text-primary scale-110' : 'text-graphite'}`} />
            <span>{item.label}</span>
          </button>
        );
      })}

      <button
        onClick={onToggleMobileMenu}
        className="flex flex-col items-center gap-1 px-3 py-1 rounded-md text-[10px] font-mono font-bold text-graphite hover:text-ink transition-all"
      >
        <Menu className="w-5 h-5 text-graphite" />
        <span>Menu</span>
      </button>
    </nav>
  );
};
