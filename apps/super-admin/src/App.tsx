import React, { useState, useEffect } from 'react';
import { Organization, AuditLog } from '@restaurant-saas/shared-schemas';
import { getSubscriptionStatusMeta } from '@restaurant-saas/ui';
import { SuperAdminLoginView } from './components/SuperAdminLoginView';
import { API_BASE_URL } from './config/api';
import {
  ShieldCheck,
  Building,
  Plus,
  Search,
  LogOut,
  Edit2,
  Power,
  X,
  Sparkles,
  Trash2
} from 'lucide-react';

export function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return Boolean(localStorage.getItem('super_admin_token'));
  });

  const [activeTab, setActiveTab] = useState<'orgs' | 'audit'>('orgs');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
  const [selectedOrgForExtension, setSelectedOrgForExtension] = useState<Organization | null>(null);
  const [deletingOrg, setDeletingOrg] = useState<Organization | null>(null);

  // New Org Form State
  const [newOrgForm, setNewOrgForm] = useState({
    name: '',
    slug: '',
    plan_type: 'pro',
    address: '',
    phone: '',
    subscription_days: 30,
    owner_name: '',
    owner_email: ''
  });

  const [extensionOption, setExtensionOption] = useState<'one_month' | 'three_months' | 'custom'>('one_month');
  const [customDate, setCustomDate] = useState('');

  // Fetch Organizations from Backend API
  const fetchOrganizations = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('super_admin_token');
      const res = await fetch(`${API_BASE_URL}/organizations`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      const json = await res.json();
      if (res.ok && json.data) {
        setOrganizations(json.data);
      }
    } catch (err) {
      console.error('Failed to fetch organizations:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch Audit Logs
  const fetchAuditLogs = async () => {
    try {
      const token = localStorage.getItem('super_admin_token');
      const res = await fetch(`${API_BASE_URL}/audit-log`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      const json = await res.json();
      if (res.ok && json.data) {
        setAuditLogs(json.data);
      }
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchOrganizations();
      fetchAuditLogs();
    }
  }, [isAuthenticated]);

  // Auth Callbacks
  const handleLoginSuccess = (access: string, refresh: string, email: string) => {
    localStorage.setItem('super_admin_token', access);
    localStorage.setItem('super_admin_refresh_token', refresh);
    localStorage.setItem('super_admin_email', email);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('super_admin_token');
    localStorage.removeItem('super_admin_refresh_token');
    localStorage.removeItem('super_admin_email');
    setIsAuthenticated(false);
  };

  // 1. Provision New Organization (Wired with Backend API & Nodemailer Onboarding Mail)
  const handleCreateOrganizationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrgForm.name || !newOrgForm.slug || !newOrgForm.owner_email) return;

    setIsSubmitting(true);
    setFeedbackMsg(null);

    try {
      const token = localStorage.getItem('super_admin_token');
      const res = await fetch(`${API_BASE_URL}/organizations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(newOrgForm)
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || 'Failed to provision organization');
      }

      setFeedbackMsg({
        type: 'success',
        msg: json.message || `Restaurant ${newOrgForm.name} provisioned! Onboarding email sent to ${newOrgForm.owner_email}.`
      });

      setIsCreateModalOpen(false);
      setNewOrgForm({
        name: '',
        slug: '',
        plan_type: 'pro',
        address: '',
        phone: '',
        subscription_days: 30,
        owner_name: '',
        owner_email: ''
      });

      // Refetch from API to ensure persistence across reloads
      await fetchOrganizations();
      await fetchAuditLogs();
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', msg: err.message || 'API connection error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // 2. Edit Organization (Wired with Backend API)
  const handleEditOrganizationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrg) return;

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('super_admin_token');
      const res = await fetch(`${API_BASE_URL}/organizations/${editingOrg.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          name: editingOrg.name,
          plan_type: editingOrg.plan_type,
          address: editingOrg.address,
          phone: editingOrg.phone
        })
      });

      if (res.ok) {
        setEditingOrg(null);
        await fetchOrganizations();
      }
    } catch (err) {
      console.error('Error editing org:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 3. Toggle Active / Suspended Status (Wired with Backend API)
  const handleToggleStatus = async (org: Organization) => {
    const nextStatus = !org.is_active;
    try {
      const token = localStorage.getItem('super_admin_token');
      const res = await fetch(`${API_BASE_URL}/organizations/${org.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ is_active: nextStatus })
      });

      if (res.ok) {
        await fetchOrganizations();
      }
    } catch (err) {
      console.error('Error toggling status:', err);
    }
  };

  // 4. Extend Subscription (Wired with Backend API)
  const handleExtendSubscription = async () => {
    if (!selectedOrgForExtension) return;

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('super_admin_token');
      const res = await fetch(`${API_BASE_URL}/organizations/extend-subscription`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          org_id: selectedOrgForExtension.id,
          extension_type: extensionOption,
          custom_expires_at: extensionOption === 'custom' ? customDate : undefined
        })
      });

      if (res.ok) {
        setSelectedOrgForExtension(null);
        await fetchOrganizations();
      }
    } catch (err) {
      console.error('Error extending subscription:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 5. Delete Organization Handler
  const handleDeleteOrganization = async () => {
    if (!deletingOrg) return;

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('super_admin_token');
      const res = await fetch(`${API_BASE_URL}/organizations/${deletingOrg.id}`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      if (res.ok) {
        setDeletingOrg(null);
        setFeedbackMsg({ type: 'success', msg: `Organization '${deletingOrg.name}' permanently deleted.` });
        await fetchOrganizations();
      } else {
        const json = await res.json().catch(() => ({}));
        setFeedbackMsg({ type: 'error', msg: json.error?.message || 'Failed to delete organization' });
      }
    } catch (err: any) {
      setFeedbackMsg({ type: 'error', msg: err.message || 'Error deleting organization' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredOrgs = organizations.filter(o =>
    o.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    o.schema_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // AUTH GUARD: Require Super Admin Login
  if (!isAuthenticated) {
    return <SuperAdminLoginView onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-steel flex flex-col font-sans">
      {/* Super Admin Top Header */}
      <header className="h-16 px-6 bg-[#1B1D1F] text-white border-b border-gray-800 flex items-center justify-between sticky top-0 z-30 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-primary text-white flex items-center justify-center font-mono font-bold text-xs">
            SA
          </div>
          <div>
            <h1 className="font-bold text-sm leading-tight">Super Admin Platform Control Plane</h1>
            <p className="text-[11px] text-gray-400 font-mono">Authenticated: arhamsaifofficial@gmail.com</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('orgs')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold font-mono transition-all ${
                activeTab === 'orgs' ? 'bg-primary text-white' : 'bg-gray-800 text-gray-300 hover:text-white'
              }`}
            >
              Tenant Registry ({organizations.length})
            </button>
            <button
              onClick={() => setActiveTab('audit')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold font-mono transition-all ${
                activeTab === 'audit' ? 'bg-primary text-white' : 'bg-gray-800 text-gray-300 hover:text-white'
              }`}
            >
              Platform Audit Log
            </button>
          </div>

          <div className="h-6 w-px bg-gray-800" />

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            title="Log out of Super Admin"
            className="p-2 rounded-md bg-gray-800 hover:bg-red-600/20 hover:text-red-400 text-gray-400 transition-colors flex items-center gap-1.5 text-xs font-mono"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      {/* Feedback Banner */}
      {feedbackMsg && (
        <div className={`p-4 text-xs font-mono font-bold flex items-center justify-between ${
          feedbackMsg.type === 'success' ? 'bg-emerald-100 text-emerald-800 border-b border-emerald-200' : 'bg-red-100 text-red-800 border-b border-red-200'
        }`}>
          <span>{feedbackMsg.msg}</span>
          <button onClick={() => setFeedbackMsg(null)} className="hover:opacity-75"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Main Content */}
      <main className="p-6 max-w-7xl mx-auto w-full space-y-6 flex-1">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-md border border-mist bg-surface shadow-sm space-y-1">
            <span className="text-[11px] font-mono text-graphite uppercase font-semibold">Total Organizations</span>
            <p className="text-2xl font-bold font-mono text-ink tabular-nums">{organizations.length}</p>
          </div>
          <div className="p-4 rounded-md border border-mist bg-surface shadow-sm space-y-1">
            <span className="text-[11px] font-mono text-graphite uppercase font-semibold">Active Tenant Isolation</span>
            <p className="text-2xl font-bold font-mono text-emerald-700 tabular-nums">
              {organizations.filter(o => o.is_active).length} Active
            </p>
          </div>
          <div className="p-4 rounded-md border border-mist bg-surface shadow-sm space-y-1">
            <span className="text-[11px] font-mono text-graphite uppercase font-semibold">Expiring / Expired</span>
            <p className="text-2xl font-bold font-mono text-amber-700 tabular-nums">
              {organizations.filter(o => o.subscription_status !== 'active').length}
            </p>
          </div>
        </div>

        {/* Orgs Tab */}
        {activeTab === 'orgs' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="relative w-full sm:w-72">
                <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-graphite" />
                <input
                  type="text"
                  placeholder="Search organization or schema..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-md border border-mist text-xs focus:outline-none focus:ring-1 focus:ring-primary bg-surface"
                />
              </div>

              {/* Provision New Organization Button */}
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="w-full sm:w-auto px-4 py-2 rounded-md bg-primary hover:bg-primary-hover text-white text-xs font-bold font-mono shadow-sm flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>Provision New Restaurant Tenant</span>
              </button>
            </div>

            {/* Complete Organization Management Table */}
            <div className="border border-mist rounded-md bg-surface shadow-sm overflow-hidden">
              <table className="w-full text-left text-xs font-sans">
                <thead className="bg-steel border-b border-mist text-graphite uppercase font-mono font-semibold">
                  <tr>
                    <th className="p-3">Organization Name</th>
                    <th className="p-3">Postgres Schema</th>
                    <th className="p-3">Plan</th>
                    <th className="p-3">Sub Status</th>
                    <th className="p-3">Tenant Status</th>
                    <th className="p-3">Expiry Date</th>
                    <th className="p-3 text-center">Super Admin Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-mist">
                  {filteredOrgs.map(org => {
                    const subMeta = getSubscriptionStatusMeta(org.subscription_status, org.subscription_expires_at);
                    return (
                      <tr key={org.id} className="hover:bg-steel/40 transition-colors">
                        <td className="p-3 font-bold text-ink">
                          {org.name}
                          <span className="block text-[11px] font-mono text-graphite font-normal">{org.address}</span>
                        </td>
                        <td className="p-3 font-mono text-primary font-semibold">{org.schema_name}</td>
                        <td className="p-3 font-mono text-graphite uppercase font-bold text-[11px]">{org.plan_type}</td>
                        <td className="p-3">
                          <span className={`px-2.5 py-1 rounded text-[11px] font-mono font-semibold inline-flex items-center gap-1.5 ${subMeta.badgeClass}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${subMeta.dotColorClass}`} />
                            {subMeta.label}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                            org.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {org.is_active ? 'Active' : 'Suspended'}
                          </span>
                        </td>
                        <td className="p-3 font-mono text-ink">
                          {new Date(org.subscription_expires_at).toLocaleDateString()}
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Edit Organization */}
                            <button
                              onClick={() => setEditingOrg(org)}
                              title="Edit Details"
                              className="p-1.5 rounded border border-mist hover:bg-steel text-graphite hover:text-ink"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            {/* Toggle Suspend/Activate */}
                            <button
                              onClick={() => handleToggleStatus(org)}
                              title={org.is_active ? 'Suspend Tenant' : 'Activate Tenant'}
                              className={`p-1.5 rounded border ${
                                org.is_active
                                  ? 'border-red-200 text-red-600 hover:bg-red-50'
                                  : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                              }`}
                            >
                              <Power className="w-3.5 h-3.5" />
                            </button>

                            {/* Extend Subscription */}
                            <button
                              onClick={() => setSelectedOrgForExtension(org)}
                              className="px-2.5 py-1 rounded bg-primary text-white text-[11px] font-bold font-mono hover:bg-primary-hover shadow-sm"
                            >
                              Extend
                            </button>

                            {/* Delete Organization */}
                            <button
                              onClick={() => setDeletingOrg(org)}
                              title="Delete Organization"
                              className="p-1.5 rounded border border-red-200 text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Audit Log Tab */}
        {activeTab === 'audit' && (
          <div className="border border-mist rounded-md bg-surface shadow-sm overflow-hidden space-y-3">
            <div className="p-4 border-b border-mist bg-steel flex items-center justify-between">
              <h3 className="font-bold text-xs font-mono uppercase text-ink">Cross-Tenant Platform Audit Trail</h3>
            </div>
            <table className="w-full text-left text-xs font-sans">
              <thead className="bg-steel border-b border-mist text-graphite uppercase font-mono font-semibold">
                <tr>
                  <th className="p-3">Audit ID</th>
                  <th className="p-3">Actor</th>
                  <th className="p-3">Action</th>
                  <th className="p-3">Target Entity</th>
                  <th className="p-3">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-mist">
                {auditLogs.map(log => (
                  <tr key={log.id} className="hover:bg-steel/40 transition-colors font-mono">
                    <td className="p-3 font-bold text-ink">{log.id}</td>
                    <td className="p-3 text-primary">{log.user_name}</td>
                    <td className="p-3 font-bold text-ink">{log.action}</td>
                    <td className="p-3 text-graphite">{log.entity} ({log.entity_id})</td>
                    <td className="p-3 text-graphite">{new Date(log.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* MODAL 1: Provision New Tenant Organization */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleCreateOrganizationSubmit} className="bg-surface border border-mist rounded-lg shadow-xl w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-mist pb-3">
              <h3 className="font-bold text-sm text-ink font-mono flex items-center gap-2">
                <Building className="w-4 h-4 text-primary" />
                <span>Provision New Restaurant Organization</span>
              </h3>
              <button type="button" onClick={() => setIsCreateModalOpen(false)} className="text-graphite hover:text-ink">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs font-mono">
              <div className="col-span-2">
                <label className="text-graphite block mb-1">Restaurant Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Spice Route Bistro"
                  value={newOrgForm.name}
                  onChange={e => {
                    const nameVal = e.target.value;
                    setNewOrgForm(p => ({
                      ...p,
                      name: nameVal,
                      slug: nameVal.toLowerCase().replace(/[^a-z0-9]/g, '-')
                    }));
                  }}
                  className="w-full p-2 rounded border border-mist bg-surface font-semibold text-ink"
                />
              </div>

              <div>
                <label className="text-graphite block mb-1">Tenant Slug</label>
                <input
                  type="text"
                  required
                  value={newOrgForm.slug}
                  onChange={e => setNewOrgForm(p => ({ ...p, slug: e.target.value }))}
                  className="w-full p-2 rounded border border-mist bg-surface text-primary font-bold"
                />
              </div>

              <div>
                <label className="text-graphite block mb-1">Plan Tier</label>
                <select
                  value={newOrgForm.plan_type}
                  onChange={e => setNewOrgForm(p => ({ ...p, plan_type: e.target.value as any }))}
                  className="w-full p-2 rounded border border-mist bg-surface"
                >
                  <option value="basic">Basic Plan</option>
                  <option value="pro">Pro Plan</option>
                  <option value="enterprise">Enterprise Plan</option>
                </select>
              </div>

              <div>
                <label className="text-graphite block mb-1">Contact Phone</label>
                <input
                  type="text"
                  required
                  placeholder="+1 (555) 000-0000"
                  value={newOrgForm.phone}
                  onChange={e => setNewOrgForm(p => ({ ...p, phone: e.target.value }))}
                  className="w-full p-2 rounded border border-mist bg-surface"
                />
              </div>

              <div>
                <label className="text-graphite block mb-1">Initial Trial / Duration (Days)</label>
                <input
                  type="number"
                  value={newOrgForm.subscription_days}
                  onChange={e => setNewOrgForm(p => ({ ...p, subscription_days: parseInt(e.target.value) || 30 }))}
                  className="w-full p-2 rounded border border-mist bg-surface font-bold"
                />
              </div>

              <div className="col-span-2">
                <label className="text-graphite block mb-1">Address</label>
                <input
                  type="text"
                  required
                  placeholder="Street Address, City"
                  value={newOrgForm.address}
                  onChange={e => setNewOrgForm(p => ({ ...p, address: e.target.value }))}
                  className="w-full p-2 rounded border border-mist bg-surface"
                />
              </div>

              <div>
                <label className="text-graphite block mb-1">Initial Owner Name</label>
                <input
                  type="text"
                  required
                  placeholder="Owner Name"
                  value={newOrgForm.owner_name}
                  onChange={e => setNewOrgForm(p => ({ ...p, owner_name: e.target.value }))}
                  className="w-full p-2 rounded border border-mist bg-surface"
                />
              </div>

              <div>
                <label className="text-graphite block mb-1">Initial Owner Email (Sends Access Link)</label>
                <input
                  type="email"
                  required
                  placeholder="owner@restaurant.com"
                  value={newOrgForm.owner_email}
                  onChange={e => setNewOrgForm(p => ({ ...p, owner_email: e.target.value }))}
                  className="w-full p-2 rounded border border-mist bg-surface font-bold text-primary"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-3 border-t border-mist">
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="flex-1 py-2 rounded border border-mist text-xs font-semibold text-graphite hover:bg-steel font-sans"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 py-2 rounded bg-primary text-white text-xs font-bold hover:bg-primary-hover font-mono shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? 'Provisioning & Emailing...' : 'Provision Tenant & Email Owner'}
                <Sparkles className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 2: Edit Organization Details */}
      {editingOrg && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleEditOrganizationSubmit} className="bg-surface border border-mist rounded-lg shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-mist pb-3">
              <h3 className="font-bold text-sm text-ink font-mono">
                Edit Organization — {editingOrg.name}
              </h3>
              <button type="button" onClick={() => setEditingOrg(null)} className="text-graphite hover:text-ink">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs font-mono">
              <div>
                <label className="text-graphite block mb-1">Restaurant Name</label>
                <input
                  type="text"
                  value={editingOrg.name}
                  onChange={e => setEditingOrg({ ...editingOrg, name: e.target.value })}
                  className="w-full p-2 rounded border border-mist bg-surface font-bold text-ink"
                />
              </div>

              <div>
                <label className="text-graphite block mb-1">Plan Tier</label>
                <select
                  value={editingOrg.plan_type}
                  onChange={e => setEditingOrg({ ...editingOrg, plan_type: e.target.value as any })}
                  className="w-full p-2 rounded border border-mist bg-surface"
                >
                  <option value="basic">Basic Plan</option>
                  <option value="pro">Pro Plan</option>
                  <option value="enterprise">Enterprise Plan</option>
                </select>
              </div>

              <div>
                <label className="text-graphite block mb-1">Phone</label>
                <input
                  type="text"
                  value={editingOrg.phone}
                  onChange={e => setEditingOrg({ ...editingOrg, phone: e.target.value })}
                  className="w-full p-2 rounded border border-mist bg-surface"
                />
              </div>

              <div>
                <label className="text-graphite block mb-1">Address</label>
                <input
                  type="text"
                  value={editingOrg.address}
                  onChange={e => setEditingOrg({ ...editingOrg, address: e.target.value })}
                  className="w-full p-2 rounded border border-mist bg-surface"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t border-mist">
              <button
                type="button"
                onClick={() => setEditingOrg(null)}
                className="flex-1 py-2 rounded border border-mist text-xs font-semibold text-graphite hover:bg-steel font-sans"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 py-2 rounded bg-primary text-white text-xs font-bold hover:bg-primary-hover font-mono shadow-sm"
              >
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 3: Subscription Extension Modal */}
      {selectedOrgForExtension && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface border border-mist rounded-lg shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-mist pb-3">
              <h3 className="font-bold text-sm text-ink font-mono">
                Extend Subscription — {selectedOrgForExtension.name}
              </h3>
              <button onClick={() => setSelectedOrgForExtension(null)} className="text-graphite hover:text-ink">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs font-mono">
              <p className="text-graphite">
                Current Expiry: <strong className="text-ink">{new Date(selectedOrgForExtension.subscription_expires_at).toLocaleDateString()}</strong>
              </p>

              <div>
                <label className="text-xs font-bold text-graphite block mb-2">Select Extension Option</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 p-2.5 rounded border border-mist bg-steel/30 hover:bg-steel cursor-pointer">
                    <input
                      type="radio"
                      name="ext"
                      checked={extensionOption === 'one_month'}
                      onChange={() => setExtensionOption('one_month')}
                    />
                    <span className="font-bold text-ink">+ 1 Month Extension</span>
                  </label>
                  <label className="flex items-center gap-2 p-2.5 rounded border border-mist bg-steel/30 hover:bg-steel cursor-pointer">
                    <input
                      type="radio"
                      name="ext"
                      checked={extensionOption === 'three_months'}
                      onChange={() => setExtensionOption('three_months')}
                    />
                    <span className="font-bold text-ink">+ 3 Months Extension</span>
                  </label>
                  <label className="flex items-center gap-2 p-2.5 rounded border border-mist bg-steel/30 hover:bg-steel cursor-pointer">
                    <input
                      type="radio"
                      name="ext"
                      checked={extensionOption === 'custom'}
                      onChange={() => setExtensionOption('custom')}
                    />
                    <span className="font-bold text-ink">Set Custom Expiry Date</span>
                  </label>
                </div>
              </div>

              {extensionOption === 'custom' && (
                <div>
                  <label className="text-xs text-graphite block mb-1">Pick Date</label>
                  <input
                    type="date"
                    value={customDate}
                    onChange={e => setCustomDate(e.target.value)}
                    className="w-full p-2 rounded border border-mist text-xs font-mono bg-surface"
                  />
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setSelectedOrgForExtension(null)}
                className="flex-1 py-2 rounded border border-mist text-xs font-semibold text-graphite hover:bg-steel font-sans"
              >
                Cancel
              </button>
              <button
                onClick={handleExtendSubscription}
                disabled={isSubmitting}
                className="flex-1 py-2 rounded bg-primary text-white text-xs font-bold hover:bg-primary-hover font-mono shadow-sm"
              >
                {isSubmitting ? 'Extending...' : 'Confirm Extension'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Organization Confirmation Modal */}
      {deletingOrg && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-surface border-2 border-red-500 rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-4 bg-red-50 border-b border-red-200 flex items-center justify-between">
              <div className="flex items-center gap-2 text-red-700 font-bold text-sm font-mono">
                <Trash2 className="w-5 h-5" />
                <span>Delete Organization</span>
              </div>
              <button onClick={() => setDeletingOrg(null)} className="text-graphite hover:text-ink">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-4 font-sans text-xs">
              <p className="text-graphite">
                Are you sure you want to permanently delete organization <strong className="text-ink font-bold">{deletingOrg.name}</strong>?
              </p>
              <div className="p-3 bg-steel rounded-md border border-mist font-mono space-y-1">
                <div><span className="text-graphite">Schema:</span> <strong className="text-primary">{deletingOrg.schema_name}</strong></div>
                <div><span className="text-graphite">ID:</span> <strong className="text-ink">{deletingOrg.id}</strong></div>
              </div>
              <p className="text-red-600 font-bold">
                ⚠️ WARNING: This action cannot be undone. The database schema and all associated tenant data will be permanently purged.
              </p>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDeletingOrg(null)}
                  className="flex-1 py-2.5 rounded border border-mist text-graphite font-bold hover:bg-steel font-mono"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleDeleteOrganization}
                  className="flex-1 py-2.5 rounded bg-red-600 text-white font-bold hover:bg-red-700 shadow font-mono disabled:opacity-50"
                >
                  {isSubmitting ? 'Deleting...' : 'Permanently Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
