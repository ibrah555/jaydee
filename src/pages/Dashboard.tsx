import { useLiveQuery } from 'dexie-react-hooks';
import { db, Product, Transaction } from '../db/schema';
import { 
  TrendingUp, 
  PackageMinus, 
  CalendarClock, 
  DollarSign,
  AlertTriangle
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend
} from 'recharts';

export default function Dashboard() {
  // 1. Fetch products from Dexie
  const products = useLiveQuery(() => db.products.toArray()) || [];
  
  // 2. Fetch transactions from Dexie
  const transactions = useLiveQuery(() => db.transactions.toArray()) || [];

  console.log('Dashboard: products =', products.length, 'transactions =', transactions.length);

  // Determine low-stock items (supporting variants)
  const lowStockItems: { name: string; variantName?: string; stock: number; limit: number }[] = [];
  const expiringItems: { name: string; variantName?: string; expiryDate: string; daysLeft: number }[] = [];

  const now = Date.now();
  const ONE_DAY = 24 * 60 * 60 * 1000;

  products.forEach(p => {
    // Expiry check helper
    const checkExpiry = (expStr: string, variantName?: string) => {
      if (!expStr) return;
      const expTime = new Date(expStr).getTime();
      const diffTime = expTime - now;
      const daysLeft = Math.ceil(diffTime / ONE_DAY);
      if (daysLeft <= 90) {
        expiringItems.push({
          name: p.name,
          variantName,
          expiryDate: expStr,
          daysLeft
        });
      }
    };

    if (p.variants && p.variants.length > 0) {
      // Check variants
      p.variants.forEach(v => {
        if (v.stockQuantity <= p.lowStockThreshold) {
          lowStockItems.push({
            name: p.name,
            variantName: v.name,
            stock: v.stockQuantity,
            limit: p.lowStockThreshold
          });
        }
        if (v.expiryDate) {
          checkExpiry(v.expiryDate, v.name);
        }
      });
    } else {
      // Check standard product
      if (p.stockQuantity <= p.lowStockThreshold) {
        lowStockItems.push({
          name: p.name,
          stock: p.stockQuantity,
          limit: p.lowStockThreshold
        });
      }
      if (p.expiryDate) {
        checkExpiry(p.expiryDate);
      }
    }
  });

  // Sort alerts
  expiringItems.sort((a, b) => a.daysLeft - b.daysLeft);

  // Compute stats
  const totalSales = transactions.reduce((sum, t) => sum + t.total, 0);
  const totalOrders = transactions.length;
  
  // Daily Sales Trends
  const salesByDate: Record<string, { date: string; amount: number; profit: number }> = {};
  
  // Helper to map transaction cost
  const productCostMap = new Map<number, { cost: number; selling: number }>();
  products.forEach(p => {
    productCostMap.set(p.id!, { cost: p.costPrice, selling: p.sellingPrice });
  });

  transactions.forEach(t => {
    const dateStr = new Date(t.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    if (!salesByDate[dateStr]) {
      salesByDate[dateStr] = { date: dateStr, amount: 0, profit: 0 };
    }
    salesByDate[dateStr].amount += t.total;
    
    // Compute Profit
    let costTotal = 0;
    t.items.forEach(item => {
      const prices = productCostMap.get(item.productId);
      if (prices) {
        costTotal += (prices.cost * item.quantity);
      } else {
        costTotal += (item.unitPrice * 0.6) * item.quantity; // fallback to 40% margin
      }
    });
    salesByDate[dateStr].profit += Math.max(0, t.total - costTotal);
  });

  const chartData = Object.values(salesByDate).slice(-7); // Last 7 days with sales

  // Top products calculation
  const productSalesCount: Record<string, { name: string; quantity: number }> = {};
  transactions.forEach(t => {
    t.items.forEach(item => {
      const key = `${item.productName}${item.shade ? ` - ${item.shade}` : ''}`;
      if (!productSalesCount[key]) {
        productSalesCount[key] = { name: key, quantity: 0 };
      }
      productSalesCount[key].quantity += item.quantity;
    });
  });

  const topProductsData = Object.values(productSalesCount)
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl md:text-3xl font-bold text-accent">Business Analytics</h1>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center text-accent">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Total Sales</p>
            <h3 className="text-xl md:text-2xl font-semibold text-slate-900">
              KES {totalSales.toLocaleString()}
            </h3>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Transactions</p>
            <h3 className="text-xl md:text-2xl font-semibold text-slate-900">{totalOrders}</h3>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
            <PackageMinus className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Low Stock items</p>
            <h3 className="text-xl md:text-2xl font-semibold text-slate-900">{lowStockItems.length}</h3>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center text-red-600">
            <CalendarClock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Near Expiry (90d)</p>
            <h3 className="text-xl md:text-2xl font-semibold text-slate-900">{expiringItems.length}</h3>
          </div>
        </div>
      </div>

      {/* Visual Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Trend */}
        <div className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-slate-100 lg:col-span-2">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Sales & Profit Trend</h3>
          <div className="h-80">
            {chartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                No transaction data available yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4A1942" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#4A1942" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#B76E79" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#B76E79" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="date" stroke="#94A3B8" fontSize={12} tickLine={false} />
                  <YAxis stroke="#94A3B8" fontSize={12} tickLine={false} />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" name="Revenue" dataKey="amount" stroke="#4A1942" strokeWidth={2} fillOpacity={1} fill="url(#colorSales)" />
                  <Area type="monotone" name="Gross Profit" dataKey="profit" stroke="#B76E79" strokeWidth={2} fillOpacity={1} fill="url(#colorProfit)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Top Product Categories / Items */}
        <div className="bg-white rounded-2xl p-4 md:p-6 shadow-sm border border-slate-100">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Top-Selling Items</h3>
          <div className="h-80">
            {topProductsData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                No items sold yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topProductsData} layout="vertical" margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                  <XAxis type="number" stroke="#94A3B8" fontSize={11} tickLine={false} />
                  <YAxis dataKey="name" type="category" stroke="#64748B" fontSize={10} width={100} tickLine={false} />
                  <Tooltip />
                  <Bar dataKey="quantity" fill="#B76E79" name="Qty Sold" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Expiry Tracker & Stock Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Low Stock Alerts */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col max-h-96">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <h3 className="text-lg font-semibold text-slate-900">Low Stock alerts</h3>
          </div>
          <div className="flex-1 overflow-y-auto space-y-3">
            {lowStockItems.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-8">All stock quantities are above reorder thresholds.</p>
            ) : (
              lowStockItems.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-amber-50/50 border border-amber-100">
                  <div>
                    <h5 className="font-semibold text-sm text-slate-900">{item.name}</h5>
                    {item.variantName && (
                      <span className="text-xs text-slate-500 font-medium bg-slate-100 px-2 py-0.5 rounded-full inline-block mt-0.5">
                        {item.variantName}
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-sm text-amber-700">{item.stock} left</span>
                    <p className="text-xs text-slate-400 mt-0.5">Limit {item.limit}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Expiring Batches */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col max-h-96">
          <div className="flex items-center gap-2 mb-4">
            <CalendarClock className="w-5 h-5 text-red-500" />
            <h3 className="text-lg font-semibold text-slate-900">Expiry Date Tracker</h3>
          </div>
          <div className="flex-1 overflow-y-auto space-y-3">
            {expiringItems.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-8">No products expiring in the next 90 days.</p>
            ) : (
              expiringItems.map((item, idx) => (
                <div key={idx} className={`flex items-center justify-between p-3 rounded-xl border ${
                  item.daysLeft <= 30 
                    ? 'bg-red-50/50 border-red-100 text-red-900' 
                    : 'bg-slate-50 border-slate-100 text-slate-900'
                }`}>
                  <div>
                    <h5 className="font-semibold text-sm">{item.name}</h5>
                    {item.variantName && (
                      <span className="text-xs text-slate-500 font-medium bg-white border px-2 py-0.5 rounded-full inline-block mt-0.5">
                        {item.variantName}
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <span className={`font-bold text-sm ${item.daysLeft <= 30 ? 'text-red-600' : 'text-slate-600'}`}>
                      {item.daysLeft <= 0 ? 'Expired' : `${item.daysLeft} days left`}
                    </span>
                    <p className="text-xs text-slate-400 mt-0.5">{item.expiryDate}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
