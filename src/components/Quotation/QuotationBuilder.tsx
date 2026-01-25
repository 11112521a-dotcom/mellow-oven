// ============================================================
// Quotation Builder Component
// Create and preview PDF quotations
// ============================================================

import React, { useState, useEffect } from 'react';
import { useStore } from '../../store';
import { QuotationItem } from '../../../types';
import {
    X, Save, Plus, Trash2, FileText,
    User, Eye, Download, Loader2, Search,
    Package
} from 'lucide-react';

interface QuotationBuilderProps {
    onClose: () => void;
    onSuccess?: () => void;
    orderId?: string; // Optional: create from existing order
}

export const QuotationBuilder: React.FC<QuotationBuilderProps> = ({
    onClose,
    onSuccess,
    orderId
}) => {
    const {
        shopInfo,
        fetchShopInfo,
        createQuotation,
        promotionOrders,
        products
    } = useStore();

    const [isSaving, setIsSaving] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [showProductPicker, setShowProductPicker] = useState(false);
    const [productSearch, setProductSearch] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');

    // Form state
    const [form, setForm] = useState({
        customerName: '',
        customerAddress: '',
        customerContact: '',
        customerPhone: '',
        discountAmount: 0,
        discountNote: '',
        validityDays: 30,
        conditions: 'ราคานี้ยังไม่รวมค่าจัดส่ง\nกรุณาชำระเงินล่วงหน้าอย่างน้อย 50%\nสินค้าต้องสั่งล่วงหน้าอย่างน้อย 3 วัน'
    });

    const [items, setItems] = useState<QuotationItem[]>([]);

    // Load shop info on mount
    useEffect(() => {
        fetchShopInfo();
    }, []);

    // If orderId provided, populate from order
    useEffect(() => {
        if (orderId) {
            const order = promotionOrders.find(o => o.id === orderId);
            if (order) {
                setForm(prev => ({
                    ...prev,
                    customerName: order.customerName,
                    customerPhone: order.customerPhone,
                    customerAddress: order.customerAddress
                }));
                setItems(order.items.map(item => ({
                    name: item.productName || '',
                    description: item.variantNote || '',
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    lineTotal: item.quantity * item.unitPrice
                })));
            }
        }
    }, [orderId, promotionOrders]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        setForm(prev => ({
            ...prev,
            [name]: type === 'number' ? parseFloat(value) || 0 : value
        }));
    };

    // Item management
    const addItem = () => {
        setItems(prev => [...prev, {
            name: '',
            description: '',
            quantity: 1,
            unitPrice: 0,
            lineTotal: 0
        }]);
    };

    const addProductItem = (product: any, variant?: any) => {
        const price = variant?.price || product.variants?.[0]?.price || 0;
        const name = variant ? `${product.name} (${variant.name})` : product.name;
        setItems(prev => [...prev, {
            name,
            description: product.category || '',
            quantity: 1,
            unitPrice: price,
            lineTotal: price
        }]);
        setShowProductPicker(false);
    };

    // Get unique categories
    const categories = ['all', ...new Set(products.map(p => p.category).filter(Boolean))];

    // Filter products
    const filteredProducts = products.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(productSearch.toLowerCase());
        const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    const updateItem = (idx: number, field: keyof QuotationItem, value: any) => {
        setItems(prev => prev.map((item, i) => {
            if (i !== idx) return item;
            const updated = { ...item, [field]: value };
            if (field === 'quantity' || field === 'unitPrice') {
                updated.lineTotal = updated.quantity * updated.unitPrice;
            }
            return updated;
        }));
    };

    const removeItem = (idx: number) => {
        setItems(prev => prev.filter((_, i) => i !== idx));
    };

    // Calculations
    const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
    const totalPrice = subtotal - form.discountAmount;

    const handleSubmit = async () => {
        if (!form.customerName.trim()) {
            alert('กรุณาใส่ชื่อลูกค้า');
            return;
        }
        if (items.length === 0) {
            alert('กรุณาเพิ่มรายการอย่างน้อย 1 รายการ');
            return;
        }

        setIsSaving(true);
        try {
            await createQuotation({
                customerName: form.customerName,
                customerAddress: form.customerAddress,
                customerContact: form.customerContact,
                customerPhone: form.customerPhone,
                orderId: orderId || null,
                items,
                subtotal,
                discountAmount: form.discountAmount,
                discountNote: form.discountNote,
                totalPrice,
                totalPriceText: '', // Will be calculated by slice
                validityDays: form.validityDays,
                conditions: form.conditions,
                status: 'draft'
            });

            onSuccess?.();
            onClose();
        } catch (error) {
            console.error('Create quotation error:', error);
            alert('เกิดข้อผิดพลาดในการสร้างใบเสนอราคา');
        } finally {
            setIsSaving(false);
        }
    };

    const inputClass = "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent";

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <FileText className="w-6 h-6" />
                        สร้างใบเสนอราคา
                    </h2>
                    <button onClick={onClose} className="text-white/80 hover:text-white">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Shop Info Preview */}
                    {shopInfo && (
                        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                            <div className="flex items-center gap-4">
                                {shopInfo.logoUrl && (
                                    <img src={shopInfo.logoUrl} alt="Logo" className="w-16 h-16 object-contain" />
                                )}
                                <div>
                                    <div className="font-bold text-gray-800">{shopInfo.shopName || 'ยังไม่ตั้งชื่อร้าน'}</div>
                                    <div className="text-sm text-gray-600">{shopInfo.phone}</div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Customer Info */}
                    <section className="space-y-4">
                        <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                            <User className="w-5 h-5 text-blue-600" />
                            ข้อมูลลูกค้า
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-medium text-gray-700">ชื่อลูกค้า/หน่วยงาน *</label>
                                <input
                                    type="text"
                                    name="customerName"
                                    value={form.customerName}
                                    onChange={handleChange}
                                    className={inputClass}
                                    placeholder="ชื่อลูกค้าหรือหน่วยงาน"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-gray-700">ผู้ติดต่อ</label>
                                <input
                                    type="text"
                                    name="customerContact"
                                    value={form.customerContact}
                                    onChange={handleChange}
                                    className={inputClass}
                                    placeholder="ชื่อผู้ติดต่อ"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-gray-700">เบอร์โทร</label>
                                <input
                                    type="tel"
                                    name="customerPhone"
                                    value={form.customerPhone}
                                    onChange={handleChange}
                                    className={inputClass}
                                    placeholder="0xx-xxx-xxxx"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium text-gray-700">ที่อยู่</label>
                                <input
                                    type="text"
                                    name="customerAddress"
                                    value={form.customerAddress}
                                    onChange={handleChange}
                                    className={inputClass}
                                    placeholder="ที่อยู่"
                                />
                            </div>
                        </div>
                    </section>

                    {/* Items */}
                    <section className="space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-semibold text-gray-800">รายการสินค้า</h3>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setShowProductPicker(true)}
                                    className="flex items-center gap-1 px-3 py-1.5 text-sm bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200"
                                >
                                    <Package className="w-4 h-4" />
                                    เลือกจากเมนู
                                </button>
                                <button
                                    onClick={addItem}
                                    className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
                                >
                                    <Plus className="w-4 h-4" />
                                    เพิ่มเอง
                                </button>
                            </div>
                        </div>

                        {/* Product Picker Modal */}
                        {showProductPicker && (
                            <div className="border-2 border-amber-200 bg-amber-50 rounded-xl p-4 space-y-3">
                                <div className="flex justify-between items-center">
                                    <h4 className="font-semibold text-amber-800">เลือกจากเมนู</h4>
                                    <button onClick={() => setShowProductPicker(false)} className="text-gray-500 hover:text-gray-700">
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                                        <input
                                            type="text"
                                            placeholder="ค้นหาสินค้า..."
                                            value={productSearch}
                                            onChange={(e) => setProductSearch(e.target.value)}
                                            className="w-full pl-9 pr-3 py-2 border rounded-lg"
                                        />
                                    </div>
                                    <select
                                        value={selectedCategory}
                                        onChange={(e) => setSelectedCategory(e.target.value)}
                                        className="px-3 py-2 border rounded-lg"
                                    >
                                        {categories.map(cat => (
                                            <option key={cat} value={cat}>
                                                {cat === 'all' ? 'ทุกหมวด' : cat}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="max-h-60 overflow-y-auto space-y-1">
                                    {filteredProducts.length === 0 ? (
                                        <p className="text-center text-gray-400 py-4">ไม่พบสินค้า</p>
                                    ) : (
                                        filteredProducts.map(product => (
                                            <div key={product.id} className="bg-white rounded-lg p-2">
                                                <div className="font-medium text-gray-800">{product.name}</div>
                                                {product.variants && product.variants.length > 0 ? (
                                                    <div className="flex flex-wrap gap-1 mt-1">
                                                        {product.variants.map((v: any) => (
                                                            <button
                                                                key={v.id}
                                                                onClick={() => addProductItem(product, v)}
                                                                className="text-xs px-2 py-1 bg-amber-100 text-amber-700 rounded hover:bg-amber-200"
                                                            >
                                                                {v.name} - ฿{v.price}
                                                            </button>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={() => addProductItem(product)}
                                                        className="text-xs px-2 py-1 bg-amber-100 text-amber-700 rounded hover:bg-amber-200 mt-1"
                                                    >
                                                        เลือก - ฿{product.variants?.[0]?.price || 0}
                                                    </button>
                                                )}
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}

                        {items.length === 0 ? (
                            <p className="text-center text-gray-400 py-4">ยังไม่มีรายการ</p>
                        ) : (
                            <table className="w-full">
                                <thead>
                                    <tr className="text-left text-sm text-gray-600 bg-gray-50">
                                        <th className="px-3 py-2">ชื่อรายการ</th>
                                        <th className="px-3 py-2">รายละเอียด</th>
                                        <th className="px-3 py-2 w-20">จำนวน</th>
                                        <th className="px-3 py-2 w-28">ราคา/หน่วย</th>
                                        <th className="px-3 py-2 w-28">รวม</th>
                                        <th className="px-3 py-2 w-10"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map((item, idx) => (
                                        <tr key={idx} className="border-b">
                                            <td className="px-2 py-2">
                                                <input
                                                    type="text"
                                                    value={item.name}
                                                    onChange={(e) => updateItem(idx, 'name', e.target.value)}
                                                    className="w-full px-2 py-1 border rounded"
                                                    placeholder="ชื่อ"
                                                />
                                            </td>
                                            <td className="px-2 py-2">
                                                <input
                                                    type="text"
                                                    value={item.description}
                                                    onChange={(e) => updateItem(idx, 'description', e.target.value)}
                                                    className="w-full px-2 py-1 border rounded"
                                                    placeholder="รายละเอียด"
                                                />
                                            </td>
                                            <td className="px-2 py-2">
                                                <input
                                                    type="number"
                                                    value={item.quantity}
                                                    onChange={(e) => updateItem(idx, 'quantity', parseInt(e.target.value) || 0)}
                                                    className="w-full px-2 py-1 border rounded text-center"
                                                    min={1}
                                                />
                                            </td>
                                            <td className="px-2 py-2">
                                                <input
                                                    type="number"
                                                    value={item.unitPrice}
                                                    onChange={(e) => updateItem(idx, 'unitPrice', parseFloat(e.target.value) || 0)}
                                                    className="w-full px-2 py-1 border rounded text-right"
                                                    min={0}
                                                />
                                            </td>
                                            <td className="px-2 py-2 text-right font-medium">
                                                ฿{item.lineTotal.toLocaleString()}
                                            </td>
                                            <td className="px-2 py-2">
                                                <button onClick={() => removeItem(idx)} className="text-red-500 hover:text-red-700">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </section>

                    {/* Pricing */}
                    <section className="bg-gray-50 rounded-lg p-4 space-y-3">
                        <div className="flex justify-between">
                            <span>รวม</span>
                            <span className="font-medium">฿{subtotal.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <label className="text-sm">ส่วนลด</label>
                            <input
                                type="number"
                                name="discountAmount"
                                value={form.discountAmount}
                                onChange={handleChange}
                                className="w-32 px-2 py-1 border rounded text-right"
                                min={0}
                            />
                            <input
                                type="text"
                                name="discountNote"
                                value={form.discountNote}
                                onChange={handleChange}
                                className="flex-1 px-2 py-1 border rounded"
                                placeholder="หมายเหตุส่วนลด"
                            />
                        </div>
                        <div className="flex justify-between text-xl font-bold text-blue-700 border-t pt-3">
                            <span>รวมทั้งหมด</span>
                            <span>฿{totalPrice.toLocaleString()}</span>
                        </div>
                    </section>

                    {/* Conditions */}
                    <section>
                        <label className="text-sm font-medium text-gray-700">เงื่อนไข</label>
                        <textarea
                            name="conditions"
                            value={form.conditions}
                            onChange={handleChange}
                            className={inputClass}
                            rows={3}
                        />
                    </section>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-between">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                    >
                        ยกเลิก
                    </button>
                    <div className="flex gap-3">
                        <button
                            onClick={handleSubmit}
                            disabled={isSaving}
                            className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50"
                        >
                            {isSaving ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    กำลังบันทึก...
                                </>
                            ) : (
                                <>
                                    <Save className="w-4 h-4" />
                                    บันทึก
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
