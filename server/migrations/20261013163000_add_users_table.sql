-- Migration: add_users_table
-- Created: 2026-10-13T16:30:00
-- Adds users table for authentication (separate from customers)
-- Users represent system operators; customers are e-commerce buyers

-- ========== UP ==========

-- Enum para roles
DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN CREATE TYPE user_role AS ENUM ('admin', 'manager', 'operator', 'viewer'); END IF; END $$;

CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'operator',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    failed_login_attempts INTEGER NOT NULL DEFAULT 0,
    locked_until TIMESTAMP,
    last_login_at TIMESTAMP,
    last_login_ip VARCHAR(45),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Refresh tokens table para revogação segura
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    revoked_at TIMESTAMP,
    replaced_by_hash VARCHAR(255),   -- token de substituição (rotação)
    ip_address VARCHAR(45),
    user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash ON refresh_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires ON refresh_tokens(expires_at);

-- Seed: usuário admin inicial (senha: Admin@12345 - TROCAR EM PRODUÇÃO)
-- Hash gerado com bcrypt rounds=12
INSERT INTO users (name, email, password_hash, role) VALUES (
    'Administrador',
    'admin@fabulove.com',
    '$2b$12$mP0OTGPXRHaF5cWF/V3B5.Ly8Q.IrNkLf7Lf6Yf.e/GHwFoFdKSBq',
    'admin'
) ON CONFLICT (email) DO NOTHING;

-- ========== DOWN ==========
DROP TABLE IF EXISTS refresh_tokens;
DROP TABLE IF EXISTS users;
DROP TYPE IF EXISTS user_role;