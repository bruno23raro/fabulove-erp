-- Migration: create import_profiles table for saving reusable column mappings
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'import_profiles') THEN
    CREATE TABLE import_profiles (
      id          BIGSERIAL PRIMARY KEY,
      user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name        VARCHAR(100) NOT NULL,
      description TEXT,
      mapping     JSONB,
      created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX idx_import_profiles_user ON import_profiles(user_id);
  END IF;
END
$$;
