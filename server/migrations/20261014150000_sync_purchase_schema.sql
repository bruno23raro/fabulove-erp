-- Migration: sync purchases/purchase_items schema to controller expectations
--
-- The first migration (20261013200503) created purchases with:
--   purchase_number, total, created_by, received_at
-- The second migration (20261014120000) intended:
--   number, total_amount
-- The controller (purchase.controller.js) uses:
--   number, total_amount, supplier_id, status, notes
--
-- purchase_items had cost/subtotal; controller uses unit_price/total_price
-- (already handled by migration 20261014140000)
--
-- This migration adds any remaining missing columns idempotently.

DO $$
BEGIN
  -- Add 'number' if not exists (may have been added by prev migration)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'purchases' AND column_name = 'number'
  ) THEN
    ALTER TABLE purchases ADD COLUMN number VARCHAR(50);
  END IF;

  -- Add 'total_amount' if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'purchases' AND column_name = 'total_amount'
  ) THEN
    ALTER TABLE purchases ADD COLUMN total_amount NUMERIC(12,2) DEFAULT 0;
  END IF;
END $$;
