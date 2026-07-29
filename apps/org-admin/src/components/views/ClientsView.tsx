import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Client } from '@restaurant-saas/shared-schemas';
import { formatCurrency } from '@restaurant-saas/ui';
import {
  Users,
  Phone,
  MapPin,
  Plus,
  X,
  UserPlus,
  Edit2,
  Trash2,
  RefreshCw,
  DollarSign,
  CheckCircle2,
  Sliders,
  FileSpreadsheet,
  ChevronDown,
  Search,
  Info,
  Banknote,
  CreditCard,
  Building2,
  MoreVertical
} from 'lucide-react';
import { ConfirmModal } from '../common/ConfirmModal';
import { Pagination } from '../common/Pagination';
import { downloadCsv } from '../../utils/exportCsv';

interface ClientsViewProps {
  clients: Client[];
  onAddClient: (newClient: any) => void;
  onUpdateClient: (id: string, updates: any) => void;
  onDeleteClient: (id: string) => void;
  onPayCreditBalance?: (id: string, amount: number, paymentMethod: string) => Promise<void>;
  onRefreshData?: () => void;
}

export const ClientsView: React.FC<ClientsViewProps> = ({
  clients,
  onAddClient,
  onUpdateClient,
  onDeleteClient,
  onPayCreditBalance,
  onRefreshData
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [payCreditClient, setPayCreditClient] = useState<Client | null>(null);
  const [adjustBalanceClient, setAdjustBalanceClient] = useState<Client | null>(null);

  // Active Dropdown Action Menu ID for Customer Table
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);

  // Search & Pagination State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);

  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [creditBalance, setCreditBalance] = useState<number>(0);

  // Pay Credit State
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMethod, setPayMethod] = useState<string>('cash');

  // Adjust Balance State with Received Input & Auto-Calculation
  const [receivedInput, setReceivedInput] = useState<number>(0);
  const [addToRevenue, setAddToRevenue] = useState<boolean>(true);
  const [adjustPayMethod, setAdjustPayMethod] = useState<string>('cash');

  // Filtered Clients based on Search
  const filteredClients = useMemo(() => {
    return clients.filter(c => {
      const q = searchQuery.toLowerCase();
      return (
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        (c.address && c.address.toLowerCase().includes(q)) ||
        (c.notes && c.notes.toLowerCase().includes(q))
      );
    });
  }, [clients, searchQuery]);

  // Paginated Clients
  const totalPages = Math.ceil(filteredClients.length / itemsPerPage);
  const paginatedClients = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredClients.slice(start, start + itemsPerPage);
  }, [filteredClients, currentPage, itemsPerPage]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone) return;

    const payload = {
      name,
      phone,
      address,
      notes,
      credit_balance: Number(creditBalance)
    };

    if (editingClient) {
      onUpdateClient(editingClient.id, payload);
      setEditingClient(null);
    } else {
      onAddClient(payload);
    }

    setName('');
    setPhone('');
    setAddress('');
    setNotes('');
    setCreditBalance(0);
    setIsModalOpen(false);
  };

  const openEditClient = (client: Client) => {
    setEditingClient(client);
    setName(client.name);
    setPhone(client.phone);
    setAddress(client.address || '');
    setNotes(client.notes || '');
    setCreditBalance(Number(client.credit_balance) || 0);
    setIsModalOpen(true);
    setActiveMenuId(null);
  };

  const openPayCreditModal = (client: Client) => {
    setPayCreditClient(client);
    setPayAmount(Number(client.credit_balance) || 0);
    setPayMethod('cash');
    setActiveMenuId(null);
  };

  const openAdjustBalanceModal = (client: Client) => {
    setAdjustBalanceClient(client);
    setReceivedInput(0);
    setAddToRevenue(true);
    setAdjustPayMethod('cash');
    setActiveMenuId(null);
  };

  const handlePayCreditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payCreditClient || payAmount <= 0) return;

    if (onPayCreditBalance) {
      await onPayCreditBalance(payCreditClient.id, payAmount, payMethod);
    }
    setPayCreditClient(null);
  };

  const handleAdjustBalanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustBalanceClient) return;

    const currBalance = Number(adjustBalanceClient.credit_balance) || 0;
    const finalReceived = Number(receivedInput) || 0;
    const remainingCalculatedBalance = Math.max(0, currBalance - finalReceived);

    if (addToRevenue && finalReceived > 0 && onPayCreditBalance) {
      await onPayCreditBalance(adjustBalanceClient.id, finalReceived, adjustPayMethod);
    } else {
      onUpdateClient(adjustBalanceClient.id, { credit_balance: remainingCalculatedBalance });
    }

    setAdjustBalanceClient(null);
  };

  const handleConfirmDelete = () => {
    if (deleteConfirm) {
      onDeleteClient(deleteConfirm.id);
      setDeleteConfirm(null);
    }
  };

  const handleRefreshClick = async () => {
    if (onRefreshData) {
      setIsRefreshing(true);
      await onRefreshData();
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  const handleExportCsv = () => {
    const exportData = filteredClients.map(c => ({
      'Customer ID': c.id,
      'Full Name': c.name,
      'Phone Number': c.phone,
      'Address': c.address || '',
      'Notes': c.notes || '',
      'Due Credit Balance ($)': c.credit_balance
    }));
    downloadCsv(`customers_export_${new Date().toISOString().split('T')[0]}`, exportData);
  };

  return (
    <div className="p-6 space-y-6 flex-1 overflow-y-auto font-sans">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-ink">Client Register & Credit Ledger</h2>
          <p className="text-xs text-graphite font-mono">Customer CRM, credit balance payoff (adds to revenue), balance adjustments & history</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            className="px-3 py-2 rounded-md bg-steel border border-mist text-ink text-xs font-mono font-bold hover:bg-mist/60 transition-all flex items-center gap-1.5 shadow-sm"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
            <span>Export Excel / CSV</span>
          </button>

          <button
            onClick={handleRefreshClick}
            disabled={isRefreshing}
            className="px-3.5 py-2 rounded-md bg-steel border border-mist text-ink text-xs font-mono font-bold hover:bg-mist/60 transition-all flex items-center gap-1.5 shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-primary ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Refreshing...' : 'Refresh Customers'}</span>
          </button>

          <button
            onClick={() => { setEditingClient(null); setName(''); setPhone(''); setIsModalOpen(true); }}
            className="px-4 py-2 rounded-md bg-primary text-white text-xs font-bold hover:bg-primary-hover transition-all flex items-center gap-2 shadow-sm font-mono"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add New Customer</span>
          </button>
        </div>
      </div>

      {/* Control Bar: Search Input */}
      <div className="p-4 rounded-md border border-mist bg-surface shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-graphite" />
          <input
            type="text"
            placeholder="Search by name, phone, address..."
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            className="w-full pl-9 pr-3 py-1.5 rounded-md border border-mist text-xs font-mono text-ink placeholder-graphite bg-surface focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <div className="text-xs font-mono text-graphite">
          Total Customers: <strong className="text-ink">{filteredClients.length}</strong>
        </div>
      </div>

      {/* Customer Data Table */}
      <div className="border border-mist rounded-md bg-surface shadow-sm overflow-x-auto relative">
        <table className="w-full text-left text-xs">
          <thead className="bg-steel border-b border-mist text-graphite uppercase font-mono font-semibold">
            <tr>
              <th className="p-3">Customer Name</th>
              <th className="p-3">Phone</th>
              <th className="p-3">Address</th>
              <th className="p-3">Notes</th>
              <th className="p-3 text-right">Due Credit Balance ($)</th>
              <th className="p-3 text-center">Credit Actions</th>
              <th className="p-3 text-center">Manage</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-mist font-sans">
            {paginatedClients.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-graphite font-mono">
                  No customers found matching current filter.
                </td>
              </tr>
            ) : (
              paginatedClients.map(cli => {
                const isMenuOpen = activeMenuId === cli.id;
                return (
                  <tr key={cli.id} className="hover:bg-steel/40 transition-colors relative">
                    <td className="p-3 font-bold text-ink">{cli.name}</td>
                    <td className="p-3 font-mono text-graphite">{cli.phone}</td>
                    <td className="p-3 text-graphite">{cli.address || '—'}</td>
                    <td className="p-3 text-graphite">{cli.notes || '—'}</td>
                    <td className="p-3 text-right font-mono font-bold tabular-nums text-primary text-sm">
                      {formatCurrency(cli.credit_balance)}
                    </td>
                    <td className="p-3 text-center font-mono relative">
                      {/* Compact Sleek Action Menu Button */}
                      <div className="relative inline-block text-left">
                        <button
                          onClick={() => setActiveMenuId(isMenuOpen ? null : cli.id)}
                          className="px-3 py-1.5 rounded-md border border-mist bg-surface hover:bg-steel text-ink text-xs font-mono font-bold transition-all shadow-sm flex items-center justify-between gap-1.5"
                        >
                          <span>Manage Credit</span>
                          <ChevronDown className={`w-3.5 h-3.5 text-graphite transition-transform ${isMenuOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {/* Dropdown Popover */}
                        {isMenuOpen && (
                          <div className="absolute right-0 mt-1 w-56 rounded-md bg-surface border border-mist shadow-lg z-30 py-1 font-mono text-xs text-left animate-in fade-in-50 zoom-in-95">
                            <button
                              onClick={() => openPayCreditModal(cli)}
                              className="w-full px-3 py-2 text-left hover:bg-emerald-50 text-emerald-800 flex items-center gap-2 transition-colors font-semibold"
                            >
                              <DollarSign className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span>Clear Balance & Add Revenue</span>
                            </button>

                            <button
                              onClick={() => openAdjustBalanceModal(cli)}
                              className="w-full px-3 py-2 text-left hover:bg-steel text-ink flex items-center gap-2 transition-colors font-semibold border-t border-mist/60"
                            >
                              <Sliders className="w-3.5 h-3.5 text-primary shrink-0" />
                              <span>Update / Adjust Balance</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => openEditClient(cli)} title="Edit Customer" className="p-1 text-graphite hover:text-primary"><Edit2 className="w-3.5 h-3.5" /></button>
                        <button onClick={() => setDeleteConfirm({ id: cli.id, name: cli.name })} title="Delete Customer" className="p-1 text-graphite hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Pagination Controls */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filteredClients.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={setItemsPerPage}
        />
      </div>

      {/* MODAL 1: Clear Balance & Record Revenue Payment */}
      {payCreditClient && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handlePayCreditSubmit} className="bg-surface border border-mist rounded-lg shadow-xl w-full max-w-md p-6 space-y-4 font-sans">
            <div className="flex items-center justify-between border-b border-mist pb-3 font-mono">
              <h3 className="font-bold text-sm text-ink flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                <span>Receive Payment & Clear Due Balance</span>
              </h3>
              <button type="button" onClick={() => setPayCreditClient(null)} className="text-graphite hover:text-ink">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded font-mono text-xs text-emerald-900 space-y-1">
              <div>Customer: <strong>{payCreditClient.name}</strong></div>
              <div>Current Outstanding Balance: <strong className="text-red-700">{formatCurrency(payCreditClient.credit_balance)}</strong></div>
              <div className="flex items-start gap-1.5 text-[11px] text-emerald-800 mt-1 font-sans border-t border-emerald-200/60 pt-1">
                <Info className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span>Received payment will automatically update customer balance AND be recorded as a Revenue Sale entry.</span>
              </div>
            </div>

            <div className="space-y-3 text-xs font-mono">
              <div>
                <label className="text-graphite block mb-1">Amount Received ($)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={payAmount}
                  onChange={e => setPayAmount(parseFloat(e.target.value) || 0)}
                  className="w-full p-2.5 rounded border border-mist bg-surface text-ink font-bold text-base"
                />
              </div>

              <div>
                <label className="text-graphite block mb-1">Payment Register / Method</label>
                <select
                  value={payMethod}
                  onChange={e => setPayMethod(e.target.value)}
                  className="w-full p-2 rounded border border-mist bg-surface font-semibold text-xs"
                >
                  <option value="cash">Cash Register</option>
                  <option value="card">Credit / Debit Card</option>
                  <option value="bank_transfer">Bank Transfer</option>
                </select>
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t border-mist font-mono">
              <button
                type="button"
                onClick={() => setPayCreditClient(null)}
                className="flex-1 py-2.5 rounded border border-mist text-xs font-semibold text-graphite hover:bg-steel font-sans"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 rounded bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 shadow-sm"
              >
                Clear Balance & Add Revenue
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL 2: Adjust / Update Balance Manually */}
      {adjustBalanceClient && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleAdjustBalanceSubmit} className="bg-surface border border-mist rounded-lg shadow-xl w-full max-w-md p-6 space-y-4 font-sans text-xs">
            <div className="flex items-center justify-between border-b border-mist pb-3 font-mono">
              <h3 className="font-bold text-sm text-ink flex items-center gap-2">
                <Sliders className="w-4 h-4 text-primary" />
                <span>Adjust Customer Due Balance</span>
              </h3>
              <button type="button" onClick={() => setAdjustBalanceClient(null)} className="text-graphite hover:text-ink">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-steel/50 border border-mist rounded font-mono text-xs space-y-1 text-ink">
              <div>Customer: <strong>{adjustBalanceClient.name}</strong></div>
              <div>Current Outstanding Balance: <strong className="text-primary">{formatCurrency(adjustBalanceClient.credit_balance)}</strong></div>
            </div>

            <div className="space-y-3 font-mono">
              <div>
                <label className="text-graphite block mb-1 font-semibold">Payment Received ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={receivedInput}
                  onChange={e => setReceivedInput(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-full p-2.5 rounded border border-mist bg-surface text-emerald-700 font-bold text-base"
                />
              </div>

              {/* Auto-calculated remaining balance preview */}
              <div className="p-3 bg-primary/5 border border-primary/20 rounded flex items-center justify-between text-ink">
                <span>Calculated Remaining Due Balance:</span>
                <span className="font-bold text-primary text-base">
                  {formatCurrency(Math.max(0, Number(adjustBalanceClient.credit_balance) - (Number(receivedInput) || 0)))}
                </span>
              </div>

              <div>
                <label className="text-graphite block mb-1 font-semibold font-mono">Register Payment Method</label>
                <select
                  value={adjustPayMethod}
                  onChange={e => setAdjustPayMethod(e.target.value)}
                  className="w-full p-2 rounded border border-mist bg-surface font-semibold text-xs"
                >
                  <option value="cash">Cash Register</option>
                  <option value="card">Credit / Debit Card</option>
                  <option value="bank_transfer">Bank Transfer</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-1 font-sans">
                <input
                  type="checkbox"
                  id="addToRevenueCheck"
                  checked={addToRevenue}
                  onChange={e => setAddToRevenue(e.target.checked)}
                  className="w-4 h-4 accent-primary rounded cursor-pointer"
                />
                <label htmlFor="addToRevenueCheck" className="text-xs text-graphite font-semibold cursor-pointer">
                  Add received payment ({formatCurrency(receivedInput || 0)}) directly to Sales Revenue
                </label>
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t border-mist font-mono">
              <button
                type="button"
                onClick={() => setAdjustBalanceClient(null)}
                className="flex-1 py-2.5 rounded border border-mist text-xs font-semibold text-graphite hover:bg-steel font-sans"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 rounded bg-primary text-white text-xs font-bold hover:bg-primary-hover shadow-sm"
              >
                Update Customer Balance
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Add / Edit Customer Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <form onSubmit={handleSubmit} className="bg-surface border border-mist rounded-lg shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-mist pb-3 font-mono">
              <h3 className="font-bold text-sm text-ink flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                <span>{editingClient ? 'Edit Customer Info' : 'Register New Customer'}</span>
              </h3>
              <button type="button" onClick={() => setIsModalOpen(false)} className="text-graphite hover:text-ink">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs font-mono">
              <div>
                <label className="text-graphite block mb-1">Customer Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Doe"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full p-2 rounded border border-mist bg-surface text-ink font-semibold"
                />
              </div>

              <div>
                <label className="text-graphite block mb-1">Phone Number *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. +1 555 0192"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="w-full p-2 rounded border border-mist bg-surface font-semibold"
                />
              </div>

              <div>
                <label className="text-graphite block mb-1">Delivery Address</label>
                <input
                  type="text"
                  placeholder="e.g. 124 Main Street, Suite 4"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  className="w-full p-2 rounded border border-mist bg-surface font-semibold"
                />
              </div>

              <div>
                <label className="text-graphite block mb-1">CRM Notes & Tags</label>
                <input
                  type="text"
                  placeholder="e.g. VIP Member, Prefers Less Spicy"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full p-2 rounded border border-mist bg-surface"
                />
              </div>

              <div>
                <label className="text-graphite block mb-1">Initial Due Credit Balance ($)</label>
                <input
                  type="number"
                  step="0.01"
                  value={creditBalance}
                  onChange={e => setCreditBalance(parseFloat(e.target.value) || 0)}
                  className="w-full p-2 rounded border border-mist bg-surface font-bold text-primary"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t border-mist font-mono">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="flex-1 py-2 rounded border border-mist text-xs font-semibold text-graphite hover:bg-steel font-sans"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2 rounded bg-primary text-white text-xs font-bold hover:bg-primary-hover shadow-sm"
              >
                {editingClient ? 'Save Changes' : 'Register Customer'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Deletion Confirm Modal */}
      <ConfirmModal
        isOpen={Boolean(deleteConfirm)}
        title="Delete Customer Profile"
        message={`Are you sure you want to permanently remove '${deleteConfirm?.name}' from customer CRM?`}
        confirmText="Delete Customer"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteConfirm(null)}
      />
    </div>
  );
};
