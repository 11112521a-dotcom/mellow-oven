import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Store, Plus, Edit2, Check, AlertCircle } from 'lucide-react';
import { useStore } from '../../store';
import { ExternalShop } from '../../../types';

interface ExternalShopsManagerModalProps {
    onClose?: () => void;
    isModal?: boolean;
}

export const ExternalShopsManagerModal: React.FC<ExternalShopsManagerModalProps> = ({ onClose, isModal = true }) => {
    const { externalShops, createExternalShop, updateExternalShop, products } = useStore();
    
    const [isCreating, setIsCreating] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    // Form state
    const [name, setName] = useState('');
    const [contactName, setContactName] = useState('');
    const [contactPhone, setContactPhone] = useState('');
    const [address, setAddress] = useState('');
    const [isActive, setIsActive] = useState(true);
    const [favoriteItems, setFavoriteItems] = useState<{ productId: string, variantId?: string, defaultQty: number, defaultPrice?: number }[]>([]);

    const resetForm = () => {
        setName('');
        setContactName('');
        setContactPhone('');
        setAddress('');
        setIsActive(true);
        setFavoriteItems([]);
        setIsCreating(false);
        setEditingId(null);
        setError('');
    };

    const handleEdit = (shop: ExternalShop) => {
        setName(shop.name);
        setContactName(shop.contactName);
        setContactPhone(shop.contactPhone);
        setAddress(shop.address);
        setIsActive(shop.isActive);
        setFavoriteItems(shop.favoriteItems || []);
        setEditingId(shop.id);
        setIsCreating(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name) {
            setError('กรุณากรอกชื่อร้านค้า/สาขา');
            return;
        }

        setIsSubmitting(true);
        setError('');

        try {
            if (editingId) {
                await updateExternalShop(editingId, {
                    name,
                    contactName,
                    contactPhone,
                    address,
                    isActive,
                    favoriteItems
                });
            } else {
                await createExternalShop({
                    name,
                    contactName,
                    contactPhone,
                    address,
                    isActive,
                    favoriteItems
                });
            }
            resetForm();
        } catch (err) {
            console.error('Failed to save shop:', err);
            setError('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
        } finally {
            setIsSubmitting(false);
        }
    };

    const content = (
        <div className={isModal ? "relative w-full max-w-3xl bg-white rounded-[2rem] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col" : "w-full flex flex-col"}>
            {/* Header */}
            <div className="bg-emerald-500 p-6 flex justify-between items-center text-white shrink-0">
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <Store className="w-6 h-6" />
                        จัดการสาขา / ร้านฝากขาย
                    </h2>
                    <p className="text-emerald-100 mt-1 font-medium text-xs sm:text-sm">เพิ่มหรือแก้ไขข้อมูลร้านค้าที่จะฝากขาย</p>
                </div>
                {isModal && onClose && (
                    <button onClick={onClose} className="p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center hover:bg-emerald-600 rounded-xl transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                )}
            </div>

            <div className={`flex-1 overflow-y-auto p-6 ${isModal ? 'bg-stone-50' : 'bg-white'}`}>
                {error && (
                    <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-xl flex items-center gap-2 border border-red-200">
                        <AlertCircle className="w-5 h-5 shrink-0" />
                        <p className="font-medium text-sm">{error}</p>
                    </div>
                )}

                {/* Create / Edit Form */}
                {(isCreating || editingId) && (
                    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl border border-emerald-100 shadow-sm mb-6">
                        <h3 className="font-bold text-lg mb-4 text-emerald-800">
                            {editingId ? 'แก้ไขข้อมูลสาขา' : 'เพิ่มสาขาใหม่'}
                        </h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">ชื่อร้าน / สาขา <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-base md:text-sm"
                                    placeholder="เช่น ร้านกาแฟตาหนวด สาขา 1"
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">ชื่อผู้ติดต่อ</label>
                                <input
                                    type="text"
                                    value={contactName}
                                    onChange={e => setContactName(e.target.value)}
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-base md:text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">เบอร์โทรศัพท์</label>
                                <input
                                    type="text"
                                    value={contactPhone}
                                    onChange={e => setContactPhone(e.target.value)}
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-base md:text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">สถานะ</label>
                                <select
                                    value={isActive ? 'active' : 'inactive'}
                                    onChange={e => setIsActive(e.target.value === 'active')}
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-base md:text-sm"
                                >
                                    <option value="active">เปิดใช้งาน (Active)</option>
                                    <option value="inactive">ปิดใช้งาน (Inactive)</option>
                                </select>
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-bold text-gray-700 mb-1">ที่อยู่ร้าน</label>
                                <textarea
                                    value={address}
                                    onChange={e => setAddress(e.target.value)}
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-base md:text-sm"
                                    rows={2}
                                />
                            </div>
                            
                            {/* Favorite Items Section */}
                            <div className="md:col-span-2 mt-4 pt-4 border-t border-stone-200">
                                <label className="block text-sm font-bold text-gray-700 mb-2">เมนูประจำร้าน (Favorite Items)</label>
                                <div className="space-y-2">
                                    {favoriteItems.map((fav, index) => {
                                        const product = products.find(p => p.id === fav.productId);
                                        if (!product) return null;
                                        const variant = product.variants?.find(v => v.id === fav.variantId);
                                        return (
                                            <div key={index} className="flex flex-wrap md:flex-nowrap gap-2 items-center bg-stone-50 p-2 rounded-xl">
                                                <div className="flex-1 min-w-[150px] text-sm font-medium">
                                                    {product.name} {variant ? `(${variant.name})` : ''}
                                                </div>
                                                <div className="w-24 shrink-0">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        value={fav.defaultQty}
                                                        onChange={e => {
                                                            const newFavs = [...favoriteItems];
                                                            newFavs[index].defaultQty = Number(e.target.value);
                                                            setFavoriteItems(newFavs);
                                                        }}
                                                        className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-center text-base md:text-sm"
                                                        placeholder="จำนวน"
                                                        title="จำนวนส่งเริ่มต้น"
                                                    />
                                                </div>
                                                <div className="w-28 shrink-0 relative">
                                                    <span className="absolute left-2 top-2 text-stone-400 text-xs font-bold">฿</span>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        value={fav.defaultPrice !== undefined ? fav.defaultPrice : ''}
                                                        onChange={e => {
                                                            const newFavs = [...favoriteItems];
                                                            const val = e.target.value;
                                                            if (val === '') {
                                                                delete newFavs[index].defaultPrice;
                                                            } else {
                                                                newFavs[index].defaultPrice = Number(val);
                                                            }
                                                            setFavoriteItems(newFavs);
                                                        }}
                                                        className="w-full pl-6 pr-2 py-1.5 border border-emerald-200 bg-emerald-50 focus:bg-white rounded-lg text-right text-base md:text-sm"
                                                        placeholder={variant ? variant.price.toString() : product.price.toString()}
                                                        title="ราคาขายส่ง (เว้นว่างเพื่อใช้ราคาเต็ม)"
                                                    />
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const newFavs = [...favoriteItems];
                                                        newFavs.splice(index, 1);
                                                        setFavoriteItems(newFavs);
                                                    }}
                                                    className="p-2 min-h-[40px] min-w-[40px] flex items-center justify-center text-red-500 hover:bg-red-50 rounded shrink-0"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        );
                                    })}
                                    
                                    <div className="flex gap-2">
                                        <select
                                            className="flex-1 px-3 py-2.5 border border-gray-200 rounded-xl text-base md:text-sm bg-white"
                                            onChange={e => {
                                                if (!e.target.value) return;
                                                const [productId, variantId] = e.target.value.split('|');
                                                
                                                // Check if already exists
                                                if (favoriteItems.some(f => f.productId === productId && f.variantId === (variantId || undefined))) {
                                                    e.target.value = '';
                                                    return;
                                                }
                                                
                                                setFavoriteItems([...favoriteItems, {
                                                    productId,
                                                    variantId: variantId || undefined,
                                                    defaultQty: 0
                                                }]);
                                                e.target.value = ''; // Reset
                                            }}
                                            defaultValue=""
                                        >
                                            <option value="" disabled>+ เพิ่มเมนูประจำร้าน</option>
                                            {products.map(p => {
                                                if (p.variants && p.variants.length > 0) {
                                                    return p.variants.map(v => (
                                                        <option key={`${p.id}|${v.id}`} value={`${p.id}|${v.id}`}>
                                                            {p.name} ({v.name})
                                                        </option>
                                                    ));
                                                }
                                                return (
                                                    <option key={p.id} value={`${p.id}|`}>
                                                        {p.name}
                                                    </option>
                                                );
                                            })}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={resetForm}
                                className="px-5 py-2.5 text-gray-600 font-bold hover:bg-gray-100 rounded-xl transition-colors min-h-[44px] flex items-center"
                            >
                                ยกเลิก
                            </button>
                            <button
                                type="submit"
                                disabled={isSubmitting}
                                className="px-6 py-2.5 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2 min-h-[44px]"
                            >
                                {isSubmitting ? 'กำลังบันทึก...' : <><Check className="w-5 h-5" /> บันทึกข้อมูล</>}
                            </button>
                        </div>
                    </form>
                )}

                {/* List */}
                <div className="bg-white rounded-2xl border border-stone-200 shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-stone-200 flex justify-between items-center bg-stone-50/50">
                        <h3 className="font-bold text-stone-800">รายชื่อสาขา / ร้านฝากขาย</h3>
                        {!isCreating && !editingId && (
                            <button
                                onClick={() => setIsCreating(true)}
                                className="px-4 py-2.5 bg-emerald-100 text-emerald-700 font-bold rounded-xl hover:bg-emerald-200 transition-colors flex items-center gap-2 text-base md:text-sm min-h-[44px]"
                            >
                                <Plus className="w-4 h-4" /> เพิ่มสาขา
                            </button>
                        )}
                    </div>
                    
                    <div className="divide-y divide-stone-100">
                        {externalShops.length === 0 ? (
                            <div className="p-8 text-center text-stone-500">
                                ยังไม่มีข้อมูลสาขา
                            </div>
                        ) : (
                            externalShops.map(shop => (
                                <div key={shop.id} className="p-4 flex items-center justify-between hover:bg-stone-50 transition-colors">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h4 className="font-bold text-stone-800">{shop.name}</h4>
                                            {!shop.isActive && (
                                                <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-bold rounded-full">ปิดใช้งาน</span>
                                            )}
                                        </div>
                                        <div className="text-sm text-stone-500 mt-1 flex flex-col sm:flex-row sm:gap-4">
                                            {shop.contactName && <span>ผู้ติดต่อ: {shop.contactName}</span>}
                                            {shop.contactPhone && <span>โทร: {shop.contactPhone}</span>}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleEdit(shop)}
                                        className="p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                                    >
                                        <Edit2 className="w-5 h-5" />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );

    if (!isModal) {
        return content;
    }

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm"
                    onClick={onClose}
                />
                
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="relative w-full max-w-3xl bg-white rounded-[2rem] shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
                >
                    {content}
                </motion.div>
            </div>
        </AnimatePresence>
    );
};
