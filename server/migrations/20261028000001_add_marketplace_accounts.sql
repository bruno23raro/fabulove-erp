-- Migration: Add marketplace_accounts table
-- Stores OAuth tokens and config for all connected marketplaces

CREATE TABLE IF NOT EXISTS marketplace_accounts (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    provider VARCHAR(50) NOT NULL,
    access_token TEXT,
    refresh_token TEXT,
    token_expires_at TIMESTAMP WITHOUT TIME ZONE,
    config_json JSONB DEFAULT '{}',
    connected_at TIMESTAMP WITHOUT TIME ZONE,
    last_sync_at TIMESTAMP WITHOUT TIME ZONE,
    status VARCHAR(20) DEFAULT 'disconnected' CHECK (status IN ('connected', 'disconnected', 'error')),
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_marketplace_accounts_provider ON marketplace_accounts(provider);
CREATE INDEX IF NOT EXISTS idx_marketplace_accounts_status ON marketplace_accounts(status);
CREATE INDEX IF NOT EXISTS idx_marketplace_accounts_name ON marketplace_accounts(name);

-- Idempotent: do nothing if already exists
INSERT INTO schema_migrations (version)
SELECT '20261028000001'
WHERE NOT EXISTS (SELECT 1 FROM schema_migrations WHERE version = '20261028000001');
