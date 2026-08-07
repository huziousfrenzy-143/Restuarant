import React from 'react';
import {
  LayoutDashboard,
  ShoppingCart,
  Flame,
  ClipboardList,
  UtensilsCrossed,
  Boxes,
  Users,
  CheckSquare,
  BarChart3,
  TrendingUp,
  Settings,
  X
} from 'lucide-react';
import { UserRole } from '@restaurant-saas/shared-schemas';
import { SidebarProps } from './Sidebar.types';



export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  isLineMode,
  userRole = 'owner',
  onCloseMobileDrawer,
  isMobileDrawer = false
}) => {
  const allNavItems = [
    { id: 'dashboard', label: 'Overview', icon: LayoutDashboard, roles: ['owner', 'admin'] },
    { id: 'pos', label: 'POS Terminal', icon: ShoppingCart, roles: ['owner', 'admin', 'salesman'] },
    { id: 'kds', label: 'Kitchen KDS', icon: Flame, badge: 'Line', roles: ['owner', 'admin', 'chef'] },
    { id: 'orders', label: 'Orders Rail', icon: ClipboardList, roles: ['owner', 'admin', 'salesman', 'delivery_boy'] },
    { id: 'products', label: 'Products & Recipes', icon: UtensilsCrossed, roles: ['owner', 'admin', 'salesman'] },
    { id: 'inventory', label: 'Inventory Stock', icon: Boxes, roles: ['owner', 'admin'] },
    { id: 'sales', label: 'Sales Operations', icon: TrendingUp, roles: ['owner', 'admin'] },
    { id: 'clients', label: 'Clients CRM', icon: Users, roles: ['owner', 'admin'] },
    { id: 'tasks', label: 'Tasks & Employees', icon: CheckSquare, roles: ['owner', 'admin'] },
    { id: 'reports', label: 'Reports', icon: BarChart3, roles: ['owner', 'admin'] },
    { id: 'settings', label: 'Settings', icon: Settings, roles: ['owner', 'admin', 'salesman', 'chef', 'delivery_boy'] }
  ];

  // Filter navigation items by role
  const navItems = allNavItems.filter(item => item.roles.includes(userRole));

  const handleItemClick = (id: string) => {
    onSelectTab(id);
    if (onCloseMobileDrawer) onCloseMobileDrawer();
  };

  return (
    <aside className={`${isMobileDrawer ? 'w-full h-full' : 'hidden md:flex w-64 border-r'} flex-col justify-between transition-colors shrink-0 ${
      isLineMode ? 'bg-[#1E2125] border-[#2C3036] text-[#ECEEF0]' : 'bg-surface border-mist text-ink'
    }`}>
      <div className="p-3 space-y-1">
        <div className="px-3 py-2 text-[11px] font-semibold text-graphite uppercase tracking-wider font-mono flex items-center justify-between">
          <span>Operational Surface</span>
          <div className="flex items-center gap-2">
            <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded capitalize">{userRole}</span>
            {isMobileDrawer && onCloseMobileDrawer && (
              <button onClick={onCloseMobileDrawer} className="p-1 rounded text-graphite hover:text-ink">
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleItemClick(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-3 rounded-md text-xs font-medium transition-all ${
                isActive
                  ? 'bg-primary text-white font-semibold shadow-sm'
                  : isLineMode
                  ? 'hover:bg-[#2C3036] text-gray-300'
                  : 'hover:bg-steel text-ink'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-graphite'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                  isActive ? 'bg-white/20 text-white' : 'bg-amber-500/20 text-amber-400'
                }`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Footer system info */}
      <div className={`p-4 border-t text-xs pb-safe ${isLineMode ? 'border-[#2C3036] text-gray-400' : 'border-mist text-graphite'}`}>
        <div className="flex items-center justify-between font-mono text-[11px]">
          <span>Role Guard</span>
          <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
        </div>
        <p className="mt-1 text-[11px] font-mono capitalize">Access: {userRole} Permissions</p>
      </div>
    </aside>
  );
};
