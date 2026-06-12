-- 1. เพิ่มคอลัมน์ market_ids ในตาราง products เพื่อเก็บตลาด/สาขาที่สินค้านี้วางขาย
-- ค่าเริ่มต้นถูกกำหนดเป็น ARRAY[]::TEXT[] (อาเรย์ว่าง) เพื่อไม่ให้ข้อมูลสินค้าเดิมแครช
ALTER TABLE products ADD COLUMN IF NOT EXISTS market_ids TEXT[] DEFAULT ARRAY[]::TEXT[];

-- 2. สร้าง Index เพื่อให้การค้นหา/ฟิลเตอร์สินค้าตามตลาดรวดเร็วขึ้น
CREATE INDEX IF NOT EXISTS idx_products_market_ids ON products USING GIN (market_ids);

-- 3. อัปเดตข้อมูลสินค้าเดิมทั้งหมดในฐานข้อมูลให้มีค่าเป็นอาเรย์ว่างแทน NULL
UPDATE products SET market_ids = ARRAY[]::TEXT[] WHERE market_ids IS NULL;
