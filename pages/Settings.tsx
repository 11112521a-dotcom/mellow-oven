// ============================================================
// Settings Page
// Shop Info and Configuration
// ============================================================

import React from 'react';
import { ShopInfoForm } from '../src/components/Settings/ShopInfoForm';
import { Settings } from 'lucide-react';

const SettingsPage: React.FC = () => {
    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl p-6 text-white">
                <h1 className="text-2xl font-bold flex items-center gap-3">
                    <Settings className="w-8 h-8" />
                    ตั้งค่าระบบ
                </h1>
                <p className="mt-2 text-white/80">
                    จัดการข้อมูลร้าน สำหรับใช้ในใบเสนอราคาและเอกสารอื่นๆ
                </p>
            </div>

            {/* Shop Info Form */}
            <ShopInfoForm />
        </div>
    );
};

export default SettingsPage;
