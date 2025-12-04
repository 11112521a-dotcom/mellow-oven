-- เพิ่มฟิลด์ weather_condition ในตาราง product_sales
-- เพื่อเก็บสภาพอากาศในวันที่ขาย

ALTER TABLE product_sales 
ADD COLUMN IF NOT EXISTS weather_condition TEXT DEFAULT 'sunny';

ALTER TABLE product_sales
ADD COLUMN IF NOT EXISTS waste_qty INTEGER DEFAULT 0;

-- เพิ่ม comment อธิบาย
COMMENT ON COLUMN product_sales.weather_condition IS 'สภาพอากาศในวันที่ขาย: sunny, cloudy, rain, storm';
COMMENT ON COLUMN product_sales.waste_qty IS 'จำนวนสินค้าที่เสีย/ทิ้ง (ไม่ได้ขาย)';

-- สร้าง index สำหรับ weather_condition
CREATE INDEX IF NOT EXISTS idx_product_sales_weather 
ON product_sales(weather_condition);
