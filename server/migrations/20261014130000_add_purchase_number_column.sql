-- Migration: add missing `number` column to purchases table
--
-- Root cause: two migrations both CREATE TABLE IF NOT EXISTS purchases:
--   20261013200503 — creates purchases with column "purchase_number"
--   20261014120000 — tries to create purchases with column "number" but skips
--                    because table already exists (IF NOT EXISTS).
--
-- The controller (purchase.controller.js) uses `number` as the INSERT column name.
-- This migration adds the missing column idempotently.
--
-- Never DROP / TRUNCATE / DELETE. Safe to run twice (ADD COLUMN IF NOT EXISTS).

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'purchases' AND column_name = 'number'
  ) THEN
    ALTER TABLE purchases ADD COLUMN number VARCHAR(50);
  END IF;
END $$;

-- Add UNIQUE constraint if missing (idempotent via index check)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'purchases' AND indexname = 'idx_purchases_number_unique'
  ) THEN
    CREATE UNIQUE INDEX idx_purchases_number_unique ON purchases(number) WHERE number IS NOT NULL;
  END IF;
END $$;
