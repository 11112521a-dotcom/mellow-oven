import React, { useState, useEffect, useMemo } from 'react';
import { useStore } from '@/src/store';
import { JarType, AllocationProfile } from '@/types';
import { formatCurrency } from '@/src/lib/utils';
import {
    PieChart, Save, Trash2, ArrowRight, Percent, DollarSign, Zap,
    Calendar, TrendingUp, Sparkles, Check, Plus, Eye, Wallet,
    ArrowUpRight, ChevronDown, ChevronUp, Coins, BadgeDollarSign,
    Boxes, Shield, Briefcase, PiggyBank
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

export const AllocationStation: React.FC<AllocationStationProps> = ({ onAllocate }) => {
    const { allocationProfiles, saveAllocationProfile, deleteAllocationProfile, jars, getUnallocatedBalance, unallocatedProfits, getUnallocatedByDate } = useStore();

    const [amount, setAmount] = useState<string>('');
    const [selectedProfileId, setSelectedProfileId] = useState<string>('default');
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

    // Get unique dates with unallocated profits
    const availableDates = [...new Set(unallocatedProfits.map(p => p.date))].sort((a, b) => b.localeCompare(a));
    const unallocatedBalance = getUnallocatedBalance();

    // Premium Jar Colors with gradients
    const getJarGradient = (id: string) => {
        switch (id) {
            case 'Owner': return 'from-amber-400 to-orange-500';
            case 'Emergency': return 'from-red-400 to-rose-500';
            case 'CapEx': return 'from-purple-400 to-indigo-500';
            case 'Opex': return 'from-orange-400 to-amber-500';
            case 'Working': return 'from-blue-400 to-cyan-500';
            default: return 'from-gray-400 to-gray-500';
        }
    };

    const getJarBg = (id: string) => {
        switch (id) {
            case 'Owner': return 'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200 hover:shadow-amber-100';
            case 'Emergency': return 'bg-gradient-to-br from-red-50 to-rose-50 border-red-200 hover:shadow-red-100';
            case 'CapEx': return 'bg-gradient-to-br from-purple-50 to-indigo-50 border-purple-200 hover:shadow-purple-100';
            case 'Opex': return 'bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200 hover:shadow-orange-100';
            case 'Working': return 'bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200 hover:shadow-blue-100';
            default: return 'bg-gray-50 border-gray-200';
        }
    };

    const getJarTextColor = (id: string) => {
        switch (id) {
            case 'Owner': return 'text-amber-700';
            case 'Emergency': return 'text-red-700';
            case 'CapEx': return 'text-purple-700';
            case 'Opex': return 'text-orange-700';
            case 'Working': return 'text-blue-700';
            default: return 'text-gray-700';
        }
    };

    // Calculate preview amounts
    const previewAmounts = useMemo(() => {
        const numAmount = parseFloat(amount) || 0;
        const preview: Record<JarType, number> = {} as Record<JarType, number>;
        jars.forEach(jar => {
            preview[jar.id] = (numAmount * (currentAllocations[jar.id] || 0)) / 100;
        });
        return preview;
    }, [amount, currentAllocations, jars]);

    // Load profile when selection changes
    useEffect(() => {
        const profile = allocationProfiles.find(p => p.id === selectedProfileId);
        if (profile) {
            setCurrentAllocations(profile.allocations);
            setIsEditing(false);
        }
    }, [selectedProfileId, allocationProfiles]);

    // Handle Profit Source Selection
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

    // Auto-update amounts when changing to amount mode or when total amount changes
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
        <div className="bg-white rounded-3xl shadow-xl border border-cafe-100 overflow-hidden">
            {/* ═══════════════════════════════════════════════════════════════
                🎨 PREMIUM HEADER with Gradient Animation
               ═══════════════════════════════════════════════════════════════ */}
            <div className="relative overflow-hidden">
                {/* Animated gradient background */}
                <div className="absolute inset-0 bg-gradient-to-r from-cafe-900 via-cafe-800 to-cafe-900 animate-gradient-x" />
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-amber-500/20 via-transparent to-transparent" />

                <div className="relative p-6 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <div className="absolute inset-0 bg-amber-400 blur-lg opacity-50 animate-pulse" />
                            <div className="relative bg-gradient-to-br from-amber-400 to-orange-500 p-3 rounded-2xl shadow-lg">
                                <PieChart size={28} className="text-white" />
                            </div>
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
                                Allocation Station
                                <Sparkles size={20} className="text-amber-400 animate-pulse" />
                            </h2>
                            <p className="text-cafe-300 text-sm">ศูนย์บัญชาการจัดสรรเงิน</p>
                        </div>
                    </div>

                    {/* Mode Toggle - Premium Style */}
                    <div className="bg-black/30 backdrop-blur-sm p-1.5 rounded-xl flex gap-1">
                        <button
                            onClick={() => setInputMode('percentage')}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${inputMode === 'percentage'
                                    ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-lg shadow-amber-500/30'
                                    : 'text-cafe-400 hover:text-white hover:bg-white/10'
                                }`}
                        >
                            <Percent size={16} />
                            %
                        </button>
                        <button
                            onClick={() => setInputMode('amount')}
                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${inputMode === 'amount'
                                    ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-lg shadow-amber-500/30'
                                    : 'text-cafe-400 hover:text-white hover:bg-white/10'
                                }`}
                        >
                            <BadgeDollarSign size={16} />
                            ฿
                        </button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12">
                {/* ═══════════════════════════════════════════════════════════
                    💰 SOURCE COLUMN
                   ═══════════════════════════════════════════════════════════ */}
                <div className="lg:col-span-5 p-6 border-b lg:border-b-0 lg:border-r border-cafe-100 bg-gradient-to-b from-cafe-50/80 to-white">
                    <h3 className="text-sm font-black text-cafe-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                        <span className="w-6 h-6 bg-cafe-200 rounded-full flex items-center justify-center text-xs">1</span>
                        แหล่งเงิน (Source)
                    </h3>

                    {/* Source Tabs - Premium Glass Style */}
                    <div className="grid grid-cols-2 gap-3 mb-6">
                        <button
                            onClick={() => { setAllocationSource('manual'); setAmount(''); setShowPreview(false); }}
                            className={`group relative p-4 rounded-2xl border-2 text-sm font-bold transition-all flex flex-col items-center gap-3 overflow-hidden ${allocationSource === 'manual'
                                    ? 'border-cafe-600 bg-white text-cafe-800 shadow-xl shadow-cafe-200/50'
                                    : 'border-transparent bg-white/50 text-cafe-400 hover:bg-white hover:shadow-lg'
                                }`}
                        >
                            <div className={`p-3 rounded-xl transition-all ${allocationSource === 'manual' ? 'bg-cafe-100' : 'bg-cafe-50 group-hover:bg-cafe-100'}`}>
                                <DollarSign size={24} className={allocationSource === 'manual' ? 'text-cafe-700' : 'text-cafe-400'} />
                            </div>
                            ระบุเอง
                        </button>
                        <button
                            onClick={() => setAllocationSource('profit')}
                            className={`group relative p-4 rounded-2xl border-2 text-sm font-bold transition-all flex flex-col items-center gap-3 overflow-hidden ${allocationSource === 'profit'
                                    ? 'border-emerald-500 bg-gradient-to-br from-emerald-50 to-green-50 text-emerald-700 shadow-xl shadow-emerald-200/50'
                                    : 'border-transparent bg-white/50 text-cafe-400 hover:bg-white hover:shadow-lg'
                                }`}
                        >
                            {allocationSource === 'profit' && (
                                <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/10 to-transparent animate-pulse" />
                            )}
                            <div className={`relative p-3 rounded-xl transition-all ${allocationSource === 'profit' ? 'bg-emerald-100' : 'bg-cafe-50 group-hover:bg-emerald-50'}`}>
                                <Zap size={24} className={allocationSource === 'profit' ? 'text-emerald-600' : 'text-cafe-400'} />
                            </div>
                            <span className="relative">จากกำไร</span>
                            {unallocatedBalance > 0 && (
                                <span className="absolute -top-1 -right-1 bg-emerald-500 text-white text-xs px-2 py-0.5 rounded-full animate-bounce">
                                    {formatCurrency(unallocatedBalance)}
                                </span>
                            )}
                        </button>
                    </div>

                    {/* Amount Input Area - Glassmorphism */}
                    <div className="relative bg-white/80 backdrop-blur-sm p-6 rounded-2xl border border-cafe-200 shadow-lg">
                        {allocationSource === 'profit' && (
                            <div className="mb-4">
                                <label className="block text-xs font-bold text-emerald-600 mb-2">เลือกวันที่</label>
                                <select
                                    value={selectedProfitDate}
                                    onChange={(e) => setSelectedProfitDate(e.target.value)}
                                    className="w-full p-3 text-sm bg-emerald-50 border-2 border-emerald-200 rounded-xl text-emerald-800 outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all font-medium"
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
                            <label className="block text-xs font-bold text-cafe-400 mb-2">ยอดเงินที่จะจัดสรร</label>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-cafe-300 font-black text-2xl">฿</span>
                                <input
                                    type="number"
                                    value={amount}
                                    onChange={(e) => { setAmount(e.target.value); setShowPreview(true); }}
                                    disabled={allocationSource === 'profit'}
                                    className={`w-full pl-12 pr-4 py-5 text-4xl font-black text-center rounded-2xl outline-none transition-all ${allocationSource === 'profit'
                                            ? 'bg-gradient-to-r from-emerald-50 to-green-50 text-emerald-600 border-2 border-emerald-200'
                                            : 'bg-cafe-50 focus:bg-white focus:ring-4 focus:ring-cafe-200 text-cafe-800 border-2 border-transparent focus:border-cafe-300'
                                        }`}
                                    placeholder="0"
                                />
                            </div>
                        </div>

                        {/* Preview Toggle Button */}
                        {numAmount > 0 && (
                            <button
                                onClick={() => setShowPreview(!showPreview)}
                                className="mt-4 w-full py-3 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl font-medium text-indigo-700 flex items-center justify-center gap-2 hover:shadow-md transition-all"
                            >
                                <Eye size={18} />
                                {showPreview ? 'ซ่อน Preview' : 'ดู Preview ก่อนยืนยัน'}
                                {showPreview ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                            </button>
                        )}
                    </div>

                    {/* ═══════════════════════════════════════════════════════
                        🔮 PREVIEW PANEL - Show before confirming
                       ═══════════════════════════════════════════════════════ */}
                    {showPreview && numAmount > 0 && (
                        <div className="mt-6 animate-in slide-in-from-top-4 duration-300">
                            <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 rounded-2xl p-4 border-2 border-indigo-200 shadow-lg">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="p-2 bg-indigo-100 rounded-lg">
                                        <Eye size={18} className="text-indigo-600" />
                                    </div>
                                    <h4 className="font-black text-indigo-800">Preview การจัดสรร</h4>
                                </div>

                                <div className="space-y-2">
                                    {jars.map(jar => {
                                        const JarIcon = getJarIcon(jar.id);
                                        const previewAmt = previewAmounts[jar.id] || 0;
                                        const percentage = currentAllocations[jar.id] || 0;

                                        return (
                                            <div key={jar.id} className="flex items-center justify-between bg-white/80 rounded-xl p-3 border border-white">
                                                <div className="flex items-center gap-2">
                                                    <div className={`p-1.5 rounded-lg bg-gradient-to-r ${getJarGradient(jar.id)}`}>
                                                        <JarIcon size={14} className="text-white" />
                                                    </div>
                                                    <span className={`font-bold text-sm ${getJarTextColor(jar.id)}`}>{jar.name}</span>
                                                </div>
                                                <div className="text-right">
                                                    <div className="font-black text-gray-800">{formatCurrency(previewAmt)}</div>
                                                    <div className="text-xs text-gray-500">{percentage.toFixed(0)}%</div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                <div className="mt-4 pt-4 border-t-2 border-indigo-200 flex justify-between items-center">
                                    <span className="font-bold text-indigo-700">รวมทั้งหมด</span>
                                    <span className="text-2xl font-black text-indigo-800">{formatCurrency(numAmount)}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Action Button (Desktop) */}
                    <div className="hidden lg:block mt-6">
                        <button
                            onClick={handleAllocate}
                            disabled={!isValidAllocation}
                            className={`w-full py-5 rounded-2xl font-black text-lg shadow-xl transform transition-all active:scale-95 flex items-center justify-center gap-3 ${!isValidAllocation
                                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                    : allocationSource === 'profit'
                                        ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white hover:shadow-2xl hover:shadow-emerald-300/50 hover:-translate-y-0.5'
                                        : 'bg-gradient-to-r from-cafe-800 to-cafe-900 text-white hover:shadow-2xl hover:shadow-cafe-300/50 hover:-translate-y-0.5'
                                }`}
                        >
                            {allocationSource === 'profit' ? <Sparkles className="animate-pulse" /> : <Check />}
                            ยืนยันการจัดสรร
                            <ArrowRight size={20} />
                        </button>
                    </div>
                </div>

                {/* ═══════════════════════════════════════════════════════════
                    📊 DISTRIBUTION COLUMN
                   ═══════════════════════════════════════════════════════════ */}
                <div className="lg:col-span-7 p-6">
                    <div className="flex justify-between items-end mb-4">
                        <h3 className="text-sm font-black text-cafe-500 uppercase tracking-wider flex items-center gap-2">
                            <span className="w-6 h-6 bg-cafe-200 rounded-full flex items-center justify-center text-xs">2</span>
                            สัดส่วน (Distribution)
                        </h3>

                        {/* Total Progress - Premium Style */}
                        <div className="flex flex-col items-end">
                            <span className={`text-sm font-black mb-1 flex items-center gap-1 ${Math.abs(totalPercentage - 100) < 0.1 ? 'text-emerald-600' : 'text-red-500'
                                }`}>
                                {Math.abs(totalPercentage - 100) < 0.1 && <Check size={16} />}
                                รวม {totalPercentage.toFixed(0)}%
                            </span>
                            <div className="w-40 h-3 bg-gray-100 rounded-full overflow-hidden shadow-inner">
                                <div
                                    className={`h-full transition-all duration-500 ease-out rounded-full ${Math.abs(totalPercentage - 100) < 0.1
                                            ? 'bg-gradient-to-r from-emerald-400 to-green-500'
                                            : 'bg-gradient-to-r from-red-400 to-rose-500'
                                        }`}
                                    style={{ width: `${Math.min(totalPercentage, 100)}%` }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Profile Chips - Premium */}
                    <div className="flex gap-2 overflow-x-auto pb-4 mb-4 no-scrollbar">
                        {allocationProfiles.map(profile => (
                            <div
                                key={profile.id}
                                onClick={() => setSelectedProfileId(profile.id)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-full border-2 text-sm font-bold whitespace-nowrap cursor-pointer transition-all ${selectedProfileId === profile.id
                                        ? 'bg-gradient-to-r from-cafe-800 to-cafe-900 text-white border-cafe-800 shadow-lg shadow-cafe-200'
                                        : 'bg-white text-cafe-600 border-cafe-200 hover:border-cafe-400 hover:shadow-md'
                                    }`}
                            >
                                {profile.name}
                                {profile.id !== 'default' && (
                                    <span
                                        onClick={(e) => handleDeleteProfile(profile.id, e)}
                                        className="hover:text-red-400 p-1 rounded-full hover:bg-white/20"
                                    >
                                        <Trash2 size={12} />
                                    </span>
                                )}
                            </div>
                        ))}

                        {isEditing ? (
                            <div className="flex items-center gap-2 bg-gradient-to-r from-cafe-100 to-cafe-50 px-3 py-2 rounded-full animate-in fade-in border-2 border-cafe-200">
                                <input
                                    autoFocus
                                    className="bg-transparent text-sm outline-none w-24 font-medium"
                                    placeholder="ชื่อโปรไฟล์..."
                                    value={newProfileName}
                                    onChange={e => setNewProfileName(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleSaveProfile()}
                                />
                                <button onClick={handleSaveProfile} className="bg-cafe-600 text-white p-1.5 rounded-full hover:bg-cafe-700 transition-colors">
                                    <Check size={12} />
                                </button>
                            </div>
                        ) : (
                            <button className="px-4 py-2 rounded-full border-2 border-dashed border-cafe-300 text-cafe-400 text-sm font-bold hover:border-cafe-500 hover:text-cafe-600 hover:bg-cafe-50 flex items-center gap-2 transition-all">
                                <Plus size={14} />
                                สร้างใหม่
                            </button>
                        )}
                    </div>

                    {/* Jar Sliders - Premium Cards */}
                    <div className="space-y-3">
                        {jars.map(jar => {
                            const JarIcon = getJarIcon(jar.id);
                            const percentage = currentAllocations[jar.id] || 0;
                            const previewAmt = previewAmounts[jar.id] || 0;

                            return (
                                <div
                                    key={jar.id}
                                    className={`p-4 rounded-2xl border-2 transition-all duration-300 hover:shadow-lg ${getJarBg(jar.id)}`}
                                >
                                    <div className="flex justify-between items-center mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-xl bg-gradient-to-r ${getJarGradient(jar.id)} shadow-lg`}>
                                                <JarIcon size={20} className="text-white" />
                                            </div>
                                            <div>
                                                <p className={`font-black text-base ${getJarTextColor(jar.id)}`}>{jar.name}</p>
                                                <p className="text-xs text-gray-500">{jar.description}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            {inputMode === 'percentage' ? (
                                                <div className="flex items-center gap-1">
                                                    <input
                                                        type="number"
                                                        value={percentage.toFixed(0)}
                                                        onChange={(e) => handlePercentageChange(jar.id, e.target.value)}
                                                        className={`w-14 text-right bg-white/70 border-2 border-current/20 rounded-lg px-2 py-1 font-black text-lg outline-none focus:bg-white focus:border-current/40 transition-all ${getJarTextColor(jar.id)}`}
                                                    />
                                                    <span className={`text-sm font-bold ${getJarTextColor(jar.id)}`}>%</span>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1">
                                                    <span className={`text-sm font-bold ${getJarTextColor(jar.id)}`}>฿</span>
                                                    <input
                                                        type="number"
                                                        value={currentAmounts[jar.id]}
                                                        onChange={(e) => handleAmountChange(jar.id, e.target.value)}
                                                        className={`w-24 text-right bg-white/70 border-2 border-current/20 rounded-lg px-2 py-1 font-black text-lg outline-none focus:bg-white focus:border-current/40 transition-all ${getJarTextColor(jar.id)}`}
                                                    />
                                                </div>
                                            )}
                                            {numAmount > 0 && inputMode === 'percentage' && (
                                                <p className="text-xs text-gray-500 mt-1">
                                                    = {formatCurrency(previewAmt)}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {inputMode === 'percentage' && (
                                        <div className="relative">
                                            <div className="absolute inset-0 h-2 bg-black/5 rounded-full" />
                                            <input
                                                type="range"
                                                min="0"
                                                max="100"
                                                value={percentage}
                                                onChange={(e) => handlePercentageChange(jar.id, e.target.value)}
                                                className="relative w-full h-2 bg-transparent rounded-full appearance-none cursor-pointer z-10"
                                                style={{
                                                    background: `linear-gradient(to right, currentColor ${percentage}%, transparent ${percentage}%)`
                                                }}
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
                                    ? 'bg-gray-200 text-gray-400'
                                    : allocationSource === 'profit'
                                        ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white'
                                        : 'bg-gradient-to-r from-cafe-800 to-cafe-900 text-white'
                                }`}
                        >
                            {allocationSource === 'profit' ? <Sparkles /> : <Check />}
                            ยืนยันการจัดสรร
                            <ArrowRight size={20} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
