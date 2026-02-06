// ============================================================
// 🍰 Menu Manager 2.0 - Complete Redesign
// ============================================================
// Built for Mellow Oven with:
// - Card-based UI with smooth animations (framer-motion)
// - Variant-level active/inactive toggle
// - Modern, premium design
// ============================================================

import React, { useState, useMemo } from 'react';
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
    Power
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '@/src/store';
import { Product, Variant } from '@/types';
import { formatCurrency } from '@/src/lib/utils';
import { RecipeBuilder } from './RecipeBuilder';

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

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ active, onToggle, size = 'md' }) => {
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
        <motion.div
            layoutId={product.id}
            onClick={() => onClick(product)}
            whileHover={{ y: -4 }}
            className={`bg-white rounded-2xl p-4 border border-gray-100 shadow-sm hover:shadow-md cursor-pointer transition-all ${allInactive ? 'opacity-60' : ''}`}
        >
            {/* Header */}
            <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-cafe-50 rounded-xl flex items-center justify-center text-2xl">
                        {getCategoryIcon(product.category)}
                    </div>
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
                    <p className={`text-[10px] font-bold px-2 py-0.5 rounded ${hasEstimatedCost ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-500'}`}>
                        {hasEstimatedCost && '~'}กำไร ฿{profit.toFixed(0)} ({profitMargin.toFixed(0)}%)
                    </p>
                    <p className="text-[10px] text-gray-400 mt-1">
                        {hasEstimatedCost && '~'}ต้นทุน ฿{avgCost.toFixed(0)}
                        {hasEstimatedCost && <span className="text-amber-500 ml-1" title="ใช้ต้นทุนจากเมนูหลัก">*</span>}
                    </p>
                </div>
            </div>
        </motion.div>
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
    const { ingredients } = useStore();
    const [activeTab, setActiveTab] = useState<'info' | 'variants' | 'recipe'>('variants');

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

    const handleSave = () => {
        if (!product) return;

        const updates: Partial<Product> = {
            name,
            price: Number(price),
            cost: recipe ? recipe.costPerUnit : Number(cost),
            category,
            flavor,
            variants: localVariants,
            recipe: recipe || undefined
        };

        onSave(product.id, updates);
        onClose();
    };

    if (!product) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="fixed inset-0 m-auto w-full max-w-xl h-fit max-h-[90vh] bg-white rounded-3xl shadow-2xl z-[101] overflow-hidden flex flex-col"
                    >
                        {/* Header */}
                        <div className="p-6 border-b flex justify-between items-center bg-gradient-to-r from-cafe-50 to-amber-50 flex-shrink-0">
                            <div className="flex items-center gap-4">
                                <div className="text-4xl">
                                    {product.category === 'Cake' ? '🍰' :
                                        product.category === 'Bakery' ? '🥐' :
                                            product.category === 'Coffee' ? '☕' : '🍽️'}
                                </div>
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
                                className="p-2 hover:bg-white rounded-full border shadow-sm transition-colors"
                                aria-label="ปิด"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Tabs Navigation */}
                        <div className="flex border-b px-6 gap-6 flex-shrink-0">
                            {[
                                { id: 'info' as const, icon: Info, label: 'ข้อมูลทั่วไป' },
                                { id: 'variants' as const, icon: Layers, label: 'ตัวเลือกสินค้า' },
                                { id: 'recipe' as const, icon: BookOpen, label: 'สูตรผลิต' },
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`py-4 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors ${activeTab === tab.id
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
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="space-y-4"
                                >
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อสินค้า</label>
                                        <input
                                            type="text"
                                            value={name}
                                            onChange={(e) => { setName(e.target.value); setHasChanges(true); }}
                                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cafe-500 focus:border-cafe-500 outline-none"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">ราคาขาย</label>
                                            <input
                                                type="number"
                                                value={price}
                                                onChange={(e) => { setPrice(e.target.value); setHasChanges(true); }}
                                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cafe-500 focus:border-cafe-500 outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">ต้นทุน</label>
                                            <input
                                                type="number"
                                                value={recipe ? recipe.costPerUnit.toFixed(2) : cost}
                                                readOnly={!!recipe}
                                                onChange={(e) => { setCost(e.target.value); setHasChanges(true); }}
                                                className={`w-full px-4 py-2.5 border border-gray-200 rounded-xl outline-none ${recipe ? 'bg-gray-100 text-gray-500' : 'focus:ring-2 focus:ring-cafe-500 focus:border-cafe-500'}`}
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">หมวดหมู่</label>
                                            <input
                                                type="text"
                                                value={category}
                                                onChange={(e) => { setCategory(e.target.value); setHasChanges(true); }}
                                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cafe-500 focus:border-cafe-500 outline-none"
                                                placeholder="Cake, Bakery, Coffee..."
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">รสชาติ/แบบ</label>
                                            <input
                                                type="text"
                                                value={flavor}
                                                onChange={(e) => { setFlavor(e.target.value); setHasChanges(true); }}
                                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cafe-500 focus:border-cafe-500 outline-none"
                                                placeholder="Chocolate, Plain..."
                                            />
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            {/* Variants Tab */}
                            {activeTab === 'variants' && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
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
                                            className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${variant.isActive !== false
                                                ? 'border-gray-100 bg-white'
                                                : 'border-gray-50 bg-gray-50/50 opacity-70'
                                                }`}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className={`p-2 rounded-full ${variant.isActive !== false
                                                    ? 'text-emerald-500 bg-emerald-50'
                                                    : 'text-gray-300 bg-gray-100'
                                                    }`}>
                                                    {variant.isActive !== false ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                                                </div>
                                                <div>
                                                    <p className={`font-bold ${variant.isActive !== false ? 'text-gray-800' : 'text-gray-400'}`}>
                                                        {variant.name}
                                                        {variant.isActive === false && (
                                                            <span className="ml-2 text-xs font-normal text-red-400">[พักขาย]</span>
                                                        )}
                                                    </p>
                                                    <p className="text-xs text-gray-400">
                                                        ฿{variant.price} <span className="mx-1">•</span> ทุน ฿{variant.cost}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <button className="text-[10px] font-bold text-cafe-600 hover:underline">
                                                    {variant.recipe ? 'แก้ไขสูตร' : 'สร้างสูตร'}
                                                </button>
                                                <ToggleSwitch
                                                    active={variant.isActive !== false}
                                                    onToggle={() => handleLocalToggleVariant(variant.id)}
                                                    size="sm"
                                                />
                                                <button
                                                    onClick={() => handleRemoveVariant(variant.id)}
                                                    className="text-gray-300 hover:text-red-400"
                                                    aria-label={`ลบ ${variant.name}`}
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}

                                    {/* Add New Variant */}
                                    <div className="flex gap-2 mt-4">
                                        <input
                                            type="text"
                                            value={newVariantName}
                                            onChange={(e) => setNewVariantName(e.target.value)}
                                            placeholder="ชื่อตัวเลือก (เช่น ส้ม)"
                                            className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-cafe-500 focus:border-cafe-500 outline-none"
                                        />
                                        <input
                                            type="number"
                                            value={newVariantPrice}
                                            onChange={(e) => setNewVariantPrice(e.target.value)}
                                            placeholder="ราคา"
                                            className="w-24 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-cafe-500 focus:border-cafe-500 outline-none"
                                        />
                                        <button
                                            onClick={handleAddVariant}
                                            className="px-5 py-2.5 bg-cafe-600 text-white rounded-xl text-sm font-bold hover:bg-cafe-700 transition-colors"
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
                                </motion.div>
                            )}

                            {/* Recipe Tab */}
                            {activeTab === 'recipe' && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                >
                                    <RecipeBuilder
                                        product={{ name, price: Number(price) }}
                                        onRecipeChange={(newRecipe) => {
                                            setRecipe(newRecipe);
                                            setHasChanges(true);
                                        }}
                                    />
                                </motion.div>
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
                    </motion.div>
                </>
            )}
        </AnimatePresence>
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
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [deleteConfirmProduct, setDeleteConfirmProduct] = useState<Product | null>(null);
    const [showAddModal, setShowAddModal] = useState(false);

    // Form states for add modal
    const [newName, setNewName] = useState('');
    const [newPrice, setNewPrice] = useState('');
    const [newCost, setNewCost] = useState('');
    const [newCategory, setNewCategory] = useState('Cake');
    const [newFlavor, setNewFlavor] = useState('');

    // Get unique categories from products
    const categories = useMemo(() => {
        const cats = new Set(products.map(p => p.category));
        return ['All', ...Array.from(cats)];
    }, [products]);

    // Filter products
    const filteredProducts = useMemo(() => {
        return products.filter(p => {
            const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
            return matchesSearch && matchesCategory;
        });
    }, [products, searchQuery, selectedCategory]);

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

    const handleAddProduct = async () => {
        if (!newName.trim() || !newPrice) return;

        const newProduct: Product = {
            id: crypto.randomUUID(),
            name: newName.trim(),
            price: Number(newPrice),
            cost: Number(newCost) || 0,
            category: newCategory || 'Cake',
            flavor: newFlavor,
            variants: [],
            isActive: true
        };

        try {
            await addProduct(newProduct);
            // Reset form
            setNewName('');
            setNewPrice('');
            setNewCost('');
            setNewCategory('Cake');
            setNewFlavor('');
            setShowAddModal(false);
        } catch (err) {
            console.error('Add product failed:', err);
        }
    };

    return (
        <div className="min-h-full bg-gradient-to-br from-slate-50 to-stone-100 pb-20">
            {/* Header */}
            <header className="bg-white border-b px-6 py-4 sticky top-0 z-50 shadow-sm">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-black tracking-tight text-slate-800 flex items-center gap-2">
                            จัดการเมนู
                            <span className="text-cafe-600 text-xs bg-cafe-50 px-2 py-0.5 rounded-full">v2.0</span>
                        </h1>
                        <p className="text-xs text-slate-400 mt-0.5">บริหารจัดการเมนูและตัวเลือกสินค้าทั้งหมดของคุณ</p>
                    </div>

                    <div className="flex gap-3">
                        {/* Search */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="text"
                                placeholder="ค้นหาเมนู..."
                                className="pl-10 pr-4 py-2.5 bg-slate-100 border-transparent rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-cafe-500/20 focus:border-cafe-500 w-full md:w-64 transition-all outline-none"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        {/* Add Button */}
                        <button
                            onClick={() => setShowAddModal(true)}
                            className="flex items-center gap-2 bg-cafe-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-cafe-100 hover:bg-cafe-700 transition-all active:scale-95"
                        >
                            <Plus size={18} /> เพิ่มเมนูใหม่
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 py-8">
                {/* Category Filters */}
                <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2 scrollbar-hide">
                    <div className="p-2 bg-white rounded-lg border text-slate-400 mr-2">
                        <Filter size={18} />
                    </div>
                    {categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={`px-6 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${selectedCategory === cat
                                ? 'bg-cafe-600 text-white shadow-md'
                                : 'bg-white text-slate-500 border hover:border-cafe-200'
                                }`}
                        >
                            {cat === 'All' ? 'ทั้งหมด' : cat}
                        </button>
                    ))}
                </div>

                {/* Products Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
                        className="border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center p-8 text-slate-400 hover:bg-white hover:border-cafe-200 cursor-pointer transition-colors group min-h-[200px]"
                    >
                        <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mb-3 group-hover:bg-cafe-50 group-hover:text-cafe-500 transition-colors">
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
            <AnimatePresence>
                {showAddModal && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowAddModal(false)}
                            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            transition={{ duration: 0.2, ease: "easeOut" }}
                            className="fixed inset-0 m-auto w-full max-w-md h-fit bg-white rounded-2xl shadow-2xl z-[101] overflow-hidden"
                        >
                            {/* Header */}
                            <div className="p-6 border-b bg-gradient-to-r from-cafe-50 to-amber-50">
                                <h3 className="text-xl font-bold text-gray-800 flex items-center gap-3">
                                    <span className="text-2xl">🍰</span>
                                    เพิ่มเมนูใหม่
                                </h3>
                                <p className="text-xs text-gray-500 mt-1">สร้างสินค้าใหม่สำหรับร้านของคุณ</p>
                            </div>

                            {/* Form */}
                            <div className="p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        ชื่อสินค้า <span className="text-red-400">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={newName}
                                        onChange={(e) => setNewName(e.target.value)}
                                        placeholder="เช่น เค้กช็อกโกแลต"
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cafe-500 focus:border-cafe-500 outline-none"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            ราคาขาย <span className="text-red-400">*</span>
                                        </label>
                                        <input
                                            type="number"
                                            value={newPrice}
                                            onChange={(e) => setNewPrice(e.target.value)}
                                            placeholder="฿"
                                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cafe-500 focus:border-cafe-500 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">ต้นทุน</label>
                                        <input
                                            type="number"
                                            value={newCost}
                                            onChange={(e) => setNewCost(e.target.value)}
                                            placeholder="฿ (ถ้าทราบ)"
                                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cafe-500 focus:border-cafe-500 outline-none"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">หมวดหมู่</label>
                                        <select
                                            value={newCategory}
                                            onChange={(e) => setNewCategory(e.target.value)}
                                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cafe-500 focus:border-cafe-500 outline-none bg-white"
                                        >
                                            <option value="Cake">🍰 Cake</option>
                                            <option value="Bakery">🥐 Bakery</option>
                                            <option value="Tart">🥧 Tart</option>
                                            <option value="Bread">🍞 Bread</option>
                                            <option value="Coffee">☕ Coffee</option>
                                            <option value="Tea">🍵 Tea</option>
                                            <option value="Beverage">🥤 Beverage</option>
                                            <option value="Dessert">🧁 Dessert</option>
                                            <option value="Snack Box">📦 Snack Box</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">รสชาติ/แบบ</label>
                                        <input
                                            type="text"
                                            value={newFlavor}
                                            onChange={(e) => setNewFlavor(e.target.value)}
                                            placeholder="เช่น Chocolate"
                                            className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-cafe-500 focus:border-cafe-500 outline-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="p-6 border-t bg-gray-50 flex gap-3">
                                <button
                                    onClick={() => setShowAddModal(false)}
                                    className="flex-1 py-2.5 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
                                >
                                    ยกเลิก
                                </button>
                                <button
                                    onClick={handleAddProduct}
                                    disabled={!newName.trim() || !newPrice}
                                    className={`flex-1 py-2.5 rounded-xl font-bold transition-all ${newName.trim() && newPrice
                                            ? 'bg-cafe-600 text-white hover:bg-cafe-700 shadow-lg'
                                            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                        }`}
                                >
                                    <Plus size={18} className="inline mr-1" />
                                    สร้างสินค้า
                                </button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Delete Confirmation Modal */}
            <AnimatePresence>
                {deleteConfirmProduct && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setDeleteConfirmProduct(null)}
                            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
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
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

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
