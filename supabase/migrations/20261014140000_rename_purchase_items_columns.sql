-- Migration: rename purchase_items columns to match controller expectations
--
-- Root cause: migration 20261013200503 created purchase_items with columns
--   cost, subtotal  — but the controller (purchase.controller.js) references
--   unit_price, total_price. Migration 20261014120000 tried CREATE TABLE IF NOT
--   EXISTS with the correct names but was skipped because the table already
--   existed, leaving the wrong column names in place.
--
-- This migration renames to the names the controller expects. Safe to run twice.

DO $$
BEGIN
  -- Rename cost -> unit_price (only if column exists with that name)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'purchase_items' AND column_name = 'cost'
  ) THEN
    ALTER TABLE purchase_items RENAME COLUMN cost TO unit_price;
  END IF;

  -- Rename subtotal -> total_price (only if column exists with that name)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'purchase_items' AND column_name = 'subtotal'
  ) THEN
    ALTER TABLE purchase_items RENAME COLUMN subtotal TO total_price;
  END IF;
END $$;
