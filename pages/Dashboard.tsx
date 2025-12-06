import React, { useState, useMemo } from 'react';
import { useStore } from '@/src/store';
import { calculateKPIs } from '@/src/lib/analytics';
import { formatCurrency } from '@/src/lib/utils';
import {
  TrendingUp, TrendingDown, AlertTriangle, DollarSign, Activity, Target, Package,
  ShoppingBag, Calendar as CalendarIcon, RefreshCw, ArrowRight, Store, ChevronDown,
  ChevronUp, Sparkles, Zap, Award, PieChart, BarChart3, Clock, Flame, Percent,
  ArrowUpRight, ArrowDownRight, Box, Users, Wallet, TrendingUp as TrendUp
} from 'lucide-react';
import { DateRangePicker, DateRange } from '@/src/components/ui/DateRangePicker';
import { startOfMonth, endOfMonth, isWithinInterval, differenceInDays, subDays, startOfWeek, startOfDay, endOfDay } from 'date-fns';
import { GoalCard } from '@/src/components/Finance/GoalCard';
import { GoalModal } from '@/src/components/Finance/GoalModal';

interface DashboardProps { onNavigate?: (page: string) => void; }

// Hero Stat Card with Animation
const HeroStat: React.FC<{
  label: string; value: string; subValue?: string; icon: React.ReactNode;
  gradient: string; trend?: number; delay?: number;
}> = ({ label, value, subValue, icon, gradient, trend, delay = 0 }) => (
  <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${gradient} p-6 text-white shadow-xl transform hover:scale-[1.02] hover:-translate-y-1 transition-all duration-300`}>
    <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
    <div className="absolute -bottom-4 -left-4 w-20 h-20 bg-white/5 rounded-full" />
    <div className="relative">
      <div className="flex items-center justify-between mb-3">
        <span className="text-white/80 text-sm font-medium">{label}</span>
        <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">{icon}</div>
      </div>
      <h3 className="text-3xl font-bold mb-1">{value}</h3>
      <div className="flex items-center justify-between">
        {subValue && <span className="text-white/70 text-sm">{subValue}</span>}
        {trend !== undefined && trend !== 0 && (
          <span className={`flex items-center gap-1 text-sm font-medium ${trend > 0 ? 'text-green-300' : 'text-red-300'}`}>
            {trend > 0 ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
            {Math.abs(trend).toFixed(1)}%
          </span>
        )}
      </div>
    </div>
  </div>
);

// Insight Card
const InsightCard: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode; action?: { label: string; onClick: () => void } }> =
  ({ title, icon, children, action }) => (
    <div className="bg-white rounded-2xl border border-cafe-100 shadow-sm hover:shadow-lg transition-all overflow-hidden">
      <div className="p-5 border-b border-cafe-50 flex items-center justify-between bg-gradient-to-r from-cafe-50 to-white">
        <h3 className="font-bold text-cafe-900 flex items-center gap-2">{icon} {title}</h3>
        {action && (
          <button onClick={action.onClick} className="text-xs text-cafe-500 hover:text-cafe-700 font-medium flex items-center gap-1">
            {action.label} <ArrowRight size={12} />
          </button>
        )}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );

// Quick Metric Pill
const MetricPill: React.FC<{ label: string; value: string | number; color?: string }> = ({ label, value, color = 'bg-cafe-100 text-cafe-700' }) => (
  <div className={`${color} px-3 py-2 rounded-xl text-center`}>
    <div className="text-xs opacity-70">{label}</div>
    <div className="font-bold text-lg">{value}</div>
  </div>
);

const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const {
    transactions, dailyReports, products, alerts, generateAlerts, ingredients,
    markets, productSales, goals, jars, dailyInventory, unallocatedProfits
  } = useStore();

  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<any>(null);
  const [showLowStock, setShowLowStock] = useState(false); // Default HIDDEN
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange>({ from: startOfDay(new Date()), to: endOfDay(new Date()), label: 'วันนี้' });
  const [selectedMarket, setSelectedMarket] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [comparisonMode, setComparisonMode] = useState<'none' | 'previous'>('none');

  React.useEffect(() => { generateAlerts(); }, [generateAlerts]);

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

  // GET UNIQUE CATEGORIES
  const categories = useMemo(() => Array.from(new Set(products.map(p => p.category))).filter(Boolean), [products]);

  // FILTER SALES DATA
  const filteredSales = useMemo(() => productSales.filter(sale => {
    const matchDate = sale.saleDate >= dateRange.from.toISOString().split('T')[0] && sale.saleDate <= dateRange.to.toISOString().split('T')[0];
    const matchMarket = selectedMarket === 'all' || sale.marketId === selectedMarket;
    const matchCategory = selectedCategory === 'all' || sale.category === selectedCategory;
    return matchDate && matchMarket && matchCategory;
  }), [productSales, dateRange, selectedMarket, selectedCategory]);

  // KEY METRICS
  const metrics = useMemo(() => {
    const revenue = filteredSales.reduce((sum, s) => sum + s.totalRevenue, 0);
    const cost = filteredSales.reduce((sum, s) => sum + s.totalCost, 0);
    const profit = filteredSales.reduce((sum, s) => sum + s.grossProfit, 0);
    const sold = filteredSales.reduce((sum, s) => sum + s.quantitySold, 0);
    const days = differenceInDays(dateRange.to, dateRange.from) || 1;
    return { revenue, cost, profit, sold, margin: revenue > 0 ? (profit / revenue) * 100 : 0, perDay: revenue / days, itemsPerDay: sold / days };
  }, [filteredSales, dateRange]);

  // JARS SUMMARY (Financial Health)
  const jarsSummary = useMemo(() => {
    const total = jars.reduce((sum, j) => sum + j.balance, 0);
    return { total, jars };
  }, [jars]);

  // UNALLOCATED PROFITS
  const unallocatedTotal = useMemo(() => unallocatedProfits.reduce((sum, p) => sum + p.amount, 0), [unallocatedProfits]);

  // LOW STOCK ITEMS - Show ALL items that are low
  const lowStockItems = useMemo(() =>
    ingredients.filter(ing => ing.currentStock <= (ing.minStock || 10))
      .sort((a, b) => (a.currentStock / (a.minStock || 10)) - (b.currentStock / (b.minStock || 10)))
    , [ingredients]);

  // TOP PRODUCTS
  const topProducts = useMemo(() => {
    const map: Record<string, { name: string; revenue: number; profit: number; sold: number }> = {};
    filteredSales.forEach(s => {
      if (!map[s.productId]) map[s.productId] = { name: s.productName, revenue: 0, profit: 0, sold: 0 };
      map[s.productId].revenue += s.totalRevenue;
      map[s.productId].profit += s.grossProfit;
      map[s.productId].sold += s.quantitySold;
    });
    return Object.values(map).sort((a, b) => b.profit - a.profit).slice(0, 5);
  }, [filteredSales]);

  // CATEGORY BREAKDOWN
  const categoryBreakdown = useMemo(() => {
    const map: Record<string, { revenue: number; quantity: number }> = {};
    filteredSales.forEach(s => {
      const cat = s.category || 'อื่นๆ';
      if (!map[cat]) map[cat] = { revenue: 0, quantity: 0 };
      map[cat].revenue += s.totalRevenue;
      map[cat].quantity += s.quantitySold;
    });
    return Object.entries(map).map(([name, data]) => ({ name, ...data })).sort((a, b) => b.revenue - a.revenue);
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

  // TODAY'S INVENTORY STATUS
  const todayStr = new Date().toISOString().split('T')[0];
  const todayInventory = useMemo(() => dailyInventory.filter(d => d.businessDate === todayStr), [dailyInventory, todayStr]);
  const totalProduced = todayInventory.reduce((sum, d) => sum + d.producedQty, 0);
  const totalToShop = todayInventory.reduce((sum, d) => sum + d.toShopQty, 0);
  const totalSold = todayInventory.reduce((sum, d) => sum + d.soldQty, 0);

  // BEST DAY
  const bestDay = useMemo(() => {
    const dateMap: Record<string, number> = {};
    filteredSales.forEach(s => { dateMap[s.saleDate] = (dateMap[s.saleDate] || 0) + s.totalRevenue; });
    const sorted = Object.entries(dateMap).sort(([, a], [, b]) => b - a);
    return sorted[0] || null;
  }, [filteredSales]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20 md:pb-12">
      {/* PREMIUM HEADER */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-cafe-900 via-cafe-800 to-amber-900 p-8 text-white shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-yellow-500/20 to-transparent rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-amber-500/10 to-transparent rounded-full translate-y-1/2 -translate-x-1/2" />

        <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-amber-500 rounded-2xl flex items-center justify-center shadow-lg">
              <Activity size={32} />
            </div>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                Business Command Center
                <Sparkles className="text-yellow-300 animate-pulse" size={24} />
              </h1>
              <p className="text-cafe-200 mt-1">สถานะธุรกิจแบบ Real-time</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            {['today', 'yesterday', 'week', 'month'].map(preset => (
              <button key={preset} onClick={() => applyQuickDate(preset)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${dateRange.label === (preset === 'today' ? 'วันนี้' : preset === 'yesterday' ? 'เมื่อวาน' : preset === 'week' ? 'สัปดาห์นี้' : 'เดือนนี้')
                  ? 'bg-white text-cafe-900'
                  : 'bg-white/10 hover:bg-white/20 text-white'}`}>
                {preset === 'today' ? '📅 วันนี้' : preset === 'yesterday' ? '⏮️ เมื่อวาน' : preset === 'week' ? '📆 สัปดาห์' : '🗓️ เดือน'}
              </button>
            ))}
            <button onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${showAdvancedFilters ? 'bg-yellow-400 text-cafe-900' : 'bg-white/10 hover:bg-white/20 text-white'}`}>
              ⚙️ ตัวกรองเพิ่มเติม {showAdvancedFilters ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>
        </div>

        {/* ADVANCED FILTERS - Collapsible */}
        {showAdvancedFilters && (
          <div className="mt-6 p-4 bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 animate-in slide-in-from-top-2 duration-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Market Filter */}
              <div>
                <label className="block text-xs text-cafe-200 mb-1.5">🏪 ตลาด/สาขา</label>
                <select value={selectedMarket} onChange={e => setSelectedMarket(e.target.value)}
                  className="w-full bg-white/10 text-white rounded-lg px-3 py-2 text-sm border border-white/20 focus:border-yellow-400 outline-none">
                  <option value="all" className="text-cafe-900">ทั้งหมด</option>
                  {markets.map(m => <option key={m.id} value={m.id} className="text-cafe-900">{m.name}</option>)}
                </select>
              </div>
              {/* Category Filter */}
              <div>
                <label className="block text-xs text-cafe-200 mb-1.5">📦 หมวดหมู่สินค้า</label>
                <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)}
                  className="w-full bg-white/10 text-white rounded-lg px-3 py-2 text-sm border border-white/20 focus:border-yellow-400 outline-none">
                  <option value="all" className="text-cafe-900">ทั้งหมด</option>
                  {categories.map(cat => <option key={cat} value={cat} className="text-cafe-900">{cat}</option>)}
                </select>
              </div>
              {/* Comparison */}
              <div>
                <label className="block text-xs text-cafe-200 mb-1.5">📊 เปรียบเทียบกับ</label>
                <select value={comparisonMode} onChange={e => setComparisonMode(e.target.value as any)}
                  className="w-full bg-white/10 text-white rounded-lg px-3 py-2 text-sm border border-white/20 focus:border-yellow-400 outline-none">
                  <option value="none" className="text-cafe-900">ไม่เปรียบเทียบ</option>
                  <option value="previous" className="text-cafe-900">ช่วงก่อนหน้า</option>
                </select>
              </div>
            </div>
            {/* Active Filters Summary */}
            {(selectedMarket !== 'all' || selectedCategory !== 'all') && (
              <div className="mt-3 flex flex-wrap gap-2 items-center">
                <span className="text-xs text-cafe-300">ใช้อยู่:</span>
                {selectedMarket !== 'all' && (
                  <span className="px-2 py-1 bg-blue-500/30 text-blue-200 rounded-full text-xs">🏪 {markets.find(m => m.id === selectedMarket)?.name}</span>
                )}
                {selectedCategory !== 'all' && (
                  <span className="px-2 py-1 bg-purple-500/30 text-purple-200 rounded-full text-xs">📦 {selectedCategory}</span>
                )}
                <button onClick={() => { setSelectedMarket('all'); setSelectedCategory('all'); }} className="text-xs text-red-300 hover:text-red-200 underline ml-2">ล้างทั้งหมด</button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* HERO STATS ROW */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <HeroStat label="💰 รายรับรวม" value={formatCurrency(metrics.revenue)} subValue={`${formatCurrency(metrics.perDay)}/วัน`} icon={<DollarSign size={20} />} gradient="from-blue-500 to-blue-600" />
        <HeroStat label="📈 กำไรสุทธิ" value={formatCurrency(metrics.profit)} subValue={`Margin ${metrics.margin.toFixed(1)}%`} icon={<TrendingUp size={20} />} gradient="from-emerald-500 to-green-600" />
        <HeroStat label="📦 ขายได้" value={`${metrics.sold} ชิ้น`} subValue={`${metrics.itemsPerDay.toFixed(0)} ชิ้น/วัน`} icon={<ShoppingBag size={20} />} gradient="from-violet-500 to-purple-600" />
        <HeroStat label="🏦 ยอดเงินรวม" value={formatCurrency(jarsSummary.total)} subValue={`Unallocated: ${formatCurrency(unallocatedTotal)}`} icon={<Wallet size={20} />} gradient="from-amber-500 to-orange-600" />
      </div>

      {/* TODAY'S PRODUCTION STATUS */}
      {todayInventory.length > 0 && (
        <div className="bg-gradient-to-r from-blue-50 via-white to-green-50 rounded-2xl border border-blue-100 p-5">
          <h3 className="font-bold text-cafe-900 mb-4 flex items-center gap-2">
            <Flame className="text-orange-500" /> สถานะการผลิตวันนี้ (Live)
          </h3>
          <div className="grid grid-cols-3 gap-4">
            <MetricPill label="🔥 ผลิตแล้ว" value={totalProduced} color="bg-blue-100 text-blue-700" />
            <MetricPill label="🚚 ส่งไปร้าน" value={totalToShop} color="bg-amber-100 text-amber-700" />
            <MetricPill label="✅ ขายแล้ว" value={totalSold} color="bg-green-100 text-green-700" />
          </div>
        </div>
      )}

      {/* LOW STOCK ALERT */}
      {lowStockItems.length > 0 && (
        <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-red-800 flex items-center gap-2">
              <AlertTriangle className="text-red-600" /> ⚠️ วัตถุดิบใกล้หมด ({lowStockItems.length} รายการ)
            </h3>
            <div className="flex items-center gap-3">
              <button onClick={() => setShowLowStock(!showLowStock)}
                className="flex items-center gap-1 px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-sm font-medium transition-colors">
                {showLowStock ? <><ChevronUp size={16} /> ซ่อนรายการ</> : <><ChevronDown size={16} /> ดูทั้งหมด</>}
              </button>
              <button onClick={() => onNavigate?.('inventory')} className="text-sm text-red-600 hover:underline font-medium flex items-center gap-1">
                ไปเติมของ <ArrowRight size={14} />
              </button>
            </div>
          </div>
          {showLowStock && (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3 max-h-96 overflow-y-auto pr-2">
              {lowStockItems.map(ing => {
                const pct = Math.min(100, (ing.currentStock / (ing.minStock || 10)) * 100);
                const isCritical = pct < 30;
                return (
                  <div key={ing.id} className={`bg-white rounded-xl p-3 border ${isCritical ? 'border-red-300 shadow-red-100/50 shadow-md' : 'border-red-100'}`}>
                    <div className="font-medium text-cafe-900 text-sm truncate" title={ing.name}>{ing.name}</div>
                    <div className={`text-2xl font-bold ${isCritical ? 'text-red-600' : 'text-orange-600'}`}>{ing.currentStock}</div>
                    <div className="text-xs text-cafe-500">{ing.unit} (min: {ing.minStock || 10})</div>
                    <div className="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div className={`h-full ${isCritical ? 'bg-red-500' : 'bg-orange-500'}`} style={{ width: `${pct}%` }} />
                    </div>
                    {isCritical && <div className="text-xs text-red-600 font-medium mt-1">⚠️ วิกฤต</div>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* FINANCIAL JARS OVERVIEW */}
      <div className="bg-gradient-to-r from-cafe-50 to-amber-50 rounded-2xl border border-cafe-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-cafe-900 flex items-center gap-2">
            <Wallet className="text-cafe-600" /> 🏦 สุขภาพการเงิน (Jar System)
          </h3>
          <button onClick={() => onNavigate?.('jars')} className="text-sm text-cafe-600 hover:underline font-medium flex items-center gap-1">
            จัดการโถ <ArrowRight size={14} />
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {jars.map(jar => (
            <div key={jar.id} className="bg-white rounded-xl p-4 text-center border border-cafe-100 hover:shadow-md transition-shadow">
              <div className="text-xs text-cafe-500">{jar.name}</div>
              <div className="text-xl font-bold text-cafe-900">{formatCurrency(jar.balance)}</div>
              <div className={`text-xs mt-1 px-2 py-0.5 rounded-full inline-block ${jar.balance > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                {jar.allocationPercent}%
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* INSIGHTS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* TOP PRODUCTS */}
        <InsightCard title="🏆 Top 5 สินค้าทำกำไร" icon={<Award className="text-yellow-500" size={20} />} action={{ label: 'ดูทั้งหมด', onClick: () => onNavigate?.('salesreport') }}>
          {topProducts.length > 0 ? (
            <div className="space-y-3">
              {topProducts.map((p, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-cafe-50 rounded-xl hover:bg-cafe-100 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${i === 0 ? 'bg-yellow-400 text-yellow-900' : i === 1 ? 'bg-gray-300 text-gray-700' : i === 2 ? 'bg-orange-300 text-orange-800' : 'bg-cafe-200 text-cafe-700'}`}>
                      {i + 1}
                    </span>
                    <div>
                      <div className="font-medium text-cafe-900">{p.name}</div>
                      <div className="text-xs text-cafe-500">{p.sold} ชิ้น</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-green-600">{formatCurrency(p.profit)}</div>
                    <div className="text-xs text-cafe-400">กำไร</div>
                  </div>
                </div>
              ))}
            </div>
          ) : <div className="text-center py-8 text-cafe-400">ไม่มีข้อมูล</div>}
        </InsightCard>

        {/* CATEGORY BREAKDOWN */}
        <InsightCard title="📊 ยอดขายตามหมวดหมู่" icon={<PieChart className="text-purple-500" size={20} />}>
          {categoryBreakdown.length > 0 ? (
            <div className="space-y-3">
              {categoryBreakdown.map((cat, i) => {
                const pct = metrics.revenue > 0 ? (cat.revenue / metrics.revenue) * 100 : 0;
                return (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-cafe-900">{cat.name}</span>
                      <span className="text-cafe-600">{formatCurrency(cat.revenue)} ({pct.toFixed(0)}%)</span>
                    </div>
                    <div className="h-2 bg-cafe-100 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-purple-500 to-violet-500 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : <div className="text-center py-8 text-cafe-400">ไม่มีข้อมูล</div>}
        </InsightCard>

        {/* MARKET PERFORMANCE */}
        <InsightCard title="🏪 เปรียบเทียบตลาด" icon={<BarChart3 className="text-blue-500" size={20} />}>
          {marketPerformance.length > 0 ? (
            <div className="space-y-3">
              {marketPerformance.map((m, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-blue-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <Store className="text-blue-500" size={20} />
                    <span className="font-medium text-cafe-900">{m.name}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-cafe-900">{formatCurrency(m.revenue)}</div>
                    <div className="text-xs text-green-600">+{formatCurrency(m.profit)} กำไร</div>
                  </div>
                </div>
              ))}
            </div>
          ) : <div className="text-center py-8 text-cafe-400">ไม่มีข้อมูล</div>}
        </InsightCard>

        {/* QUICK METRICS */}
        <InsightCard title="📈 สรุปสำคัญ" icon={<Zap className="text-amber-500" size={20} />}>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 text-center">
              <DollarSign className="mx-auto text-blue-500 mb-2" size={24} />
              <div className="text-xs text-blue-600">ยอดขาย/วัน</div>
              <div className="text-xl font-bold text-blue-900">{formatCurrency(metrics.perDay)}</div>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 text-center">
              <ShoppingBag className="mx-auto text-purple-500 mb-2" size={24} />
              <div className="text-xs text-purple-600">สินค้า/วัน</div>
              <div className="text-xl font-bold text-purple-900">{metrics.itemsPerDay.toFixed(0)} ชิ้น</div>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 text-center">
              <CalendarIcon className="mx-auto text-green-500 mb-2" size={24} />
              <div className="text-xs text-green-600">วันขายดีสุด</div>
              <div className="text-xl font-bold text-green-900">{bestDay ? formatCurrency(bestDay[1]) : '-'}</div>
              <div className="text-xs text-green-600">{bestDay ? new Date(bestDay[0]).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }) : ''}</div>
            </div>
            <div className={`bg-gradient-to-br ${lowStockItems.length > 0 ? 'from-red-50 to-red-100' : 'from-gray-50 to-gray-100'} rounded-xl p-4 text-center`}>
              <Package className={`mx-auto mb-2 ${lowStockItems.length > 0 ? 'text-red-500' : 'text-gray-500'}`} size={24} />
              <div className={`text-xs ${lowStockItems.length > 0 ? 'text-red-600' : 'text-gray-600'}`}>วัตถุดิบใกล้หมด</div>
              <div className={`text-xl font-bold ${lowStockItems.length > 0 ? 'text-red-900' : 'text-gray-900'}`}>{lowStockItems.length} รายการ</div>
            </div>
          </div>
        </InsightCard>
      </div>

      {/* GOALS SECTION */}
      {goals.length > 0 && (
        <div>
          <h3 className="font-bold text-cafe-900 mb-4 flex items-center gap-2">
            <Target className="text-cafe-600" /> 🎯 เป้าหมายทางการเงิน
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {goals.map(goal => <GoalCard key={goal.id} goal={goal} onEdit={() => { setEditingGoal(goal); setIsGoalModalOpen(true); }} />)}
          </div>
        </div>
      )}

      <GoalModal isOpen={isGoalModalOpen} onClose={() => { setIsGoalModalOpen(false); setEditingGoal(null); }} goal={editingGoal} />
    </div>
  );
};

export default Dashboard;
