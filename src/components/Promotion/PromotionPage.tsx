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
    Truck,
    Scissors
} from 'lucide-react';
import { Promotion, Bundle, SpecialOrder, SpecialOrderStatus } from '../../../types';
import { AddPromotionModal } from './AddPromotionModal';
import { AddSpecialOrderModal } from './AddSpecialOrderModal';
import { CreateBundleOrderModal } from './CreateBundleOrderModal';

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
        syncDeliveredOrderProfits,
        deductStockForBundleOrder
    } = useStore();

    const [activeTab, setActiveTab] = useState<Tab>('promotions');
    const [showAddPromoModal, setShowAddPromoModal] = useState(false);
    const [showAddBundleModal, setShowAddBundleModal] = useState(false);
    const [showAddOrderModal, setShowAddOrderModal] = useState(false);
    const [showBundleOrderModal, setShowBundleOrderModal] = useState(false);
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
            {/* Header - Light Warm Cafe Style */}
            <div className="bg-white rounded-[2rem] shadow-xl shadow-stone-200/50 border border-stone-100 overflow-hidden relative">
                {/* Decorative Background Elements */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-amber-50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 opacity-50 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-orange-50 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 opacity-50 pointer-events-none" />

                <div className="relative px-8 py-6 flex justify-between items-center sm:items-start gap-4">
                    <div className="flex items-center gap-5">
                        <div className="relative">
                            <div className="absolute inset-0 bg-amber-400 blur-xl opacity-20" />
                            <div className="relative bg-gradient-to-br from-amber-400 to-orange-500 p-4 rounded-2xl shadow-lg shadow-amber-500/20 text-white">
                                <Tag size={28} strokeWidth={2.5} />
                            </div>
                        </div>
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-black text-cafe-900 tracking-tight flex items-center gap-3">
                                Promotion & Snack Box
                            </h1>
                            <p className="text-stone-500 text-sm font-medium mt-1">จัดการโปรโมชั่นและสินค้าชุดพิเศษ</p>
                        </div>
                    </div>
                    {deliveredOrders.length > 0 && (
                        <button
                            onClick={handleSyncProfits}
                            disabled={isSyncing}
                            className="bg-cafe-900 hover:bg-cafe-800 text-white px-5 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-lg hover:shadow-xl active:scale-95 border border-cafe-800"
                            title="Sync กำไร"
                        >
                            {isSyncing ? <div className="animate-spin">⏳</div> : <div className="p-1 bg-green-400 rounded-full animate-pulse shadow-[0_0_10px_rgba(74,222,128,0.5)]" />}
                            <span className="font-bold tracking-wide">{isSyncing ? 'กำลัง Sync...' : 'Sync กำไร'}</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl shadow-sm border border-stone-100 p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-100 text-orange-600 rounded-lg">
                            <Tag size={20} />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-cafe-900">{activePromotions}</p>
                            <p className="text-xs text-cafe-500">โปรโมชั่นที่ใช้งาน</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-stone-100 p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
                            <Package size={20} />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-cafe-900">{activeBundles}</p>
                            <p className="text-xs text-cafe-500">Snack Box</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-stone-100 p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-yellow-100 text-yellow-600 rounded-lg">
                            <AlertCircle size={20} />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-cafe-900">{pendingOrders}</p>
                            <p className="text-xs text-cafe-500">รอยืนยัน</p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-stone-100 p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100 text-green-600 rounded-lg">
                            <Truck size={20} />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-cafe-900">{todayOrders.length}</p>
                            <p className="text-xs text-cafe-500">ส่งวันนี้</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-xl shadow-sm border border-stone-100 overflow-hidden">
                <div className="flex border-b border-stone-100">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex-1 py-4 px-4 flex items-center justify-center gap-2 font-medium transition-all relative overflow-hidden
                                ${activeTab === tab.id
                                    ? 'text-amber-700 bg-amber-50'
                                    : 'text-stone-500 hover:text-stone-700 hover:bg-stone-50'
                                }`}
                        >
                            {activeTab === tab.id && (
                                <div className="absolute inset-x-0 bottom-0 h-0.5 bg-amber-500" />
                            )}
                            <tab.icon size={18} />
                            <span className="hidden sm:inline">{tab.label}</span>
                            {tab.count > 0 && (
                                <span className={`text-xs px-2 py-0.5 rounded-full ${activeTab === tab.id ? 'bg-amber-200 text-amber-800' : 'bg-stone-100 text-stone-600'}`}>
                                    {tab.count}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                <div className="p-6 bg-stone-50/30 min-h-[400px]">
                    {/* Promotions Tab */}
                    {activeTab === 'promotions' && (
                        <div className="animate-in fade-in duration-300">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-lg font-bold text-cafe-900 flex items-center gap-2">
                                    <Tag className="text-amber-600" size={20} />
                                    รายการโปรโมชั่น
                                </h3>
                                <button
                                    onClick={() => setShowAddPromoModal(true)}
                                    className="bg-cafe-900 text-white px-4 py-2.5 rounded-xl flex items-center gap-2 hover:bg-cafe-800 transition-all shadow-sm active:scale-95"
                                >
                                    <Plus size={18} />
                                    <span>เพิ่มโปรโมชั่น</span>
                                </button>
                            </div>

                            {promotions.length === 0 ? (
                                <div className="text-center py-16 text-stone-400 bg-white rounded-2xl border-2 border-dashed border-stone-200">
                                    <Tag size={48} className="mx-auto mb-4 opacity-50 text-stone-300" />
                                    <p className="text-lg font-medium text-stone-500">ยังไม่มีโปรโมชั่น</p>
                                    <p className="text-sm mt-1">สร้างโปรโมชั่นใหม่เพื่อกระตุ้นยอดขาย</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {promotions.map(promo => (
                                        <div
                                            key={promo.id}
                                            className={`p-5 rounded-2xl border transition-all duration-300 hover:shadow-md ${promo.isActive
                                                ? 'border-amber-200 bg-white hover:border-amber-300'
                                                : 'border-stone-200 bg-stone-50 opacity-70 grayscale'}`}
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-3">
                                                        <h4 className="font-bold text-lg text-cafe-900">{promo.name}</h4>
                                                        {promo.isActive ? (
                                                            <span className="text-[10px] bg-green-100 text-green-700 px-2 py-1 rounded-full font-bold uppercase tracking-wider">Active</span>
                                                        ) : (
                                                            <span className="text-[10px] bg-stone-200 text-stone-500 px-2 py-1 rounded-full font-bold uppercase tracking-wider">Inactive</span>
                                                        )}
                                                    </div>
                                                    <p className="text-sm text-cafe-600 mt-1 flex items-center gap-2">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-cafe-400"></span>
                                                        {promo.productName} {promo.variantName && `(${promo.variantName})`}
                                                    </p>

                                                    <div className="flex flex-wrap items-center gap-3 mt-4">
                                                        <div className="flex items-baseline gap-2 bg-stone-100 px-3 py-1.5 rounded-lg border border-stone-200">
                                                            <span className="text-sm text-stone-400 line-through decoration-stone-400/50">{formatCurrency(promo.originalPrice)}</span>
                                                            <span className="text-lg font-bold text-amber-600 border-l border-stone-300 pl-2">{formatCurrency(promo.discountPrice)}</span>
                                                        </div>
                                                        <span className="text-xs bg-red-50 text-red-600 font-bold px-2 py-1 rounded border border-red-100">-{promo.discountPercent.toFixed(0)}% OFF</span>
                                                        <span className="text-xs text-stone-500 flex items-center gap-1 bg-white px-2 py-1 rounded border border-stone-200">
                                                            <Package size={12} /> ขั้นต่ำ {promo.minQuantity}
                                                        </span>
                                                        {promo.validUntil && (
                                                            <span className="text-xs text-stone-500 flex items-center gap-1 bg-white px-2 py-1 rounded border border-stone-200">
                                                                <Calendar size={12} /> ถึง {new Date(promo.validUntil).toLocaleDateString('th-TH')}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-1 bg-stone-100 p-1 rounded-xl">
                                                    <button
                                                        onClick={() => setEditingPromotion(promo)}
                                                        className="p-2 text-stone-500 hover:text-cafe-900 hover:bg-white rounded-lg transition-all"
                                                        title="แก้ไข"
                                                    >
                                                        <Edit2 size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => updatePromotion(promo.id, { isActive: !promo.isActive })}
                                                        className={`p-2 rounded-lg transition-all ${promo.isActive
                                                            ? 'text-green-600 hover:bg-white hover:shadow-sm'
                                                            : 'text-stone-400 hover:bg-white hover:text-stone-600'}`}
                                                        title={promo.isActive ? 'ปิดการใช้งาน' : 'เปิดการใช้งาน'}
                                                    >
                                                        {promo.isActive ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                                                    </button>
                                                    <div className="w-px h-6 bg-stone-200 mx-1"></div>
                                                    <button
                                                        onClick={() => deletePromotion(promo.id)}
                                                        className="p-2 text-stone-400 hover:text-red-500 hover:bg-white rounded-lg transition-all"
                                                        title="ลบ"
                                                    >
                                                        <Trash2 size={16} />
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
                        <div className="animate-in fade-in duration-300">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-lg font-bold text-cafe-900 flex items-center gap-2">
                                    <Package className="text-purple-600" size={20} />
                                    รายการ Snack Box
                                </h3>
                                <button
                                    onClick={() => setShowAddBundleModal(true)}
                                    className="bg-cafe-900 text-white px-4 py-2.5 rounded-xl flex items-center gap-2 hover:bg-cafe-800 transition-all shadow-sm active:scale-95"
                                >
                                    <Plus size={18} />
                                    สร้าง Snack Box
                                </button>
                            </div>

                            {bundles.length === 0 ? (
                                <div className="text-center py-16 text-stone-400 bg-white rounded-2xl border-2 border-dashed border-stone-200">
                                    <Package size={48} className="mx-auto mb-4 opacity-50 text-stone-300" />
                                    <p className="text-lg font-medium text-stone-500">ยังไม่มี Snack Box</p>
                                    <p className="text-sm mt-1">สร้างชุดสินค้าเพื่อเพิ่มมูลค่าการขาย</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {bundles.map(bundle => (
                                        <div
                                            key={bundle.id}
                                            className={`p-5 rounded-2xl border transition-all duration-300 hover:shadow-md ${bundle.isActive
                                                ? 'border-purple-200 bg-white hover:border-purple-300'
                                                : 'border-stone-200 bg-stone-50 opacity-70 grayscale'}`}
                                        >
                                            <div className="flex justify-between items-start mb-4">
                                                <div>
                                                    <h4 className="font-bold text-lg text-cafe-900">{bundle.name}</h4>
                                                    <p className="text-sm text-cafe-500">{bundle.description}</p>
                                                </div>
                                                <div className="flex gap-1">
                                                    <button
                                                        onClick={() => updateBundle(bundle.id, { isActive: !bundle.isActive })}
                                                        className={`p-1.5 rounded-lg transition-colors ${bundle.isActive ? 'text-green-600 hover:bg-green-50' : 'text-stone-400 hover:bg-stone-200'}`}
                                                    >
                                                        {bundle.isActive ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                                                    </button>
                                                    <button
                                                        onClick={() => deleteBundle(bundle.id)}
                                                        className="p-1.5 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="bg-stone-50 p-3 rounded-xl mb-4 border border-stone-100">
                                                <p className="text-xs text-stone-500 font-semibold mb-2 uppercase tracking-wider">สินค้าในชุด</p>
                                                <ul className="space-y-1">
                                                    {bundle.items.map((item, idx) => {
                                                        const product = products.find(p => p.id === item.productId);
                                                        const variant = product?.variants?.find(v => v.id === item.variantId);
                                                        return (
                                                            <li key={idx} className="text-sm flex justify-between items-center text-cafe-700">
                                                                <span className="flex items-center gap-2">
                                                                    <span className="w-1 h-1 bg-stone-300 rounded-full"></span>
                                                                    {product?.name} {variant && `(${variant.name})`}
                                                                </span>
                                                                <span className="font-medium bg-white px-2 py-0.5 rounded text-xs border border-stone-200">x{item.quantity}</span>
                                                            </li>
                                                        );
                                                    })}
                                                </ul>
                                            </div>

                                            <div className="flex items-center justify-between mt-auto">
                                                <div className="text-sm text-stone-400 line-through">
                                                    {/* Calculate total original price logic roughly if needed, otherwise skip */}
                                                </div>
                                                <div className="text-xl font-black text-purple-600 bg-purple-50 px-3 py-1 rounded-lg border border-purple-100">
                                                    {formatCurrency(bundle.bundlePrice)}
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
                        <div className="animate-in fade-in duration-300">
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-lg font-bold text-cafe-900 flex items-center gap-2">
                                    <ShoppingBag className="text-sky-500" size={20} />
                                    ออเดอร์พิเศษ
                                </h3>
                                <button
                                    onClick={() => setShowAddOrderModal(true)}
                                    className="bg-cafe-900 text-white px-4 py-2.5 rounded-xl flex items-center gap-2 hover:bg-cafe-800 transition-all shadow-sm active:scale-95"
                                >
                                    <Plus size={18} />
                                    รับออเดอร์
                                </button>
                            </div>

                            {specialOrders.length === 0 ? (
                                <div className="text-center py-16 text-stone-400 bg-white rounded-2xl border-2 border-dashed border-stone-200">
                                    <ShoppingBag size={48} className="mx-auto mb-4 opacity-50 text-stone-300" />
                                    <p className="text-lg font-medium text-stone-500">ไม่มีออเดอร์พิเศษ</p>
                                    <p className="text-sm mt-1">รับงานจัดเบรค งานเลี้ยง งานบุญ ฯลฯ</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {specialOrders.map(order => (
                                        <div
                                            key={order.id}
                                            className="bg-white p-5 rounded-2xl border border-stone-200 shadow-sm hover:shadow-md transition-all"
                                        >
                                            <div className="flex flex-col md:flex-row justify-between gap-4">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <h4 className="font-bold text-lg text-cafe-900">{order.customerName}</h4>
                                                        <span className={`text-xs px-2.5 py-1 rounded-full font-bold uppercase tracking-wider ${statusColors[order.status]}`}>
                                                            {statusLabels[order.status]}
                                                        </span>
                                                        <span className="text-xs text-stone-400 flex items-center gap-1">
                                                            <Calendar size={12} /> ส่ง {new Date(order.deliveryDate).toLocaleDateString('th-TH')}
                                                        </span>
                                                    </div>

                                                    <div className="flex items-center gap-2 text-sm text-cafe-600 mb-4">
                                                        <Users size={14} /> {order.customerName} {order.customerPhone && `(${order.customerPhone})`}
                                                    </div>

                                                    <div className="bg-stone-50 p-3 rounded-xl border border-stone-100">
                                                        <ul className="space-y-1">
                                                            {order.items.map((item, idx) => {
                                                                const product = products.find(p => p.id === item.productId);
                                                                const variant = product?.variants?.find(v => v.id === item.variantId);
                                                                return (
                                                                    <li key={idx} className="text-sm flex justify-between text-cafe-700">
                                                                        <span>• {product?.name} {variant && `(${variant.name})`}</span>
                                                                        <span className="font-mono text-stone-500">x{item.quantity}</span>
                                                                    </li>
                                                                );
                                                            })}
                                                        </ul>
                                                    </div>
                                                </div>

                                                <div className="flex flex-col items-end justify-between min-w-[200px]">
                                                    <div className="text-right mb-4">
                                                        <p className="text-xs text-stone-400 mb-1">ยอดรวมสุทธิ</p>
                                                        <p className="text-2xl font-black text-cafe-900">{formatCurrency(order.totalRevenue)}</p>

                                                    </div>

                                                    <div className="flex gap-2 w-full justify-end">
                                                        {order.status === 'pending' && (
                                                            <button
                                                                onClick={() => updateSpecialOrderStatus(order.id, 'confirmed')}
                                                                className="flex-1 bg-amber-500 hover:bg-amber-600 text-white py-2 px-4 rounded-xl text-sm font-bold transition-colors shadow-sm shadow-amber-200"
                                                            >
                                                                ยืนยัน
                                                            </button>
                                                        )}
                                                        {order.status === 'confirmed' && (
                                                            <button
                                                                onClick={() => updateSpecialOrderStatus(order.id, 'producing')}
                                                                className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-xl text-sm font-bold transition-colors shadow-sm shadow-blue-200"
                                                            >
                                                                ผลิต
                                                            </button>
                                                        )}
                                                        {order.status === 'producing' && (
                                                            <button
                                                                onClick={() => updateSpecialOrderStatus(order.id, 'delivered')}
                                                                className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded-xl text-sm font-bold transition-colors shadow-sm shadow-green-200"
                                                            >
                                                                ส่งแล้ว
                                                            </button>
                                                        )}
                                                        {(order.status === 'confirmed' || order.status === 'producing') && !order.stockDeducted && (
                                                            <button
                                                                onClick={async () => {
                                                                    if (confirm('ยืนยันตัดสต็อกวัตถุดิบสำหรับออเดอร์นี้?')) {
                                                                        await deductStockForBundleOrder(order.id);
                                                                        alert('✅ ตัดสต็อกเรียบร้อยแล้ว!');
                                                                    }
                                                                }}
                                                                className="bg-orange-500 hover:bg-orange-600 text-white py-2 px-3 rounded-xl text-sm font-bold transition-colors shadow-sm shadow-orange-200 flex items-center gap-1"
                                                                title="ตัดสต็อก"
                                                            >
                                                                <Scissors size={16} />
                                                                ตัดสต็อก
                                                            </button>
                                                        )}
                                                        {order.stockDeducted && (
                                                            <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-lg flex items-center gap-1">
                                                                <Check size={14} /> ตัดสต็อกแล้ว
                                                            </span>
                                                        )}
                                                        {order.status !== 'cancelled' && order.status !== 'delivered' && (
                                                            <button
                                                                onClick={() => {
                                                                    if (confirm('ยืนยันการยกเลิกออเดอร์?')) {
                                                                        cancelSpecialOrder(order.id);
                                                                    }
                                                                }}
                                                                className="bg-white border border-stone-200 text-stone-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 py-2 px-3 rounded-xl transition-all"
                                                                title="ยกเลิก"
                                                            >
                                                                <X size={18} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
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
            {showAddPromoModal && (
                <AddPromotionModal isOpen={true} onClose={() => setShowAddPromoModal(false)} />
            )}
            {showAddBundleModal && (
                <AddSpecialOrderModal isOpen={true} onClose={() => setShowAddBundleModal(false)} mode="bundle" />
            )}
            {showAddOrderModal && (
                <AddSpecialOrderModal isOpen={true} onClose={() => setShowAddOrderModal(false)} mode="order" />
            )}
            {showBundleOrderModal && (
                <CreateBundleOrderModal isOpen={true} onClose={() => setShowBundleOrderModal(false)} />
            )}
            {editingPromotion && (
                <AddPromotionModal
                    isOpen={true}
                    onClose={() => setEditingPromotion(null)}
                    editingPromotion={editingPromotion}
                />
            )}
        </div >
    );
};

export default PromotionPage;
