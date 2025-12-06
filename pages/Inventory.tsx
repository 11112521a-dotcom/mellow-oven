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
            {/* Premium Header - Visual Hierarchy Improvement */}
            <header className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-cafe-800 via-cafe-700 to-cafe-900 p-8 text-white shadow-xl">
                {/* Decorative elements */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

                <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-white/10 backdrop-blur rounded-2xl flex items-center justify-center">
                            <Package size={32} />
                        </div>
                        <div>
                            <h1 className="text-3xl font-extrabold flex items-center gap-2">
                                จัดการสต็อก & จัดซื้อ
                                <Sparkles className="text-yellow-300" size={24} />
                            </h1>
                            <p className="text-cafe-200">Inventory & Purchasing Management</p>
                        </div>
                    </div>

                    {/* Quick Stats */}
                    <div className="flex gap-4">
                        <div className="bg-white/10 backdrop-blur rounded-xl px-5 py-3 text-center min-w-[100px]">
                            <div className="text-2xl font-bold">{totalItems}</div>
                            <div className="text-xs text-cafe-200">รายการทั้งหมด</div>
                        </div>
                        {lowStockCount > 0 && (
                            <div className="bg-amber-500/80 backdrop-blur rounded-xl px-5 py-3 text-center min-w-[100px] animate-pulse">
                                <div className="flex items-center justify-center gap-1 text-2xl font-bold">
                                    <AlertTriangle size={18} />
                                    {lowStockCount}
                                </div>
                                <div className="text-xs text-amber-100">ใกล้หมด</div>
                            </div>
                        )}
                        {outOfStockCount > 0 && (
                            <div className="bg-red-500/90 backdrop-blur rounded-xl px-5 py-3 text-center min-w-[100px] animate-pulse ring-2 ring-red-300">
                                <div className="flex items-center justify-center gap-1 text-2xl font-bold">
                                    <AlertTriangle size={18} />
                                    {outOfStockCount}
                                </div>
                                <div className="text-xs text-red-100">ของหมด!</div>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Stock List - Now with distinct Card styling */}
                <div className="lg:col-span-2">
                    <div className="bg-white rounded-2xl shadow-lg border border-cafe-100/50 overflow-hidden">
                        <InventoryList />
                    </div>
                </div>

                {/* Right Column: Purchase Order - Distinct Card with enhanced visibility */}
                <div className="lg:col-span-1">
                    <div className="sticky top-8 space-y-6">
                        {/* Purchase Order Card with Header */}
                        <div className="bg-gradient-to-b from-white to-cafe-50/50 rounded-2xl shadow-lg border border-cafe-100/50 overflow-hidden">
                            <div className="bg-gradient-to-r from-cafe-600 to-cafe-700 p-4 text-white">
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

            {/* Purchase Order History - With Card wrapper */}
            <div className="bg-white rounded-2xl shadow-lg border border-cafe-100/50 overflow-hidden">
                <PurchaseOrderHistory />
            </div>
        </div>
    );
};

export default Inventory;
