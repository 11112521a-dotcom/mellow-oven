import React from 'react';
import { Ingredient } from '@/types';
import { AlertTriangle, Edit2, Package, TrendingDown } from 'lucide-react';
import { formatCurrency } from '@/src/lib/utils';

// Category icon/color mapping
const CATEGORY_STYLES: Record<string, { color: string; bg: string; border: string }> = {
    'แป้ง': { color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' },
    'น้ำตาล': { color: 'text-pink-700', bg: 'bg-pink-50', border: 'border-pink-200' },
    'นม': { color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200' },
    'ผลไม้': { color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-200' },
    'เครื่องปรุง': { color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200' },
    'บรรจุภัณฑ์': { color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-200' },
    'อื่นๆ': { color: 'text-stone-700', bg: 'bg-stone-50', border: 'border-stone-200' },
};

function getCategoryStyle(category?: string) {
    return CATEGORY_STYLES[category || 'อื่นๆ'] || CATEGORY_STYLES['อื่นๆ'];
}

interface IngredientCardProps {
    ingredient: Ingredient;
    onAdjustStock: (ing: Ingredient) => void;
    onEdit: (ing: Ingredient) => void;
    onDelete: (ing: Ingredient) => void;
}

export const IngredientCard: React.FC<IngredientCardProps> = ({
    ingredient,
    onAdjustStock,
    onEdit,
    onDelete,
}) => {
    const ing = ingredient;
    const minStock = ing.minStock || 10;
    const stockPercent = Math.min((ing.currentStock / minStock) * 100, 100);
    const isCritical = ing.currentStock === 0;
    const isLow = ing.currentStock <= minStock && !isCritical;
    const isNormal = !isCritical && !isLow;
    const catStyle = getCategoryStyle(ing.category);

    // Gauge color
    const gaugeColor = isCritical
        ? 'bg-gradient-to-r from-red-500 to-red-400'
        : isLow
            ? 'bg-gradient-to-r from-amber-500 to-yellow-400'
            : 'bg-gradient-to-r from-emerald-500 to-green-400';

    const cardBorder = isCritical
        ? 'border-red-300 shadow-red-100'
        : isLow
            ? 'border-amber-200 shadow-amber-50'
            : 'border-stone-200/80 hover:border-stone-300';

    return (
        <div
            className={`group relative bg-white rounded-2xl border-2 ${cardBorder} shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden`}
        >
            {/* Critical / Low badge */}
            {isCritical && (
                <div className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl animate-pulse z-10">
                    หมด!
                </div>
            )}
            {isLow && !isCritical && (
                <div className="absolute top-0 right-0 bg-amber-500 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl z-10">
                    ใกล้หมด
                </div>
            )}

            {/* Main content */}
            <div className="p-4">
                {/* Header row */}
                <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                        <h4 className="font-bold text-stone-800 text-base truncate">{ing.name}</h4>
                        <div className="flex items-center gap-2 mt-1">
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${catStyle.bg} ${catStyle.color} ${catStyle.border} border`}>
                                {ing.category || 'อื่นๆ'}
                            </span>
                            {ing.supplier && (
                                <span className="text-[10px] text-stone-400 truncate">
                                    {ing.supplier}
                                </span>
                            )}
                        </div>
                    </div>
                    {/* Edit button */}
                    <button
                        onClick={() => onEdit(ing)}
                        className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                    >
                        <Edit2 size={16} />
                    </button>
                </div>

                {/* Stock display */}
                <div
                    className="bg-stone-50 rounded-xl p-3 cursor-pointer hover:bg-stone-100 active:scale-[0.98] transition-all"
                    onClick={() => onAdjustStock(ing)}
                >
                    <div className="flex items-end justify-between mb-2">
                        <div className="flex items-baseline gap-1.5">
                            <span className={`text-3xl font-black tracking-tight ${isCritical ? 'text-red-600' : isLow ? 'text-amber-600' : 'text-stone-800'
                                }`}>
                                {ing.currentStock % 1 === 0 ? ing.currentStock : ing.currentStock.toFixed(1)}
                            </span>
                            <span className="text-sm text-stone-400 font-medium">{ing.unit}</span>
                        </div>
                        {!isNormal && (
                            <div className={`flex items-center gap-1 text-xs font-medium ${isCritical ? 'text-red-500' : 'text-amber-500'}`}>
                                {isCritical ? <AlertTriangle size={12} /> : <TrendingDown size={12} />}
                                ต่ำกว่า {minStock}
                            </div>
                        )}
                    </div>

                    {/* Stock gauge bar */}
                    <div className="w-full h-2 bg-stone-200 rounded-full overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all duration-500 ${gaugeColor}`}
                            style={{ width: `${Math.max(stockPercent, 2)}%` }}
                        />
                    </div>
                </div>

                {/* Footer: cost + unit info */}
                <div className="flex items-center justify-between mt-3 text-xs text-stone-500">
                    <span>ต้นทุน <strong className="text-stone-700">{formatCurrency(ing.costPerUnit)}</strong>/{ing.unit}</span>
                    {ing.buyUnit && (
                        <span className="text-stone-400">
                            ซื้อเป็น {ing.buyUnit} ({ing.conversionRate} {ing.unit})
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
};

export default IngredientCard;
