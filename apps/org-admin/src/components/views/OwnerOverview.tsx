import React from 'react';
import { Order, InventoryItem } from '@restaurant-saas/shared-schemas';
import { formatCurrency, getOrderStatusMeta, getInventoryStatusMeta } from '@restaurant-saas/ui';
import { DollarSign, ShoppingBag, AlertTriangle, Clock, ArrowUpRight, TrendingUp, Boxes } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useAppStore } from '../../store/useAppStore';
import { salesApi } from '../../api/sales.api';

interface OwnerOverviewProps {
  orders: Order[];
  inventory: InventoryItem[];
  onSelectTab: (tab: string) => void;
  isLineMode: boolean;
}

export const OwnerOverview: React.FC<OwnerOverviewProps> = ({ orders, inventory, onSelectTab, isLineMode }) => {
  const { org } = useAppStore();
  const orgId = org?.id || '';

  const activeOrders = orders.filter(o => o.status !== 'completed' && o.status !== 'cancelled');
  const lowStockItems = inventory.filter(i => i.status === 'low_stock' || i.status === 'out_of_stock');

  const { data: todayTotalSales = 0 } = useQuery({
    queryKey: ['sales', 'todayTotal', orgId],
    queryFn: async () => {
      if (!orgId) return 0;
      const res = await salesApi.getTodayTotal(orgId);
      return res?.total || 0;
    },
    enabled: !!orgId,
    refetchInterval: 30000 // Refetch every 30s to keep Dashboard live
  });


return (
  <div className="p-6 space-y-6 flex-1 overflow-y-auto">
    {/* Top Header */}
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-ink">Owner Dashboard Overview</h2>
        <p className="text-xs text-graphite font-mono">Real-time operational summary · Restaurant SaaS Platform</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => onSelectTab('pos')}
          className="px-3.5 sm:px-4 py-2 rounded-md bg-primary text-white text-xs font-bold hover:bg-primary-hover transition-all shadow-sm flex-1 sm:flex-none text-center"
        >
          POS
        </button>
        <button
          onClick={() => onSelectTab('kds')}
          className="px-3.5 sm:px-4 py-2 rounded-md bg-amber-500 text-black text-xs font-bold hover:bg-amber-600 transition-all font-mono flex-1 sm:flex-none text-center"
        >
          KDS
        </button>
      </div>
    </div>

    {/* KPI Summary Cards */}
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="p-4 rounded-md border border-mist bg-surface shadow-sm space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-graphite uppercase tracking-wider font-mono">Today's Revenue</span>
          <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <DollarSign className="w-4 h-4" />
          </div>
        </div>
        <p className="text-2xl font-bold font-mono text-ink tabular-nums">{formatCurrency(todayTotalSales)}</p>
        <div className="flex items-center gap-1 text-[11px] text-success font-mono">
          <TrendingUp className="w-3.5 h-3.5" />
          <span>+14.2% vs yesterday</span>
        </div>
      </div>

      <div className="p-4 rounded-md border border-mist bg-surface shadow-sm space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-graphite uppercase tracking-wider font-mono">Active Orders</span>
          <div className="w-8 h-8 rounded-full bg-sky-50 text-sky-700 flex items-center justify-center">
            <ShoppingBag className="w-4 h-4" />
          </div>
        </div>
        <p className="text-2xl font-bold font-mono text-ink tabular-nums">{activeOrders.length}</p>
        <p className="text-[11px] text-graphite font-mono">
          {orders.filter(o => o.status === 'new').length} New · {orders.filter(o => o.status === 'preparing').length} Prep
        </p>
      </div>

      <div className="p-4 rounded-md border border-mist bg-surface shadow-sm space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-graphite uppercase tracking-wider font-mono">Low Stock Alerts</span>
          <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-700 flex items-center justify-center">
            <AlertTriangle className="w-4 h-4" />
          </div>
        </div>
        <p className="text-2xl font-bold font-mono text-ink tabular-nums">{lowStockItems.length}</p>
        <p className="text-[11px] text-amber-700 font-mono">Items below reorder threshold</p>
      </div>

      <div className="p-4 rounded-md border border-mist bg-surface shadow-sm space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-graphite uppercase tracking-wider font-mono">Avg Prep Speed</span>
          <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center">
            <Clock className="w-4 h-4" />
          </div>
        </div>
        <p className="text-2xl font-bold font-mono text-ink tabular-nums">14.8 m</p>
        <p className="text-[11px] text-success font-mono">Target: 18.0 min</p>
      </div>
    </div>

    {/* Grid: Live Orders & Low Stock Rail */}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Live Active Orders Feed */}
      <div className="lg:col-span-2 p-5 rounded-md border border-mist bg-surface space-y-4">
        <div className="flex items-center justify-between border-b border-mist pb-3">
          <h3 className="font-bold text-sm text-ink flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-primary" />
            <span>Live Order Feed</span>
          </h3>
          <button onClick={() => onSelectTab('orders')} className="text-xs text-primary font-semibold hover:underline flex items-center gap-1">
            View All Orders <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="divide-y divide-mist">
          {orders.map(order => {
            const statusMeta = getOrderStatusMeta(order.status, order.is_overdue);
            return (
              <div key={order.id} className="py-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold text-sm text-ink w-12">{order.order_number}</span>
                  <div>
                    <p className="font-semibold text-xs text-ink">
                      {order.table_no ? `Table ${order.table_no}` : order.type.toUpperCase()}
                    </p>
                    <p className="text-[11px] text-graphite font-mono">
                      {order.items.length} items · {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold text-xs text-ink tabular-nums">
                    {formatCurrency(order.total)}
                  </span>
                  <span className={`px-2.5 py-1 rounded text-xs font-mono font-semibold ${statusMeta.badgeClass}`}>
                    {statusMeta.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Low Stock Rail */}
      <div className="p-5 rounded-md border border-mist bg-surface space-y-4">
        <div className="flex items-center justify-between border-b border-mist pb-3">
          <h3 className="font-bold text-sm text-ink flex items-center gap-2">
            <Boxes className="w-4 h-4 text-warning" />
            <span>Stock Reorder Warning</span>
          </h3>
          <button onClick={() => onSelectTab('inventory')} className="text-xs text-primary font-semibold hover:underline">
            Inventory
          </button>
        </div>

        <div className="space-y-3">
          {inventory.map(item => {
            const invMeta = getInventoryStatusMeta(item.status);
            return (
              <div key={item.id} className="p-3 rounded-md border border-mist/80 bg-steel/40 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-xs text-ink">{item.name}</p>
                  <p className="text-[11px] text-graphite font-mono">
                    Current: <span className="font-bold text-ink tabular-nums">{item.current_qty} {item.unit}</span> (Min: {item.reorder_level} {item.unit})
                  </p>
                </div>
                <span className={`px-2 py-0.5 rounded text-[11px] font-mono font-semibold ${invMeta.badgeClass}`}>
                  {invMeta.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  </div>
);
};
