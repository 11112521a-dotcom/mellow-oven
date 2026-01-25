-- ============================================================
-- Promotion & Snack Box System - Database Migration
-- Version: 1.0
-- Date: 2026-01-10
-- ============================================================

-- ========================================
-- 1. Shop Info Table
-- ========================================
CREATE TABLE IF NOT EXISTS shop_info (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shop_name TEXT,
    owner_name TEXT,
    id_card_number TEXT,
    
    -- Address
    address_number TEXT,
    address_moo TEXT,
    address_soi TEXT,
    address_road TEXT,
    address_subdistrict TEXT,
    address_district TEXT,
    address_province TEXT,
    address_postal_code TEXT,
    
    -- Contact
    phone TEXT,
    line_id TEXT,
    email TEXT,
    facebook TEXT,
    
    -- Bank
    bank_name TEXT,
    bank_account_name TEXT,
    bank_account_number TEXT,
    
    -- Logo (Supabase Storage URL)
    logo_url TEXT,
    
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ========================================
-- 2. Packaging Options Table
-- ========================================
CREATE TABLE IF NOT EXISTS packaging_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    extra_cost DECIMAL(10,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Insert default packaging options
INSERT INTO packaging_options (name, extra_cost, sort_order) VALUES
    ('ถุงกระดาษพับ', 0, 1),
    ('กล่องกระดาษสีน้ำตาล', 5, 2),
    ('กล่องพิมพ์ลายสวยงาม', 15, 3)
ON CONFLICT DO NOTHING;

-- ========================================
-- 3. Snack Box Sets Table
-- ========================================
CREATE TABLE IF NOT EXISTS snack_box_sets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    name_thai TEXT,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    min_quantity INT DEFAULT 20,
    packaging_id UUID REFERENCES packaging_options(id),
    is_active BOOLEAN DEFAULT true,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ========================================
-- 4. Snack Box Set Items Table
-- ========================================
CREATE TABLE IF NOT EXISTS snack_box_set_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    set_id UUID REFERENCES snack_box_sets(id) ON DELETE CASCADE,
    category TEXT,
    quantity INT DEFAULT 1,
    selection_type TEXT CHECK (selection_type IN ('pick_one', 'pick_many', 'all')),
    product_ids UUID[],
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_set_items_set_id ON snack_box_set_items(set_id);

-- ========================================
-- 5. Promotion Orders Table
-- ========================================
CREATE TABLE IF NOT EXISTS promotion_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number TEXT UNIQUE,
    
    -- Customer
    customer_name TEXT NOT NULL,
    customer_phone TEXT,
    customer_address TEXT,
    
    -- Delivery
    delivery_date DATE,
    delivery_time TIME,
    
    -- Pricing
    calculated_price DECIMAL(10,2),
    manual_price DECIMAL(10,2),
    use_manual_price BOOLEAN DEFAULT false,
    discount_note TEXT,
    total_price DECIMAL(10,2),
    
    -- Metadata
    notes TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'preparing', 'delivered', 'cancelled')),
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Auto-generate order number function
CREATE OR REPLACE FUNCTION generate_promotion_order_number()
RETURNS TRIGGER AS $$
BEGIN
    NEW.order_number := 'PO-' || TO_CHAR(NOW(), 'YYYY') || '-' || 
        LPAD(CAST((SELECT COUNT(*) + 1 FROM promotion_orders WHERE 
        EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW())) AS TEXT), 4, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and create
DROP TRIGGER IF EXISTS trigger_promotion_order_number ON promotion_orders;
CREATE TRIGGER trigger_promotion_order_number
    BEFORE INSERT ON promotion_orders
    FOR EACH ROW
    WHEN (NEW.order_number IS NULL)
    EXECUTE FUNCTION generate_promotion_order_number();

-- ========================================
-- 6. Promotion Order Items Table
-- ========================================
CREATE TABLE IF NOT EXISTS promotion_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES promotion_orders(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    variant_id UUID,
    variant_note TEXT,
    quantity INT NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10,2),
    line_total DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON promotion_order_items(order_id);

-- ========================================
-- 7. Quotations Table
-- ========================================
CREATE TABLE IF NOT EXISTS quotations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quotation_number TEXT UNIQUE,
    
    -- Customer
    customer_name TEXT,
    customer_address TEXT,
    customer_contact TEXT,
    customer_phone TEXT,
    
    -- Reference
    order_id UUID REFERENCES promotion_orders(id),
    
    -- Items (JSONB for flexibility)
    items JSONB,
    
    -- Pricing
    subtotal DECIMAL(10,2),
    discount_amount DECIMAL(10,2) DEFAULT 0,
    discount_note TEXT,
    total_price DECIMAL(10,2),
    total_price_text TEXT,
    
    -- Terms
    validity_days INT DEFAULT 30,
    conditions TEXT,
    
    -- Status
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'expired', 'cancelled')),
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Auto-generate quotation number function
CREATE OR REPLACE FUNCTION generate_quotation_number()
RETURNS TRIGGER AS $$
BEGIN
    NEW.quotation_number := 'QT-' || TO_CHAR(NOW(), 'YYYY') || '-' || 
        LPAD(CAST((SELECT COUNT(*) + 1 FROM quotations WHERE 
        EXTRACT(YEAR FROM created_at) = EXTRACT(YEAR FROM NOW())) AS TEXT), 4, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and create
DROP TRIGGER IF EXISTS trigger_quotation_number ON quotations;
CREATE TRIGGER trigger_quotation_number
    BEFORE INSERT ON quotations
    FOR EACH ROW
    WHEN (NEW.quotation_number IS NULL)
    EXECUTE FUNCTION generate_quotation_number();

-- ========================================
-- 8. Enable RLS and Create Policies
-- ========================================
ALTER TABLE shop_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE packaging_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE snack_box_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE snack_box_set_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotion_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotion_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Allow all for authenticated" ON shop_info;
DROP POLICY IF EXISTS "Allow all for authenticated" ON packaging_options;
DROP POLICY IF EXISTS "Allow all for authenticated" ON snack_box_sets;
DROP POLICY IF EXISTS "Allow all for authenticated" ON snack_box_set_items;
DROP POLICY IF EXISTS "Allow all for authenticated" ON promotion_orders;
DROP POLICY IF EXISTS "Allow all for authenticated" ON promotion_order_items;
DROP POLICY IF EXISTS "Allow all for authenticated" ON quotations;

-- Create policies for authenticated users
CREATE POLICY "Allow all for authenticated" ON shop_info FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON packaging_options FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON snack_box_sets FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON snack_box_set_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON promotion_orders FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON promotion_order_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for authenticated" ON quotations FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ========================================
-- 9. Supabase Storage Setup
-- ========================================
-- Run these in Supabase Dashboard > Storage

-- CREATE bucket 'shop-assets' with public access
-- INSERT INTO storage.buckets (id, name, public) VALUES ('shop-assets', 'shop-assets', true);

-- Storage Policies (run in SQL Editor):
/*
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'shop-assets');

CREATE POLICY "Allow authenticated updates"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'shop-assets');

CREATE POLICY "Allow authenticated deletes"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'shop-assets');

CREATE POLICY "Allow public read"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'shop-assets');
*/

-- ============================================================
-- Migration Complete!
-- ============================================================
