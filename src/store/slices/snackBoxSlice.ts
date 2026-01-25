// ============================================================
// Snack Box Slice
// For Set Menu Management
// ============================================================

import { StateCreator } from 'zustand';
import { supabase } from '../../lib/supabase';
import { SnackBoxSet, SnackBoxSetItem, PackagingOption } from '../../../types';

// ===== Helper: Convert snake_case to camelCase for Set =====
const toSetCamelCase = (row: any): SnackBoxSet => ({
    id: row.id,
    name: row.name,
    nameThai: row.name_thai || '',
    description: row.description || '',
    price: parseFloat(row.price) || 0,
    minQuantity: row.min_quantity || 20,
    packagingId: row.packaging_id || '',
    packaging: row.packaging_options ? toPackagingCamelCase(row.packaging_options) : undefined,
    items: [],
    isActive: row.is_active ?? true,
    sortOrder: row.sort_order || 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at
});

// ===== Helper: Convert snake_case to camelCase for Set Item =====
const toItemCamelCase = (row: any): SnackBoxSetItem => ({
    id: row.id,
    setId: row.set_id,
    category: row.category || '',
    quantity: row.quantity || 1,
    selectionType: row.selection_type || 'pick_one',
    productIds: row.product_ids || [],
    sortOrder: row.sort_order || 0
});

// ===== Helper: Convert snake_case to camelCase for Packaging =====
const toPackagingCamelCase = (row: any): PackagingOption => ({
    id: row.id,
    name: row.name,
    extraCost: parseFloat(row.extra_cost) || 0,
    isActive: row.is_active ?? true,
    sortOrder: row.sort_order || 0
});

// ===== Slice Interface =====
export interface SnackBoxSlice {
    snackBoxSets: SnackBoxSet[];
    packagingOptions: PackagingOption[];
    isLoadingSnackBox: boolean;

    fetchSnackBoxSets: () => Promise<void>;
    fetchPackagingOptions: () => Promise<void>;
    createSnackBoxSet: (set: Omit<SnackBoxSet, 'id' | 'createdAt' | 'updatedAt' | 'items'>, items: Omit<SnackBoxSetItem, 'id' | 'setId'>[]) => Promise<SnackBoxSet>;
    updateSnackBoxSet: (id: string, updates: Partial<SnackBoxSet>, items?: Omit<SnackBoxSetItem, 'id' | 'setId'>[]) => Promise<void>;
    deleteSnackBoxSet: (id: string) => Promise<void>;
    createPackagingOption: (name: string, extraCost: number) => Promise<PackagingOption>;
}

// ===== Create Slice =====
export const createSnackBoxSlice: StateCreator<SnackBoxSlice> = (set, get) => ({
    snackBoxSets: [],
    packagingOptions: [],
    isLoadingSnackBox: false,

    // Fetch all sets with items and packaging
    fetchSnackBoxSets: async () => {
        set({ isLoadingSnackBox: true });
        try {
            // Fetch sets with packaging
            const { data: setsData, error: setsError } = await supabase
                .from('snack_box_sets')
                .select(`
          *,
          packaging_options(*)
        `)
                .order('sort_order', { ascending: true });

            if (setsError) throw setsError;

            // Fetch all items
            const { data: itemsData, error: itemsError } = await supabase
                .from('snack_box_set_items')
                .select('*')
                .order('sort_order', { ascending: true });

            if (itemsError) throw itemsError;

            // Map items to sets
            const sets: SnackBoxSet[] = (setsData || []).map(setRow => {
                const s = toSetCamelCase(setRow);
                s.items = (itemsData || [])
                    .filter(item => item.set_id === s.id)
                    .map(toItemCamelCase);
                return s;
            });

            set({ snackBoxSets: sets });
            console.log('[fetchSnackBoxSets] Loaded', sets.length, 'sets');
        } catch (error) {
            console.error('[fetchSnackBoxSets] Error:', error);
        } finally {
            set({ isLoadingSnackBox: false });
        }
    },

    // Fetch packaging options
    fetchPackagingOptions: async () => {
        try {
            const { data, error } = await supabase
                .from('packaging_options')
                .select('*')
                .eq('is_active', true)
                .order('sort_order', { ascending: true });

            if (error) throw error;

            set({ packagingOptions: (data || []).map(toPackagingCamelCase) });
            console.log('[fetchPackagingOptions] Loaded', data?.length, 'options');
        } catch (error) {
            console.error('[fetchPackagingOptions] Error:', error);
        }
    },

    // Create new set with items
    createSnackBoxSet: async (setData, items) => {
        try {
            // Insert set
            const { data: newSet, error: setError } = await supabase
                .from('snack_box_sets')
                .insert({
                    name: setData.name,
                    name_thai: setData.nameThai,
                    description: setData.description,
                    price: setData.price,
                    min_quantity: setData.minQuantity,
                    packaging_id: setData.packagingId || null,
                    is_active: setData.isActive ?? true,
                    sort_order: setData.sortOrder || 0
                })
                .select()
                .single();

            if (setError) throw setError;

            // Insert items
            if (items.length > 0) {
                const { error: itemsError } = await supabase
                    .from('snack_box_set_items')
                    .insert(
                        items.map((item, idx) => ({
                            set_id: newSet.id,
                            category: item.category,
                            quantity: item.quantity,
                            selection_type: item.selectionType,
                            product_ids: item.productIds,
                            sort_order: item.sortOrder ?? idx
                        }))
                    );

                if (itemsError) throw itemsError;
            }

            // Refresh data
            await get().fetchSnackBoxSets();

            console.log('[createSnackBoxSet] Created:', newSet.name);
            return toSetCamelCase(newSet);
        } catch (error) {
            console.error('[createSnackBoxSet] Error:', error);
            throw error;
        }
    },

    // Update set and optionally replace items
    updateSnackBoxSet: async (id, updates, items) => {
        try {
            // Build update object
            const updateData: Record<string, any> = { updated_at: new Date().toISOString() };

            if (updates.name !== undefined) updateData.name = updates.name;
            if (updates.nameThai !== undefined) updateData.name_thai = updates.nameThai;
            if (updates.description !== undefined) updateData.description = updates.description;
            if (updates.price !== undefined) updateData.price = updates.price;
            if (updates.minQuantity !== undefined) updateData.min_quantity = updates.minQuantity;
            if (updates.packagingId !== undefined) updateData.packaging_id = updates.packagingId || null;
            if (updates.isActive !== undefined) updateData.is_active = updates.isActive;
            if (updates.sortOrder !== undefined) updateData.sort_order = updates.sortOrder;

            // Update set
            const { error: setError } = await supabase
                .from('snack_box_sets')
                .update(updateData)
                .eq('id', id);

            if (setError) throw setError;

            // Replace items if provided
            if (items !== undefined) {
                // Delete old items
                await supabase
                    .from('snack_box_set_items')
                    .delete()
                    .eq('set_id', id);

                // Insert new items
                if (items.length > 0) {
                    const { error: itemsError } = await supabase
                        .from('snack_box_set_items')
                        .insert(
                            items.map((item, idx) => ({
                                set_id: id,
                                category: item.category,
                                quantity: item.quantity,
                                selection_type: item.selectionType,
                                product_ids: item.productIds,
                                sort_order: item.sortOrder ?? idx
                            }))
                        );

                    if (itemsError) throw itemsError;
                }
            }

            // Refresh data
            await get().fetchSnackBoxSets();

            console.log('[updateSnackBoxSet] Updated:', id);
        } catch (error) {
            console.error('[updateSnackBoxSet] Error:', error);
            throw error;
        }
    },

    // Delete set (items cascade)
    deleteSnackBoxSet: async (id) => {
        try {
            const { error } = await supabase
                .from('snack_box_sets')
                .delete()
                .eq('id', id);

            if (error) throw error;

            // Update local state
            set({ snackBoxSets: get().snackBoxSets.filter(s => s.id !== id) });

            console.log('[deleteSnackBoxSet] Deleted:', id);
        } catch (error) {
            console.error('[deleteSnackBoxSet] Error:', error);
            throw error;
        }
    },

    // 🛡️ Create new packaging option (Quick Add)
    createPackagingOption: async (name, extraCost) => {
        try {
            // Get max sort_order for new item
            const currentOptions = get().packagingOptions;
            const maxSortOrder = currentOptions.length > 0
                ? Math.max(...currentOptions.map(p => p.sortOrder)) + 1
                : 0;

            const { data, error } = await supabase
                .from('packaging_options')
                .insert({
                    name,
                    extra_cost: extraCost,
                    is_active: true,
                    sort_order: maxSortOrder
                })
                .select()
                .single();

            if (error) throw error;

            const newOption = toPackagingCamelCase(data);

            // Update local state immediately (Optimistic UI)
            set({ packagingOptions: [...currentOptions, newOption] });

            console.log('[createPackagingOption] Created:', name);
            return newOption;
        } catch (error) {
            console.error('[createPackagingOption] Error:', error);
            throw error;
        }
    }
});
