import React, { useState, useMemo } from 'react';
import { useStore } from '@/src/store';
import { calculateKPIs, getTopProducts, getMarketPerformance, getRunway } from '@/src/lib/analytics';
import { formatCurrency } from '@/src/lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { TrendingUp, TrendingDown, AlertTriangle, DollarSign, Activity, Target, Wallet } from 'lucide-react';
import { MenuMatrix } from '@/src/components/Analytics/MenuMatrix';
import { DateRangePicker, DateRange } from '@/src/components/ui/DateRangePicker';
import { startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';

const Dashboard: React.FC = () => {
  const { transactions, dailyReports, products, jars, markets } = useStore();

  // Date Range State
  const [dateRange, setDateRange] = useState<DateRange>({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date()),
    label: 'เดือนนี้'
  });

  // Filter data based on date range
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const date = new Date(t.date);
      return isWithinInterval(date, { start: dateRange.from, end: dateRange.to });
    });
  }, [transactions, dateRange]);

  const filteredDailyReports = useMemo(() => {
    return dailyReports.filter(r => {
      const date = new Date(r.date);
      return isWithinInterval(date, { start: dateRange.from, end: dateRange.to });
    });
  }, [dailyReports, dateRange]);

  const kpis = calculateKPIs(filteredTransactions, filteredDailyReports);

  // Flatten logs for analysis (filtered by date range)
  const allLogs = filteredDailyReports.flatMap(r => r.logs || []);

  const productStats = getTopProducts(allLogs, products);
  const marketStats = getMarketPerformance(filteredDailyReports, markets);

  // Wealth & Goals
  const emergencyFund = jars.find(j => j.id === 'Emergency')?.balance || 0;
  const capexFund = jars.find(j => j.id === 'CapEx')?.balance || 0;
  const capexGoal = 20000; // Example Goal: New Fridge
  const capexProgress = Math.min(100, (capexFund / capexGoal) * 100);

  // Runway Calculation (Assume avg daily expense = 1000 for demo if no data)
  const avgDailyExpense = 1000;
  const runwayDays = getRunway(emergencyFund, avgDailyExpense);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-cafe-900 flex items-center gap-2">
            <Activity className="text-cafe-600" /> The Pulse: สุขภาพร้าน
          </h2>
          <p className="text-cafe-500">ภาพรวมธุรกิจประจำเดือนนี้</p>
        </div>
        <DateRangePicker value={dateRange} onChange={setDateRange} />
      </header>

      {/* Zone 1: The Pulse (Scorecards) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <ScoreCard
          title="รายได้รวม (Revenue)"
          value={formatCurrency(kpis.revenue)}
          trend="+12%"
          trendUp={true}
          icon={<DollarSign size={18} />}
        />
        <ScoreCard
          title="กำไรสุทธิ (Net Profit)"
          value={formatCurrency(kpis.netProfit)}
          subValue={`Margin: ${kpis.margin.toFixed(1)}%`}
          trend="Target > 25%"
          trendUp={kpis.margin > 25}
          highlight={true}
        />
        <ScoreCard
          title="Net Margin %"
          value={`${kpis.margin.toFixed(1)}%`}
          trend={kpis.margin > 20 ? "Healthy" : "Low"}
          trendUp={kpis.margin > 20}
        />
        <ScoreCard
          title="อัตราของเสีย (Waste Rate)"
          value={`${((kpis.wasteValue / (kpis.revenue || 1)) * 100).toFixed(1)}%`}
          trend="Target < 5%"
          trendUp={((kpis.wasteValue / (kpis.revenue || 1)) * 100) < 5}
          inverse={true} // Lower is better
        />
        <ScoreCard
          title="ยอดขายเฉลี่ย/วัน"
          value={formatCurrency(kpis.revenue / 30)} // Approx
          trend="Stable"
          trendUp={true}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Zone 2: Product Intelligence */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-cafe-100">
          <h3 className="text-lg font-bold text-cafe-800 mb-6 flex items-center gap-2">
            <TrendingUp size={20} /> ประสิทธิภาพเมนู (Product Intelligence)
          </h3>

          <div className="space-y-6">
            <div>
              <h4 className="text-sm font-medium text-cafe-500 mb-3">🏆 Top 3 สินค้าทำเงิน (By Profit)</h4>
              {productStats.byProfit.length > 0 ? (
                <div className="space-y-3">
                  {productStats.byProfit.slice(0, 3).map((p, i) => (
                    <div key={i} className="relative">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-bold text-cafe-800">{i + 1}. {p.name}</span>
                        <span className="text-green-600 font-bold">{formatCurrency(p.profit)}</span>
                      </div>
                      <div className="w-full bg-cafe-100 rounded-full h-2">
                        <div
                          className="bg-green-500 h-2 rounded-full"
                          style={{ width: `${(p.profit / (productStats.byProfit[0].profit || 1)) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-cafe-400 italic">ยังไม่มีข้อมูลการขาย</p>
              )}
            </div>

            <div className="pt-4 border-t border-cafe-100">
              <h4 className="text-sm font-medium text-cafe-500 mb-3">⚠️ ต้นทุนต่อเมนูสูง (Cost % &gt; 60%)</h4>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart layout="vertical" data={productStats.costAnalysis.slice(0, 5)} margin={{ left: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(value: number) => `${value.toFixed(1)}%`} />
                    <Bar dataKey="costPct" name="Cost %" radius={[0, 4, 4, 0]}>
                      {productStats.costAnalysis.slice(0, 5).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.costPct > 60 ? '#ef4444' : '#b08968'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        {/* Zone 3: Market Insights */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-cafe-100">
          <h3 className="text-lg font-bold text-cafe-800 mb-6 flex items-center gap-2">
            <Target size={20} /> สมรภูมิการค้า (Market Insights)
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={marketStats} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Bar dataKey="sales" name="ยอดขาย" fill="#b08968" radius={[4, 4, 0, 0]} />
                <Bar dataKey="profit" name="กำไร" fill="#22c55e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4">
            {marketStats.map((m, i) => (
              <div key={i} className="bg-cafe-50 p-3 rounded-lg text-center">
                <p className="text-xs text-cafe-500">{m.name}</p>
                <p className="font-bold text-cafe-800">{formatCurrency(m.profit)}</p>
                <p className="text-xs text-green-600">กำไร</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Zone 2.5: Deep Analysis */}
      <div className="grid grid-cols-1">
        <MenuMatrix logs={allLogs} products={products} />
      </div>

      {/* Zone 4: Wealth & Goals */}
      <div className="bg-cafe-900 text-white p-8 rounded-3xl shadow-xl">
        <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
          <Wallet className="text-yellow-400" /> ความมั่งคั่ง & เป้าหมาย (Wealth & Goals)
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Money Pockets */}
          <div className="space-y-4">
            <h4 className="text-cafe-300 text-sm font-medium uppercase tracking-wider">Current Money Pockets</h4>
            <div className="grid grid-cols-2 gap-3">
              {jars.map(jar => (
                <div key={jar.id} className="bg-white/10 p-3 rounded-xl backdrop-blur-sm">
                  <p className="text-xs text-cafe-300">{jar.name}</p>
                  <p className="font-bold text-lg">{formatCurrency(jar.balance)}</p>
                </div>
              ))}
            </div>
          </div>

          {/* CapEx Goal */}
          <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
            <h4 className="text-cafe-300 text-sm font-medium uppercase tracking-wider mb-4">🎯 เป้าหมายถัดไป: ตู้เย็นใหญ่</h4>
            <div className="flex justify-between items-end mb-2">
              <span className="text-3xl font-bold text-yellow-400">{capexProgress.toFixed(0)}%</span>
              <span className="text-sm text-cafe-300">{formatCurrency(capexFund)} / {formatCurrency(capexGoal)}</span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-4 overflow-hidden">
              <div
                className="bg-yellow-400 h-4 rounded-full transition-all duration-1000"
                style={{ width: `${capexProgress}%` }}
              ></div>
            </div>
            <p className="text-xs text-cafe-400 mt-3">เก็บอีก {formatCurrency(capexGoal - capexFund)} จะซื้อได้แล้ว!</p>
          </div>

          {/* Runway */}
          <div className="flex flex-col justify-center items-center bg-white/5 p-6 rounded-2xl border border-white/10 text-center">
            <h4 className="text-cafe-300 text-sm font-medium uppercase tracking-wider mb-2">Runway (อยู่ได้อีก)</h4>
            <div className="text-5xl font-bold text-green-400 mb-1">{runwayDays} <span className="text-xl text-white">วัน</span></div>
            <p className="text-xs text-cafe-400">คำนวณจากเงินฉุกเฉิน / ค่าใช้จ่ายเฉลี่ย</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper Component for ScoreCard
const ScoreCard = ({ title, value, subValue, trend, trendUp, highlight, inverse }: any) => {
  const trendColor = inverse
    ? (trendUp ? 'text-green-600' : 'text-red-600') // Inverse: Lower is better (Green), Higher is worse (Red)
    : (trendUp ? 'text-green-600' : 'text-red-600'); // Normal: Higher is better (Green)

  return (
    <div className={`p-5 rounded-2xl shadow-sm border ${highlight ? 'bg-cafe-900 border-cafe-900 text-white' : 'bg-white border-cafe-100'}`}>
      <p className={`text-sm mb-1 ${highlight ? 'text-cafe-300' : 'text-cafe-500'}`}>{title}</p>
      <h3 className={`text-2xl font-bold ${highlight ? 'text-white' : 'text-cafe-900'}`}>{value}</h3>
      {subValue && <p className={`text-xs mt-1 ${highlight ? 'text-cafe-400' : 'text-cafe-500'}`}>{subValue}</p>}
      {trend && (
        <div className={`flex items-center gap-1 text-xs mt-2 font-medium ${trendColor}`}>
          {trendUp ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
          {trend}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
