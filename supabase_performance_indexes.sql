-- Mellow Oven Performance Optimizations V1
-- Run this in the Supabase SQL Editor

-- 1. Accelerate transaction queries (used heavily in Reports/Dashboard)
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions (date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions (type);

-- 2. Accelerate sales tracking queries
CREATE INDEX IF NOT EXISTS idx_daily_sales_date ON daily_sales (date DESC);

-- 3. Accelerate product sales tracking
CREATE INDEX IF NOT EXISTS idx_product_sales_date ON product_sales (date DESC);
CREATE INDEX IF NOT EXISTS idx_product_sales_product_id ON product_sales (product_id);

-- Optional: Accelerate inventory history if frequently viewed
-- CREATE INDEX IF NOT EXISTS idx_inventory_history_date ON inventory_history (created_at DESC);
