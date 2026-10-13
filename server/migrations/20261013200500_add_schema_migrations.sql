-- Migration: add_schema_migrations_table
-- Created: 2026-10-13T20:05:00
-- Adds versioning control for migrations (idempotent migration runner)
-- This migration itself is bootstrapped specially in migrate.js

-- ========== UP ==========
CREATE TABLE IF NOT EXISTS schema_migrations (
    id         BIGSERIAL PRIMARY KEY,
    filename   VARCHAR(255) NOT NULL UNIQUE,
    applied_at TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_schema_migrations_filename ON schema_migrations(filename);

-- ========== DOWN ==========
-- DROP TABLE IF EXISTS schema_migrations;
