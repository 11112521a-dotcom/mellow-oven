import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Store, Tag, Plus, Minus, Trash2, Search } from 'lucide-react';
import { useStore } from '../../store';
import { ConsignmentOrderStatus } from '../../../types';

interface CreateConsignmentModalProps {
    onClose: () => void;
}

export const CreateConsignmentModal: React.FC<CreateConsignmentModalProps> = ({ onClose }) => {
    const { products, externalShops, createConsignmentOrder } = useStore();
    
    const [selectedShopId, setSelectedShopId] = useState('');
    const [shopName, setShopName] = useState('');
    const [contactName, setContactName] = useState('');
    const [contactPhone, setContactPhone] = useState('');
    const [deliveryDate, setDeliveryDate] = useState(new Date().toISOString().split('T')[0]);
    const [notes, setNotes] = useState('');
    
    const [items, setItems] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedProductId, setSelectedProductId] = useState('');
    const [selectedVariantId, setSelectedVariantId] = useState('');
    const [quantity, setQuantity] = useState('1');
    const [unitPrice, setUnitPrice] = useState('');
    
    const [isSubmitting, setIsSubmitting] = useState(false);

    const activeProducts = useMemo(() => {
        return products.filter(p => p.isActive !== false);
    }, [products]);

    // Filter products by search term
    const filteredProducts = useMemo(() => {
        if (!searchTerm.trim()) return activeProducts;
        const lowerSearch = searchTerm.toLowerCase();
        return activeProducts.filter(p => 
            p.name.toLowerCase().includes(lowerSearch)
        );
    }, [activeProducts, searchTerm]);

    const selectedProduct = useMemo(() => {
        return products.find(p => p.id === selectedProductId);
    }, [products, selectedProductId]);

    const handleAddItem = () => {
        if (!selectedProduct) return;
        
        let vName = '';
        let cost = selectedProduct.cost;
        
        if (selectedVariantId) {
            const variant = selectedProduct.variants?.find(v => v.id === selectedVariantId);
            if (variant) {
                vName = variant.name;
                cost = variant.cost;
            }
        }
        
        const price = parseFloat(unitPrice) || selectedProduct.price;
        const qty = parseInt(quantity) || 1;

        setItems([...items, {
            id: Math.random().toString(), // temporary id
            productId: selectedProduct.id,
            variantId: selectedVariantId || null,
            productName: selectedProduct.name,
            variantName: vName || null,
            quantitySent: qty,
            unitPrice: price,
            unitCost: cost,
            sortOrder: items.length
        }]);

        setSelectedProductId('');
        setSelectedVariantId('');
        setQuantity('1');
        setUnitPrice('');
        setSearchTerm('');
    };

    const handleShopChange = (shopId: string) => {
        const shop = externalShops.find(s => s.id === shopId);
        if (!shop) {
            setSelectedShopId('');
            setShopName('');
            setContactName('');
            setContactPhone('');
            return;
        }

        setSelectedShopId(shop.id);
        setShopName(shop.name);
        setContactName(shop.contactName || '');
        setContactPhone(shop.contactPhone || '');

        // Auto-load favorite items if they exist
        if (shop.favoriteItems && shop.favoriteItems.length > 0) {
            const newItems: any[] = [];
            shop.favoriteItems.forEach(fav => {
                const product = products.find(p => p.id === fav.productId);
                if (!product) return;
                
                let vName = '';
                let cost = product.cost;
                if (fav.variantId) {
                    const variant = product.variants?.find(v => v.id === fav.variantId);
                    if (variant) {
                        vName = variant.name;
                        cost = variant.cost;
                    }
                }
                
                newItems.push({
                    id: Math.random().toString(),
                    productId: product.id,
                    variantId: fav.variantId || null,
                    productName: product.name,
                    variantName: vName || null,
                    quantitySent: fav.defaultQty || 1,
                    unitPrice: fav.defaultPrice !== undefined ? fav.defaultPrice : product.price,
                    unitCost: cost,
                    sortOrder: newItems.length
                });
            });
            setItems(newItems);
        } else {
            setItems([]);
        }
    };

    const handleRemoveItem = (index: number) => {
        setItems(items.filter((_, i) => i !== index));
    };

    const handleSubmit = async () => {
        if (!selectedShopId || items.length === 0) return;
        
        setIsSubmitting(true);
        try {
            const totalQuantitySent = items.reduce((sum, item) => sum + item.quantitySent, 0);
            const totalCost = items.reduce((sum, item) => sum + (item.unitCost * item.quantitySent), 0);
            
            const orderNumber = `CS${new Date().getFullYear()}${(new Date().getMonth()+1).toString().padStart(2,'0')}${Math.floor(Math.random()*10000).toString().padStart(4,'0')}`;
            
            await createConsignmentOrder({
                orderNumber,
                shopId: selectedShopId,
                shopName: shopName,
                contactName,
                contactPhone,
                deliveryDate,
                settleDate: null,
                totalQuantitySent,
                totalQuantitySold: 0,
                totalQuantityWaste: 0,
                totalQuantityReturned: 0,
                totalQuantityGiveaway: 0,
                totalRevenue: 0,
                totalCost,
                totalProfit: 0,
                notes,
                status: 'pending' as ConsignmentOrderStatus
            }, items);
            
            onClose();
        } catch (error) {
            console.error('Failed to create consignment:', error);
            alert('เกิดข้อผิดพลาดในการสร้างบิล');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Calculate Summary stats
    const summaryStats = useMemo(() => {
        return items.reduce((acc, item) => {
            const qty = item.quantitySent || 0;
            const cost = item.unitCost || 0;
            const price = item.unitPrice || 0;
            
            acc.totalQty += qty;
            acc.totalCost += cost * qty;
            acc.totalRevenue += price * qty;
            acc.totalProfit += (price - cost) * qty;
            
            return acc;
        }, { totalQty: 0, totalCost: 0, totalRevenue: 0, totalProfit: 0 });
    }, [items]);

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-stone-900/60 backdrop-blur-sm"
                    onClick={onClose}
                />
                
                <motion.div
                    initial={{ opacity: 0, y: 50, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 50, scale: 0.95 }}
                    transition={{ type: "spring", damping: 25, stiffness: 350 }}
                    className="relative w-full max-w-4xl h-[90vh] md:h-auto max-h-[92dvh] md:max-h-[85vh] bg-white rounded-t-3xl md:rounded-3xl shadow-2xl overflow-hidden flex flex-col z-10"
                >
                    {/* Header */}
                    <div className="bg-emerald-600 p-6 flex justify-between items-center text-white shrink-0">
                        <div>
                            <h2 className="text-2xl font-bold flex items-center gap-2">
                                <Store className="w-6 h-6" />
                                เปิดบิลส่งสินค้าฝากขาย / สาขา
                            </h2>
                            <p className="text-emerald-100 mt-1 text-xs sm:text-sm font-semibold">บันทึกการส่งสินค้าไปจำหน่ายที่หน้าร้านสาขา/ร้านค้าภายนอก</p>
                        </div>
                        <button onClick={onClose} className="p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center hover:bg-emerald-700 rounded-xl transition-colors">
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-5 space-y-6">
                        {/* Shop Details */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-stone-50/50 p-4 rounded-2xl border border-stone-200">
                            <div>
                                <label className="block text-xs font-bold text-stone-500 mb-1">เลือกร้าน / สาขาปลายทาง <span className="text-red-500">*</span></label>
                                <select
                                    value={selectedShopId}
                                    onChange={e => handleShopChange(e.target.value)}
                                    className="w-full px-4 py-2.5 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-base md:text-sm bg-white font-medium"
                                >
                                    <option value="">-- เลือกร้านค้า / สาขา --</option>
                                    {externalShops.map(s => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-stone-500 mb-1">วันที่จัดส่ง <span className="text-red-500">*</span></label>
                                <input
                                    type="date"
                                    value={deliveryDate}
                                    onChange={e => setDeliveryDate(e.target.value)}
                                    className="w-full px-4 py-2.5 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-base md:text-sm bg-white font-medium"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-stone-500 mb-1">ชื่อผู้รับสาย / ผู้ติดต่อ</label>
                                <input
                                    type="text"
                                    value={contactName}
                                    onChange={e => setContactName(e.target.value)}
                                    className="w-full px-4 py-2.5 border border-stone-200 rounded-xl text-base md:text-sm bg-white"
                                    placeholder="ระบุชื่อผู้ติดต่อ (ถ้ามี)"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-stone-500 mb-1">เบอร์โทรศัพท์ติดต่อ</label>
                                <input
                                    type="text"
                                    value={contactPhone}
                                    onChange={e => setContactPhone(e.target.value)}
                                    className="w-full px-4 py-2.5 border border-stone-200 rounded-xl text-base md:text-sm bg-white"
                                    placeholder="ระบุเบอร์โทรศัพท์ (ถ้ามี)"
                                />
                            </div>
                        </div>

                        <hr className="border-stone-100" />

                        {/* Add Items Box */}
                        <div>
                            <h3 className="font-bold text-lg text-stone-800 mb-3">ค้นหาและเพิ่มรายการสินค้า</h3>
                            
                            <div className="bg-stone-50 p-4 rounded-2xl border border-stone-200 flex flex-col gap-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                                    {/* Search input to filter dropdown */}
                                    <div className="flex flex-col">
                                        <label className="block text-xs font-semibold text-stone-550 mb-1">พิมพ์เพื่อค้นหา</label>
                                        <div className="relative">
                                            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                            <input
                                                type="text"
                                                placeholder="ค้นชื่อสินค้า..."
                                                value={searchTerm}
                                                onChange={e => setSearchTerm(e.target.value)}
                                                className="w-full pl-9 pr-3 py-2 border border-stone-300 rounded-xl text-base md:text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                                            />
                                        </div>
                                    </div>

                                    {/* Select Product */}
                                    <div className="flex flex-col">
                                        <label className="block text-xs font-semibold text-stone-550 mb-1">เลือกสินค้า ({filteredProducts.length})</label>
                                        <select
                                            value={selectedProductId}
                                            onChange={e => {
                                                setSelectedProductId(e.target.value);
                                                setSelectedVariantId('');
                                                const p = products.find(x => x.id === e.target.value);
                                                if (p) {
                                                    const shop = externalShops.find(s => s.id === selectedShopId);
                                                    const fav = shop?.favoriteItems?.find(f => f.productId === p.id && !f.variantId);
                                                    const price = fav?.defaultPrice !== undefined ? fav.defaultPrice : p.price;
                                                    setUnitPrice(price.toString());
                                                    if (fav?.defaultQty) setQuantity(fav.defaultQty.toString());
                                                }
                                            }}
                                            className="w-full px-3 py-2 border border-stone-300 rounded-xl text-base md:text-sm bg-white"
                                        >
                                            <option value="">-- เลือกรายการสินค้า --</option>
                                            {filteredProducts.map(p => (
                                                <option key={p.id} value={p.id}>{p.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    
                                    {/* Select Variant (If exists) */}
                                    {selectedProductId && selectedProduct?.variants?.length ? (
                                        <div className="flex flex-col">
                                            <label className="block text-xs font-semibold text-stone-550 mb-1">ตัวเลือกขนาด/รสชาติ</label>
                                            <select
                                                value={selectedVariantId}
                                                onChange={e => {
                                                    setSelectedVariantId(e.target.value);
                                                    const v = selectedProduct.variants?.find(x => x.id === e.target.value);
                                                    if (v) {
                                                        const shop = externalShops.find(s => s.id === selectedShopId);
                                                        const fav = shop?.favoriteItems?.find(f => f.productId === selectedProductId && f.variantId === v.id);
                                                        const price = fav?.defaultPrice !== undefined ? fav.defaultPrice : v.price;
                                                        setUnitPrice(price.toString());
                                                        if (fav?.defaultQty) setQuantity(fav.defaultQty.toString());
                                                    }
                                                }}
                                                className="w-full px-3 py-2 border border-stone-300 rounded-xl text-base md:text-sm bg-white"
                                            >
                                                <option value="">-- เลือกตัวเลือก --</option>
                                                {selectedProduct.variants.map(v => (
                                                    <option key={v.id} value={v.id}>{v.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    ) : null}

                                    {/* Price and Quantity */}
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="flex flex-col">
                                            <label className="block text-xs font-semibold text-stone-550 mb-1">จำนวนส่ง</label>
                                            <input
                                                type="number"
                                                min="1"
                                                value={quantity}
                                                onChange={e => setQuantity(e.target.value)}
                                                className="w-full px-3 py-2 border border-stone-300 rounded-xl text-base md:text-sm text-center font-bold"
                                            />
                                        </div>

                                        <div className="flex flex-col">
                                            <label className="block text-xs font-semibold text-stone-550 mb-1">ราคาฝากขาย</label>
                                            <input
                                                type="number"
                                                min="0"
                                                value={unitPrice}
                                                onChange={e => setUnitPrice(e.target.value)}
                                                className="w-full px-3 py-2 border border-stone-300 rounded-xl text-base md:text-sm text-right font-bold text-emerald-600"
                                                placeholder="ราคาปกติ"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-end pt-1">
                                    <button
                                        type="button"
                                        onClick={handleAddItem}
                                        disabled={!selectedProductId}
                                        className="px-6 py-2.5 bg-stone-800 text-white rounded-xl hover:bg-stone-900 disabled:opacity-50 font-bold flex items-center justify-center gap-2 min-h-[44px] w-full sm:w-auto text-base md:text-sm"
                                    >
                                        <Plus size={18} />
                                        เพิ่มเข้ารายการส่ง
                                    </button>
                                </div>
                            </div>

                            {/* Added items list */}
                            <div className="mt-4">
                                <h4 className="font-bold text-stone-700 mb-2 flex items-center justify-between text-sm">
                                    <span>รายการสินค้าส่งไปขาย ({items.length} รายการ)</span>
                                    {items.length > 0 && (
                                        <button 
                                            type="button" 
                                            onClick={() => setItems([])} 
                                            className="text-xs text-rose-500 font-bold hover:underline"
                                        >
                                            ล้างรายการทั้งหมด
                                        </button>
                                    )}
                                </h4>

                                {/* Desktop Table View */}
                                {items.length > 0 ? (
                                    <>
                                        <div className="hidden md:block border border-stone-200 rounded-2xl overflow-hidden shadow-sm bg-white">
                                            <table className="w-full text-left text-sm">
                                                <thead className="bg-stone-50 border-b border-stone-200 text-stone-600">
                                                    <tr>
                                                        <th className="px-4 py-3 font-semibold">สินค้า</th>
                                                        <th className="px-4 py-3 font-semibold text-center w-36">จำนวนส่ง</th>
                                                        <th className="px-4 py-3 font-semibold text-right w-36">ราคาฝากขาย/ชิ้น</th>
                                                        <th className="px-4 py-3 font-semibold text-right w-32">รวมราคาส่ง</th>
                                                        <th className="px-4 py-3 font-semibold text-center w-20">ลบ</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-stone-100">
                                                    {items.map((item, index) => (
                                                        <tr key={item.id || index} className="hover:bg-stone-50">
                                                            <td className="px-4 py-3">
                                                                <div className="font-bold text-stone-850">{item.productName}</div>
                                                                {item.variantName && <div className="text-xs text-stone-500 font-semibold">{item.variantName}</div>}
                                                                <div className="text-[10px] text-stone-400 mt-0.5">ทุน: ฿{item.unitCost}</div>
                                                            </td>
                                                            <td className="px-4 py-3 text-center">
                                                                <div className="flex items-center justify-center border border-stone-200 rounded-lg max-w-[120px] mx-auto bg-white overflow-hidden">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            const newItems = [...items];
                                                                            newItems[index].quantitySent = Math.max(1, (newItems[index].quantitySent || 1) - 1);
                                                                            setItems(newItems);
                                                                        }}
                                                                        className="p-1 hover:bg-stone-150 text-stone-500"
                                                                    >
                                                                        <Minus size={14} />
                                                                    </button>
                                                                    <input
                                                                        type="number"
                                                                        min="1"
                                                                        value={item.quantitySent}
                                                                        onChange={e => {
                                                                            const newItems = [...items];
                                                                            newItems[index].quantitySent = Math.max(1, parseInt(e.target.value) || 1);
                                                                            setItems(newItems);
                                                                        }}
                                                                        className="w-12 text-center border-none focus:ring-0 font-bold p-0 text-stone-800 text-sm bg-transparent"
                                                                    />
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => {
                                                                            const newItems = [...items];
                                                                            newItems[index].quantitySent = (newItems[index].quantitySent || 1) + 1;
                                                                            setItems(newItems);
                                                                        }}
                                                                        className="p-1 hover:bg-stone-150 text-stone-500"
                                                                    >
                                                                        <Plus size={14} />
                                                                    </button>
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-3 text-right">
                                                                <div className="flex items-center justify-end gap-1">
                                                                    <span className="text-stone-400 font-bold">฿</span>
                                                                    <input
                                                                        type="number"
                                                                        min="0"
                                                                        value={item.unitPrice}
                                                                        onChange={e => {
                                                                            const newItems = [...items];
                                                                            newItems[index].unitPrice = Number(e.target.value);
                                                                            setItems(newItems);
                                                                        }}
                                                                        className="w-20 px-2 py-1 text-right border border-emerald-200 bg-emerald-50 focus:bg-white rounded-lg font-bold text-emerald-700 text-sm"
                                                                    />
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-3 text-right font-black text-stone-800">
                                                                ฿{(item.unitPrice * item.quantitySent).toLocaleString()}
                                                            </td>
                                                            <td className="px-4 py-3 text-center">
                                                                <button onClick={() => handleRemoveItem(index)} className="text-rose-500 hover:text-rose-700 p-1">
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>

                                        {/* Mobile view - Product Cards List */}
                                        <div className="space-y-3 md:hidden">
                                            {items.map((item, index) => (
                                                <div key={item.id || index} className="bg-stone-50 border border-stone-200 rounded-2xl p-4 space-y-3 shadow-sm">
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <h4 className="font-bold text-stone-850">{item.productName}</h4>
                                                            {item.variantName && <p className="text-xs text-stone-400 font-semibold">{item.variantName}</p>}
                                                            <p className="text-[10px] text-stone-400 mt-1">ราคาทุน: ฿{item.unitCost} / ชิ้น</p>
                                                        </div>
                                                        <button 
                                                            onClick={() => handleRemoveItem(index)} 
                                                            className="text-rose-500 hover:text-rose-750 p-2 rounded-xl hover:bg-rose-50 min-h-[40px] min-w-[40px] flex items-center justify-center shrink-0"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                    
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div>
                                                            <label className="block text-[10px] font-bold text-stone-450 uppercase mb-1">จำนวนส่ง</label>
                                                            <div className="flex items-center border border-stone-200 rounded-xl bg-white overflow-hidden max-w-full">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        const newItems = [...items];
                                                                        newItems[index].quantitySent = Math.max(1, (newItems[index].quantitySent || 1) - 1);
                                                                        setItems(newItems);
                                                                    }}
                                                                    className="px-3 py-2 hover:bg-stone-100 text-stone-500 min-h-[40px]"
                                                                >
                                                                    <Minus size={12} />
                                                                </button>
                                                                <input
                                                                    type="number"
                                                                    min="1"
                                                                    value={item.quantitySent}
                                                                    onChange={e => {
                                                                        const newItems = [...items];
                                                                        newItems[index].quantitySent = Math.max(1, parseInt(e.target.value) || 1);
                                                                        setItems(newItems);
                                                                    }}
                                                                    className="w-full text-center border-none focus:ring-0 font-black text-base text-stone-800 p-0"
                                                                />
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        const newItems = [...items];
                                                                        newItems[index].quantitySent = (newItems[index].quantitySent || 1) + 1;
                                                                        setItems(newItems);
                                                                    }}
                                                                    className="px-3 py-2 hover:bg-stone-100 text-stone-500 min-h-[40px]"
                                                                >
                                                                    <Plus size={12} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <label className="block text-[10px] font-bold text-stone-450 uppercase mb-1">ราคาฝากขาย (฿)</label>
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                value={item.unitPrice}
                                                                onChange={e => {
                                                                    const newItems = [...items];
                                                                    newItems[index].unitPrice = Number(e.target.value);
                                                                    setItems(newItems);
                                                                }}
                                                                className="w-full px-3 py-2 border border-emerald-300 rounded-xl focus:ring-2 focus:ring-emerald-500 bg-emerald-50/50 font-bold text-base text-emerald-700"
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="flex justify-between items-center pt-2.5 border-t border-stone-200 text-xs">
                                                        <span className="text-stone-450 font-semibold">
                                                            ต้นทุนรวม: <strong className="text-stone-700 font-bold">฿{(item.unitCost * item.quantitySent).toLocaleString()}</strong>
                                                        </span>
                                                        <span className="text-stone-450 font-semibold">
                                                            ราคารวม: <strong className="text-emerald-600 font-bold">฿{(item.unitPrice * item.quantitySent).toLocaleString()}</strong>
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                ) : (
                                    <div className="text-center py-12 text-stone-400 bg-stone-50 rounded-2xl border border-dashed border-stone-200 font-medium">
                                        ยังไม่มีรายการสินค้าถูกส่งไปขาย
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Summary Metrics & Financial Estimates */}
                        {items.length > 0 && (
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-stone-50 p-4 rounded-2xl border border-stone-200 shadow-sm">
                                <div className="text-center p-2 bg-white rounded-xl border border-stone-100">
                                    <p className="text-[10px] sm:text-xs text-stone-450 font-bold uppercase">จำนวนส่งทั้งหมด</p>
                                    <p className="text-base sm:text-lg font-black text-stone-850 mt-0.5">{summaryStats.totalQty.toLocaleString()} ชิ้น</p>
                                </div>
                                <div className="text-center p-2 bg-white rounded-xl border border-stone-100">
                                    <p className="text-[10px] sm:text-xs text-stone-450 font-bold uppercase">ต้นทุนรวม (COGS)</p>
                                    <p className="text-base sm:text-lg font-black text-rose-600 mt-0.5">฿{summaryStats.totalCost.toLocaleString()}</p>
                                </div>
                                <div className="text-center p-2 bg-white rounded-xl border border-stone-100">
                                    <p className="text-[10px] sm:text-xs text-stone-450 font-bold uppercase">ราคาขายรวม</p>
                                    <p className="text-base sm:text-lg font-black text-emerald-600 mt-0.5">฿{summaryStats.totalRevenue.toLocaleString()}</p>
                                </div>
                                <div className="text-center p-2 bg-white rounded-xl border border-stone-100">
                                    <p className="text-[10px] sm:text-xs text-stone-450 font-bold uppercase">กำไรประมาณการ</p>
                                    <p className="text-base sm:text-lg font-black text-blue-650 mt-0.5">฿{summaryStats.totalProfit.toLocaleString()}</p>
                                </div>
                            </div>
                        )}

                        <div>
                            <label className="block text-xs font-bold text-stone-500 mb-1">หมายเหตุเพิ่มเติม</label>
                            <textarea
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                                rows={2}
                                className="w-full px-4 py-2 border border-stone-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-base md:text-sm"
                                placeholder="เช่น รายละเอียดโปรโมชั่น, เลขที่นำส่งสินค้า หรือข้อความบันทึกอื่นๆ..."
                            />
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="p-5 border-t border-stone-200 bg-stone-50 flex justify-end gap-3 shrink-0">
                        <button
                            onClick={onClose}
                            className="px-6 py-2.5 rounded-xl text-stone-600 font-bold hover:bg-stone-200 transition-colors min-h-[44px] text-base md:text-sm flex items-center justify-center"
                        >
                            ยกเลิก
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={isSubmitting || items.length === 0 || !selectedShopId}
                            className="px-8 py-2.5 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 min-h-[44px] text-base md:text-sm"
                        >
                            {isSubmitting ? 'กำลังบันทึก...' : 'บันทึกเปิดบิล'}
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};
