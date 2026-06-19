import React, { useState, useMemo } from 'react';
import { Transaction } from '@/types';
import { formatDate, formatCurrency } from '@/src/lib/utils';
import { ArrowUpRight, ArrowDownLeft, ArrowRightLeft, Search, TrendingUp, Edit2, Trash2, Calendar, Tag, Wallet } from 'lucide-react';
import { useStore } from '@/src/store';
import { EditTransactionModal } from './EditTransactionModal';

interface TransactionTableProps {
    transactions: Transaction[];
}

export const TransactionTable: React.FC<TransactionTableProps> = React.memo(({ transactions }) => {
    const deleteTransaction = useStore(state => state.deleteTransaction);
    const [searchTerm, setSearchTerm] = useState('');
    const [typeFilter, setTypeFilter] = useState<string>('ALL');
    const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
    const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [transactionToDelete, setTransactionToDelete] = useState<Transaction | null>(null);

    const handleEdit = (transaction: Transaction) => {
        setEditingTransaction(transaction);
        setIsEditModalOpen(true);
    };

    const handleDeleteClick = (transaction: Transaction) => {
        setTransactionToDelete(transaction);
    };

    const confirmDelete = () => {
        if (transactionToDelete) {
            deleteTransaction(transactionToDelete.id);
            setTransactionToDelete(null);
        }
    };

    // Helper to translate descriptions
    const translateDescription = (desc: string) => {
        if (!desc) return '';
        if (desc.includes('Profit Allocation')) {
            return desc.replace('Profit Allocation', 'ปันผลกำไร').replace('to', 'เข้า');
        }
        if (desc.includes('COGS')) {
            return desc.replace('COGS', 'ต้นทุนขาย (COGS)');
        }
        if (desc.includes('Auto-allocation')) {
            return desc.replace('Auto-allocation', 'จัดสรรเงินอัตโนมัติ');
        }
        if (desc.includes('Transfer from')) {
            return desc.replace('Transfer from', 'โอนจาก').replace('to', 'ไป');
        }
        if (desc.includes('PO Cancelled')) {
            return desc.replace('PO Cancelled - Refund', 'ยกเลิกใบสั่งซื้อ - คืนเงิน');
        }
        return desc;
    };

    // Helper to translate jar names (basic mapping)
    const translateJar = (jarName: string) => {
        const map: Record<string, string> = {
            'Working': 'หมุนเวียน',
            'CapEx': 'ลงทุน',
            'Opex': 'ดำเนินงาน',
            'Emergency': 'ฉุกเฉิน',
            'Owner': 'ส่วนตัว',
            'Cost': 'ต้นทุน',
            'Profit': 'กำไร'
        };
        return map[jarName] || jarName;
    };

    // Get unique categories from transactions
    const categories: string[] = useMemo(() => Array.from(new Set(transactions.map(t => t.category).filter((c): c is string => !!c))), [transactions]);

    // Filter transactions
    const filteredTransactions = useMemo(() => transactions.filter(tx => {
        const matchesSearch = tx.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
            translateDescription(tx.description).toLowerCase().includes(searchTerm.toLowerCase());
        const matchesType = typeFilter === 'ALL' || tx.type === typeFilter;
        const matchesCategory = categoryFilter === 'ALL' || tx.category === categoryFilter;
        return matchesSearch && matchesType && matchesCategory;
    }), [transactions, searchTerm, typeFilter, categoryFilter]);

    // Calculate totals
    const totals = useMemo(() => filteredTransactions.reduce((acc, tx) => {
        if (tx.type === 'INCOME') acc.income += tx.amount;
        if (tx.type === 'EXPENSE') acc.expense += tx.amount;
        return acc;
    }, { income: 0, expense: 0 }), [filteredTransactions]);

    // Group transactions by date
    const groupedTransactions = useMemo(() => filteredTransactions.reduce((groups, tx) => {
        const dateKey = new Date(tx.date).toLocaleDateString('th-TH', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        if (!groups[dateKey]) {
            groups[dateKey] = [];
        }
        groups[dateKey].push(tx);
        return groups;
    }, {} as Record<string, Transaction[]>), [filteredTransactions]);

    // Get sorted date keys (newest first)
    const sortedDateKeys = useMemo(() => Object.keys(groupedTransactions).sort((a, b) => {
        const dateA = new Date(groupedTransactions[a][0].date);
        const dateB = new Date(groupedTransactions[b][0].date);
        return dateB.getTime() - dateA.getTime();
    }), [groupedTransactions]);

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'INCOME': return <ArrowDownLeft size={20} className="text-green-600" />;
            case 'EXPENSE': return <ArrowUpRight size={20} className="text-red-600" />;
            case 'TRANSFER': return <ArrowRightLeft size={20} className="text-blue-600" />;
            default: return <TrendingUp size={20} className="text-gray-600" />;
        }
    };

    const getTypeColor = (type: string) => {
        switch (type) {
            case 'INCOME': return 'bg-green-100';
            case 'EXPENSE': return 'bg-red-100';
            case 'TRANSFER': return 'bg-blue-100';
            default: return 'bg-gray-100';
        }
    };

    return (
        <div className="bg-white rounded-3xl shadow-sm border border-stone-100 overflow-hidden">
            <div className="p-6 border-b border-stone-100 bg-stone-50/50">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div>
                        <h3 className="text-xl font-bold text-stone-900">รายการเคลื่อนไหว</h3>
                        <p className="text-sm text-stone-500">ประวัติการเงินทั้งหมดของคุณ</p>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                        <div className="flex items-center gap-2 bg-green-100/50 px-4 py-2 rounded-xl border border-green-100">
                            <div className="bg-green-500 rounded-full p-1">
                                <ArrowDownLeft className="text-white" size={12} />
                            </div>
                            <div>
                                <p className="text-[10px] text-green-600 font-bold uppercase">รายรับ</p>
                                <p className="text-green-700 font-bold">{formatCurrency(totals.income)}</p>
                            </div>
                        </div>
                        {totals.expense > 0 && (
                            <div className="flex items-center gap-2 bg-red-100/50 px-4 py-2 rounded-xl border border-red-100">
                                <div className="bg-red-500 rounded-full p-1">
                                    <ArrowUpRight className="text-white" size={12} />
                                </div>
                                <div>
                                    <p className="text-[10px] text-red-600 font-bold uppercase">รายจ่าย</p>
                                    <p className="text-red-700 font-bold">{formatCurrency(totals.expense)}</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Filters */}
                <div className="flex flex-col md:flex-row gap-3">
                    {/* Search */}
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="ค้นหารายการ..."
                            className="w-full pl-10 pr-4 py-2.5 bg-white border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-200 outline-none shadow-sm transition-all hover:border-amber-300"
                        />
                    </div>

                    {/* Type Filter */}
                    <select
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                        className="px-4 py-2.5 bg-white border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-200 outline-none shadow-sm cursor-pointer hover:border-amber-300"
                    >
                        <option value="ALL">ทุกประเภท</option>
                        <option value="INCOME">รายรับ (Income)</option>
                        <option value="EXPENSE">รายจ่าย (Expense)</option>
                        <option value="TRANSFER">โอนเงิน (Transfer)</option>
                    </select>

                    {/* Category Filter */}
                    <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className="px-4 py-2.5 bg-white border border-stone-200 rounded-xl text-sm focus:ring-2 focus:ring-amber-200 outline-none shadow-sm cursor-pointer hover:border-amber-300"
                    >
                        <option value="ALL">ทุกหมวดหมู่</option>
                        <option value="Sales:Summary">📊 สรุปรายวัน</option>
                        {categories.filter(c => c && c.startsWith('Sales:') && c !== 'Sales:Summary').map(cat => (
                            <option key={cat} value={cat}>
                                🛍️ {cat?.replace('Sales:', '')}
                            </option>
                        ))}
                        {categories.filter(c => c && !c.startsWith('Sales:')).map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="overflow-x-auto">
                {/* Desktop Table View */}
                <table className="w-full text-left hidden md:table">
                    <thead className="bg-white border-b border-stone-100">
                        <tr>
                            <th className="px-6 py-4 text-xs font-bold text-stone-400 uppercase tracking-wider w-16">ประเภท</th>
                            <th className="px-6 py-4 text-xs font-bold text-stone-400 uppercase tracking-wider">รายการ</th>
                            <th className="px-6 py-4 text-xs font-bold text-stone-400 uppercase tracking-wider text-right">จำนวนเงิน</th>
                            <th className="px-6 py-4 text-xs font-bold text-stone-400 uppercase tracking-wider text-center w-24">จัดการ</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-50">
                        {filteredTransactions.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-6 py-12 text-center text-cafe-400">
                                    <div className="flex flex-col items-center justify-center gap-3">
                                        <div className="bg-cafe-50 p-4 rounded-full">
                                            <Search size={24} className="text-cafe-300" />
                                        </div>
                                        <p>ไม่พบรายการที่ค้นหา</p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            filteredTransactions.slice(0, 50).map((tx) => (
                                <tr key={tx.id} className="group hover:bg-cafe-50/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${getTypeColor(tx.type)}`}>
                                            {getTypeIcon(tx.type)}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-cafe-900 text-base mb-1">
                                                {translateDescription(tx.description)}
                                            </span>
                                            <div className="flex items-center gap-3 text-xs text-cafe-500">
                                                <div className="flex items-center gap-1">
                                                    <Calendar size={12} />
                                                    {formatDate(tx.date)}
                                                </div>
                                                {tx.category && (
                                                    <div className="flex items-center gap-1 bg-cafe-100 px-2 py-0.5 rounded-md">
                                                        <Tag size={10} />
                                                        {tx.category.replace('Sales:', '')}
                                                    </div>
                                                )}
                                                {(tx.fromJar || tx.toJar) && (
                                                    <div className="flex items-center gap-1">
                                                        <Wallet size={12} />
                                                        {tx.fromJar && <span>{translateJar(tx.fromJar)}</span>}
                                                        {tx.fromJar && tx.toJar && <span className="text-cafe-300">→</span>}
                                                        {tx.toJar && <span>{translateJar(tx.toJar)}</span>}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <span className={`font-bold text-lg ${tx.type === 'INCOME' ? 'text-green-600' :
                                            tx.type === 'EXPENSE' ? 'text-red-600' :
                                                'text-blue-600'
                                            }`}>
                                            {tx.type === 'EXPENSE' ? '-' : '+'}{formatCurrency(tx.amount)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => handleEdit(tx)}
                                                className="p-2 text-cafe-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                title="แก้ไข"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteClick(tx)}
                                                className="p-2 text-cafe-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                title="ลบ"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>

                {/* Mobile Card View */}
                <div className="md:hidden p-4 bg-cafe-50/30">
                    {filteredTransactions.length === 0 ? (
                        <div className="text-center text-cafe-400 py-12">
                            ไม่พบรายการ
                        </div>
                    ) : (
                        sortedDateKeys.map((dateKey) => (
                            <div key={dateKey} className="mb-6">
                                {/* Date Header */}
                                <div className="sticky top-0 z-10 bg-gradient-to-r from-cafe-100/90 to-cafe-50/90 backdrop-blur-sm px-4 py-2 rounded-xl mb-3 flex items-center gap-2 shadow-sm">
                                    <Calendar size={14} className="text-cafe-600" />
                                    <span className="text-sm font-bold text-cafe-700">{dateKey}</span>
                                    <span className="ml-auto text-xs text-cafe-500 bg-white px-2 py-0.5 rounded-full">
                                        {groupedTransactions[dateKey].length} รายการ
                                    </span>
                                </div>
                                {/* Transactions for this date */}
                                <div className="space-y-3">
                                    {groupedTransactions[dateKey].map((tx) => (
                                        <div key={tx.id} className="bg-white border border-cafe-100 rounded-2xl p-4 shadow-sm active:scale-[0.99] transition-transform">
                                            <div className="flex items-start gap-4">
                                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${getTypeColor(tx.type)}`}>
                                                    {getTypeIcon(tx.type)}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex justify-between items-start mb-1">
                                                        <h4 className="font-bold text-cafe-900 truncate pr-2">
                                                            {translateDescription(tx.description)}
                                                        </h4>
                                                        <span className={`font-bold whitespace-nowrap ${tx.type === 'INCOME' ? 'text-green-600' :
                                                            tx.type === 'EXPENSE' ? 'text-red-600' :
                                                                'text-blue-600'
                                                            }`}>
                                                            {tx.type === 'EXPENSE' ? '-' : '+'}{formatCurrency(tx.amount)}
                                                        </span>
                                                    </div>

                                                    <div className="flex flex-wrap gap-2 text-xs text-cafe-500 mb-2">
                                                        {tx.category && (
                                                            <span className="bg-cafe-50 px-2 py-0.5 rounded-md border border-cafe-100">
                                                                {tx.category.replace('Sales:', '')}
                                                            </span>
                                                        )}
                                                    </div>

                                                    {(tx.fromJar || tx.toJar) && (
                                                        <div className="flex items-center gap-2 text-xs text-cafe-500 bg-cafe-50 p-2 rounded-lg mb-2">
                                                            <Wallet size={12} />
                                                            {tx.fromJar && <span>{translateJar(tx.fromJar)}</span>}
                                                            {tx.fromJar && tx.toJar && <ArrowRightLeft size={10} className="text-cafe-300" />}
                                                            {tx.toJar && <span>{translateJar(tx.toJar)}</span>}
                                                        </div>
                                                    )}

                                                    <div className="flex justify-end gap-3 border-t border-cafe-50 pt-2 mt-1">
                                                        <button
                                                            onClick={() => handleEdit(tx)}
                                                            className="text-xs font-medium text-blue-600 flex items-center gap-1"
                                                        >
                                                            <Edit2 size={12} /> แก้ไข
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteClick(tx)}
                                                            className="text-xs font-medium text-red-600 flex items-center gap-1"
                                                        >
                                                            <Trash2 size={12} /> ลบ
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Edit Transaction Modal */}
            <EditTransactionModal
                isOpen={isEditModalOpen}
                onClose={() => {
                    setIsEditModalOpen(false);
                    setEditingTransaction(null);
                }}
                transaction={editingTransaction}
            />

            {/* Delete Confirmation Modal */}
            {transactionToDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-in fade-in duration-200 p-4">
                    <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl">
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Trash2 size={32} className="text-red-500" />
                            </div>
                            <h3 className="text-xl font-bold text-cafe-900 mb-2">ยืนยันการลบ?</h3>
                            <p className="text-cafe-500 text-sm">
                                คุณต้องการลบรายการ <span className="font-bold text-cafe-800">"{translateDescription(transactionToDelete.description)}"</span> ใช่หรือไม่?
                                <br />การกระทำนี้ไม่สามารถย้อนกลับได้
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setTransactionToDelete(null)}
                                className="flex-1 px-4 py-3 bg-gray-100 text-cafe-600 rounded-xl hover:bg-gray-200 font-bold transition-colors"
                            >
                                ยกเลิก
                            </button>
                            <button
                                onClick={confirmDelete}
                                className="flex-1 px-4 py-3 bg-red-500 text-white rounded-xl hover:bg-red-600 font-bold shadow-lg shadow-red-200 transition-all active:scale-95"
                            >
                                ลบรายการ
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
});
