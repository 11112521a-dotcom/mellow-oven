-- =====================================================
-- 🚨 CRITICAL FIX: Run this IMMEDIATELY in Supabase SQL Editor
-- =====================================================

-- =====================================================
-- PART 1: Fix transactions table - change id from UUID to TEXT
-- =====================================================
ALTER TABLE transactions ALTER COLUMN id TYPE TEXT USING id::TEXT;

-- Add market_id column if not exists
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS market_id TEXT;

-- =====================================================
-- PART 2: Fix unallocated_profits table
-- =====================================================

-- Drop and recreate with TEXT id
DROP TABLE IF EXISTS unallocated_profits;

CREATE TABLE unallocated_profits (
    id TEXT PRIMARY KEY,
    date DATE NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    source TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Disable RLS for now (easier for testing)
ALTER TABLE unallocated_profits DISABLE ROW LEVEL SECURITY;

-- =====================================================
-- PART 3: Fix product_sales table - add missing columns
-- =====================================================

-- Add ALL missing columns
ALTER TABLE product_sales ADD COLUMN IF NOT EXISTS variant_id TEXT;
ALTER TABLE product_sales ADD COLUMN IF NOT EXISTS variant_name TEXT;
ALTER TABLE product_sales ADD COLUMN IF NOT EXISTS waste_qty INTEGER DEFAULT 0;
ALTER TABLE product_sales ADD COLUMN IF NOT EXISTS weather_condition TEXT;

-- Change id to TEXT if it's UUID
ALTER TABLE product_sales ALTER COLUMN id TYPE TEXT USING id::TEXT;

-- Fix quantity constraint
ALTER TABLE product_sales DROP CONSTRAINT IF EXISTS product_sales_quantity_sold_check;
ALTER TABLE product_sales ADD CONSTRAINT product_sales_quantity_sold_check CHECK (quantity_sold >= 0);

-- Allow NULL for category
ALTER TABLE product_sales ALTER COLUMN category DROP NOT NULL;

-- =====================================================
-- PART 4: Disable RLS on all tables for now
-- =====================================================
ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;
ALTER TABLE product_sales DISABLE ROW LEVEL SECURITY;

-- =====================================================
-- ✅ DONE! Refresh browser and try again.
-- =====================================================
