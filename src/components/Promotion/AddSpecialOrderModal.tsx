import React, { useState, useMemo, useEffect } from 'react';
import { X, ShoppingBag, ChevronDown, Calendar, Users } from 'lucide-react';
import { useStore } from '@/src/store';
import { formatCurrency } from '@/src/lib/utils';

interface AddSpecialOrderModalProps {
    isOpen: boolean;
    onClose: () => void;
    mode?: 'bundle' | 'order'; // Added mode prop to match usage
}

export const AddSpecialOrderModal: React.FC<AddSpecialOrderModalProps> = ({ isOpen, onClose, mode = 'order' }) => {
    const { products, promotions, addSpecialOrder } = useStore();

    const [orderType, setOrderType] = useState<'promotion' | 'custom'>(mode === 'bundle' ? 'promotion' : 'custom');
    const [selectedPromotionId, setSelectedPromotionId] = useState('');
    const [selectedProductId, setSelectedProductId] = useState('');
    const [selectedVariantId, setSelectedVariantId] = useState('');
    const [quantity, setQuantity] = useState('');
    const [customPrice, setCustomPrice] = useState('');
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [deliveryDate, setDeliveryDate] = useState(new Date().toISOString().split('T')[0]);
    const [note, setNote] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Initial effect to set order type based on mode
    useEffect(() => {
        if (mode === 'bundle') {
            setOrderType('promotion');
        } else {
            setOrderType('custom');
        }
    }, [mode]);

    const activePromotions = promotions.filter(p => p.isActive);

    const selectedPromotion = useMemo(() =>
        promotions.find(p => p.id === selectedPromotionId),
        [promotions, selectedPromotionId]
    );

    const selectedProduct = useMemo(() =>
        products.find(p => p.id === selectedProductId),
        [products, selectedProductId]
    );

    const variants = selectedProduct?.variants || [];
    const selectedVariant = variants.find(v => v.id === selectedVariantId);

    // Calculate pricing
    const quantityNum = parseInt(quantity) || 0;
    let unitPrice = 0;
    let unitCost = 0;
    let productName = '';
    let variantName = '';

    if (orderType === 'promotion' && selectedPromotion) {
        unitPrice = selectedPromotion.discountPrice;
        const product = products.find(p => p.id === selectedPromotion.productId);
        const variant = product?.variants?.find(v => v.id === selectedPromotion.variantId);
        unitCost = variant?.cost ?? product?.cost ?? 0;
        productName = selectedPromotion.productName;
        variantName = selectedPromotion.variantName || '';
    } else if (orderType === 'custom' && selectedProduct) {
        unitPrice = parseFloat(customPrice) || 0;
        unitCost = selectedVariant?.cost ?? selectedProduct.cost;
        productName = selectedProduct.name;
        variantName = selectedVariant?.name || '';
    }

    const totalRevenue = unitPrice * quantityNum;
    const totalCost = unitCost * quantityNum;
    const grossProfit = totalRevenue - totalCost;

    const handleSubmit = async () => {
        if (quantityNum <= 0) return;

        setIsSubmitting(true);
        try {
            const orderItems = [{
                productId: orderType === 'promotion' ? selectedPromotion!.productId : selectedProductId,
                productName,
                variantId: orderType === 'promotion' ? selectedPromotion?.variantId : selectedVariantId || undefined,
                variantName,
                quantity: quantityNum,
                unitPrice,
                unitCost,
                subtotalRevenue: totalRevenue,
                subtotalCost: totalCost,
                subtotalProfit: grossProfit,
                sortOrder: 0
            }];

            await addSpecialOrder({
                orderDate: new Date().toISOString().split('T')[0],
                deliveryDate,
                orderType: orderType,
                promotionId: orderType === 'promotion' ? selectedPromotionId : undefined,
                customerName: customerName || undefined,
                customerPhone: customerPhone || undefined,
                customerNote: note || undefined,
                totalQuantity: quantityNum,
                totalRevenue,
                totalCost,
                grossProfit,
                status: 'pending',
                stockDeducted: false
            }, orderItems);

            // Reset and close
            setOrderType('custom');
            setSelectedPromotionId('');
            setSelectedProductId('');
            setSelectedVariantId('');
            setQuantity('');
            setCustomPrice('');
            setCustomerName('');
            setCustomerPhone('');
            setNote('');
            onClose();
        } catch (error) {
            console.error('Failed to add special order:', error);
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
                        <ShoppingBag className="text-amber-500" size={20} />
                        {mode === 'bundle' ? 'สร้างรายการ Bundle' : 'สร้างออเดอร์พิเศษ'}
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-stone-100 rounded-lg text-stone-500 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    {/* Order Type */}
                    <div>
                        <label className="block text-sm font-bold text-cafe-700 mb-2">ประเภท</label>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={() => setOrderType('promotion')}
                                className={`py-2 px-4 rounded-xl border-2 transition-all font-medium ${orderType === 'promotion' ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-stone-200 text-stone-600 hover:border-stone-300'}`}
                            >
                                ใช้โปรโมชั่น
                            </button>
                            <button
                                onClick={() => setOrderType('custom')}
                                className={`py-2 px-4 rounded-xl border-2 transition-all font-medium ${orderType === 'custom' ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-stone-200 text-stone-600 hover:border-stone-300'}`}
                            >
                                กำหนดเอง
                            </button>
                        </div>
                    </div>

                    {/* Promotion Selection */}
                    {orderType === 'promotion' && (
                        <div>
                            <label className="block text-sm font-bold text-cafe-700 mb-1">เลือกโปรโมชั่น</label>
                            <div className="relative">
                                <select
                                    value={selectedPromotionId}
                                    onChange={(e) => setSelectedPromotionId(e.target.value)}
                                    className="w-full border border-stone-200 rounded-xl px-4 py-2.5 pr-10 appearance-none focus:ring-2 focus:ring-amber-500 outline-none bg-white transition-all"
                                >
                                    <option value="">-- เลือกโปรโมชั่น --</option>
                                    {activePromotions.map(p => (
                                        <option key={p.id} value={p.id}>
                                            {p.name} - {formatCurrency(p.discountPrice)}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" size={18} />
                            </div>
                            {activePromotions.length === 0 && (
                                <p className="text-xs text-amber-600 mt-1">ยังไม่มีโปรโมชั่นที่ใช้งาน</p>
                            )}
                        </div>
                    )}

                    {/* Custom Product Selection */}
                    {orderType === 'custom' && (
                        <>
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
                                    >
                                        <option value="">-- เลือกสินค้า --</option>
                                        {products.map(p => (
                                            <option key={p.id} value={p.id}>{p.name}</option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" size={18} />
                                </div>
                            </div>

                            {variants.length > 0 && (
                                <div>
                                    <label className="block text-sm font-bold text-cafe-700 mb-1">เลือกรส/ขนาด</label>
                                    <div className="relative">
                                        <select
                                            value={selectedVariantId}
                                            onChange={(e) => setSelectedVariantId(e.target.value)}
                                            className="w-full border border-stone-200 rounded-xl px-4 py-2.5 pr-10 appearance-none focus:ring-2 focus:ring-amber-500 outline-none bg-white transition-all"
                                        >
                                            <option value="">-- เลือก --</option>
                                            {variants.map(v => (
                                                <option key={v.id} value={v.id}>{v.name}</option>
                                            ))}
                                        </select>
                                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" size={18} />
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-bold text-cafe-700 mb-1">ราคาพิเศษ (บาท/ชิ้น)</label>
                                <input
                                    type="number"
                                    value={customPrice}
                                    onChange={(e) => setCustomPrice(e.target.value)}
                                    placeholder="0"
                                    className="w-full border border-stone-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-amber-500 outline-none"
                                />
                            </div>
                        </>
                    )}

                    {/* Quantity */}
                    <div>
                        <label className="block text-sm font-bold text-cafe-700 mb-1">จำนวน</label>
                        <input
                            type="number"
                            value={quantity}
                            onChange={(e) => setQuantity(e.target.value)}
                            placeholder="เช่น 200"
                            min="1"
                            className="w-full border border-stone-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-amber-500 outline-none"
                        />
                    </div>

                    {/* Delivery Date */}
                    <div>
                        <label className="block text-sm font-bold text-cafe-700 mb-1 flex items-center gap-1">
                            <Calendar size={14} className="text-amber-500" />
                            วันที่ส่ง
                        </label>
                        <input
                            type="date"
                            value={deliveryDate}
                            onChange={(e) => setDeliveryDate(e.target.value)}
                            className="w-full border border-stone-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-amber-500 outline-none"
                        />
                    </div>

                    {/* Customer Info */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-bold text-cafe-700 mb-1 flex items-center gap-1">
                                <Users size={14} className="text-amber-500" />
                                ชื่อลูกค้า
                            </label>
                            <input
                                type="text"
                                value={customerName}
                                onChange={(e) => setCustomerName(e.target.value)}
                                placeholder="ไม่บังคับ"
                                className="w-full border border-stone-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-amber-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-cafe-700 mb-1">เบอร์โทร</label>
                            <input
                                type="tel"
                                value={customerPhone}
                                onChange={(e) => setCustomerPhone(e.target.value)}
                                placeholder="ไม่บังคับ"
                                className="w-full border border-stone-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-amber-500 outline-none"
                            />
                        </div>
                    </div>

                    {/* Summary */}
                    {quantityNum > 0 && unitPrice > 0 && (
                        <div className="bg-amber-50/50 border border-amber-100 rounded-xl p-4 space-y-2">
                            <h4 className="font-bold text-amber-800">สรุปออเดอร์</h4>
                            <div className="flex justify-between text-sm">
                                <span className="text-stone-600">{productName} {variantName && `(${variantName})`}</span>
                                <span className="font-medium text-stone-800">x{quantityNum}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-stone-600">ราคา/ชิ้น:</span>
                                <span className="font-medium text-stone-800">{formatCurrency(unitPrice)}</span>
                            </div>
                            <div className="border-t border-amber-200/50 pt-2 mt-2">
                                <div className="flex justify-between font-bold">
                                    <span className="text-stone-700">รายได้รวม:</span>
                                    <span className="text-green-600">{formatCurrency(totalRevenue)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-stone-500">ต้นทุน:</span>
                                    <span className="text-stone-600">{formatCurrency(totalCost)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-stone-500">กำไร:</span>
                                    <span className={`font-bold ${grossProfit >= 0 ? 'text-green-600' : 'text-red-500'}`}>{formatCurrency(grossProfit)}</span>
                                </div>
                            </div>
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
                        disabled={quantityNum <= 0 || unitPrice <= 0 || isSubmitting}
                        className="flex-1 py-2.5 bg-cafe-900 text-white rounded-xl font-bold hover:bg-cafe-800 transition-all shadow-lg shadow-stone-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                    >
                        {isSubmitting ? 'กำลังบันทึก...' : 'สร้างออเดอร์'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AddSpecialOrderModal;
