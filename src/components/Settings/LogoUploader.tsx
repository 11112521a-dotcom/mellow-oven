// ============================================================
// Logo Uploader Component
// Upload and preview shop logo
// ============================================================

import React, { useState, useRef } from 'react';
import { useStore } from '../../store';
import { Upload, Trash2, Loader2, Image as ImageIcon } from 'lucide-react';

export const LogoUploader: React.FC = () => {
    const { shopInfo, uploadLogo, deleteLogo } = useStore();
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // No file size limit - user's own shop
        // Just validate file type
        const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            setError('รองรับเฉพาะไฟล์ PNG, JPG, SVG, WEBP');
            return;
        }

        setError(null);
        setIsUploading(true);

        try {
            await uploadLogo(file);
        } catch (err) {
            console.error('Upload error:', err);
            setError('เกิดข้อผิดพลาดในการอัพโหลด');
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleDelete = async () => {
        if (!confirm('ต้องการลบโลโก้หรือไม่?')) return;

        setIsUploading(true);
        try {
            await deleteLogo();
        } catch (err) {
            console.error('Delete error:', err);
            setError('เกิดข้อผิดพลาดในการลบ');
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="flex items-center gap-6">
            {/* Preview */}
            <div className="w-32 h-32 rounded-xl bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden">
                {shopInfo?.logoUrl ? (
                    <img
                        src={shopInfo.logoUrl}
                        alt="Shop Logo"
                        className="w-full h-full object-contain"
                    />
                ) : (
                    <ImageIcon className="w-12 h-12 text-gray-400" />
                )}
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-3">
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/svg+xml,image/webp"
                    onChange={handleFileSelect}
                    className="hidden"
                    disabled={isUploading}
                />

                <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="flex items-center gap-2 px-4 py-2 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 transition-colors disabled:opacity-50"
                >
                    {isUploading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <Upload className="w-4 h-4" />
                    )}
                    {shopInfo?.logoUrl ? 'เปลี่ยนโลโก้' : 'อัพโหลดโลโก้'}
                </button>

                {shopInfo?.logoUrl && (
                    <button
                        onClick={handleDelete}
                        disabled={isUploading}
                        className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                    >
                        <Trash2 className="w-4 h-4" />
                        ลบโลโก้
                    </button>
                )}

                <p className="text-xs text-gray-500">
                    รองรับ PNG, JPG, SVG, WEBP (ไม่จำกัดขนาด)
                </p>

                {error && (
                    <p className="text-sm text-red-500">{error}</p>
                )}
            </div>
        </div>
    );
};
