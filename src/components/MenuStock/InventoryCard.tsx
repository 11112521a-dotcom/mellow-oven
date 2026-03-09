import React, { useState } from 'react';
import { Flame, Truck, Trash2, Check, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';

// Interface ต้องรับค่า Saved Record เพื่อความชัวร์
interface InventoryCardProps {
    item: {
        id: string;
        name: string;
        category: string;
        isVariant: boolean;
    };
    stockYesterday: number;
    savedRecord: {
        producedQty: number;
        toShopQty: number;
        wasteQty: number;
        eatQty: number;
        giveawayQty: number;
        soldQty: number;
    };
    onProduce: (val: number) => void;
    onSend: (val: number) => void;
    onWaste: (val: number) => void;
    onEat: (val: number) => void;
    onGiveaway: (val: number) => void;
    dailyTarget?: number;
}

export const InventoryCard: React.FC<InventoryCardProps> = ({
    item, stockYesterday, savedRecord, onProduce, onSend, onWaste, onEat, onGiveaway, dailyTarget = 15
}) => {
    // Local state for inline inputs
    const [prodInput, setProdInput] = useState('');
    const [sendInput, setSendInput] = useState('');
    const [wasteInput, setWasteInput] = useState('');
    const [eatInput, setEatInput] = useState('');
    const [giveawayInput, setGiveawayInput] = useState('');

    // 🧮 CRITICAL CALCULATION LOGIC (Preserved from Audit)
    const confirmedStock = stockYesterday + savedRecord.producedQty;
    // สูตรหาของที่ส่งได้ = มีอยู่จริง - ส่งไปแล้ว - ของเสีย - กิน - แจก
    const availableToSend = Math.max(0, confirmedStock - savedRecord.toShopQty - savedRecord.wasteQty - savedRecord.eatQty - savedRecord.giveawayQty);

    // สูตรหาของเหลือที่บ้าน = มีอยู่จริง - ส่งไปแล้ว - ของเสีย - กิน - แจก
    const leftoverHome = confirmedStock - savedRecord.toShopQty - savedRecord.wasteQty - savedRecord.eatQty - savedRecord.giveawayQty;

    const progressPercent = Math.min(100, Math.round((confirmedStock / dailyTarget) * 100));

    // Handlers
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
            // 🛡️ Safety Check: ห้ามส่งเกินที่มี
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

    const handleEat = () => {
        const val = parseInt(eatInput);
        if (val > 0) {
            onEat(val);
            setEatInput('');
        }
    };

    const handleGiveaway = () => {
        const val = parseInt(giveawayInput);
        if (val > 0) {
            onGiveaway(val);
            setGiveawayInput('');
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
            {/* Header / Info */}
            <div className="p-3 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100">
                <div className="flex justify-between items-start mb-2">
                    <div>
                        <h3 className="font-bold text-gray-800">{item.name}</h3>
                        <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{item.category}</span>
                    </div>
                    <div className="text-right">
                        <div className={`text-xl font-bold ${leftoverHome < 0 ? 'text-red-500' : 'text-amber-600'}`}>
                            {leftoverHome}
                        </div>
                        <div className="text-[10px] text-gray-400">เหลือที่บ้าน</div>
                    </div>
                </div>

                {/* Target Progress */}
                <div className="w-full bg-gray-100 rounded-full h-1.5 mb-1">
                    <div
                        className={`h-1.5 rounded-full ${progressPercent >= 100 ? 'bg-emerald-500' : 'bg-blue-400'}`}
                        style={{ width: `${progressPercent}%` }}
                    />
                </div>
                <div className="flex justify-between text-[10px] text-gray-400">
                    <span>เป้า {dailyTarget}</span>
                    <span>{progressPercent}%</span>
                </div>
            </div>

            {/* Stats Row (Read-only) */}
            <div className="grid grid-cols-3 divide-x divide-gray-50 bg-white text-center py-2 text-xs text-gray-500">
                <div>
                    <span className="block text-[10px] opacity-70">เก่า</span>
                    <span className="font-semibold">{stockYesterday}</span>
                </div>
                <div>
                    <span className="block text-[10px] opacity-70 text-blue-500">ผลิต</span>
                    <span className="font-semibold text-blue-600">+{savedRecord.producedQty}</span>
                </div>
                <div>
                    <span className="block text-[10px] opacity-70 text-violet-500">ส่ง</span>
                    <span className="font-semibold text-violet-600">-{savedRecord.toShopQty}</span>
                </div>
            </div>

            {/* Action Inputs */}
            <div className="p-2 space-y-2 bg-gray-50/50">
                {/* Produce Input */}
                <InputRow
                    icon={<Flame size={14} className="text-blue-500" />}
                    color="blue"
                    value={prodInput}
                    onChange={setProdInput}
                    onConfirm={handleProduce}
                    placeholder="ผลิตเพิ่ม..."
                />

                {/* Send Input */}
                <InputRow
                    icon={<Truck size={14} className="text-violet-500" />}
                    color="violet"
                    value={sendInput}
                    onChange={setSendInput}
                    onConfirm={handleSend}
                    placeholder={`ส่ง (max ${availableToSend})`}
                    disabled={availableToSend <= 0}
                />

                {/* Waste Input */}
                <InputRow
                    icon={<Trash2 size={14} className="text-red-500" />}
                    color="red"
                    value={wasteInput}
                    onChange={setWasteInput}
                    onConfirm={handleWaste}
                    placeholder={`ทิ้ง (เสีย ${savedRecord.wasteQty})`}
                />

                {/* Eat Input */}
                <InputRow
                    icon={<span className="text-orange-500 text-sm leading-none pl-0.5" >🍽️</span>}
                    color="orange"
                    value={eatInput}
                    onChange={setEatInput}
                    onConfirm={handleEat}
                    placeholder={`กินเอง (${savedRecord.eatQty})`}
                />

                {/* Giveaway Input */}
                <InputRow
                    icon={<span className="text-pink-500 text-sm leading-none pl-0.5" >🎁</span>}
                    color="pink"
                    value={giveawayInput}
                    onChange={setGiveawayInput}
                    onConfirm={handleGiveaway}
                    placeholder={`แจกฟรี (${savedRecord.giveawayQty})`}
                />
            </div>
        </div>
    );
};

// Helper Component for consistent inputs
const InputRow = ({ icon, color, value, onChange, onConfirm, placeholder, disabled = false }: any) => {
    const borderColors: any = {
        blue: 'focus-within:border-blue-400 focus-within:ring-blue-100',
        violet: 'focus-within:border-violet-400 focus-within:ring-violet-100',
        red: 'focus-within:border-red-400 focus-within:ring-red-100',
        orange: 'focus-within:border-orange-400 focus-within:ring-orange-100',
        pink: 'focus-within:border-pink-400 focus-within:ring-pink-100'
    };

    const btnColors: any = {
        blue: 'bg-blue-500 hover:bg-blue-600',
        violet: 'bg-violet-500 hover:bg-violet-600',
        red: 'bg-red-500 hover:bg-red-600',
        orange: 'bg-orange-500 hover:bg-orange-600',
        pink: 'bg-pink-500 hover:bg-pink-600'
    };

    return (
        <div className={`flex items-center gap-1 bg-white border border-gray-200 rounded-lg p-1 transition-all ${!disabled ? borderColors[color] : 'opacity-50'}`}>
            <div className="pl-2">{icon}</div>
            <input
                type="number"
                className="w-full text-xs border-none focus:ring-0 p-1 bg-transparent"
                placeholder={placeholder}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && onConfirm()}
                disabled={disabled}
            />
            <button
                onClick={onConfirm}
                disabled={disabled || !value}
                className={`p-1.5 rounded-md text-white shadow-sm transition-colors ${btnColors[color]} disabled:bg-gray-300`}
            >
                <Check size={14} />
            </button>
        </div>
    );
};
