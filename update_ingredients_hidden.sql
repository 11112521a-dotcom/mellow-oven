-- Add is_hidden column to ingredients table
-- Run this in Supabase SQL Editor

ALTER TABLE ingredients 
ADD COLUMN is_hidden BOOLEAN DEFAULT FALSE;

-- Optional: Update existing records to have FALSE (though DEFAULT handles it for new ones, existing nulls might need update if not nullable)
UPDATE ingredients SET is_hidden = FALSE WHERE is_hidden IS NULL;
