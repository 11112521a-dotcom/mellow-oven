import React from 'react';
import { InventoryList } from '@/src/components/Inventory/InventoryList';
import { PurchaseOrderForm } from '@/src/components/Inventory/PurchaseOrder';
import { PurchaseOrderHistory } from '@/src/components/Inventory/PurchaseOrderHistory';
import { Package, AlertTriangle, TrendingUp, Sparkles } from 'lucide-react';
import { useStore } from '@/src/store';

const Inventory: React.FC = () => {
    const { ingredients } = useStore();

    // Calculate key stats for header
    const totalItems = ingredients.length;
    const lowStockCount = ingredients.filter(i => i.currentStock <= (i.minStock || 10)).length;
    const outOfStockCount = ingredients.filter(i => i.currentStock === 0).length;

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* ═══════════════════════════════════════════════════════════
                📦 WARM CAFE HEADER - Inventory Overview
               ═══════════════════════════════════════════════════════════ */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 border border-amber-100 p-6 sm:p-8">
                {/* Decorative elements */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-amber-200/30 to-transparent rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-orange-200/20 to-transparent rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl" />

                <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                    {/* Title */}
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-200/50">
                            <Package size={28} className="text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-bold text-stone-800 flex items-center gap-2">
                                จัดการสต็อก & จัดซื้อ
                                <Sparkles className="text-amber-500" size={20} />
                            </h1>
                            <p className="text-stone-500 text-sm">Inventory & Purchasing Management</p>
                        </div>
                    </div>

                    {/* Quick Stats */}
                    <div className="flex gap-3">
                        <div className="bg-white/80 backdrop-blur-sm rounded-2xl px-5 py-3 text-center border border-amber-100 shadow-sm">
                            <div className="text-2xl font-bold text-stone-800">{totalItems}</div>
                            <div className="text-xs text-stone-500">รายการทั้งหมด</div>
                        </div>
                        {lowStockCount > 0 && (
                            <div className="bg-amber-100 rounded-2xl px-5 py-3 text-center border border-amber-200">
                                <div className="flex items-center justify-center gap-1 text-2xl font-bold text-amber-700">
                                    <AlertTriangle size={18} />
                                    {lowStockCount}
                                </div>
                                <div className="text-xs text-amber-600">ใกล้หมด</div>
                            </div>
                        )}
                        {outOfStockCount > 0 && (
                            <div className="bg-rose-100 rounded-2xl px-5 py-3 text-center border border-rose-200 ring-2 ring-rose-300">
                                <div className="flex items-center justify-center gap-1 text-2xl font-bold text-rose-700">
                                    <AlertTriangle size={18} />
                                    {outOfStockCount}
                                </div>
                                <div className="text-xs text-rose-600">ของหมด!</div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Stock List */}
                <div className="lg:col-span-2">
                    <div className="bg-white rounded-2xl shadow-sm border border-stone-100 overflow-hidden">
                        <InventoryList />
                    </div>
                </div>

                {/* Right Column: Purchase Order */}
                <div className="lg:col-span-1">
                    <div className="sticky top-8 space-y-6">
                        {/* Purchase Order Card with Header */}
                        <div className="bg-white rounded-2xl shadow-sm border border-stone-100 overflow-hidden">
                            <div className="bg-gradient-to-r from-amber-400 to-orange-500 p-4 text-white">
                                <h3 className="font-bold flex items-center gap-2">
                                    <TrendingUp size={18} />
                                    สร้างใบสั่งซื้อ (Purchase Order)
                                </h3>
                            </div>
                            <PurchaseOrderForm />
                        </div>
                    </div>
                </div>
            </div>

            {/* Purchase Order History */}
            <div className="bg-white rounded-2xl shadow-sm border border-stone-100 overflow-hidden">
                <PurchaseOrderHistory />
            </div>
        </div>
    );
};

export default Inventory;
