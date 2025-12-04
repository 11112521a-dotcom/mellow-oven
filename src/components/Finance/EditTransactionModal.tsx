import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Transaction, JarType } from '@/types';
import { useStore } from '@/src/store';
import { DollarSign, FileText, Calendar } from 'lucide-react';

interface EditTransactionModalProps {
    isOpen: boolean;
    onClose: () => void;
    transaction: Transaction | null;
}

export const EditTransactionModal: React.FC<EditTransactionModalProps> = ({ isOpen, onClose, transaction }) => {
    const { updateTransaction, jars } = useStore();
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [type, setType] = useState<'INCOME' | 'EXPENSE' | 'TRANSFER'>('INCOME');
    const [toJar, setToJar] = useState<JarType>('Working');
    const [fromJar, setFromJar] = useState<JarType>('Working');

    // Initialize form with transaction data
    useEffect(() => {
        if (transaction) {
            setAmount(transaction.amount.toString());
            setDescription(transaction.description);
            setType(transaction.type);
            if (transaction.toJar) setToJar(transaction.toJar);
            if (transaction.fromJar) setFromJar(transaction.fromJar);
        }
    }, [transaction]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!transaction) return;

        // Confirm before saving
        if (!confirm('ยืนยันการแก้ไข Transaction นี้หรือไม่?')) return;

        const updates: Partial<Transaction> = {
            amount: Number(amount),
            description,
            type,
        };

        if (type === 'INCOME' || type === 'EXPENSE') {
            updates.toJar = toJar;
            updates.fromJar = undefined;
        } else if (type === 'TRANSFER') {
            updates.fromJar = fromJar;
            updates.toJar = toJar;
        }

        updateTransaction(transaction.id, updates);
        onClose();
    };

    if (!transaction) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="✏️ แก้ไข Transaction">
            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Warning */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <p className="text-xs text-yellow-800">
                        ⚠️ <strong>คำเตือน:</strong> การแก้ไข Transaction จะไม่ส่งผลต่อยอดเงินในกระเป๋า
                        <br />ใช้เพื่อแก้ไขข้อมูลที่บันทึกผิดพลาดเท่านั้น
                    </p>
                </div>

                {/* Amount */}
                <div>
                    <label className="block text-sm font-medium text-cafe-700 mb-1 flex items-center gap-2">
                        <DollarSign size={16} />
                        จำนวนเงิน
                    </label>
                    <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full px-4 py-2 border border-cafe-200 rounded-lg focus:ring-2 focus:ring-cafe-500 outline-none"
                        required
                        min="0"
                        step="0.01"
                    />
                </div>

                {/* Description */}
                <div>
                    <label className="block text-sm font-medium text-cafe-700 mb-1 flex items-center gap-2">
                        <FileText size={16} />
                        รายละเอียด
                    </label>
                    <input
                        type="text"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full px-4 py-2 border border-cafe-200 rounded-lg focus:ring-2 focus:ring-cafe-500 outline-none"
                        required
                    />
                </div>

                {/* Type */}
                <div>
                    <label className="block text-sm font-medium text-cafe-700 mb-1">
                        ประเภท
                    </label>
                    <select
                        value={type}
                        onChange={(e) => setType(e.target.value as 'INCOME' | 'EXPENSE' | 'TRANSFER')}
                        className="w-full px-4 py-2 border border-cafe-200 rounded-lg focus:ring-2 focus:ring-cafe-500 outline-none"
                    >
                        <option value="INCOME">รายรับ</option>
                        <option value="EXPENSE">รายจ่าย</option>
                        <option value="TRANSFER">โยกเงิน</option>
                    </select>
                </div>

                {/* Jar Selection */}
                {type === 'TRANSFER' ? (
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-sm font-medium text-cafe-700 mb-1">
                                จากกระเป๋า
                            </label>
                            <select
                                value={fromJar}
                                onChange={(e) => setFromJar(e.target.value as JarType)}
                                className="w-full px-4 py-2 border border-cafe-200 rounded-lg focus:ring-2 focus:ring-cafe-500 outline-none"
                            >
                                {jars.map(jar => (
                                    <option key={jar.id} value={jar.id}>{jar.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-cafe-700 mb-1">
                                ไปกระเป๋า
                            </label>
                            <select
                                value={toJar}
                                onChange={(e) => setToJar(e.target.value as JarType)}
                                className="w-full px-4 py-2 border border-cafe-200 rounded-lg focus:ring-2 focus:ring-cafe-500 outline-none"
                            >
                                {jars.map(jar => (
                                    <option key={jar.id} value={jar.id}>{jar.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                ) : (
                    <div>
                        <label className="block text-sm font-medium text-cafe-700 mb-1">
                            {type === 'INCOME' ? 'เข้ากระเป๋า' : 'ออกจากกระเป๋า'}
                        </label>
                        <select
                            value={toJar}
                            onChange={(e) => setToJar(e.target.value as JarType)}
                            className="w-full px-4 py-2 border border-cafe-200 rounded-lg focus:ring-2 focus:ring-cafe-500 outline-none"
                        >
                            {jars.map(jar => (
                                <option key={jar.id} value={jar.id}>{jar.name}</option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Date Display (Read-only) */}
                <div>
                    <label className="block text-sm font-medium text-cafe-700 mb-1 flex items-center gap-2">
                        <Calendar size={16} />
                        วันที่
                    </label>
                    <input
                        type="text"
                        value={new Date(transaction.date).toLocaleString('th-TH')}
                        disabled
                        className="w-full px-4 py-2 border border-cafe-200 rounded-lg bg-cafe-50 text-cafe-500"
                    />
                    <p className="text-xs text-cafe-500 mt-1">วันที่ไม่สามารถแก้ไขได้</p>
                </div>

                {/* Buttons */}
                <div className="flex gap-3 pt-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 bg-gray-200 text-cafe-800 py-3 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                    >
                        ยกเลิก
                    </button>
                    <button
                        type="submit"
                        className="flex-1 bg-cafe-600 text-white py-3 rounded-lg hover:bg-cafe-700 transition-colors font-bold"
                    >
                        บันทึกการแก้ไข
                    </button>
                </div>
            </form>
        </Modal>
    );
};
