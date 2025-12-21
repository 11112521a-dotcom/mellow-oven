-- ============================================
-- FIX: unallocated_profits table for Special Order profits
-- Run this in Supabase SQL Editor
-- ============================================

-- Step 0: Enable required extensions for UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Step 1: Drop and recreate table with proper UUID default
DROP TABLE IF EXISTS unallocated_profits CASCADE;
CREATE TABLE IF NOT EXISTS unallocated_profits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    source TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 2: Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_unallocated_profits_date ON unallocated_profits(date);

-- Step 3: Enable RLS
ALTER TABLE unallocated_profits ENABLE ROW LEVEL SECURITY;

-- Step 4: Drop existing policies (to avoid conflicts)
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON unallocated_profits;
DROP POLICY IF EXISTS "Allow anon read" ON unallocated_profits;
DROP POLICY IF EXISTS "Allow anon insert" ON unallocated_profits;
DROP POLICY IF EXISTS "Allow anon update" ON unallocated_profits;
DROP POLICY IF EXISTS "Allow anon delete" ON unallocated_profits;

-- Step 5: Create permissive policies for anon role
CREATE POLICY "Allow anon read" ON unallocated_profits FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon insert" ON unallocated_profits FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon update" ON unallocated_profits FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon delete" ON unallocated_profits FOR DELETE TO anon USING (true);

-- Step 6: Also allow authenticated users
CREATE POLICY "Allow auth read" ON unallocated_profits FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow auth insert" ON unallocated_profits FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow auth update" ON unallocated_profits FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow auth delete" ON unallocated_profits FOR DELETE TO authenticated USING (true);

-- Verify
SELECT 'unallocated_profits table ready!' as status;
