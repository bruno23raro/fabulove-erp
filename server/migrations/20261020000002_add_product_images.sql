-- Product images table for storing uploaded/extracted images
CREATE TABLE IF NOT EXISTS product_images (
  id          BIGSERIAL PRIMARY KEY,
  product_id  BIGINT REFERENCES products(id) ON DELETE CASCADE,
  filename    VARCHAR(500) NOT NULL,
  file_path   TEXT NOT NULL,
  file_size   BIGINT,
  mime_type   VARCHAR(100),
  url         TEXT,
  is_primary  BOOLEAN DEFAULT FALSE,
  status      VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'linked', 'discarded')),
  source      VARCHAR(100) DEFAULT 'upload',  -- 'upload', 'zip_extract', 'url'
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_product_images_product ON product_images(product_id);
CREATE INDEX IF NOT EXISTS idx_product_images_status ON product_images(status);
CREATE INDEX IF NOT EXISTS idx_product_images_source ON product_images(source);
