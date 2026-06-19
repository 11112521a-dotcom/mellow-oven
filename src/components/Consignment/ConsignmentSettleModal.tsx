import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle, Package } from 'lucide-react';
import { useStore } from '../../store';
import { ConsignmentOrder, ConsignmentOrderItem } from '../../../types';

interface ConsignmentSettleModalProps {
    order: ConsignmentOrder;
    onClose: () => void;
}

export const ConsignmentSettleModal: React.FC<ConsignmentSettleModalProps> = ({ order, onClose }) => {
    const { settleConsignmentOrder } = useStore();
    
    // Local state for editing quantities
    const [items, setItems] = useState<{
        id: string;
        quantitySold: number;
        quantityWaste: number;
        quantityReturned: number;
        quantityGiveaway: number;
        lineTotal: number;
    }[]>(order.items.map(item => ({
        id: item.id,
        quantitySold: item.quantitySent, // Default assume all sold
        quantityWaste: 0,
        quantityReturned: 0,
        quantityGiveaway: 0,
        lineTotal: item.quantitySent * item.unitPrice
    })));

    const [settleDate, setSettleDate] = useState(new Date().toISOString().split('T')[0]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleQuantityChange = (itemId: string, field: 'quantitySold' | 'quantityWaste' | 'quantityReturned' | 'quantityGiveaway', value: string) => {
        const val = parseInt(value) || 0;
        
        setItems(prevItems => prevItems.map(item => {
            if (item.id === itemId) {
                const originalItem = order.items.find(i => i.id === itemId)!;
                let newSold = item.quantitySold;
                let newWaste = item.quantityWaste;
                let newReturned = item.quantityReturned;
                let newGiveaway = item.quantityGiveaway;

                if (field === 'quantitySold') newSold = val;
                if (field === 'quantityWaste') newWaste = val;
                if (field === 'quantityReturned') newReturned = val;
                if (field === 'quantityGiveaway') newGiveaway = val;

                // Auto-adjust if total exceeds sent
                const total = newSold + newWaste + newReturned + newGiveaway;
                if (total > originalItem.quantitySent) {
                    if (field === 'quantitySold') {
                        newWaste = 0;
                        newGiveaway = 0;
                        newReturned = Math.max(0, originalItem.quantitySent - newSold);
                    } else if (field === 'quantityReturned') {
                        newSold = Math.max(0, originalItem.quantitySent - newReturned - newWaste - newGiveaway);
                    } else if (field === 'quantityWaste') {
                        newSold = Math.max(0, originalItem.quantitySent - newWaste - newReturned - newGiveaway);
                    } else if (field === 'quantityGiveaway') {
                        newSold = Math.max(0, originalItem.quantitySent - newGiveaway - newWaste - newReturned);
                    }
                }

                // If less, auto-fill returned
                if (field === 'quantitySold' || field === 'quantityWaste' || field === 'quantityGiveaway') {
                   newReturned = originalItem.quantitySent - newSold - newWaste - newGiveaway;
                   if (newReturned < 0) newReturned = 0;
                }

                return {
                    ...item,
                    quantitySold: newSold,
                    quantityWaste: newWaste,
                    quantityReturned: newReturned,
                    quantityGiveaway: newGiveaway,
                    lineTotal: newSold * originalItem.unitPrice
                };
            }
            return item;
        }));
    };

    // Quick fill row-level actions
    const handleSetRowSold = (itemId: string) => {
        setItems(prevItems => prevItems.map(item => {
            if (item.id === itemId) {
                const originalItem = order.items.find(i => i.id === itemId)!;
                return {
                    ...item,
                    quantitySold: originalItem.quantitySent,
                    quantityWaste: 0,
                    quantityReturned: 0,
                    quantityGiveaway: 0,
                    lineTotal: originalItem.quantitySent * originalItem.unitPrice
                };
            }
            return item;
        }));
    };

    const handleSetRowReturned = (itemId: string) => {
        setItems(prevItems => prevItems.map(item => {
            if (item.id === itemId) {
                const originalItem = order.items.find(i => i.id === itemId)!;
                return {
                    ...item,
                    quantitySold: 0,
                    quantityWaste: 0,
                    quantityReturned: originalItem.quantitySent,
                    quantityGiveaway: 0,
                    lineTotal: 0
                };
            }
            return item;
        }));
    };

    // Global quick fill actions for entire sheet
    const handleSetAllSold = () => {
        setItems(prevItems => prevItems.map(item => {
            const originalItem = order.items.find(i => i.id === item.id)!;
            return {
                ...item,
                quantitySold: originalItem.quantitySent,
                quantityWaste: 0,
                quantityReturned: 0,
                quantityGiveaway: 0,
                lineTotal: originalItem.quantitySent * originalItem.unitPrice
            };
        }));
    };

    const handleSetAllReturned = () => {
        setItems(prevItems => prevItems.map(item => {
            const originalItem = order.items.find(i => i.id === item.id)!;
            return {
                ...item,
                quantitySold: 0,
                quantityWaste: 0,
                quantityReturned: originalItem.quantitySent,
                quantityGiveaway: 0,
                lineTotal: 0
            };
        }));
    };

    const totalSold = items.reduce((sum, item) => sum + item.quantitySold, 0);
    const totalWaste = items.reduce((sum, item) => sum + item.quantityWaste, 0);
    const totalGiveaway = items.reduce((sum, item) => sum + item.quantityGiveaway, 0);
    const totalReturned = items.reduce((sum, item) => sum + item.quantityReturned, 0);
    const totalRevenue = items.reduce((sum, item) => sum + item.lineTotal, 0);

    const handleSubmit = async () => {
        setIsSubmitting(true);
        try {
            await settleConsignmentOrder(order.id, items, settleDate);
            onClose();
        } catch (error) {
            console.error('Failed to settle order:', error);
            alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm"
                    onClick={onClose}
                />
                
                <motion.div
                    initial={{ opacity: 0, y: 50, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 50, scale: 0.95 }}
                    transition={{ type: "spring", damping: 25, stiffness: 350 }}
                    className="relative w-full max-w-4xl h-[85vh] md:h-auto max-h-[90dvh] md:max-h-[85vh] bg-white rounded-t-3xl md:rounded-3xl shadow-2xl overflow-hidden flex flex-col z-10"
                >
                    {/* Header */}
                    <div className="bg-emerald-600 p-6 text-white shrink-0 flex justify-between items-center">
                        <div>
                            <h2 className="text-2xl font-bold flex items-center gap-2">
                                <CheckCircle className="w-6 h-6" />
                                เคลียร์ยอดฝากขาย / ส่งสาขา
                            </h2>
                            <p className="text-emerald-100 mt-1 text-xs sm:text-sm font-semibold">ร้าน: {order.shopName} | บิล: {order.orderNumber}</p>
                        </div>
                        <button onClick={onClose} className="p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center hover:bg-emerald-700 rounded-xl transition-colors">
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-5 space-y-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-stone-50 p-4 rounded-2xl border border-stone-200">
                            <div className="flex flex-wrap items-center gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-stone-500 mb-1">วันที่เคลียร์ยอด <span className="text-red-500">*</span></label>
                                    <input
                                        type="date"
                                        value={settleDate}
                                        onChange={e => setSettleDate(e.target.value)}
                                        className="px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 text-base md:text-sm bg-white"
                                    />
                                </div>
                                <div className="text-xs text-stone-400 font-semibold">
                                    วันที่ส่งของ: {new Date(order.deliveryDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })}
                                </div>
                            </div>

                            {/* Global Shortcuts */}
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="text-[11px] font-bold text-stone-400 uppercase">กรอกด่วนทั้งบิล:</span>
                                <button
                                    type="button"
                                    onClick={handleSetAllSold}
                                    className="px-3 py-1.5 bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-600/10 hover:-translate-y-0.5 active:translate-y-0"
                                >
                                    ขายได้ทั้งหมด
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSetAllReturned}
                                    className="px-3 py-1.5 bg-stone-250 text-stone-700 hover:bg-stone-300 rounded-xl text-xs font-bold transition-all border border-stone-300 hover:-translate-y-0.5 active:translate-y-0"
                                >
                                    รับคืนดีทั้งหมด
                                </button>
                            </div>
                        </div>

                        {/* Desktop Table View */}
                        <div className="hidden md:block border border-stone-200 rounded-2xl overflow-hidden shadow-sm bg-white">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-stone-100 border-b border-stone-200 text-stone-700">
                                    <tr>
                                        <th className="px-4 py-3 font-semibold">สินค้า</th>
                                        <th className="px-4 py-3 font-semibold text-center w-24">ยอดส่ง</th>
                                        <th className="px-4 py-3 font-semibold text-center w-24">ยอดขายได้</th>
                                        <th className="px-4 py-3 font-semibold text-center w-24">ของเสีย</th>
                                        <th className="px-4 py-3 font-semibold text-center w-24">แจก/กินเอง</th>
                                        <th className="px-4 py-3 font-semibold text-center w-24">รับคืน</th>
                                        <th className="px-4 py-3 text-right w-32">รวมเงิน (฿)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-stone-100">
                                    {order.items.map(item => {
                                        const currentState = items.find(i => i.id === item.id)!;
                                        return (
                                            <tr key={item.id} className="hover:bg-stone-50">
                                                <td className="px-4 py-3">
                                                    <div className="font-bold text-stone-850">{item.productName}</div>
                                                    {item.variantName && <div className="text-xs text-stone-500 font-semibold">{item.variantName}</div>}
                                                    <div className="text-xs text-emerald-600 mt-0.5">@ ฿{item.unitPrice}</div>
                                                    
                                                    {/* Row Shortcuts */}
                                                    <div className="flex gap-1.5 mt-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleSetRowSold(item.id)}
                                                            className="text-[10px] px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 rounded-lg font-bold transition-all"
                                                        >
                                                            ขายหมด
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleSetRowReturned(item.id)}
                                                            className="text-[10px] px-2 py-0.5 bg-stone-100 text-stone-600 border border-stone-250 hover:bg-stone-200 rounded-lg font-bold transition-all"
                                                        >
                                                            คืนหมด
                                                        </button>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-center font-bold text-blue-600 bg-blue-50/30">
                                                    {item.quantitySent}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        max={item.quantitySent}
                                                        value={currentState.quantitySold}
                                                        onChange={e => handleQuantityChange(item.id, 'quantitySold', e.target.value)}
                                                        className="w-full text-center py-1.5 border border-emerald-300 rounded focus:ring-1 focus:ring-emerald-500 bg-emerald-50 font-semibold text-base md:text-sm"
                                                    />
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        value={currentState.quantityWaste}
                                                        onChange={e => handleQuantityChange(item.id, 'quantityWaste', e.target.value)}
                                                        className="w-full text-center py-1.5 border border-rose-300 rounded focus:ring-1 focus:ring-rose-500 bg-rose-50 font-semibold text-base md:text-sm"
                                                    />
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        value={currentState.quantityGiveaway}
                                                        onChange={e => handleQuantityChange(item.id, 'quantityGiveaway', e.target.value)}
                                                        className="w-full text-center py-1.5 border border-amber-300 rounded focus:ring-1 focus:ring-amber-500 bg-amber-50 font-semibold text-base md:text-sm"
                                                    />
                                                </td>
                                                <td className="px-4 py-3 text-center font-bold text-stone-500">
                                                    {currentState.quantityReturned}
                                                </td>
                                                <td className="px-4 py-3 text-right font-bold text-emerald-700">
                                                    {currentState.lineTotal.toLocaleString()}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Mobile view - Product Cards List */}
                        <div className="space-y-4 md:hidden">
                            {order.items.map(item => {
                                const currentState = items.find(i => i.id === item.id)!;
                                return (
                                    <div key={item.id} className="bg-stone-50 border border-stone-200 rounded-2xl p-4 space-y-3 shadow-sm">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h4 className="font-bold text-stone-850">{item.productName}</h4>
                                                {item.variantName && <p className="text-xs text-stone-400 font-semibold">{item.variantName}</p>}
                                                <p className="text-xs text-emerald-600 font-bold mt-1">@ ฿{item.unitPrice}</p>
                                            </div>
                                            <div className="bg-blue-50 border border-blue-100 text-blue-700 px-3 py-1 rounded-xl text-center shrink-0">
                                                <p className="text-[9px] uppercase font-bold text-blue-500">ยอดส่ง</p>
                                                <p className="text-base font-black">{item.quantitySent}</p>
                                            </div>
                                        </div>
                                        
                                        {/* Row Shortcuts */}
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                onClick={() => handleSetRowSold(item.id)}
                                                className="flex-1 py-1.5 px-3 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-250 rounded-xl text-xs font-bold transition-all text-center min-h-[36px] flex items-center justify-center"
                                            >
                                                ขายหมด
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleSetRowReturned(item.id)}
                                                className="flex-1 py-1.5 px-3 bg-stone-100 text-stone-600 hover:bg-stone-200 border border-stone-250 rounded-xl text-xs font-bold transition-all text-center min-h-[36px] flex items-center justify-center"
                                            >
                                                คืนหมด
                                            </button>
                                        </div>

                                        <div className="grid grid-cols-3 gap-2.5">
                                            <div>
                                                <label className="block text-[10px] font-bold text-stone-450 uppercase mb-1">ขายได้</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max={item.quantitySent}
                                                    value={currentState.quantitySold}
                                                    onChange={e => handleQuantityChange(item.id, 'quantitySold', e.target.value)}
                                                    className="w-full text-center py-2.5 border border-emerald-300 rounded-xl focus:ring-2 focus:ring-emerald-500 bg-emerald-50/50 font-bold text-base md:text-sm"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-bold text-stone-450 uppercase mb-1">ของเสีย</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={currentState.quantityWaste}
                                                    onChange={e => handleQuantityChange(item.id, 'quantityWaste', e.target.value)}
                                                    className="w-full text-center py-2.5 border border-rose-300 rounded-xl focus:ring-2 focus:ring-rose-500 bg-rose-50/50 font-bold text-base md:text-sm"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-bold text-stone-450 uppercase mb-1">แจก/กิน</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={currentState.quantityGiveaway}
                                                    onChange={e => handleQuantityChange(item.id, 'quantityGiveaway', e.target.value)}
                                                    className="w-full text-center py-2.5 border border-amber-300 rounded-xl focus:ring-2 focus:ring-amber-500 bg-amber-50/50 font-bold text-base md:text-sm"
                                                />
                                            </div>
                                        </div>

                                        <div className="flex justify-between items-center pt-2.5 border-t border-stone-200 text-xs">
                                            <span className="text-stone-450 font-semibold">รับคืนดี: <strong className="text-stone-700 font-bold">{currentState.quantityReturned}</strong> ชิ้น</span>
                                            <span className="text-stone-450 font-semibold">ยอดเงิน: <strong className="text-emerald-600 font-bold text-sm">฿{currentState.lineTotal.toLocaleString()}</strong></span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Summary Grid */}
                        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                            <div className="bg-stone-50 p-3 rounded-2xl border border-stone-100 text-center">
                                <p className="text-[10px] sm:text-xs text-stone-400 font-bold">ส่งทั้งหมด</p>
                                <p className="text-lg sm:text-xl font-black text-stone-750">{order.totalQuantitySent}</p>
                            </div>
                            <div className="bg-emerald-50 p-3 rounded-2xl border border-emerald-100 text-center">
                                <p className="text-[10px] sm:text-xs text-emerald-600 font-bold">ขายได้รวม</p>
                                <p className="text-lg sm:text-xl font-black text-emerald-700">{totalSold}</p>
                            </div>
                            <div className="bg-rose-50 p-3 rounded-2xl border border-rose-100 text-center">
                                <p className="text-[10px] sm:text-xs text-rose-600 font-bold">เสีย/ทิ้ง</p>
                                <p className="text-lg sm:text-xl font-black text-rose-700">{totalWaste}</p>
                            </div>
                            <div className="bg-amber-50 p-3 rounded-2xl border border-amber-100 text-center">
                                <p className="text-[10px] sm:text-xs text-amber-600 font-bold">แจก/กิน</p>
                                <p className="text-lg sm:text-xl font-black text-amber-700">{totalGiveaway}</p>
                            </div>
                            <div className="bg-blue-50 p-3 rounded-2xl border border-blue-100 text-center col-span-3 sm:col-span-1">
                                <p className="text-[10px] sm:text-xs text-blue-600 font-bold">รับคืนดี</p>
                                <p className="text-lg sm:text-xl font-black text-blue-700">{totalReturned}</p>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="bg-stone-50 p-5 border-t border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
                        <div>
                            <p className="text-xs font-bold text-stone-400 uppercase">ยอดเงินที่ต้องรับ</p>
                            <p className="text-2xl sm:text-3xl font-black text-emerald-600">฿{totalRevenue.toLocaleString()}</p>
                        </div>
                        <div className="flex gap-3 w-full sm:w-auto">
                            <button
                                onClick={onClose}
                                className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl font-bold text-stone-600 hover:bg-stone-200 transition-colors min-h-[44px] flex items-center justify-center text-base md:text-sm"
                            >
                                ยกเลิก
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                                className="flex-[2] sm:flex-none px-8 py-2.5 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 min-h-[44px] text-base md:text-sm"
                            >
                                {isSubmitting ? 'กำลังบันทึก...' : 'ยืนยันเคลียร์ยอด'}
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};
