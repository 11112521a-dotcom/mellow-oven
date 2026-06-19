-- ========================================================
-- PHASE 3: Consignment System Update (Favorites & Giveaway)
-- ========================================================

-- 1. Add favorite_items JSONB to external_shops
ALTER TABLE public.external_shops
ADD COLUMN favorite_items JSONB DEFAULT '[]'::jsonb;

-- 2. Add total_quantity_giveaway to consignment_orders
ALTER TABLE public.consignment_orders
ADD COLUMN total_quantity_giveaway INTEGER NOT NULL DEFAULT 0;

-- 3. Add quantity_giveaway to consignment_order_items
ALTER TABLE public.consignment_order_items
ADD COLUMN quantity_giveaway INTEGER NOT NULL DEFAULT 0;
