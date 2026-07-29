import React, { useState, useMemo } from 'react';
import { Order, Sale, PaymentMethod } from '@restaurant-saas/shared-schemas';
import { formatCurrency } from '@restaurant-saas/ui';
import {
  TrendingUp,
  DollarSign,
  Receipt,
  RefreshCw,
  ShoppingBag,
  CreditCard,
  Wallet,
  BookOpen,
  Filter,
  Search,
  Eye,
  CheckCircle2,
  Calendar,
  X,
  PieChart,
  ArrowUpRight,
  FileSpreadsheet,
  Clock,
  Banknote,
  Zap
} from 'lucide-react';
import { downloadCsv } from '../../utils/exportCsv';
import { Pagination } from '../common/Pagination';

interface SalesViewProps {
  orders: Order[];
  sales: Sale[];
  paymentMethods: PaymentMethod[];
  onRefreshData?: () => void;
}

type TimeFilter = 'today' | 'week' | 'month' | 'all';

export const SalesView: React.FC<SalesViewProps> = ({
  orders,
  sales,
  paymentMethods,
  onRefreshData
}) => {
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [useCustomRange, setUseCustomRange] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('00:00');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('23:59');

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPaymentFilter, setSelectedPaymentFilter] = useState<string>('all');
  const [selectedOrderReceipt, setSelectedOrderReceipt] = useState<Order | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Pagination state for transactions log
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(10);

  // Filter orders based on time window or custom date/time range
  const periodOrders = useMemo(() => {
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

  // Map Sales entries to Orders for payment method details
  const salesMap = useMemo(() => {
    const map = new Map<string, Sale>();
    sales.forEach(s => map.set(s.order_id, s));
    return map;
  }, [sales]);

  // Filtered orders list based on search & payment filter
  const filteredOrders = useMemo(() => {
    return periodOrders.filter(o => {
      const sale = salesMap.get(o.id);
      const pm = sale ? sale.payment_method : 'cash';

      const matchesSearch =
        o.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (o.client_name && o.client_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (o.table_no && o.table_no.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesPayment = selectedPaymentFilter === 'all' || pm === selectedPaymentFilter;

      return matchesSearch && matchesPayment;
    });
  }, [periodOrders, salesMap, searchQuery, selectedPaymentFilter]);

  // Paginated Orders list
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredOrders.slice(start, start + itemsPerPage);
  }, [filteredOrders, currentPage, itemsPerPage]);

  // Metrics Calculations
  const totalGrossRevenue = useMemo(() => periodOrders.reduce((sum, o) => sum + Number(o.total), 0), [periodOrders]);
  const totalTax = useMemo(() => periodOrders.reduce((sum, o) => sum + Number(o.tax), 0), [periodOrders]);
  const avgOrderTicket = periodOrders.length > 0 ? totalGrossRevenue / periodOrders.length : 0;

  // Breakdown by Payment Method
  const paymentBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    periodOrders.forEach(o => {
      const sale = salesMap.get(o.id);
      const pm = sale ? sale.payment_method : 'cash';
      const existing = map.get(pm) || 0;
      map.set(pm, existing + Number(o.total));
    });
    return map;
  }, [periodOrders, salesMap]);

  // Sales by Dish & Category
  const salesByDish = useMemo(() => {
    const map = new Map<string, { name: string; qty: number; revenue: number; unitPrice: number }>();

    periodOrders.forEach(order => {
      (order.items || []).forEach(item => {
        const key = item.product_name || 'Dish Item';
        const existing = map.get(key) || { name: key, qty: 0, revenue: 0, unitPrice: Number(item.unit_price) };
        map.set(key, {
          name: key,
          qty: existing.qty + Number(item.qty),
          revenue: existing.revenue + Number(item.unit_price) * Number(item.qty),
          unitPrice: Number(item.unit_price)
        });
      });
    });

    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
  }, [periodOrders]);

  const handleRefreshClick = async () => {
    if (onRefreshData) {
      setIsRefreshing(true);
      await onRefreshData();
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  const handleExportCsv = () => {
    const exportRows = filteredOrders.map(o => {
      const sale = salesMap.get(o.id);
      return {
        'Order Number': o.order_number,
        'Date & Time': new Date(o.created_at).toLocaleString(),
        'Order Type': o.type,
        'Table / Ref': o.table_no || 'Walk-in',
        'Customer Name': o.client_name || 'Walk-in Guest',
        'Payment Method': sale ? sale.payment_method : 'cash',
        'Subtotal ($)': o.subtotal,
        'Tax ($)': o.tax,
        'Discount ($)': o.discount || 0,
        'Total Amount ($)': o.total
      };
    });
    downloadCsv(`sales_report_${new Date().toISOString().split('T')[0]}`, exportRows);
  };

  return (
    <div className="p-6 space-y-6 flex-1 overflow-y-auto font-sans">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-ink">Advanced Sales Operations & Revenue Analytics</h2>
          <p className="text-xs text-graphite font-mono font-normal">Real-time revenue metrics, custom date & time range filters, dish sales breakdown, and Excel export</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
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
            <span>{isRefreshing ? 'Refreshing...' : 'Refresh Sales'}</span>
          </button>
        </div>
      </div>

      {/* Filter Control Bar: Preset Pills & Custom Date/Time Inputs */}
      <div className="p-4 rounded-md border border-mist bg-surface shadow-sm space-y-3 font-mono text-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-graphite uppercase text-[11px]">Period Filter:</span>
            <div className="p-1 bg-steel rounded-md border border-mist flex font-mono text-xs">
              <button
                onClick={() => { setUseCustomRange(false); setTimeFilter('today'); setCurrentPage(1); }}
                className={`px-3 py-1 rounded transition-all font-semibold ${!useCustomRange && timeFilter === 'today' ? 'bg-surface shadow text-primary font-bold' : 'text-graphite'}`}
              >
                Today
              </button>
              <button
                onClick={() => { setUseCustomRange(false); setTimeFilter('week'); setCurrentPage(1); }}
                className={`px-3 py-1 rounded transition-all font-semibold ${!useCustomRange && timeFilter === 'week' ? 'bg-surface shadow text-primary font-bold' : 'text-graphite'}`}
              >
                7 Days
              </button>
              <button
                onClick={() => { setUseCustomRange(false); setTimeFilter('month'); setCurrentPage(1); }}
                className={`px-3 py-1 rounded transition-all font-semibold ${!useCustomRange && timeFilter === 'month' ? 'bg-surface shadow text-primary font-bold' : 'text-graphite'}`}
              >
                30 Days
              </button>
              <button
                onClick={() => { setUseCustomRange(false); setTimeFilter('all'); setCurrentPage(1); }}
                className={`px-3 py-1 rounded transition-all font-semibold ${!useCustomRange && timeFilter === 'all' ? 'bg-surface shadow text-primary font-bold' : 'text-graphite'}`}
              >
                All Time
              </button>
            </div>
          </div>

          <button
            onClick={() => setUseCustomRange(!useCustomRange)}
            className={`px-3 py-1.5 rounded border text-xs font-bold transition-all flex items-center gap-1.5 ${
              useCustomRange ? 'bg-primary text-white border-primary shadow-sm' : 'bg-steel border-mist text-graphite hover:text-ink'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>{useCustomRange ? 'Custom Range Enabled' : 'Custom Date & Time Range'}</span>
          </button>
        </div>

        {/* Custom Date & Time Inputs Panel */}
        {useCustomRange && (
          <div className="p-3 bg-steel/60 border border-mist rounded grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end pt-2">
            <div>
              <label className="text-[10px] text-graphite uppercase font-bold block mb-1">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={e => { setStartDate(e.target.value); setCurrentPage(1); }}
                className="w-full p-1.5 rounded border border-mist bg-surface text-ink font-bold"
              />
            </div>
            <div>
              <label className="text-[10px] text-graphite uppercase font-bold block mb-1">Start Time</label>
              <input
                type="time"
                value={startTime}
                onChange={e => { setStartTime(e.target.value); setCurrentPage(1); }}
                className="w-full p-1.5 rounded border border-mist bg-surface text-ink font-bold"
              />
            </div>
            <div>
              <label className="text-[10px] text-graphite uppercase font-bold block mb-1">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={e => { setEndDate(e.target.value); setCurrentPage(1); }}
                className="w-full p-1.5 rounded border border-mist bg-surface text-ink font-bold"
              />
            </div>
            <div>
              <label className="text-[10px] text-graphite uppercase font-bold block mb-1">End Time</label>
              <input
                type="time"
                value={endTime}
                onChange={e => { setEndTime(e.target.value); setCurrentPage(1); }}
                className="w-full p-1.5 rounded border border-mist bg-surface text-ink font-bold"
              />
            </div>
          </div>
        )}
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-md border border-mist bg-surface space-y-2 shadow-sm">
          <span className="text-[11px] font-mono font-semibold text-graphite uppercase flex items-center justify-between">
            <span>Total Gross Sales Revenue</span>
            <DollarSign className="w-4 h-4 text-primary" />
          </span>
          <p className="text-2xl font-mono font-bold text-primary tabular-nums">{formatCurrency(totalGrossRevenue)}</p>
          <p className="text-[11px] text-graphite font-mono">Includes ${formatCurrency(totalTax)} tax collected</p>
        </div>

        <div className="p-4 rounded-md border border-mist bg-surface space-y-2 shadow-sm">
          <span className="text-[11px] font-mono font-semibold text-graphite uppercase flex items-center justify-between">
            <span>Cash Sales Revenue</span>
            <Wallet className="w-4 h-4 text-emerald-600" />
          </span>
          <p className="text-2xl font-mono font-bold text-emerald-700 tabular-nums">
            {formatCurrency(paymentBreakdown.get('cash') || 0)}
          </p>
          <p className="text-[11px] text-graphite font-mono">Direct cash deposits</p>
        </div>

        <div className="p-4 rounded-md border border-mist bg-surface space-y-2 shadow-sm">
          <span className="text-[11px] font-mono font-semibold text-graphite uppercase flex items-center justify-between">
            <span>Borrow / Credit Sales</span>
            <BookOpen className="w-4 h-4 text-amber-600" />
          </span>
          <p className="text-2xl font-mono font-bold text-amber-700 tabular-nums">
            {formatCurrency(paymentBreakdown.get('borrow_credit') || 0)}
          </p>
          <p className="text-[11px] text-graphite font-mono">Added to customer due balances</p>
        </div>

        <div className="p-4 rounded-md border border-mist bg-surface space-y-2 shadow-sm">
          <span className="text-[11px] font-mono font-semibold text-graphite uppercase flex items-center justify-between">
            <span>Orders & Avg Ticket Size</span>
            <Receipt className="w-4 h-4 text-primary" />
          </span>
          <p className="text-2xl font-mono font-bold text-ink tabular-nums">{periodOrders.length} Orders</p>
          <p className="text-[11px] text-graphite font-mono">Avg ticket: {formatCurrency(avgOrderTicket)}</p>
        </div>
      </div>

      {/* Payment Register Revenue Breakdown */}
      <div className="p-4 border border-mist rounded-md bg-surface space-y-3 shadow-sm">
        <h3 className="font-bold text-xs font-mono uppercase text-graphite flex items-center gap-2">
          <PieChart className="w-4 h-4 text-primary" />
          <span>Revenue Distribution by Payment Register / Method</span>
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
          <div className="p-3 rounded border border-mist bg-steel/40">
            <span className="text-[10px] text-graphite uppercase font-semibold flex items-center gap-1.5">
              <Banknote className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Cash Register</span>
            </span>
            <span className="font-bold text-ink text-sm block mt-1">{formatCurrency(paymentBreakdown.get('cash') || 0)}</span>
          </div>

          <div className="p-3 rounded border border-mist bg-steel/40">
            <span className="text-[10px] text-graphite uppercase font-semibold flex items-center gap-1.5">
              <CreditCard className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span>Credit / Debit Card</span>
            </span>
            <span className="font-bold text-ink text-sm block mt-1">{formatCurrency(paymentBreakdown.get('card') || 0)}</span>
          </div>

          <div className="p-3 rounded border border-mist bg-steel/40">
            <span className="text-[10px] text-graphite uppercase font-semibold flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>Borrow / Client Credit</span>
            </span>
            <span className="font-bold text-amber-800 text-sm block mt-1">{formatCurrency(paymentBreakdown.get('borrow_credit') || 0)}</span>
          </div>

          {paymentMethods.map(pm => (
            <div key={pm.id} className="p-3 rounded border border-mist bg-steel/40">
              <span className="text-[10px] text-graphite uppercase font-semibold flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                <span>{pm.name}</span>
              </span>
              <span className="font-bold text-primary text-sm block mt-1">{formatCurrency(paymentBreakdown.get(pm.code) || 0)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Dish & Category Volume Analytics */}
      <div className="border border-mist rounded-md bg-surface shadow-sm overflow-hidden space-y-3">
        <div className="p-4 border-b border-mist bg-steel/50 flex items-center justify-between">
          <h3 className="font-bold text-xs font-mono uppercase text-ink flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-primary" />
            <span>Dish Sales Volume & Revenue Shares ({salesByDish.length} dishes sold)</span>
          </h3>
          <span className="text-xs font-mono text-graphite uppercase font-bold">Window: {useCustomRange ? 'Custom' : timeFilter}</span>
        </div>

        <table className="w-full text-left text-xs font-sans">
          <thead className="bg-steel border-b border-mist text-graphite uppercase font-mono font-semibold">
            <tr>
              <th className="p-3">Dish / Item Name</th>
              <th className="p-3 text-center">Units Sold</th>
              <th className="p-3 text-right">Unit Price</th>
              <th className="p-3 text-right">Total Revenue ($)</th>
              <th className="p-3 text-right">Share %</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-mist">
            {salesByDish.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-graphite font-mono">
                  No dish sales recorded for the selected time window.
                </td>
              </tr>
            ) : (
              salesByDish.map((dish, idx) => {
                const sharePercent = totalGrossRevenue > 0 ? (dish.revenue / totalGrossRevenue) * 100 : 0;
                return (
                  <tr key={idx} className="hover:bg-steel/40 transition-colors">
                    <td className="p-3 font-bold text-ink">{dish.name}</td>
                    <td className="p-3 text-center font-mono font-bold text-ink tabular-nums">{dish.qty} pcs</td>
                    <td className="p-3 text-right font-mono text-graphite tabular-nums">{formatCurrency(dish.unitPrice)}</td>
                    <td className="p-3 text-right font-mono font-bold text-primary tabular-nums">{formatCurrency(dish.revenue)}</td>
                    <td className="p-3 text-right font-mono text-graphite tabular-nums font-bold text-[11px]">
                      {sharePercent.toFixed(1)}%
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Comprehensive Sales Orders Log */}
      <div className="border border-mist rounded-md bg-surface shadow-sm overflow-x-auto space-y-3">
        <div className="p-4 border-b border-mist bg-steel/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="font-bold text-xs font-mono uppercase text-ink flex items-center gap-2">
            <Receipt className="w-4 h-4 text-primary" />
            <span>Detailed Sales Transactions Log ({filteredOrders.length} transactions)</span>
          </h3>

          <div className="flex items-center gap-2">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-graphite" />
              <input
                type="text"
                placeholder="Search Order # or Client..."
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                className="pl-8 pr-3 py-1 rounded border border-mist bg-surface text-xs font-mono text-ink placeholder-graphite focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Payment Method Filter */}
            <select
              value={selectedPaymentFilter}
              onChange={e => { setSelectedPaymentFilter(e.target.value); setCurrentPage(1); }}
              className="px-2.5 py-1 rounded border border-mist text-xs font-mono bg-surface text-ink font-semibold"
            >
              <option value="all">All Payment Registers</option>
              <option value="cash">Cash Register</option>
              <option value="card">Credit / Debit Card</option>
              <option value="borrow_credit">Borrow / Client Credit</option>
              {paymentMethods.map(pm => (
                <option key={pm.id} value={pm.code}>{pm.name}</option>
              ))}
            </select>
          </div>
        </div>

        <table className="w-full text-left text-xs font-sans">
          <thead className="bg-steel border-b border-mist text-graphite uppercase font-mono font-semibold">
            <tr>
              <th className="p-3">Order #</th>
              <th className="p-3">Type / Table</th>
              <th className="p-3">Customer</th>
              <th className="p-3">Payment Register</th>
              <th className="p-3 text-right">Subtotal</th>
              <th className="p-3 text-right">Tax</th>
              <th className="p-3 text-right">Total ($)</th>
              <th className="p-3 text-right">Timestamp</th>
              <th className="p-3 text-center">Receipt</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-mist">
            {paginatedOrders.length === 0 ? (
              <tr>
                <td colSpan={9} className="p-8 text-center text-graphite font-mono">
                  No sales orders match the active filter criteria.
                </td>
              </tr>
            ) : (
              paginatedOrders.map(o => {
                const sale = salesMap.get(o.id);
                const pm = sale ? sale.payment_method : 'cash';
                const matchedPmObj = paymentMethods.find(p => p.code === pm);
                const pmLabel =
                  pm === 'borrow_credit'
                    ? 'Borrow / Credit'
                    : pm === 'cash'
                    ? 'Cash Register'
                    : pm === 'card'
                    ? 'Credit / Debit Card'
                    : matchedPmObj ? matchedPmObj.name : pm.toUpperCase();

                return (
                  <tr key={o.id} className="hover:bg-steel/40 transition-colors">
                    <td className="p-3 font-mono font-bold text-ink">{o.order_number}</td>
                    <td className="p-3 font-mono capitalize text-graphite">{o.type.replace('_', ' ')} ({o.table_no || 'Walk-in'})</td>
                    <td className="p-3 font-semibold text-ink">{o.client_name || 'Walk-in Guest'}</td>
                    <td className="p-3 font-mono">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold inline-flex items-center gap-1 ${
                        pm === 'borrow_credit' ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-steel border border-mist text-ink'
                      }`}>
                        {pm === 'cash' && <Banknote className="w-3 h-3 text-emerald-600" />}
                        {pm === 'card' && <CreditCard className="w-3 h-3 text-blue-600" />}
                        {pm === 'borrow_credit' && <BookOpen className="w-3 h-3 text-amber-600" />}
                        {pm !== 'cash' && pm !== 'card' && pm !== 'borrow_credit' && <Zap className="w-3 h-3 text-teal-600" />}
                        <span>{pmLabel}</span>
                      </span>
                    </td>
                    <td className="p-3 text-right font-mono text-graphite tabular-nums">{formatCurrency(o.subtotal)}</td>
                    <td className="p-3 text-right font-mono text-graphite tabular-nums">{formatCurrency(o.tax)}</td>
                    <td className="p-3 text-right font-mono font-bold text-primary tabular-nums">{formatCurrency(o.total)}</td>
                    <td className="p-3 text-right font-mono text-graphite text-[11px]">
                      {new Date(o.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => setSelectedOrderReceipt(o)}
                        className="p-1 text-graphite hover:text-primary transition-colors"
                        title="View Detailed Ticket Receipt"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
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

      {/* Ticket Receipt Modal */}
      {selectedOrderReceipt && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface border border-mist rounded-lg shadow-xl w-full max-w-sm overflow-hidden">
            <div className="p-4 border-b border-mist flex items-center justify-between bg-steel">
              <h3 className="font-bold text-sm text-ink font-mono flex items-center gap-2">
                <Receipt className="w-4 h-4 text-primary" />
                <span>Sales Ticket {selectedOrderReceipt.order_number}</span>
              </h3>
              <button onClick={() => setSelectedOrderReceipt(null)} className="text-graphite hover:text-ink">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 font-mono text-xs">
              <div className="flex justify-between border-b border-mist pb-2 text-graphite">
                <span>Type / Table:</span>
                <span className="font-bold text-ink capitalize">{selectedOrderReceipt.type} ({selectedOrderReceipt.table_no || 'Walk-in'})</span>
              </div>
              <div className="flex justify-between border-b border-mist pb-2 text-graphite">
                <span>Customer:</span>
                <span className="font-bold text-ink">{selectedOrderReceipt.client_name || 'Walk-in Guest'}</span>
              </div>

              <div className="space-y-1 py-1">
                <div className="font-bold text-[11px] text-graphite uppercase">Ordered Items</div>
                {(selectedOrderReceipt.items || []).map((item: any, idx: number) => (
                  <div key={idx} className="flex justify-between text-ink">
                    <span>{item.qty}x {item.product_name}</span>
                    <span className="tabular-nums font-bold">{formatCurrency(item.qty * item.unit_price)}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-mist pt-2 space-y-1">
                <div className="flex justify-between text-graphite">
                  <span>Subtotal:</span>
                  <span className="tabular-nums">{formatCurrency(selectedOrderReceipt.subtotal)}</span>
                </div>
                <div className="flex justify-between text-graphite">
                  <span>Tax:</span>
                  <span className="tabular-nums">{formatCurrency(selectedOrderReceipt.tax)}</span>
                </div>
                <div className="flex justify-between text-ink font-bold text-sm pt-1 border-t border-mist">
                  <span>Total Paid:</span>
                  <span className="tabular-nums text-primary">{formatCurrency(selectedOrderReceipt.total)}</span>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-mist bg-steel flex justify-end">
              <button
                onClick={() => setSelectedOrderReceipt(null)}
                className="px-4 py-1.5 rounded bg-primary text-white text-xs font-mono font-bold hover:bg-primary-hover shadow-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
