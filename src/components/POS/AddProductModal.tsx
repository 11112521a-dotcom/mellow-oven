import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Plus, Image as ImageIcon, Loader2 } from 'lucide-react';
import { Product, Market } from '@/types';
import { useStore } from '@/src/store';
import { supabase } from '@/src/lib/supabase';
import { compressImage } from '@/src/lib/imageCompression';

interface AddProductModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (newProductData: {
        name: string;
        price: string;
        cost: string;
        category: string;
        flavor: string;
        marketIds: string[];
        imageUrl?: string;
    }) => void;
}

export const AddProductModal: React.FC<AddProductModalProps> = ({ isOpen, onClose, onAdd }) => {
    const { markets } = useStore();

    // Form states for add modal
    const [newName, setNewName] = useState('');
    const [newPrice, setNewPrice] = useState('');
    const [newCost, setNewCost] = useState('');
    const [newCategory, setNewCategory] = useState('Cake');
    const [newFlavor, setNewFlavor] = useState('');
    const [sellEverywhere, setSellEverywhere] = useState(true);
    const [selectedMarkets, setSelectedMarkets] = useState<string[]>([]);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setImagePreview(URL.createObjectURL(file));
            try {
                // Compress image before setting to state
                const compressed = await compressImage(file, { maxWidth: 800, maxHeight: 800, quality: 0.8 });
                setImageFile(compressed);
            } catch (err) {
                console.error("Image compression failed:", err);
                setImageFile(file); // fallback to original
            }
        }
    };

    const uploadImage = async (): Promise<string | undefined> => {
        if (!imageFile) return undefined;
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${crypto.randomUUID()}.${fileExt}`;
        const filePath = `products/${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('product-images')
            .upload(filePath, imageFile, { upsert: true });

        if (uploadError) {
            console.error('Error uploading image:', uploadError);
            return undefined;
        }

        const { data } = supabase.storage.from('product-images').getPublicUrl(filePath);
        return data.publicUrl;
    };

    const handleAdd = async () => {
        setIsUploading(true);
        const imageUrl = await uploadImage();
        setIsUploading(false);

        onAdd({
            name: newName,
            price: newPrice,
            cost: newCost,
            category: newCategory,
            flavor: newFlavor,
            marketIds: sellEverywhere ? [] : selectedMarkets,
            imageUrl
        });

        // Reset form
        setNewName('');
        setNewPrice('');
        setNewCost('');
        setNewCategory('Cake');
        setNewFlavor('');
        setSellEverywhere(true);
        setSelectedMarkets([]);
        setImageFile(null);
        setImagePreview(null);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[101] flex items-end md:items-center justify-center p-0 md:p-4 pointer-events-none">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-auto"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, y: 50, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 50, scale: 0.95 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        className="relative w-full max-w-2xl h-[85vh] md:h-auto max-h-[90dvh] md:max-h-[85vh] bg-white rounded-t-3xl md:rounded-3xl shadow-2xl overflow-hidden flex flex-col z-10 pointer-events-auto"
                    >
                        {/* Header */}
                        <div className="p-6 border-b flex justify-between items-center bg-gradient-to-r from-cafe-50 to-emerald-50 relative overflow-hidden flex-shrink-0">
                            <div className="absolute -right-10 -top-10 text-emerald-100 opacity-50 rotate-12">
                                <Plus size={120} strokeWidth={4} />
                            </div>
                            <div className="relative z-10">
                                <h2 className="text-2xl font-black text-gray-900 tracking-tight">เพิ่มเมนูใหม่</h2>
                                <p className="text-sm text-gray-500 mt-1">กรอกข้อมูลพื้นฐานสำหรับสินค้าใหม่ของคุณ</p>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2.5 min-w-[44px] min-h-[44px] hover:bg-white/80 rounded-full border border-gray-200/50 shadow-sm transition-colors relative z-10 flex items-center justify-center"
                                aria-label="ปิด"
                            >
                                <X size={20} className="text-gray-600" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-5 md:p-8 overflow-y-auto flex-1 min-h-0 font-sans">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
                                {/* Left Col - Image Upload Placeholder */}
                                <div className="md:col-span-1">
                                    <label className="relative h-40 md:h-auto md:aspect-square bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-slate-400 group hover:bg-slate-100 hover:border-cafe-300 transition-colors cursor-pointer overflow-hidden block">
                                        <input 
                                            type="file" 
                                            accept="image/jpeg, image/png, image/webp" 
                                            className="hidden" 
                                            onChange={handleImageChange}
                                            disabled={isUploading}
                                        />
                                        {imagePreview ? (
                                            <div className="absolute inset-0 w-full h-full">
                                                <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                    <span className="text-white font-medium text-sm">เปลี่ยนรูปภาพ</span>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                                                    <ImageIcon size={28} className="text-slate-300 group-hover:text-cafe-500" />
                                                </div>
                                                <p className="font-bold text-sm text-slate-500">อัพโหลดรูปภาพ</p>
                                                <p className="text-[10px] mt-1 text-center px-4">รองรับ JPG, PNG, WEBP<br />ย่อขนาดอัตโนมัติ</p>
                                            </>
                                        )}
                                    </label>
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
                                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-cafe-500 focus:border-cafe-500 transition-all outline-none font-medium text-gray-800 text-base md:text-sm"
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                                                    className="w-full pl-8 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-cafe-500 focus:border-cafe-500 transition-all outline-none font-medium text-gray-800 text-base md:text-sm"
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
                                                    className="w-full pl-8 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-cafe-500 focus:border-cafe-500 transition-all outline-none font-medium text-gray-800 text-base md:text-sm"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 mb-1.5">หมวดหมู่</label>
                                            <select
                                                value={newCategory}
                                                onChange={(e) => setNewCategory(e.target.value)}
                                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-cafe-500 focus:border-cafe-500 transition-all outline-none font-medium text-gray-800 appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%239CA3AF%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E')] bg-[length:12px_12px] bg-[right_1rem_center] bg-no-repeat pr-10 text-base md:text-sm"
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
                                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-cafe-500 focus:border-cafe-500 transition-all outline-none font-medium text-gray-800 text-base md:text-sm"
                                            />
                                        </div>
                                    </div>

                                    {/* Markets / Branch Mapping */}
                                    <div className="border-t border-slate-100 pt-4 mt-2">
                                        <label className="block text-sm font-bold text-gray-700 mb-2 flex items-center gap-1.5">
                                            <span>🏪 ช่องทางการขาย / สาขา</span>
                                        </label>
                                        <div className="bg-slate-50 rounded-2xl p-4 space-y-3 border border-slate-100">
                                            <label className="flex items-center gap-3 cursor-pointer select-none">
                                                <input
                                                    type="checkbox"
                                                    checked={sellEverywhere}
                                                    onChange={(e) => {
                                                        setSellEverywhere(e.target.checked);
                                                        if (e.target.checked) setSelectedMarkets([]);
                                                    }}
                                                    className="w-4.5 h-4.5 rounded text-cafe-600 focus:ring-cafe-500 border-slate-300"
                                                />
                                                <span className="text-sm font-bold text-slate-700">วางขายทุกสาขา / ทุกตลาด (ค่าเริ่มต้น)</span>
                                            </label>

                                            {!sellEverywhere && (
                                                <div className="grid grid-cols-2 gap-2 pl-7 pt-3 border-t border-slate-200/50 mt-2">
                                                    {markets.map((market) => (
                                                        <label key={market.id} className="flex items-center gap-2 cursor-pointer select-none py-1 hover:bg-slate-100/50 rounded px-1.5 transition-colors">
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedMarkets.includes(market.id)}
                                                                onChange={(e) => {
                                                                    if (e.target.checked) {
                                                                        setSelectedMarkets([...selectedMarkets, market.id]);
                                                                    } else {
                                                                        setSelectedMarkets(selectedMarkets.filter(id => id !== market.id));
                                                                    }
                                                                }}
                                                                className="w-4 h-4 rounded text-cafe-600 focus:ring-cafe-500 border-slate-300"
                                                            />
                                                            <span className="text-xs font-semibold text-slate-600">{market.name}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-4 md:p-6 border-t bg-gray-50 flex justify-end gap-3 flex-shrink-0">
                            <button
                                onClick={onClose}
                                className="px-6 py-2.5 rounded-xl font-bold text-gray-500 hover:text-gray-700 hover:bg-gray-200/50 transition-colors text-base md:text-sm"
                            >
                                ยกเลิก
                            </button>
                            <button
                                onClick={handleAdd}
                                disabled={!newName.trim() || !newPrice || isUploading}
                                className={`flex items-center justify-center gap-2 px-8 py-2.5 rounded-xl font-bold shadow-lg transition-all text-base md:text-sm ${(!newName.trim() || !newPrice || isUploading)
                                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
                                    : 'bg-cafe-600 text-white shadow-cafe-200 hover:bg-cafe-700 active:scale-95'
                                    }`}
                            >
                                {isUploading ? (
                                    <>
                                        <Loader2 size={18} className="animate-spin" />
                                        กำลังบันทึก...
                                    </>
                                ) : (
                                    <>
                                        <Plus size={18} />
                                        เพิ่มสินค้านี้
                                    </>
                                )}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
