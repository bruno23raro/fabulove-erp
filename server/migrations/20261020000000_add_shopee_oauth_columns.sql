-- Migração idempotente: adiciona colunas OAuth na shopee_config
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shopee_config' AND column_name = 'access_token') THEN
    ALTER TABLE shopee_config ADD COLUMN access_token TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shopee_config' AND column_name = 'token_expires_at') THEN
    ALTER TABLE shopee_config ADD COLUMN token_expires_at TIMESTAMP;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shopee_config' AND column_name = 'refresh_token') THEN
    ALTER TABLE shopee_config ADD COLUMN refresh_token TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shopee_config' AND column_name = 'token_type') THEN
    ALTER TABLE shopee_config ADD COLUMN token_type TEXT DEFAULT 'Bearer';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shopee_config' AND column_name = 'auth_state') THEN
    ALTER TABLE shopee_config ADD COLUMN auth_state TEXT;
  END IF;
END
$$;
