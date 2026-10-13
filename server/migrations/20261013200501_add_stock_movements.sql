-- Migration: add_stock_movements
-- Created: 2026-10-13T20:05:00
-- Auditoria de movimentações de estoque

-- ========== UP ==========
CREATE TABLE IF NOT EXISTS stock_movements (
    id          BIGSERIAL PRIMARY KEY,
    product_id  BIGINT       NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    type        VARCHAR(30)  NOT NULL,  -- 'sale','purchase','adjustment','cancel','return'
    quantity    INTEGER      NOT NULL,  -- positivo=entrada, negativo=saída
    balance     INTEGER      NOT NULL,  -- estoque após movimentação
    reference_type VARCHAR(30),        -- 'order','purchase','manual'
    reference_id   BIGINT,             -- FK ao registro de origem
    notes       TEXT,
    created_by  BIGINT REFERENCES users(id) ON DELETE SET NULL,
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_stock_movements_product   ON stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_type      ON stock_movements(type);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created   ON stock_movements(created_at);
CREATE INDEX IF NOT EXISTS idx_stock_movements_reference ON stock_movements(reference_type, reference_id);

-- ========== DOWN ==========
-- DROP TABLE IF EXISTS stock_movements;
