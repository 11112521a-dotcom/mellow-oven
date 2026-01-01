import React from 'react';
import { Search, Filter, Target, Flame, Truck, LayoutList, LayoutGrid } from 'lucide-react';

interface Props {
    searchQuery: string;
    onSearchChange: (query: string) => void;
    viewMode: 'list' | 'grid';
    onViewModeChange: (mode: 'list' | 'grid') => void;
    onBulkTarget: () => void;
    onBulkProduce: () => void;
    onBulkSend: () => void;
}

export const QuickActions: React.FC<Props> = ({
    searchQuery, onSearchChange, viewMode, onViewModeChange,
    onBulkTarget, onBulkProduce, onBulkSend
}) => {
    return (
        <div className="sticky top-0 z-20 bg-cafe-50/95 backdrop-blur-sm py-2 mb-4 space-y-3">
            {/* Search & View Toggle */}
            <div className="flex gap-3">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="ค้นหาเมนู..."
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-cafe-400 focus:border-transparent shadow-sm"
                    />
                </div>
                <div className="flex bg-white rounded-xl border border-gray-200 p-1 shadow-sm">
                    <button
                        onClick={() => onViewModeChange('list')}
                        className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-cafe-100 text-cafe-800 shadow-sm' : 'text-gray-400 hover:bg-gray-50'}`}
                    >
                        <LayoutList size={20} />
                    </button>
                    <button
                        onClick={() => onViewModeChange('grid')}
                        className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-cafe-100 text-cafe-800 shadow-sm' : 'text-gray-400 hover:bg-gray-50'}`}
                    >
                        <LayoutGrid size={20} />
                    </button>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                <ActionButton
                    icon={<Target size={16} />}
                    label="ตั้งเป้าทั้งหมด"
                    onClick={onBulkTarget}
                    color="bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                />
                <ActionButton
                    icon={<Flame size={16} />}
                    label="ผลิตทั้งหมด"
                    onClick={onBulkProduce}
                    color="bg-blue-100 text-blue-700 hover:bg-blue-200"
                />
                <ActionButton
                    icon={<Truck size={16} />}
                    label="ส่งทั้งหมด"
                    onClick={onBulkSend}
                    color="bg-violet-100 text-violet-700 hover:bg-violet-200"
                />
            </div>
        </div>
    );
};

const ActionButton = ({ icon, label, onClick, color }: any) => (
    <button
        onClick={onClick}
        className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm whitespace-nowrap transition-colors ${color}`}
    >
        {icon}
        {label}
    </button>
);
