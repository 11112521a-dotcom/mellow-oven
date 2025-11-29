import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4 bg-black/30 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-t-2xl md:rounded-2xl shadow-xl w-full md:max-w-md overflow-hidden animate-in slide-in-from-bottom-10 md:zoom-in-95 duration-200 max-h-[90vh] md:max-h-[85vh] flex flex-col">
                <div className="flex justify-between items-center p-4 border-b border-cafe-100 bg-cafe-50 shrink-0">
                    <h3 className="text-lg font-bold text-cafe-800">{title}</h3>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-full hover:bg-cafe-200 text-cafe-500 transition-colors"
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
