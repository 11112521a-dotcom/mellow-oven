import React, { useState, useEffect } from 'react';
import { useStore } from '@/src/store';
import { JarType, AllocationProfile } from '@/types';
import { formatCurrency } from '@/src/lib/utils';
import { PieChart, Save, Trash2, ArrowRight, Percent, DollarSign, Zap, Calendar, TrendingUp, Sparkles, Check, Plus } from 'lucide-react';

interface AllocationStationProps {
    onAllocate: (amount: number, allocations: Record<JarType, number>, fromProfit: boolean, specificProfits?: { id: string, amount: number }[]) => void;
}

type InputMode = 'percentage' | 'amount';
type AllocationSource = 'manual' | 'profit';

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

    const [isEditing, setIsEditing] = useState(false);
    const [newProfileName, setNewProfileName] = useState('');

    // Get unique dates with unallocated profits
    const availableDates = [...new Set(unallocatedProfits.map(p => p.date))].sort((a, b) => b.localeCompare(a));
    const unallocatedBalance = getUnallocatedBalance();

    // Jar Colors
    const getJarColor = (id: string) => {
        switch (id) {
            case 'Owner': return 'bg-amber-500 text-white';
            case 'Emergency': return 'bg-red-500 text-white';
            case 'CapEx': return 'bg-purple-500 text-white';
            case 'Opex': return 'bg-orange-500 text-white';
            case 'Working': return 'bg-blue-500 text-white';
            default: return 'bg-gray-500 text-white';
        }
    };

    const getJarBg = (id: string) => {
        switch (id) {
            case 'Owner': return 'bg-amber-50 text-amber-700 border-amber-200';
            case 'Emergency': return 'bg-red-50 text-red-700 border-red-200';
            case 'CapEx': return 'bg-purple-50 text-purple-700 border-purple-200';
            case 'Opex': return 'bg-orange-50 text-orange-700 border-orange-200';
            case 'Working': return 'bg-blue-50 text-blue-700 border-blue-200';
            default: return 'bg-gray-50 text-gray-700 border-gray-200';
        }
    };

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

        // Recalculate percentages from amounts
        const numAmount = parseFloat(amount);
        if (!isNaN(numAmount) && numAmount > 0) {
            const newAmounts: Record<JarType, number> = {} as Record<JarType, number>;
            let total = 0;

            jars.forEach(jar => {
                const jarAmount = parseFloat(currentAmounts[jar.id] || '0');
                newAmounts[jar.id] = jarAmount;
                total += jarAmount;
            });

            // Add the new value
            const newValue = parseFloat(value) || 0;
            newAmounts[jarId] = newValue;
            total = total - (parseFloat(currentAmounts[jarId] || '0')) + newValue;

            // Update percentages
            const newAllocations: Record<JarType, number> = {} as Record<JarType, number>;
            jars.forEach(jar => {
                newAllocations[jar.id] = total > 0 ? (newAmounts[jar.id] / total) * 100 : 0;
            });
            setCurrentAllocations(newAllocations);
        }
        setIsEditing(true);
    };

    const totalPercentage: number = Object.values(currentAllocations).reduce<number>((sum, val) => sum + (val as number), 0);
    const totalAmount: number = Object.values(currentAmounts).reduce<number>((sum, val) => sum + (parseFloat(val as string) || 0), 0);

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
    };

    return (
        <div className="bg-white rounded-3xl shadow-sm border border-cafe-100 overflow-hidden">
            {/* Header */}
            <div className="bg-cafe-900 text-white p-6 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="bg-white/10 p-2 rounded-xl">
                        <PieChart size={24} className="text-amber-400" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold">Allocation Station</h2>
                        <p className="text-cafe-300 text-xs">ศูนย์บัญชาการจัดสรรเงิน</p>
                    </div>
                </div>

                {/* Mode Toggle */}
                <div className="bg-cafe-800 p-1 rounded-lg flex">
                    <button
                        onClick={() => setInputMode('percentage')}
                        className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${inputMode === 'percentage' ? 'bg-amber-500 text-white shadow' : 'text-cafe-400 hover:text-white'}`}
                    >
                        %
                    </button>
                    <button
                        onClick={() => setInputMode('amount')}
                        className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${inputMode === 'amount' ? 'bg-amber-500 text-white shadow' : 'text-cafe-400 hover:text-white'}`}
                    >
                        ฿
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12">

                {/* LEFT COLUMN: Source (4 cols) */}
                <div className="lg:col-span-5 p-6 border-b lg:border-b-0 lg:border-r border-cafe-100 bg-cafe-50/50">
                    <h3 className="text-sm font-bold text-cafe-500 uppercase tracking-wider mb-4">1. แหล่งเงิน (Source)</h3>

                    {/* Source Tabs */}
                    <div className="grid grid-cols-2 gap-2 mb-6">
                        <button
                            onClick={() => { setAllocationSource('manual'); setAmount(''); }}
                            className={`p-3 rounded-xl border-2 text-sm font-bold transition-all flex flex-col items-center gap-2 ${allocationSource === 'manual'
                                    ? 'border-cafe-600 bg-white text-cafe-800 shadow-md'
                                    : 'border-transparent bg-cafe-100 text-cafe-400 hover:bg-white'
                                }`}
                        >
                            <DollarSign size={20} />
                            ระบุเอง
                        </button>
                        <button
                            onClick={() => setAllocationSource('profit')}
                            className={`p-3 rounded-xl border-2 text-sm font-bold transition-all flex flex-col items-center gap-2 ${allocationSource === 'profit'
                                    ? 'border-green-500 bg-green-50 text-green-700 shadow-md'
                                    : 'border-transparent bg-cafe-100 text-cafe-400 hover:bg-white'
                                }`}
                        >
                            <Zap size={20} />
                            จากกำไร
                        </button>
                    </div>

                    {/* Amount Input Area */}
                    <div className="bg-white p-6 rounded-2xl border border-cafe-200 shadow-sm text-center space-y-4">
                        {allocationSource === 'profit' && (
                            <div className="w-full mb-2">
                                <select
                                    value={selectedProfitDate}
                                    onChange={(e) => setSelectedProfitDate(e.target.value)}
                                    className="w-full p-2 text-sm bg-green-50 border border-green-200 rounded-lg text-green-800 outline-none focus:ring-2 focus:ring-green-500"
                                >
                                    <option value="all">ยอดรวมทั้งหมด ({formatCurrency(unallocatedBalance)})</option>
                                    {availableDates.map(date => (
                                        <option key={date} value={date}>
                                            {new Date(date).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })} - {formatCurrency(getUnallocatedByDate(date).reduce((sum, p) => sum + p.amount, 0))}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div>
                            <label className="block text-xs font-bold text-cafe-400 mb-1">ยอดเงินที่จะจัดสรร</label>
                            <div className="relative inline-block w-full">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-cafe-300 font-bold text-xl">฿</span>
                                <input
                                    type="number"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    disabled={allocationSource === 'profit'}
                                    className={`w-full pl-10 pr-4 py-4 text-3xl font-black text-center rounded-xl outline-none transition-all ${allocationSource === 'profit' ? 'bg-transparent text-green-600' : 'bg-cafe-50 focus:bg-white focus:ring-2 focus:ring-cafe-500 text-cafe-800'
                                        }`}
                                    placeholder="0.00"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Action Button (Desktop) */}
                    <div className="hidden lg:block mt-8">
                        <button
                            onClick={handleAllocate}
                            disabled={!amount || parseFloat(amount) <= 0 || (inputMode === 'percentage' && Math.abs(totalPercentage - 100) > 0.1)}
                            className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg transform transition-all active:scale-95 flex items-center justify-center gap-2 ${!amount || parseFloat(amount) <= 0
                                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                    : allocationSource === 'profit'
                                        ? 'bg-green-600 text-white hover:bg-green-700 shadow-green-200'
                                        : 'bg-cafe-900 text-white hover:bg-cafe-800 shadow-cafe-200'
                                }`}
                        >
                            {allocationSource === 'profit' ? <Sparkles /> : <Check />}
                            ยืนยันการจัดสรร
                        </button>
                    </div>
                </div>

                {/* RIGHT COLUMN: Distribution (8 cols) */}
                <div className="lg:col-span-7 p-6">
                    <div className="flex justify-between items-end mb-4">
                        <h3 className="text-sm font-bold text-cafe-500 uppercase tracking-wider">2. สัดส่วน (Distribution)</h3>

                        {/* Total Progress Bar */}
                        <div className="flex flex-col items-end">
                            <span className={`text-xs font-bold mb-1 ${Math.abs(totalPercentage - 100) < 0.1 ? 'text-green-600' : 'text-red-500'}`}>
                                รวม {totalPercentage.toFixed(0)}%
                            </span>
                            <div className="w-32 h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                    className={`h-full transition-all duration-300 ${Math.abs(totalPercentage - 100) < 0.1 ? 'bg-green-500' : 'bg-red-500'}`}
                                    style={{ width: `${Math.min(totalPercentage, 100)}%` }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Profile Chips */}
                    <div className="flex gap-2 overflow-x-auto pb-4 mb-2 no-scrollbar">
                        {allocationProfiles.map(profile => (
                            <div
                                key={profile.id}
                                onClick={() => setSelectedProfileId(profile.id)}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-bold whitespace-nowrap cursor-pointer transition-all ${selectedProfileId === profile.id
                                        ? 'bg-cafe-800 text-white border-cafe-800 shadow-md'
                                        : 'bg-white text-cafe-600 border-cafe-200 hover:border-cafe-400'
                                    }`}
                            >
                                {profile.name}
                                {profile.id !== 'default' && (
                                    <span
                                        onClick={(e) => handleDeleteProfile(profile.id, e)}
                                        className="hover:text-red-400 p-0.5 rounded-full hover:bg-white/20"
                                    >
                                        <Trash2 size={12} />
                                    </span>
                                )}
                            </div>
                        ))}

                        {/* Save Profile Button */}
                        {isEditing ? (
                            <div className="flex items-center gap-1 bg-cafe-100 px-2 py-1 rounded-full animate-in fade-in">
                                <input
                                    autoFocus
                                    className="bg-transparent text-xs outline-none w-20"
                                    placeholder="ชื่อ..."
                                    value={newProfileName}
                                    onChange={e => setNewProfileName(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleSaveProfile()}
                                />
                                <button onClick={handleSaveProfile} className="bg-cafe-600 text-white p-1 rounded-full"><Check size={10} /></button>
                            </div>
                        ) : (
                            <button className="px-3 py-1.5 rounded-full border border-dashed border-cafe-300 text-cafe-400 text-xs font-bold hover:border-cafe-500 hover:text-cafe-600 flex items-center gap-1">
                                <Plus size={12} /> New
                            </button>
                        )}
                    </div>

                    {/* Sliders Grid */}
                    <div className="space-y-3">
                        {jars.map(jar => (
                            <div key={jar.id} className={`p-3 rounded-xl border transition-all ${getJarBg(jar.id)}`}>
                                <div className="flex justify-between items-center mb-2">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-2 h-8 rounded-full ${getJarColor(jar.id)}`}></div>
                                        <div>
                                            <p className="font-bold text-sm">{jar.name}</p>
                                            {amount && (
                                                <p className="text-xs opacity-70">
                                                    {formatCurrency((parseFloat(amount) * (currentAllocations[jar.id] || 0)) / 100)}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        {inputMode === 'percentage' ? (
                                            <div className="flex items-center gap-1">
                                                <input
                                                    type="number"
                                                    value={currentAllocations[jar.id]?.toFixed(0)}
                                                    onChange={(e) => handlePercentageChange(jar.id, e.target.value)}
                                                    className="w-12 text-right bg-white/50 border border-black/10 rounded px-1 font-bold outline-none focus:bg-white"
                                                />
                                                <span className="text-xs font-bold">%</span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-1">
                                                <span className="text-xs font-bold">฿</span>
                                                <input
                                                    type="number"
                                                    value={currentAmounts[jar.id]}
                                                    onChange={(e) => handleAmountChange(jar.id, e.target.value)}
                                                    className="w-20 text-right bg-white/50 border border-black/10 rounded px-1 font-bold outline-none focus:bg-white"
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {inputMode === 'percentage' && (
                                    <input
                                        type="range"
                                        min="0"
                                        max="100"
                                        value={currentAllocations[jar.id] || 0}
                                        onChange={(e) => handlePercentageChange(jar.id, e.target.value)}
                                        className="w-full h-1.5 bg-black/10 rounded-lg appearance-none cursor-pointer accent-current"
                                        style={{ color: 'currentColor' }} // Uses text color for accent
                                    />
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Mobile Action Button */}
                    <div className="lg:hidden mt-6">
                        <button
                            onClick={handleAllocate}
                            disabled={!amount || parseFloat(amount) <= 0 || (inputMode === 'percentage' && Math.abs(totalPercentage - 100) > 0.1)}
                            className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg flex items-center justify-center gap-2 ${!amount || parseFloat(amount) <= 0
                                    ? 'bg-gray-200 text-gray-400'
                                    : allocationSource === 'profit'
                                        ? 'bg-green-600 text-white'
                                        : 'bg-cafe-900 text-white'
                                }`}
                        >
                            {allocationSource === 'profit' ? <Sparkles /> : <Check />}
                            ยืนยันการจัดสรร
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
