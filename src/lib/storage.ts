// ============================================================
// Supabase Storage Helpers
// For Promotion & Snack Box System
// ============================================================

import { supabase } from './supabase';

const BUCKET_NAME = 'shop-assets';

// ===== Upload Shop Logo =====
export async function uploadShopLogo(file: File): Promise<string | null> {
    try {
        // Validate file
        const maxSize = 2 * 1024 * 1024; // 2MB
        if (file.size > maxSize) {
            console.error('[uploadShopLogo] File too large:', file.size);
            throw new Error('ไฟล์ใหญ่เกิน 2MB');
        }

        const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'];
        if (!allowedTypes.includes(file.type)) {
            console.error('[uploadShopLogo] Invalid file type:', file.type);
            throw new Error('รองรับเฉพาะไฟล์ PNG, JPG, SVG');
        }

        // Generate unique filename
        const fileExt = file.name.split('.').pop()?.toLowerCase() || 'png';
        const fileName = `logo_${Date.now()}.${fileExt}`;
        const filePath = `shop/${fileName}`;

        // Upload to Supabase Storage
        const { data, error } = await supabase.storage
            .from(BUCKET_NAME)
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: true
            });

        if (error) {
            console.error('[uploadShopLogo] Upload error:', error);
            throw error;
        }

        // Get public URL
        const { data: urlData } = supabase.storage
            .from(BUCKET_NAME)
            .getPublicUrl(filePath);

        console.log('[uploadShopLogo] Success:', urlData.publicUrl);
        return urlData.publicUrl;

    } catch (error) {
        console.error('[uploadShopLogo] Error:', error);
        throw error;
    }
}

// ===== Delete Shop Logo =====
export async function deleteShopLogo(url: string): Promise<boolean> {
    try {
        // Extract path from URL
        const path = url.split(`/${BUCKET_NAME}/`)[1];
        if (!path) {
            console.error('[deleteShopLogo] Invalid URL:', url);
            return false;
        }

        const { error } = await supabase.storage
            .from(BUCKET_NAME)
            .remove([path]);

        if (error) {
            console.error('[deleteShopLogo] Delete error:', error);
            return false;
        }

        console.log('[deleteShopLogo] Success:', path);
        return true;

    } catch (error) {
        console.error('[deleteShopLogo] Error:', error);
        return false;
    }
}

// ===== Upload Generic Image =====
export async function uploadImage(
    file: File,
    folder: string = 'general'
): Promise<string | null> {
    try {
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxSize) {
            throw new Error('ไฟล์ใหญ่เกิน 5MB');
        }

        const fileExt = file.name.split('.').pop()?.toLowerCase() || 'png';
        const fileName = `${folder}_${Date.now()}.${fileExt}`;
        const filePath = `${folder}/${fileName}`;

        const { data, error } = await supabase.storage
            .from(BUCKET_NAME)
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: true
            });

        if (error) throw error;

        const { data: urlData } = supabase.storage
            .from(BUCKET_NAME)
            .getPublicUrl(filePath);

        return urlData.publicUrl;

    } catch (error) {
        console.error('[uploadImage] Error:', error);
        throw error;
    }
}

// ===== Delete Image by URL =====
export async function deleteImage(url: string): Promise<boolean> {
    try {
        const path = url.split(`/${BUCKET_NAME}/`)[1];
        if (!path) return false;

        const { error } = await supabase.storage
            .from(BUCKET_NAME)
            .remove([path]);

        return !error;

    } catch (error) {
        console.error('[deleteImage] Error:', error);
        return false;
    }
}

// ===== Get Public URL =====
export function getPublicUrl(path: string): string {
    const { data } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(path);

    return data.publicUrl;
}
