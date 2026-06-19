import React, { useMemo } from 'react';
import { useStore } from '../../store';
import { Package, Store, Clock } from 'lucide-react';
import { formatCurrency } from '@/src/lib/utils';

export const ConsignmentPendingStock: React.FC = () => {
    const { consignmentOrders } = useStore();

    // Calculate pending stock from orders that are 'pending' or 'shipped' (not settled or cancelled)
    const pendingData = useMemo(() => {
        const activeOrders = consignmentOrders.filter(o => o.status === 'pending' || o.status === 'shipped');
        
        // Map by product variant
        const productMap: Record<string, {
            productId: string;
            productName: string;
            variantId?: string;
            variantName?: string;
            totalPendingQty: number;
            totalValue: number;
            shops: { shopName: string; qty: number; orderNumber: string }[];
        }> = {};

        activeOrders.forEach(order => {
            order.items.forEach(item => {
                const key = item.variantId ? `${item.productId}-${item.variantId}` : item.productId;
                if (!productMap[key]) {
                    productMap[key] = {
                        productId: item.productId,
                        productName: item.productName,
                        variantId: item.variantId,
                        variantName: item.variantName,
                        totalPendingQty: 0,
                        totalValue: 0,
                        shops: []
                    };
                }
                
                const pendingQty = item.quantitySent; // It hasn't been settled, so all sent is pending
                if (pendingQty > 0) {
                    productMap[key].totalPendingQty += pendingQty;
                    productMap[key].totalValue += pendingQty * item.unitPrice;
                    productMap[key].shops.push({
                        shopName: order.shopName,
                        qty: pendingQty,
                        orderNumber: order.orderNumber
                    });
                }
            });
        });

        return Object.values(productMap).sort((a, b) => b.totalPendingQty - a.totalPendingQty);
    }, [consignmentOrders]);

    const totalPendingItems = pendingData.reduce((sum, item) => sum + item.totalPendingQty, 0);
    const totalPendingValue = pendingData.reduce((sum, item) => sum + item.totalValue, 0);

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Header Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5 flex items-center gap-4">
                    <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center text-amber-600">
                        <Package size={24} />
                    </div>
                    <div>
                        <p className="text-amber-600/80 text-sm font-medium">สินค้าฝากขายคงค้างรวม</p>
                        <h3 className="text-2xl font-bold text-amber-700">{totalPendingItems} <span className="text-sm font-normal">ชิ้น</span></h3>
                    </div>
                </div>
                <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5 flex items-center gap-4">
                    <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600">
                        <Clock size={24} />
                    </div>
                    <div>
                        <p className="text-emerald-600/80 text-sm font-medium">มูลค่ารอเรียกเก็บรวม (Revenue In-transit)</p>
                        <h3 className="text-2xl font-bold text-emerald-700">{formatCurrency(totalPendingValue)}</h3>
                    </div>
                </div>
            </div>

            {/* Product List */}
            <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="px-6 py-4 border-b border-stone-100 bg-stone-50">
                    <h3 className="font-bold text-stone-800">รายละเอียดสต็อกคงค้างรายเมนู</h3>
                </div>
                
                {pendingData.length === 0 ? (
                    <div className="p-8 text-center text-stone-500">
                        <Package className="w-12 h-12 mx-auto text-stone-300 mb-3" />
                        <p>ไม่มีสินค้าคงค้างตามร้านฝากขาย</p>
                    </div>
                ) : (
                    <div className="divide-y divide-stone-100">
                        {pendingData.map((item, idx) => (
                            <div key={idx} className="p-4 sm:p-6 hover:bg-stone-50/50 transition-colors">
                                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-3">
                                    <div>
                                        <h4 className="font-bold text-stone-800 text-lg">
                                            {item.productName}
                                            {item.variantName && <span className="text-stone-500 ml-2 text-sm font-normal">({item.variantName})</span>}
                                        </h4>
                                    </div>
                                    <div className="flex gap-4 items-center bg-stone-100 px-4 py-2 rounded-xl w-fit">
                                        <div className="text-right">
                                            <p className="text-[10px] text-stone-500 font-bold uppercase tracking-wider mb-0.5">ค้างทั้งหมด</p>
                                            <p className="font-black text-amber-600 leading-none">{item.totalPendingQty}</p>
                                        </div>
                                        <div className="w-px h-8 bg-stone-200"></div>
                                        <div className="text-right">
                                            <p className="text-[10px] text-stone-500 font-bold uppercase tracking-wider mb-0.5">มูลค่า</p>
                                            <p className="font-black text-emerald-600 leading-none">{formatCurrency(item.totalValue)}</p>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="pl-4 sm:pl-0">
                                    <p className="text-xs text-stone-500 mb-2 flex items-center gap-1"><Store size={12}/> กระจายอยู่ตามสาขา:</p>
                                    <div className="flex flex-wrap gap-2">
                                        {item.shops.map((shop, sIdx) => (
                                            <div key={sIdx} className="bg-white border border-stone-200 shadow-sm rounded-lg px-3 py-1.5 flex items-center gap-2 text-sm">
                                                <span className="font-medium text-stone-700">{shop.shopName}</span>
                                                <span className="bg-amber-100 text-amber-700 font-bold px-1.5 py-0.5 rounded text-xs">{shop.qty} ชิ้น</span>
                                                <span className="text-stone-400 text-xs ml-1">#{shop.orderNumber}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
