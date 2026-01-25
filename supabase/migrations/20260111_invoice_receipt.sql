-- ============================================================
-- Complete Document Workflow Migration
-- Invoice & Receipt System with Architect's Best Practices
-- ============================================================

-- ============================================================
-- 1. Document Number Sequences (Auto-numbering)
-- ============================================================

-- Sequence for Invoice numbers
CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START 1;

-- Sequence for Receipt numbers
CREATE SEQUENCE IF NOT EXISTS receipt_number_seq START 1;

-- ============================================================
-- 2. Note: Quotation status uses TEXT, not ENUM
-- The 'invoiced' status is handled in application code
-- ============================================================

-- ============================================================
-- 3. Invoices Table (ใบแจ้งหนี้)
-- ============================================================

CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_number TEXT NOT NULL UNIQUE,
    
    -- Source reference (optional - for tracking only, data is snapshotted)
    quotation_id UUID REFERENCES quotations(id) ON DELETE SET NULL,
    
    -- Customer info (SNAPSHOTTED - not referenced)
    customer_name TEXT NOT NULL,
    customer_address TEXT,
    customer_contact TEXT,
    customer_phone TEXT,
    
    -- Items (SNAPSHOTTED as JSONB - frozen at creation time)
    items JSONB NOT NULL DEFAULT '[]',
    
    -- Pricing (SNAPSHOTTED)
    subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
    discount_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
    discount_note TEXT,
    total_price NUMERIC(12,2) NOT NULL DEFAULT 0,
    
    -- Invoice specific
    due_date DATE NOT NULL,
    payment_terms TEXT, -- e.g., "Net 30", "COD"
    notes TEXT,
    
    -- Status: draft, sent, paid, overdue, cancelled
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
    
    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id)
);

-- ============================================================
-- 4. Receipts Table (ใบเสร็จรับเงิน)
-- ============================================================

CREATE TABLE IF NOT EXISTS receipts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    receipt_number TEXT NOT NULL UNIQUE,
    
    -- Source references (optional - for tracking only)
    quotation_id UUID REFERENCES quotations(id) ON DELETE SET NULL,
    invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
    
    -- Customer info (SNAPSHOTTED)
    customer_name TEXT NOT NULL,
    customer_address TEXT,
    customer_phone TEXT,
    
    -- Items (SNAPSHOTTED as JSONB)
    items JSONB NOT NULL DEFAULT '[]',
    
    -- Pricing (SNAPSHOTTED)
    total_price NUMERIC(12,2) NOT NULL DEFAULT 0,
    
    -- Payment details
    payment_method TEXT NOT NULL DEFAULT 'cash' CHECK (payment_method IN ('cash', 'transfer', 'credit', 'other')),
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    payment_note TEXT,
    
    -- Receiver
    received_by TEXT,
    
    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id)
);

-- ============================================================
-- 5. Auto-Numbering Triggers
-- ============================================================

-- Generate Invoice Number: INV-YYYY-XXXX
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.invoice_number IS NULL OR NEW.invoice_number = '' THEN
        NEW.invoice_number := 'INV-' || TO_CHAR(NOW(), 'YYYY') || '-' || 
                              LPAD(NEXTVAL('invoice_number_seq')::TEXT, 4, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generate_invoice_number
    BEFORE INSERT ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION generate_invoice_number();

-- Generate Receipt Number: RC-YYYY-XXXX
CREATE OR REPLACE FUNCTION generate_receipt_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.receipt_number IS NULL OR NEW.receipt_number = '' THEN
        NEW.receipt_number := 'RC-' || TO_CHAR(NOW(), 'YYYY') || '-' || 
                              LPAD(NEXTVAL('receipt_number_seq')::TEXT, 4, '0');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generate_receipt_number
    BEFORE INSERT ON receipts
    FOR EACH ROW
    EXECUTE FUNCTION generate_receipt_number();

-- ============================================================
-- 6. Status Synchronization Triggers
-- ============================================================

-- When Invoice is created from Quotation -> Update Quotation status to 'invoiced'
CREATE OR REPLACE FUNCTION sync_quotation_status_on_invoice()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.quotation_id IS NOT NULL THEN
        UPDATE quotations 
        SET status = 'invoiced', updated_at = NOW()
        WHERE id = NEW.quotation_id AND status = 'accepted';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sync_quotation_on_invoice
    AFTER INSERT ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION sync_quotation_status_on_invoice();

-- When Receipt is created from Invoice -> Update Invoice status to 'paid'
CREATE OR REPLACE FUNCTION sync_invoice_status_on_receipt()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.invoice_id IS NOT NULL THEN
        UPDATE invoices 
        SET status = 'paid', updated_at = NOW()
        WHERE id = NEW.invoice_id AND status IN ('draft', 'sent', 'overdue');
    END IF;
    
    -- Also update quotation if direct from quotation
    IF NEW.quotation_id IS NOT NULL AND NEW.invoice_id IS NULL THEN
        UPDATE quotations 
        SET status = 'invoiced', updated_at = NOW()
        WHERE id = NEW.quotation_id AND status = 'accepted';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_sync_invoice_on_receipt
    AFTER INSERT ON receipts
    FOR EACH ROW
    EXECUTE FUNCTION sync_invoice_status_on_receipt();

-- ============================================================
-- 7. Updated_at Trigger for Invoices
-- ============================================================

-- Create handle_updated_at function if not exists
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_invoices_updated_at
    BEFORE UPDATE ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();

-- ============================================================
-- 8. Indexes for Performance
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_quotation_id ON invoices(quotation_id);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON invoices(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_receipts_invoice_id ON receipts(invoice_id);
CREATE INDEX IF NOT EXISTS idx_receipts_quotation_id ON receipts(quotation_id);
CREATE INDEX IF NOT EXISTS idx_receipts_created_at ON receipts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_receipts_payment_date ON receipts(payment_date);

-- ============================================================
-- 9. RLS Policies
-- ============================================================

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;

-- Invoices policies
CREATE POLICY "Users can view all invoices"
    ON invoices FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Users can insert invoices"
    ON invoices FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Users can update invoices"
    ON invoices FOR UPDATE
    TO authenticated
    USING (true);

CREATE POLICY "Users can delete draft invoices"
    ON invoices FOR DELETE
    TO authenticated
    USING (status = 'draft');

-- Receipts policies
CREATE POLICY "Users can view all receipts"
    ON receipts FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Users can insert receipts"
    ON receipts FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Receipts should not be deleted (accounting requirement)
-- No DELETE policy = cannot delete

-- ============================================================
-- 10. Overdue Invoice Check Function (for cron job)
-- ============================================================

CREATE OR REPLACE FUNCTION mark_overdue_invoices()
RETURNS INTEGER AS $$
DECLARE
    updated_count INTEGER;
BEGIN
    UPDATE invoices 
    SET status = 'overdue', updated_at = NOW()
    WHERE status = 'sent' 
    AND due_date < CURRENT_DATE;
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- Can be called daily via Supabase Edge Function or cron
-- SELECT mark_overdue_invoices();
