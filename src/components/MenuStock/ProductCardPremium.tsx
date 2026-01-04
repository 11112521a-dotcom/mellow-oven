import React, { useState } from 'react';
import {
    Clock, Settings, Package, Trash2, Ban, BarChart3,
    ChevronRight, Check, Flame, Truck
} from 'lucide-react';

interface ProductCardPremiumProps {
    item: {
        id: string;
        name: string;
        category: string;
        emoji?: string; // Product emoji/icon
    };
    stockYesterday: number;
    savedRecord: {
        producedQty: number;
        toShopQty: number;
        wasteQty: number;
        soldQty: number;
    };
    onProduce: (val: number) => void;
    onSend: (val: number) => void;
    onWaste: (val: number) => void;
    dailyTarget?: number;
}

// Icon Button Component
const IconButton: React.FC<{
    icon: React.ReactNode;
    label: string;
    value: number | string;
    color: string;
    bgColor: string;
    onClick?: () => void;
}> = ({ icon, label, value, color, bgColor, onClick }) => (
    <div
        className={`flex flex-col items-center gap-1 cursor-pointer hover:scale-105 transition-transform ${onClick ? 'cursor-pointer' : ''}`}
        onClick={onClick}
    >
        <div className={`w-10 h-10 ${bgColor} rounded-full flex items-center justify-center`}>
            {icon}
        </div>
        <span className="text-[10px] text-gray-500">{label}</span>
        <span className={`text-sm font-bold ${color}`}>{value}</span>
    </div>
);

export const ProductCardPremium: React.FC<ProductCardPremiumProps> = ({
    item,
    stockYesterday,
    savedRecord,
    onProduce,
    onSend,
    onWaste,
    dailyTarget = 15
}) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [prodInput, setProdInput] = useState('');
    const [sendInput, setSendInput] = useState('');
    const [wasteInput, setWasteInput] = useState('');

    // 🧮 CRITICAL CALCULATIONS (Preserved from Original!)
    const confirmedStock = stockYesterday + savedRecord.producedQty;
    // สูตรหาของที่ส่งได้ = มีอยู่จริง - ส่งไปแล้ว - ของเสีย
    const availableToSend = Math.max(0, confirmedStock - savedRecord.toShopQty - savedRecord.wasteQty);
    // สูตรหาของเหลือ = มีอยู่จริง - ส่งไปแล้ว - ของเสีย  
    const leftover = confirmedStock - savedRecord.toShopQty - savedRecord.wasteQty;

    // Handlers with safety
    const handleProduce = () => {
        const val = parseInt(prodInput);
        if (val > 0) {
            onProduce(val);
            setProdInput('');
        }
    };

    const handleSend = () => {
        const val = parseInt(sendInput);
        if (val > 0) {
            // 🛡️ Safety: ห้ามส่งเกินที่มี
            if (val > availableToSend) {
                alert(`ส่งไม่ได้! มีของให้ส่งแค่ ${availableToSend} ชิ้น`);
                return;
            }
            onSend(val);
            setSendInput('');
        }
    };

    const handleWaste = () => {
        const val = parseInt(wasteInput);
        if (val > 0) {
            onWaste(val);
            setWasteInput('');
        }
    };

    // Get product emoji based on category/name
    const getProductEmoji = () => {
        const name = item.name.toLowerCase();
        if (name.includes('ขนมปัง')) return '🍞';
        if (name.includes('ครัวซอง')) return '🥐';
        if (name.includes('เค้ก')) return '🍰';
        if (name.includes('คุกกี้')) return '🍪';
        if (name.includes('โดนัท')) return '🍩';
        if (name.includes('ทาร์ต')) return '🥧';
        if (name.includes('มัฟฟิน')) return '🧁';
        if (name.includes('กาแฟ')) return '☕';
        return '🥖';
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition-all">
            {/* Header - Product Info */}
            <div
                className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-4">
                    {/* Product Image/Emoji */}
                    <div className="w-14 h-14 bg-gradient-to-br from-amber-50 to-orange-100 rounded-2xl flex items-center justify-center text-3xl shadow-sm">
                        {item.emoji || getProductEmoji()}
                    </div>

                    {/* Product Info */}
                    <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-gray-800 text-lg truncate">{item.name}</h3>
                        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                            {item.category}
                        </span>
                    </div>

                    {/* Stock Badge */}
                    <div className="flex items-center gap-2">
                        <div className="bg-amber-100 text-amber-700 px-3 py-1.5 rounded-full text-sm font-bold">
                            สต็อกรวม: {confirmedStock}
                        </div>
                        <ChevronRight
                            size={20}
                            className={`text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                        />
                    </div>
                </div>
            </div>

            {/* Stats Row - Always Visible */}
            <div className="px-4 pb-4">
                <div className="flex justify-between items-center py-3 border-t border-gray-100">
                    <IconButton
                        icon={<Clock size={18} className="text-gray-500" />}
                        label="เมื่อวาน"
                        value={stockYesterday}
                        color="text-gray-600"
                        bgColor="bg-gray-100"
                    />
                    <IconButton
                        icon={<Settings size={18} className="text-blue-500" />}
                        label="ผลิต"
                        value={`+${savedRecord.producedQty}`}
                        color="text-blue-600"
                        bgColor="bg-blue-100"
                    />
                    <IconButton
                        icon={<Package size={18} className="text-violet-500" />}
                        label="ส่งไปร้าน"
                        value={savedRecord.toShopQty}
                        color="text-violet-600"
                        bgColor="bg-violet-100"
                    />
                    <IconButton
                        icon={<Trash2 size={18} className="text-red-500" />}
                        label="ทิ้ง"
                        value={savedRecord.wasteQty}
                        color="text-red-600"
                        bgColor="bg-red-100"
                    />
                    <IconButton
                        icon={<Ban size={18} className="text-orange-500" />}
                        label="เสีย"
                        value={savedRecord.wasteQty}
                        color="text-orange-600"
                        bgColor="bg-orange-100"
                    />
                    <IconButton
                        icon={<BarChart3 size={18} className="text-emerald-500" />}
                        label="คงเหลือ"
                        value={leftover}
                        color="text-emerald-600"
                        bgColor="bg-emerald-100"
                    />
                </div>
            </div>

            {/* Expanded: Input Actions */}
            {isExpanded && (
                <div className="px-4 pb-4 space-y-3 border-t border-gray-100 pt-4 animate-in slide-in-from-top-2">
                    {/* Produce Input */}
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                            <Flame size={18} className="text-blue-500" />
                        </div>
                        <input
                            type="number"
                            value={prodInput}
                            onChange={(e) => setProdInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleProduce()}
                            placeholder="จำนวนที่ต้องการผลิต..."
                            className="flex-1 px-4 py-2 bg-blue-50 border border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                        />
                        <button
                            onClick={handleProduce}
                            disabled={!prodInput}
                            className="p-2.5 bg-blue-500 text-white rounded-xl disabled:opacity-50 hover:bg-blue-600 transition-colors"
                        >
                            <Check size={18} />
                        </button>
                    </div>

                    {/* Send Input */}
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-violet-100 rounded-full flex items-center justify-center shrink-0">
                            <Truck size={18} className="text-violet-500" />
                        </div>
                        <input
                            type="number"
                            value={sendInput}
                            onChange={(e) => setSendInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                            placeholder={`ส่งไปร้าน (max ${availableToSend})...`}
                            className="flex-1 px-4 py-2 bg-violet-50 border border-violet-200 rounded-xl focus:ring-2 focus:ring-violet-400 focus:border-transparent"
                        />
                        <button
                            onClick={handleSend}
                            disabled={!sendInput || parseInt(sendInput) > availableToSend}
                            className="p-2.5 bg-violet-500 text-white rounded-xl disabled:opacity-50 hover:bg-violet-600 transition-colors"
                        >
                            <Check size={18} />
                        </button>
                    </div>

                    {/* Waste Input */}
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center shrink-0">
                            <Trash2 size={18} className="text-red-500" />
                        </div>
                        <input
                            type="number"
                            value={wasteInput}
                            onChange={(e) => setWasteInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleWaste()}
                            placeholder="จำนวนที่เสียหาย..."
                            className="flex-1 px-4 py-2 bg-red-50 border border-red-200 rounded-xl focus:ring-2 focus:ring-red-400 focus:border-transparent"
                        />
                        <button
                            onClick={handleWaste}
                            disabled={!wasteInput}
                            className="p-2.5 bg-red-500 text-white rounded-xl disabled:opacity-50 hover:bg-red-600 transition-colors"
                        >
                            <Check size={18} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
