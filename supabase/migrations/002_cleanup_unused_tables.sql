-- =====================================================
-- CLEANUP: ลบตารางที่ไม่ได้ใช้งาน
-- รัน SQL นี้ใน Supabase SQL Editor
-- =====================================================

-- ⚠️ WARNING: กรุณาตรวจสอบให้แน่ใจว่าไม่มีข้อมูลสำคัญก่อน Drop!

-- ตรวจสอบข้อมูลก่อน (Optional)
-- SELECT COUNT(*) FROM product_stocks;
-- SELECT COUNT(*) FROM stock_movements;

-- ลบตาราง
DROP TABLE IF EXISTS product_stocks CASCADE;
DROP TABLE IF EXISTS stock_movements CASCADE;

-- =====================================================
-- สรุป: ลบ 2 ตารางที่ไม่มีโค้ดใช้งาน
-- - product_stocks (Legacy)
-- - stock_movements (Legacy)
-- =====================================================
