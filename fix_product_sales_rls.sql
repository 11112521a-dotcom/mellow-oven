-- ============================================
-- FIX: product_sales table RLS policies
-- Run this in Supabase SQL Editor
-- ============================================

-- Step 1: Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Step 2: Check if table exists, add missing columns
ALTER TABLE product_sales 
ADD COLUMN IF NOT EXISTS variant_id TEXT,
ADD COLUMN IF NOT EXISTS variant_name TEXT,
ADD COLUMN IF NOT EXISTS waste_qty INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS weather_condition TEXT;

-- Step 3: Drop old constraint and update
ALTER TABLE product_sales DROP CONSTRAINT IF EXISTS product_sales_quantity_sold_check;
ALTER TABLE product_sales 
ADD CONSTRAINT product_sales_quantity_sold_check 
CHECK (quantity_sold >= 0);

-- Step 4: Enable RLS
ALTER TABLE product_sales ENABLE ROW LEVEL SECURITY;

-- Step 5: Drop existing policies (to avoid conflicts)
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON product_sales;
DROP POLICY IF EXISTS "Allow anon read" ON product_sales;
DROP POLICY IF EXISTS "Allow anon insert" ON product_sales;
DROP POLICY IF EXISTS "Allow anon update" ON product_sales;
DROP POLICY IF EXISTS "Allow anon delete" ON product_sales;
DROP POLICY IF EXISTS "Allow all" ON product_sales;
DROP POLICY IF EXISTS "Enable read access for all users" ON product_sales;
DROP POLICY IF EXISTS "Enable insert for all users" ON product_sales;
DROP POLICY IF EXISTS "Enable update for all users" ON product_sales;
DROP POLICY IF EXISTS "Enable delete for all users" ON product_sales;

-- Step 6: Create permissive policies for anon role
CREATE POLICY "Allow anon read" ON product_sales FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon insert" ON product_sales FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon update" ON product_sales FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon delete" ON product_sales FOR DELETE TO anon USING (true);

-- Step 7: Also allow authenticated users
CREATE POLICY "Allow auth read" ON product_sales FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow auth insert" ON product_sales FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow auth update" ON product_sales FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow auth delete" ON product_sales FOR DELETE TO authenticated USING (true);

-- Verify
SELECT 'product_sales table ready!' as status;
