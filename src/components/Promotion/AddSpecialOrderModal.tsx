import React, { useState, useMemo } from 'react';
import { X, ShoppingBag, ChevronDown, Calendar, Users } from 'lucide-react';
import { useStore } from '@/src/store';
import { formatCurrency } from '@/src/lib/utils';

interface AddSpecialOrderModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const AddSpecialOrderModal: React.FC<AddSpecialOrderModalProps> = ({ isOpen, onClose }) => {
    const { products, promotions, addSpecialOrder } = useStore();

    const [orderType, setOrderType] = useState<'promotion' | 'custom'>('custom');
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
            <div className="absolute inset-0 bg-black/50" onClick={onClose} />

            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-cafe-800 flex items-center gap-2">
                        <ShoppingBag className="text-purple-500" size={20} />
                        สร้างออเดอร์พิเศษ
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    {/* Order Type */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">ประเภท</label>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={() => setOrderType('promotion')}
                                className={`py-2 px-4 rounded-lg border-2 transition-colors ${orderType === 'promotion' ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-gray-200'}`}
                            >
                                ใช้โปรโมชั่น
                            </button>
                            <button
                                onClick={() => setOrderType('custom')}
                                className={`py-2 px-4 rounded-lg border-2 transition-colors ${orderType === 'custom' ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-gray-200'}`}
                            >
                                กำหนดเอง
                            </button>
                        </div>
                    </div>

                    {/* Promotion Selection */}
                    {orderType === 'promotion' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">เลือกโปรโมชั่น</label>
                            <div className="relative">
                                <select
                                    value={selectedPromotionId}
                                    onChange={(e) => setSelectedPromotionId(e.target.value)}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 appearance-none focus:ring-2 focus:ring-purple-500"
                                >
                                    <option value="">-- เลือกโปรโมชั่น --</option>
                                    {activePromotions.map(p => (
                                        <option key={p.id} value={p.id}>
                                            {p.name} - {formatCurrency(p.discountPrice)}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
                            </div>
                            {activePromotions.length === 0 && (
                                <p className="text-xs text-yellow-600 mt-1">ยังไม่มีโปรโมชั่นที่ใช้งาน</p>
                            )}
                        </div>
                    )}

                    {/* Custom Product Selection */}
                    {orderType === 'custom' && (
                        <>
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
                                            <option key={p.id} value={p.id}>{p.name}</option>
                                        ))}
                                    </select>
                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
                                </div>
                            </div>

                            {variants.length > 0 && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">เลือกรส/ขนาด</label>
                                    <div className="relative">
                                        <select
                                            value={selectedVariantId}
                                            onChange={(e) => setSelectedVariantId(e.target.value)}
                                            className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 appearance-none focus:ring-2 focus:ring-purple-500"
                                        >
                                            <option value="">-- เลือก --</option>
                                            {variants.map(v => (
                                                <option key={v.id} value={v.id}>{v.name}</option>
                                            ))}
                                        </select>
                                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">ราคาพิเศษ (บาท/ชิ้น)</label>
                                <input
                                    type="number"
                                    value={customPrice}
                                    onChange={(e) => setCustomPrice(e.target.value)}
                                    placeholder="0"
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500"
                                />
                            </div>
                        </>
                    )}

                    {/* Quantity */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">จำนวน</label>
                        <input
                            type="number"
                            value={quantity}
                            onChange={(e) => setQuantity(e.target.value)}
                            placeholder="เช่น 200"
                            min="1"
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500"
                        />
                    </div>

                    {/* Delivery Date */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                            <Calendar size={14} />
                            วันที่ส่ง
                        </label>
                        <input
                            type="date"
                            value={deliveryDate}
                            onChange={(e) => setDeliveryDate(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500"
                        />
                    </div>

                    {/* Customer Info */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                                <Users size={14} />
                                ชื่อลูกค้า
                            </label>
                            <input
                                type="text"
                                value={customerName}
                                onChange={(e) => setCustomerName(e.target.value)}
                                placeholder="ไม่บังคับ"
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">เบอร์โทร</label>
                            <input
                                type="tel"
                                value={customerPhone}
                                onChange={(e) => setCustomerPhone(e.target.value)}
                                placeholder="ไม่บังคับ"
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500"
                            />
                        </div>
                    </div>

                    {/* Summary */}
                    {quantityNum > 0 && unitPrice > 0 && (
                        <div className="bg-purple-50 rounded-lg p-4 space-y-2">
                            <h4 className="font-medium text-purple-800">สรุปออเดอร์</h4>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">{productName} {variantName && `(${variantName})`}</span>
                                <span>x{quantityNum}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">ราคา/ชิ้น:</span>
                                <span>{formatCurrency(unitPrice)}</span>
                            </div>
                            <div className="border-t pt-2 mt-2">
                                <div className="flex justify-between font-bold">
                                    <span>รายได้รวม:</span>
                                    <span className="text-green-600">{formatCurrency(totalRevenue)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">ต้นทุน:</span>
                                    <span>{formatCurrency(totalCost)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">กำไร:</span>
                                    <span className={grossProfit >= 0 ? 'text-green-600' : 'text-red-600'}>{formatCurrency(grossProfit)}</span>
                                </div>
                            </div>
                        </div>
                    )}
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
                        disabled={quantityNum <= 0 || unitPrice <= 0 || isSubmitting}
                        className="flex-1 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSubmitting ? 'กำลังบันทึก...' : 'สร้างออเดอร์'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AddSpecialOrderModal;
