-- Migration: add_financial_tables
-- Created: 2026-10-13T20:05:00
-- Tabelas para PDV, caixa, contas a pagar/receber e fornecedores

-- ========== UP ==========

-- Fornecedores
CREATE TABLE IF NOT EXISTS suppliers (
    id            BIGSERIAL PRIMARY KEY,
    name          VARCHAR(255) NOT NULL,
    email         VARCHAR(255),
    phone         VARCHAR(20),
    document      VARCHAR(20) UNIQUE,    -- CNPJ
    contact_name  VARCHAR(150),
    address_street VARCHAR(255),
    address_city   VARCHAR(100),
    address_state  CHAR(2),
    address_zip    VARCHAR(10),
    is_active      BOOLEAN NOT NULL DEFAULT TRUE,
    notes          TEXT,
    created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_suppliers_name     ON suppliers(name);
CREATE INDEX IF NOT EXISTS idx_suppliers_document ON suppliers(document);

-- Compras
CREATE TABLE IF NOT EXISTS purchases (
    id            BIGSERIAL   PRIMARY KEY,
    supplier_id   BIGINT      NOT NULL REFERENCES suppliers(id),
    purchase_number VARCHAR(50) UNIQUE,
    status        VARCHAR(20) NOT NULL DEFAULT 'pending',  -- pending|received|canceled
    total         DECIMAL(12,2) NOT NULL DEFAULT 0,
    notes         TEXT,
    created_by    BIGINT REFERENCES users(id) ON DELETE SET NULL,
    received_at   TIMESTAMP,
    created_at    TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_purchases_supplier ON purchases(supplier_id);
CREATE INDEX IF NOT EXISTS idx_purchases_status   ON purchases(status);

-- Itens de compra
CREATE TABLE IF NOT EXISTS purchase_items (
    id          BIGSERIAL   PRIMARY KEY,
    purchase_id BIGINT      NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
    product_id  BIGINT      NOT NULL REFERENCES products(id),
    quantity    INTEGER     NOT NULL DEFAULT 1,
    cost        DECIMAL(10,2) NOT NULL DEFAULT 0,
    subtotal    DECIMAL(10,2) NOT NULL DEFAULT 0,
    created_at  TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_purchase_items_purchase ON purchase_items(purchase_id);
CREATE INDEX IF NOT EXISTS idx_purchase_items_product  ON purchase_items(product_id);

-- Sessões de caixa (PDV)
CREATE TABLE IF NOT EXISTS cash_registers (
    id              BIGSERIAL   PRIMARY KEY,
    operator_id     BIGINT      NOT NULL REFERENCES users(id),
    opened_at       TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    closed_at       TIMESTAMP,
    opening_balance DECIMAL(12,2) NOT NULL DEFAULT 0,
    closing_balance DECIMAL(12,2),
    expected_balance DECIMAL(12,2),
    status          VARCHAR(20) NOT NULL DEFAULT 'open',  -- open|closed
    notes           TEXT,
    created_at      TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cash_registers_operator ON cash_registers(operator_id);
CREATE INDEX IF NOT EXISTS idx_cash_registers_status   ON cash_registers(status);

-- Transações de caixa
CREATE TABLE IF NOT EXISTS cash_transactions (
    id              BIGSERIAL   PRIMARY KEY,
    register_id     BIGINT      NOT NULL REFERENCES cash_registers(id),
    type            VARCHAR(30) NOT NULL,  -- sale|payment|sangria|suprimento|cancellation
    amount          DECIMAL(12,2) NOT NULL,
    reference_type  VARCHAR(30),           -- order|manual
    reference_id    BIGINT,
    payment_method  VARCHAR(50),           -- dinheiro|pix|credito|debito|boleto
    notes           TEXT,
    created_at      TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cash_transactions_register   ON cash_transactions(register_id);
CREATE INDEX IF NOT EXISTS idx_cash_transactions_type       ON cash_transactions(type);
CREATE INDEX IF NOT EXISTS idx_cash_transactions_reference  ON cash_transactions(reference_type, reference_id);

-- Contas a receber
CREATE TABLE IF NOT EXISTS accounts_receivable (
    id              BIGSERIAL   PRIMARY KEY,
    order_id        BIGINT      REFERENCES orders(id) ON DELETE SET NULL,
    description     VARCHAR(255),
    amount          DECIMAL(12,2) NOT NULL,
    due_date        DATE        NOT NULL,
    paid_at         TIMESTAMP,
    payment_method  VARCHAR(50),
    status          VARCHAR(20) NOT NULL DEFAULT 'pending',  -- pending|paid|canceled|overdue
    notes           TEXT,
    created_at      TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_receivable_status   ON accounts_receivable(status);
CREATE INDEX IF NOT EXISTS idx_receivable_due_date ON accounts_receivable(due_date);
CREATE INDEX IF NOT EXISTS idx_receivable_order    ON accounts_receivable(order_id);

-- Contas a pagar
CREATE TABLE IF NOT EXISTS accounts_payable (
    id              BIGSERIAL   PRIMARY KEY,
    supplier_id     BIGINT      REFERENCES suppliers(id) ON DELETE SET NULL,
    purchase_id     BIGINT      REFERENCES purchases(id) ON DELETE SET NULL,
    description     VARCHAR(255) NOT NULL,
    amount          DECIMAL(12,2) NOT NULL,
    due_date        DATE        NOT NULL,
    paid_at         TIMESTAMP,
    payment_method  VARCHAR(50),
    status          VARCHAR(20) NOT NULL DEFAULT 'pending',  -- pending|paid|canceled|overdue
    notes           TEXT,
    created_at      TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_payable_status    ON accounts_payable(status);
CREATE INDEX IF NOT EXISTS idx_payable_due_date  ON accounts_payable(due_date);
CREATE INDEX IF NOT EXISTS idx_payable_supplier  ON accounts_payable(supplier_id);

-- ========== DOWN ==========
-- DROP TABLE IF EXISTS accounts_payable, accounts_receivable, cash_transactions,
--   cash_registers, purchase_items, purchases, suppliers CASCADE;
