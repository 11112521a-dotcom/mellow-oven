import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { useStore } from '@/src/store';
import { JarType } from '@/types';
import { ArrowRightLeft, TrendingUp, TrendingDown } from 'lucide-react';

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

    const getTitle = () => {
        if (mode === 'INCOME') return 'บันทึกรายรับ (Income)';
        if (mode === 'EXPENSE') return 'บันทึกรายจ่าย (Expense)';
        return 'โอนเงินระหว่างกระเป๋า (Transfer)';
    };

    const getIcon = () => {
        if (mode === 'INCOME') return <TrendingUp className="text-green-500" />;
        if (mode === 'EXPENSE') return <TrendingDown className="text-red-500" />;
        return <ArrowRightLeft className="text-blue-500" />;
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={getTitle()}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="flex justify-center mb-4">
                    <div className={`p-3 rounded-full ${mode === 'INCOME' ? 'bg-green-100' : mode === 'EXPENSE' ? 'bg-red-100' : 'bg-blue-100'}`}>
                        {getIcon()}
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">จำนวนเงิน (บาท)</label>
                    <input
                        type="number"
                        required
                        min="0"
                        step="0.01"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full p-3 border border-gray-200 rounded-xl text-2xl font-bold text-center focus:ring-2 focus:ring-cafe-500 outline-none"
                        placeholder="0.00"
                        autoFocus
                    />
                </div>

                {mode === 'INCOME' && (
                    <>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">เข้ากระเป๋า</label>
                            <select
                                value={toJar}
                                onChange={(e) => setToJar(e.target.value as JarType)}
                                className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-cafe-500 outline-none"
                            >
                                {jars.map(jar => (
                                    <option key={jar.id} value={jar.id}>{jar.name} (฿{jar.balance.toLocaleString()})</option>
                                ))}
                            </select>
                        </div>
                        {markets.length > 0 && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">แหล่งที่มา (ตลาด/สาขา)</label>
                                <select
                                    value={marketId}
                                    onChange={(e) => setMarketId(e.target.value)}
                                    className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-cafe-500 outline-none"
                                >
                                    <option value="">ไม่ระบุ</option>
                                    {markets.map(m => (
                                        <option key={m.id} value={m.id}>{m.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </>
                )}

                {mode === 'EXPENSE' && (
                    <>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">จ่ายจากกระเป๋า</label>
                            <select
                                value={fromJar}
                                onChange={(e) => setFromJar(e.target.value as JarType)}
                                className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-cafe-500 outline-none"
                            >
                                {jars.map(jar => (
                                    <option key={jar.id} value={jar.id}>{jar.name} (฿{jar.balance.toLocaleString()})</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">หมวดหมู่</label>
                            <select
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-cafe-500 outline-none"
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
                    </>
                )}

                {mode === 'TRANSFER' && (
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">จากกระเป๋า</label>
                            <select
                                value={fromJar}
                                onChange={(e) => setFromJar(e.target.value as JarType)}
                                className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-cafe-500 outline-none"
                            >
                                {jars.map(jar => (
                                    <option key={jar.id} value={jar.id} disabled={jar.id === toJar}>
                                        {jar.name} (฿{jar.balance.toLocaleString()})
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">เข้ากระเป๋า</label>
                            <select
                                value={toJar}
                                onChange={(e) => setToJar(e.target.value as JarType)}
                                className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-cafe-500 outline-none"
                            >
                                {jars.map(jar => (
                                    <option key={jar.id} value={jar.id} disabled={jar.id === fromJar}>
                                        {jar.name} (฿{jar.balance.toLocaleString()})
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                )}

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">รายละเอียด (Optional)</label>
                    <input
                        type="text"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-cafe-500 outline-none"
                        placeholder={mode === 'TRANSFER' ? 'เช่น สำรองจ่าย' : 'เช่น ค่าวัตถุดิบ, ขายหน้าร้าน'}
                    />
                </div>

                <div className="pt-4">
                    <button
                        type="submit"
                        className={`w-full py-3 rounded-xl text-white font-bold transition-colors ${mode === 'INCOME' ? 'bg-green-600 hover:bg-green-700' :
                                mode === 'EXPENSE' ? 'bg-red-600 hover:bg-red-700' :
                                    'bg-blue-600 hover:bg-blue-700'
                            }`}
                    >
                        บันทึกรายการ
                    </button>
                </div>
            </form>
        </Modal>
    );
};
