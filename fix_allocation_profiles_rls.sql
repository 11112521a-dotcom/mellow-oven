-- ============================================
-- FIX: allocation_profiles RLS policies  
-- Run this in Supabase SQL Editor
-- ============================================

-- Step 1: Enable RLS
ALTER TABLE allocation_profiles ENABLE ROW LEVEL SECURITY;

-- Step 2: Drop existing policies
DROP POLICY IF EXISTS "Allow anon read" ON allocation_profiles;
DROP POLICY IF EXISTS "Allow anon insert" ON allocation_profiles;
DROP POLICY IF EXISTS "Allow anon update" ON allocation_profiles;
DROP POLICY IF EXISTS "Allow anon delete" ON allocation_profiles;
DROP POLICY IF EXISTS "Allow auth read" ON allocation_profiles;
DROP POLICY IF EXISTS "Allow auth all" ON allocation_profiles;

-- Step 3: Create permissive policies for anon
CREATE POLICY "Allow anon read" ON allocation_profiles FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon insert" ON allocation_profiles FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon update" ON allocation_profiles FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon delete" ON allocation_profiles FOR DELETE TO anon USING (true);

-- Step 4: Also for authenticated
CREATE POLICY "Allow auth read" ON allocation_profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow auth insert" ON allocation_profiles FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow auth update" ON allocation_profiles FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow auth delete" ON allocation_profiles FOR DELETE TO authenticated USING (true);

-- Verify
SELECT 'allocation_profiles RLS ready!' as status;
