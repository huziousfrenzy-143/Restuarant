import React, { useState, useMemo } from 'react';
import { Order, InventoryItem, Sale } from '@restaurant-saas/shared-schemas';
import { formatCurrency } from '@restaurant-saas/ui';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Award,
  Boxes,
  Calendar,
  Filter,
  Receipt,
  RefreshCw,
  ShoppingBag,
  FileSpreadsheet,
  PieChart,
  Clock
} from 'lucide-react';
import { downloadCsv } from '../../utils/exportCsv';

interface ReportsViewProps {
  orders: Order[];
  inventory: InventoryItem[];
  sales: Sale[];
  onRefreshData?: () => void;
}

type TimeFilter = 'today' | 'week' | 'month' | 'all';

export const ReportsView: React.FC<ReportsViewProps> = ({ orders, inventory, sales, onRefreshData }) => {
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [useCustomRange, setUseCustomRange] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('00:00');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('23:59');

  const [activeHoverBar, setActiveHoverBar] = useState<number | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filter orders based on time window or custom range
  const filteredOrders = useMemo(() => {
    if (useCustomRange && startDate && endDate) {
      const start = new Date(`${startDate}T${startTime}:00`);
      const end = new Date(`${endDate}T${endTime}:59`);
      return orders.filter(o => {
        const d = new Date(o.created_at);
        return d >= start && d <= end;
      });
    }

    if (timeFilter === 'all') return orders;

    const now = new Date();
    let startTimeObj = new Date();

    if (timeFilter === 'today') {
      startTimeObj.setHours(0, 0, 0, 0);
    } else if (timeFilter === 'week') {
      startTimeObj.setDate(now.getDate() - 7);
    } else if (timeFilter === 'month') {
      startTimeObj.setDate(now.getDate() - 30);
    }

    return orders.filter(o => new Date(o.created_at) >= startTimeObj);
  }, [orders, timeFilter, useCustomRange, startDate, startTime, endDate, endTime]);

  // Aggregate Sales by Dish/Category
  const salesByDish = useMemo(() => {
    const map = new Map<string, { name: string; qty: number; revenue: number }>();

    filteredOrders.forEach(order => {
      (order.items || []).forEach(item => {
        const key = item.product_name || 'Dish Item';
        const existing = map.get(key) || { name: key, qty: 0, revenue: 0 };
        map.set(key, {
          name: key,
          qty: existing.qty + Number(item.qty),
          revenue: existing.revenue + Number(item.unit_price) * Number(item.qty)
        });
      });
    });

    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
  }, [filteredOrders]);

  // Breakdown by Order Type (Dine-in, Takeaway, Delivery)
  const orderTypeBreakdown = useMemo(() => {
    const counts = { dine_in: 0, takeaway: 0, delivery: 0 };
    const revenues = { dine_in: 0, takeaway: 0, delivery: 0 };

    filteredOrders.forEach(o => {
      const type = (o.type as 'dine_in' | 'takeaway' | 'delivery') || 'dine_in';
      if (counts[type] !== undefined) {
        counts[type] += 1;
        revenues[type] += Number(o.total);
      }
    });

    return { counts, revenues };
  }, [filteredOrders]);

  const totalRevenue = useMemo(() => filteredOrders.reduce((sum, o) => sum + Number(o.total), 0), [filteredOrders]);
  const totalTax = useMemo(() => filteredOrders.reduce((sum, o) => sum + Number(o.tax), 0), [filteredOrders]);
  const avgOrderValue = filteredOrders.length > 0 ? totalRevenue / filteredOrders.length : 0;

  // Interactive hourly revenue distribution calculation
  const hourlyData = useMemo(() => {
    const hourlyMap = new Map<
      number,
      {
        revenue: number;
        ordersCount: number;
      }
    >();

    // Create 24 hours (00 - 23)
    for (let hour = 0; hour < 24; hour++) {
      hourlyMap.set(hour, {
        revenue: 0,
        ordersCount: 0,
      });
    }

    filteredOrders.forEach(order => {
      const date = new Date(order.created_at);
      const hour = date.getHours();

      const current = hourlyMap.get(hour)!;

      current.revenue += Number(order.total);
      current.ordersCount += 1;
    });

    return Array.from(hourlyMap.entries()).map(([hour, data]) => ({
      hour,
      label: new Date(0, 0, 0, hour).toLocaleTimeString([], {
        hour: "numeric",
        hour12: true,
      }),
      revenue: data.revenue,
      ordersCount: data.ordersCount,
    }));
  }, [filteredOrders]);

  const maxHourlyRevenue = Math.max(
    ...hourlyData.map(h => h.revenue),
    1
  );



  const handleRefreshClick = async () => {
    if (onRefreshData) {
      setIsRefreshing(true);
      await onRefreshData();
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  const linePath = useMemo(() => {
    if (hourlyData.length === 0) return "";

    const points = hourlyData.map((item, idx) => ({
      x: (idx / (hourlyData.length - 1)) * 100,
      y:
        maxHourlyRevenue > 0
          ? 100 - (item.revenue / maxHourlyRevenue) * 95
          : 100,
    }));

    let d = `M ${points[0].x},${points[0].y}`;

    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];

      const cp1x = prev.x + (curr.x - prev.x) / 2;
      const cp2x = prev.x + (curr.x - prev.x) / 2;

      d += ` C ${cp1x},${prev.y} ${cp2x},${curr.y} ${curr.x},${curr.y}`;
    }

    return d;
  }, [hourlyData, maxHourlyRevenue]);


  const handleExportCsv = () => {
    const exportRows = filteredOrders.map(o => ({
      'Order Number': o.order_number,
      'Date & Time': new Date(o.created_at).toLocaleString(),
      'Order Type': o.type,
      'Table / Ref': o.table_no || 'Walk-in',
      'Customer Name': o.client_name || 'Walk-in Guest',
      'Subtotal ($)': o.subtotal,
      'Tax ($)': o.tax,
      'Discount ($)': o.discount || 0,
      'Total Amount ($)': o.total
    }));
    downloadCsv(`analytics_report_${new Date().toISOString().split('T')[0]}`, exportRows);
  };

  return (
    <div className="p-6 space-y-6 flex-1 overflow-y-auto font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-ink">Operational Analytics & Visual Reports</h2>
          <p className="text-xs text-graphite font-mono font-normal">Interactive trend graphs, order distribution analytics, custom date/time filters & Excel exports</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            className="px-3.5 py-2 rounded-md bg-steel border border-mist text-ink text-xs font-mono font-bold hover:bg-mist/60 transition-all flex items-center gap-1.5 shadow-sm"
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
            <span>{isRefreshing ? 'Refreshing...' : 'Refresh Reports'}</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-md border border-mist bg-surface shadow-sm space-y-3 font-mono text-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-graphite uppercase text-[11px]">Period Filter:</span>
            <div className="p-1 bg-steel rounded-md border border-mist flex font-mono text-xs">
              <button
                onClick={() => { setUseCustomRange(false); setTimeFilter('today'); }}
                className={`px-3 py-1 rounded transition-all font-semibold ${!useCustomRange && timeFilter === 'today' ? 'bg-surface shadow text-primary font-bold' : 'text-graphite'}`}
              >
                Today
              </button>
              <button
                onClick={() => { setUseCustomRange(false); setTimeFilter('week'); }}
                className={`px-3 py-1 rounded transition-all font-semibold ${!useCustomRange && timeFilter === 'week' ? 'bg-surface shadow text-primary font-bold' : 'text-graphite'}`}
              >
                7 Days
              </button>
              <button
                onClick={() => { setUseCustomRange(false); setTimeFilter('month'); }}
                className={`px-3 py-1 rounded transition-all font-semibold ${!useCustomRange && timeFilter === 'month' ? 'bg-surface shadow text-primary font-bold' : 'text-graphite'}`}
              >
                30 Days
              </button>
              <button
                onClick={() => { setUseCustomRange(false); setTimeFilter('all'); }}
                className={`px-3 py-1 rounded transition-all font-semibold ${!useCustomRange && timeFilter === 'all' ? 'bg-surface shadow text-primary font-bold' : 'text-graphite'}`}
              >
                All Time
              </button>
            </div>
          </div>

          <button
            onClick={() => setUseCustomRange(!useCustomRange)}
            className={`px-3 py-1.5 rounded border text-xs font-bold transition-all flex items-center gap-1.5 ${useCustomRange ? 'bg-primary text-white border-primary shadow-sm' : 'bg-steel border-mist text-graphite hover:text-ink'
              }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>{useCustomRange ? 'Custom Range Enabled' : 'Custom Date & Time Range'}</span>
          </button>
        </div>

        {/* Custom Range Inputs */}
        {useCustomRange && (
          <div className="p-3 bg-steel/60 border border-mist rounded grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end pt-2">
            <div>
              <label className="text-[10px] text-graphite uppercase font-bold block mb-1">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full p-1.5 rounded border border-mist bg-surface text-ink font-bold"
              />
            </div>
            <div>
              <label className="text-[10px] text-graphite uppercase font-bold block mb-1">Start Time</label>
              <input
                type="time"
                value={startTime}
                onChange={e => setStartTime(e.target.value)}
                className="w-full p-1.5 rounded border border-mist bg-surface text-ink font-bold"
              />
            </div>
            <div>
              <label className="text-[10px] text-graphite uppercase font-bold block mb-1">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="w-full p-1.5 rounded border border-mist bg-surface text-ink font-bold"
              />
            </div>
            <div>
              <label className="text-[10px] text-graphite uppercase font-bold block mb-1">End Time</label>
              <input
                type="time"
                value={endTime}
                onChange={e => setEndTime(e.target.value)}
                className="w-full p-1.5 rounded border border-mist bg-surface text-ink font-bold"
              />
            </div>
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-md border border-mist bg-surface space-y-2 shadow-sm">
          <span className="text-[11px] font-mono font-semibold text-graphite uppercase">Total Gross Sales</span>
          <p className="text-2xl font-mono font-bold text-primary tabular-nums">{formatCurrency(totalRevenue)}</p>
        </div>

        <div className="p-4 rounded-md border border-mist bg-surface space-y-2 shadow-sm">
          <span className="text-[11px] font-mono font-semibold text-graphite uppercase">Total Tax Collected</span>
          <p className="text-2xl font-mono font-bold text-ink tabular-nums">{formatCurrency(totalTax)}</p>
        </div>

        <div className="p-4 rounded-md border border-mist bg-surface space-y-2 shadow-sm">
          <span className="text-[11px] font-mono font-semibold text-graphite uppercase">Orders Completed</span>
          <p className="text-2xl font-mono font-bold text-ink tabular-nums">{filteredOrders.length}</p>
        </div>

        <div className="p-4 rounded-md border border-mist bg-surface space-y-2 shadow-sm">
          <span className="text-[11px] font-mono font-semibold text-graphite uppercase">Avg Order Ticket</span>
          <p className="text-2xl font-mono font-bold text-emerald-700 tabular-nums">{formatCurrency(avgOrderValue)}</p>
        </div>
      </div>

      {/* Interactive Visual Graph 1: Hourly Revenue Trend Chart */}
      <div className="p-6 border border-mist rounded-md bg-surface space-y-4 shadow-sm">
        <h3 className="font-bold text-sm text-ink flex items-center justify-between border-b border-mist pb-3">
          <span className="flex items-center gap-2 font-mono">
            <TrendingUp className="w-4 h-4 text-primary" />
            <span>Interactive Sales Revenue Distribution & Peak Hours Trend</span>
          </span>
          <span className="font-mono text-xs text-graphite uppercase font-bold">
            Hover columns to view details
          </span>
        </h3>

        <div className="h-64 w-full relative pt-6 pb-8 font-mono text-xs text-graphite">
          {/* Grid lines */}
          <div className="absolute inset-x-0 top-1/4 border-t border-mist border-dashed pointer-events-none"></div>
          <div className="absolute inset-x-0 top-2/4 border-t border-mist border-dashed pointer-events-none"></div>
          <div className="absolute inset-x-0 top-3/4 border-t border-mist border-dashed pointer-events-none"></div>
          <div className="absolute inset-x-0 bottom-8 border-t border-mist pointer-events-none"></div>

          {/* SVG for line and area */}
          <svg viewBox="0 0 100 100" className="absolute inset-x-0 top-6 bottom-8 w-full h-[calc(100%-3.5rem)] overflow-visible z-10 pointer-events-none" preserveAspectRatio="none">
            {/* Area under the line */}
            <polygon
              points={`0,100 ${hourlyData.map((item, idx) => {
                const x = (idx / (hourlyData.length - 1)) * 100;
                const y = maxHourlyRevenue > 0 ? 100 - (item.revenue / maxHourlyRevenue) * 95 : 100;
                return `${x},${y}`;
              }).join(' ')} 100,100`}
              fill="var(--color-primary)"
              className="opacity-[0.08]"
            />
            {/* The Line */}
            <path
              d={linePath}
              fill="none"
              stroke="var(--color-primary)"
              strokeWidth="3"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>

          {/* Interactive Data Points */}
          <div className="absolute inset-x-0 top-6 bottom-8 z-20">
            {hourlyData.map((item, idx) => {
              const xPercent = (idx / (hourlyData.length - 1)) * 100;
              const yPercent = maxHourlyRevenue > 0 ? 100 - (item.revenue / maxHourlyRevenue) * 95 : 100;
              const isHovered = activeHoverBar === idx;

              return (
                <div
                  key={idx}
                  className="absolute w-12 h-full top-0 -ml-6 flex flex-col items-center group cursor-pointer"
                  style={{ left: `${xPercent}%` }}
                  onMouseEnter={() => setActiveHoverBar(idx)}
                  onMouseLeave={() => setActiveHoverBar(null)}
                >
                  {/* Tooltip */}
                  {isHovered && (
                    <div
                      className="absolute z-30 bg-ink text-white p-2.5 rounded-lg shadow-xl text-[10px] whitespace-nowrap font-mono space-y-1 animate-in fade-in zoom-in-95 duration-150 pointer-events-none border border-white/10"
                      style={{ bottom: `calc(${100 - yPercent}% + 16px)` }}
                    >
                      <div className="font-bold text-primary text-xs border-b border-white/20 pb-1 mb-1">{idx % 3 === 0 ? item.label : ""}</div>
                      <div className="flex justify-between gap-4">
                        <span className="text-white/60">Revenue</span>
                        <strong className="text-emerald-400">{formatCurrency(item.revenue)}</strong>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="text-white/60">Orders</span>
                        <strong className="text-white">{item.ordersCount}</strong>
                      </div>
                    </div>
                  )}

                  {/* Point Dot */}
                  <div
                    className={`absolute rounded-full border-[2.5px] transition-all duration-200 shadow-sm ${isHovered
                      ? 'w-4 h-4 border-primary bg-surface scale-125 shadow-[0_0_12px_rgba(31,92,91,0.6)]'
                      : 'w-3 h-3 border-primary bg-surface hover:scale-110'
                      }`}
                    style={{ top: `calc(${yPercent}% - ${isHovered ? 8 : 6}px)` }}
                  />

                  {/* Invisible tall hover target */}
                  <div className="w-full h-full absolute inset-0 z-10" />

                  {/* X Axis Label */}
                  <span className={`absolute -bottom-7 text-[10px] font-bold whitespace-nowrap transition-colors ${isHovered ? 'text-primary' : 'text-ink'
                    }`}>
                    {idx % 3 === 0 ? item.label : ""}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Interactive Visual Graph 2: Order Type Breakdown Bar & Distribution */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 border border-mist rounded-md bg-surface space-y-3 shadow-sm font-mono text-xs">
          <h3 className="font-bold text-ink flex items-center gap-2 border-b border-mist pb-2">
            <PieChart className="w-4 h-4 text-primary" />
            <span>Dine-In Sales Volume</span>
          </h3>
          <div className="space-y-1">
            <div className="flex justify-between font-bold text-ink">
              <span>Orders:</span>
              <span>{orderTypeBreakdown.counts.dine_in}</span>
            </div>
            <div className="flex justify-between font-bold text-primary text-base">
              <span>Total Revenue:</span>
              <span>{formatCurrency(orderTypeBreakdown.revenues.dine_in)}</span>
            </div>
          </div>
        </div>

        <div className="p-4 border border-mist rounded-md bg-surface space-y-3 shadow-sm font-mono text-xs">
          <h3 className="font-bold text-ink flex items-center gap-2 border-b border-mist pb-2">
            <ShoppingBag className="w-4 h-4 text-emerald-600" />
            <span>Takeaway Sales Volume</span>
          </h3>
          <div className="space-y-1">
            <div className="flex justify-between font-bold text-ink">
              <span>Orders:</span>
              <span>{orderTypeBreakdown.counts.takeaway}</span>
            </div>
            <div className="flex justify-between font-bold text-emerald-700 text-base">
              <span>Total Revenue:</span>
              <span>{formatCurrency(orderTypeBreakdown.revenues.takeaway)}</span>
            </div>
          </div>
        </div>

        <div className="p-4 border border-mist rounded-md bg-surface space-y-3 shadow-sm font-mono text-xs">
          <h3 className="font-bold text-ink flex items-center gap-2 border-b border-mist pb-2">
            <Boxes className="w-4 h-4 text-amber-600" />
            <span>Delivery Sales Volume</span>
          </h3>
          <div className="space-y-1">
            <div className="flex justify-between font-bold text-ink">
              <span>Orders:</span>
              <span>{orderTypeBreakdown.counts.delivery}</span>
            </div>
            <div className="flex justify-between font-bold text-amber-700 text-base">
              <span>Total Revenue:</span>
              <span>{formatCurrency(orderTypeBreakdown.revenues.delivery)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Dish Sales Table */}
      <div className="border border-mist rounded-md bg-surface shadow-sm overflow-hidden space-y-3">
        <div className="p-4 border-b border-mist bg-steel/50 flex items-center justify-between">
          <h3 className="font-bold text-xs font-mono uppercase text-ink flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-primary" />
            <span>Dish Sales Volume & Revenue Breakdown</span>
          </h3>
          <span className="text-xs font-mono text-graphite">{salesByDish.length} items sold</span>
        </div>

        <table className="w-full text-left text-xs font-sans">
          <thead className="bg-steel border-b border-mist text-graphite uppercase font-mono font-semibold">
            <tr>
              <th className="p-3">Dish / Item Name</th>
              <th className="p-3 text-center">Quantity Sold</th>
              <th className="p-3 text-right">Total Revenue Generated ($)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-mist">
            {salesByDish.length === 0 ? (
              <tr>
                <td colSpan={3} className="p-8 text-center text-graphite">
                  No dish sales recorded for the selected time filter.
                </td>
              </tr>
            ) : (
              salesByDish.map((dish, idx) => (
                <tr key={idx} className="hover:bg-steel/40 transition-colors">
                  <td className="p-3 font-bold text-ink">{dish.name}</td>
                  <td className="p-3 text-center font-mono font-bold text-ink tabular-nums">{dish.qty} units</td>
                  <td className="p-3 text-right font-mono font-bold text-primary tabular-nums">{formatCurrency(dish.revenue)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Period Orders Log */}
      <div className="border border-mist rounded-md bg-surface shadow-sm overflow-hidden space-y-3">
        <div className="p-4 border-b border-mist bg-steel/50 flex items-center justify-between">
          <h3 className="font-bold text-xs font-mono uppercase text-ink flex items-center gap-2">
            <Receipt className="w-4 h-4 text-primary" />
            <span>Detailed Order Sales Log ({filteredOrders.length} transactions)</span>
          </h3>
        </div>

        <table className="w-full text-left text-xs font-sans">
          <thead className="bg-steel border-b border-mist text-graphite uppercase font-mono font-semibold">
            <tr>
              <th className="p-3">Order Number</th>
              <th className="p-3">Type / Table</th>
              <th className="p-3">Customer</th>
              <th className="p-3 text-right">Subtotal</th>
              <th className="p-3 text-right">Tax</th>
              <th className="p-3 text-right">Total ($)</th>
              <th className="p-3 text-right">Timestamp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-mist">
            {filteredOrders.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-8 text-center text-graphite">
                  No order sales recorded for the selected time filter.
                </td>
              </tr>
            ) : (
              filteredOrders.map(o => (
                <tr key={o.id} className="hover:bg-steel/40 transition-colors">
                  <td className="p-3 font-mono font-bold text-ink">{o.order_number}</td>
                  <td className="p-3 font-mono capitalize text-graphite">{o.type.replace('_', ' ')} ({o.table_no || 'Walk-in'})</td>
                  <td className="p-3 font-semibold text-ink">{o.client_name || 'Walk-in Guest'}</td>
                  <td className="p-3 text-right font-mono text-graphite tabular-nums">{formatCurrency(o.subtotal)}</td>
                  <td className="p-3 text-right font-mono text-graphite tabular-nums">{formatCurrency(o.tax)}</td>
                  <td className="p-3 text-right font-mono font-bold text-primary tabular-nums">{formatCurrency(o.total)}</td>
                  <td className="p-3 text-right font-mono text-graphite text-[11px]">
                    {new Date(o.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
