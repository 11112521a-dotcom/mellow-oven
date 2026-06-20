-- Step 1: Drop the old unique index that restricts to 1 row per product/variant daily
DROP INDEX IF EXISTS public.daily_inventory_business_date_product_variant_key;

-- Step 2: Create a new unique index that includes market_id (treating null market_id as a specific default UUID)
CREATE UNIQUE INDEX IF NOT EXISTS daily_inventory_business_date_product_variant_market_key 
ON public.daily_inventory (
    business_date, 
    product_id, 
    COALESCE(variant_id, ''), 
    COALESCE(market_id, '00000000-0000-0000-0000-000000000000'::uuid)
);
