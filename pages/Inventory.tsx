// ============================================================
// 📦 Inventory & Stock Management Page
// 🛡️ Phase 3: Added StockMovementHistory Modal
// ============================================================

import React, { useState, useCallback } from 'react';
import { InventoryList } from '@/src/components/Inventory/InventoryList';
import { PurchaseOrderForm } from '@/src/components/Inventory/PurchaseOrder';
import { PurchaseOrderHistory } from '@/src/components/Inventory/PurchaseOrderHistory';
import { StockDashboard, BulkStockAdjustmentModal, StockMovementHistory } from '@/src/components/Stock';
import { Box, FileText, History, TrendingUp } from 'lucide-react';

// ============================================================
// Types
// ============================================================
type TabId = 'ingredients' | 'orders';

// ============================================================
// Main Component
// ============================================================
const Inventory: React.FC = () => {
    const [activeTab, setActiveTab] = useState<TabId>('ingredients');
    const [isBulkAdjustOpen, setIsBulkAdjustOpen] = useState(false);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);

    // Quick action handlers for StockDashboard
    const handleAddIngredient = useCallback(() => {
        setActiveTab('ingredients');
    }, []);

    const handleReceiveStock = useCallback(() => {
        setActiveTab('orders');
    }, []);

    const handleAdjustStock = useCallback(() => {
        setIsBulkAdjustOpen(true);
    }, []);

    const handleViewHistory = useCallback(() => {
        setIsHistoryOpen(true);
    }, []);

    return (
        <div className="space-y-6">

            {/* 📊 STOCK DASHBOARD */}
            <StockDashboard
                onAddIngredient={handleAddIngredient}
                onReceiveStock={handleReceiveStock}
                onAdjustStock={handleAdjustStock}
                onViewHistory={handleViewHistory}
            />

            {/* 📑 MAIN CONTENT WITH TABS */}
            <div className="bg-white rounded-2xl shadow-sm border border-stone-100 overflow-hidden">
                {/* Tab Headers */}
                <div className="flex border-b border-stone-200 bg-stone-50">
                    <button
                        onClick={() => setActiveTab('ingredients')}
                        className={`
                            flex items-center gap-2 px-6 py-4 font-medium text-sm
                            border-b-2 transition-all min-h-[52px] -mb-[2px]
                            ${activeTab === 'ingredients'
                                ? 'border-amber-500 text-amber-700 bg-white'
                                : 'border-transparent text-stone-500 hover:text-stone-700 hover:bg-white/50'}
                        `}
                        role="tab"
                        aria-selected={activeTab === 'ingredients'}
                    >
                        <Box size={18} />
                        วัตถุดิบในคลัง
                    </button>
                    <button
                        onClick={() => setActiveTab('orders')}
                        className={`
                            flex items-center gap-2 px-6 py-4 font-medium text-sm
                            border-b-2 transition-all min-h-[52px] -mb-[2px]
                            ${activeTab === 'orders'
                                ? 'border-amber-500 text-amber-700 bg-white'
                                : 'border-transparent text-stone-500 hover:text-stone-700 hover:bg-white/50'}
                        `}
                        role="tab"
                        aria-selected={activeTab === 'orders'}
                    >
                        <FileText size={18} />
                        ใบสั่งซื้อ
                    </button>
                </div>

                {/* Tab Content */}
                <div className="p-0">
                    {activeTab === 'ingredients' && <InventoryList />}
                    {activeTab === 'orders' && (
                        <div className="grid grid-cols-1 lg:grid-cols-3">
                            <div className="lg:col-span-1 border-r border-stone-100">
                                <div className="bg-gradient-to-r from-amber-400 to-orange-500 p-4 text-white">
                                    <h3 className="font-bold flex items-center gap-2">
                                        <TrendingUp size={18} />
                                        สร้างใบสั่งซื้อ
                                    </h3>
                                </div>
                                <PurchaseOrderForm />
                            </div>
                            <div className="lg:col-span-2">
                                <div className="p-4 border-b border-stone-100 bg-stone-50">
                                    <h3 className="font-bold text-stone-800 flex items-center gap-2">
                                        <History size={18} className="text-amber-600" />
                                        ประวัติใบสั่งซื้อ
                                    </h3>
                                </div>
                                <PurchaseOrderHistory />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* 📦 Modals */}
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
