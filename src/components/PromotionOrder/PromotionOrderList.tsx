// ============================================================
// Promotion Order List Component
// Display and manage promotion orders
// ============================================================

import React, { useEffect, useState } from 'react';
import { useStore } from '../../store';
import { CreatePromotionOrderModal } from './CreatePromotionOrderModal';
import {
    Plus, Search, Loader2, Filter,
    Calendar, Phone, MapPin, Package,
    Check, X, Truck, Clock, AlertCircle
} from 'lucide-react';
import { PromotionOrder, PromotionOrderStatus } from '../../../types';

const statusConfig: Record<PromotionOrderStatus, { label: string; color: string; icon: React.ReactNode }> = {
    pending: { label: 'รอยืนยัน', color: 'bg-yellow-100 text-yellow-800', icon: <Clock className="w-4 h-4" /> },
    confirmed: { label: 'ยืนยันแล้ว', color: 'bg-blue-100 text-blue-800', icon: <Check className="w-4 h-4" /> },
    preparing: { label: 'กำลังเตรียม', color: 'bg-purple-100 text-purple-800', icon: <Package className="w-4 h-4" /> },
    delivered: { label: 'ส่งแล้ว', color: 'bg-green-100 text-green-800', icon: <Truck className="w-4 h-4" /> },
    cancelled: { label: 'ยกเลิก', color: 'bg-red-100 text-red-800', icon: <X className="w-4 h-4" /> }
};

export const PromotionOrderList: React.FC = () => {
    const {
        promotionOrders,
        isLoadingPromotionOrders,
        fetchPromotionOrders,
        updatePromotionOrderStatus
    } = useStore();

    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<PromotionOrderStatus | 'all'>('all');
    const [showCreateModal, setShowCreateModal] = useState(false);

    useEffect(() => {
        fetchPromotionOrders();
    }, []);

    // Filter orders
    const filteredOrders = promotionOrders.filter(order => {
        const matchesSearch = order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const handleStatusChange = async (orderId: string, newStatus: PromotionOrderStatus) => {
        try {
            await updatePromotionOrderStatus(orderId, newStatus);
        } catch (error) {
            console.error('Status update error:', error);
            alert('เกิดข้อผิดพลาดในการอัพเดทสถานะ');
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <Package className="w-7 h-7 text-amber-600" />
                        ออเดอร์โปรโมชั่น
                    </h2>
                    <p className="text-gray-500 mt-1">จัดการออเดอร์พิเศษและงานเลี้ยง</p>
                </div>

                <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-semibold hover:from-amber-600 hover:to-orange-600 transition-all shadow-lg"
                >
                    <Plus className="w-5 h-5" />
                    สร้างออเดอร์ใหม่
                </button>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="ค้นหาออเดอร์หรือชื่อลูกค้า..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    />
                </div>

                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500"
                >
                    <option value="all">ทุกสถานะ</option>
                    <option value="pending">รอยืนยัน</option>
                    <option value="confirmed">ยืนยันแล้ว</option>
                    <option value="preparing">กำลังเตรียม</option>
                    <option value="delivered">ส่งแล้ว</option>
                    <option value="cancelled">ยกเลิก</option>
                </select>
            </div>

            {/* Orders List */}
            {isLoadingPromotionOrders ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
                    <span className="ml-2 text-gray-600">กำลังโหลด...</span>
                </div>
            ) : filteredOrders.length === 0 ? (
                <div className="text-center py-12">
                    <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">
                        {searchTerm || statusFilter !== 'all'
                            ? 'ไม่พบออเดอร์ที่ตรงกับเงื่อนไข'
                            : 'ยังไม่มีออเดอร์ กดปุ่ม "สร้างออเดอร์ใหม่" เพื่อเริ่มต้น'}
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredOrders.map(order => (
                        <OrderCard
                            key={order.id}
                            order={order}
                            onStatusChange={handleStatusChange}
                        />
                    ))}
                </div>
            )}

            {/* Create Modal */}
            {showCreateModal && (
                <CreatePromotionOrderModal
                    onClose={() => setShowCreateModal(false)}
                    onSuccess={() => fetchPromotionOrders()}
                />
            )}
        </div>
    );
};

// Order Card Component
const OrderCard: React.FC<{
    order: PromotionOrder;
    onStatusChange: (orderId: string, status: PromotionOrderStatus) => void;
}> = ({ order, onStatusChange }) => {
    const status = statusConfig[order.status];

    return (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all overflow-hidden">
            <div className="p-5">
                <div className="flex flex-col sm:flex-row justify-between gap-4">
                    {/* Left: Order Info */}
                    <div className="space-y-2">
                        <div className="flex items-center gap-3">
                            <span className="text-lg font-bold text-amber-600">{order.orderNumber}</span>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${status.color}`}>
                                {status.icon}
                                {status.label}
                            </span>
                        </div>

                        <div className="text-gray-800 font-medium">{order.customerName}</div>

                        <div className="flex flex-wrap gap-3 text-sm text-gray-500">
                            {order.customerPhone && (
                                <span className="flex items-center gap-1">
                                    <Phone className="w-4 h-4" />
                                    {order.customerPhone}
                                </span>
                            )}
                            {order.deliveryDate && (
                                <span className="flex items-center gap-1">
                                    <Calendar className="w-4 h-4" />
                                    {order.deliveryDate}
                                    {order.deliveryTime && ` ${order.deliveryTime}`}
                                </span>
                            )}
                        </div>

                        {/* Items */}
                        <div className="text-sm text-gray-600">
                            {order.items.length} รายการ
                        </div>
                    </div>

                    {/* Right: Price & Actions */}
                    <div className="flex flex-col items-end gap-2">
                        <div className="text-2xl font-bold text-amber-600">
                            ฿{order.totalPrice.toLocaleString()}
                        </div>
                        {order.useManualPrice && order.discountNote && (
                            <span className="text-xs text-gray-500">{order.discountNote}</span>
                        )}

                        {/* Status Actions */}
                        {order.status !== 'delivered' && order.status !== 'cancelled' && (
                            <div className="flex gap-2 mt-2">
                                {order.status === 'pending' && (
                                    <>
                                        <button
                                            onClick={() => onStatusChange(order.id, 'confirmed')}
                                            className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
                                        >
                                            ยืนยัน
                                        </button>
                                        <button
                                            onClick={() => onStatusChange(order.id, 'cancelled')}
                                            className="px-3 py-1 text-sm bg-red-50 text-red-600 rounded-lg hover:bg-red-100"
                                        >
                                            ยกเลิก
                                        </button>
                                    </>
                                )}
                                {order.status === 'confirmed' && (
                                    <button
                                        onClick={() => onStatusChange(order.id, 'preparing')}
                                        className="px-3 py-1 text-sm bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200"
                                    >
                                        เริ่มเตรียม
                                    </button>
                                )}
                                {order.status === 'preparing' && (
                                    <button
                                        onClick={() => onStatusChange(order.id, 'delivered')}
                                        className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200"
                                    >
                                        ส่งแล้ว
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
