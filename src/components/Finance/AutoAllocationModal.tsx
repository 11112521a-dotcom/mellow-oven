import React, { useState } from 'react';
import { Modal } from '../ui/Modal';
import { useStore } from '@/src/store';
import { Sparkles, DollarSign, TrendingUp, Settings, RotateCcw } from 'lucide-react';

interface AutoAllocationModalProps {
    isOpen: boolean;
    onClose: () => void;
    defaultAmount?: number;
}

export const AutoAllocationModal: React.FC<AutoAllocationModalProps> = ({
    isOpen,
    onClose,
    defaultAmount = 0
}) => {
    const { jars, autoAllocate } = useStore();
    const [amount, setAmount] = useState(defaultAmount.toString());
    const [customPercentages, setCustomPercentages] = useState<Record<string, number>>({});
    const [isCustomizing, setIsCustomizing] = useState(false);

    const totalAmount = Number(amount) || 0;

    // Use custom percentages if customizing, otherwise use default
    const allocations = jars.map(jar => {
        const percentage = isCustomizing && customPercentages[jar.id] !== undefined
            ? customPercentages[jar.id] / 100
            : jar.allocationPercent;

        return {
            ...jar,
            displayPercentage: percentage * 100,
            allocated: totalAmount * percentage
        };
    });

    const totalPercentage = allocations.reduce((sum, jar) => sum + jar.displayPercentage, 0);
    const isValidTotal = Math.abs(totalPercentage - 100) < 0.01; // Allow small floating point errors

    const handlePercentageChange = (jarId: string, value: string) => {
        const numValue = Number(value) || 0;
        setCustomPercentages(prev => ({
            ...prev,
            [jarId]: Math.max(0, Math.min(100, numValue)) // Clamp between 0-100
        }));
    };

    const handleResetPercentages = () => {
        setCustomPercentages({});
        setIsCustomizing(false);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (totalAmount > 0 && isValidTotal) {
            // If customizing, create a custom allocation
            if (isCustomizing) {
                const { updateJarBalance, addTransaction } = useStore.getState();
                allocations.forEach(jar => {
                    updateJarBalance(jar.id, jar.allocated);
                    addTransaction({
                        id: crypto.randomUUID(),
                        date: new Date().toISOString(),
                        amount: jar.allocated,
                        type: 'INCOME',
                        toJar: jar.id,
                        description: `Custom allocation (${jar.displayPercentage.toFixed(1)}%)`
                    });
                });
            } else {
                autoAllocate(totalAmount);
            }
            onClose();
            setAmount('');
            handleResetPercentages();
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="🎯 แบ่งกำไรอัตโนมัติ"
        >
            <form onSubmit={handleSubmit} className="space-y-5">
                {/* Amount Input */}
                <div className="bg-gradient-to-r from-cafe-600 to-cafe-700 text-white p-5 rounded-xl">
                    <label className="block text-cafe-100 text-sm mb-2 flex items-center gap-2">
                        <DollarSign size={16} />
                        กำไรที่จะแบ่ง
                    </label>
                    <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full bg-white/20 backdrop-blur-sm text-white text-3xl font-bold p-4 rounded-lg border-2 border-white/30 focus:border-white/60 outline-none placeholder-white/50"
                        placeholder="10,000"
                        min="0"
                        step="100"
                        required
                    />
                    <p className="text-cafe-100 text-xs mt-2">จะแบ่งเงินตามสัดส่วนที่กำหนดไว้</p>
                </div>

                {/* Customize Toggle */}
                {totalAmount > 0 && (
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Settings size={16} className="text-cafe-600" />
                            <span className="text-sm font-medium text-cafe-700">
                                {isCustomizing ? 'กำลังปรับสัดส่วน' : 'ปรับสัดส่วนเอง'}
                            </span>
                        </div>
                        <div className="flex gap-2">
                            {isCustomizing && (
                                <button
                                    type="button"
                                    onClick={handleResetPercentages}
                                    className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 transition-colors"
                                >
                                    <RotateCcw size={14} />
                                    รีเซ็ต
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={() => setIsCustomizing(!isCustomizing)}
                                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${isCustomizing
                                        ? 'bg-cafe-600 text-white'
                                        : 'bg-cafe-100 text-cafe-700 hover:bg-cafe-200'
                                    }`}
                            >
                                {isCustomizing ? 'ใช้ค่าเดิม' : 'ปรับเอง'}
                            </button>
                        </div>
                    </div>
                )}

                {/* Allocation Preview */}
                {totalAmount > 0 && (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-sm font-medium text-cafe-700">
                                <Sparkles size={16} />
                                การแบ่งเงินตามสัดส่วน:
                            </div>
                            {isCustomizing && (
                                <span className={`text-xs font-medium ${isValidTotal ? 'text-green-600' : 'text-red-600'}`}>
                                    รวม: {totalPercentage.toFixed(1)}% {!isValidTotal && '(ต้อง = 100%)'}
                                </span>
                            )}
                        </div>

                        {allocations.map((jar) => (
                            <div
                                key={jar.id}
                                className="flex items-center justify-between p-3 bg-cafe-50 rounded-lg hover:bg-cafe-100 transition-colors"
                            >
                                <div className="flex items-center gap-3 flex-1">
                                    {isCustomizing ? (
                                        <input
                                            type="number"
                                            value={customPercentages[jar.id] !== undefined ? customPercentages[jar.id] : jar.allocationPercent * 100}
                                            onChange={(e) => handlePercentageChange(jar.id, e.target.value)}
                                            className="w-16 px-2 py-1 bg-white border border-cafe-300 rounded text-center font-bold text-cafe-800 focus:ring-2 focus:ring-cafe-500 focus:border-transparent"
                                            min="0"
                                            max="100"
                                            step="1"
                                        />
                                    ) : (
                                        <div className="w-16 h-8 bg-cafe-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                                            {jar.displayPercentage.toFixed(0)}%
                                        </div>
                                    )}
                                    <div>
                                        <p className="font-medium text-cafe-800">{jar.name}</p>
                                        <p className="text-xs text-cafe-500">{jar.description}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-green-600 text-lg">
                                        +฿{jar.allocated.toLocaleString()}
                                    </p>
                                    <p className="text-xs text-cafe-500">
                                        ใหม่: ฿{(jar.balance + jar.allocated).toLocaleString()}
                                    </p>
                                </div>
                            </div>
                        ))}

                        {/* Summary */}
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                            <div className="flex items-start gap-3">
                                <TrendingUp className="text-green-600 mt-0.5" size={20} />
                                <div className="flex-1">
                                    <h4 className="font-bold text-green-800 mb-1">ประโยชน์ของการแบ่งเงินอัตโนมัติ</h4>
                                    <ul className="text-sm text-green-700 space-y-1">
                                        <li>✓ ประหยัดเวลา - กดปุ่มเดียวเสร็จ</li>
                                        <li>✓ แม่นยำ - แบ่งตามสัดส่วนที่ตั้งไว้</li>
                                        <li>✓ บันทึกอัตโนมัติ - มี Transaction Log</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Buttons */}
                <div className="flex gap-3 pt-2">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 bg-gray-200 text-cafe-800 py-3 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                    >
                        ยกเลิก
                    </button>
                    <button
                        type="submit"
                        disabled={totalAmount <= 0 || (isCustomizing && !isValidTotal)}
                        className="flex-1 bg-cafe-600 text-white py-3 rounded-lg hover:bg-cafe-700 transition-colors font-bold disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        <Sparkles size={18} />
                        ยืนยันแบ่งเงิน
                    </button>
                </div>
            </form>
        </Modal>
    );
};
