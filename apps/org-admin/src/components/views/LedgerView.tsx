import React, { useState, useMemo } from 'react';
import { LedgerAccount, LedgerEntry, Sale, PaymentMethod } from '@restaurant-saas/shared-schemas';
import { formatCurrency } from '@restaurant-saas/ui';
import { BookOpen, CreditCard, DollarSign, Plus, Wallet, ShieldCheck, CheckCircle2, X, Filter, Calendar, Edit2, Trash2, ArrowUpRight, ArrowDownRight, RefreshCw } from 'lucide-react';
import { ConfirmModal } from '../common/ConfirmModal';
import { LedgerViewProps, TimeFilter } from './LedgerView.types';

export const LedgerView: React.FC<LedgerViewProps> = ({
  accounts,
  entries,
  sales,
  paymentMethods,
  onAddPaymentMethod,
  onUpdatePaymentMethod,
  onDeletePaymentMethod,
  onAddAccount,
  onUpdateAccount,
  onDeleteAccount,
  onAddManualEntry,
  onRefreshData
}) => {
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [isAddPmModalOpen, setIsAddPmModalOpen] = useState(false);
  const [isJournalModalOpen, setIsJournalModalOpen] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<LedgerAccount | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Deletion Confirm State
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: 'account' | 'payment_method'; id: string; name: string } | null>(null);

  // Payment Method Form State
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [linkedAccountId, setLinkedAccountId] = useState(accounts[0]?.id || 'leg-1');

  // Account Form State
  const [accountName, setAccountName] = useState('');
  const [accountType, setAccountType] = useState<'cash' | 'bank' | 'receivable' | 'payable' | 'revenue' | 'expense'>('cash');
  const [initialBalance, setInitialBalance] = useState<number>(0);

  // Journal Entry Form State
  const [debitAccountId, setDebitAccountId] = useState(accounts[0]?.id || '');
  const [creditAccountId, setCreditAccountId] = useState(accounts[1]?.id || accounts[0]?.id || '');
  const [entryAmount, setEntryAmount] = useState<number>(100);
  const [entryDesc, setEntryDesc] = useState('');

  // Filter entries based on time window
  const filteredEntries = useMemo(() => {
    if (timeFilter === 'all') return entries;

    const now = new Date();
    let startTime = new Date();

    if (timeFilter === 'today') {
      startTime.setHours(0, 0, 0, 0);
    } else if (timeFilter === 'week') {
      startTime.setDate(now.getDate() - 7);
    } else if (timeFilter === 'month') {
      startTime.setDate(now.getDate() - 30);
    }

    return entries.filter(e => new Date(e.created_at) >= startTime);
  }, [entries, timeFilter]);

  const handleSubmitPm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !code) return;
    onAddPaymentMethod({ name, code, linked_account_id: linkedAccountId });
    setName('');
    setCode('');
    setIsAddPmModalOpen(false);
  };

  const handleAccountSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountName) return;

    if (editingAccount) {
      if (onUpdateAccount) onUpdateAccount(editingAccount.id, { name: accountName, type: accountType });
      setEditingAccount(null);
    } else {
      if (onAddAccount) onAddAccount({ name: accountName, type: accountType, balance: Number(initialBalance) });
    }

    setAccountName('');
    setIsAccountModalOpen(false);
  };

  const openEditAccount = (acc: LedgerAccount) => {
    setEditingAccount(acc);
    setAccountName(acc.name);
    setAccountType(acc.type as any);
    setIsAccountModalOpen(true);
  };

  const handleJournalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!debitAccountId || !creditAccountId || entryAmount <= 0) return;
    if (debitAccountId === creditAccountId) return;

    if (onAddManualEntry) {
      onAddManualEntry({
        debit_account_id: debitAccountId,
        credit_account_id: creditAccountId,
        amount: Number(entryAmount),
        description: entryDesc || 'Manual Journal Posting'
      });
    }

    setEntryDesc('');
    setIsJournalModalOpen(false);
  };

  const handleConfirmDelete = () => {
    if (!deleteConfirm) return;
    if (deleteConfirm.type === 'account' && onDeleteAccount) {
      onDeleteAccount(deleteConfirm.id);
    } else if (deleteConfirm.type === 'payment_method' && onDeletePaymentMethod) {
      onDeletePaymentMethod(deleteConfirm.id);
    }
    setDeleteConfirm(null);
  };

  const handleRefreshClick = async () => {
    if (onRefreshData) {
      setIsRefreshing(true);
      await onRefreshData();
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  return (
    <div className="p-6 space-y-6 flex-1 overflow-y-auto font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-ink">Sales Registers & Double-Entry Ledger</h2>
          <p className="text-xs text-graphite font-mono">Automated double-entry accounting · Custom payment registers · Manual journal postings</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleRefreshClick}
            disabled={isRefreshing}
            className="px-3.5 py-2 rounded-md bg-steel border border-mist text-ink text-xs font-mono font-bold hover:bg-mist/60 transition-all flex items-center gap-1.5 shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-primary ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Refreshing...' : 'Refresh Ledger'}</span>
          </button>

          {/* Time Window Filter Pills */}
          <div className="p-1 bg-steel rounded-md border border-mist flex font-mono text-xs">
            <button
              onClick={() => setTimeFilter('today')}
              className={`px-2.5 py-1 rounded transition-all font-semibold ${timeFilter === 'today' ? 'bg-surface shadow text-primary font-bold' : 'text-graphite'}`}
            >
              Today
            </button>
            <button
              onClick={() => setTimeFilter('week')}
              className={`px-2.5 py-1 rounded transition-all font-semibold ${timeFilter === 'week' ? 'bg-surface shadow text-primary font-bold' : 'text-graphite'}`}
            >
              7 Days
            </button>
            <button
              onClick={() => setTimeFilter('month')}
              className={`px-2.5 py-1 rounded transition-all font-semibold ${timeFilter === 'month' ? 'bg-surface shadow text-primary font-bold' : 'text-graphite'}`}
            >
              30 Days
            </button>
            <button
              onClick={() => setTimeFilter('all')}
              className={`px-2.5 py-1 rounded transition-all font-semibold ${timeFilter === 'all' ? 'bg-surface shadow text-primary font-bold' : 'text-graphite'}`}
            >
              All Time
            </button>
          </div>

          <button
            onClick={() => setIsJournalModalOpen(true)}
            className="px-3.5 py-2 rounded bg-steel border border-mist text-ink text-xs font-mono font-bold hover:bg-mist/60 transition-all flex items-center gap-1.5"
          >
            <BookOpen className="w-4 h-4 text-primary" />
            <span>Post Journal Entry</span>
          </button>

          <button
            onClick={() => setIsAddPmModalOpen(true)}
            className="px-4 py-2 rounded bg-primary text-white text-xs font-mono font-bold hover:bg-primary-hover shadow flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Add Payment Method</span>
          </button>
        </div>
      </div>

      {/* Chart of Accounts Grid */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-xs font-mono uppercase text-graphite">Chart of Account Registers ({accounts.length})</h3>
          <button
            onClick={() => { setEditingAccount(null); setAccountName(''); setIsAccountModalOpen(true); }}
            className="text-xs font-mono font-bold text-primary hover:underline flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Account Register</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map(acc => (
            <div key={acc.id} className="p-4 rounded-md border border-mist bg-surface shadow-sm space-y-2 relative group">
              <div className="flex justify-between items-start">
                <span className="text-[11px] font-mono text-graphite uppercase tracking-wider font-semibold">{acc.type}</span>
                <div className="flex items-center gap-1">
                  <button onClick={() => openEditAccount(acc)} className="p-0.5 text-graphite hover:text-primary"><Edit2 className="w-3.5 h-3.5" /></button>
                  <button onClick={() => setDeleteConfirm({ type: 'account', id: acc.id, name: acc.name })} className="p-0.5 text-graphite hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
              <h3 className="font-bold text-sm text-ink">{acc.name}</h3>
              <p className="text-xl font-bold font-mono text-primary tabular-nums">
                {formatCurrency(acc.balance)}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Custom Payment Methods & Linked Registers Grid */}
      <div className="space-y-3">
        <h3 className="font-bold text-xs font-mono uppercase text-graphite flex items-center gap-2">
          <Wallet className="w-4 h-4 text-primary" />
          <span>Configured Payment Methods & Register Mappings</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {paymentMethods.map(pm => {
            const linkedAcc = accounts.find(a => a.id === pm.linked_account_id);
            return (
              <div key={pm.id} className="p-3.5 rounded-md border border-mist bg-surface shadow-sm flex items-center justify-between gap-3 relative group">
                <div className="min-w-0">
                  <span className="font-bold text-xs text-ink block truncate">{pm.name}</span>
                  <span className="text-[11px] font-mono text-graphite block truncate">Register: {pm.linked_account_name}</span>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-xs font-mono font-bold text-primary block tabular-nums">
                    {linkedAcc ? formatCurrency(linkedAcc.balance) : '—'}
                  </span>
                  <div className="flex items-center justify-end gap-1 mt-1">
                    <span className="text-[10px] font-mono text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded font-semibold uppercase">Active</span>
                    {onDeletePaymentMethod && (
                      <button onClick={() => setDeleteConfirm({ type: 'payment_method', id: pm.id, name: pm.name })} className="p-0.5 text-graphite hover:text-red-600"><Trash2 className="w-3 h-3" /></button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Journal Entries DataTable */}
      <div className="border border-mist rounded-md bg-surface shadow-sm overflow-hidden space-y-3">
        <div className="p-4 border-b border-mist bg-steel/50 flex items-center justify-between">
          <h3 className="font-bold text-xs font-mono uppercase text-ink flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-primary" />
            <span>General Ledger Journal Log ({filteredEntries.length} entries)</span>
          </h3>
          <span className="text-xs font-mono text-graphite uppercase font-bold">Window: {timeFilter}</span>
        </div>

        <table className="w-full text-left text-xs font-sans">
          <thead className="bg-steel border-b border-mist text-graphite uppercase font-mono font-semibold">
            <tr>
              <th className="p-3">Posting ID</th>
              <th className="p-3">Account Name</th>
              <th className="p-3">Description / Reference</th>
              <th className="p-3 text-right">Debit ($)</th>
              <th className="p-3 text-right">Credit ($)</th>
              <th className="p-3 text-right">Timestamp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-mist">
            {filteredEntries.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-graphite">
                  No automated or manual ledger journal entries found for this time window.
                </td>
              </tr>
            ) : (
              filteredEntries.map(entry => (
                <tr key={entry.id} className="hover:bg-steel/40 transition-colors">
                  <td className="p-3 font-mono font-bold text-ink">{entry.id}</td>
                  <td className="p-3 font-semibold text-ink">{entry.account_name}</td>
                  <td className="p-3 text-graphite">{entry.description} ({entry.reference_type})</td>
                  <td className="p-3 text-right font-mono font-bold text-emerald-700 tabular-nums">
                    {entry.debit > 0 ? formatCurrency(entry.debit) : '—'}
                  </td>
                  <td className="p-3 text-right font-mono font-bold text-primary tabular-nums">
                    {entry.credit > 0 ? formatCurrency(entry.credit) : '—'}
                  </td>
                  <td className="p-3 text-right font-mono text-graphite text-[11px]">
                    {new Date(entry.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL 1: Post Manual Journal Entry */}
      {isJournalModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface border border-mist rounded-lg shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-mist flex items-center justify-between bg-steel">
              <h3 className="font-bold text-sm text-ink flex items-center gap-2 font-mono">
                <BookOpen className="w-4 h-4 text-primary" />
                <span>Manual Double-Entry Journal Posting</span>
              </h3>
              <button onClick={() => setIsJournalModalOpen(false)} className="text-graphite hover:text-ink">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleJournalSubmit} className="p-6 space-y-4 font-sans text-xs">
              <div>
                <label className="text-xs font-mono text-graphite block mb-1 font-bold text-emerald-700">Debit Account (+ Account Asset/Expense)</label>
                <select
                  value={debitAccountId}
                  onChange={e => setDebitAccountId(e.target.value)}
                  className="w-full px-3 py-2 rounded border border-mist bg-surface font-semibold"
                >
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.name} ({acc.type.toUpperCase()})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-mono text-graphite block mb-1 font-bold text-primary">Credit Account (- Account Asset/Revenue)</label>
                <select
                  value={creditAccountId}
                  onChange={e => setCreditAccountId(e.target.value)}
                  className="w-full px-3 py-2 rounded border border-mist bg-surface font-semibold"
                >
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.name} ({acc.type.toUpperCase()})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-mono text-graphite block mb-1">Journal Amount ($)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={entryAmount}
                  onChange={e => setEntryAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded border border-mist bg-surface font-mono font-bold text-ink"
                />
              </div>

              <div>
                <label className="text-xs font-mono text-graphite block mb-1">Description / Reason</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Owner capital injection / Supplier payout"
                  value={entryDesc}
                  onChange={e => setEntryDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded border border-mist bg-surface"
                />
              </div>

              <div className="pt-2 flex gap-2 font-mono">
                <button
                  type="button"
                  onClick={() => setIsJournalModalOpen(false)}
                  className="flex-1 py-2.5 rounded border border-mist text-graphite hover:bg-steel font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded bg-primary text-white font-bold hover:bg-primary-hover shadow"
                >
                  Post Journal Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Create / Edit Account Register */}
      {isAccountModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface border border-mist rounded-lg shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-mist flex items-center justify-between bg-steel">
              <h3 className="font-bold text-sm text-ink flex items-center gap-2 font-mono">
                <Wallet className="w-4 h-4 text-primary" />
                <span>{editingAccount ? 'Edit Account Register' : 'Create Account Register'}</span>
              </h3>
              <button onClick={() => setIsAccountModalOpen(false)} className="text-graphite hover:text-ink">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAccountSubmit} className="p-6 space-y-4 font-sans text-xs">
              <div>
                <label className="text-xs font-mono text-graphite block mb-1">Account Register Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Petty Cash Float / HBL Bank Account"
                  value={accountName}
                  onChange={e => setAccountName(e.target.value)}
                  className="w-full px-3 py-2 rounded border border-mist bg-surface font-semibold text-ink"
                />
              </div>

              <div>
                <label className="text-xs font-mono text-graphite block mb-1">Account Type</label>
                <select
                  value={accountType}
                  onChange={e => setAccountType(e.target.value as any)}
                  className="w-full px-3 py-2 rounded border border-mist bg-surface font-bold text-primary"
                >
                  <option value="cash">Cash Asset</option>
                  <option value="bank">Bank Asset</option>
                  <option value="receivable">Receivable Asset</option>
                  <option value="payable">Payable Liability</option>
                  <option value="revenue">Revenue Account</option>
                  <option value="expense">Operating Expense</option>
                </select>
              </div>

              {!editingAccount && (
                <div>
                  <label className="text-xs font-mono text-graphite block mb-1">Initial Opening Balance ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={initialBalance}
                    onChange={e => setInitialBalance(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded border border-mist bg-surface font-mono font-bold text-ink"
                  />
                </div>
              )}

              <div className="pt-2 flex gap-2 font-mono">
                <button
                  type="button"
                  onClick={() => setIsAccountModalOpen(false)}
                  className="flex-1 py-2.5 rounded border border-mist text-graphite hover:bg-steel font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded bg-primary text-white font-bold hover:bg-primary-hover shadow"
                >
                  {editingAccount ? 'Save Register' : 'Create Register'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Add Custom Payment Method */}
      {isAddPmModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface border border-mist rounded-lg shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-mist flex items-center justify-between bg-steel">
              <h3 className="font-bold text-sm text-ink flex items-center gap-2 font-mono">
                <Plus className="w-4 h-4 text-primary" />
                <span>Add Custom Payment Method & Link Register</span>
              </h3>
              <button onClick={() => setIsAddPmModalOpen(false)} className="text-graphite hover:text-ink">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitPm} className="p-6 space-y-4 font-sans text-xs">
              <div>
                <label className="text-xs font-mono text-graphite block mb-1">Payment Method Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => {
                    setName(e.target.value);
                    setCode(e.target.value.toLowerCase().replace(/\s+/g, '_'));
                  }}
                  placeholder="e.g. Stripe Gateway, Amex Terminal, Apple Pay"
                  className="w-full px-3 py-2 rounded border border-mist bg-surface font-semibold"
                />
              </div>

              <div>
                <label className="text-xs font-mono text-graphite block mb-1">System Code</label>
                <input
                  type="text"
                  required
                  value={code}
                  onChange={e => setCode(e.target.value)}
                  placeholder="e.g. stripe_gateway"
                  className="w-full px-3 py-2 rounded border border-mist bg-surface font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-mono text-graphite block mb-1">Link to Ledger Account Register</label>
                <select
                  value={linkedAccountId}
                  onChange={e => setLinkedAccountId(e.target.value)}
                  className="w-full px-3 py-2 rounded border border-mist bg-surface font-semibold"
                >
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.name} ({acc.type.toUpperCase()} · Balance: {formatCurrency(acc.balance)})</option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex gap-2 font-mono">
                <button
                  type="button"
                  onClick={() => setIsAddPmModalOpen(false)}
                  className="flex-1 py-2.5 rounded border border-mist text-graphite hover:bg-steel font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded bg-primary text-white font-bold hover:bg-primary-hover shadow"
                >
                  Create & Link Register
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Standard Shadcn Deletion Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(deleteConfirm)}
        title={deleteConfirm?.type === 'account' ? 'Delete Account Register' : 'Delete Payment Method'}
        message={`Are you sure you want to permanently delete '${deleteConfirm?.name}'?`}
        confirmText="Delete"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteConfirm(null)}
      />
    </div>
  );
};
