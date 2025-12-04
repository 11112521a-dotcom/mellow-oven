import React, { useState, useMemo } from 'react';
import { useStore } from '@/src/store';
import { calculateKPIs, getTopProducts } from '@/src/lib/analytics';
import { formatCurrency } from '@/src/lib/utils';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  DollarSign,
  Activity,
  Target,
  Package,
  ShoppingBag,
  Trash2,
  Calendar as CalendarIcon,
  Filter,
  RefreshCw,
  ArrowRight,
  Store,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { DateRangePicker, DateRange } from '@/src/components/ui/DateRangePicker';
import { startOfMonth, endOfMonth, isWithinInterval, differenceInDays, subDays, startOfWeek, startOfDay, endOfDay } from 'date-fns';
import { GoalCard } from '@/src/components/Finance/GoalCard';
import { GoalModal } from '@/src/components/Finance/GoalModal';

interface DashboardProps {
  onNavigate?: (page: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const { transactions, dailyReports, products, alerts, generateAlerts, ingredients, markets, productSales, goals, updateIngredient } = useStore();

  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<any>(null);

  const handleEditGoal = (goal: any) => {
    setEditingGoal(goal);
    setIsGoalModalOpen(true);
  };

  // Generate alerts on mount
  React.useEffect(() => {
    generateAlerts();
  }, [generateAlerts]);

  // Enhanced Filter State - Default to TODAY
  const [dateRange, setDateRange] = useState<DateRange>({
    from: startOfDay(new Date()),
    to: endOfDay(new Date()),
    label: 'วันนี้'
  });
  const [selectedMarket, setSelectedMarket] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [comparisonMode, setComparisonMode] = useState<'none' | 'previous' | 'lastYear'>('previous');
  const [showFilters, setShowFilters] = useState(false);
  const [showLowStockAlerts, setShowLowStockAlerts] = useState(true);

  // Quick Date Presets
  const applyQuickDate = (preset: string) => {
    const today = new Date();
    let from: Date, to: Date, label: string;

    switch (preset) {
      case 'today':
        from = to = startOfDay(today);
        label = 'วันนี้';
        break;
      case 'yesterday':
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        from = to = startOfDay(yesterday);
        label = 'เมื่อวาน';
        break;
      case 'week':
        from = startOfWeek(today, { weekStartsOn: 1 });
        to = endOfDay(today);
        label = 'สัปดาห์นี้';
        break;
      case 'month':
        from = startOfMonth(today);
        to = endOfMonth(today);
        label = 'เดือนนี้';
        break;
      case 'last7':
        from = subDays(today, 6);
        to = today;
        label = '7 วันที่แล้ว';
        break;
      case 'last30':
        from = subDays(today, 29);
        to = today;
        label = '30 วันที่แล้ว';
        break;
      default:
        return;
    }

    setDateRange({ from, to, label });
  };

  // Reset Filters
  const resetFilters = () => {
    setDateRange({
      from: startOfMonth(new Date()),
      to: endOfMonth(new Date()),
      label: 'เดือนนี้'
    });
    setSelectedMarket('all');
    setSelectedCategory('all');
    setComparisonMode('previous');
  };

  // Get unique categories
  const categories = useMemo(() => {
    return Array.from(new Set(products.map(p => p.category))).filter(Boolean);
  }, [products]);

  // Filter ProductSales (like SalesReport)
  const filteredSales = useMemo(() => {
    return productSales.filter(sale => {
      const matchDate = sale.saleDate >= dateRange.from.toISOString().split('T')[0] &&
        sale.saleDate <= dateRange.to.toISOString().split('T')[0];
      const matchMarket = selectedMarket === 'all' || sale.marketId === selectedMarket;
      const matchCategory = selectedCategory === 'all' || sale.category === selectedCategory;
      return matchDate && matchMarket && matchCategory;
    });
  }, [productSales, dateRange, selectedMarket, selectedCategory]);

  // Calculate KPIs from productSales
  const kpis = useMemo(() => {
    const totalRevenue = filteredSales.reduce((sum, s) => sum + s.totalRevenue, 0);
    const totalCost = filteredSales.reduce((sum, s) => sum + s.totalCost, 0);
    const totalProfit = filteredSales.reduce((sum, s) => sum + s.grossProfit, 0);

    return {
      revenue: totalRevenue,
      cogs: totalCost,
      opex: 0,
      netProfit: totalProfit,
      wasteValue: 0,
      margin: totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0
    };
  }, [filteredSales]);

  // Product Stats from filtered sales
  const productStats = useMemo(() => {
    const stats: Record<string, { name: string; revenue: number; profit: number; sold: number }> = {};

    filteredSales.forEach(sale => {
      if (!stats[sale.productId]) {
        stats[sale.productId] = {
          name: sale.productName,
          revenue: 0,
          profit: 0,
          sold: 0
        };
      }
      stats[sale.productId].revenue += sale.totalRevenue;
      stats[sale.productId].profit += sale.grossProfit;
      stats[sale.productId].sold += sale.quantitySold;
    });

    const byProfit = Object.values(stats).sort((a, b) => b.profit - a.profit);

    return { byProfit };
  }, [filteredSales]);

  // Comparison Period Calculation
  const periodDays = differenceInDays(dateRange.to, dateRange.from) || 1;

  const [comparisonStart, comparisonEnd] = useMemo(() => {
    if (comparisonMode === 'none') return [null, null];

    if (comparisonMode === 'previous') {
      return [
        subDays(dateRange.from, periodDays + 1),
        subDays(dateRange.to, periodDays + 1)
      ];
    } else { // lastYear
      const start = new Date(dateRange.from);
      start.setFullYear(start.getFullYear() - 1);
      const end = new Date(dateRange.to);
      end.setFullYear(end.getFullYear() - 1);
      return [start, end];
    }
  }, [comparisonMode, dateRange, periodDays]);

  const previousKpis = useMemo(() => {
    if (!comparisonStart || !comparisonEnd) {
      return { revenue: 0, netProfit: 0, margin: 0, wasteValue: 0 };
    }

    const prevTransactions = transactions.filter(t => {
      const date = new Date(t.date);
      return isWithinInterval(date, { start: comparisonStart, end: comparisonEnd });
    });

    const prevReports = dailyReports.filter(r => {
      const date = new Date(r.date);
      const dateMatch = isWithinInterval(date, { start: comparisonStart, end: comparisonEnd });
      const marketMatch = selectedMarket === 'all' || r.marketId === selectedMarket;

      // Category filter
      let categoryMatch = true;
      if (selectedCategory !== 'all') {
        categoryMatch = (r.logs || []).some(log => {
          const product = products.find(p => p.id === log.productId);
          return product?.category === selectedCategory;
        });
      }

      return dateMatch && marketMatch && categoryMatch;
    });

    return calculateKPIs(prevTransactions, prevReports);
  }, [transactions, dailyReports, comparisonStart, comparisonEnd, selectedMarket]);

  const trends = useMemo(() => {
    if (comparisonMode === 'none') {
      return { revenue: 0, profit: 0, margin: 0 };
    }

    return {
      revenue: previousKpis.revenue > 0
        ? ((kpis.revenue - previousKpis.revenue) / previousKpis.revenue) * 100
        : 0,
      profit: previousKpis.netProfit > 0
        ? ((kpis.netProfit - previousKpis.netProfit) / previousKpis.netProfit) * 100
        : 0,
      margin: previousKpis.margin > 0
        ? ((kpis.margin - previousKpis.margin) / previousKpis.margin) * 100
        : 0
    };
  }, [kpis, previousKpis, comparisonMode]);

  // Waste Analysis - Note: productSales doesn't have waste data, so we'll skip or set to 0
  const wastePercentage = 0; // Not available in productSales

  // Low Stock Items Count
  const lowStockItems = ingredients.filter(ing =>
    ing.currentStock < (ing.minStock || 10)
  ).length;

  // Detailed Low Stock Items List
  const lowStockIngredientsList = useMemo(() => {
    return ingredients.filter(ing => ing.currentStock <= (ing.minStock || 10))
      .sort((a, b) => (a.currentStock / (a.minStock || 10)) - (b.currentStock / (b.minStock || 10))); // Sort by severity
  }, [ingredients]);

  // Best Day (from filtered sales)
  const salesByDate = useMemo(() => {
    const dateMap: Record<string, number> = {};

    filteredSales.forEach(sale => {
      if (!dateMap[sale.saleDate]) {
        dateMap[sale.saleDate] = 0;
      }
      dateMap[sale.saleDate] += sale.totalRevenue;
    });

    return dateMap;
  }, [filteredSales]);

  const bestDay = Object.entries(salesByDate).sort(([, a], [, b]) => (b as number) - (a as number))[0];

  // Category Performance (from filtered sales)
  const categoryStats = useMemo(() => {
    const stats: Record<string, { revenue: number; quantity: number }> = {};

    filteredSales.forEach(sale => {
      const category = sale.category || 'อื่นๆ';

      if (!stats[category]) {
        stats[category] = { revenue: 0, quantity: 0 };
      }

      stats[category].revenue += sale.totalRevenue;
      stats[category].quantity += sale.quantitySold;
    });

    return Object.entries(stats)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [filteredSales]);

  // Sales Velocity
  const totalItemsSold = filteredSales.reduce((sum, sale) => sum + sale.quantitySold, 0);
  const itemsPerDay = totalItemsSold / periodDays;

  // Active filter count
  const activeFiltersCount =
    (selectedMarket !== 'all' ? 1 : 0) +
    (selectedCategory !== 'all' ? 1 : 0) +
    (comparisonMode !== 'none' ? 1 : 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20 md:pb-12">
      {/* Header with Filters */}
      <header className="space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-cafe-900 flex items-center gap-3">
              <Activity className="text-cafe-600" size={28} />
              ภาพรวมธุรกิจ
            </h2>
            <p className="text-sm text-cafe-500 mt-1">วิเคราะห์สุขภาพร้านและแนวโน้ม</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${showFilters || activeFiltersCount > 0
                ? 'bg-cafe-600 text-white'
                : 'bg-white border border-cafe-200 text-cafe-700 hover:bg-cafe-50'
                }`}
            >
              <Filter size={18} />
              Filter
              {activeFiltersCount > 0 && (
                <span className="bg-white text-cafe-600 text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {activeFiltersCount}
                </span>
              )}
            </button>
            {activeFiltersCount > 0 && (
              <button
                onClick={resetFilters}
                className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium bg-white border border-cafe-200 text-cafe-700 hover:bg-cafe-50 transition-colors"
              >
                <RefreshCw size={18} />
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="bg-white rounded-2xl shadow-lg border border-cafe-100 p-6 space-y-6 animate-in slide-in-from-top-2 duration-300 relative overflow-hidden">
            {/* Decorative Background */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-orange-50 to-transparent rounded-full -mr-32 -mt-32 opacity-50 pointer-events-none"></div>

            {/* Section 1: Time Period */}
            <div className="relative">
              <div className="flex items-center gap-2 mb-3 text-cafe-800">
                <CalendarIcon size={20} className="text-orange-500" />
                <h3 className="font-bold text-base">ช่วงเวลา (Time Period)</h3>
              </div>

              <div className="flex flex-col xl:flex-row gap-4 items-start xl:items-center">
                {/* Presets */}
                <div className="flex flex-wrap gap-2">
                  {[
                    { key: 'today', label: 'วันนี้' },
                    { key: 'yesterday', label: 'เมื่อวาน' },
                    { key: 'week', label: 'สัปดาห์นี้' },
                    { key: 'month', label: 'เดือนนี้' },
                    { key: 'last7', label: '7 วันล่าสุด' },
                    { key: 'last30', label: '30 วันล่าสุด' }
                  ].map(preset => (
                    <button
                      key={preset.key}
                      onClick={() => applyQuickDate(preset.key)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all border ${dateRange.label === preset.label
                        ? 'bg-orange-100 border-orange-200 text-orange-700 shadow-sm'
                        : 'bg-white border-cafe-200 text-cafe-600 hover:bg-cafe-50 hover:border-cafe-300'
                        }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                <div className="hidden xl:block w-px h-8 bg-cafe-200 mx-2"></div>

                {/* Date Picker */}
                <div className="w-full xl:w-auto flex-1 max-w-md">
                  <DateRangePicker value={dateRange} onChange={setDateRange} />
                </div>
              </div>
            </div>

            <div className="h-px bg-cafe-100"></div>

            {/* Section 2: Dimensions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
              {/* Market Filter */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-cafe-700 flex items-center gap-2">
                  <Store size={16} className="text-blue-500" />
                  ตลาด/สาขา
                </label>
                <div className="relative">
                  <select
                    value={selectedMarket}
                    onChange={(e) => setSelectedMarket(e.target.value)}
                    className="w-full p-2.5 pl-3 pr-8 bg-cafe-50 border border-cafe-200 rounded-lg text-cafe-900 focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none transition-all appearance-none cursor-pointer hover:bg-white"
                  >
                    <option value="all">ทั้งหมด (All Markets)</option>
                    {markets.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-cafe-400">
                    <ArrowRight size={14} className="rotate-90" />
                  </div>
                </div>
              </div>

              {/* Category Filter */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-cafe-700 flex items-center gap-2">
                  <Package size={16} className="text-purple-500" />
                  หมวดหมู่สินค้า
                </label>
                <div className="relative">
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full p-2.5 pl-3 pr-8 bg-cafe-50 border border-cafe-200 rounded-lg text-cafe-900 focus:ring-2 focus:ring-purple-200 focus:border-purple-400 outline-none transition-all appearance-none cursor-pointer hover:bg-white"
                  >
                    <option value="all">ทั้งหมด (All Categories)</option>
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-cafe-400">
                    <ArrowRight size={14} className="rotate-90" />
                  </div>
                </div>
              </div>

              {/* Comparison Mode */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-cafe-700 flex items-center gap-2">
                  <Activity size={16} className="text-green-500" />
                  เปรียบเทียบกับ
                </label>
                <div className="relative">
                  <select
                    value={comparisonMode}
                    onChange={(e) => setComparisonMode(e.target.value as any)}
                    className="w-full p-2.5 pl-3 pr-8 bg-cafe-50 border border-cafe-200 rounded-lg text-cafe-900 focus:ring-2 focus:ring-green-200 focus:border-green-400 outline-none transition-all appearance-none cursor-pointer hover:bg-white"
                  >
                    <option value="none">ไม่เปรียบเทียบ (No Comparison)</option>
                    <option value="previous">ช่วงก่อนหน้า (Previous Period)</option>
                    <option value="lastYear">ปีที่แล้ว (Last Year)</option>
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-cafe-400">
                    <ArrowRight size={14} className="rotate-90" />
                  </div>
                </div>
              </div>
            </div>

            {/* Active Filters Summary */}
            {activeFiltersCount > 0 && (
              <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-cafe-100">
                <span className="text-xs font-bold text-cafe-400 uppercase tracking-wider">Active Filters:</span>

                {/* Date Label */}
                <span className="px-3 py-1 bg-orange-50 text-orange-700 border border-orange-100 rounded-full text-xs font-medium flex items-center gap-1">
                  <CalendarIcon size={12} />
                  {dateRange.label || 'Custom Range'}
                </span>

                {selectedMarket !== 'all' && (
                  <span className="px-3 py-1 bg-blue-50 text-blue-700 border border-blue-100 rounded-full text-xs font-medium flex items-center gap-1">
                    <Store size={12} />
                    {markets.find(m => m.id === selectedMarket)?.name}
                  </span>
                )}
                {selectedCategory !== 'all' && (
                  <span className="px-3 py-1 bg-purple-50 text-purple-700 border border-purple-100 rounded-full text-xs font-medium flex items-center gap-1">
                    <Package size={12} />
                    {selectedCategory}
                  </span>
                )}
                {comparisonMode !== 'none' && (
                  <span className="px-3 py-1 bg-green-50 text-green-700 border border-green-100 rounded-full text-xs font-medium flex items-center gap-1">
                    <Activity size={12} />
                    vs {comparisonMode === 'previous' ? 'Previous' : 'Last Year'}
                  </span>
                )}

                <button
                  onClick={resetFilters}
                  className="ml-auto text-xs text-cafe-500 hover:text-red-500 underline transition-colors"
                >
                  Clear All
                </button>
              </div>
            )}
          </div>
        )}
      </header>

      {/* Alerts */}


      {/* Low Stock Alerts Section - Zenith UI */}
      {lowStockIngredientsList.length > 0 && (
        <div className="mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-red-800 flex items-center gap-2">
                <AlertTriangle className="text-red-600" />
                วัตถุดิบต้องเติมด่วน ({lowStockIngredientsList.length})
              </h2>
              <button
                onClick={() => setShowLowStockAlerts(!showLowStockAlerts)}
                className="p-1.5 rounded-full hover:bg-red-50 text-red-600 transition-colors"
                title={showLowStockAlerts ? "ซ่อนรายการ" : "แสดงรายการ"}
              >
                {showLowStockAlerts ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </button>
            </div>
            <button
              onClick={() => onNavigate?.('inventory')}
              className="text-sm text-red-600 hover:text-red-800 font-medium flex items-center gap-1 hover:underline"
            >
              ไปที่คลังสินค้า <ArrowRight size={16} />
            </button>
          </div>

          {showLowStockAlerts && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {lowStockIngredientsList.map(ing => {
                const min = ing.minStock || 10;
                const percentage = Math.min(100, (ing.currentStock / min) * 100);
                const isCritical = percentage <= 50;

                return (
                  <div key={ing.id} className="bg-white p-4 rounded-xl border border-red-100 shadow-sm hover:shadow-md transition-all group relative overflow-hidden">
                    <div className={`absolute top-0 left-0 w-1 h-full ${isCritical ? 'bg-red-600' : 'bg-orange-500'}`}></div>

                    <div className="flex justify-between items-start mb-2 pl-2">
                      <div>
                        <h4 className="font-bold text-cafe-900 truncate pr-2" title={ing.name}>{ing.name}</h4>
                        <p className="text-xs text-cafe-500">{ing.supplier || 'No Supplier'}</p>
                      </div>
                      <span className={`text-xs font-bold px-2 py-1 rounded-full ${isCritical ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
                        {isCritical ? 'วิกฤต' : 'ใกล้หมด'}
                      </span>
                    </div>

                    <div className="pl-2 mt-3 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-cafe-600">คงเหลือ:</span>
                        <span className="font-bold text-cafe-900">{ing.currentStock} {ing.unit}</span>
                      </div>

                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all duration-500 ${isCritical ? 'bg-red-500' : 'bg-orange-500'}`}
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>

                      <div className="flex justify-between text-xs text-cafe-400">
                        <span>Min: {min}</span>
                        <span>{percentage.toFixed(0)}%</span>
                      </div>

                      <button
                        onClick={() => onNavigate?.('inventory')}
                        className="w-full mt-2 py-1.5 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                      >
                        เติมของ
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Main KPI Cards with Trends */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KPICard
          title="รายได้"
          value={formatCurrency(kpis.revenue)}
          trend={comparisonMode !== 'none' ? trends.revenue : undefined}
          icon={<DollarSign size={24} className="text-blue-600" />}
          bgColor="bg-blue-50"
          textColor="text-blue-900"
        />
        <KPICard
          title="กำไรสุทธิ"
          value={formatCurrency(kpis.netProfit)}
          trend={comparisonMode !== 'none' ? trends.profit : undefined}
          subtitle={`Margin: ${kpis.margin.toFixed(1)}%`}
          icon={<Target size={24} className="text-green-600" />}
          bgColor="bg-green-50"
          textColor="text-green-900"
          highlight={true}
        />
        <KPICard
          title="ของเสีย"
          value={`${wastePercentage.toFixed(1)}%`}
          subtitle="ข้อมูลน้ีไม่พร้อมใช้งาน"
          icon={<Trash2 size={24} className={wastePercentage < 10 ? "text-green-600" : "text-red-600"} />}
          bgColor={wastePercentage < 10 ? "bg-green-50" : "bg-red-50"}
          textColor={wastePercentage < 10 ? "text-green-900" : "text-red-900"}
        />
      </div>

      {/* Goals Section */}
      {
        goals.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-bold text-cafe-900 mb-4 flex items-center gap-2">
              <Target className="text-cafe-600" />
              เป้าหมายทางการเงิน
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {goals.map(goal => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  onEdit={() => handleEditGoal(goal)}
                />
              ))}
            </div>
          </div>
        )
      }

      {/* Insights Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-cafe-100">
          <h3 className="text-lg font-bold text-cafe-900 mb-5 flex items-center gap-2">
            <TrendingUp size={22} className="text-green-600" />
            🏆 Top 5 สินค้าทำเงิน
          </h3>

          {productStats.byProfit.length > 0 ? (
            <div className="space-y-3">
              {productStats.byProfit.slice(0, 5).map((p, i) => (
                <div key={i} className="group hover:bg-cafe-50 p-3 rounded-xl transition-colors">
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-3">
                      <span className={`
                                                flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm
                                                ${i === 0 ? 'bg-yellow-100 text-yellow-700' :
                          i === 1 ? 'bg-gray-100 text-gray-700' :
                            i === 2 ? 'bg-orange-100 text-orange-700' :
                              'bg-slate-100 text-slate-700'}
                                            `}>
                        {i + 1}
                      </span>
                      <span className="font-semibold text-cafe-900 text-sm">{p.name}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-base font-bold text-green-600">{formatCurrency(p.profit)}</p>
                      <p className="text-xs text-cafe-500">{p.sold} ชิ้น</p>
                    </div>
                  </div>
                  <div className="w-full bg-cafe-100 rounded-full h-2">
                    <div
                      className="h-2 rounded-full bg-green-500 transition-all"
                      style={{ width: `${(p.profit / (productStats.byProfit[0].profit || 1)) * 100}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-cafe-400">
              <p className="text-sm">ไม่มีข้อมูลในช่วงที่เลือก</p>
            </div>
          )}
        </div>

        {/* Category Performance */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-cafe-100">
          <h3 className="text-lg font-bold text-cafe-900 mb-5 flex items-center gap-2">
            <Package size={22} className="text-purple-600" />
            📊 ยอดขายตามหมวดหมู่
          </h3>

          {categoryStats.length > 0 ? (
            <div className="space-y-3">
              {categoryStats.slice(0, 5).map((cat, i) => (
                <div key={i} className="flex justify-between items-center p-3 hover:bg-cafe-50 rounded-lg transition-colors">
                  <div>
                    <p className="font-semibold text-cafe-900 text-sm">{cat.name}</p>
                    <p className="text-xs text-cafe-500">{cat.quantity} ชิ้น</p>
                  </div>
                  <p className="font-bold text-cafe-900">{formatCurrency(cat.revenue)}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-cafe-400">
              <p className="text-sm">ไม่มีข้อมูล</p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <QuickStat
          label="ยอดขาย/วัน"
          value={formatCurrency(kpis.revenue / periodDays)}
          icon={<DollarSign size={16} className="text-blue-500" />}
        />
        <QuickStat
          label="สินค้า/วัน"
          value={`${Math.round(itemsPerDay)} ชิ้น`}
          icon={<ShoppingBag size={16} className="text-purple-500" />}
        />
        <QuickStat
          label="วันขายดีสุด"
          value={bestDay ? `${formatCurrency(bestDay[1] as number)}` : '-'}
          subtitle={bestDay ? new Date(bestDay[0]).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }) : undefined}
          icon={<CalendarIcon size={16} className="text-green-500" />}
        />
        <QuickStat
          label="วัตถุดิบใกล้หมด"
          value={`${lowStockItems} รายการ`}
          icon={<Package size={16} className={lowStockItems > 0 ? "text-red-500" : "text-green-500"} />}
          alert={lowStockItems > 0}
        />
      </div>
    </div >
  );
};

// KPI Card with Trend
const KPICard = ({ title, value, trend, subtitle, icon, bgColor, textColor, highlight }: any) => {
  const trendColor = trend > 0 ? 'text-green-600' : trend < 0 ? 'text-red-600' : 'text-gray-400';
  const TrendIcon = trend > 0 ? TrendingUp : trend < 0 ? TrendingDown : null;

  return (
    <div className={`${bgColor} ${highlight ? 'ring-2 ring-green-400' : ''} p-6 rounded-2xl shadow-sm hover:shadow-md transition-all`}>
      <div className="flex items-start justify-between mb-3">
        <p className={`text-sm font-medium ${textColor} opacity-80`}>{title}</p>
        {icon}
      </div>
      <h3 className={`text-3xl font-bold ${textColor} mb-1`}>{value}</h3>
      <div className="flex items-center justify-between">
        {subtitle && <p className={`text-xs ${textColor} opacity-70`}>{subtitle}</p>}
        {trend !== undefined && trend !== 0 && (
          <div className={`flex items-center gap-1 ${trendColor} text-xs font-semibold`}>
            {TrendIcon && <TrendIcon size={14} />}
            {Math.abs(trend).toFixed(1)}%
          </div>
        )}
      </div>
    </div>
  );
};

// Quick Stat with Icon
const QuickStat = ({ label, value, subtitle, icon, alert }: {
  label: string;
  value: string;
  subtitle?: string;
  icon?: React.ReactNode;
  alert?: boolean;
}) => {
  return (
    <div className={`bg-white p-4 rounded-xl border ${alert ? 'border-red-300 bg-red-50' : 'border-cafe-100'} hover:shadow-sm transition-shadow`}>
      <div className="flex items-center justify-center gap-2 mb-2">
        {icon}
        <p className="text-xs text-cafe-500">{label}</p>
      </div>
      <p className="text-lg font-bold text-cafe-900 text-center">{value}</p>
      {subtitle && <p className="text-xs text-cafe-400 text-center mt-1">{subtitle}</p>}
    </div>
  );
};

export default Dashboard;
