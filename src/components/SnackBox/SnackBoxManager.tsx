// ============================================================
// Snack Box Manager Component
// Main page with tabs: Set Menu Management | Orders
// ============================================================

import React, { useEffect, useState } from 'react';
import { useStore } from '../../store';
import { SetMenuCard } from './SetMenuCard';
import { CreateEditSetModal } from './CreateEditSetModal';
import { CreateSnackBoxOrderModal } from './CreateSnackBoxOrderModal';
import { SnackBoxOrderCard } from './SnackBoxOrderCard';
import {
    Package, Plus, Loader2, Search,
    AlertCircle, ShoppingBag, LayoutGrid, ClipboardList
} from 'lucide-react';
import { SnackBoxSet, SnackBoxSetItem, SnackBoxOrderStatus } from '../../../types';

export const SnackBoxManager: React.FC = () => {
    const {
        snackBoxSets,
        packagingOptions,
        isLoadingSnackBox,
        fetchSnackBoxSets,
        fetchPackagingOptions,
        createSnackBoxSet,
        updateSnackBoxSet,
        deleteSnackBoxSet,
        // Snack Box Orders
        snackBoxOrders,
        isLoadingSnackBoxOrders,
        fetchSnackBoxOrders,
        updateSnackBoxOrderStatus,
        confirmAndRecordProfit,
        deleteSnackBoxOrder
    } = useStore() as any;

    const [activeTab, setActiveTab] = useState<'sets' | 'orders'>('sets');
    const [searchTerm, setSearchTerm] = useState('');
    const [isSetModalOpen, setIsSetModalOpen] = useState(false);
    const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
    const [editingSet, setEditingSet] = useState<SnackBoxSet | null>(null);
    const [orderStatusFilter, setOrderStatusFilter] = useState<string>('all');

    // Load data on mount
    useEffect(() => {
        fetchSnackBoxSets();
        fetchPackagingOptions();
        fetchSnackBoxOrders?.();
    }, []);

    // Filter sets
    const filteredSets = (snackBoxSets || []).filter((set: SnackBoxSet) =>
        set.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        set.nameThai.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Filter orders
    const filteredOrders = (snackBoxOrders || []).filter((o: any) =>
        orderStatusFilter === 'all' || o.status === orderStatusFilter
    );

    const handleCreateSet = () => {
        setEditingSet(null);
        setIsSetModalOpen(true);
    };

    const handleEditSet = (set: SnackBoxSet) => {
        setEditingSet(set);
        setIsSetModalOpen(true);
    };

    const handleDeleteSet = async (id: string) => {
        if (!confirm('ต้องการลบ Set นี้หรือไม่?')) return;
        try {
            await deleteSnackBoxSet(id);
        } catch (error) {
            console.error('Delete error:', error);
            alert('เกิดข้อผิดพลาดในการลบ');
        }
    };

    const handleSaveSet = async (
        data: Omit<SnackBoxSet, 'id' | 'createdAt' | 'updatedAt' | 'items'>,
        items: Omit<SnackBoxSetItem, 'id' | 'setId'>[]
    ) => {
        try {
            if (editingSet) {
                await updateSnackBoxSet(editingSet.id, data, items);
            } else {
                await createSnackBoxSet(data, items);
            }
            setIsSetModalOpen(false);
            setEditingSet(null);
        } catch (error) {
            console.error('Save error:', error);
            alert('เกิดข้อผิดพลาดในการบันทึก');
        }
    };

    const handleStatusChange = async (id: string, status: SnackBoxOrderStatus) => {
        await updateSnackBoxOrderStatus(id, status);
    };

    const handleConfirmProfit = async (id: string) => {
        await confirmAndRecordProfit(id);
    };

    const handleDeleteOrder = async (id: string) => {
        await deleteSnackBoxOrder(id);
    };

    // Order stats
    const orderStats = {
        total: (snackBoxOrders || []).length,
        pending: (snackBoxOrders || []).filter((o: any) => o.status === 'pending').length,
        confirmed: (snackBoxOrders || []).filter((o: any) => o.status === 'confirmed').length,
        producing: (snackBoxOrders || []).filter((o: any) => o.status === 'producing').length,
    };

    const tabs = [
        {
            id: 'sets' as const,
            label: 'จัดการ Set Menu',
            icon: <LayoutGrid className="w-4 h-4" />,
            count: (snackBoxSets || []).length
        },
        {
            id: 'orders' as const,
            label: 'ออเดอร์ Snack Box',
            icon: <ClipboardList className="w-4 h-4" />,
            count: orderStats.total,
            badge: orderStats.pending > 0 ? orderStats.pending : undefined
        }
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <Package className="w-7 h-7 text-amber-600" />
                        Snack Box
                    </h2>
                    <p className="text-gray-500 mt-1">จัดการ Set Menu และออเดอร์ Snack Box</p>
                </div>

                {activeTab === 'sets' ? (
                    <button
                        onClick={handleCreateSet}
                        className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-semibold hover:from-amber-600 hover:to-orange-600 transition-all shadow-lg"
                    >
                        <Plus className="w-5 h-5" />
                        สร้าง Set ใหม่
                    </button>
                ) : (
                    <button
                        onClick={() => setIsOrderModalOpen(true)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-semibold hover:from-emerald-600 hover:to-teal-600 transition-all shadow-lg"
                    >
                        <ShoppingBag className="w-5 h-5" />
                        สร้างออเดอร์ใหม่
                    </button>
                )}
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all flex-1 justify-center ${activeTab === tab.id
                            ? 'bg-white text-amber-700 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        {tab.icon}
                        {tab.label}
                        <span className={`px-2 py-0.5 rounded-full text-xs ${activeTab === tab.id ? 'bg-amber-100 text-amber-700' : 'bg-gray-200 text-gray-500'
                            }`}>
                            {tab.count}
                        </span>
                        {tab.badge && (
                            <span className="px-1.5 py-0.5 bg-red-500 text-white rounded-full text-xs animate-pulse">
                                {tab.badge}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* ===================== TAB: Set Menu ===================== */}
            {activeTab === 'sets' && (
                <>
                    {/* Search */}
                    <div className="relative max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="ค้นหา Set..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                        />
                    </div>

                    {/* Content */}
                    {isLoadingSnackBox ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
                            <span className="ml-2 text-gray-600">กำลังโหลด...</span>
                        </div>
                    ) : filteredSets.length === 0 ? (
                        <div className="text-center py-12">
                            <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                            <p className="text-gray-500">
                                {searchTerm ? 'ไม่พบ Set ที่ค้นหา' : 'ยังไม่มี Set Menu กดปุ่ม "สร้าง Set ใหม่" เพื่อเริ่มต้น'}
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredSets.map((set: SnackBoxSet) => (
                                <SetMenuCard
                                    key={set.id}
                                    set={set}
                                    packaging={packagingOptions.find((p: any) => p.id === set.packagingId)}
                                    onEdit={() => handleEditSet(set)}
                                    onDelete={() => handleDeleteSet(set.id)}
                                />
                            ))}
                        </div>
                    )}
                </>
            )}

            {/* ===================== TAB: Orders ===================== */}
            {activeTab === 'orders' && (
                <>
                    {/* Status Filter */}
                    <div className="flex gap-2 flex-wrap">
                        {[
                            { value: 'all', label: 'ทั้งหมด' },
                            { value: 'pending', label: '⏳ รอยืนยัน', count: orderStats.pending },
                            { value: 'confirmed', label: '✅ ยืนยันแล้ว', count: orderStats.confirmed },
                            { value: 'producing', label: '👨‍🍳 กำลังผลิต', count: orderStats.producing },
                            { value: 'delivered', label: '🚚 ส่งแล้ว' },
                            { value: 'cancelled', label: '❌ ยกเลิก' }
                        ].map(filter => (
                            <button
                                key={filter.value}
                                onClick={() => setOrderStatusFilter(filter.value)}
                                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${orderStatusFilter === filter.value
                                    ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                    : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                                    }`}
                            >
                                {filter.label}
                                {filter.count !== undefined && filter.count > 0 && (
                                    <span className="ml-1 px-1.5 py-0.5 bg-amber-500 text-white rounded-full text-xs">
                                        {filter.count}
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Orders Grid */}
                    {isLoadingSnackBoxOrders ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
                            <span className="ml-2 text-gray-600">กำลังโหลดออเดอร์...</span>
                        </div>
                    ) : filteredOrders.length === 0 ? (
                        <div className="text-center py-12">
                            <ShoppingBag className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                            <p className="text-gray-500 mb-4">
                                {orderStatusFilter !== 'all'
                                    ? 'ไม่มีออเดอร์ในสถานะนี้'
                                    : 'ยังไม่มีออเดอร์ Snack Box'}
                            </p>
                            <button
                                onClick={() => setIsOrderModalOpen(true)}
                                className="inline-flex items-center gap-2 px-4 py-2 bg-amber-100 text-amber-800 rounded-lg hover:bg-amber-200 transition-colors font-medium"
                            >
                                <Plus className="w-4 h-4" />
                                สร้างออเดอร์แรก
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredOrders.map((order: any) => (
                                <SnackBoxOrderCard
                                    key={order.id}
                                    order={order}
                                    onStatusChange={handleStatusChange}
                                    onConfirmProfit={handleConfirmProfit}
                                    onDelete={handleDeleteOrder}
                                />
                            ))}
                        </div>
                    )}
                </>
            )}

            {/* Modals */}
            {isSetModalOpen && (
                <CreateEditSetModal
                    set={editingSet}
                    onSave={handleSaveSet}
                    onClose={() => {
                        setIsSetModalOpen(false);
                        setEditingSet(null);
                    }}
                />
            )}

            {isOrderModalOpen && (
                <CreateSnackBoxOrderModal
                    onClose={() => setIsOrderModalOpen(false)}
                    onSuccess={() => fetchSnackBoxOrders?.()}
                />
            )}
        </div>
    );
};
