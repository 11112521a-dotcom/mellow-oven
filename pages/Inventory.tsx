// ============================================================
// 📦 Inventory & Stock Management Page — Premium Redesign
// ============================================================

import React, { useState, useCallback } from 'react';
import { IngredientListView } from '@/src/components/Inventory/IngredientListView';
import { InventoryDashboard } from '@/src/components/Inventory/InventoryDashboard';
import { PurchaseOrderForm } from '@/src/components/Inventory/PurchaseOrder';
import { PurchaseOrderHistory } from '@/src/components/Inventory/PurchaseOrderHistory';
import { BulkStockAdjustmentModal, StockMovementHistory } from '@/src/components/Stock';
import {
    BarChart3, Box, FileText, History, TrendingUp,
    ClipboardList, Layers, Clock, Download
} from 'lucide-react';

// ============================================================
// Types
// ============================================================
type TabId = 'dashboard' | 'ingredients' | 'orders' | 'history';

interface TabConfig {
    id: TabId;
    label: string;
    icon: React.ReactNode;
}

// ============================================================
// Main Component
// ============================================================
const Inventory: React.FC = () => {
    const [activeTab, setActiveTab] = useState<TabId>('dashboard');
    const [isBulkAdjustOpen, setIsBulkAdjustOpen] = useState(false);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);

    // Tab configuration
    const tabs: TabConfig[] = [
        { id: 'dashboard', label: 'ภาพรวม', icon: <BarChart3 size={18} /> },
        { id: 'ingredients', label: 'วัตถุดิบ', icon: <Box size={18} /> },
        { id: 'orders', label: 'สั่งซื้อ', icon: <FileText size={18} /> },
        { id: 'history', label: 'ประวัติ', icon: <History size={18} /> },
    ];

    return (
        <div className="space-y-6">
            {/* Premium Tab Bar */}
            <div className="bg-white rounded-2xl shadow-sm border border-stone-100 overflow-hidden">
                <div className="flex border-b border-stone-200 bg-stone-50 overflow-x-auto">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`
                                flex items-center gap-2 px-5 py-4 font-medium text-sm whitespace-nowrap
                                border-b-2 transition-all min-h-[52px] -mb-[2px] relative
                                ${activeTab === tab.id
                                    ? 'border-amber-500 text-amber-700 bg-white'
                                    : 'border-transparent text-stone-500 hover:text-stone-700 hover:bg-white/50'}
                            `}
                            role="tab"
                            aria-selected={activeTab === tab.id}
                        >
                            {tab.icon}
                            <span className="hidden sm:inline">{tab.label}</span>
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                <div className="p-5">
                    {/* Dashboard Tab */}
                    {activeTab === 'dashboard' && (
                        <InventoryDashboard
                            onNavigateToIngredients={() => setActiveTab('ingredients')}
                            onNavigateToOrders={() => setActiveTab('orders')}
                        />
                    )}

                    {/* Ingredients Tab */}
                    {activeTab === 'ingredients' && (
                        <IngredientListView />
                    )}

                    {/* Orders Tab */}
                    {activeTab === 'orders' && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-1">
                                <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-4 rounded-t-2xl text-white">
                                    <h3 className="font-bold flex items-center gap-2">
                                        <TrendingUp size={18} />
                                        สร้างใบสั่งซื้อ
                                    </h3>
                                </div>
                                <div className="bg-white border border-t-0 border-stone-200 rounded-b-2xl">
                                    <PurchaseOrderForm />
                                </div>
                            </div>
                            <div className="lg:col-span-2">
                                <div className="bg-white border border-stone-200 rounded-2xl overflow-hidden">
                                    <div className="p-4 border-b border-stone-100 bg-stone-50">
                                        <h3 className="font-bold text-stone-800 flex items-center gap-2">
                                            <ClipboardList size={18} className="text-amber-600" />
                                            ประวัติใบสั่งซื้อ
                                        </h3>
                                    </div>
                                    <PurchaseOrderHistory />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* History Tab */}
                    {activeTab === 'history' && (
                        <div className="space-y-6">
                            {/* Quick actions */}
                            <div className="flex flex-wrap gap-3">
                                <button
                                    onClick={() => setIsHistoryOpen(true)}
                                    className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold rounded-xl shadow-md shadow-indigo-200 hover:shadow-lg transition-all text-sm"
                                >
                                    <Clock size={18} /> ดูประวัติการเคลื่อนไหว
                                </button>
                                <button
                                    onClick={() => setIsBulkAdjustOpen(true)}
                                    className="flex items-center gap-2 px-5 py-3 bg-stone-800 text-white font-semibold rounded-xl hover:bg-stone-700 transition-colors text-sm"
                                >
                                    <Layers size={16} /> ปรับยอดรวม (Bulk)
                                </button>
                            </div>

                            {/* Info card */}
                            <div className="bg-gradient-to-br from-stone-50 to-amber-50 border border-stone-200 rounded-2xl p-8 text-center">
                                <History size={48} className="mx-auto text-stone-300 mb-4" />
                                <h3 className="text-lg font-bold text-stone-700 mb-2">ประวัติสต็อก & การปรับยอด</h3>
                                <p className="text-sm text-stone-500 max-w-md mx-auto">
                                    ดูประวัติการรับของเข้า, การใช้งาน, ของเสีย และการแก้ไขยอดสต็อกทั้งหมด
                                    พร้อม Export เป็น CSV
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Modals */}
            <BulkStockAdjustmentModal
                isOpen={isBulkAdjustOpen}
                onClose={() => setIsBulkAdjustOpen(false)}
            />
            <StockMovementHistory
                isOpen={isHistoryOpen}
                onClose={() => setIsHistoryOpen(false)}
            />
        </div>
    );
};

export default Inventory;
