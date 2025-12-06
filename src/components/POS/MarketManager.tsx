import React, { useState } from 'react';
import { useStore } from '@/src/store';
import { Market } from '@/types';
import { Plus, Edit2, Trash2, MapPin, Store, X, Check, AlertTriangle } from 'lucide-react';
import { Modal } from '@/src/components/ui/Modal';

export const MarketManager: React.FC = () => {
    const { markets, addMarket, updateMarket, removeMarket } = useStore();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [marketToDelete, setMarketToDelete] = useState<Market | null>(null);
    const [editingMarket, setEditingMarket] = useState<Market | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [formData, setFormData] = useState<Partial<Market>>({
        name: '',
        location: '',
        description: '',
        color: '#b08968'
    });

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


    // Pastel color palette - rich saturation (darkened +40%)
    const colorOptions = [
        // Row 1 - Pinks & Reds
        { color: '#C45A64', name: 'ชมพูอ่อน' },
        { color: '#C26B66', name: 'ชมพูพาสเทล' },
        { color: '#A94E54', name: 'โรสพาสเทล' },
        { color: '#9A4840', name: 'ชมพูเข้ม' },
        // Row 2 - Oranges & Yellows
        { color: '#C48B5E', name: 'พีชพาสเทล' },
        { color: '#C99658', name: 'ส้มอ่อน' },
        { color: '#C7A855', name: 'เหลืองอ่อน' },
        { color: '#C5A038', name: 'เลมอน' },
        // Row 3 - Greens
        { color: '#5BA675', name: 'เขียวมิ้นต์' },
        { color: '#3BA75E', name: 'เขียวพาสเทล' },
        { color: '#389F7D', name: 'เทอควอยซ์' },
        { color: '#3E9555', name: 'เขียวอ่อน' },
        // Row 4 - Blues
        { color: '#3E84AF', name: 'ฟ้าอ่อน' },
        { color: '#38759B', name: 'สกายบลู' },
        { color: '#3E8D9B', name: 'ฟ้าพาสเทล' },
        { color: '#1D70A8', name: 'เบบี้บลู' },
        // Row 5 - Purples & Lavenders
        { color: '#7E5596', name: 'ม่วงอ่อน' },
        { color: '#76498E', name: 'ลาเวนเดอร์' },
        { color: '#60307E', name: 'ม่วงพาสเทล' },
        { color: '#BE729B', name: 'ชมพูม่วง' },
        // Row 6 - Neutrals
        { color: '#7E5353', name: 'ดัสตี้โรส' },
        { color: '#736353', name: 'เบจ' },
        { color: '#3E6483', name: 'เกรย์บลู' },
        { color: '#7F6D59', name: 'แทนอ่อน' }
    ];

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-cafe-100 overflow-hidden">
            {/* Premium Header */}
            <div className="bg-gradient-to-r from-violet-100 via-purple-50 to-fuchsia-50 p-6 border-b border-violet-100">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center text-white shadow-lg">
                            🏪
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-violet-900 flex items-center gap-2">
                                จัดการตลาด
                                <span className="text-xs bg-violet-600 text-white px-2 py-0.5 rounded-full font-medium">
                                    {markets.length} แห่ง
                                </span>
                            </h3>
                            <p className="text-sm text-violet-600">Markets • เพิ่ม แก้ไข ลบช่องทางขาย</p>
                        </div>
                    </div>
                    <button
                        onClick={handleOpenAdd}
                        className="flex items-center gap-2 bg-gradient-to-r from-violet-500 to-purple-600 text-white px-5 py-3 rounded-xl hover:shadow-xl hover:scale-105 transition-all duration-200 font-medium"
                    >
                        <Plus size={20} />
                        <span>เพิ่มตลาดใหม่</span>
                    </button>
                </div>
            </div>

            {/* Body */}
            <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {markets.map(market => (
                        <div
                            key={market.id}
                            className="group bg-white rounded-2xl border-2 border-cafe-100 overflow-hidden hover:shadow-xl hover:scale-[1.02] transition-all duration-300"
                            style={{ borderLeftColor: market.color || '#ccc', borderLeftWidth: '4px' }}
                        >
                            {/* Card Header with Color */}
                            <div
                                className="p-4 relative"
                                style={{
                                    background: `linear-gradient(135deg, ${market.color}15 0%, ${market.color}05 100%)`
                                }}
                            >
                                {/* Floating Action Buttons */}
                                <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                    <button
                                        onClick={() => handleOpenEdit(market)}
                                        className="p-2 bg-white/90 backdrop-blur text-blue-600 hover:bg-blue-500 hover:text-white rounded-lg transition-all shadow-sm"
                                        title="แก้ไข"
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                    <button
                                        onClick={() => handleDeleteClick(market)}
                                        className="p-2 bg-white/90 backdrop-blur text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition-all shadow-sm"
                                        title="ลบตลาด"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>

                                {/* Market Icon */}
                                <div
                                    className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-xl shadow-lg group-hover:scale-110 transition-transform duration-300"
                                    style={{ background: `linear-gradient(135deg, ${market.color} 0%, ${market.color}cc 100%)` }}
                                >
                                    🏪
                                </div>
                            </div>

                            {/* Card Body */}
                            <div className="p-4 space-y-2">
                                <h4 className="font-bold text-lg text-cafe-800 group-hover:text-violet-600 transition-colors">
                                    {market.name}
                                </h4>

                                {market.location && (
                                    <p className="text-sm text-cafe-500 flex items-center gap-1.5">
                                        <MapPin size={14} className="text-violet-400" />
                                        {market.location}
                                    </p>
                                )}

                                {market.description && (
                                    <p className="text-xs text-cafe-400 bg-cafe-50 rounded-lg p-2">
                                        {market.description}
                                    </p>
                                )}

                                {/* Color indicator */}
                                <div className="flex items-center gap-2 pt-2 border-t border-dashed border-cafe-100">
                                    <div
                                        className="w-4 h-4 rounded-full shadow-inner"
                                        style={{ backgroundColor: market.color || '#ccc' }}
                                    ></div>
                                    <span className="text-xs text-cafe-400">สีประจำตลาด (สำหรับกราฟ)</span>
                                </div>
                            </div>
                        </div>
                    ))}

                    {/* Empty State */}
                    {markets.length === 0 && (
                        <div className="col-span-full bg-violet-50 rounded-2xl p-8 text-center border-2 border-dashed border-violet-200">
                            <div className="w-16 h-16 bg-violet-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Store className="text-violet-400" size={32} />
                            </div>
                            <p className="text-violet-600 font-medium mb-2">ยังไม่มีตลาดในระบบ</p>
                            <p className="text-violet-400 text-sm">กดปุ่ม "เพิ่มตลาดใหม่" เพื่อเริ่มต้น</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Add/Edit Modal */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingMarket ? '✏️ แก้ไขตลาด' : '✨ เพิ่มตลาดใหม่'}>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-cafe-700 mb-1 flex items-center gap-2">
                            <Store size={16} />
                            ชื่อตลาด *
                        </label>
                        <input
                            required
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            className="w-full p-3 border border-cafe-200 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none"
                            placeholder="เช่น ตลาดนัดรถไฟ, ตลาดเช้า..."
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-cafe-700 mb-1 flex items-center gap-2">
                            <MapPin size={16} />
                            สถานที่ตั้ง
                        </label>
                        <input
                            value={formData.location}
                            onChange={e => setFormData({ ...formData, location: e.target.value })}
                            className="w-full p-3 border border-cafe-200 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none"
                            placeholder="เช่น หลังห้างโลตัส, ถนนเจริญกรุง..."
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-cafe-700 mb-1">รายละเอียดเพิ่มเติม</label>
                        <textarea
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                            className="w-full p-3 border border-cafe-200 rounded-xl focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none"
                            placeholder="เช่น ขายดีช่วงเย็น, ห้ามใช้โฟม, เปิดเฉพาะวันเสาร์-อาทิตย์..."
                            rows={3}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-cafe-700 mb-2">🎨 สีประจำตลาด (สำหรับกราฟ)</label>
                        <div className="grid grid-cols-6 gap-2 p-3 bg-cafe-50 rounded-xl">
                            {colorOptions.map(({ color, name }) => (
                                <button
                                    key={color}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, color })}
                                    className={`w-9 h-9 rounded-lg border-2 transition-all hover:scale-110 ${formData.color === color ? 'border-cafe-800 scale-110 shadow-lg ring-2 ring-offset-1 ring-cafe-400' : 'border-white/50'}`}
                                    style={{ backgroundColor: color }}
                                    title={name}
                                />
                            ))}
                        </div>
                        {formData.color && (
                            <p className="text-xs text-cafe-500 mt-2 flex items-center gap-2">
                                <span className="w-4 h-4 rounded" style={{ backgroundColor: formData.color }}></span>
                                สีที่เลือก: {colorOptions.find(c => c.color === formData.color)?.name || formData.color}
                            </p>
                        )}
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={() => setIsModalOpen(false)}
                            className="flex-1 bg-gray-100 text-cafe-700 py-3 rounded-xl hover:bg-gray-200 transition-colors font-medium"
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

            {/* Delete Confirmation Modal */}
            <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="⚠️ ยืนยันการลบ">
                <div className="space-y-4">
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                        <div className="flex items-start gap-3">
                            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                                <AlertTriangle className="text-red-500" size={20} />
                            </div>
                            <div>
                                <p className="text-cafe-800 font-medium mb-1">
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
                                            <p className="font-bold text-cafe-800">{marketToDelete.name}</p>
                                            {marketToDelete.location && (
                                                <p className="text-xs text-cafe-500">{marketToDelete.location}</p>
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
                            className="flex-1 bg-gray-100 text-cafe-800 py-3 rounded-xl hover:bg-gray-200 transition-colors font-medium flex items-center justify-center gap-2"
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
