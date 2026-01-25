// ============================================================
// Create Promotion Order Modal
// Full modal for creating promotion orders
// ============================================================

import React, { useState } from 'react';
import { useStore } from '../../store';
import { ProductVariantPicker } from './ProductVariantPicker';
import {
    X, Save, User, Phone, MapPin, Calendar,
    Clock, DollarSign, Loader2, FileText, ToggleLeft, ToggleRight
} from 'lucide-react';

interface SelectedItem {
    productId: string;
    productName: string;
    variantId: string | null;
    variantName: string;
    quantity: number;
    unitPrice: number;
}

interface CreatePromotionOrderModalProps {
    onClose: () => void;
    onSuccess?: () => void;
}

export const CreatePromotionOrderModal: React.FC<CreatePromotionOrderModalProps> = ({
    onClose,
    onSuccess
}) => {
    const { createPromotionOrder } = useStore();

    const [isSaving, setIsSaving] = useState(false);
    const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);

    // Form state
    const [form, setForm] = useState({
        customerName: '',
        customerPhone: '',
        customerAddress: '',
        deliveryDate: '',
        deliveryTime: '',
        notes: '',
        useManualPrice: false,
        manualPrice: 0,
        discountNote: ''
    });

    // Calculate totals
    const calculatedPrice = selectedItems.reduce((sum, item) =>
        sum + (item.unitPrice * item.quantity), 0
    );
    const totalPrice = form.useManualPrice ? form.manualPrice : calculatedPrice;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        setForm(prev => ({
            ...prev,
            [name]: type === 'number' ? parseFloat(value) || 0 : value
        }));
    };

    const toggleManualPrice = () => {
        setForm(prev => ({
            ...prev,
            useManualPrice: !prev.useManualPrice,
            manualPrice: prev.useManualPrice ? 0 : calculatedPrice
        }));
    };

    const handleSubmit = async () => {
        // Validate
        if (!form.customerName.trim()) {
            alert('กรุณาใส่ชื่อลูกค้า');
            return;
        }
        if (selectedItems.length === 0) {
            alert('กรุณาเลือกสินค้าอย่างน้อย 1 รายการ');
            return;
        }

        setIsSaving(true);
        try {
            await createPromotionOrder(
                {
                    customerName: form.customerName,
                    customerPhone: form.customerPhone,
                    customerAddress: form.customerAddress,
                    deliveryDate: form.deliveryDate,
                    deliveryTime: form.deliveryTime,
                    calculatedPrice,
                    manualPrice: form.useManualPrice ? form.manualPrice : null,
                    useManualPrice: form.useManualPrice,
                    discountNote: form.discountNote,
                    totalPrice,
                    notes: form.notes,
                    status: 'pending'
                },
                selectedItems.map(item => ({
                    productId: item.productId,
                    variantId: item.variantId,
                    variantNote: item.variantName,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    lineTotal: item.unitPrice * item.quantity,
                    productName: item.productName,
                    variantName: item.variantName
                }))
            );

            onSuccess?.();
            onClose();
        } catch (error) {
            console.error('Create order error:', error);
            alert('เกิดข้อผิดพลาดในการสร้างออเดอร์');
        } finally {
            setIsSaving(false);
        }
    };

    const inputClass = "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all";
    const labelClass = "block text-sm font-medium text-gray-700 mb-1";

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-4 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-white">สร้างออเดอร์โปรโมชั่น</h2>
                    <button onClick={onClose} className="text-white/80 hover:text-white">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Left: Customer & Delivery Info */}
                        <div className="space-y-6">
                            {/* Customer Info */}
                            <section className="space-y-4">
                                <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                                    <User className="w-5 h-5 text-amber-600" />
                                    ข้อมูลลูกค้า
                                </h3>
                                <div className="space-y-3">
                                    <div>
                                        <label className={labelClass}>ชื่อลูกค้า *</label>
                                        <input
                                            type="text"
                                            name="customerName"
                                            value={form.customerName}
                                            onChange={handleChange}
                                            className={inputClass}
                                            placeholder="ชื่อ-นามสกุล หรือ ชื่อหน่วยงาน"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className={labelClass}>เบอร์โทร</label>
                                        <div className="relative">
                                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                            <input
                                                type="tel"
                                                name="customerPhone"
                                                value={form.customerPhone}
                                                onChange={handleChange}
                                                className={`${inputClass} pl-10`}
                                                placeholder="0xx-xxx-xxxx"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className={labelClass}>ที่อยู่จัดส่ง</label>
                                        <div className="relative">
                                            <MapPin className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                                            <textarea
                                                name="customerAddress"
                                                value={form.customerAddress}
                                                onChange={handleChange}
                                                className={`${inputClass} pl-10`}
                                                rows={2}
                                                placeholder="ที่อยู่สำหรับจัดส่ง"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* Delivery Info */}
                            <section className="space-y-4">
                                <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                                    <Calendar className="w-5 h-5 text-amber-600" />
                                    การจัดส่ง
                                </h3>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className={labelClass}>วันที่ส่ง</label>
                                        <input
                                            type="date"
                                            name="deliveryDate"
                                            value={form.deliveryDate}
                                            onChange={handleChange}
                                            className={inputClass}
                                        />
                                    </div>
                                    <div>
                                        <label className={labelClass}>เวลา</label>
                                        <input
                                            type="time"
                                            name="deliveryTime"
                                            value={form.deliveryTime}
                                            onChange={handleChange}
                                            className={inputClass}
                                        />
                                    </div>
                                </div>
                            </section>

                            {/* Notes */}
                            <section>
                                <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2 mb-3">
                                    <FileText className="w-5 h-5 text-amber-600" />
                                    หมายเหตุ
                                </h3>
                                <textarea
                                    name="notes"
                                    value={form.notes}
                                    onChange={handleChange}
                                    className={inputClass}
                                    rows={2}
                                    placeholder="หมายเหตุเพิ่มเติม..."
                                />
                            </section>
                        </div>

                        {/* Right: Product Selection & Pricing */}
                        <div className="space-y-6">
                            {/* Product Picker */}
                            <section>
                                <h3 className="text-lg font-semibold text-gray-800 mb-3">เลือกสินค้า</h3>
                                <ProductVariantPicker
                                    selectedItems={selectedItems}
                                    onItemsChange={setSelectedItems}
                                />
                            </section>

                            {/* Price Summary */}
                            <section className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-200">
                                <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2 mb-4">
                                    <DollarSign className="w-5 h-5 text-amber-600" />
                                    สรุปราคา
                                </h3>

                                <div className="space-y-3">
                                    <div className="flex justify-between text-gray-700">
                                        <span>ราคาคำนวณ</span>
                                        <span className="font-semibold">฿{calculatedPrice.toLocaleString()}</span>
                                    </div>

                                    {/* Manual Price Toggle */}
                                    <div className="flex items-center justify-between border-t pt-3">
                                        <span className="text-sm text-gray-600">ตั้งราคาเอง</span>
                                        <button
                                            type="button"
                                            onClick={toggleManualPrice}
                                            className={`relative w-12 h-6 rounded-full transition-colors ${form.useManualPrice ? 'bg-amber-500' : 'bg-gray-300'}`}
                                        >
                                            <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${form.useManualPrice ? 'left-7' : 'left-1'}`} />
                                        </button>
                                    </div>

                                    {form.useManualPrice && (
                                        <>
                                            <div>
                                                <label className="text-sm text-gray-600">ราคาที่ต้องการ</label>
                                                <input
                                                    type="number"
                                                    name="manualPrice"
                                                    value={form.manualPrice}
                                                    onChange={handleChange}
                                                    className="w-full px-3 py-2 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 mt-1"
                                                    min={0}
                                                />
                                            </div>
                                            <div>
                                                <label className="text-sm text-gray-600">หมายเหตุส่วนลด</label>
                                                <input
                                                    type="text"
                                                    name="discountNote"
                                                    value={form.discountNote}
                                                    onChange={handleChange}
                                                    className="w-full px-3 py-2 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 mt-1"
                                                    placeholder="เช่น ลด 10% ลูกค้าประจำ"
                                                />
                                            </div>
                                        </>
                                    )}

                                    <div className="flex justify-between text-xl font-bold text-amber-700 border-t pt-3">
                                        <span>รวมทั้งหมด</span>
                                        <span>฿{totalPrice.toLocaleString()}</span>
                                    </div>
                                </div>
                            </section>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        ยกเลิก
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isSaving}
                        className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg font-semibold hover:from-amber-600 hover:to-orange-600 disabled:opacity-50"
                    >
                        {isSaving ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                กำลังบันทึก...
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4" />
                                สร้างออเดอร์
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
