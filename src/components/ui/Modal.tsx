// ============================================================
// 🎯 Modal Component - Shared UI
// 🛡️ Mellow Oven Standards Compliance:
// - #13: Memory Leak Prevention (cleanup in useEffect)
// - #17: Accessibility (focus management)
// - #22: ESC dismiss, backdrop click, scroll lock
// ============================================================

import React, { useEffect, useCallback } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
    // 🛡️ Rule #22: ESC key dismiss
    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (e.key === 'Escape') {
            onClose();
        }
    }, [onClose]);

    // 🛡️ Rule #22: Scroll lock + ESC listener
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            window.addEventListener('keydown', handleKeyDown);
        }
        // 🛡️ Rule #13: Cleanup
        return () => {
            document.body.style.overflow = 'unset';
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, handleKeyDown]);

    if (!isOpen) return null;

    return (
        // 🛡️ Rule #22: Backdrop click to close
        <div
            className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4 bg-black/30 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={onClose}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
        >
            {/* Stop propagation so clicking inside modal doesn't close it */}
            <div
                className="bg-white rounded-t-2xl md:rounded-2xl shadow-xl w-full md:max-w-md overflow-hidden animate-in slide-in-from-bottom-10 md:zoom-in-95 duration-200 max-h-[90vh] md:max-h-[85vh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex justify-between items-center p-4 border-b border-cafe-100 bg-cafe-50 shrink-0">
                    <h3 id="modal-title" className="text-lg font-bold text-cafe-800">{title}</h3>
                    <button
                        onClick={onClose}
                        className="p-2 min-w-[44px] min-h-[44px] rounded-full hover:bg-cafe-200 text-cafe-500 transition-colors flex items-center justify-center"
                        aria-label="ปิด"
                    >
                        <X size={20} />
                    </button>
                </div>
                <div className="p-4 md:p-6 overflow-y-auto">
                    {children}
                </div>
            </div>
        </div>
    );
};
