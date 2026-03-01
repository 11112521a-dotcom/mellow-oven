import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Image as ImageIcon } from 'lucide-react';
import { Product } from '@/types';

interface AddProductModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (newProductData: {
        name: string;
        price: string;
        cost: string;
        category: string;
        flavor: string;
    }) => void;
}

export const AddProductModal: React.FC<AddProductModalProps> = ({ isOpen, onClose, onAdd }) => {
    // Form states for add modal
    const [newName, setNewName] = useState('');
    const [newPrice, setNewPrice] = useState('');
    const [newCost, setNewCost] = useState('');
    const [newCategory, setNewCategory] = useState('Cake');
    const [newFlavor, setNewFlavor] = useState('');

    const handleAdd = () => {
        onAdd({
            name: newName,
            price: newPrice,
            cost: newCost,
            category: newCategory,
            flavor: newFlavor,
        });

        // Reset form
        setNewName('');
        setNewPrice('');
        setNewCost('');
        setNewCategory('Cake');
        setNewFlavor('');
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="fixed inset-0 m-auto w-full max-w-2xl h-fit max-h-[90vh] bg-white rounded-3xl shadow-2xl z-[101] overflow-hidden flex flex-col"
                    >
                        {/* Header */}
                        <div className="p-6 border-b flex justify-between items-center bg-gradient-to-r from-cafe-50 to-emerald-50 relative overflow-hidden">
                            <div className="absolute -right-10 -top-10 text-emerald-100 opacity-50 rotate-12">
                                <Plus size={120} strokeWidth={4} />
                            </div>
                            <div className="relative z-10">
                                <h2 className="text-2xl font-black text-gray-900 tracking-tight">เพิ่มเมนูใหม่</h2>
                                <p className="text-sm text-gray-500 mt-1">กรอกข้อมูลพื้นฐานสำหรับสินค้าใหม่ของคุณ</p>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-white/80 rounded-full border border-gray-200/50 shadow-sm transition-colors relative z-10"
                                aria-label="ปิด"
                            >
                                <X size={20} className="text-gray-600" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-8 overflow-y-auto flex-1 font-sans">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                {/* Left Col - Image Upload Placeholder */}
                                <div className="md:col-span-1">
                                    <div className="aspect-square bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-slate-400 group hover:bg-slate-100 hover:border-cafe-300 transition-colors cursor-pointer">
                                        <div className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                            <ImageIcon size={28} className="text-slate-300 group-hover:text-cafe-500" />
                                        </div>
                                        <p className="font-bold text-sm text-slate-500">อัพโหลดรูปภาพ</p>
                                        <p className="text-[10px] mt-1 text-center px-4">รองรับ JPG, PNG, WEBP<br />ขนาดไม่เกิน 5MB</p>
                                    </div>
                                </div>

                                {/* Right Col - Form Fields */}
                                <div className="md:col-span-2 space-y-5">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-1.5 flex items-center gap-2">
                                            ชื่อเมนู <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={newName}
                                            onChange={(e) => setNewName(e.target.value)}
                                            placeholder="เช่น เค้กช็อกโกแลตหน้านิ่ม"
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-cafe-500 focus:border-cafe-500 transition-all outline-none font-medium text-gray-800"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-1.5 flex items-center justify-between">
                                                <span>ราคาขาย <span className="text-red-500">*</span></span>
                                                <span className="text-[10px] font-normal text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">THB</span>
                                            </label>
                                            <div className="relative">
                                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">฿</span>
                                                <input
                                                    type="number"
                                                    value={newPrice}
                                                    onChange={(e) => setNewPrice(e.target.value)}
                                                    placeholder="0.00"
                                                    className="w-full pl-8 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-cafe-500 focus:border-cafe-500 transition-all outline-none font-medium text-gray-800"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-1.5 flex items-center justify-between">
                                                <span>ต้นทุนประเมิน</span>
                                                <span className="text-[10px] font-normal text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">THB</span>
                                            </label>
                                            <div className="relative">
                                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">฿</span>
                                                <input
                                                    type="number"
                                                    value={newCost}
                                                    onChange={(e) => setNewCost(e.target.value)}
                                                    placeholder="0.00"
                                                    className="w-full pl-8 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-cafe-500 focus:border-cafe-500 transition-all outline-none font-medium text-gray-800"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-1.5">หมวดหมู่</label>
                                            <select
                                                value={newCategory}
                                                onChange={(e) => setNewCategory(e.target.value)}
                                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-cafe-500 focus:border-cafe-500 transition-all outline-none font-medium text-gray-800 appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%239CA3AF%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:12px_12px] bg-[right_1rem_center] bg-no-repeat pr-10"
                                            >
                                                <option value="Cake">🍰 เค้ก (Cake)</option>
                                                <option value="Bakery">🥐 เบเกอรี่ (Bakery)</option>
                                                <option value="Bread">🍞 ขนมปัง (Bread)</option>
                                                <option value="Tart">🥧 ทาร์ต/พาย (Tart/Pie)</option>
                                                <option value="Dessert">🧁 ขนมหวาน (Dessert)</option>
                                                <option value="Coffee">☕ กาแฟ (Coffee)</option>
                                                <option value="Tea">🍵 ชา (Tea)</option>
                                                <option value="Beverage">🥤 เครื่องดื่มอื่นๆ (Beverage)</option>
                                                <option value="Snack Box">📦 สแน็คบ็อกซ์ (Snack Box)</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-1.5">รสชาติ (ถ้ามี)</label>
                                            <input
                                                type="text"
                                                value={newFlavor}
                                                onChange={(e) => setNewFlavor(e.target.value)}
                                                placeholder="เช่น ดาร์กช็อกโกแลต"
                                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-cafe-500 focus:border-cafe-500 transition-all outline-none font-medium text-gray-800"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-6 border-t bg-gray-50 flex justify-end gap-3 flex-shrink-0">
                            <button
                                onClick={onClose}
                                className="px-6 py-2.5 rounded-xl font-bold text-gray-500 hover:text-gray-700 hover:bg-gray-200/50 transition-colors"
                            >
                                ยกเลิก
                            </button>
                            <button
                                onClick={handleAdd}
                                disabled={!newName.trim() || !newPrice}
                                className={`flex items-center gap-2 px-8 py-2.5 rounded-xl font-bold shadow-lg transition-all ${(!newName.trim() || !newPrice)
                                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
                                    : 'bg-cafe-600 text-white shadow-cafe-200 hover:bg-cafe-700 active:scale-95'
                                    }`}
                            >
                                <Plus size={18} />
                                เพิ่มสินค้านี้
                            </button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};
