import React, { useState, useMemo } from 'react';
import { X, Tag, ChevronDown } from 'lucide-react';
import { useStore } from '@/src/store';
import { formatCurrency } from '@/src/lib/utils';

interface AddPromotionModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const AddPromotionModal: React.FC<AddPromotionModalProps> = ({ isOpen, onClose }) => {
    const { products, addPromotion } = useStore();

    const [name, setName] = useState('');
    const [selectedProductId, setSelectedProductId] = useState('');
    const [selectedVariantId, setSelectedVariantId] = useState('');
    const [discountPrice, setDiscountPrice] = useState('');
    const [minQuantity, setMinQuantity] = useState('1');
    const [validUntil, setValidUntil] = useState('');
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
            await addPromotion({
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
                isActive: true
            });

            // Reset and close
            setName('');
            setSelectedProductId('');
            setSelectedVariantId('');
            setDiscountPrice('');
            setMinQuantity('1');
            setValidUntil('');
            onClose();
        } catch (error) {
            console.error('Failed to add promotion:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />

            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-cafe-800 flex items-center gap-2">
                        <Tag className="text-orange-500" size={20} />
                        สร้างโปรโมชั่น
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    {/* Promotion Name */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อโปรโมชั่น</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="เช่น ออเดอร์เค้ก 200 ชิ้น"
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                        />
                    </div>

                    {/* Product Selection */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">เลือกสินค้า</label>
                        <div className="relative">
                            <select
                                value={selectedProductId}
                                onChange={(e) => {
                                    setSelectedProductId(e.target.value);
                                    setSelectedVariantId('');
                                }}
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 appearance-none focus:ring-2 focus:ring-purple-500"
                            >
                                <option value="">-- เลือกสินค้า --</option>
                                {products.map(p => (
                                    <option key={p.id} value={p.id}>
                                        {p.name} ({formatCurrency(p.price)})
                                    </option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
                        </div>
                    </div>

                    {/* Variant Selection (if available) */}
                    {variants.length > 0 && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">เลือกรส/ขนาด</label>
                            <div className="relative">
                                <select
                                    value={selectedVariantId}
                                    onChange={(e) => setSelectedVariantId(e.target.value)}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 appearance-none focus:ring-2 focus:ring-purple-500"
                                >
                                    <option value="">-- ทั้งหมด --</option>
                                    {variants.map(v => (
                                        <option key={v.id} value={v.id}>
                                            {v.name} ({formatCurrency(v.price)})
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
                            </div>
                        </div>
                    )}

                    {/* Pricing */}
                    {selectedProductId && (
                        <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">ราคาปกติ:</span>
                                <span className="font-medium">{formatCurrency(originalPrice)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">ต้นทุน:</span>
                                <span className="font-medium">{formatCurrency(cost)}</span>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">ราคาโปรโมชั่น (บาท)</label>
                                <input
                                    type="number"
                                    value={discountPrice}
                                    onChange={(e) => setDiscountPrice(e.target.value)}
                                    placeholder="0"
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500"
                                />
                            </div>

                            {discountPriceNum > 0 && (
                                <div className="flex justify-between items-center pt-2 border-t">
                                    <div>
                                        <span className="text-xs text-gray-500">ส่วนลด</span>
                                        <p className="text-red-600 font-bold">-{discountPercent.toFixed(0)}%</p>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-xs text-gray-500">กำไร/ชิ้น</span>
                                        <p className={`font-bold ${profitPerItem >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            {formatCurrency(profitPerItem)}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Minimum Quantity */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">จำนวนขั้นต่ำ</label>
                        <input
                            type="number"
                            value={minQuantity}
                            onChange={(e) => setMinQuantity(e.target.value)}
                            min="1"
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500"
                        />
                    </div>

                    {/* Valid Until */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">หมดอายุ (ไม่บังคับ)</label>
                        <input
                            type="date"
                            value={validUntil}
                            onChange={(e) => setValidUntil(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500"
                        />
                    </div>
                </div>

                <div className="sticky bottom-0 bg-white border-t px-6 py-4 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                        ยกเลิก
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={!name || !selectedProductId || !discountPrice || isSubmitting}
                        className="flex-1 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? 'กำลังบันทึก...' : 'สร้างโปรโมชั่น'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AddPromotionModal;
