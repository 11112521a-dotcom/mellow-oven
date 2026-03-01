// ============================================================
// Create Snack Box Order Modal
// Select Set Menu → Input quantity → Live receipt summary → Create order
// ============================================================

import React, { useState, useMemo } from 'react';
import { useStore } from '../../store';
import { SnackBoxSet } from '../../../types';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, ShoppingBag, User, Phone, MapPin, Calendar,
    Clock, FileText, DollarSign, TrendingUp, Package,
    ChevronDown, Loader2, Save, ToggleLeft, ToggleRight,
    Calculator, Gift, Truck
} from 'lucide-react';
import { NumberInput } from '../ui/NumberInput';

interface CreateSnackBoxOrderModalProps {
    onClose: () => void;
    onSuccess?: () => void;
}

export const CreateSnackBoxOrderModal: React.FC<CreateSnackBoxOrderModalProps> = ({
    onClose,
    onSuccess
}) => {
    const {
        snackBoxSets,
        products,
        packagingOptions,
        createSnackBoxOrder
    } = useStore() as any;

    const [isSaving, setIsSaving] = useState(false);
    const [selectedSetId, setSelectedSetId] = useState('');
    const [quantity, setQuantity] = useState(1);

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

    // Get active sets only
    const activeSets = (snackBoxSets || []).filter((s: SnackBoxSet) => s.isActive);

    // Selected set details
    const selectedSet: SnackBoxSet | null = activeSets.find((s: SnackBoxSet) => s.id === selectedSetId) || null;

    // Calculate pricing & costs
    const pricing = useMemo(() => {
        if (!selectedSet) return null;

        const pricePerSet = selectedSet.price;
        const packaging = packagingOptions?.find((p: any) => p.id === selectedSet.packagingId);
        const packagingCostPerSet = packaging?.extraCost || 0;

        // Estimate cost per set from products in the set
        let estimatedCostPerSet = 0;
        selectedSet.items.forEach((item: any) => {
            // If specific productIds are assigned, calculate from their cost
            if (item.productIds && item.productIds.length > 0) {
                const itemProducts = products.filter((p: any) => item.productIds.includes(p.id));
                if (itemProducts.length > 0) {
                    // Use average cost across the selectable products
                    const avgCost = itemProducts.reduce((sum: number, p: any) => sum + (p.cost || 0), 0) / itemProducts.length;
                    estimatedCostPerSet += avgCost * item.quantity;
                }
            } else {
                // No specific products, try to estimate from category
                const categoryProducts = products.filter((p: any) =>
                    p.category?.toLowerCase() === item.category?.toLowerCase()
                );
                if (categoryProducts.length > 0) {
                    const avgCost = categoryProducts.reduce((sum: number, p: any) => sum + (p.cost || 0), 0) / categoryProducts.length;
                    estimatedCostPerSet += avgCost * item.quantity;
                }
            }
        });

        // Add packaging cost to estimated cost
        estimatedCostPerSet += packagingCostPerSet;

        const subtotal = pricePerSet * quantity;
        const totalPackagingCost = packagingCostPerSet * quantity;
        const calculatedTotal = subtotal + totalPackagingCost;
        const finalPrice = form.useManualPrice ? form.manualPrice : calculatedTotal;
        const totalEstimatedCost = estimatedCostPerSet * quantity;
        const estimatedProfit = finalPrice - totalEstimatedCost;

        return {
            pricePerSet,
            packagingCostPerSet,
            estimatedCostPerSet,
            subtotal,
            totalPackagingCost,
            calculatedTotal,
            finalPrice,
            totalEstimatedCost,
            estimatedProfit,
            profitMargin: finalPrice > 0 ? ((estimatedProfit / finalPrice) * 100) : 0
        };
    }, [selectedSet, quantity, form.useManualPrice, form.manualPrice, products, packagingOptions]);

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
            manualPrice: prev.useManualPrice ? 0 : (pricing?.calculatedTotal || 0)
        }));
    };

    const handleSubmit = async () => {
        if (!selectedSet || !pricing) {
            alert('กรุณาเลือก Set Menu');
            return;
        }
        if (!form.customerName.trim()) {
            alert('กรุณาใส่ชื่อลูกค้า');
            return;
        }
        if (quantity < selectedSet.minQuantity) {
            alert(`จำนวนขั้นต่ำ ${selectedSet.minQuantity} ชุด`);
            return;
        }

        setIsSaving(true);
        try {
            const packaging = packagingOptions?.find((p: any) => p.id === selectedSet.packagingId);

            await createSnackBoxOrder({
                setId: selectedSet.id,
                setName: selectedSet.name,
                setNameThai: selectedSet.nameThai,
                customerName: form.customerName,
                customerPhone: form.customerPhone,
                customerAddress: form.customerAddress,
                quantity,
                pricePerSet: pricing.pricePerSet,
                packagingCost: packaging?.extraCost || 0,
                subtotal: pricing.subtotal,
                totalPackagingCost: pricing.totalPackagingCost,
                totalPrice: pricing.finalPrice,
                estimatedCostPerSet: pricing.estimatedCostPerSet,
                totalEstimatedCost: pricing.totalEstimatedCost,
                estimatedProfit: pricing.estimatedProfit,
                useManualPrice: form.useManualPrice,
                manualPrice: form.useManualPrice ? form.manualPrice : null,
                discountNote: form.discountNote,
                deliveryDate: form.deliveryDate,
                deliveryTime: form.deliveryTime,
                notes: form.notes,
                status: 'pending',
                profitRecorded: false
            });

            onSuccess?.();
            onClose();
        } catch (error) {
            console.error('Create order error:', error);
            alert('เกิดข้อผิดพลาดในการสร้างออเดอร์');
        } finally {
            setIsSaving(false);
        }
    };

    const inputClass = "w-full px-3.5 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all bg-white/80";
    const labelClass = "block text-sm font-medium text-gray-600 mb-1";

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-gradient-to-br from-white to-amber-50/30 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] overflow-hidden flex flex-col"
            >
                {/* Header */}
                <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 px-6 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                            <ShoppingBag className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">สร้างออเดอร์ Snack Box</h2>
                            <p className="text-amber-100 text-sm">เลือก Set แล้วกรอกจำนวน ระบบคำนวณให้ทันที</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-white/70 hover:text-white transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

                        {/* Left Column (3/5): Form */}
                        <div className="lg:col-span-3 space-y-5">

                            {/* Set Selection */}
                            <section className="bg-white rounded-xl border border-amber-100 p-5 shadow-sm">
                                <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2 mb-4">
                                    <Package className="w-5 h-5 text-amber-600" />
                                    เลือก Set Menu
                                </h3>
                                <div className="relative">
                                    <select
                                        value={selectedSetId}
                                        onChange={(e) => {
                                            setSelectedSetId(e.target.value);
                                            const set = activeSets.find((s: SnackBoxSet) => s.id === e.target.value);
                                            if (set && quantity < set.minQuantity) {
                                                setQuantity(set.minQuantity);
                                            }
                                        }}
                                        className={`${inputClass} appearance-none pr-10 text-lg`}
                                    >
                                        <option value="">-- เลือก Set --</option>
                                        {activeSets.map((s: SnackBoxSet) => (
                                            <option key={s.id} value={s.id}>
                                                {s.nameThai} ({s.name}) — ฿{s.price.toFixed(0)}/ชุด
                                            </option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                                </div>

                                {selectedSet && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        className="mt-4 p-3 bg-amber-50/80 rounded-lg border border-amber-100"
                                    >
                                        <p className="text-sm text-amber-800 font-medium mb-1">รายการใน Set:</p>
                                        <ul className="text-sm text-amber-700 space-y-0.5">
                                            {selectedSet.items.map((item, i) => (
                                                <li key={i} className="flex items-center gap-1.5">
                                                    <span className="w-1.5 h-1.5 bg-amber-400 rounded-full" />
                                                    {item.category} ×{item.quantity}
                                                    <span className="text-amber-500 text-xs">
                                                        ({item.selectionType === 'pick_one' ? 'เลือก 1' : item.selectionType === 'pick_many' ? 'เลือกหลายตัว' : 'ทั้งหมด'})
                                                    </span>
                                                </li>
                                            ))}
                                        </ul>
                                        {selectedSet.minQuantity > 1 && (
                                            <p className="text-xs text-amber-600 mt-2">⚡ สั่งขั้นต่ำ {selectedSet.minQuantity} ชุด</p>
                                        )}
                                    </motion.div>
                                )}

                                {/* Quantity */}
                                {selectedSet && (
                                    <div className="mt-4">
                                        <label className={labelClass}>จำนวน (ชุด) *</label>
                                        <NumberInput
                                            value={quantity}
                                            onChange={(val) => setQuantity(Math.max(selectedSet.minQuantity, val))}
                                            min={selectedSet.minQuantity.toString()}
                                            className={`${inputClass} text-2xl font-bold text-center`}
                                        />
                                    </div>
                                )}
                            </section>

                            {/* Customer Info */}
                            <section className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
                                <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2 mb-4">
                                    <User className="w-5 h-5 text-amber-600" />
                                    ข้อมูลลูกค้า
                                </h3>
                                <div className="space-y-3">
                                    <div>
                                        <label className={labelClass}>ชื่อลูกค้า *</label>
                                        <input
                                            type="text" name="customerName"
                                            value={form.customerName} onChange={handleChange}
                                            className={inputClass} placeholder="ชื่อ-นามสกุล หรือ ชื่อหน่วยงาน"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className={labelClass}>เบอร์โทร</label>
                                            <div className="relative">
                                                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                                <input
                                                    type="tel" name="customerPhone"
                                                    value={form.customerPhone} onChange={handleChange}
                                                    className={`${inputClass} pl-10`} placeholder="0xx-xxx-xxxx"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className={labelClass}>วันที่ส่ง</label>
                                            <input type="date" name="deliveryDate"
                                                value={form.deliveryDate} onChange={handleChange}
                                                className={inputClass}
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className={labelClass}>ที่อยู่จัดส่ง</label>
                                        <textarea name="customerAddress"
                                            value={form.customerAddress} onChange={handleChange}
                                            className={inputClass} rows={2} placeholder="ที่อยู่สำหรับจัดส่ง"
                                        />
                                    </div>
                                    <div>
                                        <label className={labelClass}>หมายเหตุ</label>
                                        <textarea name="notes"
                                            value={form.notes} onChange={handleChange}
                                            className={inputClass} rows={2} placeholder="หมายเหตุเพิ่มเติม..."
                                        />
                                    </div>
                                </div>
                            </section>
                        </div>

                        {/* Right Column (2/5): Live Receipt Summary */}
                        <div className="lg:col-span-2">
                            <div className="sticky top-0 space-y-4">
                                {/* Receipt Card */}
                                <div className="bg-white rounded-xl border border-amber-200 shadow-lg overflow-hidden">
                                    <div className="bg-gradient-to-r from-amber-50 to-orange-50 px-5 py-4 border-b border-amber-100">
                                        <h3 className="font-bold text-gray-800 flex items-center gap-2">
                                            <Calculator className="w-5 h-5 text-amber-600" />
                                            สรุปราคา
                                        </h3>
                                    </div>
                                    <div className="p-5 space-y-3">
                                        {pricing ? (
                                            <>
                                                {/* Set Info */}
                                                <div className="pb-3 border-b border-gray-100">
                                                    <p className="font-semibold text-gray-800">{selectedSet?.nameThai}</p>
                                                    <p className="text-sm text-gray-500">{selectedSet?.name}</p>
                                                </div>

                                                {/* Line Items */}
                                                <div className="space-y-2 text-sm">
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-600">ราคาต่อชุด</span>
                                                        <span className="font-medium">฿{pricing.pricePerSet.toLocaleString()}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-gray-600">จำนวน</span>
                                                        <span className="font-medium">×{quantity} ชุด</span>
                                                    </div>
                                                    <div className="flex justify-between text-gray-700">
                                                        <span>ยอดรวมสินค้า</span>
                                                        <span className="font-semibold">฿{pricing.subtotal.toLocaleString()}</span>
                                                    </div>
                                                    {pricing.packagingCostPerSet > 0 && (
                                                        <div className="flex justify-between text-gray-600">
                                                            <span>ค่าบรรจุภัณฑ์ ({quantity}×฿{pricing.packagingCostPerSet})</span>
                                                            <span>฿{pricing.totalPackagingCost.toLocaleString()}</span>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Manual Price Toggle */}
                                                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
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
                                                    <div className="space-y-2">
                                                        <NumberInput
                                                            value={form.manualPrice}
                                                            onChange={(val) => setForm(prev => ({ ...prev, manualPrice: val }))}
                                                            className="w-full px-3 py-2 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                                                            min="0"
                                                        />
                                                        <input
                                                            type="text" name="discountNote"
                                                            value={form.discountNote} onChange={handleChange}
                                                            className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm"
                                                            placeholder="หมายเหตุส่วนลด..."
                                                        />
                                                    </div>
                                                )}

                                                {/* Total Price */}
                                                <div className="flex justify-between text-xl font-bold text-amber-700 pt-3 border-t-2 border-amber-200">
                                                    <span>รวมทั้งหมด</span>
                                                    <span>฿{pricing.finalPrice.toLocaleString()}</span>
                                                </div>

                                                {/* Cost & Profit */}
                                                <div className="mt-3 p-3 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl border border-emerald-200">
                                                    <h4 className="text-sm font-semibold text-emerald-800 flex items-center gap-1.5 mb-2">
                                                        <TrendingUp className="w-4 h-4" />
                                                        กำไรโดยประมาณ
                                                    </h4>
                                                    <div className="space-y-1 text-sm">
                                                        <div className="flex justify-between text-gray-600">
                                                            <span>ต้นทุนต่อชุด</span>
                                                            <span>≈ ฿{pricing.estimatedCostPerSet.toFixed(0)}</span>
                                                        </div>
                                                        <div className="flex justify-between text-gray-600">
                                                            <span>ต้นทุนรวม ({quantity} ชุด)</span>
                                                            <span>≈ ฿{pricing.totalEstimatedCost.toLocaleString()}</span>
                                                        </div>
                                                        <div className={`flex justify-between font-bold text-lg pt-1 border-t border-emerald-200 ${pricing.estimatedProfit >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                                                            <span>กำไร</span>
                                                            <span>
                                                                ฿{pricing.estimatedProfit.toLocaleString()}
                                                                <span className="text-xs font-normal ml-1">
                                                                    ({pricing.profitMargin.toFixed(0)}%)
                                                                </span>
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="text-center py-8 text-gray-400">
                                                <Gift className="w-12 h-12 mx-auto mb-3 opacity-40" />
                                                <p className="text-sm">เลือก Set Menu เพื่อดูสรุปราคา</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Info Note */}
                                <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-xs text-blue-700">
                                    <p className="font-medium mb-1">💡 ระบบจะคำนวณให้อัตโนมัติ</p>
                                    <p>เมื่อออเดอร์ยืนยันแล้ว กำไรจะไหลเข้าระบบ Allocation Station ให้แบ่งเข้า 5 กระเป๋าได้ทันที</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
                    <div className="text-sm text-gray-500">
                        {selectedSet && pricing && (
                            <span>
                                {selectedSet.nameThai} × {quantity} ชุด = <strong className="text-amber-700">฿{pricing.finalPrice.toLocaleString()}</strong>
                            </span>
                        )}
                    </div>
                    <div className="flex gap-3">
                        <button
                            type="button" onClick={onClose}
                            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            ยกเลิก
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={isSaving || !selectedSet}
                            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-semibold hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 shadow-lg transition-all"
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
            </motion.div>
        </div>
    );
};
