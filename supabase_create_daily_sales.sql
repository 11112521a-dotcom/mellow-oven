
-- Create daily_sales_reports table
CREATE TABLE IF NOT EXISTS daily_sales_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL,
    market_id TEXT, -- Can be UUID or Text depending on markets table, keeping TEXT for safety
    market_context JSONB DEFAULT '{}'::jsonb,
    start_cash_float NUMERIC DEFAULT 0,
    revenue NUMERIC DEFAULT 0,
    cogs_sold NUMERIC DEFAULT 0,
    waste_cost NUMERIC DEFAULT 0,
    opex_today NUMERIC DEFAULT 0,
    net_profit NUMERIC DEFAULT 0,
    allocations JSONB DEFAULT '{}'::jsonb,
    bills_count INTEGER DEFAULT 0,
    aov NUMERIC DEFAULT 0,
    sell_through_rate NUMERIC DEFAULT 0,
    logs JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable RLS
ALTER TABLE daily_sales_reports ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all access (for now, matching other tables)
CREATE POLICY "Allow all access" ON daily_sales_reports FOR ALL USING (true) WITH CHECK (true);
