-- Torna customer_id nulo em orders para suportar vendas anônimas de PDV
-- Vendas PDV sem cliente identificado não devem ser associadas a nenhum cliente existente.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'orders'
      AND column_name = 'customer_id'
      AND is_nullable = 'YES'
  ) THEN
    ALTER TABLE orders ALTER COLUMN customer_id DROP NOT NULL;
  END IF;
END
$$;

-- Remover constraint NOT NULL se existir (segurança adicional)
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_customer_id_not_null;
