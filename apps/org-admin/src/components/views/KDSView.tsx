import React from 'react';
import { Order, OrderStatus } from '@restaurant-saas/shared-schemas';
import { getOrderStatusMeta } from '@restaurant-saas/ui';
import { Flame, Clock, CheckCircle, AlertTriangle, Play, ChevronRight } from 'lucide-react';
import { KDSViewProps } from './KDSView.types';

export const KDSView: React.FC<KDSViewProps> = ({ orders, onUpdateOrderStatus }) => {
  // Kitchen cares about active non-completed orders: new, preparing, ready
  const activeOrders = orders.filter(o => o.status === 'new' || o.status === 'preparing' || o.status === 'ready');

  return (
    <div className="flex-1 bg-[#14161A] text-[#ECEEF0] p-6 overflow-x-auto min-h-[calc(100vh-4rem)]">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-[#2C3036]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-md bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30 shrink-0">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold tracking-tight text-white flex flex-wrap items-center gap-2">
              <span>Chef Kitchen Display (KDS)</span>
              <span className="text-xs font-mono bg-[#2C3036] px-2 py-0.5 rounded text-amber-400 font-semibold">
                LINE MODE
              </span>
            </h2>
            <p className="text-[11px] sm:text-xs text-gray-400 font-mono">Glanceable Ticket Rail · Touch-enabled Ticket Bump</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#1E2125] border border-[#2C3036]">
            <span className="w-2 h-2 rounded-full bg-slate-400" />
            <span>New: {activeOrders.filter(o => o.status === 'new').length}</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#1E2125] border border-[#2C3036]">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span>Prep: {activeOrders.filter(o => o.status === 'preparing').length}</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#1E2125] border border-[#2C3036]">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Ready: {activeOrders.filter(o => o.status === 'ready').length}</span>
          </div>
        </div>
      </div>

      {/* Ticket Rail Grid */}
      {activeOrders.length === 0 ? (
        <div className="h-96 flex flex-col items-center justify-center text-center text-gray-400 space-y-3">
          <CheckCircle className="w-12 h-12 text-emerald-500/50" />
          <p className="font-bold text-base text-white">Kitchen Rail Clear</p>
          <p className="text-xs max-w-sm">No pending cook tickets right now. New orders placed at the POS will appear here automatically.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pb-6">
          {activeOrders.map(order => {
            const statusMeta = getOrderStatusMeta(order.status, order.is_overdue);

            return (
              <div
                key={order.id}
                className={`w-full bg-[#1E2125] border rounded-lg flex flex-col justify-between overflow-hidden shadow-lg transition-all ${order.is_overdue
                  ? 'border-red-500/80 ring-1 ring-red-500/50 animate-pulse'
                  : order.status === 'new'
                    ? 'border-slate-600'
                    : order.status === 'preparing'
                      ? 'border-amber-500/60'
                      : 'border-emerald-500/60'
                  }`}
              >
                {/* Ticket Top Header: Monospace Order # and Table # (§4.3 Oversized 20-24px) */}
                <div className="p-4 border-b border-[#2C3036] bg-[#17191D] flex items-center justify-between">
                  <div>
                    <span className="font-mono font-extrabold text-2xl tracking-wider text-white">
                      {order.order_number}
                    </span>
                    <span className="ml-2 font-mono text-sm text-amber-400 font-bold">
                      [{order.table_no || order.type.toUpperCase()}]
                    </span>
                  </div>

                  <div className={`px-2.5 py-1 rounded text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1 ${statusMeta.badgeClass}`}>
                    <span className={`w-2 h-2 rounded-full ${statusMeta.dotColorClass}`} />
                    {statusMeta.label}
                  </div>
                </div>

                {/* Ticket Meta Bar */}
                <div className="px-4 py-2 bg-[#1E2125] border-b border-[#2C3036] flex items-center justify-between text-xs font-mono text-gray-400">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-gray-400" />
                    <span>{new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  {order.is_overdue && (
                    <span className="text-red-400 font-bold flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" /> OVERDUE
                    </span>
                  )}
                </div>

                {/* Items List */}
                <div className="p-4 flex-1 space-y-3 font-sans">
                  {order.items.map((item: any, idx: number) => (
                    <div key={idx} className="flex items-start gap-3 border-b border-[#2C3036]/40 pb-2">
                      <span className="font-mono font-bold text-lg text-amber-400 w-6 shrink-0">
                        {item.qty}×
                      </span>
                      <div className="flex-1">
                        <p className="font-bold text-sm text-white leading-snug">{item.product_name}</p>
                        {item.notes && (
                          <p className="text-xs text-amber-300 font-mono italic mt-0.5">Note: {item.notes}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Bottom Action Button: Min 64px tap target for kitchen staff */}
                <div className="p-3 bg-[#17191D] border-t border-[#2C3036]">
                  {order.status === 'new' && (
                    <button
                      onClick={() => onUpdateOrderStatus(order.id, 'preparing')}
                      className="w-full h-14 rounded-md bg-amber-500 hover:bg-amber-600 text-black font-extrabold text-sm uppercase tracking-wider shadow flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
                    >
                      <Play className="w-5 h-5 fill-current" />
                      <span>START PREPARING</span>
                    </button>
                  )}

                  {order.status === 'preparing' && (
                    <button
                      onClick={() => onUpdateOrderStatus(order.id, 'ready')}
                      className="w-full h-14 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm uppercase tracking-wider shadow flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
                    >
                      <CheckCircle className="w-5 h-5" />
                      <span>MARK READY </span>
                    </button>
                  )}

                  {order.status === 'ready' && (
                    <button
                      onClick={() => onUpdateOrderStatus(order.id, 'completed')}
                      className="w-full h-14 rounded-md bg-[#2C3036] hover:bg-[#3E444D] text-gray-200 font-extrabold text-sm uppercase tracking-wider border border-[#3E444D] shadow flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
                    >
                      <ChevronRight className="w-5 h-5" />
                      <span>BUMP TICKET (COMPLETE)</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
