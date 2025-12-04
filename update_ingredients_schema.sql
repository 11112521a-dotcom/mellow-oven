-- Add missing columns to the ingredients table
ALTER TABLE ingredients 
ADD COLUMN IF NOT EXISTS buy_unit text,
ADD COLUMN IF NOT EXISTS conversion_rate numeric DEFAULT 1,
ADD COLUMN IF NOT EXISTS min_stock numeric DEFAULT 10;

-- Optional: Add comments for clarity
COMMENT ON COLUMN ingredients.buy_unit IS 'Unit used for purchasing (e.g., Pack, Box)';
COMMENT ON COLUMN ingredients.conversion_rate IS 'Conversion rate from buy_unit to stock unit (e.g., 1 Pack = 12 Pcs)';
COMMENT ON COLUMN ingredients.min_stock IS 'Minimum stock level for low stock alerts';
