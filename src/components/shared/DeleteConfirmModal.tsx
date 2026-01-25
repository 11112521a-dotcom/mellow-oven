// ============================================================
// Delete Confirmation Modal Component
// Beautiful, reusable deletion confirmation dialog
// ============================================================

import React from 'react';
import { AlertTriangle, X, Trash2, Loader2 } from 'lucide-react';

interface DeleteConfirmModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    itemName?: string;
    isDeleting?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
    isOpen,
    title,
    message,
    itemName,
    isDeleting = false,
    onConfirm,
    onCancel
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="bg-gradient-to-r from-red-500 to-rose-600 px-6 py-4 flex items-center gap-3">
                    <div className="p-2 bg-white/20 rounded-full">
                        <AlertTriangle className="w-6 h-6 text-white" />
                    </div>
                    <h2 className="text-xl font-bold text-white flex-1">{title}</h2>
                    <button
                        onClick={onCancel}
                        disabled={isDeleting}
                        className="text-white/80 hover:text-white disabled:opacity-50"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    <p className="text-gray-600 mb-4">{message}</p>

                    {itemName && (
                        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
                            <p className="text-sm text-red-600 font-medium">รายการที่จะลบ:</p>
                            <p className="text-lg font-bold text-red-700 mt-1">{itemName}</p>
                        </div>
                    )}

                    <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                        <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                        <p className="text-sm text-amber-700">
                            การดำเนินการนี้ไม่สามารถย้อนกลับได้
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-gray-50 border-t flex justify-end gap-3">
                    <button
                        onClick={onCancel}
                        disabled={isDeleting}
                        className="px-5 py-2.5 text-gray-700 bg-white border border-gray-300 rounded-xl font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                        ยกเลิก
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={isDeleting}
                        className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-red-500 to-rose-600 text-white rounded-xl font-semibold hover:from-red-600 hover:to-rose-700 transition-all disabled:opacity-50 shadow-lg shadow-red-500/25"
                    >
                        {isDeleting ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                กำลังลบ...
                            </>
                        ) : (
                            <>
                                <Trash2 className="w-4 h-4" />
                                ยืนยันลบ
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
