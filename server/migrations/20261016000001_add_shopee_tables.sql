-- Tabela de configuração Shopee (credentials + status)
CREATE TABLE IF NOT EXISTS shopee_config (
  id          SERIAL PRIMARY KEY,
  api_key     TEXT NOT NULL,
  api_secret  TEXT NOT NULL,
  shop_id     TEXT,
  partner_id  TEXT,
  webhook_token TEXT,
  sync_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  last_sync_at TIMESTAMP,
  last_sync_status TEXT,
  created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Logs de sincronização
CREATE TABLE IF NOT EXISTS shopee_sync_logs (
  id            SERIAL PRIMARY KEY,
  action        TEXT NOT NULL,
  product_id    INTEGER REFERENCES products(id) ON DELETE SET NULL,
  shopee_item_id TEXT,
  status        TEXT NOT NULL DEFAULT 'pending',
  message       TEXT,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Índice para busca rápida nos logs
CREATE INDEX IF NOT EXISTS idx_shopee_sync_logs_action ON shopee_sync_logs(action);
CREATE INDEX IF NOT EXISTS idx_shopee_sync_logs_product ON shopee_sync_logs(product_id);
CREATE INDEX IF NOT EXISTS idx_shopee_sync_logs_created ON shopee_sync_logs(created_at DESC);
