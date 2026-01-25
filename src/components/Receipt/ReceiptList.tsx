// ============================================================
// Receipt List Component
// List and manage receipts
// ============================================================

import React, { useEffect, useState } from 'react';
import { useStore } from '../../store';
import { Receipt, PaymentMethod } from '../../../types';
import {
    Receipt as ReceiptIcon, Search, Eye, Trash2,
    Banknote, Landmark, CreditCard, HelpCircle, Loader2
} from 'lucide-react';
import { ReceiptPDF } from './ReceiptPDF';
import { DeleteConfirmModal } from '../shared/DeleteConfirmModal';

const paymentMethodLabels: Record<PaymentMethod, { label: string; icon: React.ReactNode; color: string }> = {
    cash: { label: 'เงินสด', icon: <Banknote size={14} />, color: 'bg-green-100 text-green-700' },
    transfer: { label: 'โอนเงิน', icon: <Landmark size={14} />, color: 'bg-blue-100 text-blue-700' },
    credit: { label: 'บัตรเครดิต', icon: <CreditCard size={14} />, color: 'bg-purple-100 text-purple-700' },
    other: { label: 'อื่นๆ', icon: <HelpCircle size={14} />, color: 'bg-gray-100 text-gray-700' }
};

export const ReceiptList: React.FC = () => {
    const {
        receipts,
        receiptsLoading,
        fetchReceipts,
        deleteReceipt
    } = useStore();

    const [search, setSearch] = useState('');
    const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<Receipt | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        fetchReceipts();
    }, []);

    const filteredReceipts = receipts.filter(r =>
        r.customerName.toLowerCase().includes(search.toLowerCase()) ||
        r.receiptNumber.toLowerCase().includes(search.toLowerCase())
    );

    const formatCurrency = (n: number) => `฿${n.toLocaleString()}`;
    const formatDate = (d: string) => new Date(d).toLocaleDateString('th-TH');

    const handleDelete = async () => {
        if (!deleteTarget) return;
        setIsDeleting(true);
        try {
            await deleteReceipt(deleteTarget.id);
            setDeleteTarget(null);
        } catch (error) {
            console.error('Delete error:', error);
        } finally {
            setIsDeleting(false);
        }
    };

    if (receiptsLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-green-600" />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex flex-wrap gap-4 items-center justify-between">
                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <ReceiptIcon className="text-green-600" size={20} />
                    ใบเสร็จรับเงิน ({receipts.length})
                </h3>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                        type="text"
                        placeholder="ค้นหา..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9 pr-3 py-2 border rounded-lg w-48"
                    />
                </div>
            </div>

            {/* List */}
            {filteredReceipts.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                    <ReceiptIcon size={48} className="mx-auto mb-4 opacity-50" />
                    <p>ไม่พบใบเสร็จ</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filteredReceipts.map(receipt => (
                        <div
                            key={receipt.id}
                            className="bg-white rounded-xl border border-green-200 p-4 hover:shadow-md transition-all"
                        >
                            <div className="flex flex-wrap gap-4 justify-between items-start">
                                {/* Main Info */}
                                <div className="flex-1 min-w-[200px]">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="font-bold text-gray-800">{receipt.receiptNumber}</span>
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1 ${paymentMethodLabels[receipt.paymentMethod].color}`}>
                                            {paymentMethodLabels[receipt.paymentMethod].icon}
                                            {paymentMethodLabels[receipt.paymentMethod].label}
                                        </span>
                                    </div>
                                    <p className="text-gray-600">{receipt.customerName}</p>
                                    <p className="text-sm text-gray-400">
                                        วันที่รับเงิน: {formatDate(receipt.paymentDate)}
                                        {receipt.receivedBy && ` | ผู้รับ: ${receipt.receivedBy}`}
                                    </p>
                                </div>

                                {/* Amount */}
                                <div className="text-right">
                                    <p className="text-2xl font-bold text-green-600">
                                        {formatCurrency(receipt.totalPrice)}
                                    </p>
                                    <p className="text-xs text-gray-400">{receipt.items.length} รายการ</p>
                                </div>

                                {/* Actions */}
                                <div className="flex gap-2 items-center">
                                    <button
                                        onClick={() => setSelectedReceipt(receipt)}
                                        className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                        title="ดูใบเสร็จ"
                                    >
                                        <Eye size={18} />
                                    </button>
                                    <button
                                        onClick={() => setDeleteTarget(receipt)}
                                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                        title="ลบ"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Receipt PDF Modal */}
            {selectedReceipt && (
                <ReceiptPDF
                    receipt={selectedReceipt}
                    onClose={() => setSelectedReceipt(null)}
                />
            )}

            {/* Delete Confirmation Modal */}
            <DeleteConfirmModal
                isOpen={deleteTarget !== null}
                title="ลบใบเสร็จ"
                message="คุณต้องการลบใบเสร็จนี้หรือไม่? (การลบใบเสร็จอาจกระทบต่อการจัดทำบัญชี)"
                itemName={deleteTarget ? `${deleteTarget.receiptNumber} - ${deleteTarget.customerName}` : ''}
                isDeleting={isDeleting}
                onConfirm={handleDelete}
                onCancel={() => setDeleteTarget(null)}
            />
        </div>
    );
};
