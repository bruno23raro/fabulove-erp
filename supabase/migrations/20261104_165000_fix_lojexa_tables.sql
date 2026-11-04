-- Migration: Fix LojeXa Tables - Add tenant_id and RLS policies
-- Created: 2026-11-04 16:50:00
-- Purpose: Ensure all LojeXa tables have tenant isolation and RLS

-- =============================================================================
-- lojexa_credentials table fixes
-- =============================================================================

-- Add tenant_id column if not exists
ALTER TABLE IF EXISTS lojexa_credentials
ADD COLUMN IF NOT EXISTS tenant_id TEXT;

-- Add constraint for non-null tenant_id (if column was empty)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'lojexa_credentials'
             AND column_name = 'tenant_id') THEN
    ALTER TABLE lojexa_credentials ALTER COLUMN tenant_id SET NOT NULL;
  END IF;
END $$;

-- Create index for tenant lookups
CREATE INDEX IF NOT EXISTS idx_lojexa_credentials_tenant_type
ON lojexa_credentials(tenant_id, credential_type);

-- =============================================================================
-- webhook_events table fixes
-- =============================================================================

-- Add tenant_id column if not exists
ALTER TABLE IF EXISTS webhook_events
ADD COLUMN IF NOT EXISTS tenant_id TEXT;

-- Create indexes for webhook events with tenant
CREATE INDEX IF NOT EXISTS idx_webhook_events_tenant_event_type
ON webhook_events(tenant_id, event_type);

CREATE INDEX IF NOT EXISTS idx_webhook_events_created_at
ON webhook_events(created_at DESC);

-- =============================================================================
-- Row Level Security (RLS) Policies
-- =============================================================================

-- Enable RLS on lojexa_credentials
ALTER TABLE IF EXISTS lojexa_credentials ENABLE ROW LEVEL SECURITY;

-- Policy: Tenants can only read their own credentials
CREATE POLICY IF NOT EXISTS lojexa_credentials_select
ON lojexa_credentials
FOR SELECT
USING (tenant_id = current_setting('request.jwt.claims', true)::jsonb->>'sub');

-- Policy: Tenants can only insert their own credentials
CREATE POLICY IF NOT EXISTS lojexa_credentials_insert
ON lojexa_credentials
FOR INSERT
WITH CHECK (tenant_id = current_setting('request.jwt.claims', true)::jsonb->>'sub');

-- Policy: Tenants can only update their own credentials
CREATE POLICY IF NOT EXISTS lojexa_credentials_update
ON lojexa_credentials
FOR UPDATE
USING (tenant_id = current_setting('request.jwt.claims', true)::jsonb->>'sub');

-- Policy: Tenants can only delete their own credentials
CREATE POLICY IF NOT EXISTS lojexa_credentials_delete
ON lojexa_credentials
FOR DELETE
USING (tenant_id = current_setting('request.jwt.claims', true)::jsonb->>'sub');

-- Enable RLS on webhook_events
ALTER TABLE IF EXISTS webhook_events ENABLE ROW LEVEL SECURITY;

-- Policy: Tenants can only read their own webhook events
CREATE POLICY IF NOT EXISTS webhook_events_select
ON webhook_events
FOR SELECT
USING (tenant_id = current_setting('request.jwt.claims', true)::jsonb->>'sub');

-- Policy: Tenants can only insert their own webhook events
CREATE POLICY IF NOT EXISTS webhook_events_insert
ON webhook_events
FOR INSERT
WITH CHECK (tenant_id = current_setting('request.jwt.claims', true)::jsonb->>sub');

-- Policy: Tenants can only update their own webhook events
CREATE POLICY IF NOT EXISTS webhook_events_update
ON webhook_events
FOR UPDATE
USING (tenant_id = current_setting('request.jwt.claims', true)::jsonb->>'sub');

-- Policy: Tenants can only delete their own webhook events
CREATE POLICY IF NOT EXISTS webhook_events_delete
ON webhook_events
FOR DELETE
USING (tenant_id = current_setting('request.jwt.claims', true)::jsonb->>'sub');

-- =============================================================================
-- Insert default channels if not exists
-- =============================================================================

INSERT INTO channels (slug, name, region, currency) VALUES
  ('shopee', 'Shopee', 'Asia-Pacific', 'USD'),
  ('mercadolivre', 'Mercado Livre', 'Latin America', 'BRL'),
  ('magalu', 'Magalu', 'Brazil', 'BRL'),
  ('amazon', 'Amazon', 'Global', 'USD')
ON CONFLICT (slug) DO NOTHING;