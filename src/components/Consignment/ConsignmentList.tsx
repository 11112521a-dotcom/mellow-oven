import React, { useState, useEffect } from 'react';
import { useStore } from '../../store';
import { Store, Plus, Search, Check, Package, MapPin, Phone, Truck, Clock, AlertCircle, BarChart3, ChevronRight, Printer } from 'lucide-react';
import { ConsignmentOrderStatus, ConsignmentOrder } from '../../../types';
import { CreateConsignmentModal } from './CreateConsignmentModal';
import { ConsignmentSettleModal } from './ConsignmentSettleModal';
import { ExternalShopsManagerModal } from './ExternalShopsManagerModal';
import { ConsignmentDashboard } from './ConsignmentDashboard';
import { ConsignmentPendingStock } from './ConsignmentPendingStock';
import { ConsignmentDetailsModal } from './ConsignmentDetailsModal';
import { ConsignmentThermalReceipt } from './ConsignmentThermalReceipt';

const statusConfig: Record<ConsignmentOrderStatus, { label: string; color: string; icon: React.ReactNode }> = {
    pending: { label: 'รอส่ง', color: 'bg-yellow-50 text-yellow-700 border-yellow-100', icon: <Clock className="w-3.5 h-3.5" /> },
    shipped: { label: 'ส่งแล้ว', color: 'bg-blue-50 text-blue-700 border-blue-100', icon: <Truck className="w-3.5 h-3.5" /> },
    settled: { label: 'เคลียร์ยอดแล้ว', color: 'bg-emerald-50 text-emerald-700 border-emerald-100', icon: <Check className="w-3.5 h-3.5" /> },
    cancelled: { label: 'ยกเลิก', color: 'bg-rose-50 text-rose-700 border-rose-100', icon: <AlertCircle className="w-3.5 h-3.5" /> }
};

const formatDateSafe = (dateVal: any) => {
    if (!dateVal) return '-';
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
};

export const ConsignmentList: React.FC = () => {
    const { consignmentOrders, isLoadingConsignments, fetchConsignmentOrders, fetchExternalShops, updateConsignmentOrderStatus, externalShops } = useStore();
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<ConsignmentOrderStatus | 'all'>('all');
    const [shopFilter, setShopFilter] = useState<string>('all');
    const [activeTab, setActiveTab] = useState<'dashboard' | 'bills' | 'shops' | 'stock'>('dashboard');
    
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [createModalInitialData, setCreateModalInitialData] = useState<{ shopId: string; items: any[] } | null>(null);
    const [settleOrder, setSettleOrder] = useState<ConsignmentOrder | null>(null);
    const [selectedOrder, setSelectedOrder] = useState<ConsignmentOrder | null>(null);
    const [printReceiptOrder, setPrintReceiptOrder] = useState<ConsignmentOrder | null>(null);

    useEffect(() => {
        fetchConsignmentOrders();
        fetchExternalShops();
    }, []);

    const handleOpenNextDayBill = (shopId: string, items: any[]) => {
        setCreateModalInitialData({ shopId, items });
        setShowCreateModal(true);
    };

    const filteredOrders = consignmentOrders.filter(order => {
        const matchesSearch = order.shopName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
        const matchesShop = shopFilter === 'all' || order.shopId === shopFilter;
        return matchesSearch && matchesStatus && matchesShop;
    });

    return (
        <div className="space-y-6">
            {/* Tab Navigation */}
            <div className="flex border-b border-stone-200 gap-2 sm:gap-6 overflow-x-auto scrollbar-none pb-px bg-white/60 backdrop-blur p-2 rounded-2xl shadow-sm border">
                {[
                    { id: 'dashboard' as const, label: 'แดชบอร์ด & วิเคราะห์', icon: BarChart3 },
                    { id: 'stock' as const, label: 'สต็อกคงค้าง', icon: Package },
                    { id: 'bills' as const, label: 'บิลฝากขายทั้งหมด', icon: Package },
                    { id: 'shops' as const, label: 'สาขา & ร้านค้า', icon: Store },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`py-2 px-4 text-sm font-bold flex items-center gap-2 rounded-xl transition-all min-h-[40px] cursor-pointer ${activeTab === tab.id
                            ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
                            : 'text-stone-500 hover:bg-stone-100 hover:text-stone-700'
                            }`}
                    >
                        <tab.icon size={16} />
                        <span className="whitespace-nowrap">{tab.label}</span>
                        {tab.id === 'bills' && consignmentOrders.length > 0 && (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${activeTab === 'bills' ? 'bg-white text-emerald-600' : 'bg-stone-200 text-stone-600'}`}>
                                {consignmentOrders.length}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Tab Contents */}
            {activeTab === 'dashboard' && (
                <ConsignmentDashboard />
            )}

            {activeTab === 'stock' && (
                <ConsignmentPendingStock onOpenNextDayBill={handleOpenNextDayBill} />
            )}

            {activeTab === 'shops' && (
                <div className="animate-in fade-in duration-300">
                    <ExternalShopsManagerModal isModal={false} />
                </div>
            )}

            {activeTab === 'bills' && (
                <div className="space-y-6 animate-in fade-in duration-300">
                    {/* Header Controls */}
                    <div className="flex flex-col md:flex-row justify-between gap-4">
                        <div className="flex flex-col sm:flex-row gap-3 flex-grow md:max-w-3xl">
                            <div className="relative flex-grow">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="ค้นหาชื่อร้าน หรือ เลขที่บิล..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-base md:text-sm bg-white"
                                />
                            </div>
                            <select
                                value={shopFilter}
                                onChange={(e) => setShopFilter(e.target.value)}
                                className="px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 text-base md:text-sm bg-white font-medium min-w-[150px]"
                            >
                                <option value="all">ทุกสาขา / ร้านค้า</option>
                                {externalShops.map(s => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                            </select>
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value as any)}
                                className="px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 text-base md:text-sm bg-white font-medium min-w-[140px]"
                            >
                                <option value="all">ทุกสถานะ</option>
                                <option value="pending">รอส่ง (Pending)</option>
                                <option value="shipped">ส่งแล้ว (Shipped)</option>
                                <option value="settled">เคลียร์ยอดแล้ว (Settled)</option>
                                <option value="cancelled">ยกเลิก (Cancelled)</option>
                            </select>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setActiveTab('shops')}
                                className="px-5 py-2.5 bg-stone-100 text-stone-700 font-bold rounded-xl hover:bg-stone-200 transition-colors flex items-center justify-center gap-2 min-h-[44px] flex-1 sm:flex-none text-base md:text-sm"
                            >
                                <Store className="w-5 h-5 text-stone-500" />
                                จัดการสาขา
                            </button>
                            <button
                                onClick={() => setShowCreateModal(true)}
                                className="px-6 py-2.5 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 min-h-[44px] flex-grow sm:flex-none text-base md:text-sm hover:-translate-y-0.5 active:translate-y-0"
                            >
                                <Plus className="w-5 h-5" />
                                เปิดบิลฝากขาย
                            </button>
                        </div>
                    </div>

                    {/* Bills Grid */}
                    {isLoadingConsignments ? (
                        <div className="flex justify-center py-20 text-gray-400">
                            <Clock className="w-6 h-6 animate-spin mr-2" /> กำลังโหลดข้อมูล...
                        </div>
                    ) : filteredOrders.length === 0 ? (
                        <div className="text-center py-20 bg-white rounded-3xl border border-stone-200 shadow-sm">
                            <Store className="w-16 h-16 text-stone-300 mx-auto mb-4" />
                            <p className="text-stone-800 font-bold text-lg">ไม่พบบิลฝากขาย</p>
                            <p className="text-stone-400 text-sm mt-1">ลองเปลี่ยนเงื่อนไขค้นหา หรือสร้างบิลใหม่</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                            {filteredOrders.map(order => (
                                <div 
                                    key={order.id} 
                                    onClick={() => setSelectedOrder(order)}
                                    className="bg-white rounded-3xl border border-stone-200 p-5 shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 flex flex-col group cursor-pointer"
                                >
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h3 className="font-bold text-lg text-stone-800 flex items-center gap-1.5 group-hover:text-emerald-600 transition-colors">
                                                🏪
                                                {order.shopName}
                                            </h3>
                                            <p className="text-xs font-semibold text-stone-400 mt-0.5">{order.orderNumber}</p>
                                        </div>
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 border ${statusConfig[order.status].color}`}>
                                            {statusConfig[order.status].icon}
                                            {statusConfig[order.status].label}
                                        </span>
                                    </div>

                                    <div className="space-y-2.5 mb-5 flex-1">
                                        <div className="flex items-center gap-2 text-xs text-stone-500 font-medium">
                                            <Clock className="w-4 h-4 text-stone-400" />
                                            <span>วันที่ส่ง: {formatDateSafe(order.deliveryDate)}</span>
                                        </div>
                                        {order.settleDate && (
                                            <div className="flex items-center gap-2 text-xs text-stone-500 font-medium">
                                                <Check className="w-4 h-4 text-emerald-500" />
                                                <span>เคลียร์ยอด: {formatDateSafe(order.settleDate)}</span>
                                            </div>
                                        )}
                                        <div className="flex items-center gap-2 text-xs text-stone-500 font-medium">
                                            <Package className="w-4 h-4 text-stone-400" />
                                            <span>จำนวนส่ง: <strong className="text-stone-700 font-bold">{order.totalQuantitySent}</strong> ชิ้น</span>
                                        </div>
                                        {order.status === 'settled' && (
                                            <div className="p-3 bg-stone-50 rounded-2xl border border-stone-100 mt-3 space-y-1.5">
                                                <div className="flex justify-between text-xs font-medium">
                                                    <span className="text-stone-400">คืน / เสีย / แจก</span>
                                                    <span className="font-bold text-stone-500">
                                                        {order.totalQuantityReturned} / {order.totalQuantityWaste} / {order.totalQuantityGiveaway} ชิ้น
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex gap-2 mt-auto pt-4 border-t border-stone-100" onClick={e => e.stopPropagation()}>
                                        <button
                                            onClick={() => setSelectedOrder(order)}
                                            className="flex-1 py-2 bg-stone-50 text-stone-600 hover:bg-stone-100 rounded-xl text-xs font-bold transition-all min-h-[38px] flex items-center justify-center gap-1"
                                        >
                                            รายละเอียด
                                            <ChevronRight size={14} />
                                        </button>

                                        <button
                                            onClick={() => setPrintReceiptOrder(order)}
                                            className="py-2 px-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl text-xs font-bold transition-all min-h-[38px] flex items-center justify-center gap-1 border border-stone-200"
                                            title="พิมพ์สลิปส่งของ 57mm"
                                        >
                                            <Printer className="w-3.5 h-3.5 text-emerald-600" />
                                            <span>สลิป</span>
                                        </button>

                                        {order.status === 'pending' && (
                                            <button
                                                onClick={() => updateConsignmentOrderStatus(order.id, 'shipped')}
                                                className="flex-1 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl text-xs font-bold transition-all min-h-[38px] flex items-center justify-center gap-1 border border-blue-200"
                                            >
                                                <Truck className="w-3.5 h-3.5" />
                                                บันทึกส่งของ
                                            </button>
                                        )}
                                        {order.status === 'shipped' && (
                                            <button
                                                onClick={() => setSettleOrder(order)}
                                                className="flex-1 py-2 bg-emerald-500 text-white hover:bg-emerald-600 rounded-xl text-xs font-bold transition-all min-h-[38px] flex items-center justify-center gap-1 shadow-md shadow-emerald-500/10"
                                            >
                                                <Check className="w-3.5 h-3.5" />
                                                เคลียร์ยอดบิล
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
            
            {/* Modals */}
            {showCreateModal && (
                <CreateConsignmentModal
                    onClose={() => {
                        setShowCreateModal(false);
                        setCreateModalInitialData(null);
                    }}
                    initialShopId={createModalInitialData?.shopId}
                    initialCarryOverItems={createModalInitialData?.items}
                />
            )}
            
            {settleOrder && (
                <ConsignmentSettleModal
                    order={settleOrder}
                    onClose={() => setSettleOrder(null)}
                />
            )}

            {selectedOrder && (
                <ConsignmentDetailsModal
                    order={selectedOrder}
                    onClose={() => setSelectedOrder(null)}
                    onSettleClick={(ord) => {
                        setSelectedOrder(null);
                        setSettleOrder(ord);
                    }}
                />
            )}

            {printReceiptOrder && (
                <ConsignmentThermalReceipt
                    order={printReceiptOrder}
                    onClose={() => setPrintReceiptOrder(null)}
                />
            )}
        </div>
    );
};
