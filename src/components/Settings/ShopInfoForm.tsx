// ============================================================
// Shop Info Form Component
// Settings page for shop information
// ============================================================

import React, { useState, useEffect } from 'react';
import { useStore } from '../../store';
import { LogoUploader } from './LogoUploader';
import {
    Building, User, CreditCard, Phone, Mail, MapPin,
    Landmark, Save, Loader2
} from 'lucide-react';

export const ShopInfoForm: React.FC = () => {
    const { shopInfo, fetchShopInfo, updateShopInfo, isLoadingShopInfo } = useStore();

    const [form, setForm] = useState({
        shopName: '',
        ownerName: '',
        idCardNumber: '',
        addressNumber: '',
        addressMoo: '',
        addressSoi: '',
        addressRoad: '',
        addressSubdistrict: '',
        addressDistrict: '',
        addressProvince: '',
        addressPostalCode: '',
        phone: '',
        lineId: '',
        email: '',
        facebook: '',
        bankName: '',
        bankAccountName: '',
        bankAccountNumber: ''
    });

    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // Load shop info on mount
    useEffect(() => {
        fetchShopInfo();
    }, []);

    // Populate form when shopInfo loads
    useEffect(() => {
        if (shopInfo) {
            setForm({
                shopName: shopInfo.shopName || '',
                ownerName: shopInfo.ownerName || '',
                idCardNumber: shopInfo.idCardNumber || '',
                addressNumber: shopInfo.addressNumber || '',
                addressMoo: shopInfo.addressMoo || '',
                addressSoi: shopInfo.addressSoi || '',
                addressRoad: shopInfo.addressRoad || '',
                addressSubdistrict: shopInfo.addressSubdistrict || '',
                addressDistrict: shopInfo.addressDistrict || '',
                addressProvince: shopInfo.addressProvince || '',
                addressPostalCode: shopInfo.addressPostalCode || '',
                phone: shopInfo.phone || '',
                lineId: shopInfo.lineId || '',
                email: shopInfo.email || '',
                facebook: shopInfo.facebook || '',
                bankName: shopInfo.bankName || '',
                bankAccountName: shopInfo.bankAccountName || '',
                bankAccountNumber: shopInfo.bankAccountNumber || ''
            });
        }
    }, [shopInfo]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setForm(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        setMessage(null);

        try {
            await updateShopInfo(form);
            setMessage({ type: 'success', text: 'บันทึกข้อมูลร้านค้าเรียบร้อยแล้ว!' });
            setTimeout(() => setMessage(null), 3000);
        } catch (error) {
            console.error('Save error:', error);
            setMessage({ type: 'error', text: 'เกิดข้อผิดพลาดในการบันทึก' });
        } finally {
            setIsSaving(false);
        }
    };

    const inputClass = "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all";
    const labelClass = "block text-sm font-medium text-gray-700 mb-1";

    if (isLoadingShopInfo) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
                <span className="ml-2 text-gray-600">กำลังโหลดข้อมูล...</span>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-8 max-w-4xl mx-auto">
            {/* Message */}
            {message && (
                <div className={`p-4 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                    {message.text}
                </div>
            )}

            {/* Logo Upload */}
            <section className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <Building className="w-5 h-5 text-amber-600" />
                    โลโก้ร้าน
                </h3>
                <LogoUploader />
            </section>

            {/* Shop Info */}
            <section className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <Building className="w-5 h-5 text-amber-600" />
                    ข้อมูลร้านค้า
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className={labelClass}>ชื่อร้าน</label>
                        <input type="text" name="shopName" value={form.shopName} onChange={handleChange} className={inputClass} placeholder="Mellow Oven" />
                    </div>
                    <div>
                        <label className={labelClass}>ชื่อเจ้าของ</label>
                        <input type="text" name="ownerName" value={form.ownerName} onChange={handleChange} className={inputClass} placeholder="นาย/นาง ชื่อ นามสกุล" />
                    </div>
                    <div className="md:col-span-2">
                        <label className={labelClass}>เลขบัตรประชาชน (สำหรับใบเสนอราคา)</label>
                        <input type="text" name="idCardNumber" value={form.idCardNumber} onChange={handleChange} className={inputClass} placeholder="x-xxxx-xxxxx-xx-x" />
                    </div>
                </div>
            </section>

            {/* Address */}
            <section className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-amber-600" />
                    ที่อยู่
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                        <label className={labelClass}>เลขที่</label>
                        <input type="text" name="addressNumber" value={form.addressNumber} onChange={handleChange} className={inputClass} placeholder="123" />
                    </div>
                    <div>
                        <label className={labelClass}>หมู่</label>
                        <input type="text" name="addressMoo" value={form.addressMoo} onChange={handleChange} className={inputClass} placeholder="5" />
                    </div>
                    <div>
                        <label className={labelClass}>ซอย</label>
                        <input type="text" name="addressSoi" value={form.addressSoi} onChange={handleChange} className={inputClass} placeholder="สุขุมวิท 101" />
                    </div>
                    <div>
                        <label className={labelClass}>ถนน</label>
                        <input type="text" name="addressRoad" value={form.addressRoad} onChange={handleChange} className={inputClass} placeholder="สุขุมวิท" />
                    </div>
                    <div>
                        <label className={labelClass}>ตำบล/แขวง</label>
                        <input type="text" name="addressSubdistrict" value={form.addressSubdistrict} onChange={handleChange} className={inputClass} placeholder="บางนา" />
                    </div>
                    <div>
                        <label className={labelClass}>อำเภอ/เขต</label>
                        <input type="text" name="addressDistrict" value={form.addressDistrict} onChange={handleChange} className={inputClass} placeholder="บางนา" />
                    </div>
                    <div>
                        <label className={labelClass}>จังหวัด</label>
                        <input type="text" name="addressProvince" value={form.addressProvince} onChange={handleChange} className={inputClass} placeholder="กรุงเทพมหานคร" />
                    </div>
                    <div>
                        <label className={labelClass}>รหัสไปรษณีย์</label>
                        <input type="text" name="addressPostalCode" value={form.addressPostalCode} onChange={handleChange} className={inputClass} placeholder="10260" />
                    </div>
                </div>
            </section>

            {/* Contact */}
            <section className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <Phone className="w-5 h-5 text-amber-600" />
                    ช่องทางติดต่อ
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className={labelClass}>โทรศัพท์</label>
                        <input type="tel" name="phone" value={form.phone} onChange={handleChange} className={inputClass} placeholder="0xx-xxx-xxxx" />
                    </div>
                    <div>
                        <label className={labelClass}>Line ID</label>
                        <input type="text" name="lineId" value={form.lineId} onChange={handleChange} className={inputClass} placeholder="@mellowoven" />
                    </div>
                    <div>
                        <label className={labelClass}>Email</label>
                        <input type="email" name="email" value={form.email} onChange={handleChange} className={inputClass} placeholder="contact@mellowoven.com" />
                    </div>
                    <div>
                        <label className={labelClass}>Facebook</label>
                        <input type="text" name="facebook" value={form.facebook} onChange={handleChange} className={inputClass} placeholder="facebook.com/mellowoven" />
                    </div>
                </div>
            </section>

            {/* Bank */}
            <section className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                    <Landmark className="w-5 h-5 text-amber-600" />
                    บัญชีธนาคาร (สำหรับใบเสนอราคา)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className={labelClass}>ธนาคาร</label>
                        <input type="text" name="bankName" value={form.bankName} onChange={handleChange} className={inputClass} placeholder="กสิกรไทย" />
                    </div>
                    <div>
                        <label className={labelClass}>ชื่อบัญชี</label>
                        <input type="text" name="bankAccountName" value={form.bankAccountName} onChange={handleChange} className={inputClass} placeholder="นาย ชื่อ นามสกุล" />
                    </div>
                    <div>
                        <label className={labelClass}>เลขที่บัญชี</label>
                        <input type="text" name="bankAccountNumber" value={form.bankAccountNumber} onChange={handleChange} className={inputClass} placeholder="xxx-x-xxxxx-x" />
                    </div>
                </div>
            </section>

            {/* Save Button */}
            <div className="flex justify-end">
                <button
                    type="submit"
                    disabled={isSaving}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-semibold hover:from-amber-600 hover:to-orange-600 transition-all shadow-lg disabled:opacity-50"
                >
                    {isSaving ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            กำลังบันทึก...
                        </>
                    ) : (
                        <>
                            <Save className="w-5 h-5" />
                            บันทึกข้อมูล
                        </>
                    )}
                </button>
            </div>
        </form>
    );
};
