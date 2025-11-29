import React, { useState } from 'react';
import { Transaction } from '@/types';
import { formatDate, formatCurrency } from '@/src/lib/utils';
import { ArrowUpRight, ArrowDownLeft, ArrowRightLeft, Search, Filter, TrendingUp, Edit2, Trash2 } from 'lucide-react';
import { useStore } from '@/src/store';
import { EditTransactionModal } from './EditTransactionModal';

interface TransactionTableProps {
    transactions: Transaction[];
}

export const TransactionTable: React.FC<TransactionTableProps> = ({ transactions }) => {
    const { deleteTransaction } = useStore();
    const [searchTerm, setSearchTerm] = useState('');
    const [typeFilter, setTypeFilter] = useState<string>('ALL');
    const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
    const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    const handleEdit = (transaction: Transaction) => {
        setEditingTransaction(transaction);
        setIsEditModalOpen(true);
    };

    const handleDelete = (transaction: Transaction) => {
        if (confirm(`ยืนยันการลบ Transaction นี้หรือไม่?\n\n"${transaction.description}"\nจำนวน: ${formatCurrency(transaction.amount)}\n\n⚠️ คำเตือน: การลบจะไม่ส่งผลต่อยอดเงินในกระเป๋า`)) {
            deleteTransaction(transaction.id);
        }
    };

    // Get unique categories from transactions
    const categories: string[] = Array.from(new Set(transactions.map(t => t.category).filter((c): c is string => !!c)));

    // Filter transactions
    const filteredTransactions = transactions.filter(tx => {
        const matchesSearch = tx.description.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesType = typeFilter === 'ALL' || tx.type === typeFilter;
        const matchesCategory = categoryFilter === 'ALL' || tx.category === categoryFilter;
        return matchesSearch && matchesType && matchesCategory;
    });

    // Calculate totals
    const totals = filteredTransactions.reduce((acc, tx) => {
        if (tx.type === 'INCOME') acc.income += tx.amount;
        if (tx.type === 'EXPENSE') acc.expense += tx.amount;
        return acc;
    }, { income: 0, expense: 0 });

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-cafe-100 overflow-hidden">
            <div className="p-6 border-b border-cafe-100">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-cafe-800">รายการเคลื่อนไหวล่าสุด</h3>
                    <div className="flex items-center gap-2 text-sm">
                        <div className="flex items-center gap-2 bg-green-50 px-3 py-1.5 rounded-lg">
                            <TrendingUp className="text-green-600" size={14} />
                            <span className="text-green-700 font-medium">รายรับ: {formatCurrency(totals.income)}</span>
                        </div>
                        {totals.expense > 0 && (
                            <div className="flex items-center gap-2 bg-red-50 px-3 py-1.5 rounded-lg">
                                <ArrowUpRight className="text-red-600" size={14} />
                                <span className="text-red-700 font-medium">รายจ่าย: {formatCurrency(totals.expense)}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Filters */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-cafe-400" size={16} />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="ค้นหารายการ..."
                            className="w-full pl-10 pr-4 py-2 border border-cafe-200 rounded-lg text-sm focus:ring-2 focus:ring-cafe-500 outline-none"
                        />
                    </div>

                    {/* Type Filter */}
                    <select
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                        className="px-4 py-2 border border-cafe-200 rounded-lg text-sm focus:ring-2 focus:ring-cafe-500 outline-none"
                    >
                        <option value="ALL">ทุกประเภท</option>
                        <option value="INCOME">รายรับ</option>
                        <option value="EXPENSE">รายจ่าย</option>
                        <option value="TRANSFER">โยกเงิน</option>
                    </select>

                    {/* Category Filter */}
                    <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className="px-4 py-2 border border-cafe-200 rounded-lg text-sm focus:ring-2 focus:ring-cafe-500 outline-none"
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

                {/* Results Count */}
                <p className="text-xs text-cafe-500 mt-3">
                    แสดง {filteredTransactions.length} จาก {transactions.length} รายการ
                </p>
            </div>

            <div className="overflow-x-auto">
                {/* Desktop Table View */}
                <table className="w-full text-left hidden md:table">
                    <thead className="bg-cafe-50 text-cafe-500 text-sm">
                        <tr>
                            <th className="px-6 py-4 font-medium">วันที่</th>
                            <th className="px-6 py-4 font-medium">รายการ</th>
                            <th className="px-6 py-4 font-medium">ประเภท</th>
                            <th className="px-6 py-4 font-medium text-right">จำนวนเงิน</th>
                            <th className="px-6 py-4 font-medium text-center">จัดการ</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-cafe-100">
                        {filteredTransactions.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-8 text-center text-cafe-400">
                                    {searchTerm || typeFilter !== 'ALL' || categoryFilter !== 'ALL'
                                        ? 'ไม่พบรายการที่ตรงกับการค้นหา'
                                        : 'ยังไม่มีรายการ'}
                                </td>
                            </tr>
                        ) : (
                            filteredTransactions.slice(0, 50).map((tx) => (
                                <tr key={tx.id} className="hover:bg-cafe-50/50 transition-colors">
                                    <td className="px-6 py-4 text-sm text-cafe-600">
                                        {formatDate(tx.date)}
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="text-sm font-medium text-cafe-800">{tx.description}</p>
                                        <div className="flex items-center gap-2 text-xs text-cafe-500 mt-1">
                                            {tx.fromJar && <span>จาก: {tx.fromJar}</span>}
                                            {tx.toJar && <span>ไป: {tx.toJar}</span>}
                                            {tx.category && (
                                                <span className="bg-cafe-100 px-2 py-0.5 rounded-full">
                                                    {tx.category.replace('Sales:', '')}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium
                      ${tx.type === 'INCOME' ? 'bg-green-100 text-green-700' :
                                                tx.type === 'EXPENSE' ? 'bg-red-100 text-red-700' :
                                                    'bg-blue-100 text-blue-700'}`}>
                                            {tx.type === 'INCOME' && <ArrowDownLeft size={12} />}
                                            {tx.type === 'EXPENSE' && <ArrowUpRight size={12} />}
                                            {tx.type === 'TRANSFER' && <ArrowRightLeft size={12} />}
                                            {tx.type}
                                        </span>
                                    </td>
                                    <td className={`px-6 py-4 text-right font-medium
                    ${tx.type === 'INCOME' ? 'text-green-600' :
                                            tx.type === 'EXPENSE' ? 'text-red-600' :
                                                'text-cafe-800'}`}>
                                        {tx.type === 'EXPENSE' ? '-' : '+'}{formatCurrency(tx.amount)}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center justify-center gap-2">
                                            <button
                                                onClick={() => handleEdit(tx)}
                                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                title="แก้ไข"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(tx)}
                                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
                <div className="md:hidden space-y-3 p-4">
                    {filteredTransactions.length === 0 ? (
                        <div className="text-center text-cafe-400 py-8">
                            {searchTerm || typeFilter !== 'ALL' || categoryFilter !== 'ALL'
                                ? 'ไม่พบรายการที่ตรงกับการค้นหา'
                                : 'ยังไม่มีรายการ'}
                        </div>
                    ) : (
                        filteredTransactions.slice(0, 50).map((tx) => (
                            <div key={tx.id} className="bg-white border border-cafe-100 rounded-xl p-4 shadow-sm">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <p className="font-bold text-cafe-800">{tx.description}</p>
                                        <p className="text-xs text-cafe-400">{formatDate(tx.date)}</p>
                                    </div>
                                    <span className={`text-lg font-bold
                                        ${tx.type === 'INCOME' ? 'text-green-600' :
                                            tx.type === 'EXPENSE' ? 'text-red-600' :
                                                'text-cafe-800'}`}>
                                        {tx.type === 'EXPENSE' ? '-' : '+'}{formatCurrency(tx.amount)}
                                    </span>
                                </div>

                                <div className="flex flex-wrap gap-2 mb-3">
                                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium
                                        ${tx.type === 'INCOME' ? 'bg-green-100 text-green-700' :
                                            tx.type === 'EXPENSE' ? 'bg-red-100 text-red-700' :
                                                'bg-blue-100 text-blue-700'}`}>
                                        {tx.type === 'INCOME' && <ArrowDownLeft size={12} />}
                                        {tx.type === 'EXPENSE' && <ArrowUpRight size={12} />}
                                        {tx.type === 'TRANSFER' && <ArrowRightLeft size={12} />}
                                        {tx.type}
                                    </span>
                                    {tx.category && (
                                        <span className="bg-cafe-100 text-cafe-600 px-2 py-1 rounded-full text-xs">
                                            {tx.category.replace('Sales:', '')}
                                        </span>
                                    )}
                                    {tx.fromJar && <span className="text-xs text-cafe-500 bg-gray-50 px-2 py-1 rounded-lg">จาก: {tx.fromJar}</span>}
                                    {tx.toJar && <span className="text-xs text-cafe-500 bg-gray-50 px-2 py-1 rounded-lg">ไป: {tx.toJar}</span>}
                                </div>

                                <div className="flex justify-end gap-2 border-t border-cafe-50 pt-2">
                                    <button
                                        onClick={() => handleEdit(tx)}
                                        className="flex items-center gap-1 px-3 py-1.5 text-blue-600 bg-blue-50 rounded-lg text-xs font-medium"
                                    >
                                        <Edit2 size={14} /> แก้ไข
                                    </button>
                                    <button
                                        onClick={() => handleDelete(tx)}
                                        className="flex items-center gap-1 px-3 py-1.5 text-red-600 bg-red-50 rounded-lg text-xs font-medium"
                                    >
                                        <Trash2 size={14} /> ลบ
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {filteredTransactions.length > 50 && (
                    <div className="p-4 text-center text-sm text-cafe-500 bg-cafe-50">
                        แสดง 50 รายการแรก (มีทั้งหมด {filteredTransactions.length} รายการ)
                    </div>
                )}
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
        </div>
    );
};
