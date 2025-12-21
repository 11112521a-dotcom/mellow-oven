import React, { useState, useMemo } from 'react';
import { useStore } from '@/src/store';
import { formatCurrency } from '@/src/lib/utils';
import {
  TrendingUp, TrendingDown, AlertTriangle, DollarSign, Activity, Target, Package,
  ShoppingBag, Calendar as CalendarIcon, ArrowRight, Store, ChevronDown,
  ChevronUp, Sparkles, Zap, Award, PieChart, BarChart3, Flame, Percent,
  ArrowUpRight, ArrowDownRight, Wallet, Sun, Moon, CloudSun, Lightbulb,
  AlertCircle, CheckCircle, Info, Trash2, Clock
} from 'lucide-react';
import { startOfMonth, endOfMonth, differenceInDays, startOfWeek, startOfDay, endOfDay } from 'date-fns';
import { GoalCard } from '@/src/components/Finance/GoalCard';
import { GoalModal } from '@/src/components/Finance/GoalModal';

interface DashboardProps { onNavigate?: (page: string) => void; }

// Get greeting based on time
const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return { text: 'Good Morning', icon: <Sun className="text-amber-400" size={24} />, emoji: '☀️' };
  if (hour < 18) return { text: 'Good Afternoon', icon: <CloudSun className="text-amber-500" size={24} />, emoji: '🌤️' };
  return { text: 'Good Evening', icon: <Moon className="text-indigo-400" size={24} />, emoji: '🌙' };
};

// Clean Stat Card - Minimal design
const StatCard: React.FC<{
  label: string; value: string; subValue?: string; icon: React.ReactNode;
  color: string; trend?: { value: number; label: string };
}> = ({ label, value, subValue, icon, color, trend }) => (
  <div className="bg-white rounded-2xl p-5 border border-stone-100 shadow-sm hover:shadow-md transition-all duration-300">
    <div className="flex items-start justify-between mb-3">
      <div className={`p-2.5 rounded-xl ${color}`}>
        {icon}
      </div>
      {trend && trend.value !== 0 && (
        <span className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${trend.value > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
          }`}>
          {trend.value > 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
          {Math.abs(trend.value).toFixed(0)}%
        </span>
      )}
    </div>
    <p className="text-sm text-stone-500 mb-1">{label}</p>
    <p className="text-2xl font-bold text-stone-800">{value}</p>
    {subValue && <p className="text-xs text-stone-400 mt-1">{subValue}</p>}
  </div>
);

// Progress Ring Component
const ProgressRing: React.FC<{ value: number; size?: number; strokeWidth?: number; color?: string }> = ({
  value, size = 80, strokeWidth = 8, color = '#10b981'
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (Math.min(value, 100) / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={radius} stroke="#e5e7eb" strokeWidth={strokeWidth} fill="none" />
        <circle cx={size / 2} cy={size / 2} r={radius} stroke={color} strokeWidth={strokeWidth} fill="none"
          strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset}
          className="transition-all duration-500" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xl font-bold text-stone-800">{value.toFixed(0)}%</span>
      </div>
    </div>
  );
};

// Insight Alert - Clean minimal
const InsightAlert: React.FC<{ type: 'success' | 'warning' | 'info'; message: string }> = ({ type, message }) => {
  const styles = {
    success: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', icon: <CheckCircle size={16} className="text-emerald-500" /> },
    warning: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', icon: <AlertCircle size={16} className="text-amber-500" /> },
    info: { bg: 'bg-sky-50', border: 'border-sky-200', text: 'text-sky-700', icon: <Lightbulb size={16} className="text-sky-500" /> }
  };
  const s = styles[type];
  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-xl ${s.bg} border ${s.border}`}>
      {s.icon}
      <span className={`text-sm font-medium ${s.text}`}>{message}</span>
    </div>
  );
};

// Section Header - Clean
const SectionHeader: React.FC<{ title: string; icon: React.ReactNode; action?: { label: string; onClick: () => void } }> = ({ title, icon, action }) => (
  <div className="flex items-center justify-between mb-4">
    <h3 className="font-bold text-stone-700 flex items-center gap-2">
      {icon} {title}
    </h3>
    {action && (
      <button onClick={action.onClick} className="text-sm text-amber-600 hover:text-amber-700 font-medium flex items-center gap-1 hover:underline">
        {action.label} <ArrowRight size={14} />
      </button>
    )}
  </div>
);

const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const {
    transactions, products, ingredients, markets, productSales, goals, jars, dailyInventory, unallocatedProfits
  } = useStore();

  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<any>(null);
  const [showLowStock, setShowLowStock] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date; label: string }>({ from: startOfDay(new Date()), to: endOfDay(new Date()), label: 'วันนี้' });
  const [selectedMarket, setSelectedMarket] = useState<string>('all');

  const greeting = getGreeting();
  const todayStr = new Date().toISOString().split('T')[0];

  const applyQuickDate = (preset: string) => {
    const today = new Date();
    let from: Date, to: Date, label: string;
    switch (preset) {
      case 'today': from = to = startOfDay(today); label = 'วันนี้'; break;
      case 'yesterday': const y = new Date(today); y.setDate(y.getDate() - 1); from = to = startOfDay(y); label = 'เมื่อวาน'; break;
      case 'week': from = startOfWeek(today, { weekStartsOn: 1 }); to = endOfDay(today); label = 'สัปดาห์นี้'; break;
      case 'month': from = startOfMonth(today); to = endOfMonth(today); label = 'เดือนนี้'; break;
      default: return;
    }
    setDateRange({ from, to, label });
  };

  // FILTER SALES DATA
  const filteredSales = useMemo(() => productSales.filter(sale => {
    const matchDate = sale.saleDate >= dateRange.from.toISOString().split('T')[0] && sale.saleDate <= dateRange.to.toISOString().split('T')[0];
    const matchMarket = selectedMarket === 'all' || sale.marketId === selectedMarket;
    return matchDate && matchMarket;
  }), [productSales, dateRange, selectedMarket]);

  // KEY METRICS
  const metrics = useMemo(() => {
    const revenue = filteredSales.reduce((sum, s) => sum + s.totalRevenue, 0);
    const cost = filteredSales.reduce((sum, s) => sum + s.totalCost, 0);
    const profit = filteredSales.reduce((sum, s) => sum + s.grossProfit, 0);
    const sold = filteredSales.reduce((sum, s) => sum + s.quantitySold, 0);
    const days = differenceInDays(dateRange.to, dateRange.from) || 1;
    return { revenue, cost, profit, sold, margin: revenue > 0 ? (profit / revenue) * 100 : 0, perDay: revenue / days };
  }, [filteredSales, dateRange]);

  // JARS SUMMARY
  const totalBalance = useMemo(() => jars.reduce((sum, j) => sum + j.balance, 0), [jars]);
  const unallocatedTotal = useMemo(() => unallocatedProfits.reduce((sum, p) => sum + p.amount, 0), [unallocatedProfits]);

  // TODAY'S INVENTORY - Sell-Through & Waste
  const todayInventory = useMemo(() => dailyInventory.filter(d => d.businessDate === todayStr), [dailyInventory, todayStr]);
  const productionStats = useMemo(() => {
    const produced = todayInventory.reduce((sum, d) => sum + d.producedQty, 0);
    const toShop = todayInventory.reduce((sum, d) => sum + d.toShopQty, 0);
    const sold = todayInventory.reduce((sum, d) => sum + d.soldQty, 0);
    const waste = todayInventory.reduce((sum, d) => sum + (d.wasteQty || 0), 0);
    const sellThrough = toShop > 0 ? (sold / toShop) * 100 : 0;
    const wasteRate = produced > 0 ? (waste / produced) * 100 : 0;

    // Calculate waste cost
    let wasteCost = 0;
    todayInventory.forEach(record => {
      const product = products.find(p => p.id === record.productId);
      if (product && record.wasteQty) {
        let unitCost = product.cost;
        if (record.variantId && product.variants) {
          const variant = product.variants.find(v => v.id === record.variantId);
          if (variant?.cost) unitCost = variant.cost;
        }
        wasteCost += (record.wasteQty || 0) * unitCost;
      }
    });

    return { produced, toShop, sold, waste, sellThrough, wasteRate, wasteCost };
  }, [todayInventory, products]);

  // LOW STOCK ITEMS
  const lowStockItems = useMemo(() =>
    ingredients.filter(ing => ing.currentStock <= (ing.minStock || 10))
      .sort((a, b) => (a.currentStock / (a.minStock || 10)) - (b.currentStock / (b.minStock || 10)))
    , [ingredients]);

  // TOP PRODUCTS
  const topProducts = useMemo(() => {
    const map: Record<string, { name: string; revenue: number; profit: number; sold: number }> = {};
    filteredSales.forEach(s => {
      const key = s.variantId || s.productId;
      const name = s.variantName ? `${s.productName} - ${s.variantName}` : s.productName;
      if (!map[key]) map[key] = { name, revenue: 0, profit: 0, sold: 0 };
      map[key].revenue += s.totalRevenue;
      map[key].profit += s.grossProfit;
      map[key].sold += s.quantitySold;
    });
    return Object.values(map).sort((a, b) => b.profit - a.profit).slice(0, 5);
  }, [filteredSales]);

  // MARKET PERFORMANCE
  const marketPerformance = useMemo(() => {
    const map: Record<string, { name: string; revenue: number; profit: number }> = {};
    filteredSales.forEach(s => {
      if (!map[s.marketId]) map[s.marketId] = { name: s.marketName, revenue: 0, profit: 0 };
      map[s.marketId].revenue += s.totalRevenue;
      map[s.marketId].profit += s.grossProfit;
    });
    return Object.values(map).sort((a, b) => b.revenue - a.revenue);
  }, [filteredSales]);

  // SMART INSIGHTS
  const insights = useMemo(() => {
    const alerts: { type: 'success' | 'warning' | 'info'; message: string }[] = [];

    // Sell-through insight
    if (productionStats.sellThrough >= 90) {
      alerts.push({ type: 'success', message: `ขายได้ ${productionStats.sellThrough.toFixed(0)}% แล้ว! เกือบหมดสต็อก 🎉` });
    } else if (productionStats.sellThrough < 50 && productionStats.toShop > 0) {
      alerts.push({ type: 'warning', message: `ขายได้แค่ ${productionStats.sellThrough.toFixed(0)}% - อาจผลิตเยอะไป` });
    }

    // Waste insight
    if (productionStats.wasteRate > 10) {
      alerts.push({ type: 'warning', message: `ของเสียสูง ${productionStats.wasteRate.toFixed(0)}% (${formatCurrency(productionStats.wasteCost)})` });
    }

    // Profit insight
    if (metrics.margin > 40) {
      alerts.push({ type: 'success', message: `Profit Margin ดีมาก ${metrics.margin.toFixed(0)}%` });
    }

    // Unallocated profit
    if (unallocatedTotal > 0) {
      alerts.push({ type: 'info', message: `มีกำไรรอจัดสรร ${formatCurrency(unallocatedTotal)}` });
    }

    // Low stock
    if (lowStockItems.length > 3) {
      alerts.push({ type: 'warning', message: `มี ${lowStockItems.length} วัตถุดิบใกล้หมด!` });
    }

    return alerts.slice(0, 4); // Max 4 alerts
  }, [productionStats, metrics, unallocatedTotal, lowStockItems]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20 md:pb-12">
      {/* ═══════════════════════════════════════════════════════════════
          🎨 WARM CAFE HEADER - Clean & Minimal
         ═══════════════════════════════════════════════════════════════ */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 border border-amber-100 p-6 sm:p-8">
        {/* Subtle decorative elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-amber-200/30 to-transparent rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-orange-200/20 to-transparent rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl" />

        <div className="relative">
          {/* Greeting */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-200/50">
                <Activity size={28} className="text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2 text-amber-600 mb-1">
                  {greeting.icon}
                  <span className="text-sm font-medium">{greeting.text}</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-stone-800 flex items-center gap-2">
                  Business Command Center
                  <Sparkles className="text-amber-500" size={20} />
                </h1>
              </div>
            </div>

            {/* Date in header */}
            <div className="text-right">
              <p className="text-sm text-stone-500">
                {new Date().toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>

          {/* Quick Date Filters - Clean pills */}
          <div className="flex flex-wrap gap-2">
            {[
              { key: 'today', label: 'วันนี้', check: 'วันนี้' },
              { key: 'yesterday', label: 'เมื่อวาน', check: 'เมื่อวาน' },
              { key: 'week', label: 'สัปดาห์', check: 'สัปดาห์นี้' },
              { key: 'month', label: 'เดือนนี้', check: 'เดือนนี้' }
            ].map(({ key, label, check }) => (
              <button
                key={key}
                onClick={() => applyQuickDate(key)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${dateRange.label === check
                  ? 'bg-amber-500 text-white shadow-md shadow-amber-200'
                  : 'bg-white/80 text-stone-600 hover:bg-white hover:shadow-sm border border-amber-100'
                  }`}
              >
                {label}
              </button>
            ))}

            {/* Market Filter */}
            {markets.length > 1 && (
              <select
                value={selectedMarket}
                onChange={e => setSelectedMarket(e.target.value)}
                className="px-4 py-2 rounded-xl text-sm font-medium bg-white/80 text-stone-600 border border-amber-100 outline-none focus:ring-2 focus:ring-amber-200"
              >
                <option value="all">🏪 ทุกตลาด</option>
                {markets.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            )}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          📊 KEY METRICS - 4 Column Grid
         ═══════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="💰 รายรับรวม"
          value={formatCurrency(metrics.revenue)}
          subValue={`${formatCurrency(metrics.perDay)}/วัน`}
          icon={<DollarSign size={20} className="text-sky-600" />}
          color="bg-sky-100"
        />
        <StatCard
          label="📈 กำไรสุทธิ"
          value={formatCurrency(metrics.profit)}
          subValue={`Margin ${metrics.margin.toFixed(0)}%`}
          icon={<TrendingUp size={20} className="text-emerald-600" />}
          color="bg-emerald-100"
        />
        <StatCard
          label="📦 ขายได้"
          value={`${metrics.sold} ชิ้น`}
          icon={<ShoppingBag size={20} className="text-violet-600" />}
          color="bg-violet-100"
        />
        <StatCard
          label="🏦 ยอดเงินรวม"
          value={formatCurrency(totalBalance)}
          subValue={unallocatedTotal > 0 ? `รอจัดสรร ${formatCurrency(unallocatedTotal)}` : undefined}
          icon={<Wallet size={20} className="text-amber-600" />}
          color="bg-amber-100"
        />
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          🧠 SMART INSIGHTS - Clean Alerts
         ═══════════════════════════════════════════════════════════════ */}
      {insights.length > 0 && (
        <div className="space-y-2">
          <SectionHeader title="Smart Insights" icon={<Lightbulb className="text-amber-500" size={20} />} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {insights.map((alert, i) => (
              <InsightAlert key={i} type={alert.type} message={alert.message} />
            ))}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          📊 BUSINESS HEALTH - Sell-Through & Waste
         ═══════════════════════════════════════════════════════════════ */}
      {productionStats.toShop > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Sell-Through Rate */}
          <div className="bg-white rounded-2xl p-6 border border-stone-100 shadow-sm">
            <SectionHeader title="Sell-Through Rate" icon={<Percent className="text-emerald-500" size={20} />} />
            <div className="flex items-center gap-6">
              <ProgressRing
                value={productionStats.sellThrough}
                color={productionStats.sellThrough >= 80 ? '#10b981' : productionStats.sellThrough >= 50 ? '#f59e0b' : '#ef4444'}
              />
              <div className="flex-1">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-stone-500">ส่งไปร้าน</span>
                  <span className="font-bold text-stone-700">{productionStats.toShop} ชิ้น</span>
                </div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-stone-500">ขายได้</span>
                  <span className="font-bold text-emerald-600">{productionStats.sold} ชิ้น</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-stone-500">เหลือ</span>
                  <span className="font-bold text-amber-600">{productionStats.toShop - productionStats.sold} ชิ้น</span>
                </div>
              </div>
            </div>
          </div>

          {/* Waste Analysis */}
          <div className="bg-white rounded-2xl p-6 border border-stone-100 shadow-sm">
            <SectionHeader title="Waste Analysis" icon={<Trash2 className="text-rose-500" size={20} />} />
            <div className="flex items-center gap-6">
              <div className="relative w-20 h-20">
                <div className={`w-full h-full rounded-full flex items-center justify-center ${productionStats.wasteRate > 10 ? 'bg-rose-100' : 'bg-stone-100'
                  }`}>
                  <span className={`text-2xl font-bold ${productionStats.wasteRate > 10 ? 'text-rose-600' : 'text-stone-600'}`}>
                    {productionStats.waste}
                  </span>
                </div>
              </div>
              <div className="flex-1">
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-stone-500">ของเสียวันนี้</span>
                  <span className={`font-bold ${productionStats.wasteRate > 10 ? 'text-rose-600' : 'text-stone-700'}`}>
                    {productionStats.waste} ชิ้น
                  </span>
                </div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-stone-500">อัตราของเสีย</span>
                  <span className={`font-bold ${productionStats.wasteRate > 10 ? 'text-rose-600' : 'text-stone-700'}`}>
                    {productionStats.wasteRate.toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-stone-500">มูลค่าสูญเสีย</span>
                  <span className="font-bold text-rose-600">{formatCurrency(productionStats.wasteCost)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          ⚠️ LOW STOCK ALERT - Collapsible
         ═══════════════════════════════════════════════════════════════ */}
      {lowStockItems.length > 0 && (
        <div className="bg-rose-50 rounded-2xl p-5 border border-rose-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-rose-700 flex items-center gap-2">
              <AlertTriangle size={20} />
              วัตถุดิบใกล้หมด ({lowStockItems.length} รายการ)
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowLowStock(!showLowStock)}
                className="px-3 py-1.5 bg-rose-100 hover:bg-rose-200 text-rose-700 rounded-lg text-sm font-medium transition-colors"
              >
                {showLowStock ? 'ซ่อน' : 'ดูทั้งหมด'}
              </button>
              <button onClick={() => onNavigate?.('inventory')} className="text-sm text-rose-600 hover:underline font-medium">
                ไปเติมของ →
              </button>
            </div>
          </div>

          {showLowStock && (
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 mt-4">
              {lowStockItems.slice(0, 12).map(ing => {
                const pct = Math.min(100, (ing.currentStock / (ing.minStock || 10)) * 100);
                return (
                  <div key={ing.id} className="bg-white rounded-xl p-3 border border-rose-100">
                    <p className="text-sm font-medium text-stone-700 truncate">{ing.name}</p>
                    <p className="text-xl font-bold text-rose-600">{ing.currentStock}</p>
                    <p className="text-xs text-stone-400">{ing.unit}</p>
                    <div className="mt-2 h-1.5 bg-rose-100 rounded-full overflow-hidden">
                      <div className="h-full bg-rose-500" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          🏦 FINANCIAL JARS - Clean Overview
         ═══════════════════════════════════════════════════════════════ */}
      <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-5 border border-amber-100">
        <SectionHeader
          title="สุขภาพการเงิน"
          icon={<Wallet className="text-amber-600" size={20} />}
          action={{ label: 'จัดการโถ', onClick: () => onNavigate?.('jars') }}
        />
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {jars.map(jar => (
            <div key={jar.id} className="bg-white rounded-xl p-4 text-center border border-amber-100 hover:shadow-md transition-shadow">
              <p className="text-xs text-stone-500 mb-1">{jar.name}</p>
              <p className="text-lg font-bold text-stone-800">{formatCurrency(jar.balance)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          📈 INSIGHTS GRID - 2 Columns
         ═══════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* TOP PRODUCTS */}
        <div className="bg-white rounded-2xl p-5 border border-stone-100 shadow-sm">
          <SectionHeader
            title="Top 5 สินค้าทำกำไร"
            icon={<Award className="text-amber-500" size={20} />}
            action={{ label: 'ดูทั้งหมด', onClick: () => onNavigate?.('salesreport') }}
          />
          {topProducts.length > 0 ? (
            <div className="space-y-3">
              {topProducts.map((p, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-stone-50 rounded-xl hover:bg-stone-100 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${i === 0 ? 'bg-amber-100 text-amber-700' : i === 1 ? 'bg-stone-200 text-stone-600' : i === 2 ? 'bg-orange-100 text-orange-700' : 'bg-stone-100 text-stone-500'
                      }`}>
                      {i + 1}
                    </span>
                    <div>
                      <p className="font-medium text-stone-700 text-sm">{p.name}</p>
                      <p className="text-xs text-stone-400">{p.sold} ชิ้น</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-emerald-600">{formatCurrency(p.profit)}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center py-8 text-stone-400">ไม่มีข้อมูล</p>
          )}
        </div>

        {/* MARKET PERFORMANCE */}
        <div className="bg-white rounded-2xl p-5 border border-stone-100 shadow-sm">
          <SectionHeader
            title="เปรียบเทียบตลาด"
            icon={<Store className="text-sky-500" size={20} />}
          />
          {marketPerformance.length > 0 ? (
            <div className="space-y-3">
              {marketPerformance.map((m, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-sky-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <Store className="text-sky-500" size={20} />
                    <span className="font-medium text-stone-700">{m.name}</span>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-stone-800">{formatCurrency(m.revenue)}</p>
                    <p className="text-xs text-emerald-600">+{formatCurrency(m.profit)} กำไร</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center py-8 text-stone-400">ไม่มีข้อมูล</p>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          🎯 GOALS SECTION
         ═══════════════════════════════════════════════════════════════ */}
      {goals.length > 0 && (
        <div>
          <SectionHeader title="เป้าหมายทางการเงิน" icon={<Target className="text-amber-600" size={20} />} />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {goals.map(goal => (
              <GoalCard key={goal.id} goal={goal} onEdit={() => { setEditingGoal(goal); setIsGoalModalOpen(true); }} />
            ))}
          </div>
        </div>
      )}

      <GoalModal isOpen={isGoalModalOpen} onClose={() => { setIsGoalModalOpen(false); setEditingGoal(null); }} goal={editingGoal} />
    </div>
  );
};

export default Dashboard;
