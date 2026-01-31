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
    Scissors,
    FileText,
    ClipboardList,
    Receipt,
    RefreshCw
} from 'lucide-react';
import { Promotion, Bundle, SpecialOrder, SpecialOrderStatus } from '../../../types';
import { AddPromotionModal } from './AddPromotionModal';
import { AddSpecialOrderModal } from './AddSpecialOrderModal';
import { CreateBundleOrderModal } from './CreateBundleOrderModal';
import { PromotionOrderList } from '../PromotionOrder';
import { QuotationList } from '../Quotation';
import { SnackBoxManager } from '../SnackBox';
import { InvoiceList } from '../Invoice';
import { ReceiptList } from '../Receipt';

type Tab = 'snackbox' | 'promoOrders' | 'quotations' | 'invoices' | 'receipts';

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

    const [activeTab, setActiveTab] = useState<Tab>('snackbox');
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
    const unsyncedOrders = deliveredOrders.filter(o => {
        const expectedSource = `special_order:${o.orderNumber}`;
        const hasProfit = useStore.getState().unallocatedProfits.some(p => p.source === expectedSource);
        return !hasProfit;
    });

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
        { id: 'snackbox' as Tab, label: 'Snack Box', icon: Package, count: 0 },
        { id: 'promoOrders' as Tab, label: 'ออเดอร์โปรโมชั่น', icon: ClipboardList, count: 0 },
        { id: 'quotations' as Tab, label: 'ใบเสนอราคา', icon: FileText, count: 0 },
        { id: 'invoices' as Tab, label: 'ใบแจ้งหนี้', icon: FileText, count: 0 },
        { id: 'receipts' as Tab, label: 'ใบเสร็จ', icon: Receipt, count: 0 }
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
                    {unsyncedOrders.length > 0 && (
                        <button
                            onClick={handleSyncProfits}
                            disabled={isSyncing}
                            className={`
                                group relative px-5 py-2.5 rounded-2xl font-bold text-sm transition-all duration-300 shadow-lg hover:shadow-xl active:scale-95 flex items-center gap-2.5 overflow-hidden
                                ${isSyncing
                                    ? 'bg-stone-100 text-stone-400 cursor-not-allowed border border-stone-200'
                                    : 'bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 text-white hover:from-emerald-400 hover:via-teal-400 hover:to-emerald-500 ring-4 ring-emerald-100 border border-emerald-400/20'
                                }
                            `}
                            title="ดึงยอดเงินจากออเดอร์ที่ส่งมอบแล้วเข้าสู่ระบบจัดสรร"
                        >
                            <div className={`relative p-1.5 rounded-full ${isSyncing ? 'bg-stone-200' : 'bg-white/20 group-hover:bg-white/30'} transition-colors`}>
                                <RefreshCw size={18} className={isSyncing ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-700'} />
                                {!isSyncing && (
                                    <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-yellow-300 rounded-full animate-pulse shadow-[0_0_8px_rgba(253,224,71,0.8)]" />
                                )}
                            </div>
                            <div className="flex flex-col items-start leading-tight">
                                <span className="text-[10px] opacity-90 font-medium uppercase tracking-wider">
                                    {isSyncing ? 'Processing...' : 'Ready to Sync'}
                                </span>
                                <span className="text-sm font-black tracking-wide">
                                    {isSyncing ? 'กำลังซิงค์...' : `ดึงกำไร ${unsyncedOrders.length} รายการ`}
                                </span>
                            </div>

                            {/* Decorative Sheen */}
                            {!isSyncing && (
                                <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12" />
                            )}
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
                    {/* Snack Box Tab */}
                    {activeTab === 'snackbox' && (
                        <div className="animate-in fade-in duration-300">
                            <SnackBoxManager />
                        </div>
                    )}

                    {/* Promotion Orders Tab */}
                    {activeTab === 'promoOrders' && (
                        <div className="animate-in fade-in duration-300">
                            <PromotionOrderList />
                        </div>
                    )}

                    {/* Quotations Tab */}
                    {activeTab === 'quotations' && (
                        <div className="animate-in fade-in duration-300">
                            <QuotationList />
                        </div>
                    )}

                    {/* Invoices Tab */}
                    {activeTab === 'invoices' && (
                        <div className="animate-in fade-in duration-300">
                            <InvoiceList />
                        </div>
                    )}

                    {/* Receipts Tab */}
                    {activeTab === 'receipts' && (
                        <div className="animate-in fade-in duration-300">
                            <ReceiptList />
                        </div>
                    )}
                </div>
            </div>

            {/* Modals */}
            {showAddPromoModal && (
                <AddPromotionModal isOpen={true} onClose={() => setShowAddPromoModal(false)} />
            )}
            {editingPromotion && (
                <AddPromotionModal
                    isOpen={true}
                    onClose={() => setEditingPromotion(null)}
                    editingPromotion={editingPromotion}
                />
            )}
        </div>
    );
};

export default PromotionPage;

