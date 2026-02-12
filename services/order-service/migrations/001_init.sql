CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY,
  saga_id UUID UNIQUE NOT NULL,
  customer_id TEXT NOT NULL,
  total_amount NUMERIC(12, 2) NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_saga_id ON orders(saga_id);
