// ============================================================
// Snack Box Order Card
// Display individual Snack Box order with status actions
// ============================================================

import React, { useState } from 'react';
import { SnackBoxOrder, SnackBoxOrderStatus } from '../../../types';
import {
    Package, User, Phone, MapPin, Calendar,
    Clock, DollarSign, TrendingUp, CheckCircle2,
    Truck, XCircle, Loader2, ChefHat, AlertCircle,
    Trash2
} from 'lucide-react';

interface SnackBoxOrderCardProps {
    order: SnackBoxOrder;
    onStatusChange: (id: string, status: SnackBoxOrderStatus) => Promise<void>;
    onConfirmProfit: (id: string) => Promise<void>;
    onDelete: (id: string) => Promise<void>;
}

const statusConfig: Record<SnackBoxOrderStatus, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
    pending: {
        label: 'รอยืนยัน',
        color: 'text-amber-700',
        bg: 'bg-amber-50 border-amber-200',
        icon: <Clock className="w-4 h-4" />
    },
    confirmed: {
        label: 'ยืนยันแล้ว',
        color: 'text-blue-700',
        bg: 'bg-blue-50 border-blue-200',
        icon: <CheckCircle2 className="w-4 h-4" />
    },
    producing: {
        label: 'กำลังผลิต',
        color: 'text-purple-700',
        bg: 'bg-purple-50 border-purple-200',
        icon: <ChefHat className="w-4 h-4" />
    },
    delivered: {
        label: 'ส่งแล้ว',
        color: 'text-green-700',
        bg: 'bg-green-50 border-green-200',
        icon: <Truck className="w-4 h-4" />
    },
    cancelled: {
        label: 'ยกเลิก',
        color: 'text-red-700',
        bg: 'bg-red-50 border-red-200',
        icon: <XCircle className="w-4 h-4" />
    }
};

export const SnackBoxOrderCard: React.FC<SnackBoxOrderCardProps> = ({
    order,
    onStatusChange,
    onConfirmProfit,
    onDelete
}) => {
    const [isUpdating, setIsUpdating] = useState(false);
    const status = statusConfig[order.status];

    const handleAction = async (action: () => Promise<void>) => {
        setIsUpdating(true);
        try {
            await action();
        } catch (error) {
            console.error('Action error:', error);
            alert('เกิดข้อผิดพลาด');
        } finally {
            setIsUpdating(false);
        }
    };

    return (
        <div className={`bg-white rounded-xl border shadow-sm hover:shadow-md transition-all overflow-hidden ${order.status === 'cancelled' ? 'opacity-60' : ''}`}>
            {/* Header */}
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 px-5 py-3 border-b border-amber-100 flex justify-between items-center">
                <div>
                    <span className="text-xs font-mono text-gray-500">{order.orderNumber}</span>
                    <h3 className="font-bold text-gray-800">{order.setNameThai || order.setName}</h3>
                </div>
                <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-medium ${status.bg} ${status.color}`}>
                    {status.icon}
                    {status.label}
                </div>
            </div>

            {/* Content */}
            <div className="p-5 space-y-3">
                {/* Quantity & Price */}
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-amber-500" />
                        <span className="text-gray-700 font-medium">{order.quantity} ชุด</span>
                        <span className="text-gray-400 text-sm">× ฿{order.pricePerSet.toFixed(0)}</span>
                    </div>
                    <div className="text-right">
                        <div className="text-xl font-bold text-amber-700">฿{order.totalPrice.toLocaleString()}</div>
                    </div>
                </div>

                {/* Customer */}
                {order.customerName && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                        <User className="w-4 h-4 text-gray-400" />
                        <span>{order.customerName}</span>
                        {order.customerPhone && (
                            <>
                                <span className="text-gray-300">|</span>
                                <Phone className="w-3.5 h-3.5 text-gray-400" />
                                <span>{order.customerPhone}</span>
                            </>
                        )}
                    </div>
                )}

                {/* Delivery Date */}
                {order.deliveryDate && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <span>ส่ง: {order.deliveryDate}</span>
                        {order.deliveryTime && <span className="text-gray-400">เวลา {order.deliveryTime}</span>}
                    </div>
                )}

                {/* Profit */}
                <div className={`flex items-center justify-between p-2.5 rounded-lg ${order.estimatedProfit >= 0 ? 'bg-emerald-50' : 'bg-red-50'}`}>
                    <div className="flex items-center gap-1.5 text-sm">
                        <TrendingUp className={`w-4 h-4 ${order.estimatedProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`} />
                        <span className={order.estimatedProfit >= 0 ? 'text-emerald-700' : 'text-red-700'}>กำไรประมาณ</span>
                    </div>
                    <span className={`font-bold ${order.estimatedProfit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                        ฿{order.estimatedProfit.toLocaleString()}
                    </span>
                </div>

                {order.profitRecorded && (
                    <div className="flex items-center gap-1.5 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-md">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        บันทึกกำไรเข้า Allocation Station แล้ว
                    </div>
                )}

                {/* Notes */}
                {order.notes && (
                    <p className="text-xs text-gray-500 italic bg-gray-50 p-2 rounded-lg">📝 {order.notes}</p>
                )}
            </div>

            {/* Actions */}
            {order.status !== 'cancelled' && order.status !== 'delivered' && (
                <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex flex-wrap gap-2">
                    {isUpdating && (
                        <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
                    )}

                    {/* Pending → Confirm + Record Profit */}
                    {order.status === 'pending' && !order.profitRecorded && (
                        <button
                            onClick={() => handleAction(() => onConfirmProfit(order.id))}
                            disabled={isUpdating}
                            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-lg font-medium hover:from-emerald-600 hover:to-teal-600 disabled:opacity-50 shadow-sm"
                        >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            ยืนยัน & บันทึกกำไร
                        </button>
                    )}

                    {/* Confirmed → Producing */}
                    {order.status === 'confirmed' && (
                        <button
                            onClick={() => handleAction(() => onStatusChange(order.id, 'producing'))}
                            disabled={isUpdating}
                            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-purple-500 text-white rounded-lg font-medium hover:bg-purple-600 disabled:opacity-50"
                        >
                            <ChefHat className="w-3.5 h-3.5" />
                            เริ่มผลิต
                        </button>
                    )}

                    {/* Producing → Delivered */}
                    {order.status === 'producing' && (
                        <button
                            onClick={() => handleAction(() => onStatusChange(order.id, 'delivered'))}
                            disabled={isUpdating}
                            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 disabled:opacity-50"
                        >
                            <Truck className="w-3.5 h-3.5" />
                            ส่งแล้ว
                        </button>
                    )}

                    {/* Cancel */}
                    <button
                        onClick={() => {
                            if (confirm('ต้องการยกเลิกออเดอร์นี้?')) {
                                handleAction(() => onStatusChange(order.id, 'cancelled'));
                            }
                        }}
                        disabled={isUpdating}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50 ml-auto"
                    >
                        <XCircle className="w-3.5 h-3.5" />
                        ยกเลิก
                    </button>
                </div>
            )}

            {/* Delete for cancelled orders */}
            {order.status === 'cancelled' && (
                <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex justify-end">
                    <button
                        onClick={() => {
                            if (confirm('ลบออเดอร์นี้ถาวร?')) {
                                handleAction(() => onDelete(order.id));
                            }
                        }}
                        disabled={isUpdating}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm text-red-500 hover:bg-red-50 rounded-lg"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                        ลบ
                    </button>
                </div>
            )}
        </div>
    );
};
