import React, { useState } from 'react';
import { getSubscriptionStatusMeta } from '@restaurant-saas/ui';
import { SubscriptionStatus } from '@restaurant-saas/shared-schemas';
import { Moon, Sun, Search, LogOut, Building2, ChevronDown, Check, RefreshCw, Menu } from 'lucide-react';

interface HeaderProps {
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

export const Header: React.FC<HeaderProps> = ({
  orgName,
  subscriptionStatus,
  subscriptionExpiresAt,
  isLineMode,
  onToggleLineMode,
  activeTab,
  onSearchOpen,
  currentUser,
  userOrgs = [],
  activeOrgId,
  onSwitchOrg,
  onToggleMobileMenu,
  onLogout
}) => {
  const [isOrgDropdownOpen, setIsOrgDropdownOpen] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const subMeta = getSubscriptionStatusMeta(subscriptionStatus, subscriptionExpiresAt);

  const orgInitials = orgName ? orgName.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase() : 'SG';

  const handleSelectOrg = async (targetId: string) => {
    if (targetId === activeOrgId || isSwitching) return;
    setIsSwitching(true);
    setIsOrgDropdownOpen(false);
    if (onSwitchOrg) {
      await onSwitchOrg(targetId);
    }
    setIsSwitching(false);
  };

  return (
    <header className={`h-16 px-4 sm:px-6 border-b flex items-center justify-between sticky top-0 z-30 transition-colors pt-safe ${
      isLineMode ? 'bg-[#1E2125] border-[#2C3036] text-[#ECEEF0]' : 'bg-surface border-mist text-ink'
    }`}>
      {/* Left section: Hamburger Mobile Menu Trigger & Org Title */}
      <div className="flex items-center gap-2 sm:gap-4">
        {onToggleMobileMenu && (
          <button
            onClick={onToggleMobileMenu}
            title="Open Mobile Menu"
            className="p-2 rounded-md border border-mist md:hidden text-ink hover:bg-steel transition-colors shrink-0"
          >
            <Menu className="w-5 h-5 text-graphite" />
          </button>
        )}

        <div className="relative">
          <div
            onClick={() => userOrgs.length > 0 && setIsOrgDropdownOpen(!isOrgDropdownOpen)}
            className={`flex items-center gap-2 cursor-pointer p-1 rounded-md transition-all ${
              userOrgs.length > 1 ? 'hover:bg-steel/60' : ''
            }`}
          >
            <span className="w-8 h-8 rounded-md bg-primary text-white font-mono font-bold flex items-center justify-center text-xs shadow-sm shrink-0">
              {orgInitials}
            </span>

            <div className="text-left max-w-[120px] sm:max-w-[200px] truncate">
              <div className="flex items-center gap-1.5">
                <h1 className="font-bold text-sm sm:text-base tracking-tight leading-none text-ink truncate">{orgName}</h1>
                {userOrgs.length > 1 && (
                  <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-primary/10 text-primary uppercase shrink-0">
                    {userOrgs.length} Orgs
                  </span>
                )}
                {userOrgs.length > 0 && (
                  <ChevronDown className={`w-3.5 h-3.5 text-graphite shrink-0 transition-transform ${isOrgDropdownOpen ? 'rotate-180' : ''}`} />
                )}
              </div>
              <p className="text-[9px] sm:text-[10px] text-graphite font-mono truncate">Multi-Tenant Store Context</p>
            </div>
          </div>

          {/* Organization Switcher Dropdown Popover */}
          {isOrgDropdownOpen && (
            <div className="absolute left-0 mt-2 w-72 rounded-lg bg-surface border border-mist shadow-xl z-50 p-2 font-mono text-xs animate-in fade-in-50 zoom-in-95">
              <div className="px-2 py-1.5 border-b border-mist text-graphite text-[10px] font-bold uppercase flex items-center justify-between">
                <span>Switch Organization Context</span>
                {isSwitching && <RefreshCw className="w-3 h-3 text-primary animate-spin" />}
              </div>

              <div className="py-1 max-h-60 overflow-y-auto space-y-1">
                {userOrgs.map((o: any) => {
                  const isCurrent = o.id === activeOrgId || o.name === orgName;
                  return (
                    <button
                      key={o.id}
                      onClick={() => handleSelectOrg(o.id)}
                      className={`w-full p-2 rounded-md text-left transition-all flex items-center justify-between ${
                        isCurrent
                          ? 'bg-primary/10 border border-primary/30 text-primary font-bold'
                          : 'hover:bg-steel text-ink border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Building2 className={`w-4 h-4 ${isCurrent ? 'text-primary' : 'text-graphite'}`} />
                        <div>
                          <p className="font-bold text-xs">{o.name}</p>
                          <p className="text-[10px] text-graphite font-normal capitalize">{o.plan_type || 'pro'} plan · {o.slug}</p>
                        </div>
                      </div>
                      {isCurrent && <Check className="w-4 h-4 text-primary shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className={`px-2.5 py-1 rounded-sm text-xs font-semibold hidden lg:flex items-center gap-1.5 ${subMeta.badgeClass}`}>
          <span className={`w-2 h-2 rounded-full ${subMeta.dotColorClass}`} />
          {subMeta.label}
        </div>
      </div>

      {/* Center: Command Palette Trigger */}
      <div className="hidden md:flex items-center">
        <button
          onClick={onSearchOpen}
          className={`flex items-center gap-3 px-3.5 py-1.5 rounded-md text-xs font-medium border transition-colors ${
            isLineMode
              ? 'bg-[#14161A] border-[#2C3036] text-gray-400 hover:text-white'
              : 'bg-steel border-mist text-graphite hover:text-ink'
          }`}
        >
          <Search className="w-3.5 h-3.5" />
          <span>Quick search or barcode scan...</span>
          <kbd className="font-mono text-[10px] bg-mist/50 text-graphite px-1.5 py-0.5 rounded border border-mist">⌘K</kbd>
        </button>
      </div>

      {/* Right section: Controls & User Profile & Logout */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Line Mode Toggle Button */}
        <button
          onClick={onToggleLineMode}
          title={isLineMode ? "Switch to Standard Light Theme" : "Switch to KDS Line Mode Dark Theme"}
          className={`px-2.5 sm:px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-2 border transition-all ${
            isLineMode
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-400 hover:bg-amber-500/20'
              : 'bg-steel border-mist text-graphite hover:text-ink'
          }`}
        >
          {isLineMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-graphite" />}
          <span className="hidden lg:inline font-mono">{isLineMode ? 'Line Mode (On)' : 'Standard Theme'}</span>
        </button>

        <div className="h-6 w-px bg-mist hidden sm:block" />

        {/* User Badge */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold flex items-center justify-center text-xs shrink-0">
            {currentUser?.name ? currentUser.name.split(' ').map((n: string) => n[0]).join('') : 'US'}
          </div>
          <div className="hidden lg:block text-left">
            <p className="text-xs font-semibold leading-tight">{currentUser?.name || 'Staff User'}</p>
            <p className="text-[11px] text-graphite leading-none font-mono capitalize">{currentUser?.role || 'Staff'}</p>
          </div>
        </div>

        {/* Logout Button */}
        <button
          onClick={onLogout}
          title="Log out of session"
          className="p-2 rounded-md border border-mist hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-colors text-graphite ml-1"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
