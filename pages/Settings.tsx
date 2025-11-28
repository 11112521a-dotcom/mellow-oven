import React, { useState, useRef } from 'react';
import { useStore } from '@/src/store';
import { MarketManager } from '@/src/components/POS/MarketManager';
import { Save, Download, Upload, RotateCcw, Info, Store, Database, Settings as SettingsIcon } from 'lucide-react';

const Settings: React.FC = () => {
    const { storeName, setStoreName, resetStore, loadStore } = useStore();
    const [activeTab, setActiveTab] = useState('general');
    const [tempStoreName, setTempStoreName] = useState(storeName);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleSaveGeneral = () => {
        setStoreName(tempStoreName);
        alert('บันทึกการตั้งค่าเรียบร้อยแล้ว');
    };

    const handleExportData = () => {
        const state = useStore.getState();
        const dataStr = JSON.stringify(state, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `bakesoft-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const json = JSON.parse(e.target?.result as string);
                if (confirm('คำเตือน: การนำเข้าข้อมูลจะทับข้อมูลปัจจุบันทั้งหมด คุณแน่ใจหรือไม่?')) {
                    loadStore(json);
                    alert('นำเข้าข้อมูลสำเร็จ! กรุณารีเฟรชหน้าจอ');
                    window.location.reload();
                }
            } catch (error) {
                alert('เกิดข้อผิดพลาดในการอ่านไฟล์: รูปแบบไฟล์ไม่ถูกต้อง');
            }
        };
        reader.readAsText(file);
    };

    const handleResetData = () => {
        if (confirm('อันตราย! คุณกำลังจะลบข้อมูลทั้งหมดในระบบ\n\nการกระทำนี้ไม่สามารถย้อนกลับได้\n\nพิมพ์ "DELETE" เพื่อยืนยัน')) {
            const confirmation = prompt('พิมพ์ "DELETE" เพื่อยืนยันการลบข้อมูล');
            if (confirmation === 'DELETE') {
                resetStore();
                alert('ล้างข้อมูลเรียบร้อยแล้ว');
                window.location.reload();
            }
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-cafe-100 flex items-center gap-4">
                <div className="p-3 bg-cafe-100 rounded-xl text-cafe-600">
                    <SettingsIcon size={32} />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-cafe-900">การตั้งค่า (Settings)</h1>
                    <p className="text-cafe-500">จัดการข้อมูลร้านค้าและระบบ</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-cafe-200 overflow-x-auto pb-1">
                <button
                    onClick={() => setActiveTab('general')}
                    className={`px-6 py-3 rounded-t-lg font-medium transition-colors whitespace-nowrap flex items-center gap-2 ${activeTab === 'general' ? 'bg-white text-cafe-700 border-b-2 border-cafe-600' : 'text-cafe-500 hover:text-cafe-700'}`}
                >
                    <Store size={18} /> ทั่วไป
                </button>
                <button
                    onClick={() => setActiveTab('markets')}
                    className={`px-6 py-3 rounded-t-lg font-medium transition-colors whitespace-nowrap flex items-center gap-2 ${activeTab === 'markets' ? 'bg-white text-cafe-700 border-b-2 border-cafe-600' : 'text-cafe-500 hover:text-cafe-700'}`}
                >
                    <Store size={18} /> จัดการสาขา/ตลาด
                </button>
                <button
                    onClick={() => setActiveTab('data')}
                    className={`px-6 py-3 rounded-t-lg font-medium transition-colors whitespace-nowrap flex items-center gap-2 ${activeTab === 'data' ? 'bg-white text-cafe-700 border-b-2 border-cafe-600' : 'text-cafe-500 hover:text-cafe-700'}`}
                >
                    <Database size={18} /> จัดการข้อมูล
                </button>
                <button
                    onClick={() => setActiveTab('about')}
                    className={`px-6 py-3 rounded-t-lg font-medium transition-colors whitespace-nowrap flex items-center gap-2 ${activeTab === 'about' ? 'bg-white text-cafe-700 border-b-2 border-cafe-600' : 'text-cafe-500 hover:text-cafe-700'}`}
                >
                    <Info size={18} /> เกี่ยวกับระบบ
                </button>
            </div>

            {/* Content */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-cafe-100 min-h-[500px]">
                {activeTab === 'general' && (
                    <div className="max-w-2xl space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-cafe-700 mb-2">ชื่อร้านค้า</label>
                            <input
                                type="text"
                                value={tempStoreName}
                                onChange={(e) => setTempStoreName(e.target.value)}
                                className="w-full p-3 border border-cafe-200 rounded-lg focus:ring-2 focus:ring-cafe-500 outline-none"
                                placeholder="ชื่อร้านของคุณ"
                            />
                        </div>
                        <button
                            onClick={handleSaveGeneral}
                            className="bg-cafe-600 text-white px-6 py-3 rounded-lg hover:bg-cafe-700 transition-colors flex items-center gap-2 font-medium"
                        >
                            <Save size={20} /> บันทึกการเปลี่ยนแปลง
                        </button>
                    </div>
                )}

                {activeTab === 'markets' && (
                    <div>
                        <div className="mb-6 p-4 bg-blue-50 text-blue-800 rounded-lg text-sm border border-blue-100">
                            <Info size={16} className="inline mr-2" />
                            คุณสามารถเพิ่ม ลบ หรือแก้ไขข้อมูลตลาด/สาขา ที่คุณไปขายของได้ที่นี่ ข้อมูลนี้จะถูกใช้ในการบันทึกยอดขายและวิเคราะห์ผลประกอบการ
                        </div>
                        <MarketManager />
                    </div>
                )}

                {activeTab === 'data' && (
                    <div className="space-y-8 max-w-3xl">
                        {/* Backup / Restore */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="p-6 border border-cafe-200 rounded-xl bg-cafe-50">
                                <h3 className="font-bold text-cafe-800 mb-2 flex items-center gap-2">
                                    <Download size={20} /> สำรองข้อมูล (Backup)
                                </h3>
                                <p className="text-sm text-cafe-500 mb-4">
                                    ดาวน์โหลดข้อมูลทั้งหมดในระบบเก็บไว้เป็นไฟล์ .json เพื่อป้องกันข้อมูลสูญหาย
                                </p>
                                <button
                                    onClick={handleExportData}
                                    className="w-full bg-white border border-cafe-300 text-cafe-700 px-4 py-2 rounded-lg hover:bg-cafe-100 transition-colors font-medium"
                                >
                                    ดาวน์โหลดข้อมูล
                                </button>
                            </div>

                            <div className="p-6 border border-cafe-200 rounded-xl bg-cafe-50">
                                <h3 className="font-bold text-cafe-800 mb-2 flex items-center gap-2">
                                    <Upload size={20} /> กู้คืนข้อมูล (Restore)
                                </h3>
                                <p className="text-sm text-cafe-500 mb-4">
                                    นำเข้าไฟล์ .json ที่เคยสำรองไว้ เพื่อกู้คืนข้อมูลกลับมา
                                </p>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleImportData}
                                    accept=".json"
                                    className="hidden"
                                />
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-full bg-white border border-cafe-300 text-cafe-700 px-4 py-2 rounded-lg hover:bg-cafe-100 transition-colors font-medium"
                                >
                                    เลือกไฟล์กู้คืน
                                </button>
                            </div>
                        </div>

                        {/* Danger Zone */}
                        <div className="pt-8 border-t border-cafe-200">
                            <h3 className="font-bold text-red-600 mb-4 flex items-center gap-2">
                                <RotateCcw size={20} /> พื้นที่อันตราย (Danger Zone)
                            </h3>
                            <div className="p-6 border border-red-200 rounded-xl bg-red-50 flex justify-between items-center">
                                <div>
                                    <h4 className="font-bold text-red-800">ล้างข้อมูลทั้งหมด (Factory Reset)</h4>
                                    <p className="text-sm text-red-600 mt-1">
                                        ลบข้อมูลยอดขาย, สินค้า, และการตั้งค่าทั้งหมด กลับไปเป็นค่าเริ่มต้น
                                    </p>
                                </div>
                                <button
                                    onClick={handleResetData}
                                    className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors font-bold shadow-lg shadow-red-200"
                                >
                                    ล้างข้อมูล
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'about' && (
                    <div className="text-center py-12">
                        <div className="w-20 h-20 bg-cafe-100 rounded-full flex items-center justify-center mx-auto mb-6 text-cafe-600">
                            <Store size={40} />
                        </div>
                        <h2 className="text-3xl font-bold text-cafe-800 mb-2">BakeSoft Café Manager</h2>
                        <p className="text-cafe-500 mb-8">ระบบจัดการร้านเบเกอรี่ครบวงจร</p>

                        <div className="inline-block text-left bg-cafe-50 p-6 rounded-xl border border-cafe-100">
                            <p className="mb-2"><span className="font-bold text-cafe-700">Version:</span> 1.0.0 (Beta)</p>
                            <p className="mb-2"><span className="font-bold text-cafe-700">Developer:</span> Antigravity</p>
                            <p className="mb-2"><span className="font-bold text-cafe-700">Tech Stack:</span> React, TypeScript, TailwindCSS, Zustand</p>
                            <p><span className="font-bold text-cafe-700">Last Updated:</span> November 2025</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Settings;
