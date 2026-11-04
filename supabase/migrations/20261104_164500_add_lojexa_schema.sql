-- Migration: LojeXa Schema - Channels, Connections, Intents, Snapshots
-- Created: 2026-11-04 16:45:00
-- Purpose: Full schema for LojeXa Hub integration with tenant isolation

-- Create channels table (marketplace providers)
CREATE TABLE IF NOT EXISTS channels (
  slug TEXT PRIMARY KEY,           -- shopee, mercadolivre, magalu, amazon
  name TEXT NOT NULL,              -- Friendly name
  region TEXT,                     -- Region (Latin America, Asia-Pacific, etc.)
  currency TEXT,                   -- Currency code(s)
  config JSONB DEFAULT '{}',       -- Additional configuration
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert seed data for common channels
INSERT INTO channels (slug, name, region, currency) VALUES
  ('shopee', 'Shopee', 'Asia-Pacific', 'USD'),
  ('mercadolivre', 'Mercado Livre', 'Latin America', 'BRL'),
  ('magalu', 'Magalu', 'Brazil', 'BRL'),
  ('amazon', 'Amazon', 'Global', 'USD')
ON CONFLICT (slug) DO NOTHING;

-- Create connection_intents table (for OAuth flow)
CREATE TABLE IF NOT EXISTS connection_intents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  channel_slug TEXT NOT NULL REFERENCES channels(slug) ON DELETE CASCADE,
  state TEXT NOT NULL,                        -- OAuth state for CSRF protection
  connect_url TEXT NOT NULL,                  -- LojeXa Hub connect URL
  snapshot JSONB,                             -- Store info at intent creation
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  used_at TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'pending',              -- pending, confirmed, expired, failed
  FOREIGN KEY (tenant_id, channel_slug) REFERENCES connections(tenant_id, channel_slug) ON DELETE CASCADE
);

-- Create connection_intents indexes
CREATE INDEX IF NOT EXISTS idx_connection_intents_state ON connection_intents(state);
CREATE INDEX IF NOT EXISTS idx_connection_intents_tenant ON connection_intents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_connection_intents_expires ON connection_intents(expires_at);

-- Create connections table (established connections)
CREATE TABLE IF NOT EXISTS connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  channel_slug TEXT NOT NULL REFERENCES channels(slug) ON DELETE CASCADE,
  lojexa_store_id TEXT,                       -- Store ID from LojeXa
  store_name TEXT,
  api_key TEXT,                                -- Masked - full key encrypted
  api_key_masked TEXT,                         -- Masked for display (e.g., lj_xxx...123)
  oauth_config JSONB,                          -- OAuth configuration
  scopes TEXT[],                               -- Granted scopes
  connected_at TIMESTAMP WITH TIME ZONE,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'disconnected',         -- disconnected, connected, error
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tenant_id, channel_slug, lojexa_store_id)
);

-- Create connections indexes
CREATE INDEX IF NOT EXISTS idx_connections_tenant ON connections(tenant_id);
CREATE INDEX IF NOT EXISTS idx_connections_channel ON connections(channel_slug);
CREATE INDEX IF NOT EXISTS idx_connections_status ON connections(status);
CREATE INDEX IF NOT EXISTS idx_connections_store_id ON connections(lojexa_store_id);

-- Create sku_mappings table (ERP SKU ↔ LojeXa SKU mapping)
CREATE TABLE IF NOT EXISTS sku_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  erp_sku TEXT NOT NULL,
  lojexa_store_id TEXT NOT NULL,
  lojexa_sku TEXT,
  channel_slug TEXT NOT NULL REFERENCES channels(slug) ON DELETE CASCADE,
  sync_enabled BOOLEAN DEFAULT true,
  last_synced_at TIMESTAMP WITH TIME ZONE,
  sync_status TEXT,                          -- synced, divergent, error
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tenant_id, lojexa_store_id, erp_sku)
);

-- Create sku_mappings indexes
CREATE INDEX IF NOT EXISTS idx_sku_mappings_tenant ON sku_mappings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sku_mappings_erp_sku ON sku_mappings(erp_sku);
CREATE INDEX IF NOT EXISTS idx_sku_mappings_lojexa_sku ON sku_mappings(lojexa_sku);

-- Create store_snapshots table (for intent comparison)
CREATE TABLE IF NOT EXISTS store_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  store_id TEXT NOT NULL,
  data JSONB,                                -- Full store info snapshot
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(tenant_id, store_id, created_at)
);

-- Create store_snapshots indexes
CREATE INDEX IF NOT EXISTS idx_store_snapshots_tenant_store ON store_snapshots(tenant_id, store_id);
CREATE INDEX IF NOT EXISTS idx_store_snapshots_expires ON store_snapshots(expires_at);

-- Create order_feed_cursor table (for incremental order sync)
CREATE TABLE IF NOT EXISTS order_feed_cursor (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  channel_slug TEXT NOT NULL REFERENCES channels(slug) ON DELETE CASCADE,
  cursor_value TEXT,                           -- Position in feed
  last_sync_at TIMESTAMP WITH TIME ZONE,
  total_synced INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tenant_id, channel_slug)
);

-- Create order_feed_cursor indexes
CREATE INDEX IF NOT EXISTS idx_order_feed_cursor_tenant ON order_feed_cursor(tenant_id);

-- Create sync_jobs table (for background sync tracking)
CREATE TABLE IF NOT EXISTS sync_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  channel_slug TEXT NOT NULL REFERENCES channels(slug) ON DELETE CASCADE,
  job_type TEXT NOT NULL,                     -- stock_sync, product_sync, order_sync
  status TEXT DEFAULT 'pending',              -- pending, running, completed, failed
  progress INTEGER DEFAULT 0,                 -- 0-100
  total_items INTEGER DEFAULT 0,
  processed_items INTEGER DEFAULT 0,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tenant_id, channel_slug, job_type)
);

-- Create sync_jobs indexes
CREATE INDEX IF NOT EXISTS idx_sync_jobs_tenant_status ON sync_jobs(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_sync_jobs_created_at ON sync_jobs(created_at);

-- Create rate_budget table (for rate limiting per tenant/channel)
CREATE TABLE IF NOT EXISTS rate_budget (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL,
  channel_slug TEXT NOT NULL REFERENCES channels(slug) ON DELETE CASCADE,
  window_start TIMESTAMP WITH TIME ZONE NOT NULL,
  requests_count INTEGER DEFAULT 0,
  budget_limit INTEGER DEFAULT 60,           -- Requests per window
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tenant_id, channel_slug, window_start)
);

-- Create rate_budget indexes
CREATE INDEX IF NOT EXISTS idx_rate_budget_tenant_window ON rate_budget(tenant_id, window_start);
CREATE INDEX IF NOT EXISTS idx_rate_budget_channel_window ON rate_budget(channel_slug, window_start);

-- Update webhook_events table to add tenant_id
ALTER TABLE IF EXISTS webhook_events
ADD COLUMN IF NOT EXISTS tenant_id TEXT;

-- Add indexes for webhook_events
CREATE INDEX IF NOT EXISTS idx_webhook_events_tenant ON webhook_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_event_id_unique ON webhook_events(event_id) WHERE processed_at IS NOT NULL;

-- Add foreign key relationships (after table exists)
ALTER TABLE IF EXISTS lojexa_credentials
ADD CONSTRAINT IF NOT EXISTS fk_lojexa_credentials_tenant
FOREIGN KEY (tenant_id) REFERENCES channels(slug) ON DELETE CASCADE;

-- Comments
COMMENT ON TABLE channels IS 'Available marketplace channels/providers';
COMMENT ON TABLE connection_intents IS 'OAuth connection intents with state for CSRF protection';
COMMENT ON TABLE connections IS 'Established connections to marketplace channels via LojeXa Hub';
COMMENT ON TABLE sku_mappings IS 'Mapping between ERP SKUs and LojeXa SKUs';
COMMENT ON TABLE store_snapshots IS 'Store info snapshots for intent comparison';
COMMENT ON TABLE order_feed_cursor IS 'Cursor for incremental order feed sync';
COMMENT ON TABLE sync_jobs IS 'Background sync jobs tracking';
COMMENT ON TABLE rate_budget IS 'Rate limiting budget per tenant/channel/window';