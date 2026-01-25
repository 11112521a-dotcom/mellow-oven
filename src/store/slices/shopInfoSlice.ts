// ============================================================
// Shop Info Slice
// For Promotion & Snack Box System
// ============================================================

import { StateCreator } from 'zustand';
import { supabase } from '../../lib/supabase';
import { uploadShopLogo, deleteShopLogo } from '../../lib/storage';
import { ShopInfo } from '../../../types';

// ===== Helper: Convert snake_case to camelCase =====
const toCamelCase = (row: any): ShopInfo => ({
    id: row.id,
    shopName: row.shop_name || '',
    ownerName: row.owner_name || '',
    idCardNumber: row.id_card_number || '',
    addressNumber: row.address_number || '',
    addressMoo: row.address_moo || '',
    addressSoi: row.address_soi || '',
    addressRoad: row.address_road || '',
    addressSubdistrict: row.address_subdistrict || '',
    addressDistrict: row.address_district || '',
    addressProvince: row.address_province || '',
    addressPostalCode: row.address_postal_code || '',
    phone: row.phone || '',
    lineId: row.line_id || '',
    email: row.email || '',
    facebook: row.facebook || '',
    bankName: row.bank_name || '',
    bankAccountName: row.bank_account_name || '',
    bankAccountNumber: row.bank_account_number || '',
    logoUrl: row.logo_url,
    updatedAt: row.updated_at
});

// ===== Helper: Convert camelCase to snake_case =====
const toSnakeCase = (info: Partial<ShopInfo>): Record<string, any> => {
    const result: Record<string, any> = {};

    if (info.shopName !== undefined) result.shop_name = info.shopName;
    if (info.ownerName !== undefined) result.owner_name = info.ownerName;
    if (info.idCardNumber !== undefined) result.id_card_number = info.idCardNumber;
    if (info.addressNumber !== undefined) result.address_number = info.addressNumber;
    if (info.addressMoo !== undefined) result.address_moo = info.addressMoo;
    if (info.addressSoi !== undefined) result.address_soi = info.addressSoi;
    if (info.addressRoad !== undefined) result.address_road = info.addressRoad;
    if (info.addressSubdistrict !== undefined) result.address_subdistrict = info.addressSubdistrict;
    if (info.addressDistrict !== undefined) result.address_district = info.addressDistrict;
    if (info.addressProvince !== undefined) result.address_province = info.addressProvince;
    if (info.addressPostalCode !== undefined) result.address_postal_code = info.addressPostalCode;
    if (info.phone !== undefined) result.phone = info.phone;
    if (info.lineId !== undefined) result.line_id = info.lineId;
    if (info.email !== undefined) result.email = info.email;
    if (info.facebook !== undefined) result.facebook = info.facebook;
    if (info.bankName !== undefined) result.bank_name = info.bankName;
    if (info.bankAccountName !== undefined) result.bank_account_name = info.bankAccountName;
    if (info.bankAccountNumber !== undefined) result.bank_account_number = info.bankAccountNumber;
    if (info.logoUrl !== undefined) result.logo_url = info.logoUrl;

    result.updated_at = new Date().toISOString();

    return result;
};

// ===== Slice Interface =====
export interface ShopInfoSlice {
    shopInfo: ShopInfo | null;
    isLoadingShopInfo: boolean;

    fetchShopInfo: () => Promise<void>;
    updateShopInfo: (info: Partial<ShopInfo>) => Promise<void>;
    uploadLogo: (file: File) => Promise<string>;
    deleteLogo: () => Promise<void>;
}

// ===== Create Slice =====
export const createShopInfoSlice: StateCreator<ShopInfoSlice> = (set, get) => ({
    shopInfo: null,
    isLoadingShopInfo: false,

    // Fetch shop info (single row)
    fetchShopInfo: async () => {
        set({ isLoadingShopInfo: true });
        try {
            const { data, error } = await supabase
                .from('shop_info')
                .select('*')
                .limit(1)
                .maybeSingle();

            if (error) throw error;

            if (data) {
                set({ shopInfo: toCamelCase(data) });
            } else {
                // No shop info yet - create empty one
                set({ shopInfo: null });
            }
        } catch (error) {
            console.error('[fetchShopInfo] Error:', error);
        } finally {
            set({ isLoadingShopInfo: false });
        }
    },

    // Update shop info (upsert)
    updateShopInfo: async (info: Partial<ShopInfo>) => {
        const current = get().shopInfo;

        try {
            const updateData = toSnakeCase(info);

            if (current?.id) {
                // Update existing
                const { data, error } = await supabase
                    .from('shop_info')
                    .update(updateData)
                    .eq('id', current.id)
                    .select()
                    .single();

                if (error) throw error;
                set({ shopInfo: toCamelCase(data) });
            } else {
                // Insert new
                const { data, error } = await supabase
                    .from('shop_info')
                    .insert(updateData)
                    .select()
                    .single();

                if (error) throw error;
                set({ shopInfo: toCamelCase(data) });
            }

            console.log('[updateShopInfo] Success');
        } catch (error) {
            console.error('[updateShopInfo] Error:', error);
            throw error;
        }
    },

    // Upload logo and update shop info
    uploadLogo: async (file: File) => {
        try {
            // Delete old logo if exists
            const current = get().shopInfo;
            if (current?.logoUrl) {
                await deleteShopLogo(current.logoUrl);
            }

            // Upload new logo
            const url = await uploadShopLogo(file);
            if (!url) throw new Error('Upload failed');

            // Update shop info with new URL
            await get().updateShopInfo({ logoUrl: url });

            console.log('[uploadLogo] Success:', url);
            return url;
        } catch (error) {
            console.error('[uploadLogo] Error:', error);
            throw error;
        }
    },

    // Delete logo
    deleteLogo: async () => {
        try {
            const current = get().shopInfo;
            if (!current?.logoUrl) return;

            await deleteShopLogo(current.logoUrl);
            await get().updateShopInfo({ logoUrl: null });

            console.log('[deleteLogo] Success');
        } catch (error) {
            console.error('[deleteLogo] Error:', error);
            throw error;
        }
    }
});
