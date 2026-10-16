ALTER TABLE products ADD COLUMN IF NOT EXISTS price_shopee NUMERIC(12,2);

-- Popular valor existente baseado na fórmula: preço * 1.19 + 4.71
UPDATE products SET price_shopee = ROUND((price * 1.19 + 4.71)::numeric, 2)
WHERE price_shopee IS NULL AND price IS NOT NULL;
