// ============================================================
// Create Invoice Modal
// Modal to create invoice from quotation
// ============================================================

import React, { useState } from 'react';
import { useStore } from '../../store';
import { Quotation } from '../../../types';
import { X, FileText, Loader2, Calendar } from 'lucide-react';

interface CreateInvoiceModalProps {
    quotation: Quotation;
    onClose: () => void;
    onSuccess?: () => void;
}

export const CreateInvoiceModal: React.FC<CreateInvoiceModalProps> = ({
    quotation,
    onClose,
    onSuccess
}) => {
    const { createInvoiceFromQuotation, fetchInvoices } = useStore();

    // Default due date: 30 days from now
    const defaultDueDate = new Date();
    defaultDueDate.setDate(defaultDueDate.getDate() + 30);

    const [dueDate, setDueDate] = useState(defaultDueDate.toISOString().split('T')[0]);
    const [paymentTerms, setPaymentTerms] = useState('Net 30');
    const [isCreating, setIsCreating] = useState(false);

    const paymentTermsOptions = [
        { value: 'COD', label: 'COD (ชำระเงินปลายทาง)' },
        { value: 'Net 7', label: 'Net 7 (ชำระภายใน 7 วัน)' },
        { value: 'Net 15', label: 'Net 15 (ชำระภายใน 15 วัน)' },
        { value: 'Net 30', label: 'Net 30 (ชำระภายใน 30 วัน)' },
        { value: 'Net 45', label: 'Net 45 (ชำระภายใน 45 วัน)' },
        { value: 'Net 60', label: 'Net 60 (ชำระภายใน 60 วัน)' }
    ];

    const handleSubmit = async () => {
        if (!dueDate) {
            alert('กรุณาระบุวันครบกำหนดชำระ');
            return;
        }

        setIsCreating(true);
        try {
            const invoice = await createInvoiceFromQuotation(quotation.id, dueDate, paymentTerms);
            if (invoice) {
                await fetchInvoices();
                onSuccess?.();
                alert(`✅ สร้างใบแจ้งหนี้เรียบร้อย: ${invoice.invoiceNumber}`);
            } else {
                alert('เกิดข้อผิดพลาดในการสร้างใบแจ้งหนี้');
            }
        } catch (error) {
            console.error('Error creating invoice:', error);
            alert('เกิดข้อผิดพลาด');
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-700 to-indigo-700 px-6 py-4 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <FileText className="w-6 h-6" />
                        ออกใบแจ้งหนี้
                    </h2>
                    <button onClick={onClose} className="text-white/80 hover:text-white">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-5">
                    {/* Source Info */}
                    <div className="bg-gray-50 rounded-lg p-4">
                        <p className="text-sm text-gray-500">จากใบเสนอราคา</p>
                        <p className="font-bold text-blue-600">{quotation.quotationNumber}</p>
                        <p className="text-gray-800">{quotation.customerName}</p>
                        <p className="text-lg font-bold text-green-600">฿{quotation.totalPrice.toLocaleString()}</p>
                    </div>

                    {/* Payment Terms */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">เงื่อนไขการชำระ</label>
                        <select
                            value={paymentTerms}
                            onChange={(e) => {
                                setPaymentTerms(e.target.value);
                                // Auto-calculate due date based on terms
                                const days = parseInt(e.target.value.replace('Net ', '')) || 0;
                                if (days > 0) {
                                    const newDue = new Date();
                                    newDue.setDate(newDue.getDate() + days);
                                    setDueDate(newDue.toISOString().split('T')[0]);
                                }
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                            {paymentTermsOptions.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* Due Date */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            <Calendar className="w-4 h-4 inline mr-1" />
                            วันครบกำหนดชำระ
                        </label>
                        <input
                            type="date"
                            value={dueDate}
                            onChange={(e) => setDueDate(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
                        className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-blue-700 to-indigo-700 text-white rounded-lg font-semibold hover:from-blue-800 hover:to-indigo-800 disabled:opacity-50"
                    >
                        {isCreating ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                กำลังสร้าง...
                            </>
                        ) : (
                            <>
                                <FileText className="w-4 h-4" />
                                ออกใบแจ้งหนี้
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
