// ============================================================
// Snack Box Manager Component
// Main page for managing Set Menus
// ============================================================

import React, { useEffect, useState } from 'react';
import { useStore } from '../../store';
import { SetMenuCard } from './SetMenuCard';
import { CreateEditSetModal } from './CreateEditSetModal';
import {
    Package, Plus, Loader2, Search,
    AlertCircle
} from 'lucide-react';
import { SnackBoxSet, SnackBoxSetItem } from '../../../types';

export const SnackBoxManager: React.FC = () => {
    const {
        snackBoxSets,
        packagingOptions,
        isLoadingSnackBox,
        fetchSnackBoxSets,
        fetchPackagingOptions,
        createSnackBoxSet,
        updateSnackBoxSet,
        deleteSnackBoxSet
    } = useStore();

    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSet, setEditingSet] = useState<SnackBoxSet | null>(null);

    // Load data on mount
    useEffect(() => {
        fetchSnackBoxSets();
        fetchPackagingOptions();
    }, []);

    // Filter sets
    const filteredSets = snackBoxSets.filter(set =>
        set.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        set.nameThai.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleCreate = () => {
        setEditingSet(null);
        setIsModalOpen(true);
    };

    const handleEdit = (set: SnackBoxSet) => {
        setEditingSet(set);
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('ต้องการลบ Set นี้หรือไม่?')) return;
        try {
            await deleteSnackBoxSet(id);
        } catch (error) {
            console.error('Delete error:', error);
            alert('เกิดข้อผิดพลาดในการลบ');
        }
    };

    const handleSave = async (
        data: Omit<SnackBoxSet, 'id' | 'createdAt' | 'updatedAt' | 'items'>,
        items: Omit<SnackBoxSetItem, 'id' | 'setId'>[]
    ) => {
        try {
            if (editingSet) {
                await updateSnackBoxSet(editingSet.id, data, items);
            } else {
                await createSnackBoxSet(data, items);
            }
            setIsModalOpen(false);
            setEditingSet(null);
        } catch (error) {
            console.error('Save error:', error);
            alert('เกิดข้อผิดพลาดในการบันทึก');
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <Package className="w-7 h-7 text-amber-600" />
                        Snack Box - จัดการ Set Menu
                    </h2>
                    <p className="text-gray-500 mt-1">สร้างและจัดการ Set สำหรับงานจัดเบรก</p>
                </div>

                <button
                    onClick={handleCreate}
                    className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-semibold hover:from-amber-600 hover:to-orange-600 transition-all shadow-lg"
                >
                    <Plus className="w-5 h-5" />
                    สร้าง Set ใหม่
                </button>
            </div>

            {/* Search */}
            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                    type="text"
                    placeholder="ค้นหา Set..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                />
            </div>

            {/* Content */}
            {isLoadingSnackBox ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
                    <span className="ml-2 text-gray-600">กำลังโหลด...</span>
                </div>
            ) : filteredSets.length === 0 ? (
                <div className="text-center py-12">
                    <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">
                        {searchTerm ? 'ไม่พบ Set ที่ค้นหา' : 'ยังไม่มี Set Menu กดปุ่ม "สร้าง Set ใหม่" เพื่อเริ่มต้น'}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredSets.map(set => (
                        <SetMenuCard
                            key={set.id}
                            set={set}
                            packaging={packagingOptions.find(p => p.id === set.packagingId)}
                            onEdit={() => handleEdit(set)}
                            onDelete={() => handleDelete(set.id)}
                        />
                    ))}
                </div>
            )}

            {/* Modal */}
            {isModalOpen && (
                <CreateEditSetModal
                    set={editingSet}
                    onSave={handleSave}
                    onClose={() => {
                        setIsModalOpen(false);
                        setEditingSet(null);
                    }}
                />
            )}
        </div>
    );
};
