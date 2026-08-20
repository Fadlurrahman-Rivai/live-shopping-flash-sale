CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('buyer', 'host', 'admin')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'blocked', 'pending_verification')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  host_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  image_url TEXT,
  normal_price INTEGER NOT NULL CHECK (normal_price >= 0),
  stock INTEGER NOT NULL CHECK (stock >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS streams (
  id SERIAL PRIMARY KEY,
  host_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'live', 'ended')),
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  viewer_peak INTEGER NOT NULL DEFAULT 0 CHECK (viewer_peak >= 0)
);

CREATE TABLE IF NOT EXISTS flash_sales (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  stream_id INTEGER NOT NULL REFERENCES streams(id) ON DELETE CASCADE,
  sale_price INTEGER NOT NULL CHECK (sale_price >= 0),
  sale_stock INTEGER NOT NULL CHECK (sale_stock >= 0),
  quota_per_user INTEGER NOT NULL CHECK (quota_per_user > 0),
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'active', 'ended'))
);

CREATE TABLE IF NOT EXISTS orders (
  id BIGSERIAL PRIMARY KEY,
  buyer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  flash_sale_id INTEGER NOT NULL REFERENCES flash_sales(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  total_price INTEGER NOT NULL CHECK (total_price >= 0),
  status TEXT NOT NULL DEFAULT 'paid' CHECK (status IN ('pending', 'paid', 'shipped', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id BIGSERIAL PRIMARY KEY,
  stream_id INTEGER NOT NULL REFERENCES streams(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
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

-- Partial index: every auth request only queries active (non-revoked) sessions
CREATE INDEX IF NOT EXISTS idx_sessions_active
  ON sessions(token) WHERE revoked_at IS NULL;

-- Composite: quota check on every order hits both columns together
CREATE INDEX IF NOT EXISTS idx_orders_buyer_flash_sale
  ON orders(buyer_id, flash_sale_id);

-- Covers buyer order list and count queries
CREATE INDEX IF NOT EXISTS idx_orders_buyer_id
  ON orders(buyer_id);

-- Host order reports use products.host_id via JOIN
CREATE INDEX IF NOT EXISTS idx_products_host_id
  ON products(host_id);

-- Chat pagination: high-frequency reads ordered by time per stream
CREATE INDEX IF NOT EXISTS idx_chat_stream_time
  ON chat_messages(stream_id, created_at DESC);

-- Flash sale lookups by stream (catalog, stream detail)
CREATE INDEX IF NOT EXISTS idx_flash_sales_stream_id
  ON flash_sales(stream_id);

-- Flash sale lookups by product (catalog subquery)
CREATE INDEX IF NOT EXISTS idx_flash_sales_product_id
  ON flash_sales(product_id);

-- Stream filtering by status (live/scheduled list)
CREATE INDEX IF NOT EXISTS idx_streams_status
  ON streams(status);

-- Host stream list and order reports
CREATE INDEX IF NOT EXISTS idx_streams_host_id
  ON streams(host_id);

INSERT INTO users (name, email, password_hash, role, status)
SELECT 'Admin CozyLab', 'admin@cozylab.local', '$argon2id$v=19$m=65536,p=4,t=3$BWTnHcXSoODMNiS4hJ4mRA$UcCl3Dh52l07MxvfpjPMvehSZlzr+98eatpWSIRHVXc', 'admin', 'active'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'admin@cozylab.local');

INSERT INTO users (name, email, password_hash, role, status)
SELECT 'Host CozyLab', 'host@cozylab.local', '$argon2id$v=19$m=65536,p=4,t=3$NbAJ6uu3NQmIfn8RcUPWGQ$hvWt7Y2k1pbpB3UuK1Emgzlkhhxbf0XKxk2rkF9LL5Q', 'host', 'active'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'host@cozylab.local');

INSERT INTO users (name, email, password_hash, role, status)
SELECT 'Buyer CozyLab', 'buyer@cozylab.local', '$argon2id$v=19$m=65536,p=4,t=3$vLmqyUOgyn1ae0KXMxKzqA$8Zhu7978cOjbAeUbIIgBrw0w+hAA7RKHUKX5CgtBc5w', 'buyer', 'active'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'buyer@cozylab.local');

INSERT INTO sessions (token, user_id)
SELECT 'admin-demo-token', id FROM users
WHERE email = 'admin@cozylab.local'
  AND NOT EXISTS (SELECT 1 FROM sessions WHERE token = 'admin-demo-token');

INSERT INTO sessions (token, user_id)
SELECT 'host-demo-token', id FROM users
WHERE email = 'host@cozylab.local'
  AND NOT EXISTS (SELECT 1 FROM sessions WHERE token = 'host-demo-token');

INSERT INTO sessions (token, user_id)
SELECT 'buyer-demo-token', id FROM users
WHERE email = 'buyer@cozylab.local'
  AND NOT EXISTS (SELECT 1 FROM sessions WHERE token = 'buyer-demo-token');

INSERT INTO products (host_id, name, description, image_url, normal_price, stock)
SELECT id, 'Ring Light Studio', 'Ring light untuk setup live shopping studio.', '/images/ring-light.png', 349000, 12
FROM users
WHERE email = 'host@cozylab.local'
  AND NOT EXISTS (SELECT 1 FROM products WHERE name = 'Ring Light Studio');

INSERT INTO products (host_id, name, description, image_url, normal_price, stock)
SELECT id, 'Tripod Live Mini', 'Tripod ringkas untuk live mobile.', '/images/tripod-mini.png', 129000, 8
FROM users
WHERE email = 'host@cozylab.local'
  AND NOT EXISTS (SELECT 1 FROM products WHERE name = 'Tripod Live Mini');

INSERT INTO products (host_id, name, description, image_url, normal_price, stock)
SELECT id, 'Mic Wireless Creator', 'Mic wireless untuk host dan konten pendek.', '/images/mic-wireless.png', 459000, 5
FROM users
WHERE email = 'host@cozylab.local'
  AND NOT EXISTS (SELECT 1 FROM products WHERE name = 'Mic Wireless Creator');

INSERT INTO streams (host_id, title, status, started_at, ended_at, viewer_peak)
SELECT id, 'Live Studio Setup Mingguan', 'live', '2026-08-19T10:00:00Z'::timestamptz, NULL::timestamptz, 142
FROM users
WHERE email = 'host@cozylab.local'
  AND NOT EXISTS (SELECT 1 FROM streams WHERE title = 'Live Studio Setup Mingguan');

INSERT INTO streams (host_id, title, status, started_at, ended_at, viewer_peak)
SELECT id, 'Sneak Peek Gear Pekan Depan', 'scheduled', '2026-08-26T10:00:00Z'::timestamptz, NULL::timestamptz, 0
FROM users
WHERE email = 'host@cozylab.local'
  AND NOT EXISTS (SELECT 1 FROM streams WHERE title = 'Sneak Peek Gear Pekan Depan');

INSERT INTO flash_sales (product_id, stream_id, sale_price, sale_stock, quota_per_user, start_time, end_time, status)
VALUES
  (1, 1, 299000, 12, 2, '2026-08-19T10:00:00Z'::timestamptz, '2026-12-31T23:59:59Z'::timestamptz, 'active'),
  (2, 2, 99000, 6, 1, '2026-08-26T10:00:00Z'::timestamptz, '2026-12-31T23:59:59Z'::timestamptz, 'scheduled');

INSERT INTO chat_messages (stream_id, user_id, content)
VALUES (1, 3, 'Kapan flash sale berikutnya dimulai?');