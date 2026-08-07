import React, { useState } from 'react';
import { Organization, PaymentMethod, LedgerAccount } from '@restaurant-saas/shared-schemas';
import { getSubscriptionStatusMeta } from '@restaurant-saas/ui';
import { Settings, ShieldCheck, AlertTriangle, Building, Phone, MapPin, Database, Key, Lock, Check, Save, CreditCard, Trash2, Percent, Layers, ArrowRight, RefreshCw } from 'lucide-react';
import { ConfirmModal } from '../common/ConfirmModal';
import { SettingsViewProps } from './SettingsView.types';

export const SettingsView: React.FC<SettingsViewProps> = ({
  org,
  userOrgs = [],
  currentUser,
  onSwitchOrg,
  paymentMethods = [],
  accounts = [],
  onChangePassword,
  onUpdateOrg,
  onDeletePaymentMethod
}) => {
  const subMeta = getSubscriptionStatusMeta(org.subscription_status, org.subscription_expires_at);

  // Password Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordStatus, setPasswordStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Org Details Form State
  const [orgName, setOrgName] = useState(org.name);
  const [orgPhone, setOrgPhone] = useState(org.phone);
  const [orgAddress, setOrgAddress] = useState(org.address);
  const [taxRate, setTaxRate] = useState<number>(Number(org.tax_rate) || 10);
  const [orgSavedMessage, setOrgSavedMessage] = useState(false);
  const [switchingOrgId, setSwitchingOrgId] = useState<string | null>(null);

  // Deletion Confirm State
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordStatus(null);

    if (newPassword !== confirmPassword) {
      setPasswordStatus({ type: 'error', message: 'New password and confirm password do not match' });
      return;
    }

    if (newPassword.length < 6) {
      setPasswordStatus({ type: 'error', message: 'New password must be at least 6 characters long' });
      return;
    }

    if (!onChangePassword) return;

    setIsChangingPassword(true);
    try {
      const res = await onChangePassword(currentPassword, newPassword);
      if (res.success) {
        setPasswordStatus({ type: 'success', message: res.message || 'Password changed successfully!' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setPasswordStatus({ type: 'error', message: res.message || 'Failed to update password' });
      }
    } catch (err: any) {
      setPasswordStatus({ type: 'error', message: err.message || 'An error occurred while updating password' });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleOrgSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onUpdateOrg) {
      onUpdateOrg({ name: orgName, phone: orgPhone, address: orgAddress, tax_rate: Number(taxRate) });
      setOrgSavedMessage(true);
      setTimeout(() => setOrgSavedMessage(false), 3000);
    }
  };

  const handleSwitchOrgClick = async (targetId: string) => {
    if (targetId === org.id || switchingOrgId) return;
    setSwitchingOrgId(targetId);
    if (onSwitchOrg) {
      await onSwitchOrg(targetId);
    }
    setSwitchingOrgId(null);
  };

  const handleConfirmDelete = () => {
    if (deleteConfirm && onDeletePaymentMethod) {
      onDeletePaymentMethod(deleteConfirm.id);
      setDeleteConfirm(null);
    }
  };

  const canManageOrg = currentUser?.role === 'admin' || currentUser?.role === 'owner';

  return (
    <div className="p-6 space-y-6 flex-1 overflow-y-auto font-sans">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-ink">Organization Settings & Security Profile</h2>
          <p className="text-xs text-graphite font-mono">Manage security credentials, tenant tax rates, multi-organization access, and store profiles</p>
        </div>
      </div>

      {/* Subscription Alert Banner */}
      <div className={`p-4 rounded-md border flex items-start gap-3 shadow-sm ${
        org.subscription_status === 'expired'
          ? 'bg-red-50 border-red-200 text-[#C1440E]'
          : org.subscription_status === 'expiring_soon'
          ? 'bg-amber-50 border-amber-200 text-[#D48A1E]'
          : 'bg-emerald-50 border-emerald-200 text-[#3E7A4C]'
      }`}>
        <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h3 className="font-bold text-sm font-mono uppercase">Subscription Status: {subMeta.label}</h3>
          <p className="text-xs font-sans">
            Your subscription is valid until{' '}
            <strong className="font-mono">{new Date(org.subscription_expires_at).toLocaleDateString()}</strong>.
            Contact Super Admin support at <span className="underline font-mono">support@restaurantsaas.com</span> for manual extension.
          </p>
        </div>
      </div>

      {/* Multi-Tenant Organization Switcher Card */}
      <div className="p-5 rounded-md border border-mist bg-surface space-y-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-mist pb-3 font-mono">
          <h3 className="font-bold text-sm text-ink flex items-center gap-2">
            <Layers className="w-4 h-4 text-primary" />
            <span>Multi-Tenant Organizations Access ({userOrgs.length > 0 ? userOrgs.length : 1} Authorized Stores)</span>
          </h3>
          <span className="text-xs text-graphite">User Email: <strong className="text-ink">{currentUser?.email || 'worker@saas.com'}</strong></span>
        </div>

        <p className="text-xs text-graphite font-mono">
          Your staff account is authorized across multiple restaurant organizations. Click any organization below to seamlessly switch your active store context.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 font-mono">
          {(userOrgs.length > 0 ? userOrgs : [org]).map(o => {
            const isCurrent = o.id === org.id || o.name === org.name;
            const isSwitching = switchingOrgId === o.id;

            return (
              <div
                key={o.id}
                className={`p-4 rounded-md border transition-all flex flex-col justify-between space-y-3 ${
                  isCurrent
                    ? 'bg-primary/5 border-primary shadow-sm'
                    : 'bg-steel/40 border-mist hover:border-primary/50'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-sm text-ink">{o.name}</h4>
                    <p className="text-[11px] text-graphite font-semibold">{o.slug} · <span className="capitalize">{o.plan_type || 'pro'}</span></p>
                  </div>
                  {isCurrent ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-primary text-white uppercase">Active Store</span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-steel text-graphite border border-mist uppercase">Authorized</span>
                  )}
                </div>

                <div className="pt-2 border-t border-mist/60 flex items-center justify-between">
                  <span className="text-[11px] text-graphite">Role: <strong>{currentUser?.role || 'Staff'}</strong></span>
                  {!isCurrent ? (
                    <button
                      onClick={() => handleSwitchOrgClick(o.id)}
                      disabled={Boolean(switchingOrgId)}
                      className="px-3 py-1.5 rounded bg-primary text-white text-xs font-bold hover:bg-primary-hover transition-all flex items-center gap-1 shadow-sm disabled:opacity-50"
                    >
                      <span>{isSwitching ? 'Switching...' : 'Switch Store'}</span>
                      {isSwitching ? <RefreshCw className="w-3 h-3 animate-spin" /> : <ArrowRight className="w-3 h-3" />}
                    </button>
                  ) : (
                    <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Currently Loaded
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Password Update Form */}
        <div className="p-5 rounded-md border border-mist bg-surface space-y-4 shadow-sm">
          <h3 className="font-bold text-sm text-ink flex items-center gap-2 border-b border-mist pb-3 font-mono">
            <Lock className="w-4 h-4 text-primary" />
            <span>Security & Password Settings</span>
          </h3>

          {passwordStatus && (
            <div className={`p-3 rounded text-xs font-mono font-semibold ${
              passwordStatus.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              {passwordStatus.message}
            </div>
          )}

          <form onSubmit={handlePasswordSubmit} className="space-y-3 text-xs font-mono">
            <div>
              <label className="text-graphite block mb-1">Current Password</label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                className="w-full p-2 rounded border border-mist bg-surface text-ink font-semibold"
                placeholder="••••••••"
              />
            </div>

            <div>
              <label className="text-graphite block mb-1">New Password</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                className="w-full p-2 rounded border border-mist bg-surface text-ink font-semibold"
                placeholder="••••••••"
              />
            </div>

            <div>
              <label className="text-graphite block mb-1">Confirm New Password</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className="w-full p-2 rounded border border-mist bg-surface text-ink font-semibold"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={isChangingPassword}
              className="w-full py-2.5 rounded bg-primary text-white text-xs font-bold hover:bg-primary-hover transition-all flex items-center justify-center gap-2 shadow-sm font-mono"
            >
              <Key className="w-4 h-4" />
              <span>{isChangingPassword ? 'Updating Password...' : 'Update Account Password'}</span>
            </button>
          </form>
        </div>

        {/* Card 2: Organization Profile & Tax Rate Editor */}
        {canManageOrg && (
        <div className="p-5 rounded-md border border-mist bg-surface space-y-4 shadow-sm">
          <h3 className="font-bold text-sm text-ink flex items-center justify-between border-b border-mist pb-3 font-mono">
            <span className="flex items-center gap-2">
              <Building className="w-4 h-4 text-primary" />
              <span>Restaurant Profile & Tax Rate Settings</span>
            </span>
            {orgSavedMessage && (
              <span className="text-xs text-emerald-600 flex items-center gap-1 font-bold">
                <Check className="w-3.5 h-3.5" /> Saved!
              </span>
            )}
          </h3>

          <form onSubmit={handleOrgSubmit} className="space-y-3 text-xs font-mono">
            <div>
              <label className="text-graphite block mb-1">Restaurant Organization Name</label>
              <input
                type="text"
                required
                value={orgName}
                onChange={e => setOrgName(e.target.value)}
                className="w-full p-2 rounded border border-mist bg-surface text-ink font-semibold"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-graphite block mb-1">Phone Number</label>
                <input
                  type="text"
                  required
                  value={orgPhone}
                  onChange={e => setOrgPhone(e.target.value)}
                  className="w-full p-2 rounded border border-mist bg-surface text-ink"
                />
              </div>
              <div>
                <label className="text-graphite block mb-1">Default POS Tax Rate (%)</label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={taxRate}
                  onChange={e => setTaxRate(parseFloat(e.target.value) || 0)}
                  className="w-full p-2 rounded border border-mist bg-surface text-ink font-bold"
                />
              </div>
            </div>

            <div>
              <label className="text-graphite block mb-1">Physical Address</label>
              <input
                type="text"
                required
                value={orgAddress}
                onChange={e => setOrgAddress(e.target.value)}
                className="w-full p-2 rounded border border-mist bg-surface text-ink"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded bg-primary text-white text-xs font-bold hover:bg-primary-hover transition-all flex items-center justify-center gap-2 shadow-sm font-mono"
            >
              <Save className="w-4 h-4" />
              <span>Save Restaurant Details</span>
            </button>
          </form>
        </div>
        )}
      </div>

      {/* Deletion Confirm Modal */}
      <ConfirmModal
        isOpen={Boolean(deleteConfirm)}
        title="Delete Payment Method"
        message={`Are you sure you want to delete payment register '${deleteConfirm?.name}'?`}
        confirmText="Delete Method"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteConfirm(null)}
      />
    </div>
  );
};
