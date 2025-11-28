import React, { useState } from 'react';
import { useStore } from '@/src/store';
import { WalletCard } from '@/src/components/Finance/WalletCard';
import { TransactionTable } from '@/src/components/Finance/TransactionTable';
import { QuickActionsBar } from '@/src/components/Finance/QuickActionsBar';
import { Modal } from '@/src/components/ui/Modal';
import { JarType } from '@/types';
import { Plus, ArrowRightLeft } from 'lucide-react';

const Financials: React.FC = () => {
    const { jars, transactions, updateJarBalance, transferFunds } = useStore();

    const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedJar, setSelectedJar] = useState<JarType | null>(null);

    // Form States
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');
    const [targetJar, setTargetJar] = useState<JarType>('Working');

    const handleTransferClick = (jarId: JarType) => {
        setSelectedJar(jarId);
        setTargetJar(jarId === 'Working' ? 'CapEx' : 'Working'); // Default target
        setAmount('');
        setDescription('');
        setIsTransferModalOpen(true);
    };

    const handleEditClick = (jarId: JarType) => {
        setSelectedJar(jarId);
        setAmount('');
        setIsEditModalOpen(true);
    };

    const submitTransfer = (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedJar && amount) {
            transferFunds(selectedJar, targetJar, Number(amount), description || 'Transfer');
            setIsTransferModalOpen(false);
        }
    };

    const submitEdit = (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedJar && amount) {
            const amountNum = Number(amount);
            const jarName = jars.find(j => j.id === selectedJar)?.name || selectedJar;

            // Update balance
            updateJarBalance(selectedJar, amountNum);

            // Add transaction log
            const { addTransaction } = useStore.getState();
            addTransaction({
                id: crypto.randomUUID(),
                date: new Date().toISOString(),
                amount: Math.abs(amountNum),
                type: amountNum > 0 ? 'INCOME' : 'EXPENSE',
                toJar: amountNum > 0 ? selectedJar : undefined,
                fromJar: amountNum < 0 ? selectedJar : undefined,
                description: `${amountNum > 0 ? 'เพิ่ม' : 'ลด'}เงินใน ${jarName} (Manual Edit)`,
                category: 'Manual Adjustment'
            });

            setIsEditModalOpen(false);
        }
    };

    const totalBalance = jars.reduce((acc, jar) => acc + jar.balance, 0);

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header Stats */}
            <div className="bg-cafe-800 text-white p-8 rounded-3xl shadow-lg relative overflow-hidden">
                <div className="relative z-10">
                    <p className="text-cafe-200 mb-2">เงินสดรวมทุกกระเป๋า</p>
                    <h1 className="text-5xl font-bold mb-4">฿{totalBalance.toLocaleString()}</h1>
                    <div className="flex gap-4">
                        <div className="bg-white/10 px-4 py-2 rounded-lg backdrop-blur-sm">
                            <p className="text-xs text-cafe-200">รายรับวันนี้</p>
                            <p className="font-semibold text-lg">+฿0</p>
                        </div>
                        <div className="bg-white/10 px-4 py-2 rounded-lg backdrop-blur-sm">
                            <p className="text-xs text-cafe-200">รายจ่ายวันนี้</p>
                            <p className="font-semibold text-lg">-฿0</p>
                        </div>
                    </div>
                </div>
                <div className="absolute right-0 bottom-0 opacity-10">
                    <ArrowRightLeft size={200} />
                </div>
            </div>

            {/* Quick Actions Bar */}
            <QuickActionsBar />

            {/* Wallets Grid */}
            <div>
                <h2 className="text-xl font-bold text-cafe-800 mb-4 flex items-center gap-2">
                    <span className="w-2 h-8 bg-cafe-600 rounded-full"></span>
                    กระเป๋าเงิน (5 Jars)
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {jars.map((jar) => (
                        <WalletCard
                            key={jar.id}
                            jar={jar}
                            onTransfer={handleTransferClick}
                            onEdit={handleEditClick}
                        />
                    ))}
                </div>
            </div>

            {/* Transactions */}
            <TransactionTable transactions={transactions} />

            {/* Transfer Modal */}
            <Modal
                isOpen={isTransferModalOpen}
                onClose={() => setIsTransferModalOpen(false)}
                title="โยกย้ายเงิน"
            >
                <form onSubmit={submitTransfer} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-cafe-700 mb-1">จากกระเป๋า</label>
                        <div className="p-3 bg-cafe-100 rounded-lg text-cafe-800 font-medium">
                            {jars.find(j => j.id === selectedJar)?.name}
                        </div>
                    </div>

                    <div className="flex justify-center text-cafe-400">
                        <ArrowRightLeft size={24} />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-cafe-700 mb-1">ไปยังกระเป๋า</label>
                        <select
                            value={targetJar}
                            onChange={(e) => setTargetJar(e.target.value as JarType)}
                            className="w-full p-3 border border-cafe-200 rounded-lg focus:ring-2 focus:ring-cafe-500 outline-none"
                        >
                            {jars.filter(j => j.id !== selectedJar).map(jar => (
                                <option key={jar.id} value={jar.id}>{jar.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-cafe-700 mb-1">จำนวนเงิน</label>
                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="w-full p-3 border border-cafe-200 rounded-lg focus:ring-2 focus:ring-cafe-500 outline-none text-lg font-medium"
                            placeholder="0.00"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-cafe-700 mb-1">บันทึกช่วยจำ</label>
                        <input
                            type="text"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full p-3 border border-cafe-200 rounded-lg focus:ring-2 focus:ring-cafe-500 outline-none"
                            placeholder="ค่าอะไร..."
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-cafe-600 text-white py-3 rounded-xl font-bold hover:bg-cafe-700 transition-colors shadow-lg shadow-cafe-200"
                    >
                        ยืนยันการโอน
                    </button>
                </form>
            </Modal>

            {/* Edit Balance Modal */}
            <Modal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                title="แก้ไขยอดเงิน (Manual Adjustment)"
            >
                <form onSubmit={submitEdit} className="space-y-4">
                    <div className="p-4 bg-yellow-50 text-yellow-800 rounded-lg text-sm mb-4">
                        การแก้ไขยอดเงินโดยตรงควรใช้เมื่อจำเป็นเท่านั้น ระบบจะไม่ได้บันทึกเป็นรายรับ/รายจ่ายปกติ
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-cafe-700 mb-1">กระเป๋า</label>
                        <div className="p-3 bg-cafe-100 rounded-lg text-cafe-800 font-medium">
                            {jars.find(j => j.id === selectedJar)?.name}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-cafe-700 mb-1">ยอดเงินที่ต้องการเพิ่ม/ลด (+/-)</label>
                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="w-full p-3 border border-cafe-200 rounded-lg focus:ring-2 focus:ring-cafe-500 outline-none text-lg font-medium"
                            placeholder="เช่น 500 หรือ -200"
                            required
                        />
                        <p className="text-xs text-cafe-400 mt-1">ใส่เครื่องหมายลบ (-) เพื่อลดยอดเงิน</p>
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-cafe-600 text-white py-3 rounded-xl font-bold hover:bg-cafe-700 transition-colors shadow-lg shadow-cafe-200"
                    >
                        บันทึกยอดเงิน
                    </button>
                </form>
            </Modal>
        </div>
    );
};

export default Financials;
