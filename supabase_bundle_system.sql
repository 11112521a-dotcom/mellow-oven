-- ================================================================
-- MELLOW OVEN - BUNDLE SYSTEM SCHEMA MIGRATION
-- Run this in Supabase SQL Editor
-- Date: 2025-12-29
-- ================================================================

-- 1. เพิ่ม Config ให้ Product (เก็บโครงสร้าง Slot)
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS bundle_config JSONB DEFAULT NULL;

-- 2. เพิ่ม Options ให้ Order Item (เก็บสิ่งที่ลูกค้าเลือก)
ALTER TABLE special_order_items 
ADD COLUMN IF NOT EXISTS selected_options JSONB DEFAULT NULL;

-- 3. สร้าง Index เพื่อให้ Query หา Bundle ง่ายๆ (Optional แต่แนะนำ)
CREATE INDEX IF NOT EXISTS idx_products_is_bundle 
ON products ((bundle_config->>'is_bundle'));

-- 4. Add comments for documentation
COMMENT ON COLUMN products.bundle_config IS 'Structure for composite products (slots, options)';
COMMENT ON COLUMN special_order_items.selected_options IS 'Snapshot of selected choices for bundle items';

-- ================================================================
-- EXAMPLE: Creating a Snack Box Template (สำหรับทดสอบ)
-- ================================================================
/*
UPDATE products 
SET bundle_config = '{
  "isBundle": true,
  "basePrice": 50,
  "slots": [
    {
      "id": "main_snack",
      "title": "เลือกของหวาน",
      "type": "single",
      "required": true,
      "options": [
        {"id": "opt_brownie", "productId": "uuid-brownie", "name": "บราวนี่", "surcharge": 0},
        {"id": "opt_croissant", "productId": "uuid-croissant", "name": "ครัวซองต์", "surcharge": 10}
      ]
    },
    {
      "id": "drink",
      "title": "เลือกเครื่องดื่ม",
      "type": "single",
      "required": true,
      "options": [
        {"id": "opt_milk", "productId": "uuid-milk", "name": "นมจืด", "surcharge": 0},
        {"id": "opt_oj", "productId": "uuid-oj", "name": "น้ำส้ม", "surcharge": 5}
      ]
    }
  ]
}'::jsonb
WHERE id = 'your-snack-box-product-id';
*/
