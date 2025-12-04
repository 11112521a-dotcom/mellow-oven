-- สคีมาฐานข้อมูลสำหรับตาราง production_forecasts
-- เก็บผลการพยากรณ์การผลิตแบบ AI

CREATE TABLE IF NOT EXISTS production_forecasts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- ข้อมูลบริบท
    product_id TEXT NOT NULL,
    product_name TEXT NOT NULL,
    market_id TEXT NOT NULL,
    market_name TEXT NOT NULL,
    forecast_for_date DATE NOT NULL,
    
    -- พารามิเตอร์ที่ใช้
    weather_forecast TEXT, -- 'sunny', 'cloudy', 'rain', 'storm'
    historical_data_points INTEGER, -- จำนวนข้อมูลที่ใช้
    
    -- ผลลัพธ์จาก Algorithm (5 ขั้นตอน)
    baseline_forecast DECIMAL(10, 2), -- Step 2: Time-decay average
    weather_adjusted_forecast DECIMAL(10, 2), -- Step 3: Weather adjustment
    lambda_poisson DECIMAL(10, 2), -- Step 4: λ from Poisson
    optimal_quantity INTEGER NOT NULL, -- Step 5: Q* (คำตอบสุดท้าย)
    
    -- เมตริกความเสี่ยง
    service_level_target DECIMAL(5, 4), -- Critical Ratio (Cu/(Cu+Co))
    stockout_probability DECIMAL(5, 4), -- P(Demand > Q*)
    waste_probability DECIMAL(5, 4), -- P(Demand < Q*)
    
    -- เมตริกเศรษฐศาสตร์
    unit_price DECIMAL(10, 2),
    unit_cost DECIMAL(10, 2),
    expected_demand DECIMAL(10, 2),
    expected_profit DECIMAL(10, 2),
    
    -- ความเชื่อมั่น
    confidence_level TEXT, -- 'high', 'medium', 'low'
    prediction_interval_lower INTEGER,
    prediction_interval_upper INTEGER,
    outliers_removed INTEGER DEFAULT 0,
    
    -- Unique constraint: หนึ่งการพยากรณ์ต่อ product-market-date
    UNIQUE(product_id, market_id, forecast_for_date)
);

-- Indexes สำหรับการค้นหาที่เร็ว
CREATE INDEX idx_forecasts_product ON production_forecasts(product_id);
CREATE INDEX idx_forecasts_market ON production_forecasts(market_id);
CREATE INDEX idx_forecasts_date ON production_forecasts(forecast_for_date DESC);
CREATE INDEX idx_forecasts_created ON production_forecasts(created_at DESC);

-- Row Level Security (RLS)
ALTER TABLE production_forecasts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations for authenticated users" 
ON production_forecasts 
FOR ALL 
USING (true);

COMMENT ON TABLE production_forecasts IS 'เก็บผลการพยากรณ์การผลิตที่คำนวณจาก Smart Production Planning System';
COMMENT ON COLUMN production_forecasts.optimal_quantity IS 'จำนวนที่แนะนำให้ผลิต (Q*) จาก Newsvendor Model';
COMMENT ON COLUMN production_forecasts.lambda_poisson IS 'พารามิเตอร์ λ ของการแจกแจง Poisson สำหรับ demand';
