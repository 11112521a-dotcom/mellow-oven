import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { useStore } from '@/src/store';
import { JarType } from '@/types';
import { 
    ArrowRight, Wallet, Store, Tag, FileText, 
    ShoppingBag, Package, Zap, Home, Users, Megaphone, Wrench 
} from 'lucide-react';
import { formatCurrency } from '@/src/lib/utils';
import { NumberInput } from '@/src/components/ui/NumberInput';

interface TransactionModalProps {
    isOpen: boolean;
    onClose: () => void;
    mode: 'INCOME' | 'EXPENSE' | 'TRANSFER';
    defaultJar?: JarType;
}

const EXPENSE_CATEGORIES = [
    { id: 'General', label: 'ทั่วไป', icon: <Tag size={16} /> },
    { id: 'Ingredients', label: 'วัตถุดิบ', icon: <ShoppingBag size={16} /> },
    { id: 'Packaging', label: 'แพคเกจจิ้ง', icon: <Package size={16} /> },
    { id: 'Utilities', label: 'ค่าน้ำ/ไฟ', icon: <Zap size={16} /> },
    { id: 'Rent', label: 'ค่าเช่า', icon: <Home size={16} /> },
    { id: 'Salary', label: 'เงินเดือน', icon: <Users size={16} /> },
    { id: 'Marketing', label: 'โฆษณา', icon: <Megaphone size={16} /> },
    { id: 'Maintenance', label: 'ซ่อมบำรุง', icon: <Wrench size={16} /> },
];

export const TransactionModal: React.FC<TransactionModalProps> = ({ isOpen, onClose, mode, defaultJar }) => {
    const { jars, addTransaction, updateJarBalance, transferFunds, markets } = useStore();

    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [fromJar, setFromJar] = useState<JarType>('Working');
    const [toJar, setToJar] = useState<JarType>('Working');
    const [marketId, setMarketId] = useState<string>('general');
    const [category, setCategory] = useState('General');

    useEffect(() => {
        if (isOpen) {
            setAmount('');
            setDescription('');
            setCategory('General');
            setMarketId('general');

            // Set defaults based on mode
            if (mode === 'INCOME') {
                setToJar(defaultJar || 'Working');
            } else if (mode === 'EXPENSE') {
                setFromJar(defaultJar || 'Opex');
            } else if (mode === 'TRANSFER') {
                setFromJar(defaultJar || 'Working');
                setToJar(defaultJar === 'Working' ? 'CapEx' : 'Working');
            }
        }
    }, [isOpen, mode, defaultJar]);

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
                marketId: marketId === 'general' ? undefined : marketId,
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
        if (mode === 'INCOME') return 'รับเงิน (Income)';
        if (mode === 'EXPENSE') return 'จ่ายเงิน (Expense)';
        return 'โอนเงิน (Transfer)';
    };

    // Style configs based on mode
    const styles = {
        INCOME: {
            theme: 'green',
            bg: 'bg-emerald-50',
            border: 'border-emerald-200',
            text: 'text-emerald-700',
            focusRing: 'focus:ring-emerald-200 focus:border-emerald-400',
            activeCard: 'border-emerald-400 bg-emerald-50 shadow-sm',
            btnBg: 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600'
        },
        EXPENSE: {
            theme: 'red',
            bg: 'bg-rose-50',
            border: 'border-rose-200',
            text: 'text-rose-700',
            focusRing: 'focus:ring-rose-200 focus:border-rose-400',
            activeCard: 'border-rose-400 bg-rose-50 shadow-sm',
            btnBg: 'bg-gradient-to-r from-rose-500 to-red-500 hover:from-rose-600 hover:to-red-600'
        },
        TRANSFER: {
            theme: 'blue',
            bg: 'bg-sky-50',
            border: 'border-sky-200',
            text: 'text-sky-700',
            focusRing: 'focus:ring-sky-200 focus:border-sky-400',
            activeCard: 'border-sky-400 bg-sky-50 shadow-sm',
            btnBg: 'bg-gradient-to-r from-sky-500 to-blue-500 hover:from-sky-600 hover:to-blue-600'
        }
    }[mode];

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={getTitle()}>
            <form onSubmit={handleSubmit} className="space-y-6">

                {/* Amount Section - Huge & Clean */}
                <div className={`p-6 rounded-[2rem] text-center border-2 ${styles.border} ${styles.bg} transition-all`}>
                    <label className={`block text-xs font-bold uppercase tracking-wider mb-2 ${styles.text} opacity-80`}>
                        จำนวนเงิน (บาท)
                    </label>
                    <div className="relative max-w-[240px] mx-auto">
                        <NumberInput
                            required
                            min="0"
                            value={parseFloat(amount) || 0}
                            onChange={(val) => setAmount(val === 0 ? '' : val.toString())}
                            className={`w-full bg-transparent text-5xl font-black text-center outline-none placeholder-stone-300 ${styles.text}`}
                            placeholder="0"
                            autoFocus
                            allowDecimals
                        />
                    </div>

                    {/* Quick Amount Buttons */}
                    <div className="flex justify-center gap-2 mt-6">
                        {[100, 500, 1000].map((val) => (
                            <button
                                key={val}
                                type="button"
                                onClick={() => handleQuickAdd(val)}
                                className={`px-4 py-2 rounded-xl text-sm font-bold bg-white border border-stone-200 shadow-sm hover:shadow-md hover:scale-105 active:scale-95 transition-all ${styles.text}`}
                            >
                                +{val}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Form Fields - Pill/Card Selectors */}
                <div className="space-y-6">

                    {mode === 'INCOME' && (
                        <>
                            {/* Source Selection (Markets) */}
                            <div>
                                <label className="flex items-center gap-2 text-sm font-bold text-stone-700 mb-3">
                                    <Store size={18} className="text-stone-400" />
                                    แหล่งที่มา (รับจาก)
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setMarketId('general')}
                                        className={`px-4 py-2 rounded-xl border font-semibold text-sm transition-all ${marketId === 'general' ? styles.activeCard + ' ' + styles.text : 'border-stone-200 bg-white text-stone-600 hover:border-stone-300'}`}
                                    >
                                        ทั่วไป
                                    </button>
                                    {markets.map(m => (
                                        <button
                                            key={m.id}
                                            type="button"
                                            onClick={() => setMarketId(m.id)}
                                            className={`px-4 py-2 rounded-xl border font-semibold text-sm transition-all ${marketId === m.id ? styles.activeCard + ' ' + styles.text : 'border-stone-200 bg-white text-stone-600 hover:border-stone-300'}`}
                                        >
                                            {m.name}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Destination Jar */}
                            <div>
                                <label className="flex items-center gap-2 text-sm font-bold text-emerald-700 mb-3">
                                    <Wallet size={18} />
                                    เข้ากระเป๋า
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    {jars.map(jar => (
                                        <button
                                            key={jar.id}
                                            type="button"
                                            onClick={() => setToJar(jar.id as JarType)}
                                            className={`p-3 rounded-xl border text-left transition-all flex flex-col gap-1 ${toJar === jar.id ? styles.activeCard : 'border-stone-200 bg-white hover:border-stone-300'}`}
                                        >
                                            <span className={`text-sm font-bold ${toJar === jar.id ? styles.text : 'text-stone-700'}`}>{jar.name}</span>
                                            <span className="text-xs text-stone-500 font-medium">{formatCurrency(jar.balance)}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}

                    {mode === 'EXPENSE' && (
                        <>
                            {/* Source Jar */}
                            <div>
                                <label className="flex items-center gap-2 text-sm font-bold text-rose-700 mb-3">
                                    <Wallet size={18} />
                                    จ่ายจากกระเป๋า
                                </label>
                                <div className="grid grid-cols-2 gap-3">
                                    {jars.map(jar => (
                                        <button
                                            key={jar.id}
                                            type="button"
                                            onClick={() => setFromJar(jar.id as JarType)}
                                            className={`p-3 rounded-xl border text-left transition-all flex flex-col gap-1 ${fromJar === jar.id ? styles.activeCard : 'border-stone-200 bg-white hover:border-stone-300'}`}
                                        >
                                            <span className={`text-sm font-bold ${fromJar === jar.id ? styles.text : 'text-stone-700'}`}>{jar.name}</span>
                                            <span className="text-xs text-stone-500 font-medium">{formatCurrency(jar.balance)}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Category Grid */}
                            <div>
                                <label className="flex items-center gap-2 text-sm font-bold text-stone-700 mb-3">
                                    <Tag size={18} className="text-stone-400" />
                                    หมวดหมู่รายจ่าย
                                </label>
                                <div className="grid grid-cols-4 gap-2">
                                    {EXPENSE_CATEGORIES.map(cat => (
                                        <button
                                            key={cat.id}
                                            type="button"
                                            onClick={() => setCategory(cat.id)}
                                            className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border transition-all ${category === cat.id ? styles.activeCard + ' ' + styles.text : 'border-stone-200 bg-white text-stone-500 hover:border-stone-300'}`}
                                        >
                                            {cat.icon}
                                            <span className="text-[10px] font-bold">{cat.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}

                    {mode === 'TRANSFER' && (
                        <div className="bg-sky-50/50 p-5 rounded-2xl border border-sky-100 flex flex-col gap-4">
                            {/* From Jar */}
                            <div>
                                <label className="text-xs font-bold text-stone-500 mb-2 block uppercase tracking-wider">โอนจาก</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {jars.map(jar => (
                                        <button
                                            key={jar.id}
                                            type="button"
                                            disabled={jar.id === toJar}
                                            onClick={() => setFromJar(jar.id as JarType)}
                                            className={`p-2.5 rounded-xl border text-left transition-all flex items-center justify-between ${fromJar === jar.id ? 'border-sky-400 bg-white shadow-sm ring-1 ring-sky-400' : 'border-stone-200 bg-white hover:border-stone-300'} ${jar.id === toJar ? 'opacity-50 cursor-not-allowed bg-stone-50' : ''}`}
                                        >
                                            <span className={`text-sm font-bold ${fromJar === jar.id ? styles.text : 'text-stone-700'}`}>{jar.name}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex justify-center -my-2 relative z-10">
                                <div className="bg-white p-2 rounded-full shadow-sm border border-sky-100 text-sky-500">
                                    <ArrowRight className="rotate-90 md:rotate-0" size={18} />
                                </div>
                            </div>

                            {/* To Jar */}
                            <div>
                                <label className="text-xs font-bold text-sky-600 mb-2 block uppercase tracking-wider">โอนเข้า</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {jars.map(jar => (
                                        <button
                                            key={jar.id}
                                            type="button"
                                            disabled={jar.id === fromJar}
                                            onClick={() => setToJar(jar.id as JarType)}
                                            className={`p-2.5 rounded-xl border text-left transition-all flex items-center justify-between ${toJar === jar.id ? 'border-sky-400 bg-white shadow-sm ring-1 ring-sky-400' : 'border-stone-200 bg-white hover:border-stone-300'} ${jar.id === fromJar ? 'opacity-50 cursor-not-allowed bg-stone-50' : ''}`}
                                        >
                                            <span className={`text-sm font-bold ${toJar === jar.id ? styles.text : 'text-stone-700'}`}>{jar.name}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Description - Cleaner look */}
                    <div>
                        <div className="flex items-center gap-3 bg-white border border-stone-200 p-1 rounded-xl focus-within:ring-2 transition-all focus-within:border-transparent mt-2">
                            <div className="p-3 text-stone-400 bg-stone-50 rounded-lg">
                                <FileText size={18} />
                            </div>
                            <input
                                type="text"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="flex-1 bg-transparent border-none outline-none text-sm font-medium text-stone-800 placeholder-stone-400"
                                placeholder={mode === 'TRANSFER' ? 'บันทึกช่วยจำ (เช่น เก็บสำรอง)' : 'รายละเอียดเพิ่มเติม (ไม่บังคับ)'}
                            />
                        </div>
                    </div>
                </div>

                {/* Submit Button */}
                <button
                    type="submit"
                    disabled={parseFloat(amount) <= 0 || !amount}
                    className={`w-full py-5 rounded-[1.25rem] text-white font-black text-lg shadow-xl transform transition-all 
                        ${parseFloat(amount) > 0 ? styles.btnBg + ' active:scale-[0.98]' : 'bg-stone-300 cursor-not-allowed shadow-none'}
                    `}
                >
                    {mode === 'INCOME' ? 'ยืนยันรับเงิน' : mode === 'EXPENSE' ? 'ยืนยันจ่ายเงิน' : 'ยืนยันโอนเงิน'}
                </button>
            </form>
        </Modal>
    );
};
