// ============================================================
// 🍰 Menu Manager 2.0 - Complete Redesign
// ============================================================
// Built for Mellow Oven with:
// - Card-based UI with smooth animations (framer-motion)
// - Variant-level active/inactive toggle
// - Modern, premium design
// ============================================================

import React, { useState, useMemo, useRef } from 'react';
import {
    Search,
    Plus,
    Edit3,
    Trash2,
    CheckCircle2,
    Circle,
    Info,
    Layers,
    BookOpen,
    X,
    Filter,
    Power,
    Store,
    Image as ImageIcon,
    Loader2
} from 'lucide-react';
import { useStore } from '@/src/store';
import { Product, Variant } from '@/types';
import { formatCurrency } from '@/src/lib/utils';
import { RecipeBuilder } from './RecipeBuilder';
import { AddProductModal } from './AddProductModal';
import { supabase } from '@/src/lib/supabase';
import { compressImage } from '@/src/lib/imageCompression';

// ============================================================
// Sub-Components
// ============================================================

interface BadgeProps {
    children: React.ReactNode;
    variant?: 'default' | 'warning' | 'danger' | 'success';
}

const Badge: React.FC<BadgeProps> = ({ children, variant = 'default' }) => {
    const styles = {
        default: 'bg-gray-100 text-gray-600',
        warning: 'bg-amber-100 text-amber-600',
        danger: 'bg-red-100 text-red-600',
        success: 'bg-emerald-100 text-emerald-600',
    };
    return (
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${styles[variant]}`}>
            {children}
        </span>
    );
};

interface ToggleSwitchProps {
    active: boolean;
    onToggle: () => void;
    size?: 'sm' | 'md';
}

export const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ active, onToggle, size = 'md' }) => {
    const sizeClasses = size === 'sm'
        ? 'w-8 h-4'
        : 'w-10 h-5';
    const knobSize = size === 'sm'
        ? 'w-2.5 h-2.5'
        : 'w-3 h-3';
    const knobPosition = size === 'sm'
        ? (active ? 'left-[18px]' : 'left-1')
        : (active ? 'left-6' : 'left-1');

    return (
        <button
            onClick={(e) => { e.stopPropagation(); onToggle(); }}
            className={`${sizeClasses} rounded-full transition-colors relative ${active ? 'bg-emerald-500' : 'bg-gray-300'}`}
            aria-label={active ? 'เปิดขายอยู่ - คลิกเพื่อพักขาย' : 'พักขายอยู่ - คลิกเพื่อเปิดขาย'}
        >
            <div className={`absolute top-1 ${knobSize} bg-white rounded-full transition-all ${knobPosition}`} />
        </button>
    );
};

// ============================================================
// ProductCard Component
// ============================================================

interface ProductCardProps {
    product: Product;
    onClick: (product: Product) => void;
    onEdit: (product: Product) => void;
    onDelete: (product: Product) => void;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, onClick, onEdit, onDelete }) => {
    const variants = product.variants || [];
    const activeVariants = variants.filter(v => v.isActive !== false);
    const totalVariants = variants.length;
    const allInactive = product.isActive === false;
    const someInactive = product.isActive !== false && activeVariants.length < totalVariants && totalVariants > 0;

    // Calculate pricing - use product.cost as fallback when variant cost is 0
    const basePrice = product.price || 0;
    const baseCost = product.cost || 0;
    const minPrice = variants.length > 0
        ? Math.min(...variants.map(v => v.price))
        : basePrice;

    // For variants without recipe (cost=0), use main product cost
    const avgCost = variants.length > 0
        ? variants.reduce((acc, v) => acc + (v.cost > 0 ? v.cost : baseCost), 0) / totalVariants
        : baseCost;
    const profit = minPrice - avgCost;
    const profitMargin = minPrice > 0 ? ((profit / minPrice) * 100) : 0;

    // Flag to show if cost is estimated
    const hasEstimatedCost = variants.length > 0 && variants.some(v => v.cost === 0);

    // Get category icon
    const getCategoryIcon = (category: string) => {
        const icons: Record<string, string> = {
            'Cake': '🍰',
            'Tart': '🥧',
            'Bakery': '🥐',
            'Bread': '🍞',
            'Coffee': '☕',
            'Tea': '🍵',
            'Beverage': '🥤',
            'Dessert': '🧁',
            'Snack Box': '📦',
        };
        return icons[category] || '🍽️';
    };

    return (
        <div
            onClick={() => onClick(product)}
            className={`bg-white rounded-2xl p-4 border border-gray-100 shadow-sm hover:shadow-lg hover:border-cafe-200 hover:-translate-y-1 cursor-pointer transition-all duration-200 ${allInactive ? 'opacity-60' : ''}`}
        >
            {/* Header */}
            <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                    {product.imageUrl ? (
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center overflow-hidden border border-gray-100 flex-shrink-0">
                            <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                        </div>
                    ) : (
                        <div className="w-12 h-12 bg-cafe-50 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">
                            {getCategoryIcon(product.category)}
                        </div>
                    )}
                    <div>
                        <h3 className="font-bold text-gray-800 flex items-center gap-2">
                            {product.name}
                            {allInactive && <Badge variant="danger">หยุดขาย</Badge>}
                            {someInactive && <Badge variant="warning">{totalVariants - activeVariants.length} พักขาย</Badge>}
                        </h3>
                        <p className="text-xs text-gray-400">{product.category}</p>
                    </div>
                </div>
                {/* Quick Actions */}
                <div className="flex gap-1">
                    <button
                        onClick={(e) => { e.stopPropagation(); onEdit(product); }}
                        className="p-1.5 hover:bg-gray-50 rounded-lg text-gray-400 hover:text-blue-600 transition-colors"
                        aria-label={`แก้ไข ${product.name}`}
                    >
                        <Edit3 size={16} />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onDelete(product); }}
                        className="p-1.5 hover:bg-gray-50 rounded-lg text-gray-400 hover:text-red-600 transition-colors"
                        aria-label={`ลบ ${product.name}`}
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            </div>

            {/* Variant Pills */}
            {variants.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-4">
                    {variants.slice(0, 3).map(v => (
                        <div
                            key={v.id}
                            className={`px-2 py-1 rounded-lg border text-[10px] ${v.isActive !== false
                                ? 'border-gray-200 text-gray-600'
                                : 'bg-gray-50 border-gray-100 text-gray-300 line-through'
                                }`}
                        >
                            {v.name} ฿{v.price}
                        </div>
                    ))}
                    {totalVariants > 3 && (
                        <div className="text-[10px] text-gray-400 self-center">+{totalVariants - 3}</div>
                    )}
                </div>
            )}

            {/* Footer - Pricing */}
            <div className="pt-3 border-t border-dashed border-gray-100 flex justify-between items-end">
                <div>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">
                        {variants.length > 0 ? 'ราคาเริ่มต้น' : 'ราคาขาย'}
                    </p>
                    <p className="text-lg font-bold text-gray-900 leading-none mt-1">฿{minPrice}</p>
                </div>
                <div className="text-right">
                    <p className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full inline-block ${
                        profitMargin >= 50
                            ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                            : profitMargin >= 30
                            ? 'bg-amber-50 text-amber-600 border border-amber-100'
                            : 'bg-rose-50 text-rose-600 border border-rose-100'
                    }`}>
                        {hasEstimatedCost && '~'}กำไร {profitMargin.toFixed(0)}%
                    </p>
                    <p className="text-[10px] text-gray-400 mt-1 font-semibold">
                        {hasEstimatedCost && '~'}ต้นทุน ฿{avgCost.toFixed(0)}
                        {hasEstimatedCost && <span className="text-amber-500 ml-1" title="ใช้ต้นทุนจากเมนูหลัก">*</span>}
                    </p>
                </div>
            </div>
        </div>
    );
};

// ============================================================
// DetailModal Component
// ============================================================

interface DetailModalProps {
    product: Product | null;
    isOpen: boolean;
    onClose: () => void;
    onToggleVariant: (productId: string, variantId: string) => void;
    onToggleProduct: (productId: string) => void;
    onSave: (productId: string, updates: Partial<Product>) => void;
}

const DetailModal: React.FC<DetailModalProps> = ({
    product,
    isOpen,
    onClose,
    onToggleVariant,
    onToggleProduct,
    onSave
}) => {
    const { ingredients, markets } = useStore();
    const [activeTab, setActiveTab] = useState<'info' | 'variants' | 'recipe' | 'markets'>('variants');

    // Form states
    const [name, setName] = useState('');
    const [price, setPrice] = useState('');
    const [cost, setCost] = useState('');
    const [category, setCategory] = useState('');
    const [flavor, setFlavor] = useState('');
    const [newVariantName, setNewVariantName] = useState('');
    const [newVariantPrice, setNewVariantPrice] = useState('');
    const [localVariants, setLocalVariants] = useState<Variant[]>([]);
    const [recipe, setRecipe] = useState<Product['recipe'] | null>(null);
    const [hasChanges, setHasChanges] = useState(false);
    const [editingVariantId, setEditingVariantId] = useState<string | null>(null);
    const [editingVariantName, setEditingVariantName] = useState('');
    const [sellEverywhere, setSellEverywhere] = useState(true);
    const [selectedMarkets, setSelectedMarkets] = useState<string[]>([]);
    
    // Image states
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);

    // Initialize form when product changes
    React.useEffect(() => {
        if (product) {
            setName(product.name);
            setPrice(product.price?.toString() || '');
            setCost(product.cost?.toString() || '');
            setCategory(product.category || '');
            setFlavor(product.flavor || '');
            setLocalVariants(product.variants || []);
            setRecipe(product.recipe || null);
            setActiveTab('variants');
            setHasChanges(false);
            const pMarkets = product.marketIds || [];
            setSellEverywhere(pMarkets.length === 0);
            setSelectedMarkets(pMarkets);
            setImagePreview(product.imageUrl || null);
            setImageFile(null);
        }
    }, [product]);

    const handleAddVariant = () => {
        if (!newVariantName.trim() || !newVariantPrice) return;

        const newVariant: Variant = {
            id: crypto.randomUUID(),
            name: newVariantName.trim(),
            price: Number(newVariantPrice),
            cost: 0,
            isActive: true
        };

        setLocalVariants(prev => [...prev, newVariant]);
        setNewVariantName('');
        setNewVariantPrice('');
        setHasChanges(true);
    };

    const handleRemoveVariant = (variantId: string) => {
        setLocalVariants(prev => prev.filter(v => v.id !== variantId));
        setHasChanges(true);
    };

    const handleLocalToggleVariant = (variantId: string) => {
        setLocalVariants(prev => prev.map(v =>
            v.id === variantId ? { ...v, isActive: v.isActive === false ? true : false } : v
        ));
        setHasChanges(true);

        // Also persist to DB immediately
        if (product) {
            onToggleVariant(product.id, variantId);
        }
    };

    const handleStartRenameVariant = (variant: Variant) => {
        setEditingVariantId(variant.id);
        setEditingVariantName(variant.name);
    };

    const handleConfirmRenameVariant = () => {
        if (!editingVariantId || !editingVariantName.trim()) {
            setEditingVariantId(null);
            return;
        }
        setLocalVariants(prev => prev.map(v =>
            v.id === editingVariantId ? { ...v, name: editingVariantName.trim() } : v
        ));
        setEditingVariantId(null);
        setHasChanges(true);
    };

    const handleRenameKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleConfirmRenameVariant();
        } else if (e.key === 'Escape') {
            setEditingVariantId(null);
        }
    };

    const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setImagePreview(URL.createObjectURL(file));
            setHasChanges(true);
            try {
                const compressed = await compressImage(file, { maxWidth: 800, maxHeight: 800, quality: 0.8 });
                setImageFile(compressed);
            } catch (err) {
                console.error("Image compression failed:", err);
                setImageFile(file);
            }
        }
    };

    const uploadImage = async (): Promise<string | undefined> => {
        if (!imageFile) return undefined;
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${crypto.randomUUID()}.${fileExt}`;
        const filePath = `products/${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('product-images')
            .upload(filePath, imageFile, { upsert: true });

        if (uploadError) {
            console.error('Error uploading image:', uploadError);
            return undefined;
        }

        const { data } = supabase.storage.from('product-images').getPublicUrl(filePath);
        return data.publicUrl;
    };

    const handleSave = async () => {
        if (!product) return;

        setIsUploading(true);
        let finalImageUrl = product.imageUrl;
        if (imageFile) {
            const uploadedUrl = await uploadImage();
            if (uploadedUrl) finalImageUrl = uploadedUrl;
        }
        setIsUploading(false);

        const updates: Partial<Product> = {
            name,
            price: Number(price),
            cost: recipe ? recipe.costPerUnit : Number(cost),
            category,
            flavor,
            variants: localVariants,
            recipe: recipe || undefined,
            marketIds: sellEverywhere ? [] : selectedMarkets,
            imageUrl: finalImageUrl
        };

        onSave(product.id, updates);
        onClose();
    };

    if (!product) return null;

    return (
        <>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <div
                        onClick={onClose}
                        className="fixed inset-0 bg-stone-900/40 backdrop-blur-xs z-[100] flex items-end md:items-center justify-center p-0 md:p-4 transition-opacity"
                    />

                    {/* Side Drawer Container */}
                    <div
                        className="fixed right-0 top-0 bottom-0 w-full md:max-w-xl h-full bg-white shadow-2xl z-[101] overflow-hidden flex flex-col animate-in slide-in-from-right duration-300 rounded-l-3xl max-sm:rounded-t-3xl max-sm:bottom-0 max-sm:top-auto max-sm:h-[90vh] max-sm:slide-in-from-bottom"
                    >
                        {/* Header */}
                        <div className="p-6 border-b flex justify-between items-center bg-gradient-to-r from-cafe-50 to-amber-50 flex-shrink-0">
                            <div className="flex items-center gap-4">
                                {product.imageUrl ? (
                                    <div className="w-16 h-16 rounded-xl flex items-center justify-center overflow-hidden border border-white shadow-sm flex-shrink-0">
                                        <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                                    </div>
                                ) : (
                                    <div className="text-4xl w-16 h-16 flex items-center justify-center bg-white rounded-xl shadow-sm">
                                        {product.category === 'Cake' ? '🍰' :
                                            product.category === 'Bakery' ? '🥐' :
                                                product.category === 'Coffee' ? '☕' : '🍽️'}
                                    </div>
                                )}
                                <div>
                                    <h2 className="text-xl font-bold text-gray-900">{product.name}</h2>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-xs text-gray-500">สถานะการขายหลัก:</span>
                                        <ToggleSwitch
                                            active={product.isActive !== false}
                                            onToggle={() => onToggleProduct(product.id)}
                                        />
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2.5 min-w-[44px] min-h-[44px] hover:bg-white rounded-full border shadow-sm transition-colors flex items-center justify-center"
                                aria-label="ปิด"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Tabs Navigation */}
                        <div className="flex border-b px-4 md:px-6 gap-2 md:gap-6 overflow-x-auto scrollbar-none flex-shrink-0">
                            {[
                                { id: 'info' as const, icon: Info, label: 'ข้อมูลทั่วไป' },
                                { id: 'variants' as const, icon: Layers, label: 'ตัวเลือกสินค้า' },
                                { id: 'recipe' as const, icon: BookOpen, label: 'สูตรผลิต' },
                                { id: 'markets' as const, icon: Store, label: 'สาขาที่วางขาย' },
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`py-4 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors flex-shrink-0 ${activeTab === tab.id
                                        ? 'border-cafe-600 text-cafe-600'
                                        : 'border-transparent text-gray-400 hover:text-gray-600'
                                        }`}
                                >
                                    <tab.icon size={16} />
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {/* Tab Content */}
                        <div className="p-6 overflow-y-auto flex-1">
                            {/* Info Tab */}
                            {activeTab === 'info' && (
                                <div
                                    className="space-y-4"
                                >
                                    <div className="flex flex-col sm:flex-row gap-6">
                                        {/* Image Upload Area */}
                                        <div className="sm:w-1/3">
                                            <label className="block text-sm font-medium text-gray-700 mb-1">รูปภาพสินค้า</label>
                                            <div className="relative aspect-square w-full max-w-[200px] bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-slate-400 group hover:bg-slate-100 hover:border-cafe-300 transition-colors cursor-pointer overflow-hidden">
                                                <input 
                                                    type="file" 
                                                    accept="image/jpeg, image/png, image/webp" 
                                                    className="hidden" 
                                                    onChange={handleImageChange}
                                                    disabled={isUploading}
                                                />
                                                {imagePreview ? (
                                                    <div className="absolute inset-0 w-full h-full">
                                                        <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                            <span className="text-white font-medium text-sm">เปลี่ยนรูปภาพ</span>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col items-center p-4">
                                                        <div className="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                                                            <ImageIcon size={24} className="text-slate-300 group-hover:text-cafe-500" />
                                                        </div>
                                                        <p className="font-medium text-xs text-slate-500 text-center">อัพโหลดรูปภาพ</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Text Fields Area */}
                                        <div className="sm:w-2/3 space-y-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อสินค้า</label>
                                                <input
                                                    type="text"
                                                    value={name}
                                                    onChange={(e) => { setName(e.target.value); setHasChanges(true); }}
                                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cafe-500 focus:border-cafe-500 outline-none text-base md:text-sm"
                                                />
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">หมวดหมู่</label>
                                                    <input
                                                        type="text"
                                                        value={category}
                                                        onChange={(e) => { setCategory(e.target.value); setHasChanges(true); }}
                                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cafe-500 focus:border-cafe-500 outline-none text-base md:text-sm"
                                                        placeholder="Cake, Bakery, Coffee..."
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 mb-1">รสชาติ/แบบ</label>
                                                    <input
                                                        type="text"
                                                        value={flavor}
                                                        onChange={(e) => { setFlavor(e.target.value); setHasChanges(true); }}
                                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cafe-500 focus:border-cafe-500 outline-none text-base md:text-sm"
                                                        placeholder="Chocolate, Plain..."
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 border-t pt-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">ราคาขาย</label>
                                            <input
                                                type="number"
                                                value={price}
                                                onChange={(e) => { setPrice(e.target.value); setHasChanges(true); }}
                                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cafe-500 focus:border-cafe-500 outline-none text-base md:text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">ต้นทุน</label>
                                            <input
                                                type="number"
                                                value={recipe ? recipe.costPerUnit.toFixed(2) : cost}
                                                readOnly={!!recipe}
                                                onChange={(e) => { setCost(e.target.value); setHasChanges(true); }}
                                                className={`w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none text-base md:text-sm ${recipe ? 'bg-gray-100 text-gray-500' : 'focus:ring-2 focus:ring-cafe-500 focus:border-cafe-500'}`}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Variants Tab */}
                            {activeTab === 'variants' && (
                                <div
                                    className="space-y-3"
                                >
                                    {/* Info Banner */}
                                    <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-xl text-blue-600 text-xs mb-4">
                                        <Info size={14} />
                                        <span>คุณสามารถปิดการขายระดับตัวเลือกได้ เช่น เมื่อวัตถุดิบเฉพาะรสชาตินั้นหมด</span>
                                    </div>

                                    {/* Variant List */}
                                    {localVariants.map((variant) => (
                                        <div
                                            key={variant.id}
                                            className={`flex flex-col sm:flex-row sm:items-center justify-between p-3.5 sm:p-4 rounded-2xl border gap-3 sm:gap-4 transition-all ${variant.isActive !== false
                                                ? 'border-gray-100 bg-white'
                                                : 'border-gray-50 bg-gray-50/50 opacity-70'
                                                }`}
                                        >
                                            <div className="flex items-center gap-3 sm:gap-4">
                                                <div className={`p-2 rounded-full ${variant.isActive !== false
                                                    ? 'text-emerald-500 bg-emerald-50'
                                                    : 'text-gray-300 bg-gray-100'
                                                    }`}>
                                                    {variant.isActive !== false ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    {editingVariantId === variant.id ? (
                                                        <input
                                                            type="text"
                                                            value={editingVariantName}
                                                            onChange={(e) => setEditingVariantName(e.target.value)}
                                                            onBlur={handleConfirmRenameVariant}
                                                            onKeyDown={handleRenameKeyDown}
                                                            autoFocus
                                                            className="w-full px-2 py-1 border border-cafe-400 rounded-lg text-sm font-bold focus:ring-2 focus:ring-cafe-500 focus:border-cafe-500 outline-none bg-white"
                                                        />
                                                    ) : (
                                                        <p
                                                            className={`font-bold flex items-center gap-1.5 group/name cursor-pointer ${variant.isActive !== false ? 'text-gray-800' : 'text-gray-400'}`}
                                                            onClick={(e) => { e.stopPropagation(); handleStartRenameVariant(variant); }}
                                                            title="คลิกเพื่อเปลี่ยนชื่อ"
                                                        >
                                                            {variant.name}
                                                            <Edit3 size={12} className="opacity-0 group-hover/name:opacity-100 text-cafe-400 transition-opacity" />
                                                            {variant.isActive === false && (
                                                                <span className="ml-1 text-xs font-normal text-red-400">[พักขาย]</span>
                                                            )}
                                                        </p>
                                                    )}
                                                    <p className="text-xs text-gray-400">
                                                        ฿{variant.price} <span className="mx-1">•</span> ทุน ฿{variant.cost}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between sm:justify-end gap-4 w-full sm:w-auto border-t border-dashed border-gray-100 pt-3 sm:pt-0 sm:border-0">
                                                <button className="text-xs sm:text-[10px] font-bold text-cafe-600 hover:underline min-h-[36px] flex items-center">
                                                    {variant.recipe ? 'แก้ไขสูตร' : 'สร้างสูตร'}
                                                </button>
                                                <div className="flex items-center gap-3">
                                                    <ToggleSwitch
                                                        active={variant.isActive !== false}
                                                        onToggle={() => handleLocalToggleVariant(variant.id)}
                                                        size="sm"
                                                    />
                                                    <button
                                                        onClick={() => handleRemoveVariant(variant.id)}
                                                        className="text-gray-300 hover:text-red-400 p-2 min-h-[40px] min-w-[40px] flex items-center justify-center hover:bg-red-50 rounded-lg transition-colors"
                                                        aria-label={`ลบ ${variant.name}`}
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}

                                    {/* Add New Variant */}
                                    <div className="flex flex-col sm:flex-row gap-2 mt-4">
                                        <input
                                            type="text"
                                            value={newVariantName}
                                            onChange={(e) => setNewVariantName(e.target.value)}
                                            placeholder="ชื่อตัวเลือก (เช่น ส้ม)"
                                            className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-base md:text-sm focus:ring-2 focus:ring-cafe-500 focus:border-cafe-500 outline-none"
                                        />
                                        <input
                                            type="number"
                                            value={newVariantPrice}
                                            onChange={(e) => setNewVariantPrice(e.target.value)}
                                            placeholder="ราคา"
                                            className="w-full sm:w-28 px-4 py-2.5 border border-gray-200 rounded-xl text-base md:text-sm focus:ring-2 focus:ring-cafe-500 focus:border-cafe-500 outline-none"
                                        />
                                        <button
                                            onClick={handleAddVariant}
                                            className="px-5 py-3 sm:py-2.5 bg-cafe-600 text-white rounded-xl text-base md:text-sm font-bold hover:bg-cafe-700 transition-colors w-full sm:w-auto"
                                        >
                                            เพิ่ม
                                        </button>
                                    </div>

                                    {/* Empty State */}
                                    {localVariants.length === 0 && (
                                        <div className="text-center py-10 text-gray-400">
                                            <Layers size={40} className="mx-auto mb-3 opacity-50" />
                                            <p className="text-sm">ยังไม่มีตัวเลือกสินค้า</p>
                                            <p className="text-xs">กรอกข้อมูลด้านบนเพื่อเพิ่มตัวเลือกใหม่</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Recipe Tab */}
                            {activeTab === 'recipe' && (
                                <div>
                                    <RecipeBuilder
                                        product={{ name, price: Number(price) }}
                                        onRecipeChange={(newRecipe) => {
                                            setRecipe(newRecipe);
                                            setHasChanges(true);
                                        }}
                                    />
                                </div>
                            )}

                            {/* Markets Tab */}
                            {activeTab === 'markets' && (
                                <div className="space-y-4 animate-in fade-in duration-200">
                                    <div className="flex items-center gap-2 p-3 bg-cafe-50 text-cafe-700 rounded-xl text-xs mb-4 border border-cafe-100">
                                        <Store size={14} />
                                        <span>กำหนดว่าสินค้านี้จะพร้อมจำหน่ายที่สาขาหรือตลาดนัดแห่งใดบ้าง</span>
                                    </div>
                                    
                                    {markets.length > 0 ? (
                                        <div className="bg-stone-50 rounded-xl p-4 space-y-3 border border-stone-200">
                                            <label className="flex items-center gap-3 cursor-pointer select-none">
                                                <input
                                                    type="checkbox"
                                                    checked={sellEverywhere}
                                                    onChange={(e) => {
                                                        setSellEverywhere(e.target.checked);
                                                        if (e.target.checked) setSelectedMarkets([]);
                                                        setHasChanges(true);
                                                    }}
                                                    className="w-4 h-4 rounded text-cafe-600 focus:ring-cafe-500 border-gray-300"
                                                />
                                                <span className="text-sm font-bold text-stone-700">วางขายทุกสาขา / ทุกตลาด</span>
                                            </label>

                                            {!sellEverywhere && (
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pl-7 pt-3 border-t border-stone-200/50 mt-2">
                                                    {markets.map((market) => (
                                                        <label key={market.id} className="flex items-center gap-2.5 cursor-pointer select-none py-2 hover:bg-white rounded-lg px-2 transition-colors border border-transparent hover:border-stone-100">
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedMarkets.includes(market.id)}
                                                                onChange={(e) => {
                                                                    if (e.target.checked) {
                                                                        setSelectedMarkets([...selectedMarkets, market.id]);
                                                                    } else {
                                                                        setSelectedMarkets(selectedMarkets.filter(id => id !== market.id));
                                                                    }
                                                                    setHasChanges(true);
                                                                }}
                                                                className="w-4 h-4 rounded text-cafe-600 focus:ring-cafe-500 border-gray-300"
                                                            />
                                                            <span className="text-xs font-semibold text-stone-700">{market.name}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="text-center py-8 text-gray-400">
                                            <p className="text-xs">ยังไม่มีข้อมูลตลาดนัดในระบบ</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-6 border-t bg-gray-50 flex justify-end gap-3 flex-shrink-0">
                            <button
                                onClick={onClose}
                                className="px-6 py-2.5 rounded-xl font-bold text-gray-600 hover:bg-white transition-colors"
                            >
                                ยกเลิก
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={!hasChanges}
                                className={`px-8 py-2.5 rounded-xl font-bold shadow-lg transition-all ${hasChanges
                                    ? 'bg-cafe-600 text-white shadow-cafe-200 hover:bg-cafe-700'
                                    : 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
                                    }`}
                            >
                                บันทึกการเปลี่ยนแปลง
                            </button>
                        </div>
                    </div>
                </>
            )}
        </>
    );
};

// ============================================================
// Main MenuManager2 Component
// ============================================================

export const MenuManager2: React.FC = () => {
    const {
        products,
        toggleProductActive,
        toggleVariantActive,
        updateProduct,
        removeProduct,
        addProduct
    } = useStore();

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [deleteConfirmProduct, setDeleteConfirmProduct] = useState<Product | null>(null);
    const [showAddModal, setShowAddModal] = useState(false);

    // Filter products
    const filteredProducts = useMemo(() => {
        return products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }, [products, searchQuery]);

    const handleDelete = async (product: Product) => {
        try {
            await removeProduct(product.id);
            setDeleteConfirmProduct(null);
        } catch (err) {
            console.error('Delete failed:', err);
        }
    };

    const handleSaveProduct = async (productId: string, updates: Partial<Product>) => {
        await updateProduct(productId, updates);
    };

    const handleAddProduct = (newProductData: {
        name: string;
        price: string;
        cost: string;
        category: string;
        flavor: string;
        marketIds: string[];
        imageUrl?: string;
    }) => {
        const { name, price, cost, category, flavor, marketIds, imageUrl } = newProductData;
        if (!name.trim() || !price) return;

        const newProduct: Product = {
            id: crypto.randomUUID(),
            name: name.trim(),
            price: Number(price),
            cost: cost ? Number(cost) : 0,
            category,
            flavor: flavor.trim() || undefined,
            variants: [],
            isActive: true,
            marketIds: marketIds || [],
            imageUrl: imageUrl || undefined
        };

        addProduct(newProduct);
        setShowAddModal(false);
    };

    return (
        <div className="min-h-full bg-gradient-to-br from-slate-50 to-stone-100 pb-20">
            {/* Header */}
            <header className="bg-white border-b px-4 md:px-6 py-4 sticky top-[56px] md:top-0 z-40 shadow-sm bg-white/95 backdrop-blur-sm">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-black tracking-tight text-slate-800 flex items-center gap-2">
                            จัดการเมนู
                            <span className="text-cafe-600 text-xs bg-cafe-50 px-2 py-0.5 rounded-full">v2.0</span>
                        </h1>
                        <p className="text-xs text-slate-400 mt-0.5">บริหารจัดการเมนูและตัวเลือกสินค้าทั้งหมดของคุณ</p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                        {/* Search */}
                        <div className="relative w-full sm:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="text"
                                placeholder="ค้นหาเมนู..."
                                className="pl-10 pr-4 py-2.5 bg-slate-100 border-transparent rounded-xl text-base md:text-sm focus:bg-white focus:ring-2 focus:ring-cafe-500/20 focus:border-cafe-500 w-full transition-all outline-none"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        {/* Add Button */}
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="flex items-center justify-center gap-2 bg-cafe-600 text-white px-5 py-2.5 rounded-xl text-base md:text-sm font-bold shadow-lg shadow-cafe-100 hover:bg-cafe-700 transition-all active:scale-95 w-full sm:w-auto"
                        >
                            <Plus size={18} /> เพิ่มเมนูใหม่
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-8">
                {/* Products Grid */}
                <div
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                >
                    {filteredProducts.map(product => (
                        <ProductCard
                            key={product.id}
                            product={product}
                            onClick={(p) => setSelectedProduct(p)}
                            onEdit={(p) => setSelectedProduct(p)}
                            onDelete={(p) => setDeleteConfirmProduct(p)}
                        />
                    ))}

                    {/* Add New Card Placeholder */}
                    <div
                        onClick={() => setShowAddModal(true)}
                        className="bg-white border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center p-8 text-slate-400 hover:bg-cafe-50 hover:text-cafe-600 hover:border-cafe-300 shadow-sm hover:shadow-md hover:-translate-y-1 cursor-pointer transition-all duration-200 group min-h-[200px]"
                    >
                        <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mb-3 group-hover:bg-white group-hover:shadow-sm transition-all">
                            <Plus size={24} />
                        </div>
                        <p className="text-sm font-bold">เพิ่มสินค้าใหม่</p>
                        <p className="text-xs">หรือกดปุ่มด้านบน</p>
                    </div>
                </div>

                {/* Empty State */}
                {filteredProducts.length === 0 && (
                    <div className="text-center py-20 text-gray-400">
                        <div className="text-6xl mb-4">🍽️</div>
                        <p className="text-lg font-bold">ไม่พบเมนูที่ค้นหา</p>
                        <p className="text-sm">ลองค้นหาด้วยคำอื่น หรือเลือกหมวดหมู่อื่น</p>
                    </div>
                )}
            </main>

            {/* Detail Modal */}
            <DetailModal
                isOpen={!!selectedProduct}
                product={selectedProduct}
                onClose={() => setSelectedProduct(null)}
                onToggleVariant={toggleVariantActive}
                onToggleProduct={toggleProductActive}
                onSave={handleSaveProduct}
            />

            {/* Add Product Modal */}
            <AddProductModal
                isOpen={showAddModal}
                onClose={() => setShowAddModal(false)}
                onAdd={handleAddProduct}
            />

            {/* Delete Confirmation Modal */}
            {deleteConfirmProduct && (
                <>
                    <div
                        onClick={() => setDeleteConfirmProduct(null)}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]"
                    />
                    <div
                        className="fixed inset-0 m-auto w-full max-w-sm h-fit bg-white rounded-2xl shadow-2xl z-[101] p-6"
                    >
                        <h3 className="text-lg font-bold text-gray-800 mb-2">ยืนยันการลบ?</h3>
                        <p className="text-sm text-gray-500 mb-6">
                            คุณต้องการลบ "{deleteConfirmProduct.name}" ใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setDeleteConfirmProduct(null)}
                                className="flex-1 py-2.5 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
                            >
                                ยกเลิก
                            </button>
                            <button
                                onClick={() => handleDelete(deleteConfirmProduct)}
                                className="flex-1 py-2.5 rounded-xl font-bold text-white bg-red-500 hover:bg-red-600 transition-colors"
                            >
                                ลบเลย
                            </button>
                        </div>
                    </div>
                </>
            )}

            {/* Status Toast */}
            <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-4 text-sm z-[50]">
                <span className="opacity-50">Status:</span>
                <span className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                    ระบบออนไลน์ พร้อมซิงค์ข้อมูล
                </span>
            </div>
        </div>
    );
};

export default MenuManager2;
