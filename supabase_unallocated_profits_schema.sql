-- Create table for tracking unallocated profits
CREATE TABLE IF NOT EXISTS unallocated_profits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    date DATE NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    source TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster date-based queries
CREATE INDEX idx_unallocated_profits_date ON unallocated_profits(date);

-- Enable Row Level Security (RLS)
ALTER TABLE unallocated_profits ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (adjust based on your auth requirements)
CREATE POLICY "Enable all access for authenticated users" ON unallocated_profits
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Optional: Add comment
COMMENT ON TABLE unallocated_profits IS 'Tracks gross profit from sales that has not yet been allocated to jars';
