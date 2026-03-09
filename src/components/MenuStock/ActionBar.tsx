import React, { useState } from 'react';
import { Search, Plus, ArrowRight, Settings, LayoutGrid, LayoutList, Truck } from 'lucide-react';

interface ActionBarProps {
    title?: string;
    searchQuery: string;
    onSearchChange: (query: string) => void;
    viewMode: 'grid' | 'list';
    onViewModeChange: (mode: 'grid' | 'list') => void;
    onBulkProduce: () => void;
    onBulkSend: (maxPerItem?: number) => void;
    onSetTarget: () => void;
}

export const ActionBar: React.FC<ActionBarProps> = ({
    title = "จัดการสินค้าคงคลัง",
    searchQuery,
    onSearchChange,
    viewMode,
    onViewModeChange,
    onBulkProduce,
    onBulkSend,
    onSetTarget
}) => {
    const [sendMaxInput, setSendMaxInput] = useState('');

    const handleBulkSend = () => {
        const max = parseInt(sendMaxInput);
        onBulkSend(max > 0 ? max : undefined);
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-4">
            {/* Top Row: Title + Search + View Toggle */}
            <div className="flex flex-col md:flex-row md:items-center gap-4">
                <h2 className="text-xl font-bold text-gray-800 shrink-0">{title}</h2>

                {/* Search */}
                <div className="flex-1 relative">
                    <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="ค้นหาสินค้า..."
                        value={searchQuery}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className="w-full pl-11 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-400 focus:border-transparent transition-all"
                    />
                </div>

                {/* View Toggle */}
                <div className="flex bg-gray-100 rounded-xl p-1 shrink-0">
                    <button
                        onClick={() => onViewModeChange('grid')}
                        className={`p-2.5 rounded-lg transition-all ${viewMode === 'grid'
                            ? 'bg-white shadow-sm text-amber-600'
                            : 'text-gray-400 hover:text-gray-600'
                            }`}
                    >
                        <LayoutGrid size={20} />
                    </button>
                    <button
                        onClick={() => onViewModeChange('list')}
                        className={`p-2.5 rounded-lg transition-all ${viewMode === 'list'
                            ? 'bg-white shadow-sm text-amber-600'
                            : 'text-gray-400 hover:text-gray-600'
                            }`}
                    >
                        <LayoutList size={20} />
                    </button>
                </div>
            </div>

            {/* Bottom Row: Action Buttons */}
            <div className="flex flex-wrap gap-3 items-center pb-1">
                <button
                    onClick={onBulkProduce}
                    className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-100 to-orange-100 text-amber-700 rounded-xl font-medium hover:from-amber-200 hover:to-orange-200 transition-all shadow-sm whitespace-nowrap"
                >
                    <Plus size={18} />
                    ผลิตทั้งหมด
                </button>

                {/* Send All with Max Per Item Input */}
                <div className="flex items-center gap-0 bg-gradient-to-r from-violet-100 to-purple-100 rounded-xl shadow-sm overflow-hidden border border-violet-200/50">
                    <button
                        onClick={handleBulkSend}
                        className="flex items-center gap-2 px-5 py-2.5 text-violet-700 font-medium hover:from-violet-200 hover:to-purple-200 transition-all whitespace-nowrap hover:bg-violet-200/50"
                    >
                        <Truck size={18} />
                        ส่งทั้งหมด
                    </button>
                    <div className="w-px h-7 bg-violet-200/70" />
                    <input
                        type="number"
                        value={sendMaxInput}
                        onChange={(e) => setSendMaxInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleBulkSend(); }}
                        placeholder="อย่างละ...ชิ้น"
                        className="w-28 px-3 py-2.5 bg-transparent text-violet-700 text-sm font-medium placeholder:text-violet-400/60 focus:outline-none focus:bg-violet-50/50 transition-colors"
                        min={1}
                    />
                </div>

                <button
                    onClick={onSetTarget}
                    className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-100 to-green-100 text-emerald-700 rounded-xl font-medium hover:from-emerald-200 hover:to-green-200 transition-all shadow-sm whitespace-nowrap"
                >
                    <Settings size={18} />
                    ตั้งเป้าหมาย
                </button>
            </div>
        </div>
    );
};
