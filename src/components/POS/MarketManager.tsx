// ============================================================
// 🏪 Market Manager - Premium Redesign
// ============================================================
// Sales channel management with mini revenue stats per market
// ============================================================

import React, { useState, useMemo } from 'react';
import { useStore } from '@/src/store';
import { Market } from '@/types';
import {
    Plus, Edit2, Trash2, MapPin, Store, X, Check,
    AlertTriangle, TrendingUp, ShoppingBag, DollarSign, Search, BarChart3, Palette
} from 'lucide-react';
import { Modal } from '@/src/components/ui/Modal';

// ============================================================
// Market Card Component
// ============================================================

interface MarketCardProps {
    market: Market;
    stats: { revenue: number; orders: number; lastSaleDate: string | null };
    onEdit: (market: Market) => void;
    onDelete: (market: Market) => void;
}

const MarketCard: React.FC<MarketCardProps> = ({ market, stats, onEdit, onDelete }) => {
    const marketColor = market.color || '#b08968';

    return (
        <div
            className="group bg-white rounded-2xl border border-stone-200 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative"
        >
            {/* Color Bar Top */}
            <div
                className="h-2 w-full"
                style={{ background: `linear-gradient(90deg, ${marketColor}, ${marketColor}88)` }}
            />

            {/* Content */}
            <div className="p-5">
                {/* Header Row */}
                <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                        <div
                            className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-xl shadow-lg shrink-0"
                            style={{ background: `linear-gradient(135deg, ${marketColor}, ${marketColor}cc)` }}
                        >
                            🏪
                        </div>
                        <div>
                            <h4 className="font-bold text-lg text-stone-800 leading-tight">{market.name}</h4>
                            {market.location && (
                                <p className="text-xs text-stone-400 flex items-center gap-1 mt-0.5">
                                    <MapPin size={11} />
                                    {market.location}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Action Buttons - always visible on mobile, hover on desktop */}
                    <div className="flex gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                            onClick={() => onEdit(market)}
                            className="p-2 bg-stone-50 text-stone-500 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors"
                            title="แก้ไข"
                        >
                            <Edit2 size={15} />
                        </button>
                        <button
                            onClick={() => onDelete(market)}
                            className="p-2 bg-stone-50 text-stone-500 hover:bg-red-50 hover:text-red-500 rounded-lg transition-colors"
                            title="ลบ"
                        >
                            <Trash2 size={15} />
                        </button>
                    </div>
                </div>

                {/* Description */}
                {market.description && (
                    <p className="text-xs text-stone-500 bg-stone-50 rounded-lg px-3 py-2 mb-4 leading-relaxed">
                        {market.description}
                    </p>
                )}

                {/* Mini Stats Row */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="bg-stone-50 rounded-xl px-3 py-2.5">
                        <div className="flex items-center gap-1.5 mb-1">
                            <DollarSign size={12} className="text-emerald-500" />
                            <span className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider">รายได้รวม</span>
                        </div>
                        <p className="text-sm font-bold text-stone-800">
                            ฿{stats.revenue.toLocaleString('th-TH', { minimumFractionDigits: 0 })}
                        </p>
                    </div>
                    <div className="bg-stone-50 rounded-xl px-3 py-2.5">
                        <div className="flex items-center gap-1.5 mb-1">
                            <ShoppingBag size={12} className="text-blue-500" />
                            <span className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider">จำนวนวันขาย</span>
                        </div>
                        <p className="text-sm font-bold text-stone-800">
                            {stats.orders} วัน
                        </p>
                    </div>
                </div>

                {/* Last Sale */}
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-stone-100">
                    <div className="flex items-center gap-2">
                        <div
                            className="w-3 h-3 rounded-full shadow-inner"
                            style={{ backgroundColor: marketColor }}
                        />
                        <span className="text-[10px] text-stone-400">สีกราฟ</span>
                    </div>
                    {stats.lastSaleDate ? (
                        <span className="text-[10px] text-stone-400">
                            ขายล่าสุด: {new Date(stats.lastSaleDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}
                        </span>
                    ) : (
                        <span className="text-[10px] text-stone-300">ยังไม่เคยบันทึกขาย</span>
                    )}
                </div>
            </div>
        </div>
    );
};


// ============================================================
// Main MarketManager Component
// ============================================================

export const MarketManager: React.FC = () => {
    const { markets, addMarket, updateMarket, removeMarket, dailyReports } = useStore();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [marketToDelete, setMarketToDelete] = useState<Market | null>(null);
    const [editingMarket, setEditingMarket] = useState<Market | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [formData, setFormData] = useState<Partial<Market>>({
        name: '',
        location: '',
        description: '',
        color: '#b08968'
    });

    // ============================================================
    // Calculate stats per market from daily reports
    // ============================================================
    const marketStats = useMemo(() => {
        const statsMap = new Map<string, { revenue: number; orders: number; lastSaleDate: string | null }>();

        // Initialize all markets
        markets.forEach(m => {
            statsMap.set(m.id, { revenue: 0, orders: 0, lastSaleDate: null });
        });

        // Aggregate from daily reports
        dailyReports.forEach(report => {
            const existing = statsMap.get(report.marketId);
            if (existing) {
                existing.revenue += report.revenue || 0;
                existing.orders += 1;
                if (!existing.lastSaleDate || report.date > existing.lastSaleDate) {
                    existing.lastSaleDate = report.date;
                }
            }
        });

        return statsMap;
    }, [markets, dailyReports]);

    // Filter markets by search
    const filteredMarkets = useMemo(() => {
        if (!searchQuery.trim()) return markets;
        const q = searchQuery.toLowerCase();
        return markets.filter(m =>
            m.name.toLowerCase().includes(q) ||
            (m.location || '').toLowerCase().includes(q) ||
            (m.description || '').toLowerCase().includes(q)
        );
    }, [markets, searchQuery]);

    // Total revenue across all markets
    const totalRevenue = useMemo(() => {
        let sum = 0;
        marketStats.forEach(s => { sum += s.revenue; });
        return sum;
    }, [marketStats]);

    // ============================================================
    // Handlers
    // ============================================================

    const handleOpenAdd = () => {
        setEditingMarket(null);
        setFormData({ name: '', location: '', description: '', color: '#b08968' });
        setIsModalOpen(true);
    };

    const handleOpenEdit = (market: Market) => {
        setEditingMarket(market);
        setFormData(market);
        setIsModalOpen(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (formData.name) {
            if (editingMarket) {
                updateMarket(editingMarket.id, formData);
            } else {
                addMarket({
                    id: crypto.randomUUID(),
                    name: formData.name,
                    location: formData.location,
                    description: formData.description,
                    color: formData.color
                } as Market);
            }
            setIsModalOpen(false);
        }
    };

    const handleDeleteClick = (market: Market) => {
        setMarketToDelete(market);
        setIsDeleteModalOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (marketToDelete) {
            setIsDeleting(true);
            await removeMarket(marketToDelete.id);
            setIsDeleting(false);
            setIsDeleteModalOpen(false);
            setMarketToDelete(null);
        }
    };

    // Pastel color palette
    const colorOptions = [
        { color: '#C45A64', name: 'ชมพูอ่อน' },
        { color: '#C26B66', name: 'ชมพูพาสเทล' },
        { color: '#A94E54', name: 'โรสพาสเทล' },
        { color: '#9A4840', name: 'ชมพูเข้ม' },
        { color: '#C48B5E', name: 'พีชพาสเทล' },
        { color: '#C99658', name: 'ส้มอ่อน' },
        { color: '#C7A855', name: 'เหลืองอ่อน' },
        { color: '#C5A038', name: 'เลมอน' },
        { color: '#5BA675', name: 'เขียวมิ้นต์' },
        { color: '#3BA75E', name: 'เขียวพาสเทล' },
        { color: '#389F7D', name: 'เทอควอยซ์' },
        { color: '#3E9555', name: 'เขียวอ่อน' },
        { color: '#3E84AF', name: 'ฟ้าอ่อน' },
        { color: '#38759B', name: 'สกายบลู' },
        { color: '#3E8D9B', name: 'ฟ้าพาสเทล' },
        { color: '#1D70A8', name: 'เบบี้บลู' },
        { color: '#7E5596', name: 'ม่วงอ่อน' },
        { color: '#76498E', name: 'ลาเวนเดอร์' },
        { color: '#60307E', name: 'ม่วงพาสเทล' },
        { color: '#BE729B', name: 'ชมพูม่วง' },
        { color: '#7E5353', name: 'ดัสตี้โรส' },
        { color: '#736353', name: 'เบจ' },
        { color: '#3E6483', name: 'เกรย์บลู' },
        { color: '#7F6D59', name: 'แทนอ่อน' }
    ];

    return (
        <div className="min-h-full pb-20">
            {/* ======= HEADER ======= */}
            <header className="bg-white border-b border-stone-200 px-6 py-5 sticky top-0 z-40 shadow-sm">
                <div className="max-w-7xl mx-auto">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center text-white text-xl shadow-lg">
                                🏪
                            </div>
                            <div>
                                <h2 className="text-2xl font-black text-stone-800 flex items-center gap-2">
                                    จัดการตลาด
                                    <span className="text-xs bg-violet-100 text-violet-700 px-2.5 py-0.5 rounded-full font-bold">
                                        {markets.length} แห่ง
                                    </span>
                                </h2>
                                <p className="text-xs text-stone-400 mt-0.5">Markets • เพิ่ม แก้ไข ลบช่องทางขาย</p>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            {/* Search */}
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" size={16} />
                                <input
                                    type="text"
                                    placeholder="ค้นหาตลาด..."
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    className="pl-9 pr-4 py-2.5 bg-stone-100 border-transparent rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 w-full md:w-56 transition-all outline-none"
                                />
                            </div>
                            {/* Add Button */}
                            <button
                                onClick={handleOpenAdd}
                                className="flex items-center gap-2 bg-gradient-to-r from-violet-500 to-purple-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-violet-100 hover:shadow-xl hover:-translate-y-0.5 transition-all active:translate-y-0"
                            >
                                <Plus size={18} />
                                เพิ่มตลาดใหม่
                            </button>
                        </div>
                    </div>

                    {/* Summary Stats Bar */}
                    {markets.length > 0 && (
                        <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-stone-100">
                            <div className="flex items-center gap-2 bg-violet-50 px-4 py-2 rounded-xl">
                                <BarChart3 size={16} className="text-violet-500" />
                                <span className="text-xs text-violet-600 font-medium">รายได้ทุกตลาดรวม</span>
                                <span className="text-sm font-bold text-violet-800">
                                    ฿{totalRevenue.toLocaleString('th-TH', { minimumFractionDigits: 0 })}
                                </span>
                            </div>
                            <div className="flex items-center gap-2 bg-emerald-50 px-4 py-2 rounded-xl">
                                <TrendingUp size={16} className="text-emerald-500" />
                                <span className="text-xs text-emerald-600 font-medium">ค่าเฉลี่ยต่อตลาด</span>
                                <span className="text-sm font-bold text-emerald-800">
                                    ฿{markets.length > 0 ? (totalRevenue / markets.length).toLocaleString('th-TH', { minimumFractionDigits: 0 }) : 0}
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            </header>

            {/* ======= MAIN CONTENT ======= */}
            <main className="max-w-7xl mx-auto px-6 py-8">
                {filteredMarkets.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                        {filteredMarkets.map(market => (
                            <MarketCard
                                key={market.id}
                                market={market}
                                stats={marketStats.get(market.id) || { revenue: 0, orders: 0, lastSaleDate: null }}
                                onEdit={handleOpenEdit}
                                onDelete={handleDeleteClick}
                            />
                        ))}

                        {/* Add Card */}
                        <div
                            onClick={handleOpenAdd}
                            className="bg-white border-2 border-dashed border-stone-200 rounded-2xl flex flex-col items-center justify-center p-8 text-stone-400 hover:bg-violet-50 hover:text-violet-600 hover:border-violet-300 shadow-sm hover:shadow-md hover:-translate-y-1 cursor-pointer transition-all duration-200 group min-h-[220px]"
                        >
                            <div className="w-14 h-14 rounded-full bg-stone-50 group-hover:bg-white flex items-center justify-center mb-3 group-hover:shadow-sm transition-all">
                                <Plus size={28} />
                            </div>
                            <p className="text-sm font-bold">เพิ่มตลาดใหม่</p>
                            <p className="text-xs mt-1">กดเพื่อเพิ่มช่องทางขาย</p>
                        </div>
                    </div>
                ) : markets.length === 0 ? (
                    /* Empty State - No Markets */
                    <div className="text-center py-20">
                        <div className="w-24 h-24 bg-violet-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Store className="text-violet-400" size={48} />
                        </div>
                        <h3 className="text-xl font-bold text-stone-800 mb-2">ยังไม่มีตลาดในระบบ</h3>
                        <p className="text-stone-400 text-sm mb-6">เพิ่มช่องทางขายของคุณ เช่น หน้าร้าน, ตลาดนัด, ออนไลน์</p>
                        <button
                            onClick={handleOpenAdd}
                            className="inline-flex items-center gap-2 bg-gradient-to-r from-violet-500 to-purple-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all"
                        >
                            <Plus size={20} />
                            เพิ่มตลาดแรกของคุณ
                        </button>
                    </div>
                ) : (
                    /* Empty State - No Search Results */
                    <div className="text-center py-16 text-stone-400">
                        <Search size={48} className="mx-auto mb-4 opacity-40" />
                        <p className="text-lg font-bold">ไม่พบตลาดที่ค้นหา</p>
                        <p className="text-sm mt-1">ลองค้นหาด้วยคำอื่น</p>
                    </div>
                )}
            </main>

            {/* ======= ADD/EDIT MODAL ======= */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingMarket ? '✏️ แก้ไขตลาด' : '✨ เพิ่มตลาดใหม่'}>
                <form onSubmit={handleSubmit} className="space-y-5">
                    {/* Preview Banner */}
                    <div
                        className="rounded-xl p-4 flex items-center gap-3 border"
                        style={{
                            background: `linear-gradient(135deg, ${formData.color}15 0%, ${formData.color}05 100%)`,
                            borderColor: `${formData.color}30`
                        }}
                    >
                        <div
                            className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-lg shadow-md shrink-0"
                            style={{ backgroundColor: formData.color || '#b08968' }}
                        >
                            🏪
                        </div>
                        <div>
                            <p className="font-bold text-stone-800 text-sm">{formData.name || 'ชื่อตลาด...'}</p>
                            <p className="text-xs text-stone-400">{formData.location || 'สถานที่ตั้ง...'}</p>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-stone-500 uppercase tracking-wide mb-1.5 flex items-center gap-2">
                            <Store size={14} />
                            ชื่อตลาด <span className="text-red-500">*</span>
                        </label>
                        <input
                            required
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            className="w-full p-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none text-stone-800 font-medium"
                            placeholder="เช่น ตลาดนัดรถไฟ, ตลาดเช้า..."
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-stone-500 uppercase tracking-wide mb-1.5 flex items-center gap-2">
                            <MapPin size={14} />
                            สถานที่ตั้ง
                        </label>
                        <input
                            value={formData.location}
                            onChange={e => setFormData({ ...formData, location: e.target.value })}
                            className="w-full p-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none text-stone-800 font-medium"
                            placeholder="เช่น หลังห้างโลตัส, ถนนเจริญกรุง..."
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-stone-500 uppercase tracking-wide mb-1.5">รายละเอียดเพิ่มเติม</label>
                        <textarea
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                            className="w-full p-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none text-stone-800"
                            placeholder="เช่น ขายดีช่วงเย็น, เปิดเฉพาะวันเสาร์-อาทิตย์..."
                            rows={2}
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-stone-500 uppercase tracking-wide mb-2 flex items-center gap-2">
                            <Palette size={14} />
                            สีประจำตลาด (สำหรับกราฟ)
                        </label>
                        <div className="grid grid-cols-8 gap-2 p-3 bg-stone-50 rounded-xl">
                            {colorOptions.map(({ color, name }) => (
                                <button
                                    key={color}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, color })}
                                    className={`w-8 h-8 rounded-lg border-2 transition-all hover:scale-110 ${formData.color === color ? 'border-stone-800 scale-110 shadow-lg ring-2 ring-offset-1 ring-stone-400' : 'border-white/50'}`}
                                    style={{ backgroundColor: color }}
                                    title={name}
                                />
                            ))}
                        </div>
                        {formData.color && (
                            <p className="text-xs text-stone-400 mt-2 flex items-center gap-2">
                                <span className="w-4 h-4 rounded" style={{ backgroundColor: formData.color }}></span>
                                สีที่เลือก: {colorOptions.find(c => c.color === formData.color)?.name || formData.color}
                            </p>
                        )}
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={() => setIsModalOpen(false)}
                            className="flex-1 bg-stone-100 text-stone-700 py-3 rounded-xl hover:bg-stone-200 transition-colors font-bold"
                        >
                            ยกเลิก
                        </button>
                        <button
                            type="submit"
                            className="flex-1 bg-gradient-to-r from-violet-500 to-purple-600 text-white py-3 rounded-xl hover:shadow-lg transition-all font-bold flex items-center justify-center gap-2"
                        >
                            <Check size={18} />
                            บันทึก
                        </button>
                    </div>
                </form>
            </Modal>

            {/* ======= DELETE MODAL ======= */}
            <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="⚠️ ยืนยันการลบ">
                <div className="space-y-4">
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                        <div className="flex items-start gap-3">
                            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                                <AlertTriangle className="text-red-500" size={20} />
                            </div>
                            <div>
                                <p className="text-stone-800 font-medium mb-1">
                                    ต้องการลบตลาดนี้ใช่ไหม?
                                </p>
                                {marketToDelete && (
                                    <div className="bg-white rounded-lg p-3 mt-2 flex items-center gap-3">
                                        <div
                                            className="w-8 h-8 rounded-lg flex items-center justify-center text-white"
                                            style={{ backgroundColor: marketToDelete.color || '#ccc' }}
                                        >
                                            🏪
                                        </div>
                                        <div>
                                            <p className="font-bold text-stone-800">{marketToDelete.name}</p>
                                            {marketToDelete.location && (
                                                <p className="text-xs text-stone-500">{marketToDelete.location}</p>
                                            )}
                                        </div>
                                    </div>
                                )}
                                <p className="text-sm text-red-600 mt-3">
                                    ⚠️ ข้อมูลยอดขายเก่าจะยังคงอยู่ แต่จะไม่แสดงชื่อตลาด
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={() => setIsDeleteModalOpen(false)}
                            disabled={isDeleting}
                            className="flex-1 bg-stone-100 text-stone-800 py-3 rounded-xl hover:bg-stone-200 transition-colors font-bold flex items-center justify-center gap-2"
                        >
                            <X size={18} />
                            ยกเลิก
                        </button>
                        <button
                            onClick={handleConfirmDelete}
                            disabled={isDeleting}
                            className="flex-1 bg-red-500 text-white py-3 rounded-xl hover:bg-red-600 transition-colors font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {isDeleting ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    กำลังลบ...
                                </>
                            ) : (
                                <>
                                    <Trash2 size={18} />
                                    ยืนยันลบ
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default MarketManager;
