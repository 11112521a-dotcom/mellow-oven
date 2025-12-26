import React, { useState, useEffect, useMemo } from 'react';
import { useStore } from '@/src/store';
import { JarType, AllocationProfile } from '@/types';
import { formatCurrency } from '@/src/lib/utils';
import {
    PieChart, Save, Trash2, ArrowRight, Percent, DollarSign, Zap,
    Calendar, TrendingUp, Sparkles, Check, Plus, Eye, Wallet,
    ArrowUpRight, ChevronDown, ChevronUp, Coins, BadgeDollarSign,
    Boxes, Shield, Briefcase, PiggyBank, Lock, Unlock, Star, Edit2, X
} from 'lucide-react';

interface AllocationStationProps {
    onAllocate: (amount: number, allocations: Record<JarType, number>, fromProfit: boolean, specificProfits?: { id: string, amount: number }[]) => void;
}

type InputMode = 'percentage' | 'amount';
type AllocationSource = 'manual' | 'profit';

// Jar icon mapping
const getJarIcon = (id: string) => {
    switch (id) {
        case 'Owner': return Wallet;
        case 'Emergency': return Shield;
        case 'CapEx': return Boxes;
        case 'Opex': return Briefcase;
        case 'Working': return Coins;
        default: return PiggyBank;
    }
};

// Premium Jar Colors - Softer, more cafe-like with Warm undertones
const jarStyles: Record<string, { gradient: string, bg: string, text: string, accent: string, ring: string }> = {
    'Working': {
        gradient: 'from-sky-400 to-blue-500',
        bg: 'bg-gradient-to-br from-sky-50 via-blue-50/50 to-white', // Softer
        text: 'text-sky-700',
        accent: 'bg-sky-500',
        ring: 'ring-sky-200'
    },
    'CapEx': {
        gradient: 'from-violet-400 to-purple-500',
        bg: 'bg-gradient-to-br from-violet-50 via-purple-50/50 to-white',
        text: 'text-violet-700',
        accent: 'bg-violet-500',
        ring: 'ring-violet-200'
    },
    'Opex': {
        gradient: 'from-amber-400 to-orange-500',
        bg: 'bg-gradient-to-br from-amber-50 via-orange-50/50 to-white',
        text: 'text-amber-800',
        accent: 'bg-amber-500',
        ring: 'ring-amber-200'
    },
    'Emergency': {
        gradient: 'from-rose-400 to-red-500',
        bg: 'bg-gradient-to-br from-rose-50 via-red-50/50 to-white',
        text: 'text-rose-700',
        accent: 'bg-rose-500',
        ring: 'ring-rose-200'
    },
    'Owner': {
        gradient: 'from-emerald-400 to-teal-500',
        bg: 'bg-gradient-to-br from-emerald-50 via-teal-50/50 to-white',
        text: 'text-emerald-700',
        accent: 'bg-emerald-500',
        ring: 'ring-emerald-200'
    }
};

export const AllocationStation: React.FC<AllocationStationProps> = ({ onAllocate }) => {
    const { allocationProfiles, saveAllocationProfile, deleteAllocationProfile, setDefaultProfile, renameAllocationProfile, defaultProfileId, jars, getUnallocatedBalance, unallocatedProfits, getUnallocatedByDate, dailyInventory, products, fetchDailyInventory } = useStore();

    const [amount, setAmount] = useState<string>('');
    const [selectedProfileId, setSelectedProfileId] = useState<string>(defaultProfileId || 'default');
    const [renameModal, setRenameModal] = useState<{ isOpen: boolean; profileId: string; currentName: string }>({ isOpen: false, profileId: '', currentName: '' });
    const [currentAllocations, setCurrentAllocations] = useState<Record<JarType, number>>({
        'Working': 20,
        'CapEx': 45,
        'Opex': 10,
        'Emergency': 5,
        'Owner': 20
    });
    const [currentAmounts, setCurrentAmounts] = useState<Record<JarType, string>>({
        'Working': '',
        'CapEx': '',
        'Opex': '',
        'Emergency': '',
        'Owner': ''
    });
    const [inputMode, setInputMode] = useState<InputMode>('percentage');
    const [allocationSource, setAllocationSource] = useState<AllocationSource>('manual');
    const [selectedProfitDate, setSelectedProfitDate] = useState<string>('all');
    const [showPreview, setShowPreview] = useState(false);

    const [isEditing, setIsEditing] = useState(false);
    const [newProfileName, setNewProfileName] = useState('');
    const [isLocked, setIsLocked] = useState(() => {
        const saved = localStorage.getItem('allocationStationLocked');
        return saved ? JSON.parse(saved) : false;
    });

    useEffect(() => {
        localStorage.setItem('allocationStationLocked', JSON.stringify(isLocked));
    }, [isLocked]);

    const availableDates = [...new Set(unallocatedProfits.map(p => p.date))].sort((a, b) => b.localeCompare(a));
    const unallocatedBalance = getUnallocatedBalance();

    const cogsData = useMemo(() => {
        const targetDate = selectedProfitDate === 'all'
            ? (availableDates[0] || new Date().toISOString().split('T')[0])
            : selectedProfitDate;

        const dayInventory = dailyInventory.filter(d => d.businessDate === targetDate);

        let totalCOGS = 0;
        let totalWasteCost = 0;

        dayInventory.forEach(record => {
            const product = products.find(p => p.id === record.productId);
            if (!product) return;

            let unitCost = product.cost;
            if (record.variantId && product.variants) {
                const variant = product.variants.find(v => v.id === record.variantId);
                if (variant?.cost) unitCost = variant.cost;
            }

            const soldQty = record.soldQty || 0;
            const wasteQty = record.wasteQty || 0;

            totalCOGS += soldQty * unitCost;
            totalWasteCost += wasteQty * unitCost;
        });

        return { targetDate, totalCOGS, totalWasteCost, total: totalCOGS + totalWasteCost };
    }, [selectedProfitDate, availableDates, dailyInventory, products]);

    const previewAmounts = useMemo(() => {
        const numAmount = parseFloat(amount) || 0;
        const preview: Record<JarType, number> = {} as Record<JarType, number>;
        jars.forEach(jar => {
            preview[jar.id] = (numAmount * (currentAllocations[jar.id] || 0)) / 100;
        });
        return preview;
    }, [amount, currentAllocations, jars]);

    useEffect(() => {
        const profile = allocationProfiles.find(p => p.id === selectedProfileId);
        if (profile) {
            setCurrentAllocations(profile.allocations);
            setIsEditing(false);
        }
    }, [selectedProfileId, allocationProfiles]);

    useEffect(() => {
        if (allocationSource === 'profit') {
            if (selectedProfitDate === 'all') {
                setAmount(unallocatedBalance.toString());
            } else {
                const profits = getUnallocatedByDate(selectedProfitDate);
                const total = profits.reduce((sum, p) => sum + p.amount, 0);
                setAmount(total.toString());
            }
            setShowPreview(true);
        }
    }, [allocationSource, selectedProfitDate, unallocatedBalance, getUnallocatedByDate]);

    useEffect(() => {
        const targetDate = selectedProfitDate === 'all'
            ? (availableDates[0] || new Date().toISOString().split('T')[0])
            : selectedProfitDate;
        if (targetDate) {
            fetchDailyInventory(targetDate);
        }
    }, [selectedProfitDate, availableDates, fetchDailyInventory]);

    useEffect(() => {
        if (inputMode === 'amount' && amount) {
            const numAmount = parseFloat(amount);
            if (!isNaN(numAmount)) {
                const newAmounts: Record<JarType, string> = {} as Record<JarType, string>;
                jars.forEach(jar => {
                    const jarAmount = (numAmount * (currentAllocations[jar.id] || 0)) / 100;
                    newAmounts[jar.id] = jarAmount.toFixed(2);
                });
                setCurrentAmounts(newAmounts);
            }
        }
    }, [inputMode, amount, currentAllocations, jars]);

    const handlePercentageChange = (jarId: JarType, value: string) => {
        const numValue = parseFloat(value) || 0;
        const clampedValue = Math.max(0, Math.min(100, numValue));

        setCurrentAllocations(prev => ({
            ...prev,
            [jarId]: clampedValue
        }));
        setIsEditing(true);
    };

    const handleAmountChange = (jarId: JarType, value: string) => {
        setCurrentAmounts(prev => ({
            ...prev,
            [jarId]: value
        }));

        const numAmount = parseFloat(amount);
        if (!isNaN(numAmount) && numAmount > 0) {
            const newAmounts: Record<JarType, number> = {} as Record<JarType, number>;
            let total = 0;

            jars.forEach(jar => {
                const jarAmount = parseFloat(currentAmounts[jar.id] || '0');
                newAmounts[jar.id] = jarAmount;
                total += jarAmount;
            });

            const newValue = parseFloat(value) || 0;
            newAmounts[jarId] = newValue;
            total = total - (parseFloat(currentAmounts[jarId] || '0')) + newValue;

            const newAllocations: Record<JarType, number> = {} as Record<JarType, number>;
            jars.forEach(jar => {
                newAllocations[jar.id] = total > 0 ? (newAmounts[jar.id] / total) * 100 : 0;
            });
            setCurrentAllocations(newAllocations);
        }
        setIsEditing(true);
    };

    const totalPercentage: number = Object.values(currentAllocations).reduce<number>((sum, val) => sum + (val as number), 0);

    const handleSaveProfile = () => {
        if (!newProfileName) return;

        const newProfile: AllocationProfile = {
            id: crypto.randomUUID(),
            name: newProfileName,
            allocations: currentAllocations
        };

        saveAllocationProfile(newProfile);
        setSelectedProfileId(newProfile.id);
        setNewProfileName('');
        setIsEditing(false);
    };

    const handleDeleteProfile = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (id === 'default') return;
        if (confirm('คุณต้องการลบโปรไฟล์นี้ใช่หรือไม่?')) {
            deleteAllocationProfile(id);
            if (selectedProfileId === id) setSelectedProfileId('default');
        }
    };

    const handleAllocate = () => {
        const numAmount = parseFloat(amount);
        if (isNaN(numAmount) || numAmount <= 0) return;
        if (Math.abs(totalPercentage - 100) > 0.1) {
            alert('ผลรวมสัดส่วนต้องเท่ากับ 100%');
            return;
        }

        let specificProfits: { id: string, amount: number }[] | undefined = undefined;
        if (allocationSource === 'profit' && selectedProfitDate !== 'all') {
            const profits = getUnallocatedByDate(selectedProfitDate);
            specificProfits = profits.map(p => ({ id: p.id, amount: p.amount }));
        }

        onAllocate(numAmount, currentAllocations, allocationSource === 'profit', specificProfits);

        if (allocationSource === 'manual') {
            setAmount('');
        }
        setCurrentAmounts({
            'Working': '', 'CapEx': '', 'Opex': '', 'Emergency': '', 'Owner': ''
        });
        setShowPreview(false);
    };

    const numAmount = parseFloat(amount) || 0;
    const isValidAllocation = numAmount > 0 && Math.abs(totalPercentage - 100) < 0.1;

    return (
        <div className="bg-white rounded-[2rem] shadow-xl shadow-stone-200/50 border border-stone-100 overflow-hidden relative">
            {/* ═══════════════════════════════════════════════════════════════
                🎨 PREMIUM HEADER - Light Warm Cafe Style
               ═══════════════════════════════════════════════════════════════ */}

            {/* Decorative Background Elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-amber-50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 opacity-50 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-orange-50 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 opacity-50 pointer-events-none" />

            <div className="relative px-8 py-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-5">
                    {/* Glowing Icon */}
                    <div className="relative">
                        <div className="absolute inset-0 bg-amber-400 blur-xl opacity-20" />
                        <div className="relative bg-gradient-to-br from-amber-400 to-orange-500 p-4 rounded-2xl shadow-lg shadow-amber-500/20 text-white">
                            <PieChart size={28} strokeWidth={2.5} />
                        </div>
                    </div>
                    <div>
                        <h2 className="text-2xl sm:text-3xl font-black text-cafe-900 tracking-tight flex items-center gap-3">
                            Allocation Station
                            <Sparkles size={22} className="text-amber-400" />
                        </h2>
                        <p className="text-stone-500 text-sm font-medium mt-1">ศูนย์บัญชาการจัดสรรเงิน</p>
                    </div>
                </div>

                {/* Mode Toggle - Light Style */}
                <div className="flex items-center gap-2">
                    <div className="bg-stone-100 p-1.5 rounded-2xl flex gap-1 border border-stone-200">
                        <button
                            onClick={() => setInputMode('percentage')}
                            className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 flex items-center gap-2 ${inputMode === 'percentage'
                                ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-lg shadow-amber-500/30'
                                : 'text-stone-500 hover:text-stone-700 hover:bg-white/50'
                                }`}
                        >
                            <Percent size={16} />
                            <span className="hidden sm:inline">เปอร์เซ็นต์</span>
                        </button>
                        <button
                            onClick={() => setInputMode('amount')}
                            className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 flex items-center gap-2 ${inputMode === 'amount'
                                ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-lg shadow-amber-500/30'
                                : 'text-stone-500 hover:text-stone-700 hover:bg-white/50'
                                }`}
                        >
                            <BadgeDollarSign size={16} />
                            <span className="hidden sm:inline">จำนวนเงิน</span>
                        </button>
                    </div>

                    {/* Lock Button */}
                    <button
                        onClick={() => setIsLocked(!isLocked)}
                        className={`p-3.5 rounded-xl border transition-all duration-300 shadow-sm ${isLocked
                            ? 'bg-rose-50 border-rose-200 text-rose-500 hover:bg-rose-100'
                            : 'bg-white border-stone-200 text-stone-400 hover:text-stone-600 hover:border-stone-300 hover:bg-stone-50'}`}
                        title={isLocked ? 'ปลดล็อก' : 'ล็อกป้องกันแก้ไข'}
                    >
                        {isLocked ? <Lock size={18} /> : <Unlock size={18} />}
                    </button>
                </div>
            </div>


            <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
                {/* ═══════════════════════════════════════════════════════════
                    💰 SOURCE COLUMN - Left Side
                   ═══════════════════════════════════════════════════════════ */}
                <div className="lg:col-span-5 p-6 lg:p-8 border-b lg:border-b-0 lg:border-r border-stone-100 bg-gradient-to-br from-stone-50/40 via-white to-amber-50/20">
                    <h3 className="text-sm font-black text-amber-700 uppercase tracking-widest mb-5 flex items-center gap-3">
                        <span className="w-7 h-7 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center text-xs text-white font-black shadow-md shadow-amber-400/30">1</span>
                        แหล่งเงิน
                    </h3>

                    {/* Source Cards - Vibrant Style */}
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <button
                            onClick={() => { setAllocationSource('manual'); setAmount(''); setShowPreview(false); }}
                            className={`group relative p-5 rounded-2xl text-sm font-bold transition-all duration-300 flex flex-col items-center gap-4 ${allocationSource === 'manual'
                                ? 'bg-gradient-to-br from-amber-50 to-orange-50 text-amber-900 shadow-xl shadow-amber-200/50 ring-2 ring-amber-300'
                                : 'bg-stone-50 text-stone-500 hover:bg-amber-50 hover:shadow-lg hover:text-amber-700 border border-stone-200 hover:border-amber-200'
                                }`}
                        >
                            <div className={`p-4 rounded-2xl transition-all duration-300 ${allocationSource === 'manual'
                                ? 'bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-amber-400/40'
                                : 'bg-stone-200 group-hover:bg-gradient-to-br group-hover:from-amber-300 group-hover:to-orange-400 group-hover:shadow-lg'}`}>
                                <DollarSign size={28} className={allocationSource === 'manual' ? 'text-white' : 'text-stone-500 group-hover:text-white'} />
                            </div>
                            <span className="font-bold">ระบุเอง</span>
                        </button>

                        <button
                            onClick={() => setAllocationSource('profit')}
                            className={`group relative p-5 rounded-2xl text-sm font-bold transition-all duration-300 flex flex-col items-center gap-4 overflow-hidden ${allocationSource === 'profit'
                                ? 'bg-gradient-to-br from-emerald-50 to-teal-100 text-emerald-900 shadow-xl shadow-emerald-300/50 ring-2 ring-emerald-400'
                                : 'bg-stone-50 text-stone-500 hover:bg-emerald-50 hover:shadow-lg hover:text-emerald-700 border border-stone-200 hover:border-emerald-300'
                                }`}
                        >
                            {allocationSource === 'profit' && (
                                <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/10 to-teal-400/10" />
                            )}
                            <div className={`relative p-4 rounded-2xl transition-all duration-300 ${allocationSource === 'profit'
                                ? 'bg-gradient-to-br from-emerald-400 to-teal-500 shadow-lg shadow-emerald-400/40'
                                : 'bg-stone-200 group-hover:bg-gradient-to-br group-hover:from-emerald-400 group-hover:to-teal-500 group-hover:shadow-lg'}`}>
                                <Zap size={28} className={allocationSource === 'profit' ? 'text-white' : 'text-stone-500 group-hover:text-white'} />
                            </div>
                            <span className="relative font-bold">จากกำไร</span>
                            {unallocatedBalance > 0 && (
                                <span className="absolute -top-1 -right-1 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs px-2.5 py-1 rounded-full font-bold shadow-lg shadow-emerald-500/40 animate-pulse">
                                    {formatCurrency(unallocatedBalance)}
                                </span>
                            )}
                        </button>
                    </div>

                    {/* Amount Input Area - Warm Glass Effect */}
                    <div className="relative bg-white p-6 rounded-2xl border border-stone-100 shadow-xl shadow-stone-200/40">
                        {allocationSource === 'profit' && (
                            <div className="mb-5">
                                <label className="block text-xs font-bold text-emerald-600 mb-2 uppercase tracking-wider">เลือกวันที่</label>
                                <select
                                    value={selectedProfitDate}
                                    onChange={(e) => setSelectedProfitDate(e.target.value)}
                                    className="w-full p-4 text-sm bg-gradient-to-r from-emerald-50 to-teal-50 border-2 border-emerald-200/50 rounded-xl text-emerald-800 outline-none focus:ring-4 focus:ring-emerald-100 transition-all font-bold cursor-pointer"
                                >
                                    <option value="all">✨ ยอดรวมทั้งหมด ({formatCurrency(unallocatedBalance)})</option>
                                    {availableDates.map(date => (
                                        <option key={date} value={date}>
                                            📅 {new Date(date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })} - {formatCurrency(getUnallocatedByDate(date).reduce((sum, p) => sum + p.amount, 0))}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div className="text-center">
                            <label className="block text-xs font-bold text-stone-400 mb-3 uppercase tracking-wider">ยอดเงินที่จะจัดสรร</label>
                            <div className="relative">
                                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-2xl font-black bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent">฿</span>
                                <input
                                    type="number"
                                    value={amount}
                                    onChange={(e) => { setAmount(e.target.value); setShowPreview(true); }}
                                    disabled={allocationSource === 'profit'}
                                    className={`w-full pl-14 pr-5 py-6 text-4xl font-black text-center rounded-2xl outline-none transition-all duration-300 ${allocationSource === 'profit'
                                        ? 'bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-600 border-2 border-emerald-200'
                                        : 'bg-stone-50 focus:bg-white focus:ring-4 focus:ring-amber-100 text-cafe-900 border-2 border-transparent focus:border-amber-200'
                                        }`}
                                    placeholder="0"
                                />
                            </div>
                        </div>

                        {numAmount > 0 && (
                            <button
                                onClick={() => setShowPreview(!showPreview)}
                                className="mt-5 w-full py-4 bg-gradient-to-r from-indigo-50 to-violet-50 border-2 border-indigo-100 rounded-xl font-bold text-indigo-600 flex items-center justify-center gap-2 hover:shadow-lg hover:border-indigo-200 transition-all duration-300"
                            >
                                <Eye size={18} />
                                {showPreview ? 'ซ่อน Preview' : 'ดู Preview ก่อนยืนยัน'}
                                {showPreview ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                            </button>
                        )}
                    </div>

                    {/* Preview Panel */}
                    {showPreview && numAmount > 0 && (
                        <div className="mt-6 animate-in slide-in-from-top-4 duration-300">
                            <div className="bg-gradient-to-br from-indigo-50 via-violet-50 to-purple-50 rounded-2xl p-5 border-2 border-indigo-100 shadow-lg shadow-indigo-100/50">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="p-2.5 bg-gradient-to-br from-indigo-100 to-violet-100 rounded-xl">
                                        <Eye size={18} className="text-indigo-600" />
                                    </div>
                                    <h4 className="font-black text-indigo-800">Preview การจัดสรร</h4>
                                </div>

                                <div className="space-y-2">
                                    {jars.map(jar => {
                                        const JarIcon = getJarIcon(jar.id);
                                        const style = jarStyles[jar.id];
                                        const previewAmt = previewAmounts[jar.id] || 0;
                                        const percentage = currentAllocations[jar.id] || 0;

                                        return (
                                            <div key={jar.id} className="flex items-center justify-between bg-white/80 rounded-xl p-3 border border-white">
                                                <div className="flex items-center gap-2">
                                                    <div className={`p-1.5 rounded-lg bg-gradient-to-r ${style.gradient}`}>
                                                        <JarIcon size={14} className="text-white" />
                                                    </div>
                                                    <span className={`font-bold text-sm ${style.text}`}>{jar.name}</span>
                                                </div>
                                                <div className="text-right">
                                                    <div className="font-black text-stone-800">{formatCurrency(previewAmt)}</div>
                                                    <div className="text-xs text-stone-400">{percentage.toFixed(0)}%</div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                <div className="mt-4 pt-4 border-t-2 border-indigo-100 flex justify-between items-center">
                                    <span className="font-bold text-indigo-700">รวมทั้งหมด</span>
                                    <span className="text-2xl font-black text-indigo-800">{formatCurrency(numAmount)}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* COGS Display */}
                    {allocationSource === 'profit' && (
                        <div className="mt-5">
                            <div className="bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 rounded-2xl p-5 border-2 border-amber-100 shadow-lg shadow-amber-100/50">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="p-2.5 bg-gradient-to-br from-amber-100 to-orange-100 rounded-xl">
                                        <TrendingUp size={18} className="text-amber-600" />
                                    </div>
                                    <h4 className="font-black text-amber-800">📊 ต้นทุนวันที่ {new Date(cogsData.targetDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}</h4>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex justify-between items-center bg-white/80 rounded-xl p-3">
                                        <span className="text-amber-700 font-medium">ต้นทุนขาย (COGS)</span>
                                        <span className="font-black text-amber-800">{formatCurrency(cogsData.totalCOGS)}</span>
                                    </div>
                                    <div className="flex justify-between items-center bg-rose-50/80 rounded-xl p-3 border border-rose-100">
                                        <span className="text-rose-700 font-medium">🗑️ ของเสีย</span>
                                        <span className="font-black text-rose-600">{formatCurrency(cogsData.totalWasteCost)}</span>
                                    </div>
                                </div>

                                <div className="mt-3 pt-3 border-t-2 border-amber-100 flex justify-between items-center">
                                    <span className="font-bold text-amber-700">รวมต้นทุน</span>
                                    <span className="text-xl font-black text-amber-800">{formatCurrency(cogsData.total)}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Desktop Action Button */}
                    <div className="hidden lg:block mt-6">
                        <button
                            onClick={handleAllocate}
                            disabled={!isValidAllocation}
                            className={`w-full py-5 rounded-2xl font-black text-lg shadow-xl transform transition-all duration-300 active:scale-[0.98] flex items-center justify-center gap-3 ${!isValidAllocation
                                ? 'bg-stone-100 text-stone-400 cursor-not-allowed shadow-none'
                                : allocationSource === 'profit'
                                    ? 'bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 text-white hover:shadow-2xl hover:shadow-emerald-300/50 hover:-translate-y-0.5'
                                    : 'bg-cafe-900 text-white hover:bg-cafe-800 hover:shadow-2xl hover:shadow-stone-400/30 hover:-translate-y-0.5'
                                }`}
                        >
                            {allocationSource === 'profit' ? <Sparkles className="animate-pulse" /> : <Check />}
                            ยืนยันการจัดสรร
                            <ArrowRight size={20} />
                        </button>
                    </div>
                </div>

                {/* ═══════════════════════════════════════════════════════════
                    📊 DISTRIBUTION COLUMN - Right Side
                   ═══════════════════════════════════════════════════════════ */}
                <div className="lg:col-span-7 p-6 lg:p-8">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                        <h3 className="text-sm font-black text-violet-700 uppercase tracking-widest flex items-center gap-3">
                            <span className="w-7 h-7 bg-gradient-to-br from-violet-400 to-purple-500 rounded-full flex items-center justify-center text-xs text-white font-black shadow-md shadow-violet-400/30">2</span>
                            สัดส่วน
                        </h3>

                        {/* Total Progress */}
                        <div className="flex flex-col items-end">
                            <span className={`text-sm font-black mb-2 flex items-center gap-2 ${Math.abs(totalPercentage - 100) < 0.1 ? 'text-emerald-600' : 'text-rose-500'
                                }`}>
                                {Math.abs(totalPercentage - 100) < 0.1 && <Check size={16} />}
                                รวม {totalPercentage.toFixed(0)}%
                            </span>
                            <div className="w-48 h-3 bg-stone-100 rounded-full overflow-hidden shadow-inner">
                                <div
                                    className={`h-full transition-all duration-500 ease-out rounded-full ${Math.abs(totalPercentage - 100) < 0.1
                                        ? 'bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-500'
                                        : 'bg-gradient-to-r from-rose-400 via-red-400 to-rose-500'
                                        }`}
                                    style={{ width: `${Math.min(totalPercentage, 100)}%` }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Profile Chips */}
                    <div className="flex flex-wrap gap-2 mb-6">
                        {allocationProfiles.map(profile => (
                            <div
                                key={profile.id}
                                onClick={() => setSelectedProfileId(profile.id)}
                                className={`group flex items-center gap-2 px-4 py-2.5 rounded-full border-2 text-sm font-bold cursor-pointer transition-all duration-300 ${selectedProfileId === profile.id
                                    ? 'bg-cafe-900 text-white border-cafe-900 shadow-xl shadow-stone-400/30'
                                    : 'bg-white text-stone-500 border-stone-200 hover:border-stone-300 hover:shadow-md'
                                    }`}
                            >
                                {defaultProfileId === profile.id && (
                                    <Star size={14} className="fill-amber-400 text-amber-400" />
                                )}
                                <span>{profile.name}</span>

                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {defaultProfileId !== profile.id && (
                                        <span
                                            onClick={(e) => { e.stopPropagation(); setDefaultProfile(profile.id); }}
                                            className="hover:text-amber-400 p-1 rounded-full hover:bg-white/20"
                                            title="ตั้งเป็นค่าเริ่มต้น"
                                        >
                                            <Star size={12} />
                                        </span>
                                    )}
                                    <span
                                        onClick={(e) => { e.stopPropagation(); setRenameModal({ isOpen: true, profileId: profile.id, currentName: profile.name }); }}
                                        className="hover:text-sky-400 p-1 rounded-full hover:bg-white/20"
                                        title="เปลี่ยนชื่อ"
                                    >
                                        <Edit2 size={12} />
                                    </span>
                                    {profile.id !== 'default' && (
                                        <span
                                            onClick={(e) => handleDeleteProfile(profile.id, e)}
                                            className="hover:text-rose-400 p-1 rounded-full hover:bg-white/20"
                                            title="ลบ"
                                        >
                                            <Trash2 size={12} />
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}

                        {isEditing ? (
                            <div className="flex items-center gap-2 bg-stone-50 px-4 py-2 rounded-full border-2 border-stone-200">
                                <input
                                    autoFocus
                                    className="bg-transparent text-sm outline-none w-28 font-medium"
                                    placeholder="ชื่อโปรไฟล์..."
                                    value={newProfileName}
                                    onChange={e => setNewProfileName(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleSaveProfile()}
                                />
                                <button onClick={handleSaveProfile} className="bg-stone-800 text-white p-1.5 rounded-full hover:bg-stone-900 transition-colors">
                                    <Check size={12} />
                                </button>
                            </div>
                        ) : (
                            <button className="px-4 py-2.5 rounded-full border-2 border-dashed border-stone-300 text-stone-400 text-sm font-bold hover:border-stone-500 hover:text-stone-600 hover:bg-stone-50 flex items-center gap-2 transition-all">
                                <Plus size={14} />
                                สร้างใหม่
                            </button>
                        )}
                    </div>

                    {/* Jar Cards - Premium Style */}
                    <div className="space-y-3">
                        {jars.map(jar => {
                            const JarIcon = getJarIcon(jar.id);
                            const style = jarStyles[jar.id];
                            const percentage = currentAllocations[jar.id] || 0;
                            const previewAmt = previewAmounts[jar.id] || 0;

                            return (
                                <div
                                    key={jar.id}
                                    className={`p-5 rounded-2xl border transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 ${style.bg} border-stone-100 hover:border-amber-100`}
                                >
                                    <div className="flex justify-between items-center mb-4">
                                        <div className="flex items-center gap-4">
                                            <div className={`p-3 rounded-xl bg-gradient-to-br ${style.gradient} shadow-lg shadow-stone-200/50`}>
                                                <JarIcon size={22} className="text-white" />
                                            </div>
                                            <div>
                                                <p className={`font-black text-lg ${style.text}`}>{jar.name}</p>
                                                <p className="text-xs text-stone-500 font-medium">{jar.description}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            {inputMode === 'percentage' ? (
                                                <div className="flex items-center gap-1">
                                                    <input
                                                        type="number"
                                                        value={percentage.toFixed(0)}
                                                        onChange={(e) => handlePercentageChange(jar.id, e.target.value)}
                                                        disabled={isLocked}
                                                        className={`w-16 text-right bg-white border rounded-xl px-3 py-2 font-black text-xl outline-none focus:ring-2 transition-all ${style.text} ${style.ring} ${isLocked ? 'opacity-50 cursor-not-allowed border-transparent' : 'border-stone-200 hover:border-stone-300'}`}
                                                    />
                                                    <span className={`text-lg font-black ${style.text}`}>%</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1">
                                                    <span className={`text-lg font-black ${style.text}`}>฿</span>
                                                    <input
                                                        type="number"
                                                        value={currentAmounts[jar.id]}
                                                        onChange={(e) => handleAmountChange(jar.id, e.target.value)}
                                                        disabled={isLocked}
                                                        className={`w-28 text-right bg-white border rounded-xl px-3 py-2 font-black text-xl outline-none focus:ring-2 transition-all ${style.text} ${style.ring} ${isLocked ? 'opacity-50 cursor-not-allowed border-transparent' : 'border-stone-200 hover:border-stone-300'}`}
                                                    />
                                                </div>
                                            )}
                                            {numAmount > 0 && inputMode === 'percentage' && (
                                                <p className="text-sm text-stone-500 mt-1 font-medium">
                                                    = {formatCurrency(previewAmt)}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {inputMode === 'percentage' && (
                                        <div className="relative h-2.5 bg-stone-100 rounded-full overflow-hidden">
                                            <div
                                                className={`absolute inset-y-0 left-0 bg-gradient-to-r ${style.gradient} rounded-full transition-all duration-300`}
                                                style={{ width: `${percentage}%` }}
                                            />
                                            <input
                                                type="range"
                                                min="0"
                                                max="100"
                                                value={percentage}
                                                onChange={(e) => handlePercentageChange(jar.id, e.target.value)}
                                                disabled={isLocked}
                                                className={`absolute inset-0 w-full h-full opacity-0 ${isLocked ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                                            />
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Mobile Action Button */}
                    <div className="lg:hidden mt-6">
                        <button
                            onClick={handleAllocate}
                            disabled={!isValidAllocation}
                            className={`w-full py-5 rounded-2xl font-black text-lg shadow-xl flex items-center justify-center gap-3 ${!isValidAllocation
                                ? 'bg-stone-100 text-stone-400 shadow-none'
                                : allocationSource === 'profit'
                                    ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white'
                                    : 'bg-gradient-to-r from-stone-800 to-stone-900 text-white'
                                }`}
                        >
                            {allocationSource === 'profit' ? <Sparkles /> : <Check />}
                            ยืนยันการจัดสรร
                            <ArrowRight size={20} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Rename Profile Modal */}
            {
                renameModal.isOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                        <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
                            <div className="p-5 bg-gradient-to-r from-sky-500 to-indigo-600 text-white">
                                <h3 className="font-bold flex items-center gap-2 text-lg">
                                    <Edit2 size={20} />
                                    เปลี่ยนชื่อโปรไฟล์
                                </h3>
                            </div>
                            <div className="p-5 space-y-4">
                                <input
                                    autoFocus
                                    type="text"
                                    value={renameModal.currentName}
                                    onChange={(e) => setRenameModal(prev => ({ ...prev, currentName: e.target.value }))}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && renameModal.currentName.trim()) {
                                            renameAllocationProfile(renameModal.profileId, renameModal.currentName.trim());
                                            setRenameModal({ isOpen: false, profileId: '', currentName: '' });
                                        }
                                    }}
                                    className="w-full px-5 py-4 border-2 border-stone-200 rounded-xl focus:border-sky-500 focus:ring-4 focus:ring-sky-100 outline-none text-lg font-medium"
                                    placeholder="ชื่อโปรไฟล์ใหม่..."
                                />
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setRenameModal({ isOpen: false, profileId: '', currentName: '' })}
                                        className="flex-1 px-5 py-4 border-2 border-stone-200 rounded-xl text-stone-600 font-bold hover:bg-stone-50 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <X size={18} />
                                        ยกเลิก
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (renameModal.currentName.trim()) {
                                                renameAllocationProfile(renameModal.profileId, renameModal.currentName.trim());
                                                setRenameModal({ isOpen: false, profileId: '', currentName: '' });
                                            }
                                        }}
                                        className="flex-1 px-5 py-4 bg-gradient-to-r from-sky-500 to-indigo-600 text-white rounded-xl font-bold hover:shadow-lg transition-all flex items-center justify-center gap-2"
                                    >
                                        <Check size={18} />
                                        บันทึก
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};
