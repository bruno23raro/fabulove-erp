-- Adiciona colunas de login email+senha na tabela shopee_config
-- Migracao idempotente: ignora se colunas ja existirem
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shopee_config' AND column_name = 'email') THEN
    ALTER TABLE shopee_config ADD COLUMN email TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shopee_config' AND column_name = 'password') THEN
    ALTER TABLE shopee_config ADD COLUMN "password" TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shopee_config' AND column_name = 'access_token') THEN
    ALTER TABLE shopee_config ADD COLUMN access_token TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'shopee_config' AND column_name = 'token_expires_at') THEN
    ALTER TABLE shopee_config ADD COLUMN token_expires_at TIMESTAMP;
  END IF;
END
$$;
