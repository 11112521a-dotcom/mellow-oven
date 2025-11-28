import React, { useState } from 'react';
import { Product } from '@/types';
import { useStore } from '@/src/store';
import { Plus, Edit2, Trash2, Image as ImageIcon } from 'lucide-react';
import { Modal } from '@/src/components/ui/Modal';
import { RecipeBuilder } from './RecipeBuilder'; // Assuming RecipeBuilder is in the same directory
import { formatCurrency } from '@/src/lib/utils'; // Assuming formatCurrency is a utility function
import { EditProductModal } from './EditProductModal';

export const MenuManager: React.FC = () => {
    const { products, addProduct, removeProduct } = useStore();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [productToDelete, setProductToDelete] = useState<Product | null>(null);
    const [productToEdit, setProductToEdit] = useState<Product | null>(null);
    const [newProduct, setNewProduct] = useState<Partial<Product>>({
        name: '',
        category: 'Cake',
        flavor: '',
        price: 0,
        cost: 0,
    });

    const categories = ['Cake', 'Tart', 'Bread', 'Beverage', 'Cookie'];
    const [activeTab, setActiveTab] = useState<'INFO' | 'RECIPE'>('INFO');
    const [recipe, setRecipe] = useState<any>(null);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (newProduct.name && newProduct.price) {
            addProduct({
                id: crypto.randomUUID(),
                name: newProduct.name,
                category: newProduct.category || 'Cake',
                flavor: newProduct.flavor || '',
                price: Number(newProduct.price),
                cost: recipe ? recipe.costPerUnit : (Number(newProduct.cost) || 0),
                recipe: recipe
            } as Product);
            setIsModalOpen(false);
            setNewProduct({ name: '', category: 'Cake', flavor: '', price: 0, cost: 0 });
            setRecipe(null);
            setActiveTab('INFO');
        }
    };

    const handleDeleteClick = (product: Product) => {
        setProductToDelete(product);
        setIsDeleteModalOpen(true);
    };

    const handleEditClick = (product: Product) => {
        setProductToEdit(product);
        setIsEditModalOpen(true);
    };

    const handleConfirmDelete = () => {
        if (productToDelete) {
            removeProduct(productToDelete.id);
            setIsDeleteModalOpen(false);
            setProductToDelete(null);
        }
    };

    const handleCancelDelete = () => {
        setIsDeleteModalOpen(false);
        setProductToDelete(null);
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-cafe-100 p-6">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold text-cafe-800">จัดการเมนู (Menu Management)</h3>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 bg-cafe-600 text-white px-4 py-2 rounded-lg hover:bg-cafe-700 transition-colors"
                >
                    <Plus size={18} /> เพิ่มเมนูใหม่
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {products.map((product) => (
                    <div key={product.id} className="border border-cafe-100 rounded-xl p-4 hover:shadow-md transition-shadow relative">
                        {/* Action buttons */}
                        <div className="absolute top-3 right-3 flex gap-2">
                            <button
                                onClick={() => handleEditClick(product)}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="แก้ไข"
                            >
                                <Edit2 size={18} />
                            </button>
                            <button
                                onClick={() => handleDeleteClick(product)}
                                className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                title="ลบเมนู"
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>

                        <div className="flex gap-4">
                            <div className="w-16 h-16 bg-cafe-100 rounded-lg flex items-center justify-center text-cafe-400">
                                <ImageIcon size={24} />
                            </div>
                            <div className="flex-1">
                                <h4 className="font-bold text-cafe-800">{product.name}</h4>
                                <p className="text-xs text-cafe-500">{product.category} {product.flavor && `• ${product.flavor}`}</p>
                                <div className="flex justify-between items-center mt-2">
                                    <span className="text-cafe-600 font-medium">฿{product.price}</span>
                                    <span className="text-xs text-cafe-400">ทุน: ฿{formatCurrency(product.cost)}</span>
                                </div>
                                {product.recipe && (
                                    <div className="mt-2 text-xs text-green-600 bg-green-50 px-2 py-1 rounded inline-block">
                                        ✅ มีสูตรผลิต
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="เพิ่มเมนูใหม่">
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Tabs */}
                    <div className="flex border-b border-cafe-200 mb-4">
                        <button
                            type="button"
                            onClick={() => setActiveTab('INFO')}
                            className={`px-4 py-2 text-sm font-medium ${activeTab === 'INFO' ? 'text-cafe-800 border-b-2 border-cafe-800' : 'text-cafe-500'}`}
                        >
                            ข้อมูลทั่วไป
                        </button>
                        <button
                            type="button"
                            onClick={() => setActiveTab('RECIPE')}
                            className={`px-4 py-2 text-sm font-medium ${activeTab === 'RECIPE' ? 'text-cafe-800 border-b-2 border-cafe-800' : 'text-cafe-500'}`}
                        >
                            สูตรผลิต (Recipe)
                        </button>
                    </div>

                    {activeTab === 'INFO' ? (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-cafe-700 mb-1">ชื่อเมนู</label>
                                <input
                                    required
                                    value={newProduct.name}
                                    onChange={e => setNewProduct({ ...newProduct, name: e.target.value })}
                                    className="w-full p-2 border border-cafe-200 rounded-lg"
                                    placeholder="เช่น ครัวซองต์"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-cafe-700 mb-1">หมวดหมู่</label>
                                    <select
                                        value={newProduct.category}
                                        onChange={e => setNewProduct({ ...newProduct, category: e.target.value })}
                                        className="w-full p-2 border border-cafe-200 rounded-lg"
                                    >
                                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-cafe-700 mb-1">รสชาติ (ถ้ามี)</label>
                                    <input
                                        value={newProduct.flavor}
                                        onChange={e => setNewProduct({ ...newProduct, flavor: e.target.value })}
                                        className="w-full p-2 border border-cafe-200 rounded-lg"
                                        placeholder="เช่น ช็อกโกแลต"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-cafe-700 mb-1">ราคาขาย</label>
                                    <input
                                        type="number"
                                        required
                                        value={newProduct.price}
                                        onChange={e => setNewProduct({ ...newProduct, price: Number(e.target.value) })}
                                        className="w-full p-2 border border-cafe-200 rounded-lg"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-cafe-700 mb-1">ต้นทุน (COGS)</label>
                                    <input
                                        type="number"
                                        value={recipe ? recipe.costPerUnit : newProduct.cost}
                                        readOnly={!!recipe}
                                        onChange={e => setNewProduct({ ...newProduct, cost: Number(e.target.value) })}
                                        className={`w-full p-2 border border-cafe-200 rounded-lg ${recipe ? 'bg-gray-100 text-gray-500' : ''}`}
                                        placeholder={recipe ? "คำนวณจากสูตร" : "ระบุเอง"}
                                    />
                                </div>
                            </div>
                        </>
                    ) : (
                        <RecipeBuilder product={newProduct} onRecipeChange={setRecipe} />
                    )}

                    <button type="submit" className="w-full bg-cafe-600 text-white py-2 rounded-lg hover:bg-cafe-700 mt-4">
                        บันทึกเมนู
                    </button>
                </form>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={isDeleteModalOpen}
                onClose={handleCancelDelete}
                title="ยืนยันการลบเมนู"
            >
                <div className="space-y-4">
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <p className="text-cafe-800 mb-2">
                            คุณแน่ใจหรือไม่ว่าต้องการลบเมนูนี้?
                        </p>
                        {productToDelete && (
                            <div className="bg-white rounded-lg p-3 mt-3">
                                <p className="font-bold text-cafe-800">{productToDelete.name}</p>
                                <p className="text-sm text-cafe-500">
                                    {productToDelete.category} {productToDelete.flavor && `• ${productToDelete.flavor}`}
                                </p>
                                <p className="text-sm text-cafe-600 mt-1">
                                    ราคา: ฿{productToDelete.price}
                                </p>
                            </div>
                        )}
                        <p className="text-sm text-red-600 mt-3">
                            ⚠️ การลบนี้ไม่สามารถย้อนกลับได้
                        </p>
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={handleCancelDelete}
                            className="flex-1 bg-gray-200 text-cafe-800 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
                        >
                            ยกเลิก
                        </button>
                        <button
                            onClick={handleConfirmDelete}
                            className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors"
                        >
                            ยืนยันการลบ
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Edit Product Modal */}
            <EditProductModal
                isOpen={isEditModalOpen}
                onClose={() => {
                    setIsEditModalOpen(false);
                    setProductToEdit(null);
                }}
                product={productToEdit}
            />
        </div>
    );
};
