import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/schema';
import { Calendar, Download, TrendingUp, DollarSign, Package, Activity } from 'lucide-react';
import { format, subDays, startOfMonth, endOfDay, isWithinInterval, startOfDay } from 'date-fns';

type DateFilter = 'today' | 'yesterday' | 'last7' | 'thisMonth' | 'all' | 'custom';

export default function Reports() {
  const [dateFilter, setDateFilter] = useState<DateFilter>('today');
  const [customStart, setCustomStart] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [customEnd, setCustomEnd] = useState<string>(format(new Date(), 'yyyy-MM-dd'));

  // Fetch all needed data
  const transactions = useLiveQuery(() => db.transactions.toArray()) || [];
  const products = useLiveQuery(() => db.products.toArray()) || [];

  // 1. Filter Transactions by Date
  const filteredTransactions = useMemo(() => {
    const now = new Date();
    let start: Date;
    let end: Date = endOfDay(now);

    switch (dateFilter) {
      case 'today':
        start = startOfDay(now);
        break;
      case 'yesterday':
        start = startOfDay(subDays(now, 1));
        end = endOfDay(subDays(now, 1));
        break;
      case 'last7':
        start = startOfDay(subDays(now, 7));
        break;
      case 'thisMonth':
        start = startOfMonth(now);
        break;
      case 'custom':
        start = startOfDay(new Date(customStart));
        end = endOfDay(new Date(customEnd));
        break;
      case 'all':
      default:
        start = new Date(0); // Beginning of time
        break;
    }

    return transactions.filter(t => {
      const tDate = new Date(t.createdAt);
      return isWithinInterval(tDate, { start, end });
    });
  }, [transactions, dateFilter, customStart, customEnd]);

  // 2. Calculate KPIs and Profit
  const reportData = useMemo(() => {
    let totalRevenue = 0;
    let totalCost = 0;
    let totalItemsSold = 0;

    const dailyMap = new Map<string, { revenue: number; cost: number; profit: number }>();
    const productMap = new Map<number, { name: string; qty: number; revenue: number; cost: number }>();

    filteredTransactions.forEach(t => {
      const dateStr = format(new Date(t.createdAt), 'MMM dd, yyyy');
      if (!dailyMap.has(dateStr)) {
        dailyMap.set(dateStr, { revenue: 0, cost: 0, profit: 0 });
      }
      const dailyStats = dailyMap.get(dateStr)!;

      // Only add to revenue from valid completed transactions
      if (t.status === 'completed' || t.status === 'synced' || !t.status) {
        // Use subtotal to avoid double counting tax if we just want raw sales revenue, 
        // or use subtotal - discount for pure revenue. Let's use (subtotal - discount).
        const txRevenue = t.subtotal - (t.discountAmount || 0);
        totalRevenue += txRevenue;
        dailyStats.revenue += txRevenue;

        t.items.forEach(item => {
          totalItemsSold += item.quantity;
          
          // Determine cost price: Use recorded costPrice, or fallback to current product db costPrice
          let itemCost = item.costPrice;
          if (itemCost === undefined) {
            const dbProduct = products.find(p => p.id === item.productId);
            itemCost = dbProduct?.costPrice || 0;
          }
          
          const lineCost = itemCost * item.quantity;
          totalCost += lineCost;
          dailyStats.cost += lineCost;

          // Product aggregation
          if (!productMap.has(item.productId)) {
            productMap.set(item.productId, { name: item.productName, qty: 0, revenue: 0, cost: 0 });
          }
          const pStats = productMap.get(item.productId)!;
          pStats.qty += item.quantity;
          pStats.revenue += item.totalPrice; // line item revenue
          pStats.cost += lineCost;
        });

        dailyStats.profit = dailyStats.revenue - dailyStats.cost;
      }
    });

    const totalProfit = totalRevenue - totalCost;
    const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    const dailyBreakdown = Array.from(dailyMap.entries()).map(([date, stats]) => ({
      date,
      ...stats
    })).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const topProducts = Array.from(productMap.values())
      .map(p => ({ ...p, profit: p.revenue - p.cost }))
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 10); // Top 10

    return {
      totalRevenue,
      totalCost,
      totalProfit,
      profitMargin,
      totalTransactions: filteredTransactions.length,
      totalItemsSold,
      dailyBreakdown,
      topProducts
    };
  }, [filteredTransactions, products]);

  const downloadCSV = () => {
    const headers = ['Date', 'Revenue (KES)', 'Cost (KES)', 'Profit (KES)'];
    const rows = reportData.dailyBreakdown.map(row => 
      `${row.date},${row.revenue},${row.cost},${row.profit}`
    );
    
    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `JayDee_Profit_Report_${dateFilter}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen p-4 pb-24 bg-slate-50 space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Analytics</span>
          <h1 className="text-2xl md:text-3xl font-bold text-accent">Profit & Loss Report</h1>
        </div>
        
        <div className="flex flex-col items-end gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="bg-white rounded-2xl p-1 shadow-sm border border-slate-200 flex flex-wrap text-sm">
              {[
                { id: 'today', label: 'Today' },
                { id: 'yesterday', label: 'Yesterday' },
                { id: 'last7', label: '7 Days' },
                { id: 'thisMonth', label: 'Month' },
                { id: 'all', label: 'All Time' },
                { id: 'custom', label: 'Custom' }
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setDateFilter(f.id as DateFilter)}
                  className={`px-3 py-1.5 md:px-4 md:py-2 rounded-xl font-medium transition ${
                    dateFilter === f.id ? 'bg-accent text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
            
            <button
              onClick={downloadCSV}
              className="flex items-center gap-2 rounded-2xl bg-white border border-slate-200 px-4 py-2 text-slate-700 font-semibold shadow-sm hover:bg-slate-50 transition ml-auto sm:ml-0"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Export</span>
            </button>
          </div>

          {/* Custom Date Picker Fields */}
          {dateFilter === 'custom' && (
            <div className="flex items-center gap-2 bg-white p-2 rounded-2xl shadow-sm border border-slate-200 text-sm">
              <input 
                type="date" 
                value={customStart}
                onChange={e => setCustomStart(e.target.value)}
                className="bg-transparent text-slate-700 outline-none cursor-pointer"
              />
              <span className="text-slate-400 font-medium">to</span>
              <input 
                type="date" 
                value={customEnd}
                onChange={e => setCustomEnd(e.target.value)}
                className="bg-transparent text-slate-700 outline-none cursor-pointer"
              />
            </div>
          )}
        </div>
      </header>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <DollarSign className="w-16 h-16 text-emerald-600" />
          </div>
          <p className="text-sm font-medium text-slate-500 mb-1">Total Revenue</p>
          <h3 className="text-2xl font-bold text-slate-900">KES {reportData.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
          <p className="text-xs text-slate-400 mt-2">{reportData.totalTransactions} transactions</p>
        </div>

        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Activity className="w-16 h-16 text-rose-600" />
          </div>
          <p className="text-sm font-medium text-slate-500 mb-1">Total Cost of Goods</p>
          <h3 className="text-2xl font-bold text-slate-900">KES {reportData.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
          <p className="text-xs text-slate-400 mt-2">{reportData.totalItemsSold} items sold</p>
        </div>

        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 relative overflow-hidden bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-emerald-200">
          <p className="text-sm font-medium text-emerald-800 mb-1">Gross Profit</p>
          <h3 className="text-2xl font-bold text-emerald-900">KES {reportData.totalProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
        </div>

        <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <TrendingUp className="w-16 h-16 text-blue-600" />
          </div>
          <p className="text-sm font-medium text-slate-500 mb-1">Gross Margin</p>
          <h3 className="text-2xl font-bold text-slate-900">{reportData.profitMargin.toFixed(1)}%</h3>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily Breakdown Table */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col">
          <div className="flex items-center gap-2 mb-6">
            <Calendar className="w-5 h-5 text-accent" />
            <h3 className="text-lg font-bold text-slate-900">Daily Breakdown</h3>
          </div>
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-500 uppercase bg-slate-50 rounded-xl">
                <tr>
                  <th className="px-4 py-3 font-semibold rounded-l-xl whitespace-nowrap">Date</th>
                  <th className="px-4 py-3 font-semibold text-right whitespace-nowrap">Revenue (KES)</th>
                  <th className="px-4 py-3 font-semibold text-right whitespace-nowrap">Cost (KES)</th>
                  <th className="px-4 py-3 font-semibold text-right rounded-r-xl whitespace-nowrap">Profit (KES)</th>
                </tr>
              </thead>
              <tbody>
                {reportData.dailyBreakdown.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-8 text-slate-500">No transactions in this period.</td>
                  </tr>
                ) : (
                  reportData.dailyBreakdown.map((row, idx) => (
                    <tr key={idx} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-medium text-slate-900 whitespace-nowrap">{row.date}</td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">{row.revenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">{row.cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td className="px-4 py-3 text-right font-bold text-emerald-600 whitespace-nowrap">{row.profit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Products Table */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col max-h-[500px]">
          <div className="flex items-center gap-2 mb-6">
            <Package className="w-5 h-5 text-purple-500" />
            <h3 className="text-lg font-bold text-slate-900">Top Drivers (Profit)</h3>
          </div>
          <div className="overflow-y-auto flex-1 pr-2">
            <div className="space-y-4">
              {reportData.topProducts.length === 0 ? (
                <p className="text-slate-500 text-sm text-center py-4">No data available.</p>
              ) : (
                reportData.topProducts.map((p, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <div className="flex-1 min-w-0 pr-4">
                      <p className="text-sm font-semibold text-slate-900 truncate" title={p.name}>{p.name}</p>
                      <p className="text-xs text-slate-500">{p.qty} units sold</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-emerald-600">+{p.profit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
