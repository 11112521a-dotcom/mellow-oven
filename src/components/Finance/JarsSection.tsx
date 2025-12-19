import React, { useState } from 'react';
import { Jar } from '@/types';
import { formatCurrency } from '@/src/lib/utils';
import { Box, Hammer, Zap, ShieldAlert, Smile, Pencil, X, Check } from 'lucide-react';
import { useStore } from '@/src/store';

interface JarsSectionProps {
    jars: Jar[];
    onJarClick: (jarId: string) => void;
}

export const JarsSection: React.FC<JarsSectionProps> = ({ jars, onJarClick }) => {
    const { addTransaction } = useStore();
    const [editingJar, setEditingJar] = useState<Jar | null>(null);
    const [newBalance, setNewBalance] = useState('');

    const getJarConfig = (id: string) => {
        switch (id) {
            case 'Working':
                return {
                    icon: <Box size={24} className="text-blue-600" />,
                    bg: 'bg-blue-50',
                    text: 'text-blue-900',
                    iconBg: 'bg-blue-100',
                    percentage: 40
                };
            case 'CapEx':
                return {
                    icon: <Hammer size={24} className="text-purple-600" />,
                    bg: 'bg-purple-50',
                    text: 'text-purple-900',
                    iconBg: 'bg-purple-100',
                    percentage: 10
                };
            case 'Opex':
                return {
                    icon: <Zap size={24} className="text-orange-600" />,
                    bg: 'bg-orange-50',
                    text: 'text-orange-900',
                    iconBg: 'bg-orange-100',
                    percentage: 30
                };
            case 'Emergency':
                return {
                    icon: <ShieldAlert size={24} className="text-rose-600" />,
                    bg: 'bg-rose-50',
                    text: 'text-rose-900',
                    iconBg: 'bg-rose-100',
                    percentage: 10
                };
            case 'Owner':
                return {
                    icon: <Smile size={24} className="text-emerald-600" />,
                    bg: 'bg-emerald-50',
                    text: 'text-emerald-900',
                    iconBg: 'bg-emerald-100',
                    percentage: 10
                };
            default:
                return {
                    icon: <Box size={24} className="text-gray-600" />,
                    bg: 'bg-gray-50',
                    text: 'text-gray-900',
                    iconBg: 'bg-gray-100',
                    percentage: 0
                };
        }
    };

    const handleEditClick = (e: React.MouseEvent, jar: Jar) => {
        e.stopPropagation();
        setEditingJar(jar);
        setNewBalance(jar.balance.toString());
    };

    const handleSaveBalance = async () => {
        if (!editingJar) return;

        const newBalanceNum = parseFloat(newBalance) || 0;
        const difference = newBalanceNum - editingJar.balance;

        if (difference === 0) {
            setEditingJar(null);
            return;
        }

        // Create adjustment transaction
        await addTransaction({
            id: `adj-${Date.now().toString(36)}`,
            date: new Date().toISOString(),
            amount: Math.abs(difference),
            type: difference > 0 ? 'INCOME' : 'EXPENSE',
            toJar: difference > 0 ? editingJar.id : undefined,
            fromJar: difference < 0 ? editingJar.id : undefined,
            description: `ปรับยอด ${editingJar.name}: ${formatCurrency(editingJar.balance)} → ${formatCurrency(newBalanceNum)}`,
            category: 'ADJUSTMENT'
        });

        setEditingJar(null);
        setNewBalance('');
    };

    return (
        <div>
            <h2 className="text-xl font-bold text-cafe-800 mb-6 flex items-center gap-2">
                <span className="w-2 h-8 bg-cafe-600 rounded-full"></span>
                กระเป๋าเงิน (Cloud Pockets)
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
                {jars.map((jar) => {
                    const config = getJarConfig(jar.id);
                    return (
                        <div
                            key={jar.id}
                            onClick={() => onJarClick(jar.id)}
                            className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer border border-cafe-50 h-40 flex flex-col justify-between relative overflow-hidden group"
                        >
                            {/* Edit Button */}
                            <button
                                onClick={(e) => handleEditClick(e, jar)}
                                className="absolute top-3 right-3 p-2 rounded-full bg-gray-100 hover:bg-gray-200 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                                title="แก้ไขยอด"
                            >
                                <Pencil size={14} className="text-gray-600" />
                            </button>

                            {/* Top Row */}
                            <div className="flex justify-between items-start">
                                <div className={`w-12 h-12 rounded-2xl ${config.iconBg} flex items-center justify-center transition-transform group-hover:scale-110`}>
                                    {config.icon}
                                </div>
                                <div className="text-right">
                                    <p className={`text-xl font-bold ${config.text}`}>
                                        {formatCurrency(jar.balance)}
                                    </p>
                                </div>
                            </div>

                            {/* Bottom Row */}
                            <div className="flex justify-between items-end mt-4">
                                <div>
                                    <p className="font-semibold text-cafe-700 text-lg">{jar.name}</p>
                                    <p className="text-xs text-cafe-400 line-clamp-1">{jar.description}</p>
                                </div>
                                <div className={`text-xs font-bold px-2 py-1 rounded-lg ${config.bg} ${config.text}`}>
                                    {config.percentage}%
                                </div>
                            </div>

                            {/* Decorative Background Blob */}
                            <div className={`absolute -bottom-8 -right-8 w-24 h-24 rounded-full ${config.bg} opacity-50 blur-2xl pointer-events-none group-hover:opacity-80 transition-opacity`}></div>
                        </div>
                    );
                })}
            </div>

            {/* Edit Balance Modal */}
            {editingJar && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setEditingJar(null)}>
                    <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-cafe-800">แก้ไขยอด {editingJar.name}</h3>
                            <button onClick={() => setEditingJar(null)} className="p-2 hover:bg-gray-100 rounded-full">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-sm text-gray-600 mb-1 block">ยอดปัจจุบัน</label>
                                <p className="text-xl font-bold text-gray-400">{formatCurrency(editingJar.balance)}</p>
                            </div>

                            <div>
                                <label className="text-sm text-gray-600 mb-1 block">ยอดใหม่</label>
                                <input
                                    type="number"
                                    value={newBalance}
                                    onChange={(e) => setNewBalance(e.target.value)}
                                    className="w-full px-4 py-3 border-2 border-cafe-200 rounded-xl text-xl font-bold focus:border-cafe-500 focus:outline-none"
                                    placeholder="0.00"
                                    autoFocus
                                />
                            </div>

                            {parseFloat(newBalance) !== editingJar.balance && (
                                <div className={`p-3 rounded-xl text-sm ${parseFloat(newBalance) > editingJar.balance ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                    {parseFloat(newBalance) > editingJar.balance ? '📈' : '📉'} ผลต่าง: {formatCurrency(Math.abs((parseFloat(newBalance) || 0) - editingJar.balance))}
                                </div>
                            )}
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setEditingJar(null)}
                                className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                            >
                                <X size={18} /> ยกเลิก
                            </button>
                            <button
                                onClick={handleSaveBalance}
                                className="flex-1 px-4 py-3 bg-gradient-to-r from-cafe-600 to-cafe-700 text-white rounded-xl font-medium transition-all hover:shadow-lg flex items-center justify-center gap-2"
                            >
                                <Check size={18} /> บันทึก
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

