-- Add video_url column to products table
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'video_url') THEN
    ALTER TABLE products ADD COLUMN video_url TEXT;
  END IF;
END $$;
