import React, { useState, useMemo } from 'react';
import { X, Package, Plus, Trash2, Copy, Edit2 } from 'lucide-react';
import { useStore } from '@/src/store';
import { formatCurrency } from '@/src/lib/utils';
import { Product, BundleSelectionSnapshot, SpecialOrderStatus } from '../../../types';
import { SnackBoxBuilder } from '../POS/SnackBoxBuilder';

interface CreateBundleOrderModalProps {
    isOpen: boolean;
    onClose: () => void;
}

interface OrderLine {
    id: string;
    product: Product;
    selections: BundleSelectionSnapshot;
    unitPrice: number;
    quantity: number;
}

// Helper type for selection value
type SelectionValue = BundleSelectionSnapshot[string];

export const CreateBundleOrderModal: React.FC<CreateBundleOrderModalProps> = ({ isOpen, onClose }) => {
    const { products, addSpecialOrder } = useStore();

    // หาเฉพาะ Product ที่เป็น Bundle
    const bundleProducts = useMemo(() =>
        products.filter(p => p.bundleConfig?.isBundle),
        [products]
    );

    const [orderLines, setOrderLines] = useState<OrderLine[]>([]);
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const [deliveryDate, setDeliveryDate] = useState(new Date().toISOString().split('T')[0]);
    const [note, setNote] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // State สำหรับเปิด Builder
    const [showBuilder, setShowBuilder] = useState(false);
    const [builderProduct, setBuilderProduct] = useState<Product | null>(null);
    const [editingLineId, setEditingLineId] = useState<string | null>(null);
    const [editingSelections, setEditingSelections] = useState<BundleSelectionSnapshot | undefined>();

    // Summary
    const totalQuantity = orderLines.reduce((sum, line) => sum + line.quantity, 0);
    const totalRevenue = orderLines.reduce((sum, line) => sum + (line.unitPrice * line.quantity), 0);
    const totalCost = orderLines.reduce((sum, line) => {
        // คำนวณต้นทุนจาก selections
        let lineCost = 0;
        Object.keys(line.selections).forEach(key => {
            const sel = line.selections[key] as SelectionValue;
            lineCost += sel.unitCost;
        });
        return sum + (lineCost * line.quantity);
    }, 0);
    const grossProfit = totalRevenue - totalCost;

    // เปิด Builder สำหรับเพิ่ม Line ใหม่
    const handleAddBundle = (product: Product) => {
        setBuilderProduct(product);
        setEditingLineId(null);
        setEditingSelections(undefined);
        setShowBuilder(true);
    };

    // Builder completed - Add or Update Line
    const handleBuilderComplete = (selections: BundleSelectionSnapshot, totalPrice: number, quantity: number) => {
        if (editingLineId) {
            // Update existing line
            setOrderLines(lines => lines.map(line =>
                line.id === editingLineId
                    ? { ...line, selections, unitPrice: totalPrice, quantity }
                    : line
            ));
        } else if (builderProduct) {
            // Add new line
            const newLine: OrderLine = {
                id: crypto.randomUUID(),
                product: builderProduct,
                selections,
                unitPrice: totalPrice,
                quantity
            };
            setOrderLines(lines => [...lines, newLine]);
        }
        setShowBuilder(false);
        setBuilderProduct(null);
        setEditingLineId(null);
    };

    // Edit line
    const handleEditLine = (line: OrderLine) => {
        setBuilderProduct(line.product);
        setEditingLineId(line.id);
        setEditingSelections(line.selections);
        setShowBuilder(true);
    };

    // Duplicate line
    const handleDuplicateLine = (line: OrderLine) => {
        const newLine: OrderLine = {
            ...line,
            id: crypto.randomUUID()
        };
        setOrderLines(lines => [...lines, newLine]);
    };

    // Delete line
    const handleDeleteLine = (lineId: string) => {
        setOrderLines(lines => lines.filter(l => l.id !== lineId));
    };

    // Submit order
    const handleSubmit = async () => {
        if (orderLines.length === 0 || !deliveryDate) return;

        setIsSubmitting(true);
        try {
            // สร้าง items จาก orderLines
            const items = orderLines.map((line, idx) => {
                let lineCost = 0;
                Object.keys(line.selections).forEach(key => {
                    const sel = line.selections[key] as SelectionValue;
                    lineCost += sel.unitCost;
                });
                return {
                    productId: line.product.id,
                    productName: line.product.name,
                    quantity: line.quantity,
                    unitPrice: line.unitPrice,
                    unitCost: lineCost,
                    subtotalRevenue: line.unitPrice * line.quantity,
                    subtotalCost: lineCost * line.quantity,
                    subtotalProfit: (line.unitPrice - lineCost) * line.quantity,
                    sortOrder: idx,
                    selectedOptions: line.selections // ✅ เก็บ Snapshot
                };
            });

            await addSpecialOrder({
                orderDate: new Date().toISOString().split('T')[0],
                deliveryDate,
                orderType: 'bundle',
                customerName: customerName || undefined,
                customerPhone: customerPhone || undefined,
                customerNote: note || undefined,
                totalQuantity,
                totalRevenue,
                totalCost,
                grossProfit,
                status: 'pending' as SpecialOrderStatus,
                stockDeducted: false
            }, items);

            onClose();
        } catch (error) {
            console.error('Failed to create bundle order:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    // แสดง Builder
    if (showBuilder && builderProduct) {
        return (
            <SnackBoxBuilder
                product={builderProduct}
                initialSelections={editingSelections}
                quantity={editingLineId ? orderLines.find(l => l.id === editingLineId)?.quantity : 1}
                onComplete={handleBuilderComplete}
                onCancel={() => {
                    setShowBuilder(false);
                    setBuilderProduct(null);
                    setEditingLineId(null);
                }}
            />
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-stone-900/50 backdrop-blur-sm" onClick={onClose} />

            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="bg-gradient-to-r from-purple-500 to-indigo-500 px-6 py-4 flex items-center justify-between text-white">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/20 rounded-xl">
                            <Package size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold">สร้างออเดอร์ Snack Box</h2>
                            <p className="text-purple-100 text-sm">เลือกและจัดชุดสินค้า</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Add Bundle Buttons */}
                    <div>
                        <h3 className="font-semibold text-cafe-800 mb-3">เลือก Bundle ที่จะเพิ่ม</h3>
                        {bundleProducts.length === 0 ? (
                            <div className="text-center py-8 bg-stone-50 rounded-xl border-2 border-dashed border-stone-200">
                                <Package size={40} className="mx-auto text-stone-300 mb-2" />
                                <p className="text-stone-500">ยังไม่มี Bundle Template</p>
                                <p className="text-sm text-stone-400">สร้าง Product ที่มี bundle_config ก่อน</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-3">
                                {bundleProducts.map(product => (
                                    <button
                                        key={product.id}
                                        onClick={() => handleAddBundle(product)}
                                        className="p-4 rounded-xl border-2 border-stone-200 hover:border-purple-400 hover:bg-purple-50 transition-all text-left group"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="font-semibold text-cafe-800">{product.name}</p>
                                                <p className="text-sm text-stone-500">
                                                    ราคาเริ่มต้น {formatCurrency(product.bundleConfig?.basePrice || product.price)}
                                                </p>
                                            </div>
                                            <Plus size={20} className="text-purple-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Order Lines */}
                    {orderLines.length > 0 && (
                        <div>
                            <h3 className="font-semibold text-cafe-800 mb-3">รายการที่เลือก ({orderLines.length})</h3>
                            <div className="space-y-3">
                                {orderLines.map((line, idx) => (
                                    <div key={line.id} className="bg-stone-50 rounded-xl p-4 border border-stone-200">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="bg-purple-100 text-purple-700 text-xs font-bold px-2 py-0.5 rounded-full">
                                                        #{idx + 1}
                                                    </span>
                                                    <span className="font-semibold text-cafe-800">{line.product.name}</span>
                                                    <span className="text-stone-500">x {line.quantity}</span>
                                                </div>
                                                <div className="text-sm text-stone-600 space-y-1">
                                                    {Object.entries(line.selections).map(([slotId, selRaw]) => {
                                                        const sel = selRaw as SelectionValue;
                                                        return (
                                                            <div key={slotId} className="flex items-center gap-2">
                                                                <span className="text-stone-400">•</span>
                                                                <span>{sel.productName}</span>
                                                                {sel.surcharge > 0 && (
                                                                    <span className="text-orange-500 text-xs">(+{sel.surcharge})</span>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                                <div className="mt-2 text-sm font-medium text-purple-600">
                                                    {formatCurrency(line.unitPrice)} × {line.quantity} = {formatCurrency(line.unitPrice * line.quantity)}
                                                </div>
                                            </div>
                                            <div className="flex gap-1">
                                                <button
                                                    onClick={() => handleEditLine(line)}
                                                    className="p-2 hover:bg-stone-200 rounded-lg text-stone-500 transition-colors"
                                                    title="แก้ไข"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDuplicateLine(line)}
                                                    className="p-2 hover:bg-stone-200 rounded-lg text-stone-500 transition-colors"
                                                    title="คัดลอก"
                                                >
                                                    <Copy size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteLine(line.id)}
                                                    className="p-2 hover:bg-red-100 rounded-lg text-red-500 transition-colors"
                                                    title="ลบ"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Customer Info */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-cafe-700 mb-1">วันที่ส่ง</label>
                            <input
                                type="date"
                                value={deliveryDate}
                                onChange={(e) => setDeliveryDate(e.target.value)}
                                className="w-full border border-stone-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-purple-400 outline-none transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-cafe-700 mb-1">ชื่อลูกค้า</label>
                            <input
                                type="text"
                                value={customerName}
                                onChange={(e) => setCustomerName(e.target.value)}
                                placeholder="(ไม่บังคับ)"
                                className="w-full border border-stone-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-purple-400 outline-none transition-all"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-cafe-700 mb-1">เบอร์โทร</label>
                            <input
                                type="tel"
                                value={customerPhone}
                                onChange={(e) => setCustomerPhone(e.target.value)}
                                placeholder="(ไม่บังคับ)"
                                className="w-full border border-stone-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-purple-400 outline-none transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-cafe-700 mb-1">หมายเหตุ</label>
                            <input
                                type="text"
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                placeholder="(ไม่บังคับ)"
                                className="w-full border border-stone-200 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-purple-400 outline-none transition-all"
                            />
                        </div>
                    </div>
                </div>

                {/* Footer with Summary */}
                <div className="border-t bg-stone-50 px-6 py-4">
                    <div className="flex items-center justify-between mb-4">
                        <div className="space-y-1">
                            <div className="text-sm text-stone-500">
                                รวม {totalQuantity} ชุด • ต้นทุน {formatCurrency(totalCost)}
                            </div>
                            <div className="text-2xl font-bold text-purple-600">
                                รายได้ {formatCurrency(totalRevenue)}
                            </div>
                            <div className="text-sm text-green-600 font-medium">
                                กำไร {formatCurrency(grossProfit)} ({totalRevenue > 0 ? ((grossProfit / totalRevenue) * 100).toFixed(0) : 0}%)
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={onClose}
                                className="px-5 py-2.5 text-stone-600 hover:bg-stone-200 rounded-xl transition-colors font-medium"
                            >
                                ยกเลิก
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={orderLines.length === 0 || isSubmitting}
                                className={`px-6 py-2.5 rounded-xl font-bold transition-all shadow-lg ${orderLines.length > 0 && !isSubmitting
                                    ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white hover:from-purple-600 hover:to-indigo-600 hover:shadow-xl active:scale-95'
                                    : 'bg-stone-300 text-stone-500 cursor-not-allowed'
                                    }`}
                            >
                                {isSubmitting ? 'กำลังบันทึก...' : 'สร้างออเดอร์'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CreateBundleOrderModal;
