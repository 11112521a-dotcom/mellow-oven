import React, { useMemo, useState } from 'react';
import { useStore } from '../../store';
import { Package, Store, Clock, ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react';
import { formatCurrency } from '@/src/lib/utils';

interface ConsignmentPendingStockProps {
    onOpenNextDayBill?: (shopId: string, items: any[]) => void;
}

export const ConsignmentPendingStock: React.FC<ConsignmentPendingStockProps> = ({ onOpenNextDayBill }) => {
    const { consignmentOrders, externalShops } = useStore();
    const [viewMode, setViewMode] = useState<'shops' | 'products'>('shops');

    // Group pending & carry-over stock by Shop
    const shopCardsData = useMemo(() => {
        const shopMap: Record<string, {
            shopId: string;
            shopName: string;
            contactPhone?: string;
            totalQty: number;
            totalValue: number;
            lastOrderDate?: string;
            items: {
                productId: string;
                variantId?: string;
                productName: string;
                variantName?: string;
                qty: number;
                unitPrice: number;
                unitCost: number;
                orderNumber: string;
            }[];
        }> = {};

        consignmentOrders.forEach(order => {
            if (order.status === 'cancelled') return;

            order.items.forEach(item => {
                let pendingQty = 0;
                if (order.status === 'pending' || order.status === 'shipped') {
                    pendingQty = item.quantitySent;
                } else if (order.status === 'settled' && item.quantityCarryOver && item.quantityCarryOver > 0) {
                    pendingQty = item.quantityCarryOver;
                }

                if (pendingQty > 0) {
                    if (!shopMap[order.shopId]) {
                        const shopInfo = externalShops.find(s => s.id === order.shopId);
                        shopMap[order.shopId] = {
                            shopId: order.shopId,
                            shopName: order.shopName,
                            contactPhone: shopInfo?.contactPhone || order.contactPhone || undefined,
                            totalQty: 0,
                            totalValue: 0,
                            lastOrderDate: order.deliveryDate,
                            items: []
                        };
                    }

                    shopMap[order.shopId].totalQty += pendingQty;
                    shopMap[order.shopId].totalValue += pendingQty * item.unitPrice;

                    // Check if product+variant already in shop items list
                    const existingItem = shopMap[order.shopId].items.find(
                        i => i.productId === item.productId && i.variantId === (item.variantId || undefined)
                    );

                    if (existingItem) {
                        existingItem.qty += pendingQty;
                    } else {
                        shopMap[order.shopId].items.push({
                            productId: item.productId,
                            variantId: item.variantId || undefined,
                            productName: item.productName,
                            variantName: item.variantName || undefined,
                            qty: pendingQty,
                            unitPrice: item.unitPrice,
                            unitCost: item.unitCost,
                            orderNumber: order.orderNumber
                        });
                    }
                }
            });
        });

        return Object.values(shopMap).sort((a, b) => b.totalQty - a.totalQty);
    }, [consignmentOrders, externalShops]);

    // Group pending stock by Product
    const productData = useMemo(() => {
        const productMap: Record<string, {
            productId: string;
            productName: string;
            variantId?: string;
            variantName?: string;
            totalPendingQty: number;
            totalValue: number;
            shops: { shopName: string; qty: number; orderNumber: string }[];
        }> = {};

        consignmentOrders.forEach(order => {
            if (order.status === 'cancelled') return;

            order.items.forEach(item => {
                let pendingQty = 0;
                if (order.status === 'pending' || order.status === 'shipped') {
                    pendingQty = item.quantitySent;
                } else if (order.status === 'settled' && item.quantityCarryOver && item.quantityCarryOver > 0) {
                    pendingQty = item.quantityCarryOver;
                }

                if (pendingQty > 0) {
                    const key = item.variantId ? `${item.productId}-${item.variantId}` : item.productId;
                    if (!productMap[key]) {
                        productMap[key] = {
                            productId: item.productId,
                            productName: item.productName,
                            variantId: item.variantId || undefined,
                            variantName: item.variantName || undefined,
                            totalPendingQty: 0,
                            totalValue: 0,
                            shops: []
                        };
                    }

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

    const totalPendingItems = shopCardsData.reduce((sum, shop) => sum + shop.totalQty, 0);
    const totalPendingValue = shopCardsData.reduce((sum, shop) => sum + shop.totalValue, 0);

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Header Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5 flex items-center gap-4">
                    <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center text-amber-600 shrink-0">
                        <Package size={24} />
                    </div>
                    <div>
                        <p className="text-amber-600/80 text-sm font-medium">สินค้าฝากขายคงค้างรวม</p>
                        <h3 className="text-2xl font-bold text-amber-700">{totalPendingItems} <span className="text-sm font-normal">ชิ้น</span></h3>
                    </div>
                </div>
                <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5 flex items-center gap-4">
                    <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 shrink-0">
                        <Clock size={24} />
                    </div>
                    <div>
                        <p className="text-emerald-600/80 text-sm font-medium">มูลค่ารอเรียกเก็บรวม (Revenue In-transit)</p>
                        <h3 className="text-2xl font-bold text-emerald-700">{formatCurrency(totalPendingValue)}</h3>
                    </div>
                </div>
            </div>

            {/* View Mode Switcher */}
            <div className="flex justify-between items-center bg-white p-2 rounded-2xl border border-stone-200 shadow-sm">
                <div className="flex gap-2">
                    <button
                        onClick={() => setViewMode('shops')}
                        className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all ${
                            viewMode === 'shops'
                                ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                                : 'text-stone-600 hover:bg-stone-100'
                        }`}
                    >
                        <Store size={16} />
                        รายสาขา ({shopCardsData.length})
                    </button>
                    <button
                        onClick={() => setViewMode('products')}
                        className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all ${
                            viewMode === 'products'
                                ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                                : 'text-stone-600 hover:bg-stone-100'
                        }`}
                    >
                        <Package size={16} />
                        รายเมนู ({productData.length})
                    </button>
                </div>
            </div>

            {/* View Mode: Shops Cards */}
            {viewMode === 'shops' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {shopCardsData.length === 0 ? (
                        <div className="col-span-full bg-white p-12 text-center rounded-2xl border border-stone-200 text-stone-500">
                            <Store className="w-12 h-12 mx-auto text-stone-300 mb-3" />
                            <p className="font-bold text-base">ไม่มีสต็อกสินค้าคงค้างตามสาขา</p>
                        </div>
                    ) : (
                        shopCardsData.map(shop => (
                            <div key={shop.shopId} className="bg-white border border-stone-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between space-y-4">
                                <div>
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-emerald-100 text-emerald-700 rounded-xl flex items-center justify-center font-bold">
                                                <Store size={20} />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-stone-850 text-base sm:text-lg">{shop.shopName}</h4>
                                                {shop.contactPhone && <p className="text-xs text-stone-400 font-medium">โทร: {shop.contactPhone}</p>}
                                            </div>
                                        </div>
                                        <div className="text-right bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-xl">
                                            <p className="text-[10px] uppercase font-bold text-emerald-600">ค้างรวม</p>
                                            <p className="text-lg font-black text-emerald-700">{shop.totalQty} <span className="text-xs font-semibold">ชิ้น</span></p>
                                        </div>
                                    </div>

                                    {/* Items List in Shop */}
                                    <div className="space-y-2 border-t border-stone-100 pt-3">
                                        <p className="text-xs font-bold text-stone-450 uppercase mb-2">รายการขนมคงค้างที่สาขา:</p>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            {shop.items.map((item, idx) => (
                                                <div key={idx} className="bg-stone-50 p-2.5 rounded-xl border border-stone-150 flex justify-between items-center text-xs">
                                                    <div>
                                                        <span className="font-bold text-stone-800">{item.productName}</span>
                                                        {item.variantName && <span className="text-stone-400 block text-[10px]">({item.variantName})</span>}
                                                    </div>
                                                    <span className="bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-lg text-xs">
                                                        {item.qty} ชิ้น
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Open Next-day Bill Action Button */}
                                {onOpenNextDayBill && (
                                    <button
                                        type="button"
                                        onClick={() => onOpenNextDayBill(shop.shopId, shop.items)}
                                        className="w-full py-3 px-4 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white rounded-xl font-bold transition-all shadow-md shadow-emerald-500/20 hover:-translate-y-0.5 flex items-center justify-center gap-2 min-h-[44px] text-sm"
                                    >
                                        <Sparkles size={16} />
                                        🚀 เปิดบิลวันถัดไป (เติมของ / ขายต่อ)
                                        <ArrowRight size={16} />
                                    </button>
                                )}
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* View Mode: Product Cards */}
            {viewMode === 'products' && (
                <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden shadow-sm">
                    <div className="px-6 py-4 border-b border-stone-100 bg-stone-50">
                        <h3 className="font-bold text-stone-800">รายละเอียดสต็อกคงค้างรายเมนู</h3>
                    </div>
                    
                    {productData.length === 0 ? (
                        <div className="p-8 text-center text-stone-500">
                            <Package className="w-12 h-12 mx-auto text-stone-300 mb-3" />
                            <p>ไม่มีสินค้าคงค้างตามร้านฝากขาย</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-stone-100">
                            {productData.map((item, idx) => (
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
            )}
        </div>
    );
};

