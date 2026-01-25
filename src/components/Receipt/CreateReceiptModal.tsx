// ============================================================
// Create Receipt Modal
// Modal to create receipt from quotation or invoice
// ============================================================

import React, { useState } from 'react';
import { useStore } from '../../store';
import { PaymentMethod } from '../../../types';
import { X, Receipt, CreditCard, Banknote, Landmark, HelpCircle, Loader2 } from 'lucide-react';

interface CreateReceiptModalProps {
    sourceType: 'quotation' | 'invoice';
    sourceId: string;
    onClose: () => void;
    onSuccess?: () => void;
}

const paymentMethods: { id: PaymentMethod; label: string; icon: React.ReactNode }[] = [
    { id: 'cash', label: 'เงินสด', icon: <Banknote size={20} /> },
    { id: 'transfer', label: 'โอนเงิน', icon: <Landmark size={20} /> },
    { id: 'credit', label: 'บัตรเครดิต', icon: <CreditCard size={20} /> },
    { id: 'other', label: 'อื่นๆ', icon: <HelpCircle size={20} /> }
];

export const CreateReceiptModal: React.FC<CreateReceiptModalProps> = ({
    sourceType,
    sourceId,
    onClose,
    onSuccess
}) => {
    const {
        shopInfo,
        createReceiptFromQuotation,
        createReceiptFromInvoice,
        fetchReceipts
    } = useStore();

    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('transfer');
    const [receivedBy, setReceivedBy] = useState(shopInfo?.ownerName || '');
    const [paymentNote, setPaymentNote] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    const handleSubmit = async () => {
        if (!receivedBy.trim()) {
            alert('กรุณาระบุผู้รับเงิน');
            return;
        }

        setIsCreating(true);
        try {
            let receipt = null;
            if (sourceType === 'quotation') {
                receipt = await createReceiptFromQuotation(sourceId, paymentMethod, receivedBy, paymentNote);
            } else {
                receipt = await createReceiptFromInvoice(sourceId, paymentMethod, receivedBy, paymentNote);
            }

            if (receipt) {
                await fetchReceipts();
                onSuccess?.();
                alert(`✅ สร้างใบเสร็จเรียบร้อย: ${receipt.receiptNumber}`);
            } else {
                alert('เกิดข้อผิดพลาดในการสร้างใบเสร็จ');
            }
        } catch (error) {
            console.error('Error creating receipt:', error);
            alert('เกิดข้อผิดพลาด');
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-4 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Receipt className="w-6 h-6" />
                        ออกใบเสร็จรับเงิน
                    </h2>
                    <button onClick={onClose} className="text-white/80 hover:text-white">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-5">
                    {/* Payment Method */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">วิธีชำระเงิน</label>
                        <div className="grid grid-cols-2 gap-2">
                            {paymentMethods.map(method => (
                                <button
                                    key={method.id}
                                    onClick={() => setPaymentMethod(method.id)}
                                    className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 transition-all ${paymentMethod === method.id
                                        ? 'border-green-500 bg-green-50 text-green-700'
                                        : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                >
                                    {method.icon}
                                    <span className="font-medium">{method.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Received By */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">ผู้รับเงิน *</label>
                        <input
                            type="text"
                            value={receivedBy}
                            onChange={(e) => setReceivedBy(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            placeholder="ชื่อผู้รับเงิน"
                        />
                    </div>

                    {/* Payment Note */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">หมายเหตุ</label>
                        <textarea
                            value={paymentNote}
                            onChange={(e) => setPaymentNote(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                            rows={2}
                            placeholder="หมายเหตุการรับเงิน (ถ้ามี)"
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-gray-50 border-t flex justify-between">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                    >
                        ยกเลิก
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isCreating}
                        className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg font-semibold hover:from-green-700 hover:to-emerald-700 disabled:opacity-50"
                    >
                        {isCreating ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                กำลังสร้าง...
                            </>
                        ) : (
                            <>
                                <Receipt className="w-4 h-4" />
                                ออกใบเสร็จ
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
