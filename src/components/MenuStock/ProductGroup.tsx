import React, { useState } from 'react';
import {
    ChevronDown, ChevronUp, Flame, Truck, Target, Clock,
    Settings, Package, Trash2, Ban, BarChart3, Check, Utensils, Gift, Edit2, X
} from 'lucide-react';

// Types
interface VariantData {
    id: string;
    variantId: string;
    name: string;
    stockYesterday: number;
    savedRecord: {
        producedQty: number;
        toShopQty: number;
        wasteQty: number;
        eatQty: number;
        giveawayQty: number;
        soldQty: number;
    };
    dailyTarget: number;
}

interface ProductGroupProps {
    productId: string;
    productName: string;
    category: string;
    emoji?: string;
    variants: VariantData[];
    onProduce: (variantId: string, val: number) => void;
    onSend: (variantId: string, val: number) => void;
    onWaste: (variantId: string, val: number) => void;
    onEat: (variantId: string, val: number) => void;
    onGiveaway: (variantId: string, val: number) => void;
    onBulkProduce: (productId: string) => void;
    onBulkSend: (productId: string) => void;
    onBulkTarget: (productId: string) => void;
    onEditValues?: (variantId: string, updates: Partial<{ producedQty: number; toShopQty: number; wasteQty: number; eatQty: number; giveawayQty: number }>) => void;
}

// Get product emoji based on name
const getProductEmoji = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes('ขนมปัง')) return '🍞';
    if (n.includes('ครัวซอง')) return '🥐';
    if (n.includes('เค้ก')) return '🍰';
    if (n.includes('คุกกี้')) return '🍪';
    if (n.includes('โดนัท')) return '🍩';
    if (n.includes('ทาร์ต')) return '🥧';
    if (n.includes('มัฟฟิน')) return '🧁';
    if (n.includes('เครป')) return '🥞';
    if (n.includes('กาแฟ')) return '☕';
    if (n.includes('ชีส')) return '🧀';
    return '🥖';
};

// Variant Row Component
const VariantRow: React.FC<{
    variant: VariantData;
    onProduce: (val: number) => void;
    onSend: (val: number) => void;
    onWaste: (val: number) => void;
    onEat: (val: number) => void;
    onGiveaway: (val: number) => void;
    onEditValues?: (updates: Partial<{ producedQty: number; toShopQty: number; wasteQty: number; eatQty: number; giveawayQty: number }>) => void;
}> = ({ variant, onProduce, onSend, onWaste, onEat, onGiveaway, onEditValues }) => {
    const [prodInput, setProdInput] = useState('');
    const [sendInput, setSendInput] = useState('');
    const [wasteInput, setWasteInput] = useState('');
    const [eatInput, setEatInput] = useState('');
    const [giveawayInput, setGiveawayInput] = useState('');
    const [expandedAction, setExpandedAction] = useState<'produce' | 'send' | 'waste' | 'eat' | 'giveaway' | 'edit' | null>(null);

    const saved = variant.savedRecord;

    // Edit state corresponding to what's already saved
    const [editForm, setEditForm] = useState({
        producedQty: saved.producedQty,
        toShopQty: saved.toShopQty,
        eatQty: saved.eatQty,
        giveawayQty: saved.giveawayQty,
        wasteQty: saved.wasteQty
    });

    const confirmedStock = variant.stockYesterday + saved.producedQty;
    // Calculation: Leftover = StockYesterday + Produced - ToShop - Waste - Eat - Giveaway
    const leftover = confirmedStock - saved.toShopQty - saved.wasteQty - saved.eatQty - saved.giveawayQty;
    // Available to send = Leftover (conceptually, but typically we send what we have)
    // For safety, let's say available to send is what's not yet sent/wasted/eaten/given
    const availableToSend = Math.max(0, leftover);

    const handleProduce = () => {
        const val = parseInt(prodInput);
        if (val > 0) { onProduce(val); setProdInput(''); setExpandedAction(null); }
    };

    const handleSend = () => {
        const val = parseInt(sendInput);
        if (val > 0) {
            onSend(val); setSendInput(''); setExpandedAction(null);
        }
    };

    const handleWaste = () => {
        const val = parseInt(wasteInput);
        if (val > 0) { onWaste(val); setWasteInput(''); setExpandedAction(null); }
    };

    const handleEat = () => {
        const val = parseInt(eatInput);
        if (val > 0) { onEat(val); setEatInput(''); setExpandedAction(null); }
    };

    const handleGiveaway = () => {
        const val = parseInt(giveawayInput);
        if (val > 0) { onGiveaway(val); setGiveawayInput(''); setExpandedAction(null); }
    };

    const handleSaveEdit = () => {
        if (onEditValues) {
            onEditValues(editForm);
            setExpandedAction(null);
        }
    };

    const openEditMode = () => {
        setEditForm({
            producedQty: saved.producedQty,
            toShopQty: saved.toShopQty,
            eatQty: saved.eatQty,
            giveawayQty: saved.giveawayQty,
            wasteQty: saved.wasteQty
        });
        setExpandedAction(expandedAction === 'edit' ? null : 'edit');
    };

    return (
        <div className="border-b border-gray-100 last:border-b-0">
            {/* Variant Header */}
            <div className="py-3 px-4 flex items-center gap-4">
                {/* Variant Name */}
                <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-gray-700">{variant.name}</span>
                </div>

                {/* Quick Stats */}
                <div className="flex items-center gap-3 text-xs">
                    <div className="text-center hidden sm:block">
                        <span className="text-gray-400 block">เก่า</span>
                        <span className="font-semibold text-gray-600">{variant.stockYesterday}</span>
                    </div>
                    <div className="text-center">
                        <span className="text-blue-400 block">ผลิต</span>
                        <span className="font-semibold text-blue-600">+{saved.producedQty}</span>
                    </div>
                    <div className="text-center">
                        <span className="text-violet-400 block">ส่ง</span>
                        <span className="font-semibold text-violet-600">{saved.toShopQty}</span>
                    </div>
                    <div className="text-center">
                        <span className="text-orange-400 block">กิน</span>
                        <span className="font-semibold text-orange-600">{saved.eatQty}</span>
                    </div>
                    <div className="text-center">
                        <span className="text-pink-400 block">แจก</span>
                        <span className="font-semibold text-pink-600">{saved.giveawayQty}</span>
                    </div>
                    <div className="text-center">
                        <span className="text-red-400 block">ทิ้ง</span>
                        <span className="font-semibold text-red-600">{saved.wasteQty}</span>
                    </div>
                    <div className="text-center min-w-[50px]">
                        <span className="text-emerald-400 block">เหลือ</span>
                        <span className={`font-bold ${leftover < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                            {leftover}
                        </span>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => setExpandedAction(expandedAction === 'produce' ? null : 'produce')}
                        className={`p-2 rounded-lg transition-colors ${expandedAction === 'produce' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500 hover:bg-blue-50'}`}
                        title="ผลิตเพิ่ม"
                    >
                        <Flame size={16} />
                    </button>
                    <button
                        onClick={() => setExpandedAction(expandedAction === 'send' ? null : 'send')}
                        className={`p-2 rounded-lg transition-colors ${expandedAction === 'send' ? 'bg-violet-100 text-violet-600' : 'bg-gray-100 text-gray-500 hover:bg-violet-50'}`}
                        title="ส่งไปร้าน"
                    >
                        <Truck size={16} />
                    </button>
                    <button
                        onClick={() => setExpandedAction(expandedAction === 'eat' ? null : 'eat')}
                        className={`p-2 rounded-lg transition-colors ${expandedAction === 'eat' ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-500 hover:bg-orange-50'}`}
                        title="กินเอง"
                    >
                        <Utensils size={16} />
                    </button>
                    <button
                        onClick={() => setExpandedAction(expandedAction === 'giveaway' ? null : 'giveaway')}
                        className={`p-2 rounded-lg transition-colors ${expandedAction === 'giveaway' ? 'bg-pink-100 text-pink-600' : 'bg-gray-100 text-gray-500 hover:bg-pink-50'}`}
                        title="แจกฟรี"
                    >
                        <Gift size={16} />
                    </button>
                    <button
                        onClick={() => setExpandedAction(expandedAction === 'waste' ? null : 'waste')}
                        className={`p-2 rounded-lg transition-colors ${expandedAction === 'waste' ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500 hover:bg-red-50'}`}
                        title="ของเสีย"
                    >
                        <Trash2 size={16} />
                    </button>
                    {onEditValues && (
                        <button
                            onClick={openEditMode}
                            className={`p-2 rounded-lg transition-colors ml-1 ${expandedAction === 'edit' ? 'bg-slate-700 text-white' : 'bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-700'}`}
                            title="แก้ไขข้อมูล (แทนที่)"
                        >
                            <Edit2 size={16} />
                        </button>
                    )}
                </div>
            </div>

            {/* Expanded Input */}
            {expandedAction && expandedAction !== 'edit' && (
                <div className={`px-4 pb-3 animate-in slide-in-from-top-1`}>
                    <div className={`flex items-center gap-2 p-2 rounded-lg ${expandedAction === 'produce' ? 'bg-blue-50' :
                            expandedAction === 'send' ? 'bg-violet-50' :
                                expandedAction === 'eat' ? 'bg-orange-50' :
                                    expandedAction === 'giveaway' ? 'bg-pink-50' :
                                        'bg-red-50'
                        }`}>
                        <input
                            type="number"
                            min="1"
                            value={
                                expandedAction === 'produce' ? prodInput :
                                    expandedAction === 'send' ? sendInput :
                                        expandedAction === 'eat' ? eatInput :
                                            expandedAction === 'giveaway' ? giveawayInput :
                                                wasteInput
                            }
                            onChange={(e) => {
                                if (expandedAction === 'produce') setProdInput(e.target.value);
                                if (expandedAction === 'send') setSendInput(e.target.value);
                                if (expandedAction === 'eat') setEatInput(e.target.value);
                                if (expandedAction === 'giveaway') setGiveawayInput(e.target.value);
                                if (expandedAction === 'waste') setWasteInput(e.target.value);
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    if (expandedAction === 'produce') handleProduce();
                                    if (expandedAction === 'send') handleSend();
                                    if (expandedAction === 'eat') handleEat();
                                    if (expandedAction === 'giveaway') handleGiveaway();
                                    if (expandedAction === 'waste') handleWaste();
                                }
                            }}
                            placeholder={
                                expandedAction === 'produce' ? 'จำนวนที่ต้องการผลิตเพิ่ม...' :
                                    expandedAction === 'send' ? 'จำนวนที่ต้องการส่งเพิ่ม...' :
                                        expandedAction === 'eat' ? 'จำนวนที่กินเพิ่ม...' :
                                            expandedAction === 'giveaway' ? 'จำนวนที่แจกเพิ่ม...' :
                                                'จำนวนของเสียเพิ่ม...'
                            }
                            className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-amber-400"
                            autoFocus
                        />
                        <button
                            onClick={() => {
                                if (expandedAction === 'produce') handleProduce();
                                if (expandedAction === 'send') handleSend();
                                if (expandedAction === 'eat') handleEat();
                                if (expandedAction === 'giveaway') handleGiveaway();
                                if (expandedAction === 'waste') handleWaste();
                            }}
                            className={`p-2 rounded-lg text-white ${expandedAction === 'produce' ? 'bg-blue-500 hover:bg-blue-600' :
                                    expandedAction === 'send' ? 'bg-violet-500 hover:bg-violet-600' :
                                        expandedAction === 'eat' ? 'bg-orange-500 hover:bg-orange-600' :
                                            expandedAction === 'giveaway' ? 'bg-pink-500 hover:bg-pink-600' :
                                                'bg-red-500 hover:bg-red-600'
                                }`}
                        >
                            <Check size={18} />
                        </button>
                    </div>
                </div>
            )}

            {/* Edit Mode Full Row */}
            {expandedAction === 'edit' && (
                <div className="px-4 pb-4 animate-in slide-in-from-top-1">
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                        <div className="flex items-center justify-between mb-3 border-b border-slate-200 pb-2 text-slate-700">
                            <h4 className="font-bold text-sm flex items-center gap-2">
                                <Edit2 size={14} className="text-slate-500" />
                                แก้ไขตัวเลขที่บันทึกไว้ (เซฟทับ)
                            </h4>
                            <span className="text-xs text-slate-500">กรอกค่าที่ถูกต้องลงไปแทนที่อันเก่าได้เลย</span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-4">
                            <div>
                                <label className="text-[10px] font-bold text-blue-600 uppercase mb-1 block">ผลิต</label>
                                <input
                                    type="number" min="0"
                                    value={editForm.producedQty}
                                    onChange={(e) => setEditForm({ ...editForm, producedQty: Math.max(0, parseInt(e.target.value) || 0) })}
                                    className="w-full text-center px-2 py-1.5 bg-white border border-slate-300 rounded text-sm font-bold focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-violet-600 uppercase mb-1 block">ส่งร้าน</label>
                                <input
                                    type="number" min="0"
                                    value={editForm.toShopQty}
                                    onChange={(e) => setEditForm({ ...editForm, toShopQty: Math.max(0, parseInt(e.target.value) || 0) })}
                                    className="w-full text-center px-2 py-1.5 bg-white border border-slate-300 rounded text-sm font-bold focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-orange-600 uppercase mb-1 block">กินเอง</label>
                                <input
                                    type="number" min="0"
                                    value={editForm.eatQty}
                                    onChange={(e) => setEditForm({ ...editForm, eatQty: Math.max(0, parseInt(e.target.value) || 0) })}
                                    className="w-full text-center px-2 py-1.5 bg-white border border-slate-300 rounded text-sm font-bold focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-pink-600 uppercase mb-1 block">แจกฟรี</label>
                                <input
                                    type="number" min="0"
                                    value={editForm.giveawayQty}
                                    onChange={(e) => setEditForm({ ...editForm, giveawayQty: Math.max(0, parseInt(e.target.value) || 0) })}
                                    className="w-full text-center px-2 py-1.5 bg-white border border-slate-300 rounded text-sm font-bold focus:border-pink-500 focus:ring-1 focus:ring-pink-500"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-red-600 uppercase mb-1 block">เสีย</label>
                                <input
                                    type="number" min="0"
                                    value={editForm.wasteQty}
                                    onChange={(e) => setEditForm({ ...editForm, wasteQty: Math.max(0, parseInt(e.target.value) || 0) })}
                                    className="w-full text-center px-2 py-1.5 bg-white border border-slate-300 rounded text-sm font-bold focus:border-red-500 focus:ring-1 focus:ring-red-500"
                                />
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={handleSaveEdit}
                                className="flex-1 bg-slate-800 hover:bg-slate-900 text-white text-sm font-medium py-2 rounded flex items-center justify-center gap-2 transition-colors"
                            >
                                <Check size={16} /> บันทึกการแก้ไข
                            </button>
                            <button
                                onClick={() => setExpandedAction(null)}
                                className="px-4 bg-slate-200 hover:bg-slate-300 text-slate-700 text-sm font-medium py-2 rounded transition-colors"
                            >
                                <X size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Main Product Group Component
export const ProductGroup: React.FC<ProductGroupProps> = ({
    productId,
    productName,
    category,
    emoji,
    variants,
    onProduce,
    onSend,
    onWaste,
    onEat,
    onGiveaway,
    onBulkProduce,
    onBulkSend,
    onBulkTarget,
    onEditValues
}) => {
    const [isExpanded, setIsExpanded] = useState(true);

    // Calculate group totals
    const totals = variants.reduce((acc, v) => {
        const stock = v.stockYesterday + v.savedRecord.producedQty;
        const leftover = stock - v.savedRecord.toShopQty - v.savedRecord.wasteQty - v.savedRecord.eatQty - v.savedRecord.giveawayQty;
        return {
            totalStock: acc.totalStock + stock,
            produced: acc.produced + v.savedRecord.producedQty,
            sent: acc.sent + v.savedRecord.toShopQty,
            waste: acc.waste + v.savedRecord.wasteQty,
            eat: acc.eat + v.savedRecord.eatQty,
            giveaway: acc.giveaway + v.savedRecord.giveawayQty,
            leftover: acc.leftover + leftover
        };
    }, { totalStock: 0, produced: 0, sent: 0, waste: 0, eat: 0, giveaway: 0, leftover: 0 });

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Group Header */}
            <div
                className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 cursor-pointer hover:from-amber-100/50 hover:to-orange-100/50 transition-colors"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-4">
                    {/* Product Emoji */}
                    <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-3xl shadow-sm border border-amber-100">
                        {emoji || getProductEmoji(productName)}
                    </div>

                    {/* Product Info */}
                    <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-gray-800 text-lg">{productName}</h3>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs bg-white/80 text-gray-500 px-2 py-0.5 rounded-full border border-gray-200">
                                {category}
                            </span>
                            <span className="text-xs text-gray-400">
                                {variants.length} รายการ
                            </span>
                        </div>
                    </div>

                    {/* Group Stats */}
                    <div className="flex items-center gap-3">
                        <div className="text-center px-3 py-1 bg-white/80 rounded-xl border border-amber-200">
                            <span className="text-xs text-gray-500 block">รวม</span>
                            <span className="text-lg font-bold text-amber-600">{totals.totalStock}</span>
                        </div>
                        <div className="text-center px-3 py-1 bg-white/80 rounded-xl border border-emerald-200">
                            <span className="text-xs text-gray-500 block">เหลือ</span>
                            <span className={`text-lg font-bold ${totals.leftover < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                                {totals.leftover}
                            </span>
                        </div>
                        <button className="p-2 hover:bg-white/50 rounded-lg transition-colors">
                            {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                        </button>
                    </div>
                </div>

                {/* Group Action Buttons */}
                <div className="flex gap-2 mt-4">
                    <button
                        onClick={(e) => { e.stopPropagation(); onBulkProduce(productId); }}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-xl text-sm font-medium hover:bg-blue-200 transition-colors"
                    >
                        <Flame size={16} />
                        ผลิตทั้งกลุ่ม
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onBulkSend(productId); }}
                        className="flex items-center gap-2 px-4 py-2 bg-violet-100 text-violet-700 rounded-xl text-sm font-medium hover:bg-violet-200 transition-colors"
                    >
                        <Truck size={16} />
                        ส่งทั้งกลุ่ม
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onBulkTarget(productId); }}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-100 text-emerald-700 rounded-xl text-sm font-medium hover:bg-emerald-200 transition-colors"
                    >
                        <Target size={16} />
                        ตั้งเป้ากลุ่ม
                    </button>
                </div>
            </div>

            {/* Variants List */}
            {isExpanded && (
                <div className="divide-y divide-gray-50">
                    {variants.map(variant => (
                        <VariantRow
                            key={variant.id}
                            variant={variant}
                            onProduce={(val) => onProduce(variant.variantId, val)}
                            onSend={(val) => onSend(variant.variantId, val)}
                            onWaste={(val) => onWaste(variant.variantId, val)}
                            onEat={(val) => onEat(variant.variantId, val)}
                            onGiveaway={(val) => onGiveaway(variant.variantId, val)}
                            onEditValues={onEditValues ? (updates) => onEditValues(variant.variantId, updates) : undefined}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};
