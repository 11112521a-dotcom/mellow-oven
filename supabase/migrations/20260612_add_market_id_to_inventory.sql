-- Migration to add market_id to daily_inventory
ALTER TABLE public.daily_inventory ADD COLUMN IF NOT EXISTS market_id UUID REFERENCES public.markets(id) ON DELETE CASCADE;

-- If there are constraints that need to be updated (like a UNIQUE constraint on business_date + product_id + variant_id),
-- the user might need to recreate them, but we will handle this in code using `.limit(1)` and `.update()` matching on market_id.
