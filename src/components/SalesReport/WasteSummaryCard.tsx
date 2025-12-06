import React from 'react';
import { formatCurrency } from '@/src/lib/utils';
import { Trash2, TrendingDown, AlertTriangle } from 'lucide-react';

interface WasteSummaryProps {
    totalWasteQty: number;
    totalWasteCost: number;
    wasteByProduct: {
        productName: string;
        wasteQty: number;
        wasteCost: number;
    }[];
    totalRevenue: number;
}

export const WasteSummaryCard: React.FC<WasteSummaryProps> = ({
    totalWasteQty,
    totalWasteCost,
    wasteByProduct,
    totalRevenue
}) => {
    const wastePercentage = totalRevenue > 0 ? (totalWasteCost / totalRevenue) * 100 : 0;
    const hasSignificantWaste = totalWasteCost > 0;
    const topWasteProducts = wasteByProduct.slice(0, 3);

    return (
        <div className={`rounded-2xl overflow-hidden ${hasSignificantWaste ? 'bg-gradient-to-br from-red-50 to-orange-50 border-2 border-red-200' : 'bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200'}`}>
            {/* Header */}
            <div className={`p-4 ${hasSignificantWaste ? 'bg-gradient-to-r from-red-500 to-orange-500' : 'bg-gradient-to-r from-green-500 to-emerald-500'} text-white`}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                            {hasSignificantWaste ? <Trash2 size={24} /> : '✨'}
                        </div>
                        <div>
                            <h3 className="font-bold text-lg">
                                {hasSignificantWaste ? '🗑️ ของเสีย (Waste)' : '✅ ไม่มีของเสีย!'}
                            </h3>
                            <p className="text-white/80 text-xs">เงินที่หายไปกับสินค้าเสีย</p>
                        </div>
                    </div>
                    {hasSignificantWaste && wastePercentage > 5 && (
                        <div className="bg-white/20 rounded-full px-3 py-1 flex items-center gap-1">
                            <AlertTriangle size={14} />
                            <span className="text-xs font-bold">สูงผิดปกติ!</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4">
                {/* Main Stats */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white rounded-xl p-4 shadow-sm border border-red-100">
                        <p className="text-xs text-cafe-500 mb-1">💸 มูลค่าความเสียหาย</p>
                        <p className={`text-2xl font-black ${hasSignificantWaste ? 'text-red-600' : 'text-green-600'}`}>
                            {hasSignificantWaste ? `-${formatCurrency(totalWasteCost)}` : '฿0'}
                        </p>
                        <p className="text-xs text-cafe-400 mt-1">
                            = {wastePercentage.toFixed(1)}% ของรายรับ
                        </p>
                    </div>
                    <div className="bg-white rounded-xl p-4 shadow-sm border border-red-100">
                        <p className="text-xs text-cafe-500 mb-1">📦 จำนวนที่ทิ้ง</p>
                        <p className={`text-2xl font-black ${hasSignificantWaste ? 'text-orange-600' : 'text-green-600'}`}>
                            {totalWasteQty} ชิ้น
                        </p>
                        <p className="text-xs text-cafe-400 mt-1">
                            สินค้าที่ขายไม่ได้
                        </p>
                    </div>
                </div>

                {/* Top Waste Products */}
                {hasSignificantWaste && topWasteProducts.length > 0 && (
                    <div className="space-y-2">
                        <p className="text-sm font-medium text-cafe-700 flex items-center gap-2">
                            <TrendingDown size={16} className="text-red-500" />
                            สินค้าที่มี Waste มากที่สุด
                        </p>
                        <div className="space-y-2">
                            {topWasteProducts.map((product, index) => (
                                <div key={index} className="flex items-center justify-between bg-white rounded-lg p-3 border border-red-100">
                                    <div className="flex items-center gap-2">
                                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${index === 0 ? 'bg-red-500 text-white' : 'bg-red-100 text-red-600'}`}>
                                            {index + 1}
                                        </span>
                                        <span className="text-sm font-medium text-cafe-800">{product.productName}</span>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-sm font-bold text-red-600">-{formatCurrency(product.wasteCost)}</span>
                                        <span className="text-xs text-cafe-400 ml-2">({product.wasteQty} ชิ้น)</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Insight */}
                {hasSignificantWaste && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-sm">
                        <span className="font-bold text-yellow-700">💡 Insight: </span>
                        <span className="text-yellow-800">
                            ลองลดการผลิต{topWasteProducts[0]?.productName || 'สินค้า'}ลง 20% อาจช่วยลด Waste ได้
                        </span>
                    </div>
                )}

                {!hasSignificantWaste && (
                    <div className="bg-green-100 border border-green-200 rounded-xl p-3 text-sm text-center">
                        <span className="text-green-700 font-medium">
                            🎉 เยี่ยมมาก! ช่วงนี้ไม่มีของเสียเลย
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
};
