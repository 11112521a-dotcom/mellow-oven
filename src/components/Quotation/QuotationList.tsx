// ============================================================
// Quotation List Component
// Display and manage quotations with PDF export
// ============================================================

import React, { useEffect, useState } from 'react';
import { useStore } from '../../store';
import { QuotationBuilder } from './QuotationBuilder';
import { QuotationPDF } from './QuotationPDF';
import {
    Plus, Search, Loader2, FileText,
    Download, Eye, Trash2, AlertCircle,
    Check, Clock, Send, Receipt, FileOutput
} from 'lucide-react';
import { Quotation, QuotationStatus } from '../../../types';
import { CreateReceiptModal } from '../Receipt/CreateReceiptModal';
import { CreateInvoiceModal } from './CreateInvoiceModal';
import { DeleteConfirmModal } from '../shared/DeleteConfirmModal';

const statusConfig: Record<QuotationStatus, { label: string; color: string }> = {
    draft: { label: 'ร่าง', color: 'bg-gray-100 text-gray-700' },
    sent: { label: 'ส่งแล้ว', color: 'bg-blue-100 text-blue-700' },
    accepted: { label: 'ลูกค้ายอมรับ', color: 'bg-green-100 text-green-700' },
    invoiced: { label: 'ออกใบแจ้งหนี้แล้ว', color: 'bg-purple-100 text-purple-700' },
    expired: { label: 'หมดอายุ', color: 'bg-yellow-100 text-yellow-700' },
    cancelled: { label: 'ยกเลิก', color: 'bg-red-100 text-red-700' }
};

export const QuotationList: React.FC = () => {
    const {
        quotations,
        isLoadingQuotations,
        fetchQuotations,
        updateQuotationStatus,
        deleteQuotation
    } = useStore();

    const [searchTerm, setSearchTerm] = useState('');
    const [showBuilder, setShowBuilder] = useState(false);
    const [viewingQuotation, setViewingQuotation] = useState<Quotation | null>(null);
    const [showInvoiceModal, setShowInvoiceModal] = useState<Quotation | null>(null);
    const [showReceiptModal, setShowReceiptModal] = useState<Quotation | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<Quotation | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        fetchQuotations();
    }, []);

    // Filter
    const filteredQuotations = quotations.filter(q =>
        q.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        q.quotationNumber.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleDelete = async () => {
        if (!deleteTarget) return;
        setIsDeleting(true);
        try {
            await deleteQuotation(deleteTarget.id);
            setDeleteTarget(null);
        } catch (error) {
            console.error('Delete error:', error);
            alert('เกิดข้อผิดพลาดในการลบ');
        } finally {
            setIsDeleting(false);
        }
    };

    const handleStatusChange = async (id: string, status: QuotationStatus) => {
        try {
            await updateQuotationStatus(id, status);
        } catch (error) {
            console.error('Status update error:', error);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <FileText className="w-7 h-7 text-blue-600" />
                        ใบเสนอราคา
                    </h2>
                    <p className="text-gray-500 mt-1">สร้างและจัดการใบเสนอราคาสำหรับลูกค้า</p>
                </div>

                <button
                    onClick={() => setShowBuilder(true)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg"
                >
                    <Plus className="w-5 h-5" />
                    สร้างใบเสนอราคา
                </button>
            </div>

            {/* Search */}
            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                    type="text"
                    placeholder="ค้นหาใบเสนอราคา..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500"
                />
            </div>

            {/* List */}
            {isLoadingQuotations ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                    <span className="ml-2 text-gray-600">กำลังโหลด...</span>
                </div>
            ) : filteredQuotations.length === 0 ? (
                <div className="text-center py-12">
                    <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">
                        {searchTerm ? 'ไม่พบใบเสนอราคาที่ค้นหา' : 'ยังไม่มีใบเสนอราคา'}
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filteredQuotations.map(q => {
                        const status = statusConfig[q.status];
                        return (
                            <div key={q.id} className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all p-4">
                                <div className="flex flex-col sm:flex-row justify-between gap-3">
                                    {/* Info */}
                                    <div>
                                        <div className="flex items-center gap-3">
                                            <span className="text-lg font-bold text-blue-600">{q.quotationNumber}</span>
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
                                                {status.label}
                                            </span>
                                        </div>
                                        <div className="text-gray-800 font-medium mt-1">{q.customerName}</div>
                                        <div className="text-sm text-gray-500">
                                            {q.items.length} รายการ • {new Date(q.createdAt).toLocaleDateString('th-TH')}
                                        </div>
                                    </div>

                                    {/* Price & Actions */}
                                    <div className="flex items-center gap-4">
                                        <div className="text-right">
                                            <div className="text-2xl font-bold text-blue-600">
                                                ฿{q.totalPrice.toLocaleString()}
                                            </div>
                                        </div>

                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => setViewingQuotation(q)}
                                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                                                title="ดู/พิมพ์"
                                            >
                                                <Eye className="w-5 h-5" />
                                            </button>
                                            {q.status === 'draft' && (
                                                <button
                                                    onClick={() => handleStatusChange(q.id, 'sent')}
                                                    className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                                                    title="ทำเครื่องหมายว่าส่งแล้ว"
                                                >
                                                    <Send className="w-5 h-5" />
                                                </button>
                                            )}
                                            {q.status === 'sent' && (
                                                <button
                                                    onClick={() => handleStatusChange(q.id, 'accepted')}
                                                    className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-lg hover:bg-green-200"
                                                    title="ลูกค้ายอมรับ"
                                                >
                                                    <Check className="w-4 h-4" />
                                                </button>
                                            )}
                                            {q.status === 'accepted' && (
                                                <>
                                                    <button
                                                        onClick={() => setShowInvoiceModal(q)}
                                                        className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 flex items-center gap-1"
                                                        title="ออกใบแจ้งหนี้"
                                                    >
                                                        <FileOutput className="w-3 h-3" />
                                                        ใบแจ้งหนี้
                                                    </button>
                                                    <button
                                                        onClick={() => setShowReceiptModal(q)}
                                                        className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-lg hover:bg-green-200 flex items-center gap-1"
                                                        title="ออกใบเสร็จทันที"
                                                    >
                                                        <Receipt className="w-3 h-3" />
                                                        ใบเสร็จ
                                                    </button>
                                                </>
                                            )}
                                            <button
                                                onClick={() => setDeleteTarget(q)}
                                                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                title="ลบ"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Builder Modal */}
            {showBuilder && (
                <QuotationBuilder
                    onClose={() => setShowBuilder(false)}
                    onSuccess={() => fetchQuotations()}
                />
            )}

            {/* PDF Preview Modal */}
            {viewingQuotation && (
                <QuotationPDF
                    quotation={viewingQuotation}
                    onClose={() => setViewingQuotation(null)}
                />
            )}

            {/* Create Invoice Modal */}
            {showInvoiceModal && (
                <CreateInvoiceModal
                    quotation={showInvoiceModal}
                    onClose={() => setShowInvoiceModal(null)}
                    onSuccess={() => {
                        setShowInvoiceModal(null);
                        fetchQuotations();
                    }}
                />
            )}

            {/* Create Receipt Modal */}
            {showReceiptModal && (
                <CreateReceiptModal
                    sourceType="quotation"
                    sourceId={showReceiptModal.id}
                    onClose={() => setShowReceiptModal(null)}
                    onSuccess={() => {
                        setShowReceiptModal(null);
                        fetchQuotations();
                    }}
                />
            )}

            {/* Delete Confirmation Modal */}
            <DeleteConfirmModal
                isOpen={deleteTarget !== null}
                title="ลบใบเสนอราคา"
                message="คุณต้องการลบใบเสนอราคานี้หรือไม่?"
                itemName={deleteTarget ? `${deleteTarget.quotationNumber} - ${deleteTarget.customerName}` : ''}
                isDeleting={isDeleting}
                onConfirm={handleDelete}
                onCancel={() => setDeleteTarget(null)}
            />
        </div>
    );
};
