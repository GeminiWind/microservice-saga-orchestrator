CREATE TABLE IF NOT EXISTS shipments (
  id UUID PRIMARY KEY,
  saga_id UUID UNIQUE NOT NULL,
  order_id UUID NOT NULL,
  address TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shipments_saga_id ON shipments(saga_id);
