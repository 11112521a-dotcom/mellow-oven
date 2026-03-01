import React, { useMemo } from 'react';
import { useStore } from '@/src/store';
import { Package, AlertTriangle, TrendingUp, DollarSign, ArrowRight, BarChart3 } from 'lucide-react';
import { formatCurrency } from '@/src/lib/utils';

interface InventoryDashboardProps {
    onNavigateToIngredients?: () => void;
    onNavigateToOrders?: () => void;
}

export const InventoryDashboard: React.FC<InventoryDashboardProps> = ({
    onNavigateToIngredients,
    onNavigateToOrders,
}) => {
    const { ingredients } = useStore();

    const stats = useMemo(() => {
        const total = ingredients.length;
        const outOfStock = ingredients.filter(i => i.currentStock === 0).length;
        const lowStock = ingredients.filter(i => i.currentStock > 0 && i.currentStock <= (i.minStock || 10)).length;
        const normal = total - outOfStock - lowStock;
        const totalValue = ingredients.reduce((sum, i) => sum + (i.currentStock * i.costPerUnit), 0);

        // Category breakdown
        const categories: Record<string, { count: number; value: number }> = {};
        ingredients.forEach(i => {
            const cat = i.category || 'อื่นๆ';
            if (!categories[cat]) categories[cat] = { count: 0, value: 0 };
            categories[cat].count++;
            categories[cat].value += i.currentStock * i.costPerUnit;
        });

        // Critical items (out of stock or very low)
        const criticalItems = ingredients
            .filter(i => i.currentStock <= (i.minStock || 10))
            .sort((a, b) => a.currentStock - b.currentStock)
            .slice(0, 5);

        return { total, outOfStock, lowStock, normal, totalValue, categories, criticalItems };
    }, [ingredients]);

    const STAT_CARDS = [
        {
            label: 'วัตถุดิบทั้งหมด',
            value: stats.total,
            suffix: 'รายการ',
            icon: <Package size={20} />,
            gradient: 'from-blue-500 to-indigo-600',
            shadow: 'shadow-blue-200',
        },
        {
            label: 'มูลค่าสต็อกรวม',
            value: formatCurrency(stats.totalValue),
            suffix: '',
            icon: <DollarSign size={20} />,
            gradient: 'from-emerald-500 to-green-600',
            shadow: 'shadow-emerald-200',
        },
        {
            label: 'ใกล้หมด',
            value: stats.lowStock,
            suffix: 'รายการ',
            icon: <AlertTriangle size={20} />,
            gradient: 'from-amber-500 to-orange-500',
            shadow: 'shadow-amber-200',
        },
        {
            label: 'หมดสต็อก',
            value: stats.outOfStock,
            suffix: 'รายการ',
            icon: <AlertTriangle size={20} />,
            gradient: 'from-red-500 to-rose-600',
            shadow: 'shadow-red-200',
        },
    ];

    return (
        <div className="space-y-6">
            {/* Stat Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {STAT_CARDS.map((card, i) => (
                    <div
                        key={i}
                        className={`bg-gradient-to-br ${card.gradient} rounded-2xl p-4 text-white shadow-lg ${card.shadow} transition-transform hover:scale-[1.02]`}
                    >
                        <div className="flex items-center justify-between mb-3">
                            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                                {card.icon}
                            </div>
                        </div>
                        <p className="text-2xl font-black">
                            {card.value}
                            {card.suffix && <span className="text-sm font-medium opacity-80 ml-1">{card.suffix}</span>}
                        </p>
                        <p className="text-xs opacity-80 mt-0.5">{card.label}</p>
                    </div>
                ))}
            </div>

            {/* Critical Alerts */}
            {stats.criticalItems.length > 0 && (
                <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden">
                    <div className="px-5 py-3 bg-gradient-to-r from-red-500 to-amber-500 text-white flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <AlertTriangle size={18} />
                            <span className="font-bold text-sm">⚠️ ต้องสั่งซื้อ</span>
                        </div>
                        <button
                            onClick={onNavigateToOrders}
                            className="text-xs bg-white/20 px-3 py-1 rounded-full hover:bg-white/30 transition-colors flex items-center gap-1"
                        >
                            สั่งซื้อ <ArrowRight size={12} />
                        </button>
                    </div>
                    <div className="divide-y divide-stone-100">
                        {stats.criticalItems.map(item => {
                            const percent = Math.min((item.currentStock / (item.minStock || 10)) * 100, 100);
                            const isCritical = item.currentStock === 0;
                            return (
                                <div
                                    key={item.id}
                                    className={`flex items-center gap-4 px-5 py-3 hover:bg-stone-50 transition-colors cursor-pointer ${isCritical ? 'bg-red-50/50' : ''}`}
                                    onClick={onNavigateToIngredients}
                                >
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold text-stone-800 text-sm truncate">{item.name}</span>
                                            {isCritical && (
                                                <span className="text-[9px] bg-red-500 text-white px-1.5 py-0.5 rounded-full font-bold animate-pulse">หมด!</span>
                                            )}
                                        </div>
                                        <div className="w-full h-1.5 bg-stone-200 rounded-full mt-1.5 overflow-hidden">
                                            <div
                                                className={`h-full rounded-full ${isCritical ? 'bg-red-500' : 'bg-amber-500'}`}
                                                style={{ width: `${Math.max(percent, 3)}%` }}
                                            />
                                        </div>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <p className={`text-sm font-bold ${isCritical ? 'text-red-600' : 'text-amber-600'}`}>
                                            {item.currentStock} {item.unit}
                                        </p>
                                        <p className="text-[10px] text-stone-400">ขั้นต่ำ {item.minStock || 10}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Category breakdown */}
            {Object.keys(stats.categories).length > 0 && (
                <div className="bg-white border border-stone-200 rounded-2xl p-5">
                    <div className="flex items-center gap-2 mb-4">
                        <BarChart3 size={18} className="text-stone-600" />
                        <h3 className="font-bold text-stone-800 text-sm">สัดส่วนตามหมวดหมู่</h3>
                    </div>
                    <div className="space-y-3">
                        {Object.entries(stats.categories)
                            .sort((a, b) => b[1].value - a[1].value)
                            .map(([cat, data]) => {
                                const percent = stats.totalValue > 0 ? (data.value / stats.totalValue) * 100 : 0;
                                return (
                                    <div key={cat} className="flex items-center gap-3">
                                        <span className="w-20 text-xs text-stone-600 font-medium truncate">{cat}</span>
                                        <div className="flex-1 h-3 bg-stone-100 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full transition-all duration-500"
                                                style={{ width: `${Math.max(percent, 1)}%` }}
                                            />
                                        </div>
                                        <span className="text-xs text-stone-500 w-16 text-right">{formatCurrency(data.value)}</span>
                                        <span className="text-[10px] text-stone-400 w-8 text-right">{data.count}</span>
                                    </div>
                                );
                            })
                        }
                    </div>
                </div>
            )}
        </div>
    );
};

export default InventoryDashboard;
