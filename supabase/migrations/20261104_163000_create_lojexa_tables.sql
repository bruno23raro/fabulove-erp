-- Migration: LojeXa Tables
-- Created: 2026-11-04
-- Purpose: Tables for LojeXa Hub integration credential storage and webhook events

-- Credentials table for encrypted storage of LojeXa tokens
CREATE TABLE IF NOT EXISTS lojexa_credentials (
  id SERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  credential_type TEXT NOT NULL,
  encrypted_value TEXT NOT NULL,
  iv TEXT NOT NULL,
  auth_tag TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tenant_id, credential_type)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_lojexa_credentials_tenant ON lojexa_credentials(tenant_id);
CREATE INDEX IF NOT EXISTS idx_lojexa_credentials_type ON lojexa_credentials(credential_type);

-- Webhook events table for audit trail
CREATE TABLE IF NOT EXISTS webhook_events (
  id SERIAL PRIMARY KEY,
  event_id UUID NOT NULL DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  order_id TEXT,
  sku TEXT,
  data JSONB,
  processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for webhook events
CREATE INDEX IF NOT EXISTS idx_webhook_events_event_id ON webhook_events(event_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_event_type ON webhook_events(event_type);
CREATE INDEX IF NOT EXISTS idx_webhook_events_order_id ON webhook_events(order_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_sku ON webhook_events(sku);
CREATE INDEX IF NOT EXISTS idx_webhook_events_processed_at ON webhook_events(processed_at);

-- Insert a comment for the tables
COMMENT ON TABLE lojexa_credentials IS 'Encrypted storage for LojeXa Hub credentials (API keys, tokens, webhooks)';
COMMENT ON TABLE webhook_events IS 'Audit trail for LojeXa webhook events received by ERP';

-- Comments for columns
COMMENT ON COLUMN lojexa_credentials.credential_type IS 'Type: api_key, webhook_secret, oauth_access_token, oauth_refresh_token';
COMMENT ON COLUMN lojexa_credentials.encrypted_value IS 'AES-256-GCM encrypted credential value (hex)';
COMMENT ON COLUMN lojexa_credentials.iv IS 'Initialization vector for AES-256-GCM (12 bytes, hex)';
COMMENT ON COLUMN lojexa_credentials.auth_tag IS 'Authentication tag for GCM mode (16 bytes, hex)';
COMMENT ON COLUMN webhook_events.event_type IS 'Webhook event type: sale.completed, order.cancelled, stock.updated, order.created';
COMMENT ON COLUMN webhook_events.data IS 'Raw webhook payload data';