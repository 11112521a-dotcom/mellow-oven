import React from 'react';
import { Goal } from '@/types';
import { Edit2, Calendar, TrendingUp } from 'lucide-react';

interface GoalCardProps {
    goal: Goal;
    onEdit: () => void;
}

export const GoalCard: React.FC<GoalCardProps> = ({ goal, onEdit }) => {
    const progress = (goal.currentAmount / goal.targetAmount) * 100;
    const remaining = goal.targetAmount - goal.currentAmount;
    const isComplete = progress >= 100;

    // Calculate days until deadline
    let daysRemaining: number | null = null;
    if (goal.deadline) {
        const now = new Date();
        const deadline = new Date(goal.deadline);
        daysRemaining = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    }

    return (
        <div
            className={`relative border rounded-xl p-4 transition-all hover:shadow-md ${isComplete
                    ? 'bg-green-50 border-green-300'
                    : 'bg-white border-cafe-100'
                }`}
        >
            {/* Edit Button */}
            <button
                onClick={onEdit}
                className="absolute top-3 right-3 p-1.5 text-cafe-500 hover:bg-cafe-100 rounded-lg transition-colors"
                title="แก้ไข"
            >
                <Edit2 size={14} />
            </button>

            {/* Goal Header */}
            <div className="flex items-start gap-3 mb-3">
                <span className="text-3xl">{goal.icon}</span>
                <div className="flex-1">
                    <h4 className="font-bold text-cafe-800 pr-8">{goal.name}</h4>
                    {goal.deadline && (
                        <div className="flex items-center gap-1 text-xs text-cafe-500 mt-1">
                            <Calendar size={12} />
                            <span>
                                {new Date(goal.deadline).toLocaleDateString('th-TH', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric'
                                })}
                                {daysRemaining !== null && (
                                    <span className={`ml-1 ${daysRemaining < 30 ? 'text-orange-600 font-medium' : ''}`}>
                                        ({daysRemaining > 0 ? `อีก ${daysRemaining} วัน` : 'เลยกำหนดแล้ว'})
                                    </span>
                                )}
                            </span>
                        </div>
                    )}
                </div>
            </div>

            {/* Progress Bar */}
            <div className="mb-3">
                <div className="flex justify-between text-sm mb-1.5">
                    <span className="text-cafe-600 font-medium">
                        ฿{goal.currentAmount.toLocaleString()}
                    </span>
                    <span className={`font-bold ${isComplete ? 'text-green-600' : 'text-cafe-800'}`}>
                        {Math.min(100, progress).toFixed(0)}%
                    </span>
                </div>
                <div className="w-full bg-cafe-100 rounded-full h-2.5 overflow-hidden">
                    <div
                        className={`h-2.5 rounded-full transition-all duration-500 ${isComplete
                                ? 'bg-green-500'
                                : progress >= 75
                                    ? 'bg-yellow-500'
                                    : 'bg-cafe-600'
                            }`}
                        style={{ width: `${Math.min(100, progress)}%` }}
                    />
                </div>
                <div className="flex justify-between text-xs text-cafe-500 mt-1">
                    <span>เริ่ม</span>
                    <span>฿{goal.targetAmount.toLocaleString()}</span>
                </div>
            </div>

            {/* Stats */}
            <div className="flex items-center justify-between pt-3 border-t border-cafe-100">
                {isComplete ? (
                    <div className="flex items-center gap-1 text-green-600 text-sm font-medium">
                        🎉 บรรลุเป้าหมายแล้ว!
                    </div>
                ) : (
                    <>
                        <div className="text-sm text-cafe-600">
                            <span className="font-medium text-orange-600">
                                เหลืออีก ฿{remaining.toLocaleString()}
                            </span>
                        </div>
                        {progress > 0 && (
                            <div className="flex items-center gap-1 text-xs text-green-600">
                                <TrendingUp size={12} />
                                <span>{progress.toFixed(0)}%</span>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};
