import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Store, Calendar, Tag, Package, CheckCircle, Clock, AlertCircle, Trash2, Printer, ChevronRight, Info, Receipt } from 'lucide-react';
import { ConsignmentOrder, ConsignmentOrderStatus } from '../../../types';
import { useStore } from '../../store';
import { ConsignmentThermalReceipt } from './ConsignmentThermalReceipt';

interface ConsignmentDetailsModalProps {
    order: ConsignmentOrder;
    onClose: () => void;
    onSettleClick?: (order: ConsignmentOrder) => void;
}

const statusConfig: Record<ConsignmentOrderStatus, { label: string; color: string; icon: React.ReactNode }> = {
    pending: { label: 'รอส่งของ', color: 'bg-yellow-50 text-yellow-700 border-yellow-100', icon: <Clock className="w-4 h-4" /> },
    shipped: { label: 'ส่งของแล้ว (รอเคลียร์)', color: 'bg-blue-50 text-blue-700 border-blue-100', icon: <TruckIcon /> },
    settled: { label: 'เคลียร์ยอดสำเร็จ', color: 'bg-emerald-50 text-emerald-700 border-emerald-100', icon: <CheckCircle className="w-4 h-4" /> },
    cancelled: { label: 'ยกเลิกบิล', color: 'bg-rose-50 text-rose-700 border-rose-100', icon: <AlertCircle className="w-4 h-4" /> }
};

function TruckIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
            <rect x="1" y="3" width="15" height="13" rx="2" ry="2"></rect>
            <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"></polygon>
            <circle cx="5.5" cy="18.5" r="2.5"></circle>
            <circle cx="18.5" cy="18.5" r="2.5"></circle>
        </svg>
    );
}

export const ConsignmentDetailsModal: React.FC<ConsignmentDetailsModalProps> = ({ order, onClose, onSettleClick }) => {
    const { deleteConsignmentOrder } = useStore();
    const [showThermalSlip, setShowThermalSlip] = useState(false);

    const handleDelete = async () => {
        let confirmMsg = `ต้องการลบและยกเลิกบิล ${order.orderNumber} หรือไม่?`;
        if (order.status === 'shipped') {
            confirmMsg = `⚠️ คำเตือน: บิลนี้ถูกส่งของไปแล้ว (หักสต็อกวัตถุดิบแล้ว)\n\nหากลบบิลนี้ ยอดสต็อกวัตถุดิบที่หักไปแล้วจะไม่คืนกลับอัตโนมัติ\nคุณต้องการลบบิล ${order.orderNumber} จริงหรือไม่?`;
        } else if (order.status === 'settled') {
            confirmMsg = `⚠️ คำเตือนร้ายแรง: บิลนี้เคลียร์ยอดและลงบัญชีกำไรแล้ว!\n\nหากลบบิลนี้:\n1. บิลฝากขายจะถูกลบออกถาวร\n2. กำไรที่รอจัดสรรจากการเคลียร์บิลนี้จะถูกลบออกจากการเงินโดยอัตโนมัติ\n3. รายงานการขายและประวัติสต็อกหน้าร้านจะยังคงเดิม\n\nคุณต้องการลบบิลที่เคลียร์ยอดแล้ว ${order.orderNumber} จริงหรือไม่?`;
        }

        if (window.confirm(confirmMsg)) {
            try {
                await deleteConsignmentOrder(order.id);
                onClose();
            } catch (err) {
                console.error(err);
                alert('เกิดข้อผิดพลาดในการลบบิล');
            }
        }
    };

    const handlePrint = () => {
        setShowThermalSlip(true);
    };

    const sellThroughPercent = order.totalQuantitySent > 0 
        ? (order.totalQuantitySold / order.totalQuantitySent) * 100 
        : 0;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4 print:relative print:p-0 print:inset-auto">
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm print:hidden"
                    onClick={onClose}
                />
                
                {/* Modal Container */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 50 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 50 }}
                    transition={{ type: "spring", damping: 25, stiffness: 350 }}
                    className="relative w-full max-w-4xl bg-white rounded-t-3xl md:rounded-[2rem] shadow-2xl overflow-hidden max-h-[90vh] md:max-h-[85vh] flex flex-col z-10 print:shadow-none print:rounded-none print:max-h-none print:w-full print:relative print:inset-auto"
                >
                    {/* Header */}
                    <div className="bg-stone-900 text-white p-6 flex justify-between items-center shrink-0 print:bg-white print:text-stone-900 print:border-b print:p-4">
                        <div className="space-y-1">
                            <span className="text-[10px] bg-white/20 text-white/90 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider print:border print:border-stone-400 print:text-stone-700 print:bg-stone-100">
                                ใบส่งสินค้าฝากขาย / ส่งสาขา
                            </span>
                            <h2 className="text-2xl font-black tracking-tight flex items-center gap-2 print:text-lg">
                                <Store size={22} className="text-emerald-400 print:text-stone-800" />
                                {order.shopName}
                            </h2>
                            <p className="text-xs text-stone-400 font-semibold print:text-stone-600">เลขที่บิล: {order.orderNumber}</p>
                        </div>
                        <div className="flex gap-2 print:hidden">
                            <button
                                onClick={handlePrint}
                                className="p-2.5 hover:bg-stone-800 rounded-xl transition-colors text-stone-300 hover:text-white"
                                title="พิมพ์เอกสาร"
                            >
                                <Printer size={20} />
                            </button>
                            <button
                                onClick={onClose}
                                className="p-2.5 hover:bg-stone-800 rounded-xl transition-colors text-stone-300 hover:text-white"
                                aria-label="ปิด"
                            >
                                <X size={20} />
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-6 print:overflow-visible print:p-4">
                        {/* Info cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 print:grid-cols-3">
                            <div className="bg-stone-50 p-4 rounded-2xl border border-stone-100 flex items-center gap-3">
                                <Calendar className="text-stone-400 shrink-0" size={20} />
                                <div>
                                    <p className="text-[10px] font-semibold text-stone-400 uppercase">วันที่ส่งของ</p>
                                    <p className="text-sm font-bold text-stone-700">
                                        {new Date(order.deliveryDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}
                                    </p>
                                </div>
                            </div>
                            
                            <div className="bg-stone-50 p-4 rounded-2xl border border-stone-100 flex items-center gap-3">
                                <Clock className="text-stone-400 shrink-0" size={20} />
                                <div>
                                    <p className="text-[10px] font-semibold text-stone-400 uppercase">วันที่เคลียร์ยอด</p>
                                    <p className="text-sm font-bold text-stone-700">
                                        {order.settleDate 
                                            ? new Date(order.settleDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })
                                            : 'ยังไม่เคลียร์ยอด'
                                        }
                                    </p>
                                </div>
                            </div>

                            <div className="bg-stone-50 p-4 rounded-2xl border border-stone-100 flex items-center gap-3">
                                <span className={`px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1 border ${statusConfig[order.status].color} w-fit`}>
                                    {statusConfig[order.status].icon}
                                    {statusConfig[order.status].label}
                                </span>
                            </div>
                        </div>

                        {/* Customer contact */}
                        {(order.contactName || order.contactPhone) && (
                            <div className="p-4 bg-stone-50 rounded-2xl border border-stone-100 text-xs text-stone-500 space-y-1 print:text-[10px]">
                                <h4 className="font-bold text-stone-700 mb-1">ข้อมูลผู้รับสินค้า</h4>
                                {order.contactName && <p>ผู้รับ/ผู้ติดต่อ: {order.contactName}</p>}
                                {order.contactPhone && <p>เบอร์ติดต่อ: {order.contactPhone}</p>}
                            </div>
                        )}

                        {/* Items Table */}
                        <div className="border border-stone-200 rounded-2xl overflow-hidden shadow-sm bg-white">
                            <table className="w-full text-left text-sm print:text-xs">
                                <thead className="bg-stone-50 border-b border-stone-200 text-stone-600 font-bold">
                                    <tr>
                                        <th className="px-4 py-3">สินค้า</th>
                                        <th className="px-4 py-3 text-center w-20">จำนวนส่ง</th>
                                        {order.status === 'settled' && (
                                            <>
                                                <th className="px-4 py-3 text-center w-16">ขายได้</th>
                                                <th className="px-4 py-3 text-center w-16">เสีย</th>
                                                <th className="px-4 py-3 text-center w-16">แจก</th>
                                                <th className="px-4 py-3 text-center w-16">คืน</th>
                                            </>
                                        )}
                                        <th className="px-4 py-3 text-right w-28">ราคา/ชิ้น (฿)</th>
                                        <th className="px-4 py-3 text-right w-28">ราคารวม (฿)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-stone-100">
                                    {order.items.map(item => (
                                        <tr key={item.id} className="hover:bg-stone-50">
                                            <td className="px-4 py-3">
                                                <div className="font-semibold text-stone-800">{item.productName}</div>
                                                {item.variantName && <div className="text-xs text-stone-400">{item.variantName}</div>}
                                            </td>
                                            <td className="px-4 py-3 text-center font-bold text-stone-800 bg-stone-50/50">{item.quantitySent}</td>
                                            {order.status === 'settled' && (
                                                <>
                                                    <td className="px-4 py-3 text-center font-bold text-emerald-600 bg-emerald-50/20">{item.quantitySold}</td>
                                                    <td className="px-4 py-3 text-center font-semibold text-rose-500 bg-rose-50/10">{item.quantityWaste}</td>
                                                    <td className="px-4 py-3 text-center font-semibold text-amber-500 bg-amber-50/10">{item.quantityGiveaway}</td>
                                                    <td className="px-4 py-3 text-center font-semibold text-blue-500 bg-blue-50/10">{item.quantityReturned}</td>
                                                </>
                                            )}
                                            <td className="px-4 py-3 text-right font-medium text-stone-500">฿{item.unitPrice.toLocaleString()}</td>
                                            <td className="px-4 py-3 text-right font-bold text-stone-800">
                                                ฿{(order.status === 'settled' ? (item.quantitySold * item.unitPrice) : (item.quantitySent * item.unitPrice)).toLocaleString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Summary panel */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:grid-cols-2">
                            {/* Notes */}
                            <div className="space-y-2">
                                <h4 className="font-bold text-stone-700 text-sm">หมายเหตุบิล</h4>
                                <div className="p-4 bg-stone-50 rounded-2xl border border-stone-100 min-h-[80px] text-sm text-stone-600 leading-relaxed">
                                    {order.notes || 'ไม่มีหมายเหตุเพิ่มเติม'}
                                </div>
                            </div>

                            {/* Financial Reconciliation */}
                            <div className="bg-stone-50 rounded-3xl p-5 border border-stone-200 space-y-3 print:border-none print:p-0">
                                <h4 className="font-bold text-stone-800 text-sm border-b pb-2">สรุปรายการยอดเงิน</h4>
                                
                                {order.status === 'settled' ? (
                                    <>
                                        <div className="flex justify-between text-xs font-semibold text-stone-500">
                                            <span>ยอดส่งทั้งหมด</span>
                                            <span>{order.totalQuantitySent} ชิ้น</span>
                                        </div>
                                        <div className="flex justify-between text-xs font-semibold text-stone-500">
                                            <span>ยอดขายจริง ({sellThroughPercent.toFixed(1)}%)</span>
                                            <span className="text-emerald-600">{order.totalQuantitySold} ชิ้น</span>
                                        </div>
                                        <div className="flex justify-between text-xs font-semibold text-stone-500 border-b pb-2">
                                            <span>ของเสีย / แจก / คืน</span>
                                            <span>{order.totalQuantityWaste} / {order.totalQuantityGiveaway} / {order.totalQuantityReturned} ชิ้น</span>
                                        </div>
                                        <div className="flex justify-between text-sm font-bold text-stone-700">
                                            <span>ยอดขายรวม</span>
                                            <span>฿{order.totalRevenue.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between text-sm font-bold text-stone-500">
                                            <span>ต้นทุนรวม (COGS)</span>
                                            <span>฿{order.totalCost.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between text-lg font-black text-emerald-600 border-t pt-2">
                                            <span>กำไรสุทธิ</span>
                                            <span>฿{order.totalProfit.toLocaleString()}</span>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="flex justify-between text-sm font-bold text-stone-700">
                                            <span>จำนวนชิ้นส่งรวม</span>
                                            <span>{order.totalQuantitySent} ชิ้น</span>
                                        </div>
                                        <div className="flex justify-between text-lg font-black text-stone-800 border-t pt-2">
                                            <span>ยอดเงินฝากขายประเมิน</span>
                                            <span>
                                                ฿{order.items.reduce((sum, item) => sum + (item.quantitySent * item.unitPrice), 0).toLocaleString()}
                                            </span>
                                        </div>
                                        <div className="p-3 bg-amber-50 rounded-2xl border border-amber-100 text-[10px] text-amber-700 leading-normal flex items-start gap-1.5 mt-2">
                                            <Info size={14} className="shrink-0 mt-0.5" />
                                            <span>ยอดขายจริงและกำไรสุทธิจะอัปเดตหลังจากสาขาทำการ "เคลียร์ยอดบิล" แล้ว</span>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="bg-stone-50 p-6 border-t border-stone-200 flex justify-between shrink-0 print:hidden">
                        <div>
                            <button
                                onClick={handleDelete}
                                className="px-5 py-2.5 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-xl text-sm font-bold transition-colors flex items-center gap-2 min-h-[44px]"
                            >
                                <Trash2 size={16} />
                                ลบบิลฝากขาย
                            </button>
                        </div>
                        
                        <div className="flex gap-3">
                            <button
                                onClick={onClose}
                                className="px-6 py-2.5 rounded-xl font-bold text-stone-600 hover:bg-stone-200 transition-colors min-h-[44px]"
                            >
                                ปิดหน้าต่าง
                            </button>
                            {order.status === 'shipped' && onSettleClick && (
                                <button
                                    onClick={() => onSettleClick(order)}
                                    className="px-8 py-2.5 bg-emerald-500 text-white font-bold hover:bg-emerald-600 rounded-xl transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2 min-h-[44px] hover:-translate-y-0.5 active:translate-y-0"
                                >
                                    <CheckCircle size={16} />
                                    เริ่มเคลียร์ยอดบิล
                                    <ChevronRight size={16} />
                                </button>
                            )}
                        </div>
                    </div>
                </motion.div>
            </div>

            {/* Thermal Receipt Print Modal (57mm) */}
            {showThermalSlip && (
                <ConsignmentThermalReceipt
                    order={order}
                    onClose={() => setShowThermalSlip(false)}
                />
            )}
        </AnimatePresence>
    );
};
