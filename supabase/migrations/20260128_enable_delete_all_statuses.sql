-- ============================================================
-- Migration: Enable DELETE for All Statuses
-- Allows shop owner to delete any document regardless of status
-- ============================================================

-- ============================================================
-- 1. Update Invoices DELETE Policy
-- ============================================================

-- Drop existing restrictive policy
DROP POLICY IF EXISTS "Users can delete draft invoices" ON invoices;

-- Create new permissive policy - allow delete for all statuses
CREATE POLICY "Users can delete invoices"
    ON invoices FOR DELETE
    TO authenticated
    USING (true);

-- ============================================================
-- 2. Add Receipts DELETE Policy
-- ============================================================

-- Create DELETE policy for receipts (previously not allowed)
CREATE POLICY "Users can delete receipts"
    ON receipts FOR DELETE
    TO authenticated
    USING (true);

-- ============================================================
-- 3. Ensure promotion_order_items can be deleted
-- ============================================================

-- Drop existing if any restrictive policy exists
DROP POLICY IF EXISTS "Users can delete promotion_order_items" ON promotion_order_items;

-- Create DELETE policy
CREATE POLICY "Users can delete promotion_order_items"
    ON promotion_order_items FOR DELETE
    TO authenticated
    USING (true);

-- ============================================================
-- Note: quotations and promotion_orders already use FOR ALL policy
-- which includes DELETE permission
-- ============================================================
