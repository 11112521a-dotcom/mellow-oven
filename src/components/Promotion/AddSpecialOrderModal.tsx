import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, ShoppingBag, ChevronDown, Calendar, Users,
    FileText, Tag, Package, PlusCircle, PenTool
} from 'lucide-react';
import { useStore } from '@/src/store';
import { formatCurrency } from '@/src/lib/utils';
import { NumberInput } from '@/src/components/ui/NumberInput';

interface AddSpecialOrderModalProps {
    isOpen: boolean;
    onClose: () => void;
    mode?: 'bundle' | 'order';
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
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm"
                    onClick={onClose}
                />

                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="relative w-full max-w-5xl h-[90vh] md:h-auto md:max-h-[85vh] flex flex-col md:flex-row bg-white rounded-[2rem] shadow-2xl overflow-hidden border border-white/50"
                >
                    {/* Background decorations */}
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-amber-50/50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-orange-50/50 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none" />

                    {/* Left Column: Form */}
                    <div className="flex-1 flex flex-col h-full relative z-10 overflow-y-auto">
                        <div className="sticky top-0 bg-white/80 backdrop-blur-xl border-b border-stone-100 px-8 py-6 flex items-center justify-between z-20">
                            <div>
                                <h1 className="text-2xl font-black text-cafe-900 tracking-tight flex items-center gap-3">
                                    <ShoppingBag className="text-amber-500" strokeWidth={2.5} size={28} />
                                    {mode === 'bundle' ? 'สร้างรายการ Bundle' : 'สร้างออเดอร์พิเศษ'}
                                </h1>
                                <p className="text-stone-500 text-sm font-medium mt-1">กรอกรายละเอียดคำสั่งซื้อใหม่</p>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2.5 bg-stone-50 hover:bg-stone-100 rounded-xl text-stone-500 hover:text-stone-700 transition-colors"
                            >
                                <X size={20} strokeWidth={2.5} />
                            </button>
                        </div>

                        <div className="p-8 space-y-8">
                            {/* Order Type Toggle Cards */}
                            <div className="space-y-3">
                                <label className="block text-sm font-black text-cafe-900 tracking-wide uppercase">
                                    ประเภทสินค้า <span className="text-red-500">*</span>
                                </label>
                                <div className="grid grid-cols-2 gap-4">
                                    <button
                                        onClick={() => setOrderType('promotion')}
                                        className={`relative overflow-hidden group p-4 rounded-2xl border-2 text-left transition-all duration-300
                                            ${orderType === 'promotion'
                                                ? 'border-amber-500 bg-amber-50 shadow-md transform scale-[1.02]'
                                                : 'border-stone-200 hover:border-amber-200 hover:bg-stone-50'
                                            }
                                        `}
                                    >
                                        <div className="flex items-center gap-3 mb-1">
                                            <div className={`p-2 rounded-xl ${orderType === 'promotion' ? 'bg-amber-100 text-amber-600' : 'bg-stone-100 text-stone-500 group-hover:bg-amber-100 group-hover:text-amber-600'} transition-colors`}>
                                                <Tag size={18} strokeWidth={2.5} />
                                            </div>
                                            <span className={`font-bold ${orderType === 'promotion' ? 'text-amber-900' : 'text-stone-700 group-hover:text-stone-900'}`}>ใช้โปรโมชั่น</span>
                                        </div>
                                        <p className="text-xs text-stone-500 pl-11">เลือกจากชุดโปรโมชั่นที่มีอยู่แล้ว</p>
                                    </button>

                                    <button
                                        onClick={() => setOrderType('custom')}
                                        className={`relative overflow-hidden group p-4 rounded-2xl border-2 text-left transition-all duration-300
                                            ${orderType === 'custom'
                                                ? 'border-orange-500 bg-orange-50 shadow-md transform scale-[1.02]'
                                                : 'border-stone-200 hover:border-orange-200 hover:bg-stone-50'
                                            }
                                        `}
                                    >
                                        <div className="flex items-center gap-3 mb-1">
                                            <div className={`p-2 rounded-xl ${orderType === 'custom' ? 'bg-orange-100 text-orange-600' : 'bg-stone-100 text-stone-500 group-hover:bg-orange-100 group-hover:text-orange-600'} transition-colors`}>
                                                <PenTool size={18} strokeWidth={2.5} />
                                            </div>
                                            <span className={`font-bold ${orderType === 'custom' ? 'text-orange-900' : 'text-stone-700 group-hover:text-stone-900'}`}>กำหนดเอง</span>
                                        </div>
                                        <p className="text-xs text-stone-500 pl-11">ทำออเดอร์พิเศษตั้งราคาเอง</p>
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Product Selection Area */}
                                <div className="space-y-6 md:col-span-2 bg-stone-50/50 p-6 rounded-2xl border border-stone-100">
                                    <h3 className="font-bold text-cafe-900 mb-2 font-display flex items-center gap-2">
                                        <Package size={18} className="text-stone-400" />
                                        รายละเอียดสินค้า
                                    </h3>

                                    <AnimatePresence mode="wait">
                                        {orderType === 'promotion' && (
                                            <motion.div
                                                key="promo"
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                exit={{ opacity: 0, height: 0 }}
                                                className="space-y-4"
                                            >
                                                <div>
                                                    <label className="block text-xs font-bold text-stone-500 tracking-wide uppercase mb-1.5">เลือกโปรโมชั่น <span className="text-red-500">*</span></label>
                                                    <div className="relative">
                                                        <select
                                                            value={selectedPromotionId}
                                                            onChange={(e) => setSelectedPromotionId(e.target.value)}
                                                            className="w-full bg-white border border-stone-200 focus:border-amber-500 rounded-xl px-4 py-3 pr-10 appearance-none outline-none transition-all shadow-sm font-medium text-stone-800"
                                                        >
                                                            <option value="" disabled>-- กรุณาเลือกโปรโมชั่น --</option>
                                                            {activePromotions.map(p => (
                                                                <option key={p.id} value={p.id}>
                                                                    {p.name} ({formatCurrency(p.discountPrice)})
                                                                </option>
                                                            ))}
                                                        </select>
                                                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" size={18} strokeWidth={2.5} />
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}

                                        {orderType === 'custom' && (
                                            <motion.div
                                                key="custom"
                                                initial={{ opacity: 0, height: 0 }}
                                                animate={{ opacity: 1, height: 'auto' }}
                                                exit={{ opacity: 0, height: 0 }}
                                                className="space-y-4"
                                            >
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-xs font-bold text-stone-500 tracking-wide uppercase mb-1.5">เลือกสินค้า <span className="text-red-500">*</span></label>
                                                        <div className="relative">
                                                            <select
                                                                value={selectedProductId}
                                                                onChange={(e) => {
                                                                    setSelectedProductId(e.target.value);
                                                                    setSelectedVariantId('');
                                                                }}
                                                                className="w-full bg-white border border-stone-200 focus:border-amber-500 rounded-xl px-4 py-3 pr-10 appearance-none outline-none transition-all shadow-sm font-medium text-stone-800"
                                                            >
                                                                <option value="" disabled>-- เลือกสินค้า --</option>
                                                                {products.map(p => (
                                                                    <option key={p.id} value={p.id}>{p.name}</option>
                                                                ))}
                                                            </select>
                                                            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" size={18} strokeWidth={2.5} />
                                                        </div>
                                                    </div>

                                                    {variants.length > 0 && (
                                                        <div>
                                                            <label className="block text-xs font-bold text-stone-500 tracking-wide uppercase mb-1.5">เลือกรส/ขนาด</label>
                                                            <div className="relative">
                                                                <select
                                                                    value={selectedVariantId}
                                                                    onChange={(e) => setSelectedVariantId(e.target.value)}
                                                                    className="w-full bg-white border border-stone-200 focus:border-amber-500 rounded-xl px-4 py-3 pr-10 appearance-none outline-none transition-all shadow-sm font-medium text-stone-800"
                                                                >
                                                                    <option value="" disabled>-- เลือก (ถ้ามี) --</option>
                                                                    {variants.map(v => (
                                                                        <option key={v.id} value={v.id}>{v.name}</option>
                                                                    ))}
                                                                </select>
                                                                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" size={18} strokeWidth={2.5} />
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>

                                                <div>
                                                    <label className="block text-xs font-bold text-stone-500 tracking-wide uppercase mb-1.5">ราคาพิเศษ (บาท/ชิ้น) <span className="text-red-500">*</span></label>
                                                    <NumberInput
                                                        value={parseFloat(customPrice) || 0}
                                                        onChange={(val) => setCustomPrice(val === 0 ? '' : val.toString())}
                                                        placeholder="0"
                                                        className="w-full bg-white border border-stone-200 focus:border-amber-500 rounded-xl px-4 py-3 outline-none transition-all shadow-sm font-medium text-stone-800"
                                                    />
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>

                                {/* Order Details */}
                                <div>
                                    <label className="block text-xs font-bold text-stone-500 tracking-wide uppercase mb-1.5">จำนวนที่สั่ง <span className="text-red-500">*</span></label>
                                    <NumberInput
                                        value={parseFloat(quantity) || 0}
                                        onChange={(val) => setQuantity(val === 0 ? '' : val.toString())}
                                        placeholder="จำนวนชิ้น"
                                        min="1"
                                        className="w-full bg-white border border-stone-200 focus:border-amber-500 rounded-xl px-4 py-3 outline-none transition-all shadow-sm font-medium text-stone-800 text-lg"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-stone-500 tracking-wide uppercase mb-1.5 flex items-center gap-1.5">
                                        <Calendar size={14} className="text-amber-500" /> วันที่กำหนดส่ง
                                    </label>
                                    <input
                                        type="date"
                                        value={deliveryDate}
                                        onChange={(e) => setDeliveryDate(e.target.value)}
                                        className="w-full bg-white border border-stone-200 focus:border-amber-500 rounded-xl px-4 py-3 outline-none transition-all shadow-sm font-medium text-stone-800"
                                    />
                                </div>
                            </div>

                            <hr className="border-stone-100" />

                            {/* Customer Info */}
                            <div className="space-y-4">
                                <h3 className="font-bold text-cafe-900 flex items-center gap-2 font-display">
                                    <Users size={18} className="text-stone-400" />
                                    ข้อมูลลูกค้าและการจัดส่ง
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-stone-500 tracking-wide uppercase mb-1.5">ชื่อลูกค้า (ถ้ามี)</label>
                                        <input
                                            type="text"
                                            value={customerName}
                                            onChange={(e) => setCustomerName(e.target.value)}
                                            placeholder="กรอกชื่อลูกค้า"
                                            className="w-full bg-white border border-stone-200 focus:border-amber-500 rounded-xl px-4 py-2.5 outline-none transition-all shadow-sm font-medium text-stone-800"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-stone-500 tracking-wide uppercase mb-1.5">เบอร์โทรติดต่อ (ถ้ามี)</label>
                                        <input
                                            type="tel"
                                            value={customerPhone}
                                            onChange={(e) => setCustomerPhone(e.target.value)}
                                            placeholder="กรอกเบอร์โทรลูกค้า"
                                            className="w-full bg-white border border-stone-200 focus:border-amber-500 rounded-xl px-4 py-2.5 outline-none transition-all shadow-sm font-medium text-stone-800"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Live Summary / Receipt format */}
                    <div className="w-full md:w-[320px] lg:w-[380px] bg-stone-50/80 border-t md:border-t-0 md:border-l border-stone-200/60 p-8 flex flex-col relative z-10 shrink-0">
                        <div className="flex-1 flex flex-col">
                            <div className="flex items-center gap-2 mb-6">
                                <FileText size={20} className="text-amber-600" />
                                <h3 className="text-lg font-black text-cafe-900 tracking-tight">สรุปออเดอร์</h3>
                            </div>

                            <div className="bg-white rounded-2xl p-6 shadow-sm border border-stone-100 flex-1 relative overflow-hidden">
                                {/* Receipt header decorations */}
                                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-amber-400 via-orange-400 to-amber-400" />

                                {quantityNum > 0 && unitPrice > 0 ? (
                                    <div className="space-y-6 h-full flex flex-col">
                                        <div className="flex-1">
                                            <div className="flex justify-between items-start gap-4 mb-4">
                                                <div className="flex-1">
                                                    <p className="font-bold text-stone-800 leading-tight">
                                                        {productName}
                                                    </p>
                                                    {variantName && (
                                                        <p className="text-sm text-stone-500 mt-0.5">({variantName})</p>
                                                    )}
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-xs text-stone-400 font-bold uppercase tracking-wider mb-0.5">จำนวน</p>
                                                    <p className="font-black text-stone-800">x{quantityNum}</p>
                                                </div>
                                            </div>

                                            <div className="bg-stone-50 rounded-xl p-4 space-y-2 mb-6 border border-stone-100/60">
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-stone-500">ประเภท:</span>
                                                    <span className="font-bold text-stone-700">{orderType === 'promotion' ? 'ใช้โปรโมชั่น' : 'กำหนดเอง'}</span>
                                                </div>
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-stone-500">ราคาต่อชิ้น:</span>
                                                    <span className="font-bold text-stone-700">{formatCurrency(unitPrice)}</span>
                                                </div>
                                                <div className="flex justify-between text-sm">
                                                    <span className="text-stone-500">ส่งวันที่:</span>
                                                    <span className="font-bold text-stone-700">
                                                        {new Date(deliveryDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                    </span>
                                                </div>
                                            </div>

                                            {customerName && (
                                                <div className="mb-6 pb-6 border-b border-dashed border-stone-200">
                                                    <p className="text-xs text-stone-400 font-bold uppercase tracking-wider mb-1">ข้อมูลลูกค้า</p>
                                                    <p className="text-sm font-medium text-stone-800">{customerName}</p>
                                                    {customerPhone && <p className="text-sm text-stone-500">{customerPhone}</p>}
                                                </div>
                                            )}
                                        </div>

                                        {/* Financial Summary */}
                                        <div className="mt-auto space-y-3 pt-4 border-t-2 border-dashed border-stone-200">
                                            <div className="flex justify-between items-center">
                                                <span className="text-stone-500 font-medium">รายรับประเมิน</span>
                                                <span className="text-lg font-black text-emerald-600">{formatCurrency(totalRevenue)}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-sm">
                                                <span className="text-stone-400">ต้นทุนรวม</span>
                                                <span className="text-stone-600 font-medium">{formatCurrency(totalCost)}</span>
                                            </div>
                                            <div className="flex justify-between items-center p-3 mt-4 bg-amber-50 rounded-xl border border-amber-100/50">
                                                <span className="text-amber-800 font-bold text-sm">กำไรสุทธิ</span>
                                                <span className={`text-xl font-black ${grossProfit >= 0 ? 'text-amber-700' : 'text-rose-500'}`}>
                                                    {formatCurrency(grossProfit)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-center opacity-50 space-y-4">
                                        <div className="w-16 h-16 bg-stone-100 rounded-2xl flex items-center justify-center">
                                            <FileText size={32} className="text-stone-300" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-stone-600">ยังไม่มีข้อมูลออเดอร์</p>
                                            <p className="text-sm text-stone-400 mt-1">กรอกรายละเอียดเพื่อดูสรุปยอด</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Submit Button in Summary Section */}
                        <div className="mt-6">
                            <button
                                onClick={handleSubmit}
                                disabled={quantityNum <= 0 || unitPrice <= 0 || isSubmitting}
                                className="w-full relative group overflow-hidden bg-gradient-to-br from-cafe-800 to-cafe-900 text-white rounded-2xl font-bold py-4 transition-all shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.2)] hover:-translate-y-1 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none flex items-center justify-center gap-2"
                            >
                                {/* Button Shine Effect */}
                                <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12" />

                                {isSubmitting ? (
                                    <span className="flex items-center gap-2 relative z-10">
                                        <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        กำลังบันทึก...
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-2 text-lg relative z-10">
                                        <PlusCircle size={22} />
                                        ยืนยันสร้างออเดอร์
                                    </span>
                                )}
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default AddSpecialOrderModal;
