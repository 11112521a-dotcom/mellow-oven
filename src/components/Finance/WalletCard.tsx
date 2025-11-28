import React, { useState } from 'react';
import { ArrowRightLeft, Edit2, Target, Plus } from 'lucide-react';
import { Jar, JarType } from '@/types';
import { formatCurrency } from '@/src/lib/utils';
import { useStore } from '@/src/store';
import { GoalCard } from './GoalCard';
import { GoalModal } from './GoalModal';

interface WalletCardProps {
    jar: Jar;
    onTransfer: (jar: JarType) => void;
    onEdit: (jar: JarType) => void;
}

export const WalletCard: React.FC<WalletCardProps> = ({ jar, onTransfer, onEdit }) => {
    const { id, name, balance, allocationPercent, description } = jar;
    const { goals } = useStore();
    const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
    const [editingGoal, setEditingGoal] = useState<any>(null);

    const jarGoals = goals.filter(g => g.jarId === id);

    const getIconColor = (id: JarType) => {
        switch (id) {
            case 'Working': return 'bg-blue-100 text-blue-600';
            case 'CapEx': return 'bg-purple-100 text-purple-600';
            case 'Opex': return 'bg-orange-100 text-orange-600';
            case 'Emergency': return 'bg-red-100 text-red-600';
            case 'Owner': return 'bg-green-100 text-green-600';
            default: return 'bg-gray-100 text-gray-600';
        }
    };

    const handleAddGoal = () => {
        setEditingGoal(null);
        setIsGoalModalOpen(true);
    };

    const handleEditGoal = (goal: any) => {
        setEditingGoal(goal);
        setIsGoalModalOpen(true);
    };

    return (
        <>
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-cafe-100 hover:shadow-md transition-shadow relative overflow-hidden group">
                <div className={`absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 rounded-full opacity-20 ${getIconColor(id).split(' ')[0]}`} />

                <div className="relative z-10">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h3 className="text-lg font-bold text-cafe-800">{name}</h3>
                            <p className="text-xs text-cafe-500">{description}</p>
                        </div>
                        <div className={`px-2 py-1 rounded text-xs font-medium ${getIconColor(id)}`}>
                            {(allocationPercent * 100).toFixed(0)}%
                        </div>
                    </div>

                    <div className="mb-6">
                        <span className="text-3xl font-bold text-cafe-900">{formatCurrency(balance)}</span>
                    </div>

                    {/* Goals Section */}
                    {jarGoals.length > 0 && (
                        <div className="mb-4 space-y-2">
                            <div className="flex items-center gap-2 text-xs font-medium text-cafe-600 mb-2">
                                <Target size={14} />
                                เป้าหมาย ({jarGoals.length})
                            </div>
                            {jarGoals.map((goal) => (
                                <GoalCard
                                    key={goal.id}
                                    goal={goal}
                                    onEdit={() => handleEditGoal(goal)}
                                />
                            ))}
                        </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                            onClick={() => onTransfer(id)}
                            className="flex-1 flex items-center justify-center gap-2 bg-cafe-600 text-white py-2 rounded-lg text-sm hover:bg-cafe-700 transition-colors"
                        >
                            <ArrowRightLeft size={16} /> โยกเงิน
                        </button>
                        <button
                            onClick={handleAddGoal}
                            className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition-colors"
                            title="เพิ่มเป้าหมาย"
                        >
                            <Plus size={16} />
                        </button>
                        <button
                            onClick={() => onEdit(id)}
                            className="p-2 bg-cafe-100 text-cafe-600 rounded-lg hover:bg-cafe-200 transition-colors"
                        >
                            <Edit2 size={16} />
                        </button>
                    </div>
                </div>
            </div>

            <GoalModal
                isOpen={isGoalModalOpen}
                onClose={() => setIsGoalModalOpen(false)}
                jarId={id}
                editGoal={editingGoal}
            />
        </>
    );
};
