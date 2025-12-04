import React from 'react';
import { InventoryList } from '@/src/components/Inventory/InventoryList';
import { PurchaseOrderForm } from '@/src/components/Inventory/PurchaseOrder';
import { PurchaseOrderHistory } from '@/src/components/Inventory/PurchaseOrderHistory';

const Inventory: React.FC = () => {
    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <header>
                <h2 className="text-xl font-bold text-cafe-800 mb-2 flex items-center gap-2">
                    <span className="w-2 h-8 bg-cafe-600 rounded-full"></span>
                    จัดการสต็อก & จัดซื้อ (Inventory & Purchasing)
                </h2>
                <p className="text-cafe-500">ตรวจสอบวัตถุดิบและสั่งซื้อของเข้าร้าน</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Stock List */}
                <div className="lg:col-span-2">
                    <InventoryList />
                </div>

                {/* Right Column: Purchase Order */}
                <div className="lg:col-span-1">
                    <div className="sticky top-8">
                        <PurchaseOrderForm />
                    </div>
                </div>
            </div>

            {/* Purchase Order History */}
            <div>
                <PurchaseOrderHistory />
            </div>
        </div>
    );
};

export default Inventory;

