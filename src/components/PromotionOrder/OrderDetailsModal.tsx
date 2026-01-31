// ============================================================
// Order Details Modal
// View full order details including items
// ============================================================

import React from 'react';
import {
    X, User, Phone, MapPin, Calendar, Clock, Package, DollarSign
} from 'lucide-react';
import { PromotionOrder, PromotionOrderStatus } from '../../../types';

interface OrderDetailsModalProps {
    order: PromotionOrder;
    onClose: () => void;
}

const statusConfig: Record<PromotionOrderStatus, { label: string; color: string }> = {
    pending: { label: 'รอยืนยัน', color: 'bg-yellow-100 text-yellow-800' },
    confirmed: { label: 'ยืนยันแล้ว', color: 'bg-blue-100 text-blue-800' },
    preparing: { label: 'กำลังเตรียม', color: 'bg-purple-100 text-purple-800' },
    delivered: { label: 'ส่งแล้ว', color: 'bg-green-100 text-green-800' },
    cancelled: { label: 'ยกเลิก', color: 'bg-red-100 text-red-800' }
};

export const OrderDetailsModal: React.FC<OrderDetailsModalProps> = ({ order, onClose }) => {
    const status = statusConfig[order.status];

    return (
        <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <h2 className="text-xl font-bold text-white">{order.orderNumber}</h2>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${status.color}`}>
                            {status.label}
                        </span>
                    </div>
                    <button onClick={onClose} className="text-white/80 hover:text-white">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Customer Info */}
                    <section>
                        <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2 mb-3">
                            <User className="w-5 h-5 text-amber-600" />
                            ข้อมูลลูกค้า
                        </h3>
                        <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                            <div className="font-medium text-gray-800">{order.customerName}</div>
                            {order.customerPhone && (
                                <div className="flex items-center gap-2 text-gray-600">
                                    <Phone className="w-4 h-4" />
                                    {order.customerPhone}
                                </div>
                            )}
                            {order.customerAddress && (
                                <div className="flex items-start gap-2 text-gray-600">
                                    <MapPin className="w-4 h-4 mt-1" />
                                    {order.customerAddress}
                                </div>
                            )}
                        </div>
                    </section>

                    {/* Delivery Info */}
                    {(order.deliveryDate || order.deliveryTime) && (
                        <section>
                            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2 mb-3">
                                <Calendar className="w-5 h-5 text-amber-600" />
                                การจัดส่ง
                            </h3>
                            <div className="bg-gray-50 rounded-lg p-4 flex items-center gap-4">
                                {order.deliveryDate && (
                                    <div className="flex items-center gap-2">
                                        <Calendar className="w-4 h-4 text-gray-500" />
                                        <span>{order.deliveryDate}</span>
                                    </div>
                                )}
                                {order.deliveryTime && (
                                    <div className="flex items-center gap-2">
                                        <Clock className="w-4 h-4 text-gray-500" />
                                        <span>{order.deliveryTime}</span>
                                    </div>
                                )}
                            </div>
                        </section>
                    )}

                    {/* Items */}
                    <section>
                        <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2 mb-3">
                            <Package className="w-5 h-5 text-amber-600" />
                            รายการสินค้า ({order.items.length} รายการ)
                        </h3>
                        <div className="bg-gray-50 rounded-lg overflow-hidden">
                            <table className="w-full">
                                <thead className="bg-gray-100">
                                    <tr>
                                        <th className="text-left px-4 py-2 text-sm font-medium text-gray-600">รายการ</th>
                                        <th className="text-center px-4 py-2 text-sm font-medium text-gray-600">จำนวน</th>
                                        <th className="text-right px-4 py-2 text-sm font-medium text-gray-600">ราคา/ชิ้น</th>
                                        <th className="text-right px-4 py-2 text-sm font-medium text-gray-600">รวม</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {order.items.map((item, idx) => (
                                        <tr key={idx} className="border-t border-gray-200">
                                            <td className="px-4 py-3">
                                                <div className="font-medium text-gray-800">{item.productName}</div>
                                                {item.variantNote && (
                                                    <div className="text-xs text-gray-500">{item.variantNote}</div>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-center">{item.quantity}</td>
                                            <td className="px-4 py-3 text-right">฿{item.unitPrice.toLocaleString()}</td>
                                            <td className="px-4 py-3 text-right font-semibold text-amber-600">
                                                ฿{item.lineTotal.toLocaleString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>

                    {/* Price Summary */}
                    <section>
                        <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2 mb-3">
                            <DollarSign className="w-5 h-5 text-amber-600" />
                            สรุปราคา
                        </h3>
                        <div className="bg-amber-50 rounded-lg p-4 space-y-2">
                            {order.calculatedPrice && order.useManualPrice && (
                                <div className="flex justify-between text-gray-600">
                                    <span>ราคาคำนวณ</span>
                                    <span>฿{order.calculatedPrice.toLocaleString()}</span>
                                </div>
                            )}
                            {order.useManualPrice && order.discountNote && (
                                <div className="flex justify-between text-gray-600">
                                    <span>หมายเหตุส่วนลด</span>
                                    <span className="text-sm">{order.discountNote}</span>
                                </div>
                            )}
                            <div className="flex justify-between text-xl font-bold text-amber-700 border-t border-amber-200 pt-2">
                                <span>รวมทั้งหมด</span>
                                <span>฿{order.totalPrice.toLocaleString()}</span>
                            </div>
                        </div>
                    </section>

                    {/* Notes */}
                    {order.notes && (
                        <section>
                            <h3 className="text-lg font-semibold text-gray-800 mb-2">หมายเหตุ</h3>
                            <div className="bg-gray-50 rounded-lg p-4 text-gray-600">
                                {order.notes}
                            </div>
                        </section>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-5 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium transition-colors"
                    >
                        ปิด
                    </button>
                </div>
            </div>
        </div>
    );
};
