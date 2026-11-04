-- Migration: create PDV (pos) tables
-- pos_sales: cart state, pre-sales, completed sales, cancellations
-- pos_sale_items: individual items in a POS sale
-- Enables: barcode search, split payments, installments, pre-sales, cash register linking

DO $$
BEGIN
  -- pos_sales table
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pos_sales') THEN
    CREATE TABLE pos_sales (
      id              BIGSERIAL PRIMARY KEY,
      operation_number VARCHAR(30) NOT NULL UNIQUE,
      customer_id     BIGINT REFERENCES customers(id) ON DELETE SET NULL,
      seller_id       BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
      cash_register_id BIGINT REFERENCES cash_registers(id) ON DELETE SET NULL,
      status          VARCHAR(20) NOT NULL DEFAULT 'cart',
      subtotal        NUMERIC(12,2) NOT NULL DEFAULT 0,
      discount        NUMERIC(12,2) NOT NULL DEFAULT 0,
      total           NUMERIC(12,2) NOT NULL DEFAULT 0,
      payment_method  VARCHAR(30),
      payment_details JSONB,  -- split payments, installments, amounts per method
      notes           TEXT,
      is_pre_sale     BOOLEAN NOT NULL DEFAULT FALSE,
      created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      completed_at    TIMESTAMP
    );
  ELSE
    -- Ensure columns exist for idempotency
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pos_sales' AND column_name = 'seller_id') THEN
      ALTER TABLE pos_sales ADD COLUMN seller_id BIGINT REFERENCES users(id) ON DELETE RESTRICT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pos_sales' AND column_name = 'cash_register_id') THEN
      ALTER TABLE pos_sales ADD COLUMN cash_register_id BIGINT REFERENCES cash_registers(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pos_sales' AND column_name = 'payment_details') THEN
      ALTER TABLE pos_sales ADD COLUMN payment_details JSONB;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pos_sales' AND column_name = 'is_pre_sale') THEN
      ALTER TABLE pos_sales ADD COLUMN is_pre_sale BOOLEAN NOT NULL DEFAULT FALSE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pos_sales' AND column_name = 'completed_at') THEN
      ALTER TABLE pos_sales ADD COLUMN completed_at TIMESTAMP;
    END IF;
  END IF;

  -- pos_sale_items table
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pos_sale_items') THEN
    CREATE TABLE pos_sale_items (
      id          BIGSERIAL PRIMARY KEY,
      pos_sale_id BIGINT NOT NULL REFERENCES pos_sales(id) ON DELETE CASCADE,
      product_id  BIGINT NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
      quantity    INTEGER NOT NULL,
      price       NUMERIC(12,2) NOT NULL,
      subtotal    NUMERIC(12,2) NOT NULL,
      barcode_scanned VARCHAR(60)
    );
  ELSE
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pos_sale_items' AND column_name = 'barcode_scanned') THEN
      ALTER TABLE pos_sale_items ADD COLUMN barcode_scanned VARCHAR(60);
    END IF;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_pos_sales_status ON pos_sales(status);
CREATE INDEX IF NOT EXISTS idx_pos_sales_seller ON pos_sales(seller_id);
CREATE INDEX IF NOT EXISTS idx_pos_sales_created ON pos_sales(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pos_sale_items_sale ON pos_sale_items(pos_sale_id);
CREATE INDEX IF NOT EXISTS idx_pos_sale_items_product ON pos_sale_items(product_id);
