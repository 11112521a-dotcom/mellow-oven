-- ============================================================
-- 🚀 PHASE 2: Batch Upsert RPC for Ultimate Performance
-- File: supabase_bulk_upsert.sql
-- Author: Dev AI
-- Date: 2026-01-01
-- ============================================================

-- Drop existing function if exists (for re-deployment)
DROP FUNCTION IF EXISTS bulk_upsert_daily_inventory(JSONB);

-- Create the batch upsert function
CREATE OR REPLACE FUNCTION bulk_upsert_daily_inventory(
    p_records JSONB  -- Array of inventory records
)
RETURNS TABLE (
    success_count INTEGER,
    error_count INTEGER,
    processed_ids UUID[]
) AS $$
DECLARE
    r JSONB;
    v_success INTEGER := 0;
    v_error INTEGER := 0;
    v_processed UUID[] := ARRAY[]::UUID[];
    v_record_id UUID;
BEGIN
    -- Loop through each record in the JSON array
    FOR r IN SELECT * FROM jsonb_array_elements(p_records)
    LOOP
        BEGIN
            -- Upsert the record atomically
            INSERT INTO daily_inventory (
                business_date,
                product_id,
                variant_id,
                variant_name,
                produced_qty,
                to_shop_qty,
                waste_qty,
                sold_qty,
                stock_yesterday,
                leftover_home,
                unsold_shop
            ) VALUES (
                (r->>'businessDate')::DATE,
                (r->>'productId')::UUID,
                NULLIF(r->>'variantId', '')::UUID,
                r->>'variantName',
                COALESCE((r->>'producedQty')::INTEGER, 0),
                COALESCE((r->>'toShopQty')::INTEGER, 0),
                COALESCE((r->>'wasteQty')::INTEGER, 0),
                COALESCE((r->>'soldQty')::INTEGER, 0),
                COALESCE((r->>'stockYesterday')::INTEGER, 0),
                -- Calculate leftover_home: stockYesterday + produced - toShop - waste
                COALESCE((r->>'stockYesterday')::INTEGER, 0) 
                    + COALESCE((r->>'producedQty')::INTEGER, 0) 
                    - COALESCE((r->>'toShopQty')::INTEGER, 0) 
                    - COALESCE((r->>'wasteQty')::INTEGER, 0),
                -- Calculate unsold_shop: toShop - sold
                COALESCE((r->>'toShopQty')::INTEGER, 0) 
                    - COALESCE((r->>'soldQty')::INTEGER, 0)
            )
            ON CONFLICT (business_date, product_id, variant_id) 
            DO UPDATE SET
                variant_name = EXCLUDED.variant_name,
                produced_qty = EXCLUDED.produced_qty,
                to_shop_qty = EXCLUDED.to_shop_qty,
                waste_qty = EXCLUDED.waste_qty,
                sold_qty = EXCLUDED.sold_qty,
                stock_yesterday = EXCLUDED.stock_yesterday,
                leftover_home = EXCLUDED.leftover_home,
                unsold_shop = EXCLUDED.unsold_shop
            RETURNING id INTO v_record_id;
            
            v_success := v_success + 1;
            v_processed := array_append(v_processed, v_record_id);
            
        EXCEPTION WHEN OTHERS THEN
            -- Log error but continue processing
            RAISE WARNING 'Failed to upsert record: %', r;
            v_error := v_error + 1;
        END;
    END LOOP;
    
    -- Return summary
    RETURN QUERY SELECT v_success, v_error, v_processed;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 📌 IMPORTANT: Before running this migration, ensure you have:
-- 1. A unique constraint on (business_date, product_id, variant_id)
-- ============================================================

-- Add unique constraint if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'daily_inventory_unique_key'
    ) THEN
        ALTER TABLE daily_inventory 
        ADD CONSTRAINT daily_inventory_unique_key 
        UNIQUE (business_date, product_id, variant_id);
    END IF;
END $$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION bulk_upsert_daily_inventory(JSONB) TO authenticated;

-- ============================================================
-- 🧪 TEST EXAMPLE:
-- SELECT * FROM bulk_upsert_daily_inventory('[
--   {"businessDate": "2026-01-01", "productId": "uuid-here", "producedQty": 10, "toShopQty": 5, "wasteQty": 0, "soldQty": 0, "stockYesterday": 3}
-- ]'::JSONB);
-- ============================================================
