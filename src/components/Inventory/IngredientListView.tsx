import React, { useState, useMemo } from 'react';
import { Ingredient, StockLog } from '@/types';
import { useStore } from '@/src/store';
import { Search, Plus, SlidersHorizontal, Grid3X3, List, AlertTriangle, Package, ChevronDown, ChevronUp } from 'lucide-react';
import { IngredientCard } from './IngredientCard';
import { StockAdjustmentSheet } from './StockAdjustmentSheet';
import { AddIngredientSheet } from './AddIngredientSheet';

const CATEGORIES = ['ทั้งหมด', 'แป้ง', 'น้ำตาล', 'นม', 'ผลไม้', 'เครื่องปรุง', 'บรรจุภัณฑ์', 'อื่นๆ'];

type SortBy = 'name' | 'stock' | 'cost' | 'updated';
type ViewMode = 'grid' | 'list';
type FilterStatus = 'all' | 'low' | 'out';

export const IngredientListView: React.FC = () => {
    const { ingredients, updateStock, addIngredient, updateIngredient, removeIngredient } = useStore();

    // UI state
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('ทั้งหมด');
    const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
    const [sortBy, setSortBy] = useState<SortBy>('name');
    const [viewMode, setViewMode] = useState<ViewMode>('grid');
    const [showFilters, setShowFilters] = useState(false);

    // Sheet state
    const [adjustTarget, setAdjustTarget] = useState<Ingredient | null>(null);
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [editTarget, setEditTarget] = useState<Ingredient | null>(null);

    // Counts
    const lowCount = ingredients.filter(i => i.currentStock <= (i.minStock || 10) && i.currentStock > 0).length;
    const outCount = ingredients.filter(i => i.currentStock === 0).length;

    // Filter + Sort
    const filteredIngredients = useMemo(() => {
        let result = [...ingredients];

        // Search
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            result = result.filter(i =>
                i.name.toLowerCase().includes(term) ||
                i.supplier.toLowerCase().includes(term) ||
                (i.category || '').toLowerCase().includes(term)
            );
        }

        // Category
        if (selectedCategory !== 'ทั้งหมด') {
            result = result.filter(i => (i.category || 'อื่นๆ') === selectedCategory);
        }

        // Status
        if (filterStatus === 'low') {
            result = result.filter(i => i.currentStock <= (i.minStock || 10) && i.currentStock > 0);
        } else if (filterStatus === 'out') {
            result = result.filter(i => i.currentStock === 0);
        }

        // Sort
        result.sort((a, b) => {
            switch (sortBy) {
                case 'name': return a.name.localeCompare(b.name, 'th');
                case 'stock': return a.currentStock - b.currentStock;
                case 'cost': return b.costPerUnit - a.costPerUnit;
                case 'updated': return new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime();
                default: return 0;
            }
        });

        return result;
    }, [ingredients, searchTerm, selectedCategory, filterStatus, sortBy]);

    // Group by category for display
    const groupedIngredients = useMemo(() => {
        if (selectedCategory !== 'ทั้งหมด') return null; // No grouping when category is selected

        const groups: Record<string, Ingredient[]> = {};
        filteredIngredients.forEach(ing => {
            const cat = ing.category || 'อื่นๆ';
            if (!groups[cat]) groups[cat] = [];
            groups[cat].push(ing);
        });
        return groups;
    }, [filteredIngredients, selectedCategory]);

    const handleStockAdjust = async (id: string, quantity: number, reason: StockLog['reason'], note: string) => {
        await updateStock(id, quantity, reason, note);
    };

    const handleSubmitIngredient = async (data: Partial<Ingredient>) => {
        if (data.id) {
            // Edit mode
            const { id, ...updates } = data;
            await updateIngredient(id, updates);
        } else {
            // Add mode
            await addIngredient({
                id: crypto.randomUUID(),
                name: data.name || '',
                unit: data.unit || 'กก.',
                currentStock: data.currentStock || 0,
                costPerUnit: data.costPerUnit || 0,
                supplier: data.supplier || '',
                lastUpdated: new Date().toISOString(),
                buyUnit: data.buyUnit,
                conversionRate: data.conversionRate,
                minStock: data.minStock || 10,
                category: data.category || 'อื่นๆ',
            } as Ingredient);
        }
    };

    const renderCards = (items: Ingredient[]) => (
        <div className={viewMode === 'grid'
            ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4'
            : 'space-y-3'
        }>
            {items.map(ing => (
                <IngredientCard
                    key={ing.id}
                    ingredient={ing}
                    onAdjustStock={setAdjustTarget}
                    onEdit={(ing) => { setEditTarget(ing); setIsAddOpen(true); }}
                    onDelete={(ing) => {
                        if (confirm(`ลบ "${ing.name}" จริงหรือไม่?`)) {
                            removeIngredient(ing.id);
                        }
                    }}
                />
            ))}
        </div>
    );

    return (
        <div className="space-y-4">
            {/* Top bar: Search + Add */}
            <div className="flex gap-3">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        placeholder="ค้นหาวัตถุดิบ..."
                        className="w-full pl-10 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-sm outline-none focus:border-amber-500 transition-colors"
                    />
                </div>
                <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`p-3 rounded-xl border transition-all ${showFilters ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-stone-600 border-stone-200 hover:border-stone-300'
                        }`}
                >
                    <SlidersHorizontal size={18} />
                </button>
                <button
                    onClick={() => { setEditTarget(null); setIsAddOpen(true); }}
                    className="px-5 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold rounded-xl shadow-md shadow-amber-200 hover:shadow-lg transition-all flex items-center gap-2 text-sm"
                >
                    <Plus size={18} /> เพิ่ม
                </button>
            </div>

            {/* Filters panel */}
            {showFilters && (
                <div className="bg-white border border-stone-200 rounded-2xl p-4 space-y-4 animate-in slide-in-from-top-2 duration-200">
                    {/* Status filter */}
                    <div className="flex gap-2">
                        <button
                            onClick={() => setFilterStatus('all')}
                            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${filterStatus === 'all' ? 'bg-stone-800 text-white' : 'bg-stone-100 text-stone-600'
                                }`}
                        >
                            ทั้งหมด ({ingredients.length})
                        </button>
                        <button
                            onClick={() => setFilterStatus('low')}
                            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${filterStatus === 'low' ? 'bg-amber-500 text-white' : 'bg-amber-50 text-amber-700'
                                }`}
                        >
                            <AlertTriangle size={12} /> ใกล้หมด ({lowCount})
                        </button>
                        <button
                            onClick={() => setFilterStatus('out')}
                            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${filterStatus === 'out' ? 'bg-red-500 text-white' : 'bg-red-50 text-red-700'
                                }`}
                        >
                            หมด ({outCount})
                        </button>
                    </div>

                    {/* Category chips */}
                    <div className="flex flex-wrap gap-2">
                        {CATEGORIES.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${selectedCategory === cat
                                        ? 'bg-amber-500 text-white shadow-sm'
                                        : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                                    }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>

                    {/* Sort + View mode */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-stone-400">เรียงตาม:</span>
                            <select
                                value={sortBy}
                                onChange={e => setSortBy(e.target.value as SortBy)}
                                className="text-xs bg-stone-50 border border-stone-200 rounded-lg px-2 py-1.5 outline-none"
                            >
                                <option value="name">ชื่อ</option>
                                <option value="stock">จำนวน (น้อย→มาก)</option>
                                <option value="cost">ต้นทุน (มาก→น้อย)</option>
                                <option value="updated">อัพเดทล่าสุด</option>
                            </select>
                        </div>
                        <div className="flex bg-stone-100 rounded-lg p-0.5">
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-stone-800' : 'text-stone-400'}`}
                            >
                                <Grid3X3 size={16} />
                            </button>
                            <button
                                onClick={() => setViewMode('list')}
                                className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-stone-800' : 'text-stone-400'}`}
                            >
                                <List size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Results count */}
            <div className="flex items-center justify-between text-xs text-stone-400">
                <span>แสดง {filteredIngredients.length} รายการ</span>
            </div>

            {/* Content */}
            {filteredIngredients.length === 0 ? (
                <div className="text-center py-16">
                    <Package size={48} className="mx-auto text-stone-300 mb-4" />
                    <p className="text-stone-500 font-medium">ไม่พบวัตถุดิบ</p>
                    <p className="text-sm text-stone-400 mt-1">ลองเปลี่ยนตัวกรองหรือเพิ่มวัตถุดิบใหม่</p>
                </div>
            ) : groupedIngredients && selectedCategory === 'ทั้งหมด' && filterStatus === 'all' ? (
                // Grouped view
                <div className="space-y-6">
                    {Object.entries(groupedIngredients).map(([cat, items]) => (
                        <div key={cat}>
                            <div className="flex items-center gap-2 mb-3">
                                <h3 className="text-sm font-bold text-stone-700">{cat}</h3>
                                <span className="text-[10px] bg-stone-100 text-stone-500 px-2 py-0.5 rounded-full font-medium">
                                    {items.length}
                                </span>
                                <div className="flex-1 h-px bg-stone-100" />
                            </div>
                            {renderCards(items)}
                        </div>
                    ))}
                </div>
            ) : (
                // Flat view
                renderCards(filteredIngredients)
            )}

            {/* Stock Adjustment Sheet */}
            <StockAdjustmentSheet
                ingredient={adjustTarget}
                isOpen={!!adjustTarget}
                onClose={() => setAdjustTarget(null)}
                onSubmit={handleStockAdjust}
            />

            {/* Add/Edit Ingredient Sheet */}
            <AddIngredientSheet
                isOpen={isAddOpen}
                editingIngredient={editTarget}
                onClose={() => { setIsAddOpen(false); setEditTarget(null); }}
                onSubmit={handleSubmitIngredient}
                onDelete={(id) => {
                    if (confirm('ลบวัตถุดิบนี้จริงหรือไม่?')) {
                        removeIngredient(id);
                    }
                }}
            />
        </div>
    );
};

export default IngredientListView;
