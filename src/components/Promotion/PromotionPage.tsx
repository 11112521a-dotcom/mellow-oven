import React, { useState } from 'react';
import { useStore } from '@/src/store';
import { formatCurrency } from '@/src/lib/utils';
import {
    Tag,
    Package,
    ShoppingBag,
    Plus,
    Edit2,
    Trash2,
    ToggleLeft,
    ToggleRight,
    Calendar,
    Users,
    TrendingUp,
    AlertCircle,
    Check,
    X,
    Truck
} from 'lucide-react';
import { Promotion, Bundle, SpecialOrder, SpecialOrderStatus } from '../../../types';
import { AddPromotionModal } from './AddPromotionModal';
import { AddSpecialOrderModal } from './AddSpecialOrderModal';

type Tab = 'promotions' | 'bundles' | 'orders';

const statusColors: Record<SpecialOrderStatus, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    confirmed: 'bg-blue-100 text-blue-800',
    producing: 'bg-purple-100 text-purple-800',
    delivered: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800'
};

const statusLabels: Record<SpecialOrderStatus, string> = {
    pending: 'รอยืนยัน',
    confirmed: 'ยืนยันแล้ว',
    producing: 'กำลังผลิต',
    delivered: 'ส่งแล้ว',
    cancelled: 'ยกเลิก'
};

export const PromotionPage: React.FC = () => {
    const {
        promotions,
        bundles,
        specialOrders,
        products,
        updatePromotion,
        deletePromotion,
        updateBundle,
        deleteBundle,
        updateSpecialOrderStatus,
        cancelSpecialOrder,
        syncDeliveredOrderProfits
    } = useStore();

    const [activeTab, setActiveTab] = useState<Tab>('promotions');
    const [showAddPromoModal, setShowAddPromoModal] = useState(false);
    const [showAddBundleModal, setShowAddBundleModal] = useState(false);
    const [showAddOrderModal, setShowAddOrderModal] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null);

    // Stats
    const activePromotions = promotions.filter(p => p.isActive).length;
    const activeBundles = bundles.filter(b => b.isActive).length;
    const pendingOrders = specialOrders.filter(o => o.status === 'pending').length;
    const todayOrders = specialOrders.filter(o => {
        const today = new Date().toISOString().split('T')[0];
        return o.deliveryDate === today && o.status !== 'cancelled';
    });
    const deliveredOrders = specialOrders.filter(o => o.status === 'delivered');

    const handleSyncProfits = async () => {
        setIsSyncing(true);
        const count = await syncDeliveredOrderProfits();
        setIsSyncing(false);
        if (count > 0) {
            alert(`✅ Sync สำเร็จ! เพิ่มกำไร ${count} รายการเข้าระบบแล้ว`);
        } else {
            alert('ℹ️ ไม่มีกำไรที่ต้อง sync (ข้อมูลครบแล้ว)');
        }
    };

    const tabs = [
        { id: 'promotions' as Tab, label: 'โปรโมชั่น', icon: Tag, count: activePromotions },
        { id: 'bundles' as Tab, label: 'Snack Box', icon: Package, count: activeBundles },
        { id: 'orders' as Tab, label: 'ออเดอร์พิเศษ', icon: ShoppingBag, count: pendingOrders }
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-6 rounded-2xl">
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-3">
                            <Tag size={28} />
                            Promotion & Snack Box
                        </h1>
                        <p className="text-purple-100 mt-2">จัดการโปรโมชั่น, Snack Box และออเดอร์พิเศษ</p>
                    </div>
                    {deliveredOrders.length > 0 && (
                        <button
                            onClick={handleSyncProfits}
                            disabled={isSyncing}
                            className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
                            title="Sync กำไรจาก delivered orders เข้าหน้าการเงิน"
                        >
                            {isSyncing ? '⏳ กำลัง Sync...' : '🔄 Sync กำไร'}
                        </button>
                    )}
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl shadow-sm p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-100 rounded-lg">
                            <Tag className="text-orange-600" size={20} />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-cafe-800">{activePromotions}</p>
                            <p className="text-xs text-gray-500">โปรโมชั่นที่ใช้งาน</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-100 rounded-lg">
                            <Package className="text-purple-600" size={20} />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-cafe-800">{activeBundles}</p>
                            <p className="text-xs text-gray-500">Snack Box</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-yellow-100 rounded-lg">
                            <AlertCircle className="text-yellow-600" size={20} />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-cafe-800">{pendingOrders}</p>
                            <p className="text-xs text-gray-500">รอยืนยัน</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm p-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100 rounded-lg">
                            <Truck className="text-green-600" size={20} />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-cafe-800">{todayOrders.length}</p>
                            <p className="text-xs text-gray-500">ส่งวันนี้</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-xl shadow-sm">
                <div className="flex border-b">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex-1 py-4 px-4 flex items-center justify-center gap-2 font-medium transition-colors
                                ${activeTab === tab.id
                                    ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50'
                                    : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            <tab.icon size={18} />
                            <span className="hidden sm:inline">{tab.label}</span>
                            {tab.count > 0 && (
                                <span className="bg-purple-100 text-purple-700 text-xs px-2 py-0.5 rounded-full">
                                    {tab.count}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                <div className="p-4">
                    {/* Promotions Tab */}
                    {activeTab === 'promotions' && (
                        <div>
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-bold text-cafe-800">รายการโปรโมชั่น</h3>
                                <button
                                    onClick={() => setShowAddPromoModal(true)}
                                    className="bg-purple-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-purple-700 transition-colors"
                                >
                                    <Plus size={18} />
                                    เพิ่มโปรโมชั่น
                                </button>
                            </div>

                            {promotions.length === 0 ? (
                                <div className="text-center py-12 text-gray-400">
                                    <Tag size={48} className="mx-auto mb-4 opacity-50" />
                                    <p>ยังไม่มีโปรโมชั่น</p>
                                    <p className="text-sm mt-1">กดปุ่ม "+ เพิ่มโปรโมชั่น" เพื่อสร้างโปรโมชั่นใหม่</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {promotions.map(promo => (
                                        <div
                                            key={promo.id}
                                            className={`p-4 rounded-xl border-2 transition-all ${promo.isActive ? 'border-green-200 bg-green-50/30' : 'border-gray-200 bg-gray-50 opacity-60'}`}
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <h4 className="font-bold text-cafe-800">{promo.name}</h4>
                                                        {promo.isActive ? (
                                                            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">ใช้งาน</span>
                                                        ) : (
                                                            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">ปิดการใช้งาน</span>
                                                        )}
                                                    </div>
                                                    <p className="text-sm text-gray-600 mt-1">
                                                        {promo.productName} {promo.variantName && `(${promo.variantName})`}
                                                    </p>
                                                    <div className="flex items-center gap-4 mt-2">
                                                        <span className="text-gray-400 line-through">{formatCurrency(promo.originalPrice)}</span>
                                                        <span className="text-lg font-bold text-green-600">{formatCurrency(promo.discountPrice)}</span>
                                                        <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded">-{promo.discountPercent.toFixed(0)}%</span>
                                                    </div>
                                                    <p className="text-xs text-gray-400 mt-2">
                                                        ขั้นต่ำ {promo.minQuantity} ชิ้น
                                                        {promo.validUntil && ` • หมดอายุ ${promo.validUntil}`}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => setEditingPromotion(promo)}
                                                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                        title="แก้ไข"
                                                    >
                                                        <Edit2 size={18} />
                                                    </button>
                                                    <button
                                                        onClick={() => updatePromotion(promo.id, { isActive: !promo.isActive })}
                                                        className={`p-2 rounded-lg transition-colors ${promo.isActive ? 'text-green-600 hover:bg-green-100' : 'text-gray-400 hover:bg-gray-100'}`}
                                                        title={promo.isActive ? 'ปิดการใช้งาน' : 'เปิดการใช้งาน'}
                                                    >
                                                        {promo.isActive ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                                                    </button>
                                                    <button
                                                        onClick={() => deletePromotion(promo.id)}
                                                        className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition-colors"
                                                        title="ลบ"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Bundles Tab */}
                    {activeTab === 'bundles' && (
                        <div>
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-bold text-cafe-800">รายการ Snack Box</h3>
                                <button
                                    onClick={() => setShowAddBundleModal(true)}
                                    className="bg-purple-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-purple-700 transition-colors"
                                >
                                    <Plus size={18} />
                                    สร้าง Snack Box
                                </button>
                            </div>

                            {bundles.length === 0 ? (
                                <div className="text-center py-12 text-gray-400">
                                    <Package size={48} className="mx-auto mb-4 opacity-50" />
                                    <p>ยังไม่มี Snack Box</p>
                                    <p className="text-sm mt-1">กดปุ่ม "+ สร้าง Snack Box" เพื่อสร้างชุดสินค้า</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {bundles.map(bundle => (
                                        <div
                                            key={bundle.id}
                                            className={`p-4 rounded-xl border-2 transition-all ${bundle.isActive ? 'border-purple-200 bg-purple-50/30' : 'border-gray-200 bg-gray-50 opacity-60'}`}
                                        >
                                            <div className="flex items-start justify-between mb-3">
                                                <div>
                                                    <h4 className="font-bold text-cafe-800">{bundle.name}</h4>
                                                    {bundle.description && (
                                                        <p className="text-sm text-gray-500">{bundle.description}</p>
                                                    )}
                                                </div>
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => updateBundle(bundle.id, { isActive: !bundle.isActive })}
                                                        className={`p-1.5 rounded transition-colors ${bundle.isActive ? 'text-green-600' : 'text-gray-400'}`}
                                                    >
                                                        {bundle.isActive ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                                                    </button>
                                                    <button
                                                        onClick={() => deleteBundle(bundle.id)}
                                                        className="p-1.5 text-red-400 hover:bg-red-50 rounded transition-colors"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="bg-white/60 rounded-lg p-3 mb-3">
                                                <p className="text-xs text-gray-500 mb-2">รายการในชุด:</p>
                                                <div className="space-y-1">
                                                    {bundle.items.map(item => (
                                                        <div key={item.id} className="flex justify-between text-sm">
                                                            <span>{item.productName} {item.variantName && `(${item.variantName})`}</span>
                                                            <span className="text-gray-500">x{item.quantity}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="text-xs text-gray-400">ต้นทุน {formatCurrency(bundle.estimatedCost)}</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-lg font-bold text-purple-600">{formatCurrency(bundle.bundlePrice)}</p>
                                                    <p className="text-xs text-green-600">กำไร {bundle.profitMargin.toFixed(0)}%</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Orders Tab */}
                    {activeTab === 'orders' && (
                        <div>
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-bold text-cafe-800">รายการออเดอร์พิเศษ</h3>
                                <button
                                    onClick={() => setShowAddOrderModal(true)}
                                    className="bg-purple-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-purple-700 transition-colors"
                                >
                                    <Plus size={18} />
                                    สร้างออเดอร์
                                </button>
                            </div>

                            {specialOrders.length === 0 ? (
                                <div className="text-center py-12 text-gray-400">
                                    <ShoppingBag size={48} className="mx-auto mb-4 opacity-50" />
                                    <p>ยังไม่มีออเดอร์พิเศษ</p>
                                    <p className="text-sm mt-1">กดปุ่ม "+ สร้างออเดอร์" เพื่อบันทึกออเดอร์ใหม่</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {specialOrders.map(order => (
                                        <div
                                            key={order.id}
                                            className={`p-4 rounded-xl border-2 transition-all ${order.status === 'cancelled' ? 'border-red-200 bg-red-50/30 opacity-60' : 'border-gray-200'}`}
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="font-mono text-sm font-bold text-purple-600">{order.orderNumber}</span>
                                                        <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[order.status]}`}>
                                                            {statusLabels[order.status]}
                                                        </span>
                                                    </div>

                                                    {order.customerName && (
                                                        <p className="text-sm text-gray-600 mt-1 flex items-center gap-1">
                                                            <Users size={14} />
                                                            {order.customerName}
                                                            {order.customerPhone && ` • ${order.customerPhone}`}
                                                        </p>
                                                    )}

                                                    <div className="flex items-center gap-4 mt-2 text-sm">
                                                        <span className="flex items-center gap-1 text-gray-500">
                                                            <Calendar size={14} />
                                                            ส่ง {order.deliveryDate}
                                                        </span>
                                                        <span className="text-gray-500">
                                                            จำนวน {order.totalQuantity} ชิ้น
                                                        </span>
                                                    </div>

                                                    <div className="flex items-center gap-4 mt-2">
                                                        <span className="text-green-600 font-bold">{formatCurrency(order.totalRevenue)}</span>
                                                        <span className="text-xs text-gray-400">กำไร {formatCurrency(order.grossProfit)}</span>
                                                    </div>
                                                </div>

                                                {order.status !== 'cancelled' && order.status !== 'delivered' && (
                                                    <div className="flex flex-col gap-2">
                                                        {order.status === 'pending' && (
                                                            <button
                                                                onClick={() => updateSpecialOrderStatus(order.id, 'confirmed')}
                                                                className="p-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                                                                title="ยืนยันออเดอร์"
                                                            >
                                                                <Check size={18} />
                                                            </button>
                                                        )}
                                                        {order.status === 'confirmed' && (
                                                            <button
                                                                onClick={() => updateSpecialOrderStatus(order.id, 'producing')}
                                                                className="p-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors"
                                                                title="เริ่มผลิต"
                                                            >
                                                                <Package size={18} />
                                                            </button>
                                                        )}
                                                        {order.status === 'producing' && (
                                                            <button
                                                                onClick={() => updateSpecialOrderStatus(order.id, 'delivered')}
                                                                className="p-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                                                                title="ส่งแล้ว"
                                                            >
                                                                <Truck size={18} />
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => cancelSpecialOrder(order.id)}
                                                            className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition-colors"
                                                            title="ยกเลิก"
                                                        >
                                                            <X size={18} />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Modals */}
            <AddPromotionModal isOpen={showAddPromoModal} onClose={() => setShowAddPromoModal(false)} />
            <AddSpecialOrderModal isOpen={showAddOrderModal} onClose={() => setShowAddOrderModal(false)} />

            {/* Edit Promotion Modal */}
            {editingPromotion && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-cafe-800">แก้ไขโปรโมชั่น</h3>
                            <button
                                onClick={() => setEditingPromotion(null)}
                                className="p-2 hover:bg-gray-100 rounded-lg"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={(e) => {
                            e.preventDefault();
                            const form = e.target as HTMLFormElement;
                            const formData = new FormData(form);
                            const discountPrice = parseFloat(formData.get('discountPrice') as string);
                            const discountPercent = ((editingPromotion.originalPrice - discountPrice) / editingPromotion.originalPrice) * 100;

                            updatePromotion(editingPromotion.id, {
                                name: formData.get('name') as string,
                                discountPrice,
                                discountPercent,
                                minQuantity: parseInt(formData.get('minQuantity') as string) || 1,
                                validUntil: formData.get('validUntil') as string || null,
                                isActive: formData.get('isActive') === 'on'
                            });
                            setEditingPromotion(null);
                        }}>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อโปรโมชั่น</label>
                                    <input
                                        name="name"
                                        type="text"
                                        defaultValue={editingPromotion.name}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">สินค้า</label>
                                    <p className="text-gray-600 bg-gray-50 px-3 py-2 rounded-lg">
                                        {editingPromotion.productName} {editingPromotion.variantName && `(${editingPromotion.variantName})`}
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">ราคาปกติ</label>
                                        <p className="text-gray-400 bg-gray-50 px-3 py-2 rounded-lg">
                                            {formatCurrency(editingPromotion.originalPrice)}
                                        </p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">ราคาโปร</label>
                                        <input
                                            name="discountPrice"
                                            type="number"
                                            step="0.01"
                                            defaultValue={editingPromotion.discountPrice}
                                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">จำนวนขั้นต่ำ</label>
                                        <input
                                            name="minQuantity"
                                            type="number"
                                            min="1"
                                            defaultValue={editingPromotion.minQuantity}
                                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">หมดอายุ</label>
                                        <input
                                            name="validUntil"
                                            type="date"
                                            defaultValue={editingPromotion.validUntil || ''}
                                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <input
                                        name="isActive"
                                        type="checkbox"
                                        defaultChecked={editingPromotion.isActive}
                                        className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
                                    />
                                    <label className="text-sm font-medium text-gray-700">เปิดใช้งาน</label>
                                </div>
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setEditingPromotion(null)}
                                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                                >
                                    ยกเลิก
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                                >
                                    บันทึก
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PromotionPage;
