import React, { useState, useEffect } from 'react';
import { useStore } from '@/src/store';
import { JarType, AllocationProfile } from '@/types';
import { formatCurrency } from '@/src/lib/utils';
import { PieChart, Save, Trash2, ArrowRight, Percent, DollarSign, Zap, Calendar, TrendingUp, Sparkles } from 'lucide-react';

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

    const handleDeleteProfile = () => {
        if (selectedProfileId === 'default') return;
        if (confirm('คุณต้องการลบโปรไฟล์นี้ใช่หรือไม่?')) {
            deleteAllocationProfile(selectedProfileId);
            setSelectedProfileId('default');
        }
    };

    const handleAllocate = () => {
        const numAmount = parseFloat(amount);
        if (isNaN(numAmount) || numAmount <= 0) return;
        if (Math.abs(totalPercentage - 100) > 0.1) { // Allow small float error
            alert('ผลรวมสัดส่วนต้องเท่ากับ 100%');
            return;
        }

        let specificProfits: { id: string, amount: number }[] | undefined = undefined;
        if (allocationSource === 'profit' && selectedProfitDate !== 'all') {
            const profits = getUnallocatedByDate(selectedProfitDate);
            specificProfits = profits.map(p => ({ id: p.id, amount: p.amount }));
        }

        onAllocate(numAmount, currentAllocations, allocationSource === 'profit', specificProfits);

        // Reset
        if (allocationSource === 'manual') {
            setAmount('');
        }
        setCurrentAmounts({
            'Working': '',
            'CapEx': '',
            'Opex': '',
            'Emergency': '',
            'Owner': ''
        });
    };

    const handleQuickAllocate = (profileId: string) => {
        const profile = allocationProfiles.find(p => p.id === profileId);
        if (!profile || !amount || parseFloat(amount) <= 0) return;

        const numAmount = parseFloat(amount);

        let specificProfits: { id: string, amount: number }[] | undefined = undefined;
        if (allocationSource === 'profit' && selectedProfitDate !== 'all') {
            const profits = getUnallocatedByDate(selectedProfitDate);
            specificProfits = profits.map(p => ({ id: p.id, amount: p.amount }));
        }

        onAllocate(numAmount, profile.allocations, allocationSource === 'profit', specificProfits);

        if (allocationSource === 'manual') {
            setAmount('');
        }
        setCurrentAmounts({
            'Working': '',
            'CapEx': '',
            'Opex': '',
            'Emergency': '',
            'Owner': ''
        });
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-cafe-100 p-6">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="bg-cafe-100 p-2 rounded-lg text-cafe-600">
                        <PieChart size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-cafe-900">Allocation Station</h2>
                        <p className="text-sm text-cafe-500">จัดสรรเงินเข้ากระเป๋าต่างๆ</p>
                    </div>
                </div>

                {/* Mode Toggle */}
                <div className="flex gap-2 bg-cafe-50 p-1 rounded-lg">
                    <button
                        onClick={() => setInputMode('percentage')}
                        className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${inputMode === 'percentage'
                                ? 'bg-white shadow-sm text-cafe-900'
                                : 'text-cafe-600 hover:text-cafe-900'
                            }`}
                    >
                        <Percent size={16} />
                        เปอร์เซ็นต์
                    </button>
                    <button
                        onClick={() => setInputMode('amount')}
                        className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${inputMode === 'amount'
                                ? 'bg-white shadow-sm text-cafe-900'
                                : 'text-cafe-600 hover:text-cafe-900'
                            }`}
                    >
                        <DollarSign size={16} />
                        จำนวนเงิน
                    </button>
                </div>
            </div>

            {/* Quick Actions */}
            {allocationProfiles.length > 1 && (
                <div className="mb-6 p-4 bg-gradient-to-r from-cafe-50 to-amber-50 rounded-xl border border-cafe-100">
                    <div className="flex items-center gap-2 mb-3">
                        <Zap size={16} className="text-amber-600" />
                        <h3 className="text-sm font-semibold text-cafe-800">การแบ่งด่วน</h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {allocationProfiles.map(profile => (
                            <button
                                key={profile.id}
                                onClick={() => handleQuickAllocate(profile.id)}
                                disabled={!amount || parseFloat(amount) <= 0}
                                className="px-4 py-2 bg-white border border-cafe-200 rounded-lg text-sm font-medium text-cafe-700 hover:bg-cafe-50 hover:border-cafe-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {profile.name}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left: Controls */}
                <div className="space-y-6">

                    {/* Source Selection */}
                    <div className="bg-cafe-50 p-1 rounded-xl flex">
                        <button
                            onClick={() => {
                                setAllocationSource('manual');
                                setAmount('');
                            }}
                            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${allocationSource === 'manual'
                                    ? 'bg-white shadow text-cafe-900'
                                    : 'text-cafe-500 hover:text-cafe-900'
                                }`}
                        >
                            ระบุเอง
                        </button>
                        <button
                            onClick={() => setAllocationSource('profit')}
                            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-2 ${allocationSource === 'profit'
                                    ? 'bg-green-100 text-green-800 shadow-sm'
                                    : 'text-cafe-500 hover:text-cafe-900'
                                }`}
                        >
                            <Zap size={14} />
                            จากกำไร
                        </button>
                    </div>

                    {allocationSource === 'profit' ? (
                        <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                                <div className="flex items-start gap-3">
                                    <TrendingUp className="text-green-600 mt-0.5" size={20} />
                                    <div>
                                        <h4 className="font-bold text-green-800 text-sm">Smart Allocation</h4>
                                        <p className="text-xs text-green-700 mt-1">
                                            ระบบจะดึงยอดจากกำไรสะสม (Unallocated Profit) มาจัดสรรให้อัตโนมัติ
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-cafe-700 mb-2">เลือกยอดกำไร</label>
                                <select
                                    value={selectedProfitDate}
                                    onChange={(e) => setSelectedProfitDate(e.target.value)}
                                    className="w-full p-2.5 bg-white border border-cafe-200 rounded-xl outline-none focus:border-green-500 focus:ring-2 focus:ring-green-200"
                                >
                                    <option value="all">ยอดรวมทั้งหมด ({formatCurrency(unallocatedBalance)})</option>
                                    {availableDates.map(date => {
                                        const dateAmount = getUnallocatedByDate(date).reduce((sum, p) => sum + p.amount, 0);
                                        return (
                                            <option key={date} value={date}>
                                                {new Date(date).toLocaleDateString('th-TH', {
                                                    year: 'numeric',
                                                    month: 'long',
                                                    day: 'numeric'
                                                })} - {formatCurrency(dateAmount)}
                                            </option>
                                        );
                                    })}
                                </select>
                            </div>

                            <div className="text-center">
                                <p className="text-sm text-cafe-500 mb-1">ยอดที่จะจัดสรร</p>
                                <p className="text-3xl font-bold text-green-600">{formatCurrency(parseFloat(amount) || 0)}</p>
                            </div>
                        </div>
                    ) : (
                        <div>
                            <label className="block text-sm font-medium text-cafe-700 mb-2">ระบุยอดเงิน</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-cafe-400">฿</span>
                                <input
                                    type="number"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    className="w-full pl-8 pr-4 py-3 text-lg font-bold border-2 border-cafe-200 rounded-xl focus:ring-2 focus:ring-cafe-500 focus:border-transparent outline-none"
                                    placeholder="0.00"
                                />
                            </div>
                            {inputMode === 'amount' && totalAmount > 0 && (
                                <p className="mt-2 text-xs text-cafe-500">
                                    คงเหลือ: {formatCurrency((parseFloat(amount) || 0) - totalAmount)}
                                </p>
                            )}
                        </div>
                    )}

                    <div className="pt-4 border-t border-cafe-100">
                        <label className="block text-sm font-medium text-cafe-700 mb-2">เลือกโปรไฟล์</label>
                        <div className="flex gap-2">
                            <select
                                value={selectedProfileId}
                                onChange={(e) => setSelectedProfileId(e.target.value)}
                                className="flex-1 p-2 border border-cafe-200 rounded-lg outline-none focus:border-cafe-500"
                            >
                                {allocationProfiles.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                            {selectedProfileId !== 'default' && (
                                <button
                                    onClick={handleDeleteProfile}
                                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                                    title="ลบโปรไฟล์"
                                >
                                    <Trash2 size={20} />
                                </button>
                            )}
                        </div>
                    </div>

                    {isEditing && (
                        <div className="bg-cafe-50 p-4 rounded-xl border border-cafe-100 animate-in fade-in slide-in-from-top-2">
                            <label className="block text-xs font-medium text-cafe-600 mb-2">บันทึกเป็นโปรไฟล์ใหม่</label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={newProfileName}
                                    onChange={(e) => setNewProfileName(e.target.value)}
                                    placeholder="ชื่อโปรไฟล์..."
                                    className="flex-1 px-3 py-1.5 text-sm border border-cafe-200 rounded-lg outline-none"
                                />
                                <button
                                    onClick={handleSaveProfile}
                                    disabled={!newProfileName}
                                    className="px-3 py-1.5 bg-cafe-600 text-white rounded-lg text-sm font-medium disabled:opacity-50 hover:bg-cafe-700"
                                >
                                    <Save size={16} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Middle & Right: Allocation Inputs */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="font-semibold text-cafe-800">
                            {inputMode === 'percentage' ? 'กำหนดสัดส่วน (%)' : 'กำหนดจำนวนเงิน (฿)'}
                        </h3>
                        <span className={`text-sm font-bold ${inputMode === 'percentage'
                                ? Math.abs(totalPercentage - 100) < 0.1 ? 'text-green-600' : 'text-red-500'
                                : totalAmount === parseFloat(amount || '0') ? 'text-green-600' : 'text-amber-600'
                            }`}>
                            {inputMode === 'percentage'
                                ? `รวม: ${totalPercentage.toFixed(0)}%`
                                : `รวม: ${formatCurrency(totalAmount)}`
                            }
                        </span>
                    </div>

                    {jars.map(jar => (
                        <div key={jar.id} className="flex items-center gap-4">
                            <div className="w-24 text-sm font-medium text-cafe-700">{jar.name}</div>

                            {inputMode === 'percentage' ? (
                                <>
                                    <div className="flex-1">
                                        <input
                                            type="range"
                                            min="0"
                                            max="100"
                                            value={currentAllocations[jar.id] || 0}
                                            onChange={(e) => handlePercentageChange(jar.id, e.target.value)}
                                            className="w-full h-2 bg-cafe-200 rounded-lg appearance-none cursor-pointer accent-cafe-600"
                                        />
                                    </div>
                                    <div className="w-20">
                                        <input
                                            type="number"
                                            min="0"
                                            max="100"
                                            value={currentAllocations[jar.id]?.toFixed(0) || '0'}
                                            onChange={(e) => handlePercentageChange(jar.id, e.target.value)}
                                            className="w-full px-2 py-1 text-sm font-mono font-bold text-cafe-600 border border-cafe-200 rounded-lg text-right outline-none focus:border-cafe-500"
                                        />
                                    </div>
                                    <div className="w-24 text-right text-sm text-cafe-400">
                                        {amount ? formatCurrency((parseFloat(amount) * (currentAllocations[jar.id] || 0)) / 100) : '฿0'}
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="flex-1">
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-cafe-400 text-sm">฿</span>
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={currentAmounts[jar.id] || ''}
                                                onChange={(e) => handleAmountChange(jar.id, e.target.value)}
                                                className="w-full pl-7 pr-3 py-2 text-sm font-mono border border-cafe-200 rounded-lg outline-none focus:border-cafe-500"
                                                placeholder="0.00"
                                            />
                                        </div>
                                    </div>
                                    <div className="w-20 text-right text-sm font-medium text-cafe-600">
                                        {currentAllocations[jar.id]?.toFixed(0) || 0}%
                                    </div>
                                </>
                            )}
                        </div>
                    ))}

                    <div className="pt-6 flex justify-end">
                        <button
                            onClick={handleAllocate}
                            disabled={!amount || parseFloat(amount) <= 0 || (inputMode === 'percentage' && Math.abs(totalPercentage - 100) > 0.1)}
                            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold shadow-lg transition-all disabled:opacity-50 disabled:shadow-none ${allocationSource === 'profit'
                                    ? 'bg-green-600 text-white shadow-green-200 hover:bg-green-700 hover:shadow-xl'
                                    : 'bg-cafe-600 text-white shadow-cafe-200 hover:bg-cafe-700 hover:shadow-xl'
                                }`}
                        >
                            {allocationSource === 'profit' ? <Sparkles size={20} /> : <ArrowRight size={20} />}
                            {allocationSource === 'profit' ? 'ยืนยันแบ่งกำไร' : 'ยืนยันการจัดสรร'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
