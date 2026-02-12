CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY,
  saga_id UUID UNIQUE NOT NULL,
  order_id UUID NOT NULL,
  amount NUMERIC(12, 2) NOT NULL,
  method_token TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_saga_id ON payments(saga_id);
