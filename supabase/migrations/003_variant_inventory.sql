-- Migration: Add variant_id support to daily_inventory
-- Run this in Supabase SQL Editor

-- Step 1: Add variant columns
ALTER TABLE daily_inventory 
ADD COLUMN IF NOT EXISTS variant_id TEXT,
ADD COLUMN IF NOT EXISTS variant_name TEXT;

-- Step 2: Drop the old unique constraint
ALTER TABLE daily_inventory 
DROP CONSTRAINT IF EXISTS daily_inventory_business_date_product_id_key;

-- Step 3: Create new unique constraint including variant_id
-- Using COALESCE to handle NULL variant_id (for products without variants)
CREATE UNIQUE INDEX IF NOT EXISTS daily_inventory_business_date_product_variant_key 
ON daily_inventory (business_date, product_id, COALESCE(variant_id, ''));

-- Step 4: Create index for faster variant lookups
CREATE INDEX IF NOT EXISTS idx_daily_inventory_variant 
ON daily_inventory (variant_id) WHERE variant_id IS NOT NULL;

-- Done! Variant-aware inventory is now supported.
