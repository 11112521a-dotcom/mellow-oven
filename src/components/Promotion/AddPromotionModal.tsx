import React, { useState, useMemo } from 'react';
import { X, Tag, ChevronDown } from 'lucide-react';
import { useStore } from '@/src/store';
import { formatCurrency } from '@/src/lib/utils';

interface AddPromotionModalProps {
    isOpen: boolean;
    onClose: () => void;
    editingPromotion?: any; // Optional prop for editing mode
}

export const AddPromotionModal: React.FC<AddPromotionModalProps> = ({ isOpen, onClose, editingPromotion }) => {
    const { products, addPromotion, updatePromotion } = useStore();

    const [name, setName] = useState(editingPromotion?.name || '');
    const [selectedProductId, setSelectedProductId] = useState(editingPromotion?.productId || '');
    const [selectedVariantId, setSelectedVariantId] = useState(editingPromotion?.variantId || '');
    const [discountPrice, setDiscountPrice] = useState(editingPromotion?.discountPrice?.toString() || '');
    const [minQuantity, setMinQuantity] = useState(editingPromotion?.minQuantity?.toString() || '1');
    const [validUntil, setValidUntil] = useState(editingPromotion?.validUntil || '');
    const [isActive, setIsActive] = useState(editingPromotion?.isActive ?? true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Get selected product
    const selectedProduct = useMemo(() =>
        products.find(p => p.id === selectedProductId),
        [products, selectedProductId]
    );

    // Get variants if available
    const variants = selectedProduct?.variants || [];
    const selectedVariant = variants.find(v => v.id === selectedVariantId);

    const originalPrice = selectedVariant?.price ?? selectedProduct?.price ?? 0;
    const cost = selectedVariant?.cost ?? selectedProduct?.cost ?? 0;
    const discountPriceNum = parseFloat(discountPrice) || 0;
    const discountPercent = originalPrice > 0 ? ((originalPrice - discountPriceNum) / originalPrice * 100) : 0;
    const profitPerItem = discountPriceNum - cost;

    const handleSubmit = async () => {
        if (!selectedProductId || !discountPrice || !name) return;

        setIsSubmitting(true);
        try {
            const promotionData = {
                name,
                productId: selectedProductId,
                productName: selectedProduct?.name || '',
                variantId: selectedVariantId || undefined,
                variantName: selectedVariant?.name,
                originalPrice,
                discountPrice: discountPriceNum,
                discountPercent,
                minQuantity: parseInt(minQuantity) || 1,
                validUntil: validUntil || undefined,
                isActive
            };

            if (editingPromotion) {
                await updatePromotion(editingPromotion.id, promotionData);
            } else {
                await addPromotion({
                    ...promotionData,
                    isActive: true // New promotions default to active
                });
            }

            onClose();
        } catch (error) {
            console.error('Failed to save promotion:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-stone-900/50 backdrop-blur-sm" onClick={onClose} />

            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto border border-stone-200">
                <div className="sticky top-0 bg-white border-b border-stone-100 px-6 py-4 flex items-center justify-between z-10">
                    <h2 className="text-lg font-bold text-cafe-900 flex items-center gap-2">
                        <Tag className="text-amber-500" size={20} />
                        {editingPromotion ? 'แก้ไขโปรโมชั่น' : 'สร้างโปรโมชั่น'}
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-stone-100 rounded-lg text-stone-500 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    {/* Promotion Name */}
                    <div>
                        <label className="block text-sm font-bold text-cafe-700 mb-1">ชื่อโปรโมชั่น</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="เช่น ออเดอร์เค้ก 200 ชิ้น"
                            className="w-full border border-stone-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all"
                        />
                    </div>

                    {/* Product Selection */}
                    <div>
                        <label className="block text-sm font-bold text-cafe-700 mb-1">เลือกสินค้า</label>
                        <div className="relative">
                            <select
                                value={selectedProductId}
                                onChange={(e) => {
                                    setSelectedProductId(e.target.value);
                                    setSelectedVariantId('');
                                }}
                                className="w-full border border-stone-200 rounded-xl px-4 py-2.5 pr-10 appearance-none focus:ring-2 focus:ring-amber-500 outline-none bg-white transition-all"
                                disabled={!!editingPromotion} // Disable product change when editing
                            >
                                <option value="">-- เลือกสินค้า --</option>
                                {products.map(p => (
                                    <option key={p.id} value={p.id}>
                                        {p.name} ({formatCurrency(p.price)})
                                    </option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" size={18} />
                        </div>
                    </div>

                    {/* Variant Selection (if available) */}
                    {variants.length > 0 && (
                        <div>
                            <label className="block text-sm font-bold text-cafe-700 mb-1">เลือกรส/ขนาด</label>
                            <div className="relative">
                                <select
                                    value={selectedVariantId}
                                    onChange={(e) => setSelectedVariantId(e.target.value)}
                                    className="w-full border border-stone-200 rounded-xl px-4 py-2.5 pr-10 appearance-none focus:ring-2 focus:ring-amber-500 outline-none bg-white transition-all"
                                    disabled={!!editingPromotion}
                                >
                                    <option value="">-- ทั้งหมด --</option>
                                    {variants.map(v => (
                                        <option key={v.id} value={v.id}>
                                            {v.name} ({formatCurrency(v.price)})
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" size={18} />
                            </div>
                        </div>
                    )}

                    {/* Pricing */}
                    {selectedProductId && (
                        <div className="bg-stone-50 rounded-xl p-4 space-y-3 border border-stone-100">
                            <div className="flex justify-between text-sm">
                                <span className="text-stone-500">ราคาปกติ:</span>
                                <span className="font-bold text-stone-700">{formatCurrency(originalPrice)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-stone-500">ต้นทุน:</span>
                                <span className="font-medium text-stone-600">{formatCurrency(cost)}</span>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-cafe-700 mb-1">ราคาโปรโมชั่น (บาท)</label>
                                <input
                                    type="number"
                                    value={discountPrice}
                                    onChange={(e) => setDiscountPrice(e.target.value)}
                                    placeholder="0"
                                    className="w-full border border-stone-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-amber-500 outline-none"
                                />
                            </div>

                            {discountPriceNum > 0 && (
                                <div className="flex justify-between items-center pt-3 border-t border-stone-200">
                                    <div>
                                        <span className="text-xs text-stone-500 block">ส่วนลด</span>
                                        <p className="text-red-500 font-bold">-{discountPercent.toFixed(0)}%</p>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-xs text-stone-500 block">กำไร/ชิ้น</span>
                                        <p className={`font-bold ${profitPerItem >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                                            {formatCurrency(profitPerItem)}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Minimum Quantity */}
                    <div>
                        <label className="block text-sm font-bold text-cafe-700 mb-1">จำนวนขั้นต่ำ</label>
                        <input
                            type="number"
                            value={minQuantity}
                            onChange={(e) => setMinQuantity(e.target.value)}
                            min="1"
                            className="w-full border border-stone-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-amber-500 outline-none"
                        />
                    </div>

                    {/* Valid Until */}
                    <div>
                        <label className="block text-sm font-bold text-cafe-700 mb-1">หมดอายุ (ไม่บังคับ)</label>
                        <input
                            type="date"
                            value={validUntil}
                            onChange={(e) => setValidUntil(e.target.value)}
                            className="w-full border border-stone-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-amber-500 outline-none"
                        />
                    </div>

                    {editingPromotion && (
                        <div className="flex items-center gap-2 pt-2">
                            <input
                                type="checkbox"
                                id="isActive"
                                checked={isActive}
                                onChange={(e) => setIsActive(e.target.checked)}
                                className="w-5 h-5 text-amber-600 rounded focus:ring-amber-500 border-gray-300"
                            />
                            <label htmlFor="isActive" className="text-sm font-medium text-cafe-700">เปิดใช้งานโปรโมชั่นนี้</label>
                        </div>
                    )}
                </div>

                <div className="sticky bottom-0 bg-white border-t border-stone-100 px-6 py-4 flex gap-3 z-10">
                    <button
                        onClick={onClose}
                        className="flex-1 py-2.5 border border-stone-200 rounded-xl text-stone-600 font-bold hover:bg-stone-50 transition-colors"
                    >
                        ยกเลิก
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={!name || !selectedProductId || !discountPrice || isSubmitting}
                        className="flex-1 py-2.5 bg-cafe-900 text-white rounded-xl font-bold hover:bg-cafe-800 transition-all shadow-lg shadow-stone-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                    >
                        {isSubmitting ? 'กำลังบันทึก...' : (editingPromotion ? 'บันทึกแก้ไข' : 'สร้างโปรโมชั่น')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AddPromotionModal;
