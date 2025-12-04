import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { useStore } from '@/src/store';
import { JarType } from '@/types';
import { ArrowRight, ArrowRightLeft, TrendingUp, TrendingDown, Wallet, Store, Tag, FileText, Plus } from 'lucide-react';
import { formatCurrency } from '@/src/lib/utils';

interface TransactionModalProps {
    isOpen: boolean;
    onClose: () => void;
    mode: 'INCOME' | 'EXPENSE' | 'TRANSFER';
    defaultJar?: JarType;
}

export const TransactionModal: React.FC<TransactionModalProps> = ({ isOpen, onClose, mode, defaultJar }) => {
    const { jars, addTransaction, updateJarBalance, transferFunds, markets } = useStore();

    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [fromJar, setFromJar] = useState<JarType>('Working');
    const [toJar, setToJar] = useState<JarType>('Working');
    const [marketId, setMarketId] = useState<string>('');
    const [category, setCategory] = useState('General');

    useEffect(() => {
        if (isOpen) {
            setAmount('');
            setDescription('');
            setCategory('General');

            // Set defaults based on mode
            if (mode === 'INCOME') {
                setToJar(defaultJar || 'Working');
                setMarketId(markets[0]?.id || '');
            } else if (mode === 'EXPENSE') {
                setFromJar(defaultJar || 'Opex');
            } else if (mode === 'TRANSFER') {
                setFromJar(defaultJar || 'Working');
                setToJar(defaultJar === 'Working' ? 'CapEx' : 'Working');
            }
        }
    }, [isOpen, mode, defaultJar, markets]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const numAmount = parseFloat(amount);
        if (isNaN(numAmount) || numAmount <= 0) return;

        if (mode === 'INCOME') {
            updateJarBalance(toJar, numAmount);
            addTransaction({
                id: crypto.randomUUID(),
                date: new Date().toISOString(),
                amount: numAmount,
                type: 'INCOME',
                toJar,
                marketId: marketId || undefined,
                description: description || 'รายรับ',
                category: 'Sales'
            });
        } else if (mode === 'EXPENSE') {
            updateJarBalance(fromJar, -numAmount);
            addTransaction({
                id: crypto.randomUUID(),
                date: new Date().toISOString(),
                amount: numAmount,
                type: 'EXPENSE',
                fromJar,
                description: description || 'รายจ่าย',
                category
            });
        } else if (mode === 'TRANSFER') {
            transferFunds(fromJar, toJar, numAmount, description || 'โอนเงิน');
        }

        onClose();
    };

    const handleQuickAdd = (val: number) => {
        const current = parseFloat(amount) || 0;
        setAmount((current + val).toString());
    };

    const getTitle = () => {
        if (mode === 'INCOME') return 'บันทึกรายรับ (Income)';
        if (mode === 'EXPENSE') return 'บันทึกรายจ่าย (Expense)';
        return 'โอนเงินระหว่างกระเป๋า (Transfer)';
    };

    const themeColor = mode === 'INCOME' ? 'green' : mode === 'EXPENSE' ? 'red' : 'blue';

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={getTitle()}>
            <form onSubmit={handleSubmit} className="space-y-6">

                {/* Amount Section */}
                <div className="bg-gray-50 p-6 rounded-2xl text-center border border-gray-100">
                    <label className="block text-sm font-medium text-gray-500 mb-2">จำนวนเงิน (บาท)</label>
                    <div className="relative max-w-[200px] mx-auto">
                        <input
                            type="number"
                            required
                            min="0"
                            step="0.01"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className={`w-full bg-transparent text-4xl font-bold text-center outline-none placeholder-gray-300 text-${themeColor}-600`}
                            placeholder="0.00"
                            autoFocus
                        />
                    </div>

                    {/* Quick Amount Buttons */}
                    <div className="flex justify-center gap-2 mt-4">
                        {[100, 500, 1000].map((val) => (
                            <button
                                key={val}
                                type="button"
                                onClick={() => handleQuickAdd(val)}
                                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border
                                    ${mode === 'INCOME'
                                        ? 'bg-green-50 text-green-600 border-green-200 hover:bg-green-100'
                                        : mode === 'EXPENSE'
                                            ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100'
                                            : 'bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100'
                                    }`}
                            >
                                +{val}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Form Fields */}
                <div className="space-y-4">
                    {mode === 'INCOME' && (
                        <div className="grid grid-cols-1 gap-4">
                            <div className="bg-white border border-gray-200 rounded-xl p-3 flex items-center gap-3">
                                <div className="bg-green-100 p-2 rounded-lg text-green-600">
                                    <Store size={20} />
                                </div>
                                <div className="flex-1">
                                    <label className="block text-xs text-gray-500 mb-1">รับจาก (แหล่งที่มา)</label>
                                    <select
                                        value={marketId}
                                        onChange={(e) => setMarketId(e.target.value)}
                                        className="w-full bg-transparent font-medium text-gray-800 outline-none"
                                    >
                                        <option value="">ไม่ระบุ (ทั่วไป)</option>
                                        {markets.map(m => (
                                            <option key={m.id} value={m.id}>{m.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="flex justify-center text-gray-300">
                                <ArrowDownIcon />
                            </div>

                            <div className="bg-white border border-green-200 rounded-xl p-3 flex items-center gap-3 ring-1 ring-green-100">
                                <div className="bg-green-100 p-2 rounded-lg text-green-600">
                                    <Wallet size={20} />
                                </div>
                                <div className="flex-1">
                                    <label className="block text-xs text-green-600 mb-1">เข้ากระเป๋า</label>
                                    <select
                                        value={toJar}
                                        onChange={(e) => setToJar(e.target.value as JarType)}
                                        className="w-full bg-transparent font-bold text-gray-800 outline-none"
                                    >
                                        {jars.map(jar => (
                                            <option key={jar.id} value={jar.id}>{jar.name} (฿{jar.balance.toLocaleString()})</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                    )}

                    {mode === 'EXPENSE' && (
                        <div className="space-y-4">
                            <div className="bg-white border border-red-200 rounded-xl p-3 flex items-center gap-3 ring-1 ring-red-100">
                                <div className="bg-red-100 p-2 rounded-lg text-red-600">
                                    <Wallet size={20} />
                                </div>
                                <div className="flex-1">
                                    <label className="block text-xs text-red-600 mb-1">จ่ายจากกระเป๋า</label>
                                    <select
                                        value={fromJar}
                                        onChange={(e) => setFromJar(e.target.value as JarType)}
                                        className="w-full bg-transparent font-bold text-gray-800 outline-none"
                                    >
                                        {jars.map(jar => (
                                            <option key={jar.id} value={jar.id}>{jar.name} (฿{jar.balance.toLocaleString()})</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="bg-white border border-gray-200 rounded-xl p-3 flex items-center gap-3">
                                <div className="bg-gray-100 p-2 rounded-lg text-gray-600">
                                    <Tag size={20} />
                                </div>
                                <div className="flex-1">
                                    <label className="block text-xs text-gray-500 mb-1">หมวดหมู่</label>
                                    <select
                                        value={category}
                                        onChange={(e) => setCategory(e.target.value)}
                                        className="w-full bg-transparent font-medium text-gray-800 outline-none"
                                    >
                                        <option value="General">ทั่วไป</option>
                                        <option value="Ingredients">วัตถุดิบ</option>
                                        <option value="Packaging">บรรจุภัณฑ์</option>
                                        <option value="Utilities">ค่าน้ำ/ไฟ</option>
                                        <option value="Rent">ค่าเช่า</option>
                                        <option value="Salary">เงินเดือน</option>
                                        <option value="Marketing">การตลาด</option>
                                        <option value="Maintenance">ซ่อมบำรุง</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    )}

                    {mode === 'TRANSFER' && (
                        <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100">
                            <div className="flex items-center justify-between gap-2">
                                {/* From */}
                                <div className="flex-1 bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
                                    <p className="text-xs text-gray-500 mb-1">จาก</p>
                                    <select
                                        value={fromJar}
                                        onChange={(e) => setFromJar(e.target.value as JarType)}
                                        className="w-full bg-transparent font-bold text-gray-800 outline-none text-sm"
                                    >
                                        {jars.map(jar => (
                                            <option key={jar.id} value={jar.id} disabled={jar.id === toJar}>
                                                {jar.name}
                                            </option>
                                        ))}
                                    </select>
                                    <p className="text-xs text-gray-400 mt-1">฿{jars.find(j => j.id === fromJar)?.balance.toLocaleString()}</p>
                                </div>

                                {/* Arrow */}
                                <div className="text-blue-500 bg-white p-2 rounded-full shadow-sm border border-blue-100">
                                    <ArrowRight size={20} />
                                </div>

                                {/* To */}
                                <div className="flex-1 bg-white p-3 rounded-xl border border-blue-200 shadow-sm ring-1 ring-blue-100">
                                    <p className="text-xs text-blue-600 mb-1">เข้า</p>
                                    <select
                                        value={toJar}
                                        onChange={(e) => setToJar(e.target.value as JarType)}
                                        className="w-full bg-transparent font-bold text-gray-800 outline-none text-sm"
                                    >
                                        {jars.map(jar => (
                                            <option key={jar.id} value={jar.id} disabled={jar.id === fromJar}>
                                                {jar.name}
                                            </option>
                                        ))}
                                    </select>
                                    <p className="text-xs text-gray-400 mt-1">฿{jars.find(j => j.id === toJar)?.balance.toLocaleString()}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Description */}
                    <div className="bg-white border border-gray-200 rounded-xl p-3 flex items-center gap-3">
                        <div className="bg-gray-100 p-2 rounded-lg text-gray-600">
                            <FileText size={20} />
                        </div>
                        <input
                            type="text"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="flex-1 bg-transparent outline-none text-sm"
                            placeholder={mode === 'TRANSFER' ? 'บันทึกช่วยจำ (เช่น สำรองจ่าย)' : 'รายละเอียดเพิ่มเติม (Optional)'}
                        />
                    </div>
                </div>

                {/* Submit Button */}
                <button
                    type="submit"
                    className={`w-full py-4 rounded-xl text-white font-bold text-lg shadow-lg shadow-${themeColor}-200 transform transition-all active:scale-[0.98]
                        ${mode === 'INCOME' ? 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700' :
                            mode === 'EXPENSE' ? 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700' :
                                'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700'
                        }`}
                >
                    {mode === 'INCOME' ? 'ยืนยันรับเงิน' : mode === 'EXPENSE' ? 'ยืนยันจ่ายเงิน' : 'ยืนยันโอนเงิน'}
                </button>
            </form>
        </Modal>
    );
};

// Helper Icon
const ArrowDownIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 5V19M12 19L19 12M12 19L5 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);
