-- =====================================================
-- DAILY INVENTORY TABLE
-- สำหรับระบบ Stock Log ↔ Sales Log Integration
-- รัน SQL นี้ใน Supabase SQL Editor
-- =====================================================

CREATE TABLE IF NOT EXISTS daily_inventory (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT now(),
    business_date DATE NOT NULL,
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    
    -- INPUT FIELDS (กรอกมือ)
    produced_qty INT DEFAULT 0,    -- ผลิตใหม่
    to_shop_qty INT DEFAULT 0,     -- ส่งไปร้าน
    sold_qty INT DEFAULT 0,        -- ขายออกจริง
    
    -- CALCULATED (Denormalized for Reporting)
    stock_yesterday INT DEFAULT 0, -- ยกยอดมา
    leftover_home INT DEFAULT 0,   -- เหลือที่บ้าน = stock_yesterday + produced - to_shop
    unsold_shop INT DEFAULT 0,     -- เหลือที่ร้าน = to_shop - sold

    -- ป้องกันข้อมูลซ้ำ (1 สินค้า มีได้แค่ 1 แถวต่อวัน)
    UNIQUE(business_date, product_id)
);

-- Index เพื่อให้ดึงรายงานเร็วๆ
CREATE INDEX IF NOT EXISTS idx_inventory_date ON daily_inventory(business_date);
CREATE INDEX IF NOT EXISTS idx_inventory_product ON daily_inventory(product_id);

-- Enable RLS (Row Level Security)
ALTER TABLE daily_inventory ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all for authenticated users (adjust as needed)
CREATE POLICY "Allow all for authenticated users" ON daily_inventory
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- =====================================================
-- USAGE NOTES:
-- 1. Run this SQL in Supabase Dashboard > SQL Editor
-- 2. After running, the table will be ready for use
-- 3. RLS is enabled - adjust policy if needed
-- =====================================================
