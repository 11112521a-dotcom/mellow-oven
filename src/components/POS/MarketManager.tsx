import React, { useState } from 'react';
import { useStore } from '@/src/store';
import { Market } from '@/types';
import { Plus, Edit2, Trash2, MapPin, Store } from 'lucide-react';
import { Modal } from '@/src/components/ui/Modal';

export const MarketManager: React.FC = () => {
    const { markets, addMarket, updateMarket, removeMarket } = useStore();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingMarket, setEditingMarket] = useState<Market | null>(null);
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

    const handleDelete = (id: string) => {
        if (confirm('ต้องการลบตลาดนี้ใช่ไหม? ข้อมูลยอดขายเก่าจะยังคงอยู่แต่จะไม่แสดงชื่อตลาด')) {
            removeMarket(id);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-cafe-800 flex items-center gap-2">
                    <Store size={20} /> จัดการตลาด (Markets)
                </h3>
                <button
                    onClick={handleOpenAdd}
                    className="flex items-center gap-2 bg-cafe-600 text-white px-4 py-2 rounded-lg hover:bg-cafe-700 transition-colors"
                >
                    <Plus size={18} /> เพิ่มตลาดใหม่
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {markets.map(market => (
                    <div key={market.id} className="bg-white p-4 rounded-xl border border-cafe-100 shadow-sm hover:shadow-md transition-shadow relative group">
                        <div className="flex justify-between items-start mb-2">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: market.color || '#ccc' }}></div>
                                <h4 className="font-bold text-cafe-900">{market.name}</h4>
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => handleOpenEdit(market)} className="p-1 text-cafe-400 hover:text-cafe-600 hover:bg-cafe-50 rounded">
                                    <Edit2 size={16} />
                                </button>
                                <button onClick={() => handleDelete(market.id)} className="p-1 text-cafe-400 hover:text-red-500 hover:bg-red-50 rounded">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                        {market.location && (
                            <p className="text-sm text-cafe-500 flex items-center gap-1 mb-1">
                                <MapPin size={14} /> {market.location}
                            </p>
                        )}
                        {market.description && (
                            <p className="text-xs text-cafe-400">{market.description}</p>
                        )}
                    </div>
                ))}
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingMarket ? 'แก้ไขตลาด' : 'เพิ่มตลาดใหม่'}>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-cafe-700 mb-1">ชื่อตลาด</label>
                        <input
                            required
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            className="w-full p-2 border border-cafe-200 rounded-lg"
                            placeholder="เช่น ตลาดนัดรถไฟ"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-cafe-700 mb-1">สถานที่ตั้ง</label>
                        <input
                            value={formData.location}
                            onChange={e => setFormData({ ...formData, location: e.target.value })}
                            className="w-full p-2 border border-cafe-200 rounded-lg"
                            placeholder="เช่น หลังห้าง..."
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-cafe-700 mb-1">รายละเอียดเพิ่มเติม</label>
                        <textarea
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                            className="w-full p-2 border border-cafe-200 rounded-lg"
                            placeholder="เช่น ขายดีช่วงเย็น, ห้ามใช้โฟม"
                            rows={3}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-cafe-700 mb-1">สีประจำตลาด (สำหรับกราฟ)</label>
                        <div className="flex gap-2">
                            {['#b08968', '#22c55e', '#3b82f6', '#ef4444', '#eab308', '#a855f7', '#ec4899'].map(c => (
                                <button
                                    key={c}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, color: c })}
                                    className={`w-8 h-8 rounded-full border-2 ${formData.color === c ? 'border-cafe-800 scale-110' : 'border-transparent'}`}
                                    style={{ backgroundColor: c }}
                                />
                            ))}
                        </div>
                    </div>
                    <button type="submit" className="w-full bg-cafe-600 text-white py-2 rounded-lg hover:bg-cafe-700">
                        บันทึก
                    </button>
                </form>
            </Modal>
        </div>
    );
};
