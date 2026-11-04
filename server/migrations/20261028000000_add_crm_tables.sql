-- CRM Module Migration
-- Creates tables for leads, deals/pipelines, and follow-up activities
-- Idempotent: uses IF NOT EXISTS and ON CONFLICT DO NOTHING

-- Table: crm_leads
-- Represents individual contacts/leads in the pipeline
CREATE TABLE IF NOT EXISTS crm_leads (
    id            SERIAL PRIMARY KEY,
    user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    company       VARCHAR(255),
    contact_name  VARCHAR(255) NOT NULL,
    email         VARCHAR(255),
    phone         VARCHAR(50),
    source        VARCHAR(100) DEFAULT 'manual',  -- manual, shopee, ml, website, referral
    status        VARCHAR(50) NOT NULL DEFAULT 'new',  -- new, contacted, qualified, proposal, closed_won, closed_lost
    value         DECIMAL(12,2) DEFAULT 0,
    notes         TEXT,
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Table: crm_deals
-- Represents deals/opportunities with pipeline stage
CREATE TABLE IF NOT EXISTS crm_deals (
    id            SERIAL PRIMARY KEY,
    lead_id       INTEGER NOT NULL REFERENCES crm_leads(id) ON DELETE CASCADE,
    user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title         VARCHAR(255) NOT NULL,
    description   TEXT,
    pipeline_stage VARCHAR(50) NOT NULL DEFAULT 'prospecting',  -- prospecting, qualification, proposal, negotiation, closed_won, closed_lost
    expected_value DECIMAL(12,2) DEFAULT 0,
    close_date    DATE,
    probability   INTEGER DEFAULT 50,  -- 0-100
    created_at    TIMESTAMPTZ DEFAULT NOW(),
    updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Table: crm_activities
-- Follow-up activities (calls, meetings, emails)
CREATE TABLE IF NOT EXISTS crm_activities (
    id            SERIAL PRIMARY KEY,
    lead_id       INTEGER REFERENCES crm_leads(id) ON DELETE CASCADE,
    deal_id       INTEGER REFERENCES crm_deals(id) ON DELETE CASCADE,
    user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type          VARCHAR(50) NOT NULL,  -- call, meeting, email, note, task
    subject       VARCHAR(255),
    description   TEXT,
    scheduled_at  TIMESTAMPTZ,
    completed_at  TIMESTAMPTZ,
    created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_crm_leads_user_id       ON crm_leads(user_id);
CREATE INDEX IF NOT EXISTS idx_crm_leads_status        ON crm_leads(status);
CREATE INDEX IF NOT EXISTS idx_crm_deals_lead_id       ON crm_deals(lead_id);
CREATE INDEX IF NOT EXISTS idx_crm_deals_pipeline_stage ON crm_deals(pipeline_stage);
CREATE INDEX IF NOT EXISTS idx_crm_activities_lead_id  ON crm_activities(lead_id);
CREATE INDEX IF NOT EXISTS idx_crm_activities_deal_id  ON crm_activities(deal_id);
CREATE INDEX IF NOT EXISTS idx_crm_activities_scheduled ON crm_activities(scheduled_at);

-- Update updated_at trigger for crm_leads
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_crm_leads_updated_at ON crm_leads;
CREATE TRIGGER update_crm_leads_updated_at
    BEFORE UPDATE ON crm_leads
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_crm_deals_updated_at ON crm_deals;
CREATE TRIGGER update_crm_deals_updated_at
    BEFORE UPDATE ON crm_deals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
