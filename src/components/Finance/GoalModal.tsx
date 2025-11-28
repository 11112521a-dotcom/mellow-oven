import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Goal, JarType } from '@/types';
import { useStore } from '@/src/store';
import { Target, Trash2, Calendar } from 'lucide-react';

interface GoalModalProps {
    isOpen: boolean;
    onClose: () => void;
    jarId: JarType;
    editGoal?: Goal | null;
}

const ICON_OPTIONS = ['🎯', '🧊', '🏠', '💰', '🚗', '📱', '💻', '🎓', '✈️', '🎁', '🔧', '🛠️'];

export const GoalModal: React.FC<GoalModalProps> = ({ isOpen, onClose, jarId, editGoal }) => {
    const { addGoal, updateGoal, removeGoal, jars } = useStore();
    const jar = jars.find(j => j.id === jarId);

    const [name, setName] = useState('');
    const [targetAmount, setTargetAmount] = useState('');
    const [deadline, setDeadline] = useState('');
    const [icon, setIcon] = useState('🎯');
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    // Load edit data
    useEffect(() => {
        if (editGoal) {
            setName(editGoal.name);
            setTargetAmount(editGoal.targetAmount.toString());
            setDeadline(editGoal.deadline || '');
            setIcon(editGoal.icon);
        } else {
            setName('');
            setTargetAmount('');
            setDeadline('');
            setIcon('🎯');
        }
    }, [editGoal, isOpen]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!name || !targetAmount) return;

        if (editGoal) {
            // Update existing goal
            updateGoal(editGoal.id, {
                name,
                targetAmount: Number(targetAmount),
                deadline: deadline || undefined,
                icon
            });
        } else {
            // Create new goal
            const newGoal: Goal = {
                id: crypto.randomUUID(),
                jarId,
                name,
                targetAmount: Number(targetAmount),
                currentAmount: jar?.balance || 0,
                deadline: deadline || undefined,
                icon,
                createdAt: new Date().toISOString()
            };
            addGoal(newGoal);
        }

        handleClose();
    };

    const handleDelete = () => {
        if (editGoal) {
            removeGoal(editGoal.id);
            handleClose();
        }
    };

    const handleClose = () => {
        setShowDeleteConfirm(false);
        onClose();
    };

    const progress = editGoal ? (editGoal.currentAmount / editGoal.targetAmount) * 100 : 0;

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title={editGoal ? `แก้ไขเป้าหมาย ${editGoal.icon}` : '🎯 ตั้งเป้าหมายใหม่'}
        >
            {!showDeleteConfirm ? (
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Jar Display */}
                    <div className="bg-cafe-50 p-3 rounded-lg">
                        <p className="text-xs text-cafe-500 mb-1">กระเป๋า</p>
                        <p className="font-bold text-cafe-800">{jar?.name}</p>
                        <p className="text-sm text-cafe-600">ยอดปัจจุบัน: ฿{jar?.balance.toLocaleString()}</p>
                    </div>

                    {/* Progress (Edit mode only) */}
                    {editGoal && (
                        <div className="bg-green-50 p-3 rounded-lg">
                            <div className="flex justify-between text-sm mb-2">
                                <span className="text-green-800 font-medium">ความคืบหน้า</span>
                                <span className="text-green-600 font-bold">{progress.toFixed(0)}%</span>
                            </div>
                            <div className="w-full bg-green-200 rounded-full h-3">
                                <div
                                    className="bg-green-600 h-3 rounded-full transition-all"
                                    style={{ width: `${Math.min(100, progress)}%` }}
                                />
                            </div>
                            <div className="flex justify-between text-xs text-green-700 mt-1">
                                <span>฿{editGoal.currentAmount.toLocaleString()}</span>
                                <span>฿{editGoal.targetAmount.toLocaleString()}</span>
                            </div>
                        </div>
                    )}

                    {/* Icon Selection */}
                    <div>
                        <label className="block text-sm font-medium text-cafe-700 mb-2">ไอคอน</label>
                        <div className="flex flex-wrap gap-2">
                            {ICON_OPTIONS.map((ico) => (
                                <button
                                    key={ico}
                                    type="button"
                                    onClick={() => setIcon(ico)}
                                    className={`text-2xl p-2 rounded-lg transition-all ${icon === ico
                                            ? 'bg-cafe-600 ring-2 ring-cafe-400 scale-110'
                                            : 'bg-cafe-100 hover:bg-cafe-200'
                                        }`}
                                >
                                    {ico}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Name */}
                    <div>
                        <label className="block text-sm font-medium text-cafe-700 mb-1">
                            <Target size={14} className="inline mr-1" />
                            ชื่อเป้าหมาย
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full p-3 border border-cafe-200 rounded-lg focus:ring-2 focus:ring-cafe-500 outline-none"
                            placeholder="เช่น ตู้เย็นใหม่, เงินสำรอง 6 เดือน"
                            required
                        />
                    </div>

                    {/* Target Amount */}
                    <div>
                        <label className="block text-sm font-medium text-cafe-700 mb-1">จำนวนเงินเป้าหมาย</label>
                        <input
                            type="number"
                            value={targetAmount}
                            onChange={(e) => setTargetAmount(e.target.value)}
                            className="w-full p-3 border border-cafe-200 rounded-lg focus:ring-2 focus:ring-cafe-500 outline-none text-lg font-medium"
                            placeholder="20000"
                            min="0"
                            required
                        />
                        {targetAmount && (
                            <p className="text-xs text-cafe-500 mt-1">
                                เหลืออีก: ฿{(Number(targetAmount) - (editGoal?.currentAmount || jar?.balance || 0)).toLocaleString()}
                            </p>
                        )}
                    </div>

                    {/* Deadline (Optional) */}
                    <div>
                        <label className="block text-sm font-medium text-cafe-700 mb-1">
                            <Calendar size={14} className="inline mr-1" />
                            กำหนดเสร็จ (ถ้ามี)
                        </label>
                        <input
                            type="date"
                            value={deadline}
                            onChange={(e) => setDeadline(e.target.value)}
                            className="w-full p-3 border border-cafe-200 rounded-lg focus:ring-2 focus:ring-cafe-500 outline-none"
                        />
                    </div>

                    {/* Buttons */}
                    <div className="flex gap-3 pt-4">
                        {editGoal && (
                            <button
                                type="button"
                                onClick={() => setShowDeleteConfirm(true)}
                                className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                            >
                                <Trash2 size={16} />
                                ลบ
                            </button>
                        )}
                        <div className="flex-1 flex gap-3">
                            <button
                                type="button"
                                onClick={handleClose}
                                className="flex-1 bg-gray-200 text-cafe-800 py-3 rounded-lg hover:bg-gray-300 transition-colors"
                            >
                                ยกเลิก
                            </button>
                            <button
                                type="submit"
                                className="flex-1 bg-cafe-600 text-white py-3 rounded-lg hover:bg-cafe-700 transition-colors font-bold"
                            >
                                {editGoal ? 'บันทึกการแก้ไข' : 'สร้างเป้าหมาย'}
                            </button>
                        </div>
                    </div>
                </form>
            ) : (
                /* Delete Confirmation */
                <div className="space-y-4">
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <p className="text-cafe-800 font-medium mb-2">ยืนยันการลบเป้าหมาย?</p>
                        <div className="bg-white rounded-lg p-3">
                            <p className="font-bold text-cafe-800 text-lg">
                                {editGoal?.icon} {editGoal?.name}
                            </p>
                            <p className="text-sm text-cafe-600">
                                ความคืบหน้า: {progress.toFixed(0)}% (฿{editGoal?.currentAmount.toLocaleString()} / ฿{editGoal?.targetAmount.toLocaleString()})
                            </p>
                        </div>
                        <p className="text-sm text-red-600 mt-3">
                            ⚠️ การลบนี้ไม่สามารถย้อนกลับได้
                        </p>
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={() => setShowDeleteConfirm(false)}
                            className="flex-1 bg-gray-200 text-cafe-800 py-3 rounded-lg hover:bg-gray-300 transition-colors"
                        >
                            ยกเลิก
                        </button>
                        <button
                            onClick={handleDelete}
                            className="flex-1 bg-red-600 text-white py-3 rounded-lg hover:bg-red-700 transition-colors font-bold"
                        >
                            ยืนยันการลบ
                        </button>
                    </div>
                </div>
            )}
        </Modal>
    );
};
