-- Migration: add_user_management_and_address
-- Created: 2026-10-13T20:05:00
-- 1. Adds address fields to customers
-- 2. Adds discount + shipping_cost to orders
-- 3. Adds channel to orders (manual, shopee, mercadolivre, pdv)
-- 4. Adds audit_log table

-- ========== UP ==========

-- Endereço no cliente
ALTER TABLE customers
    ADD COLUMN IF NOT EXISTS address_street   VARCHAR(255),
    ADD COLUMN IF NOT EXISTS address_number   VARCHAR(20),
    ADD COLUMN IF NOT EXISTS address_complement VARCHAR(100),
    ADD COLUMN IF NOT EXISTS address_district VARCHAR(100),
    ADD COLUMN IF NOT EXISTS address_city     VARCHAR(100),
    ADD COLUMN IF NOT EXISTS address_state    CHAR(2),
    ADD COLUMN IF NOT EXISTS address_zip      VARCHAR(10),
    ADD COLUMN IF NOT EXISTS customer_type    VARCHAR(10) NOT NULL DEFAULT 'pf'; -- pf | pj

-- Desconto e frete nos pedidos
ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS discount       DECIMAL(10,2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS shipping_cost  DECIMAL(10,2) NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS channel        VARCHAR(30)  NOT NULL DEFAULT 'manual',
    ADD COLUMN IF NOT EXISTS tracking_code  VARCHAR(100),
    ADD COLUMN IF NOT EXISTS notes          TEXT;

-- Audit log
CREATE TABLE IF NOT EXISTS audit_log (
    id          BIGSERIAL PRIMARY KEY,
    user_id     BIGINT REFERENCES users(id) ON DELETE SET NULL,
    action      VARCHAR(100) NOT NULL,   -- 'create_order', 'cancel_order', 'update_price', etc.
    entity_type VARCHAR(50),             -- 'order', 'product', 'customer', etc.
    entity_id   BIGINT,
    old_value   JSONB,
    new_value   JSONB,
    ip_address  VARCHAR(45),
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_log_user       ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity     ON audit_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_action     ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_log_created    ON audit_log(created_at);

-- ========== DOWN ==========
-- ALTER TABLE customers DROP COLUMN IF EXISTS address_street, DROP COLUMN IF EXISTS address_number, ...
-- ALTER TABLE orders DROP COLUMN IF EXISTS discount, DROP COLUMN IF EXISTS shipping_cost, ...
-- DROP TABLE IF EXISTS audit_log;
