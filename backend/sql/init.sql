CREATE TABLE IF NOT EXISTS items (
  id SERIAL PRIMARY KEY,
  nama TEXT NOT NULL UNIQUE,
  harga INTEGER NOT NULL CHECK (harga >= 0),
  sisa INTEGER NOT NULL CHECK (sisa >= 0)
);

CREATE TABLE IF NOT EXISTS orders (
  id BIGSERIAL PRIMARY KEY,
  item_id INTEGER NOT NULL REFERENCES items(id),
  qty INTEGER NOT NULL CHECK (qty > 0),
  total INTEGER NOT NULL CHECK (total >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS idempotency_keys (
  key TEXT PRIMARY KEY,
  state TEXT NOT NULL CHECK (state IN ('pending', 'done')),
  status_code INTEGER,
  response JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO items (nama, harga, sisa)
VALUES
  ('Ring Light Studio', 349000, 12),
  ('Tripod Live Mini', 129000, 8),
  ('Mic Wireless Creator', 459000, 5),
  ('Phone Holder Flex', 79000, 15)
ON CONFLICT (nama) DO NOTHING;