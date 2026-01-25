// ============================================================
// Set Menu Card Component
// Display individual Set Menu
// ============================================================

import React from 'react';
import { SnackBoxSet, PackagingOption } from '../../../types';
import {
    Edit2, Trash2, Package, Users,
    Gift, DollarSign
} from 'lucide-react';

interface SetMenuCardProps {
    set: SnackBoxSet;
    packaging?: PackagingOption;
    onEdit: () => void;
    onDelete: () => void;
}

export const SetMenuCard: React.FC<SetMenuCardProps> = ({
    set,
    packaging,
    onEdit,
    onDelete
}) => {
    return (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 px-5 py-4 border-b border-amber-100">
                <div className="flex justify-between items-start">
                    <div>
                        <h3 className="text-lg font-bold text-gray-800">{set.name}</h3>
                        <p className="text-sm text-amber-700">{set.nameThai}</p>
                    </div>
                    <div className="text-right">
                        <div className="text-2xl font-bold text-amber-600">฿{set.price.toFixed(0)}</div>
                        <div className="text-xs text-gray-500">ต่อชุด</div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="p-5 space-y-4">
                {/* Description */}
                {set.description && (
                    <p className="text-sm text-gray-600">{set.description}</p>
                )}

                {/* Items */}
                <div className="space-y-2">
                    <div className="text-sm font-medium text-gray-700 flex items-center gap-1">
                        <Gift className="w-4 h-4" />
                        รายการใน Set:
                    </div>
                    {set.items.length > 0 ? (
                        <ul className="text-sm text-gray-600 space-y-1 ml-5">
                            {set.items.map(item => (
                                <li key={item.id} className="flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 bg-amber-400 rounded-full" />
                                    <span>
                                        {item.category}
                                        <span className="text-gray-400 mx-1">x{item.quantity}</span>
                                        <span className="text-xs text-amber-600">
                                            ({item.selectionType === 'pick_one' ? 'เลือก 1' : item.selectionType === 'pick_many' ? 'เลือกหลายตัว' : 'ทั้งหมด'})
                                        </span>
                                    </span>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-sm text-gray-400 ml-5">ยังไม่มีรายการ</p>
                    )}
                </div>

                {/* Packaging */}
                <div className="flex items-center gap-2 text-sm">
                    <Package className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">
                        บรรจุภัณฑ์: {packaging?.name || 'ไม่ระบุ'}
                    </span>
                </div>

                {/* Min Quantity */}
                <div className="flex items-center gap-2 text-sm">
                    <Users className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">
                        ขั้นต่ำ: {set.minQuantity} ชุด
                    </span>
                </div>

                {/* Status Badge */}
                <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${set.isActive
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-500'
                        }`}>
                        {set.isActive ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}
                    </span>
                </div>
            </div>

            {/* Actions */}
            <div className="px-5 py-3 bg-gray-50 border-t border-gray-100 flex justify-end gap-2">
                <button
                    onClick={onEdit}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm text-amber-700 hover:bg-amber-100 rounded-lg transition-colors"
                >
                    <Edit2 className="w-4 h-4" />
                    แก้ไข
                </button>
                <button
                    onClick={onDelete}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                    <Trash2 className="w-4 h-4" />
                    ลบ
                </button>
            </div>
        </div>
    );
};
