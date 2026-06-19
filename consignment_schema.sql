-- ========================================================
-- PHASE 2: Consignment System & Multi-Wallet Support
-- ========================================================

-- 1. Create External Shops (Branches / Consignment targets)
CREATE TABLE public.external_shops (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    contact_name TEXT,
    contact_phone TEXT,
    address TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Modify Unallocated Profits to support Multi-Wallet
ALTER TABLE public.unallocated_profits 
ADD COLUMN wallet_id UUID REFERENCES public.external_shops(id) ON DELETE SET NULL;

-- 3. Modify Transactions to support Multi-Wallet
ALTER TABLE public.transactions 
ADD COLUMN wallet_id UUID REFERENCES public.external_shops(id) ON DELETE SET NULL;

-- 4. Create Consignment Orders table
CREATE TABLE public.consignment_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number TEXT NOT NULL UNIQUE,
    shop_id UUID NOT NULL REFERENCES public.external_shops(id), -- Linked to the external shop
    shop_name TEXT NOT NULL, -- Snapshot
    contact_name TEXT,
    contact_phone TEXT,
    delivery_date DATE NOT NULL,
    settle_date DATE,
    total_quantity_sent INTEGER NOT NULL DEFAULT 0,
    total_quantity_sold INTEGER NOT NULL DEFAULT 0,
    total_quantity_waste INTEGER NOT NULL DEFAULT 0,
    total_quantity_returned INTEGER NOT NULL DEFAULT 0,
    total_revenue NUMERIC(10,2) NOT NULL DEFAULT 0,
    total_cost NUMERIC(10,2) NOT NULL DEFAULT 0,
    total_profit NUMERIC(10,2) NOT NULL DEFAULT 0,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, shipped, settled, cancelled
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Create Consignment Order Items table
CREATE TABLE public.consignment_order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    consignment_id UUID NOT NULL REFERENCES public.consignment_orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id),
    variant_id UUID,
    product_name TEXT NOT NULL,
    variant_name TEXT,
    quantity_sent INTEGER NOT NULL DEFAULT 0,
    quantity_sold INTEGER NOT NULL DEFAULT 0,
    quantity_waste INTEGER NOT NULL DEFAULT 0,
    quantity_returned INTEGER NOT NULL DEFAULT 0,
    unit_price NUMERIC(10,2) NOT NULL DEFAULT 0,
    unit_cost NUMERIC(10,2) NOT NULL DEFAULT 0,
    line_total NUMERIC(10,2) NOT NULL DEFAULT 0,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.external_shops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consignment_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consignment_order_items ENABLE ROW LEVEL SECURITY;

-- Allow all operations for authenticated users (simplified for MVP)
CREATE POLICY "Allow full access for authenticated users on external_shops" ON public.external_shops FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow full access for authenticated users on consignment_orders" ON public.consignment_orders FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow full access for authenticated users on consignment_order_items" ON public.consignment_order_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Seed an initial test shop
INSERT INTO public.external_shops (name, contact_name, contact_phone) 
VALUES ('ร้านกาแฟตาหนวด (สาขาทดสอบ)', 'คุณหนวด', '0812345678');
