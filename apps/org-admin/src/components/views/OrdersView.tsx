import React, { useState, useMemo } from 'react';
import { Order, OrderItem, OrderStatus, Product } from '@restaurant-saas/shared-schemas';
import { formatCurrency, getOrderStatusMeta } from '@restaurant-saas/ui';
import { Search, Filter, X, Clock, User, ChevronRight, Plus, Minus, Trash2, Edit3, Save } from 'lucide-react';
import { Pagination } from '../common/Pagination';
import { useOrdersController } from '../../features/orders/useOrdersController';

export const OrdersView: React.FC = () => {
  const {
    orders,
    products,
    onUpdateOrderStatus,
    onUpdateOrderItems
  } = useOrdersController();

  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);

  // Edit Items State
  const [isEditingItems, setIsEditingItems] = useState(false);
  const [editingItems, setEditingItems] = useState<OrderItem[]>([]);
  const [selectedProdToAdd, setSelectedProdToAdd] = useState<string>('');

  const filterChips = [
    { id: 'all', label: 'All Orders' },
    { id: 'new', label: 'New' },
    { id: 'preparing', label: 'Preparing' },
    { id: 'ready', label: 'Ready' },
    { id: 'out_for_delivery', label: 'Out for Delivery' },
    { id: 'completed', label: 'Completed' },
    { id: 'cancelled', label: 'Cancelled' }
  ];

  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      const matchesStatus = filterStatus === 'all' || o.status === filterStatus;
      const matchesSearch =
        o.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (o.client_name && o.client_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (o.table_no && o.table_no.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesStatus && matchesSearch;
    });
  }, [orders, filterStatus, searchQuery]);

  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredOrders.slice(start, start + itemsPerPage);
  }, [filteredOrders, currentPage, itemsPerPage]);

  const handleStartEdit = (order: Order) => {
    setEditingItems([...order.items]);
    setIsEditingItems(true);
  };

  const handleItemQtyChange = (productId: string, delta: number) => {
    setEditingItems(prev =>
      prev
        .map(item => {
          if (item.product_id === productId) {
            const newQty = item.qty + delta;
            return newQty > 0 ? { ...item, qty: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as OrderItem[]
    );
  };

  const handleRemoveItem = (productId: string) => {
    setEditingItems(prev => prev.filter(item => item.product_id !== productId));
  };

  const handleAddProductToOrder = () => {
    if (!selectedProdToAdd) return;
    const prod = products.find(p => p.id === selectedProdToAdd);
    if (!prod) return;

    setEditingItems(prev => {
      const existing = prev.find(i => i.product_id === prod.id);
      if (existing) {
        return prev.map(i => i.product_id === prod.id ? { ...i, qty: i.qty + 1 } : i);
      }
      return [
        ...prev,
        {
          id: `oi-${Date.now()}-${prod.id}`,
          product_id: prod.id,
          product_name: prod.name,
          qty: 1,
          unit_price: prod.price
        }
      ];
    });
    setSelectedProdToAdd('');
  };

  const handleSaveOrderItems = () => {
    if (!selectedOrder) return;
    onUpdateOrderItems(selectedOrder.id, editingItems);
    setIsEditingItems(false);
    setSelectedOrder(null);
  };

  return (
    <div className="p-6 space-y-4 flex-1 overflow-y-auto">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-ink">Orders Rail & Operations</h2>
          <p className="text-xs text-graphite font-mono">Live tickets · Modify uncompleted order items · Status tracking</p>
        </div>
      </div>

      {/* Filter Chips & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1">
          {filterChips.map(chip => (
            <button
              key={chip.id}
              onClick={() => { setFilterStatus(chip.id); setCurrentPage(1); }}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-all ${
                filterStatus === chip.id
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-surface border border-mist text-graphite hover:text-ink'
              }`}
            >
              {chip.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-graphite" />
          <input
            type="text"
            placeholder="Search order #, table, client..."
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            className="w-full pl-9 pr-3 py-2 rounded-md border border-mist text-xs focus:outline-none focus:ring-1 focus:ring-primary bg-surface font-mono"
          />
        </div>
      </div>

      {/* Orders DataTable */}
      <div className="border border-mist rounded-md bg-surface shadow-sm overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-steel border-b border-mist text-graphite uppercase font-mono font-semibold">
            <tr>
              <th className="p-3">Order Ticket</th>
              <th className="p-3">Type & Location</th>
              <th className="p-3">Client</th>
              <th className="p-3">Status</th>
              <th className="p-3">Time</th>
              <th className="p-3 text-right">Total Amount</th>
              <th className="p-3 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-mist font-sans">
            {paginatedOrders.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-graphite font-mono">
                  No orders match the current filter.
                </td>
              </tr>
            ) : (
              paginatedOrders.map(order => {
                const statusMeta = getOrderStatusMeta(order.status, order.is_overdue);
                return (
                  <tr
                    key={order.id}
                    onClick={() => { setSelectedOrder(order); setIsEditingItems(false); }}
                    className="hover:bg-steel/50 cursor-pointer transition-colors"
                  >
                    <td className="p-3 font-mono font-bold text-ink">{order.order_number}</td>
                    <td className="p-3">
                      <span className="font-semibold text-ink uppercase text-[11px] font-mono">
                        {order.table_no ? `Table ${order.table_no}` : order.type}
                      </span>
                    </td>
                    <td className="p-3 text-ink font-medium">{order.client_name || 'Walk-in'}</td>
                    <td className="p-3">
                      <span className={`px-2.5 py-1 rounded text-[11px] font-mono font-semibold inline-flex items-center gap-1 ${statusMeta.badgeClass}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${statusMeta.dotColorClass}`} />
                        {statusMeta.label}
                      </span>
                    </td>
                    <td className="p-3 font-mono text-graphite">
                      {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-ink tabular-nums">
                      {formatCurrency(order.total)}
                    </td>
                    <td className="p-3 text-center">
                      <ChevronRight className="w-4 h-4 text-graphite inline" />
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
          totalItems={filteredOrders.length}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={setItemsPerPage}
        />
      </div>

      {/* Detail & Edit Slide-Over Drawer */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-md bg-surface border-l border-mist h-full p-6 overflow-y-auto space-y-6 animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between border-b border-mist pb-4">
              <div>
                <span className="text-xs font-mono text-graphite uppercase">Ticket Details</span>
                <h3 className="text-xl font-mono font-bold text-ink">{selectedOrder.order_number}</h3>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="text-graphite hover:text-ink">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 font-mono text-xs">
              <div className="flex justify-between py-1 border-b border-mist">
                <span className="text-graphite">Type:</span>
                <span className="font-bold text-ink uppercase">{selectedOrder.type} ({selectedOrder.table_no || 'N/A'})</span>
              </div>
              <div className="flex justify-between py-1 border-b border-mist">
                <span className="text-graphite">Created By:</span>
                <span className="font-bold text-ink">{selectedOrder.created_by}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-mist">
                <span className="text-graphite">Timestamp:</span>
                <span className="font-bold text-ink">{new Date(selectedOrder.created_at).toLocaleString()}</span>
              </div>
            </div>

            {/* Line items section */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-bold text-xs font-mono text-graphite uppercase">Order Items</h4>
                {selectedOrder.status !== 'completed' && selectedOrder.status !== 'cancelled' && !isEditingItems && (
                  <button
                    onClick={() => handleStartEdit(selectedOrder)}
                    className="px-2.5 py-1 rounded bg-primary/10 hover:bg-primary/20 text-primary font-mono text-xs font-bold flex items-center gap-1"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Modify / Add Items</span>
                  </button>
                )}
              </div>

              {!isEditingItems ? (
                <div className="divide-y divide-mist border border-mist rounded-md bg-steel/30 p-2">
                  {selectedOrder.items.map((item: any, idx: number) => (
                    <div key={idx} className="py-2 flex justify-between text-xs font-sans">
                      <div>
                        <p className="font-bold text-ink">{item.product_name}</p>
                        <p className="text-[11px] font-mono text-graphite">{item.qty} x {formatCurrency(item.unit_price)}</p>
                      </div>
                      <p className="font-mono font-bold text-ink tabular-nums">{formatCurrency(item.qty * item.unit_price)}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-3 p-3 bg-steel/50 border border-mist rounded-md font-mono text-xs">
                  <div className="divide-y divide-mist">
                    {editingItems.map(item => (
                      <div key={item.product_id} className="py-2 flex items-center justify-between gap-2">
                        <span className="font-semibold text-ink flex-1">{item.product_name}</span>
                        <div className="flex items-center gap-1 bg-surface border border-mist rounded p-0.5">
                          <button onClick={() => handleItemQtyChange(item.product_id, -1)} className="p-1 hover:bg-steel text-graphite"><Minus className="w-3 h-3" /></button>
                          <span className="px-2 font-bold text-ink">{item.qty}</span>
                          <button onClick={() => handleItemQtyChange(item.product_id, 1)} className="p-1 hover:bg-steel text-graphite"><Plus className="w-3 h-3" /></button>
                        </div>
                        <button onClick={() => handleRemoveItem(item.product_id)} className="p-1 text-red-600 hover:text-red-800"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    ))}
                  </div>

                  {/* Add dish dropdown */}
                  <div className="flex gap-2 pt-2 border-t border-mist">
                    <select
                      value={selectedProdToAdd}
                      onChange={e => setSelectedProdToAdd(e.target.value)}
                      className="flex-1 p-1.5 rounded border border-mist bg-surface text-xs font-sans"
                    >
                      <option value="">Select dish to add...</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id}>{p.name} ({formatCurrency(p.price)})</option>
                      ))}
                    </select>
                    <button
                      onClick={handleAddProductToOrder}
                      disabled={!selectedProdToAdd}
                      className="px-3 py-1.5 rounded bg-primary text-white text-xs font-bold hover:bg-primary-hover disabled:opacity-50"
                    >
                      Add
                    </button>
                  </div>

                  <div className="flex gap-2 pt-2 border-t border-mist">
                    <button onClick={() => setIsEditingItems(false)} className="flex-1 py-1.5 rounded border border-mist bg-surface text-graphite hover:bg-steel">Cancel</button>
                    <button onClick={handleSaveOrderItems} className="flex-1 py-1.5 rounded bg-emerald-600 text-white font-bold hover:bg-emerald-700 flex items-center justify-center gap-1">
                      <Save className="w-3.5 h-3.5" />
                      <span>Save Items</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Status Change Control */}
            <div className="border-t border-mist pt-4 space-y-2">
              <label className="text-xs font-mono font-bold text-graphite uppercase block">Update Ticket Status</label>
              <div className="grid grid-cols-2 gap-2 font-mono text-xs">
                {(['new', 'preparing', 'ready', 'out_for_delivery', 'completed', 'cancelled'] as OrderStatus[]).map(st => (
                  <button
                    key={st}
                    onClick={() => { onUpdateOrderStatus(selectedOrder.id, st); setSelectedOrder(null); }}
                    className={`p-2 rounded border text-left font-bold capitalize transition-all ${
                      selectedOrder.status === st
                        ? 'bg-primary text-white border-primary shadow-sm'
                        : 'bg-surface border-mist text-ink hover:bg-steel'
                    }`}
                  >
                    {st.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
