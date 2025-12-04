import React, { useState } from 'react';
import { useStore } from '@/src/store';
import { formatCurrency } from '@/src/lib/utils';
import { X, CheckCircle, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';

export const PurchaseOrderHistory: React.FC = () => {
    const { purchaseOrders, cancelPurchaseOrder, ingredients } = useStore();
    const [expandedPO, setExpandedPO] = useState<string | null>(null);

    const handleCancelPO = async (poId: string, totalCost: number) => {
        if (!confirm(`ยกเลิก PO นี้?\n\nจะคืนเงิน ${formatCurrency(totalCost)} กลับ Working Capital และลดสต็อกที่เพิ่มไว้`)) {
            return;
        }

        await cancelPurchaseOrder(poId);
        alert('✅ ยกเลิก PO สำเร็จ!\n\n💰 คืนเงินเข้า Working Capital\n📦 ลดสต็อกกลับแล้ว');
    };

    const getIngredientName = (id: string) => {
        return ingredients.find(i => i.id === id)?.name || 'Unknown';
    };

    // Sort by date, newest first
    const sortedPOs = [...purchaseOrders].sort((a, b) =>
        new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    if (purchaseOrders.length === 0) {
        return (
            <div className="bg-white rounded-2xl shadow-sm border border-cafe-100 p-8 text-center">
                <div className="text-4xl mb-3">📦</div>
                <p className="text-cafe-500">ยังไม่มีประวัติการสั่งซื้อ</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-cafe-100 overflow-hidden">
            <div className="p-5 bg-cafe-50 border-b border-cafe-100">
                <h3 className="text-lg font-bold text-cafe-900">ประวัติการสั่งซื้อ</h3>
                <p className="text-sm text-cafe-500 mt-1">{purchaseOrders.length} รายการ</p>
            </div>

            <div className="divide-y divide-cafe-100">
                {sortedPOs.map((po) => {
                    const isExpanded = expandedPO === po.id;
                    const isCancelled = po.status === 'CANCELLED';

                    return (
                        <div key={po.id} className={`p-4 ${isCancelled ? 'bg-gray-50' : 'hover:bg-cafe-50/50'} transition-colors`}>
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        {isCancelled ? (
                                            <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold flex items-center gap-1">
                                                <X size={14} />
                                                ยกเลิกแล้ว
                                            </span>
                                        ) : (
                                            <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold flex items-center gap-1">
                                                <CheckCircle size={14} />
                                                สำเร็จ
                                            </span>
                                        )}
                                        <span className="text-xs text-cafe-500">
                                            {new Date(po.date).toLocaleDateString('th-TH', {
                                                day: 'numeric',
                                                month: 'short',
                                                year: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </span>
                                    </div>

                                    <div className="flex items-baseline gap-3">
                                        <p className="text-sm text-cafe-600">
                                            <span className="font-semibold">Supplier:</span> {po.supplier}
                                        </p>
                                        <p className="text-sm text-cafe-600">
                                            <span className="font-semibold">{po.items.length}</span> รายการ
                                        </p>
                                    </div>

                                    <p className={`text-lg font-bold mt-1 ${isCancelled ? 'text-gray-400 line-through' : 'text-cafe-900'}`}>
                                        {formatCurrency(po.totalCost)}
                                    </p>

                                    {/* Expanded Items */}
                                    {isExpanded && (
                                        <div className="mt-3 p-3 bg-cafe-25 rounded-lg">
                                            <p className="text-xs font-semibold text-cafe-600 mb-2">รายการสินค้า:</p>
                                            <div className="space-y-1">
                                                {po.items.map((item, idx) => (
                                                    <div key={idx} className="flex justify-between text-sm">
                                                        <span className="text-cafe-700">{getIngredientName(item.ingredientId)}</span>
                                                        <span className="font-semibold text-cafe-900">
                                                            {item.quantity} × {formatCurrency(item.cost / item.quantity)} = {formatCurrency(item.cost)}
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="flex flex-col items-end gap-2">
                                    <button
                                        onClick={() => setExpandedPO(isExpanded ? null : po.id)}
                                        className="p-1.5 hover:bg-cafe-100 rounded-lg transition-colors"
                                    >
                                        {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                    </button>

                                    {!isCancelled && (
                                        <button
                                            onClick={() => handleCancelPO(po.id, po.totalCost)}
                                            className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-semibold hover:bg-red-100 transition-colors flex items-center gap-1"
                                        >
                                            <X size={14} />
                                            ยกเลิก
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Summary */}
            <div className="p-4 bg-cafe-50 border-t border-cafe-100">
                <div className="flex justify-between text-sm">
                    <span className="text-cafe-600">ยอดรวมทั้งหมด:</span>
                    <span className="font-bold text-cafe-900">
                        {formatCurrency(
                            purchaseOrders
                                .filter(po => po.status !== 'CANCELLED')
                                .reduce((sum, po) => sum + po.totalCost, 0)
                        )}
                    </span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                    <span className="text-cafe-600">ยกเลิก:</span>
                    <span className="font-semibold text-red-600">
                        {formatCurrency(
                            purchaseOrders
                                .filter(po => po.status === 'CANCELLED')
                                .reduce((sum, po) => sum + po.totalCost, 0)
                        )}
                    </span>
                </div>
            </div>
        </div>
    );
};
