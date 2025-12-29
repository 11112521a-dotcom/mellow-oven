import React, { useState, useEffect, useMemo } from 'react';
import { X, Package, Check, AlertCircle } from 'lucide-react';
import { Product, BundleConfig, BundleSelectionSnapshot } from '../../../types';
import { useStore } from '../../store';
import { formatCurrency } from '../../lib/utils';

interface SnackBoxBuilderProps {
    product: Product;
    initialSelections?: BundleSelectionSnapshot;
    quantity?: number;
    onComplete: (selections: BundleSelectionSnapshot, totalPrice: number, quantity: number) => void;
    onCancel: () => void;
}

export const SnackBoxBuilder: React.FC<SnackBoxBuilderProps> = ({
    product,
    initialSelections,
    quantity: initialQuantity = 1,
    onComplete,
    onCancel
}) => {
    const { products } = useStore();
    const config = product.bundleConfig as BundleConfig;

    // State สำหรับ Selection ของแต่ละ Slot
    const [selections, setSelections] = useState<Record<string, string>>(() => {
        // Initialize from initialSelections if available (for Edit mode)
        if (initialSelections) {
            const initial: Record<string, string> = {};
            Object.keys(initialSelections).forEach((slotId) => {
                const data = initialSelections[slotId];
                initial[slotId] = data.productId;
            });
            return initial;
        }
        return {};
    });

    const [quantity, setQuantity] = useState(initialQuantity);
    const [totalPrice, setTotalPrice] = useState(config.basePrice);

    // คำนวณราคาทุกครั้งที่เลือกของเปลี่ยน
    useEffect(() => {
        let price = config.basePrice;
        config.slots.forEach(slot => {
            const selectedProductId = selections[slot.id];
            if (selectedProductId) {
                const option = slot.options.find(o => o.productId === selectedProductId);
                if (option) price += option.surcharge;
            }
        });
        setTotalPrice(price);
    }, [selections, config]);

    // ตรวจสอบว่าเลือกครบทุก Required Slot หรือยัง
    const missingSlots = useMemo(() => {
        return config.slots.filter(s => s.required && !selections[s.id]);
    }, [config.slots, selections]);

    const isValid = missingSlots.length === 0 && quantity > 0;

    // Handle เลือก Option
    const handleSelect = (slotId: string, productId: string) => {
        setSelections(prev => ({ ...prev, [slotId]: productId }));
    };

    // Handle Save
    const handleSave = () => {
        if (!isValid) return;

        // สร้าง Snapshot สำหรับ Historical Data Protection
        const snapshot: BundleSelectionSnapshot = {};

        config.slots.forEach(slot => {
            const selectedProductId = selections[slot.id];
            if (selectedProductId) {
                const option = slot.options.find(o => o.productId === selectedProductId);
                const subProduct = products.find(p => p.id === selectedProductId);

                if (option) {
                    snapshot[slot.id] = {
                        productId: selectedProductId,
                        productName: option.name || subProduct?.name || 'Unknown',
                        unitCost: subProduct?.cost || 0,
                        surcharge: option.surcharge
                    };
                }
            }
        });

        onComplete(snapshot, totalPrice, quantity);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="bg-gradient-to-r from-orange-500 to-amber-500 px-6 py-4 flex items-center justify-between text-white">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/20 rounded-xl">
                            <Package size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold">จัดชุด {product.name}</h2>
                            <p className="text-orange-100 text-sm">เลือกของใส่กล่อง</p>
                        </div>
                    </div>
                    <button onClick={onCancel} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Body - Scrollable */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {config.slots.map(slot => (
                        <div key={slot.id} className="space-y-3">
                            {/* Slot Header */}
                            <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-lg text-cafe-800">{slot.title}</h3>
                                {slot.required && (
                                    <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">
                                        จำเป็น
                                    </span>
                                )}
                                {selections[slot.id] && (
                                    <Check size={18} className="text-green-500" />
                                )}
                            </div>

                            {/* Options Grid */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                {slot.options.map(option => {
                                    const isSelected = selections[slot.id] === option.productId;
                                    return (
                                        <button
                                            key={option.id}
                                            onClick={() => handleSelect(slot.id, option.productId)}
                                            className={`p-4 rounded-xl border-2 text-left transition-all ${isSelected
                                                ? 'border-orange-500 bg-gradient-to-br from-orange-50 to-amber-50 shadow-md ring-2 ring-orange-200'
                                                : 'border-stone-200 hover:border-orange-300 hover:bg-orange-50/50'
                                                }`}
                                        >
                                            <div className="font-medium text-cafe-800">{option.name}</div>
                                            {option.surcharge > 0 && (
                                                <div className="text-sm text-orange-600 font-semibold mt-1">
                                                    +{option.surcharge} บาท
                                                </div>
                                            )}
                                            {option.surcharge === 0 && (
                                                <div className="text-sm text-stone-400 mt-1">
                                                    ราคาปกติ
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ))}

                    {/* Quantity Input */}
                    <div className="border-t pt-6">
                        <div className="flex items-center justify-between">
                            <label className="font-semibold text-cafe-800">จำนวน (กล่อง)</label>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setQuantity(q => Math.max(1, q - 1))}
                                    className="w-10 h-10 rounded-lg bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-xl font-bold"
                                >
                                    -
                                </button>
                                <input
                                    type="number"
                                    value={quantity}
                                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                                    className="w-20 h-10 text-center border-2 border-stone-200 rounded-lg font-bold text-lg focus:border-orange-400 focus:ring-2 focus:ring-orange-200"
                                    min={1}
                                />
                                <button
                                    onClick={() => setQuantity(q => q + 1)}
                                    className="w-10 h-10 rounded-lg bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-xl font-bold"
                                >
                                    +
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="border-t bg-stone-50 px-6 py-4">
                    {/* Validation Warning */}
                    {missingSlots.length > 0 && (
                        <div className="mb-4 flex items-center gap-2 text-amber-600 bg-amber-50 px-4 py-2 rounded-lg">
                            <AlertCircle size={18} />
                            <span className="text-sm font-medium">
                                กรุณาเลือก: {missingSlots.map(s => s.title).join(', ')}
                            </span>
                        </div>
                    )}

                    <div className="flex items-center justify-between">
                        {/* Price Summary */}
                        <div>
                            <p className="text-sm text-stone-500">ราคาต่อชุด</p>
                            <p className="text-2xl font-bold text-orange-600">{formatCurrency(totalPrice)}</p>
                            {quantity > 1 && (
                                <p className="text-sm text-stone-500">
                                    รวม {quantity} ชุด = <span className="font-semibold text-cafe-800">{formatCurrency(totalPrice * quantity)}</span>
                                </p>
                            )}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-3">
                            <button
                                onClick={onCancel}
                                className="px-5 py-2.5 text-stone-600 hover:bg-stone-200 rounded-xl transition-colors font-medium"
                            >
                                ยกเลิก
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={!isValid}
                                className={`px-6 py-2.5 rounded-xl font-bold transition-all shadow-lg ${isValid
                                    ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white hover:from-orange-600 hover:to-amber-600 hover:shadow-xl active:scale-95'
                                    : 'bg-stone-300 text-stone-500 cursor-not-allowed'
                                    }`}
                            >
                                ยืนยันการเลือก
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SnackBoxBuilder;
