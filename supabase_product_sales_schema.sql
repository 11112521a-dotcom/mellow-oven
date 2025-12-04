-- สร้างตาราง product_sales สำหรับบันทึกการขายรายเมนู
CREATE TABLE IF NOT EXISTS product_sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sale_date DATE NOT NULL,
    market_id TEXT NOT NULL,
    market_name TEXT NOT NULL,
    
    product_id TEXT NOT NULL,
    product_name TEXT NOT NULL,
    category TEXT NOT NULL,
    
    quantity_sold INTEGER NOT NULL CHECK (quantity_sold > 0),
    price_per_unit DECIMAL(10, 2) NOT NULL,
    total_revenue DECIMAL(10, 2) NOT NULL,
    cost_per_unit DECIMAL(10, 2) NOT NULL,
    total_cost DECIMAL(10, 2) NOT NULL,
    gross_profit DECIMAL(10, 2) NOT NULL
);

-- สร้าง Index สำหรับ Query ที่ใช้บ่อย
CREATE INDEX idx_product_sales_date ON product_sales(sale_date DESC);
CREATE INDEX idx_product_sales_product ON product_sales(product_id);
CREATE INDEX idx_product_sales_market ON product_sales(market_id);
CREATE INDEX idx_product_sales_category ON product_sales(category);

-- เปิด RLS (Row Level Security)
ALTER TABLE product_sales ENABLE ROW LEVEL SECURITY;

-- สร้าง Policy อนุญาตทุกการกระทำ (ปรับตามความต้องการ)
CREATE POLICY "Enable all access for authenticated users" ON product_sales
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- เพิ่มคำอธิบาย
COMMENT ON COLUMN product_sales.quantity_sold IS 'จำนวนที่ขายได้ ต้องมากกว่า 0';
COMMENT ON TABLE product_sales IS 'บันทึกการขายรายเมนู สำหรับวิเคราะห์ข้อมูล (ไม่เกี่ยวกับ transactions)';
