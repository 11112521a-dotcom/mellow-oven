-- =====================================================
-- 🔧 FIX: Database Schema Update Script
-- Run this in Supabase SQL Editor
-- =====================================================

-- =====================================================
-- PART 1: Fix product_sales table
-- =====================================================

-- Step 1: Drop the old constraint that requires quantity_sold > 0
-- (We need to allow quantity_sold = 0 when recording waste only)
ALTER TABLE product_sales DROP CONSTRAINT IF EXISTS product_sales_quantity_sold_check;

-- Step 2: Add missing columns for variants, waste, and weather
ALTER TABLE product_sales 
ADD COLUMN IF NOT EXISTS variant_id TEXT,
ADD COLUMN IF NOT EXISTS variant_name TEXT,
ADD COLUMN IF NOT EXISTS waste_qty INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS weather_condition TEXT;

-- Step 3: Update the constraint to allow quantity_sold >= 0
ALTER TABLE product_sales 
ADD CONSTRAINT product_sales_quantity_sold_check 
CHECK (quantity_sold >= 0);

-- Step 4: Allow NULL for category
ALTER TABLE product_sales ALTER COLUMN category DROP NOT NULL;

-- =====================================================
-- PART 2: Fix transactions table
-- =====================================================

-- Add market_id column if not exists
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS market_id TEXT;

-- =====================================================
-- PART 3: Fix unallocated_profits table
-- =====================================================

-- Create table if not exists
CREATE TABLE IF NOT EXISTS unallocated_profits (
    id TEXT PRIMARY KEY,
    date DATE NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    source TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE unallocated_profits ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY IF NOT EXISTS "Enable all access" ON unallocated_profits
    FOR ALL USING (true) WITH CHECK (true);

-- =====================================================
-- ✅ Done! Refresh your browser and try again.
-- =====================================================

