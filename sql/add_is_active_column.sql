-- =============================================
-- Menu Management: is_active column (สวิตช์พักขาย)
-- =============================================
-- Run this in Supabase SQL Editor
-- =============================================

-- Add is_active column to products table
-- Default TRUE so existing products remain active
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- 🚀 Architect's Recommendation: Add Index for performance
-- หน้าขายทุกหน้าจะ WHERE is_active = true
CREATE INDEX IF NOT EXISTS idx_products_is_active ON products(is_active);

-- Ensure existing products are active
UPDATE products SET is_active = TRUE WHERE is_active IS NULL;
