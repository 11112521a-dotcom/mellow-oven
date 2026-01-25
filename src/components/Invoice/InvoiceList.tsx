// ============================================================
// Invoice List Component
// List, filter, and manage invoices
// ============================================================

import React, { useEffect, useState } from 'react';
import { useStore } from '../../store';
import { Invoice, InvoiceStatus } from '../../../types';
import {
    FileText, Search, Eye, Trash2,
    CheckCircle, Clock, AlertTriangle, XCircle,
    Receipt, Loader2, Send
} from 'lucide-react';
import { InvoicePDF } from './InvoicePDF';
import { CreateReceiptModal } from '../Receipt/CreateReceiptModal';
import { DeleteConfirmModal } from '../shared/DeleteConfirmModal';

const statusConfig: Record<InvoiceStatus, { label: string; color: string; icon: React.ReactNode }> = {
    draft: { label: 'ร่าง', color: 'bg-gray-100 text-gray-700', icon: <FileText size={14} /> },
    sent: { label: 'ส่งแล้ว', color: 'bg-blue-100 text-blue-700', icon: <Clock size={14} /> },
    paid: { label: 'ชำระแล้ว', color: 'bg-green-100 text-green-700', icon: <CheckCircle size={14} /> },
    overdue: { label: 'เลยกำหนด', color: 'bg-red-100 text-red-700', icon: <AlertTriangle size={14} /> },
    cancelled: { label: 'ยกเลิก', color: 'bg-stone-100 text-stone-500', icon: <XCircle size={14} /> }
};

export const InvoiceList: React.FC = () => {
    const {
        invoices,
        invoicesLoading,
        fetchInvoices,
        updateInvoiceStatus,
        deleteInvoice
    } = useStore();

    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState<InvoiceStatus | 'all'>('all');
    const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
    const [showReceiptModal, setShowReceiptModal] = useState<Invoice | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<Invoice | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        fetchInvoices();
    }, []);

    const filteredInvoices = invoices.filter(inv => {
        const matchesSearch = inv.customerName.toLowerCase().includes(search.toLowerCase()) ||
            inv.invoiceNumber.toLowerCase().includes(search.toLowerCase());
        const matchesStatus = filterStatus === 'all' || inv.status === filterStatus;
        return matchesSearch && matchesStatus;
    });

    const formatCurrency = (n: number) => `฿${n.toLocaleString()}`;
    const formatDate = (d: string) => new Date(d).toLocaleDateString('th-TH');

    const handleSendInvoice = async (inv: Invoice) => {
        if (inv.status === 'draft') {
            await updateInvoiceStatus(inv.id, 'sent');
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        setIsDeleting(true);
        try {
            await deleteInvoice(deleteTarget.id);
            setDeleteTarget(null);
        } catch (error) {
            console.error('Delete error:', error);
        } finally {
            setIsDeleting(false);
        }
    };

    const isOverdue = (inv: Invoice) => {
        if (inv.status !== 'sent') return false;
        return new Date(inv.dueDate) < new Date();
    };

    // Can delete any invoice (no status restriction)
    const canDelete = () => true;

    if (invoicesLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex flex-wrap gap-4 items-center justify-between">
                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <FileText className="text-blue-600" size={20} />
                    ใบแจ้งหนี้ ({invoices.length})
                </h3>
                <div className="flex gap-2">
                    {/* Search */}
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
                    {/* Filter */}
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value as InvoiceStatus | 'all')}
                        className="px-3 py-2 border rounded-lg"
                    >
                        <option value="all">ทุกสถานะ</option>
                        {Object.entries(statusConfig).map(([key, { label }]) => (
                            <option key={key} value={key}>{label}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* List */}
            {filteredInvoices.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                    <FileText size={48} className="mx-auto mb-4 opacity-50" />
                    <p>ไม่พบใบแจ้งหนี้</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filteredInvoices.map(inv => (
                        <div
                            key={inv.id}
                            className={`bg-white rounded-xl border p-4 hover:shadow-md transition-all ${isOverdue(inv) ? 'border-red-300 bg-red-50' : 'border-gray-200'
                                }`}
                        >
                            <div className="flex flex-wrap gap-4 justify-between items-start">
                                {/* Main Info */}
                                <div className="flex-1 min-w-[200px]">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="font-bold text-gray-800">{inv.invoiceNumber}</span>
                                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1 ${statusConfig[inv.status].color}`}>
                                            {statusConfig[inv.status].icon}
                                            {statusConfig[inv.status].label}
                                        </span>
                                        {isOverdue(inv) && (
                                            <span className="text-xs px-2 py-0.5 rounded-full bg-red-500 text-white font-bold animate-pulse">
                                                เลยกำหนด!
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-gray-600">{inv.customerName}</p>
                                    <p className="text-sm text-gray-400">
                                        วันที่: {formatDate(inv.createdAt)} | ครบกำหนด: {formatDate(inv.dueDate)}
                                    </p>
                                </div>

                                {/* Amount */}
                                <div className="text-right">
                                    <p className="text-2xl font-bold text-blue-600">
                                        {formatCurrency(inv.totalPrice)}
                                    </p>
                                    <p className="text-xs text-gray-400">{inv.items.length} รายการ</p>
                                </div>

                                {/* Actions */}
                                <div className="flex gap-2 items-center">
                                    <button
                                        onClick={() => setSelectedInvoice(inv)}
                                        className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                        title="ดูใบแจ้งหนี้"
                                    >
                                        <Eye size={18} />
                                    </button>
                                    {inv.status === 'draft' && (
                                        <button
                                            onClick={() => handleSendInvoice(inv)}
                                            className="px-3 py-1.5 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 flex items-center gap-1 transition-colors"
                                        >
                                            <Send size={14} />
                                            ส่ง
                                        </button>
                                    )}
                                    {(inv.status === 'sent' || inv.status === 'overdue') && (
                                        <button
                                            onClick={() => setShowReceiptModal(inv)}
                                            className="px-3 py-1.5 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200 flex items-center gap-1 transition-colors"
                                        >
                                            <Receipt size={14} />
                                            ออกใบเสร็จ
                                        </button>
                                    )}
                                    {canDelete() && (
                                        <button
                                            onClick={() => setDeleteTarget(inv)}
                                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                            title="ลบ"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Invoice PDF Modal */}
            {selectedInvoice && (
                <InvoicePDF
                    invoice={selectedInvoice}
                    onClose={() => setSelectedInvoice(null)}
                />
            )}

            {/* Create Receipt Modal */}
            {showReceiptModal && (
                <CreateReceiptModal
                    sourceType="invoice"
                    sourceId={showReceiptModal.id}
                    onClose={() => setShowReceiptModal(null)}
                    onSuccess={() => {
                        setShowReceiptModal(null);
                        fetchInvoices();
                    }}
                />
            )}

            {/* Delete Confirmation Modal */}
            <DeleteConfirmModal
                isOpen={deleteTarget !== null}
                title="ลบใบแจ้งหนี้"
                message="คุณต้องการลบใบแจ้งหนี้นี้หรือไม่?"
                itemName={deleteTarget ? `${deleteTarget.invoiceNumber} - ${deleteTarget.customerName}` : ''}
                isDeleting={isDeleting}
                onConfirm={handleDelete}
                onCancel={() => setDeleteTarget(null)}
            />
        </div>
    );
};
