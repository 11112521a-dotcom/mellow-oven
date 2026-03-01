-- Add category column to ingredients table
ALTER TABLE ingredients ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'อื่นๆ';
