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

INSERT INTO users (name, email, password_hash, role, status)
SELECT 'Admin CozyLab', 'admin@cozylab.local', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', 'admin', 'active'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'admin@cozylab.local');

INSERT INTO users (name, email, password_hash, role, status)
SELECT 'Host CozyLab', 'host@cozylab.local', '0abea6ba7e8d8edb931b17c7add249429d95232502416ec48201f1b0f61ed23c', 'host', 'active'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'host@cozylab.local');

INSERT INTO users (name, email, password_hash, role, status)
SELECT 'Buyer CozyLab', 'buyer@cozylab.local', 'e547bd13228250dfb4c7df1d1ebb78cfd9f2ada56ebb0c425d35829dd3ac4ae8', 'buyer', 'active'
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