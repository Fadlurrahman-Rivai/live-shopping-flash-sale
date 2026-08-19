import { createHash, randomUUID } from "node:crypto";
import express from "express";

const USER_ROLES = new Set(["buyer", "host", "admin"]);
const USER_STATUSES = new Set(["active", "blocked", "pending_verification"]);
const STREAM_STATUSES = new Set(["scheduled", "live", "ended"]);
const FLASH_SALE_STATUSES = new Set(["scheduled", "active", "ended"]);

function galat(code, message) {
  return { error: { code, message } };
}

function parsePositiveInteger(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (Number.isNaN(parsed)) {
    return fallback;
  }

  return parsed;
}

function textOrNull(value) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function integerOrNull(value) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) {
    return null;
  }

  return parsed;
}

function nonNegativeIntegerOrNull(value) {
  const parsed = integerOrNull(value);
  if (parsed === null || parsed < 0) {
    return null;
  }

  return parsed;
}

function positiveIntegerOrNull(value) {
  const parsed = integerOrNull(value);
  if (parsed === null || parsed < 1) {
    return null;
  }

  return parsed;
}

function timestampOrNull(value) {
  if (value === null) {
    return null;
  }

  const text = textOrNull(value);
  if (!text) {
    return null;
  }

  const time = Date.parse(text);
  if (Number.isNaN(time)) {
    return null;
  }

  return new Date(time).toISOString();
}

function hashPassword(password) {
  return createHash("sha256").update(password).digest("hex");
}

function sanitizeUser(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    status: row.status,
    createdAt: row.created_at,
  };
}

function parseBearerToken(header) {
  if (!header) {
    return null;
  }

  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) {
    return null;
  }

  return token.trim();
}

function requireAuth(req, res, next) {
  if (!req.auth) {
    return res.status(401).json(galat("UNAUTHORIZED", "Autentikasi dibutuhkan"));
  }

  if (req.auth.status !== "active") {
    return res.status(403).json(galat("AKUN_TIDAK_AKTIF", "Akun tidak dapat digunakan"));
  }

  return next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.auth) {
      return res.status(401).json(galat("UNAUTHORIZED", "Autentikasi dibutuhkan"));
    }

    if (!roles.includes(req.auth.role)) {
      return res.status(403).json(galat("FORBIDDEN", "Akses tidak diizinkan"));
    }

    return next();
  };
}

async function lockIdempotencyKey(client, key) {
  const existing = await client.query(
    `SELECT key, state, status_code, response
     FROM idempotency_keys
     WHERE key = $1
     FOR UPDATE`,
    [key],
  );

  if (existing.rowCount === 1) {
    return {
      inserted: false,
      record: existing.rows[0],
    };
  }

  try {
    await client.query(
      `INSERT INTO idempotency_keys (key, state)
       VALUES ($1, 'pending')`,
      [key],
    );

    return {
      inserted: true,
      record: { state: "pending" },
    };
  } catch (error) {
    if (error?.code !== "23505") {
      throw error;
    }

    const duplicated = await client.query(
      `SELECT key, state, status_code, response
       FROM idempotency_keys
       WHERE key = $1
       FOR UPDATE`,
      [key],
    );

    if (duplicated.rowCount === 1) {
      return {
        inserted: false,
        record: duplicated.rows[0],
      };
    }
  }

  throw new Error("Failed to acquire idempotency lock");
}

async function storeIdempotencyResult(client, key, statusCode, responseBody) {
  if (!key) {
    return;
  }

  await client.query(
    `UPDATE idempotency_keys
     SET state = 'done',
         status_code = $2,
         response = $3::jsonb,
         updated_at = NOW()
     WHERE key = $1`,
    [key, statusCode, JSON.stringify(responseBody)],
  );
}

async function fetchUserByEmail(pool, email) {
  const result = await pool.query(
    `SELECT id, name, email, password_hash, role, status, created_at
     FROM users
     WHERE email = $1`,
    [email],
  );

  return result.rows[0] ?? null;
}

async function fetchProductById(pool, productId) {
  const result = await pool.query(
    `SELECT id, host_id, name, description, image_url, normal_price, stock, created_at
     FROM products
     WHERE id = $1`,
    [productId],
  );

  return result.rows[0] ?? null;
}

async function fetchStreamById(pool, streamId) {
  const result = await pool.query(
    `SELECT id, host_id, title, status, started_at, ended_at, viewer_peak
     FROM streams
     WHERE id = $1`,
    [streamId],
  );

  return result.rows[0] ?? null;
}

async function fetchFlashSaleById(pool, flashSaleId) {
  const result = await pool.query(
    `SELECT fs.id, fs.product_id, fs.stream_id, fs.sale_price, fs.sale_stock, fs.quota_per_user,
            fs.start_time, fs.end_time, fs.status, p.host_id, p.normal_price, p.stock
     FROM flash_sales fs
     JOIN products p ON p.id = fs.product_id
     WHERE fs.id = $1`,
    [flashSaleId],
  );

  return result.rows[0] ?? null;
}

function canManageOwnerResource(auth, ownerId) {
  return auth.role === "admin" || auth.id === ownerId;
}

function validateStartAndEndTime(startTime, endTime) {
  return Date.parse(startTime) < Date.parse(endTime);
}

function mapProductRow(row) {
  return {
    id: row.id,
    hostId: row.hostId ?? row.host_id,
    hostName: row.hostName ?? row.host_name,
    name: row.name,
    description: row.description,
    imageUrl: row.imageUrl ?? row.image_url,
    normalPrice: row.normalPrice ?? row.normal_price,
    stock: row.stock,
    createdAt: row.createdAt ?? row.created_at,
  };
}

function mapStreamRow(row) {
  return {
    id: row.id,
    hostId: row.hostId ?? row.host_id,
    hostName: row.hostName ?? row.host_name,
    title: row.title,
    status: row.status,
    startedAt: row.startedAt ?? row.started_at,
    endedAt: row.endedAt ?? row.ended_at,
    viewerPeak: row.viewerPeak ?? row.viewer_peak,
  };
}

function mapFlashSaleRow(row) {
  return {
    id: row.id,
    productId: row.productId ?? row.product_id,
    productName: row.productName ?? row.product_name,
    streamId: row.streamId ?? row.stream_id,
    streamTitle: row.streamTitle ?? row.stream_title,
    salePrice: row.salePrice ?? row.sale_price,
    saleStock: row.saleStock ?? row.sale_stock,
    quotaPerUser: row.quotaPerUser ?? row.quota_per_user,
    startTime: row.startTime ?? row.start_time,
    endTime: row.endTime ?? row.end_time,
    status: row.status,
  };
}

function mapOrderRow(row) {
  return {
    id: row.id,
    buyerId: row.buyerId ?? row.buyer_id,
    buyerName: row.buyerName ?? row.buyer_name,
    flashSaleId: row.flashSaleId ?? row.flash_sale_id,
    productId: row.productId ?? row.product_id,
    productName: row.productName ?? row.product_name,
    quantity: row.quantity,
    totalPrice: row.totalPrice ?? row.total_price,
    status: row.status,
    createdAt: row.createdAt ?? row.created_at,
  };
}

async function emitRealtimeEvent(path, payload) {
  const baseUrl = textOrNull(process.env.REALTIME_INTERNAL_URL);
  if (!baseUrl) {
    return;
  }

  try {
    await fetch(`${baseUrl}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    console.warn("Failed to emit realtime event", error);
  }
}

async function buildOrderError(client, flashSaleId, qty, buyerId) {
  const flashSaleResult = await client.query(
    `SELECT fs.id, fs.product_id, fs.sale_stock, fs.quota_per_user, fs.status, p.stock
     FROM flash_sales fs
     JOIN products p ON p.id = fs.product_id
     WHERE fs.id = $1`,
    [flashSaleId],
  );

  if (flashSaleResult.rowCount === 0) {
    return {
      statusCode: 404,
      body: galat("FLASH_SALE_TIDAK_ADA", "Flash sale tidak ditemukan"),
    };
  }

  const sale = flashSaleResult.rows[0];
  if (sale.status !== "active") {
    return {
      statusCode: 409,
      body: galat("FLASH_SALE_TIDAK_AKTIF", "Flash sale belum aktif atau sudah berakhir"),
    };
  }

  const quota = await client.query(
    `SELECT COALESCE(SUM(quantity), 0)::int AS purchased
     FROM orders
     WHERE buyer_id = $1 AND flash_sale_id = $2 AND status <> 'cancelled'`,
    [buyerId, flashSaleId],
  );

  const purchased = quota.rows[0]?.purchased ?? 0;
  if (purchased + qty > sale.quota_per_user) {
    return {
      statusCode: 409,
      body: galat("KUOTA_TERLAMPAUI", "Kuota pembelian per user terlampaui"),
    };
  }

  if (sale.sale_stock < qty || sale.stock < qty) {
    return {
      statusCode: 409,
      body: galat("STOK_HABIS", "Stok flash sale tidak mencukupi untuk pesanan ini"),
    };
  }

  return {
    statusCode: 409,
    body: galat("ORDER_GAGAL", "Pesanan tidak dapat diproses"),
  };
}

export function createApp({ pool }) {
  const app = express();

  app.use(express.json());
  app.use(async (req, _res, next) => {
    try {
      const token = parseBearerToken(req.header("Authorization"));
      req.authToken = token;
      req.auth = null;

      if (!token) {
        return next();
      }

      const result = await pool.query(
        `SELECT u.id, u.name, u.email, u.role, u.status, u.created_at
         FROM sessions s
         JOIN users u ON u.id = s.user_id
         WHERE s.token = $1 AND s.revoked_at IS NULL`,
        [token],
      );

      if (result.rowCount === 1) {
        req.auth = sanitizeUser(result.rows[0]);
      }

      return next();
    } catch (error) {
      return next(error);
    }
  });

  app.get("/health", async (_req, res, next) => {
    try {
      await pool.query("SELECT 1");
      res.json({ status: "ok" });
    } catch (error) {
      next(error);
    }
  });

  app.post("/auth/register", async (req, res, next) => {
    const name = textOrNull(req.body?.name);
    const email = textOrNull(req.body?.email)?.toLowerCase() ?? null;
    const password = textOrNull(req.body?.password);
    const role = textOrNull(req.body?.role) ?? "buyer";

    if (!name || !email || !password) {
      return res.status(400).json(galat("INPUT_TIDAK_VALID", "name, email, dan password wajib diisi"));
    }

    if (!USER_ROLES.has(role) || role === "admin") {
      return res.status(400).json(galat("ROLE_TIDAK_VALID", "Role hanya boleh buyer atau host"));
    }

    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const createdUser = await client.query(
        `INSERT INTO users (name, email, password_hash, role, status)
         VALUES ($1, $2, $3, $4, 'active')
         RETURNING id, name, email, role, status, created_at`,
        [name, email, hashPassword(password), role],
      );
      const token = randomUUID();
      await client.query(`INSERT INTO sessions (token, user_id) VALUES ($1, $2)`, [token, createdUser.rows[0].id]);
      await client.query("COMMIT");
      return res.status(201).json({ token, user: sanitizeUser(createdUser.rows[0]) });
    } catch (error) {
      await client.query("ROLLBACK");
      if (error?.code === "23505") {
        return res.status(409).json(galat("EMAIL_SUDAH_ADA", "Email sudah terdaftar"));
      }
      return next(error);
    } finally {
      client.release();
    }
  });

  app.post("/auth/login", async (req, res, next) => {
    try {
      const email = textOrNull(req.body?.email)?.toLowerCase() ?? null;
      const password = textOrNull(req.body?.password);

      if (!email || !password) {
        return res.status(400).json(galat("INPUT_TIDAK_VALID", "email dan password wajib diisi"));
      }

      const user = await fetchUserByEmail(pool, email);
      if (!user || user.password_hash !== hashPassword(password)) {
        return res.status(401).json(galat("LOGIN_GAGAL", "Email atau password salah"));
      }

      if (user.status !== "active") {
        return res.status(403).json(galat("AKUN_TIDAK_AKTIF", "Akun tidak dapat digunakan"));
      }

      const token = randomUUID();
      await pool.query(`INSERT INTO sessions (token, user_id) VALUES ($1, $2)`, [token, user.id]);
      return res.json({ token, user: sanitizeUser(user) });
    } catch (error) {
      return next(error);
    }
  });

  app.post("/auth/logout", requireAuth, async (req, res, next) => {
    try {
      await pool.query(`UPDATE sessions SET revoked_at = NOW() WHERE token = $1`, [req.authToken]);
      return res.json({ ok: true });
    } catch (error) {
      return next(error);
    }
  });

  app.get("/me", requireAuth, (req, res) => {
    res.json({ user: req.auth });
  });

  app.get("/catalog", async (req, res, next) => {
    try {
      const page = Math.max(1, parsePositiveInteger(req.query.page, 1));
      const limit = Math.min(100, Math.max(1, parsePositiveInteger(req.query.limit, 20)));
      const offset = (page - 1) * limit;

      const itemsPromise = pool.query(
        `SELECT p.id,
                p.name,
                p.description,
                p.image_url AS "imageUrl",
                p.normal_price AS "normalPrice",
                p.stock,
                host.id AS "hostId",
                host.name AS "hostName",
                fs.id AS "flashSaleId",
                fs.sale_price AS "salePrice",
                fs.sale_stock AS "saleStock",
                fs.quota_per_user AS "quotaPerUser",
                fs.start_time AS "startTime",
                fs.end_time AS "endTime",
                fs.status AS "flashSaleStatus",
                s.id AS "streamId",
                s.title AS "streamTitle",
                s.status AS "streamStatus"
         FROM products p
         JOIN users host ON host.id = p.host_id
         LEFT JOIN (
           SELECT product_id, MAX(id) AS latest_flash_sale_id
           FROM flash_sales
           GROUP BY product_id
         ) latest_fs ON latest_fs.product_id = p.id
         LEFT JOIN flash_sales fs ON fs.id = latest_fs.latest_flash_sale_id
         LEFT JOIN streams s ON s.id = fs.stream_id
         ORDER BY p.id
         LIMIT $1 OFFSET $2`,
        [limit, offset],
      );
      const totalPromise = pool.query(`SELECT COUNT(*)::int AS n FROM products`);

      const [itemsResult, totalResult] = await Promise.all([itemsPromise, totalPromise]);
      return res.json({
        data: itemsResult.rows,
        page,
        limit,
        total: totalResult.rows[0]?.n ?? 0,
      });
    } catch (error) {
      return next(error);
    }
  });

  app.get("/products", async (req, res, next) => {
    try {
      const page = Math.max(1, parsePositiveInteger(req.query.page, 1));
      const limit = Math.min(100, Math.max(1, parsePositiveInteger(req.query.limit, 20)));
      const offset = (page - 1) * limit;

      const [rows, total] = await Promise.all([
        pool.query(
          `SELECT p.id,
                  p.host_id AS "hostId",
                  u.name AS "hostName",
                  p.name,
                  p.description,
                  p.image_url AS "imageUrl",
                  p.normal_price AS "normalPrice",
                  p.stock,
                  p.created_at AS "createdAt"
           FROM products p
           JOIN users u ON u.id = p.host_id
           ORDER BY p.id
           LIMIT $1 OFFSET $2`,
          [limit, offset],
        ),
        pool.query(`SELECT COUNT(*)::int AS n FROM products`),
      ]);

      return res.json({
        data: rows.rows.map(mapProductRow),
        page,
        limit,
        total: total.rows[0]?.n ?? 0,
      });
    } catch (error) {
      return next(error);
    }
  });

  app.get("/products/:productId", async (req, res, next) => {
    try {
      const productId = positiveIntegerOrNull(req.params.productId);
      if (!productId) {
        return res.status(400).json(galat("INPUT_TIDAK_VALID", "productId tidak valid"));
      }

      const result = await pool.query(
        `SELECT p.id,
                p.host_id AS "hostId",
                u.name AS "hostName",
                p.name,
                p.description,
                p.image_url AS "imageUrl",
                p.normal_price AS "normalPrice",
                p.stock,
                p.created_at AS "createdAt"
         FROM products p
         JOIN users u ON u.id = p.host_id
         WHERE p.id = $1`,
        [productId],
      );

      if (result.rowCount === 0) {
        return res.status(404).json(galat("PRODUCT_TIDAK_ADA", "Produk tidak ditemukan"));
      }

      return res.json(mapProductRow(result.rows[0]));
    } catch (error) {
      return next(error);
    }
  });

  app.post("/products", requireRole("host", "admin"), async (req, res, next) => {
    try {
      const name = textOrNull(req.body?.name);
      const description = textOrNull(req.body?.description);
      const imageUrl = textOrNull(req.body?.imageUrl);
      const normalPrice = nonNegativeIntegerOrNull(req.body?.normalPrice);
      const stock = nonNegativeIntegerOrNull(req.body?.stock);

      if (!name || !description || normalPrice === null || stock === null) {
        return res.status(400).json(
          galat("INPUT_TIDAK_VALID", "name, description, normalPrice, dan stock wajib valid"),
        );
      }

      const hostId = req.auth.role === "admin"
        ? positiveIntegerOrNull(req.body?.hostId) ?? req.auth.id
        : req.auth.id;

      const created = await pool.query(
        `INSERT INTO products (host_id, name, description, image_url, normal_price, stock)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id,
                   host_id AS "hostId",
                   name,
                   description,
                   image_url AS "imageUrl",
                   normal_price AS "normalPrice",
                   stock,
                   created_at AS "createdAt"`,
        [hostId, name, description, imageUrl, normalPrice, stock],
      );

      return res.status(201).json(mapProductRow(created.rows[0]));
    } catch (error) {
      return next(error);
    }
  });

  app.patch("/products/:productId", requireRole("host", "admin"), async (req, res, next) => {
    try {
      const productId = positiveIntegerOrNull(req.params.productId);
      if (!productId) {
        return res.status(400).json(galat("INPUT_TIDAK_VALID", "productId tidak valid"));
      }

      const current = await fetchProductById(pool, productId);
      if (!current) {
        return res.status(404).json(galat("PRODUCT_TIDAK_ADA", "Produk tidak ditemukan"));
      }

      if (!canManageOwnerResource(req.auth, current.host_id)) {
        return res.status(403).json(galat("FORBIDDEN", "Produk ini bukan milik Anda"));
      }

      const name = textOrNull(req.body?.name) ?? current.name;
      const description = textOrNull(req.body?.description) ?? current.description;
      const imageUrl = Object.hasOwn(req.body ?? {}, "imageUrl")
        ? textOrNull(req.body?.imageUrl)
        : current.image_url;
      const normalPrice = Object.hasOwn(req.body ?? {}, "normalPrice")
        ? nonNegativeIntegerOrNull(req.body?.normalPrice)
        : current.normal_price;
      const stock = Object.hasOwn(req.body ?? {}, "stock")
        ? nonNegativeIntegerOrNull(req.body?.stock)
        : current.stock;

      if (!name || !description || normalPrice === null || stock === null) {
        return res.status(400).json(galat("INPUT_TIDAK_VALID", "Data produk tidak valid"));
      }

      const updated = await pool.query(
        `UPDATE products
         SET name = $2,
             description = $3,
             image_url = $4,
             normal_price = $5,
             stock = $6
         WHERE id = $1
         RETURNING id,
                   host_id AS "hostId",
                   name,
                   description,
                   image_url AS "imageUrl",
                   normal_price AS "normalPrice",
                   stock,
                   created_at AS "createdAt"`,
        [productId, name, description, imageUrl, normalPrice, stock],
      );

      return res.json(mapProductRow(updated.rows[0]));
    } catch (error) {
      return next(error);
    }
  });

  app.get("/streams", async (req, res, next) => {
    try {
      const page = Math.max(1, parsePositiveInteger(req.query.page, 1));
      const limit = Math.min(100, Math.max(1, parsePositiveInteger(req.query.limit, 20)));
      const offset = (page - 1) * limit;

      const [rows, total] = await Promise.all([
        pool.query(
          `SELECT s.id,
                  s.host_id AS "hostId",
                  u.name AS "hostName",
                  s.title,
                  s.status,
                  s.started_at AS "startedAt",
                  s.ended_at AS "endedAt",
                  s.viewer_peak AS "viewerPeak"
           FROM streams s
           JOIN users u ON u.id = s.host_id
           ORDER BY s.id
           LIMIT $1 OFFSET $2`,
          [limit, offset],
        ),
        pool.query(`SELECT COUNT(*)::int AS n FROM streams`),
      ]);

      return res.json({
        data: rows.rows.map(mapStreamRow),
        page,
        limit,
        total: total.rows[0]?.n ?? 0,
      });
    } catch (error) {
      return next(error);
    }
  });

  app.get("/streams/:streamId", async (req, res, next) => {
    try {
      const streamId = positiveIntegerOrNull(req.params.streamId);
      if (!streamId) {
        return res.status(400).json(galat("INPUT_TIDAK_VALID", "streamId tidak valid"));
      }

      const result = await pool.query(
        `SELECT s.id,
                s.host_id AS "hostId",
                u.name AS "hostName",
                s.title,
                s.status,
                s.started_at AS "startedAt",
                s.ended_at AS "endedAt",
                s.viewer_peak AS "viewerPeak"
         FROM streams s
         JOIN users u ON u.id = s.host_id
         WHERE s.id = $1`,
        [streamId],
      );

      if (result.rowCount === 0) {
        return res.status(404).json(galat("STREAM_TIDAK_ADA", "Stream tidak ditemukan"));
      }

      return res.json(mapStreamRow(result.rows[0]));
    } catch (error) {
      return next(error);
    }
  });

  app.post("/streams", requireRole("host", "admin"), async (req, res, next) => {
    try {
      const title = textOrNull(req.body?.title);
      const status = textOrNull(req.body?.status) ?? "scheduled";
      const startedAt = Object.hasOwn(req.body ?? {}, "startedAt") ? timestampOrNull(req.body?.startedAt) : null;
      const endedAt = Object.hasOwn(req.body ?? {}, "endedAt") ? timestampOrNull(req.body?.endedAt) : null;
      const viewerPeak = Object.hasOwn(req.body ?? {}, "viewerPeak")
        ? nonNegativeIntegerOrNull(req.body?.viewerPeak)
        : 0;

      if (!title || !STREAM_STATUSES.has(status) || viewerPeak === null) {
        return res.status(400).json(galat("INPUT_TIDAK_VALID", "Data stream tidak valid"));
      }

      if (startedAt && endedAt && !validateStartAndEndTime(startedAt, endedAt)) {
        return res.status(400).json(galat("INPUT_TIDAK_VALID", "endedAt harus setelah startedAt"));
      }

      const hostId = req.auth.role === "admin"
        ? positiveIntegerOrNull(req.body?.hostId) ?? req.auth.id
        : req.auth.id;

      const created = await pool.query(
        `INSERT INTO streams (host_id, title, status, started_at, ended_at, viewer_peak)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id,
                   host_id AS "hostId",
                   title,
                   status,
                   started_at AS "startedAt",
                   ended_at AS "endedAt",
                   viewer_peak AS "viewerPeak"`,
        [hostId, title, status, startedAt, endedAt, viewerPeak],
      );

      return res.status(201).json(mapStreamRow(created.rows[0]));
    } catch (error) {
      return next(error);
    }
  });

  app.patch("/streams/:streamId", requireRole("host", "admin"), async (req, res, next) => {
    try {
      const streamId = positiveIntegerOrNull(req.params.streamId);
      if (!streamId) {
        return res.status(400).json(galat("INPUT_TIDAK_VALID", "streamId tidak valid"));
      }

      const current = await fetchStreamById(pool, streamId);
      if (!current) {
        return res.status(404).json(galat("STREAM_TIDAK_ADA", "Stream tidak ditemukan"));
      }

      if (!canManageOwnerResource(req.auth, current.host_id)) {
        return res.status(403).json(galat("FORBIDDEN", "Stream ini bukan milik Anda"));
      }

      const title = textOrNull(req.body?.title) ?? current.title;
      const status = textOrNull(req.body?.status) ?? current.status;
      const startedAt = Object.hasOwn(req.body ?? {}, "startedAt")
        ? timestampOrNull(req.body?.startedAt)
        : current.started_at;
      const endedAt = Object.hasOwn(req.body ?? {}, "endedAt")
        ? timestampOrNull(req.body?.endedAt)
        : current.ended_at;
      const viewerPeak = Object.hasOwn(req.body ?? {}, "viewerPeak")
        ? nonNegativeIntegerOrNull(req.body?.viewerPeak)
        : current.viewer_peak;

      if (!title || !STREAM_STATUSES.has(status) || viewerPeak === null) {
        return res.status(400).json(galat("INPUT_TIDAK_VALID", "Data stream tidak valid"));
      }

      if (startedAt && endedAt && !validateStartAndEndTime(startedAt, endedAt)) {
        return res.status(400).json(galat("INPUT_TIDAK_VALID", "endedAt harus setelah startedAt"));
      }

      const updated = await pool.query(
        `UPDATE streams
         SET title = $2,
             status = $3,
             started_at = $4,
             ended_at = $5,
             viewer_peak = $6
         WHERE id = $1
         RETURNING id,
                   host_id AS "hostId",
                   title,
                   status,
                   started_at AS "startedAt",
                   ended_at AS "endedAt",
                   viewer_peak AS "viewerPeak"`,
        [streamId, title, status, startedAt, endedAt, viewerPeak],
      );

      return res.json(mapStreamRow(updated.rows[0]));
    } catch (error) {
      return next(error);
    }
  });

  app.get("/flash-sales", async (req, res, next) => {
    try {
      const page = Math.max(1, parsePositiveInteger(req.query.page, 1));
      const limit = Math.min(100, Math.max(1, parsePositiveInteger(req.query.limit, 20)));
      const offset = (page - 1) * limit;

      const [rows, total] = await Promise.all([
        pool.query(
          `SELECT fs.id,
                  fs.product_id AS "productId",
                  p.name AS "productName",
                  fs.stream_id AS "streamId",
                  s.title AS "streamTitle",
                  fs.sale_price AS "salePrice",
                  fs.sale_stock AS "saleStock",
                  fs.quota_per_user AS "quotaPerUser",
                  fs.start_time AS "startTime",
                  fs.end_time AS "endTime",
                  fs.status
           FROM flash_sales fs
           JOIN products p ON p.id = fs.product_id
           JOIN streams s ON s.id = fs.stream_id
           ORDER BY fs.id
           LIMIT $1 OFFSET $2`,
          [limit, offset],
        ),
        pool.query(`SELECT COUNT(*)::int AS n FROM flash_sales`),
      ]);

      return res.json({
        data: rows.rows.map(mapFlashSaleRow),
        page,
        limit,
        total: total.rows[0]?.n ?? 0,
      });
    } catch (error) {
      return next(error);
    }
  });

  app.get("/flash-sales/:flashSaleId", async (req, res, next) => {
    try {
      const flashSaleId = positiveIntegerOrNull(req.params.flashSaleId);
      if (!flashSaleId) {
        return res.status(400).json(galat("INPUT_TIDAK_VALID", "flashSaleId tidak valid"));
      }

      const result = await pool.query(
        `SELECT fs.id,
                fs.product_id AS "productId",
                p.name AS "productName",
                fs.stream_id AS "streamId",
                s.title AS "streamTitle",
                fs.sale_price AS "salePrice",
                fs.sale_stock AS "saleStock",
                fs.quota_per_user AS "quotaPerUser",
                fs.start_time AS "startTime",
                fs.end_time AS "endTime",
                fs.status
         FROM flash_sales fs
         JOIN products p ON p.id = fs.product_id
         JOIN streams s ON s.id = fs.stream_id
         WHERE fs.id = $1`,
        [flashSaleId],
      );

      if (result.rowCount === 0) {
        return res.status(404).json(galat("FLASH_SALE_TIDAK_ADA", "Flash sale tidak ditemukan"));
      }

      return res.json(mapFlashSaleRow(result.rows[0]));
    } catch (error) {
      return next(error);
    }
  });

  app.post("/flash-sales", requireRole("host", "admin"), async (req, res, next) => {
    try {
      const productId = positiveIntegerOrNull(req.body?.productId);
      const streamId = positiveIntegerOrNull(req.body?.streamId);
      const salePrice = nonNegativeIntegerOrNull(req.body?.salePrice);
      const saleStock = positiveIntegerOrNull(req.body?.saleStock);
      const quotaPerUser = positiveIntegerOrNull(req.body?.quotaPerUser);
      const startTime = timestampOrNull(req.body?.startTime);
      const endTime = timestampOrNull(req.body?.endTime);
      const status = textOrNull(req.body?.status) ?? "scheduled";

      if (!productId || !streamId || salePrice === null || !saleStock || !quotaPerUser || !startTime || !endTime) {
        return res.status(400).json(galat("INPUT_TIDAK_VALID", "Data flash sale wajib lengkap dan valid"));
      }

      if (!FLASH_SALE_STATUSES.has(status)) {
        return res.status(400).json(galat("STATUS_TIDAK_VALID", "Status flash sale tidak valid"));
      }

      if (!validateStartAndEndTime(startTime, endTime)) {
        return res.status(400).json(galat("INPUT_TIDAK_VALID", "endTime harus setelah startTime"));
      }

      const product = await fetchProductById(pool, productId);
      const stream = await fetchStreamById(pool, streamId);
      if (!product || !stream) {
        return res.status(404).json(galat("RELASI_TIDAK_ADA", "Produk atau stream tidak ditemukan"));
      }

      if (!canManageOwnerResource(req.auth, product.host_id) || !canManageOwnerResource(req.auth, stream.host_id)) {
        return res.status(403).json(galat("FORBIDDEN", "Produk atau stream ini bukan milik Anda"));
      }

      if (product.normal_price < salePrice) {
        return res.status(400).json(galat("INPUT_TIDAK_VALID", "salePrice tidak boleh melebihi normalPrice"));
      }

      if (product.stock < saleStock) {
        return res.status(400).json(galat("INPUT_TIDAK_VALID", "saleStock tidak boleh melebihi stok produk"));
      }

      const created = await pool.query(
        `INSERT INTO flash_sales (product_id, stream_id, sale_price, sale_stock, quota_per_user, start_time, end_time, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id,
                   product_id AS "productId",
                   stream_id AS "streamId",
                   sale_price AS "salePrice",
                   sale_stock AS "saleStock",
                   quota_per_user AS "quotaPerUser",
                   start_time AS "startTime",
                   end_time AS "endTime",
                   status`,
        [productId, streamId, salePrice, saleStock, quotaPerUser, startTime, endTime, status],
      );

      return res.status(201).json(mapFlashSaleRow({
        ...created.rows[0],
        productName: product.name,
        streamTitle: stream.title,
      }));
    } catch (error) {
      return next(error);
    }
  });

  app.patch("/flash-sales/:flashSaleId", requireRole("host", "admin"), async (req, res, next) => {
    try {
      const flashSaleId = positiveIntegerOrNull(req.params.flashSaleId);
      if (!flashSaleId) {
        return res.status(400).json(galat("INPUT_TIDAK_VALID", "flashSaleId tidak valid"));
      }

      const current = await fetchFlashSaleById(pool, flashSaleId);
      if (!current) {
        return res.status(404).json(galat("FLASH_SALE_TIDAK_ADA", "Flash sale tidak ditemukan"));
      }

      if (!canManageOwnerResource(req.auth, current.host_id)) {
        return res.status(403).json(galat("FORBIDDEN", "Flash sale ini bukan milik Anda"));
      }

      const salePrice = Object.hasOwn(req.body ?? {}, "salePrice")
        ? nonNegativeIntegerOrNull(req.body?.salePrice)
        : current.sale_price;
      const saleStock = Object.hasOwn(req.body ?? {}, "saleStock")
        ? nonNegativeIntegerOrNull(req.body?.saleStock)
        : current.sale_stock;
      const quotaPerUser = Object.hasOwn(req.body ?? {}, "quotaPerUser")
        ? positiveIntegerOrNull(req.body?.quotaPerUser)
        : current.quota_per_user;
      const startTime = Object.hasOwn(req.body ?? {}, "startTime")
        ? timestampOrNull(req.body?.startTime)
        : current.start_time;
      const endTime = Object.hasOwn(req.body ?? {}, "endTime")
        ? timestampOrNull(req.body?.endTime)
        : current.end_time;
      const status = textOrNull(req.body?.status) ?? current.status;

      if (salePrice === null || saleStock === null || !quotaPerUser || !startTime || !endTime || !FLASH_SALE_STATUSES.has(status)) {
        return res.status(400).json(galat("INPUT_TIDAK_VALID", "Data flash sale tidak valid"));
      }

      if (!validateStartAndEndTime(startTime, endTime)) {
        return res.status(400).json(galat("INPUT_TIDAK_VALID", "endTime harus setelah startTime"));
      }

      if (current.normal_price < salePrice) {
        return res.status(400).json(galat("INPUT_TIDAK_VALID", "salePrice tidak boleh melebihi normalPrice"));
      }

      if (current.stock < saleStock) {
        return res.status(400).json(galat("INPUT_TIDAK_VALID", "saleStock tidak boleh melebihi stok produk"));
      }

      const updated = await pool.query(
        `UPDATE flash_sales
         SET sale_price = $2,
             sale_stock = $3,
             quota_per_user = $4,
             start_time = $5,
             end_time = $6,
             status = $7
         WHERE id = $1
         RETURNING id,
                   product_id AS "productId",
                   stream_id AS "streamId",
                   sale_price AS "salePrice",
                   sale_stock AS "saleStock",
                   quota_per_user AS "quotaPerUser",
                   start_time AS "startTime",
                   end_time AS "endTime",
                   status`,
        [flashSaleId, salePrice, saleStock, quotaPerUser, startTime, endTime, status],
      );

      const product = await fetchProductById(pool, current.product_id);
      const stream = await fetchStreamById(pool, current.stream_id);
      return res.json(mapFlashSaleRow({
        ...updated.rows[0],
        productName: product?.name,
        streamTitle: stream?.title,
      }));
    } catch (error) {
      return next(error);
    }
  });

  app.get("/orders", requireAuth, async (req, res, next) => {
    try {
      const page = Math.max(1, parsePositiveInteger(req.query.page, 1));
      const limit = Math.min(100, Math.max(1, parsePositiveInteger(req.query.limit, 20)));
      const offset = (page - 1) * limit;

      let listQuery = "";
      let countQuery = "";
      let params = [];
      let countParams = [];

      if (req.auth.role === "buyer") {
        listQuery = `SELECT o.id,
                            o.buyer_id AS "buyerId",
                            buyer.name AS "buyerName",
                            o.flash_sale_id AS "flashSaleId",
                            p.id AS "productId",
                            p.name AS "productName",
                            o.quantity,
                            o.total_price AS "totalPrice",
                            o.status,
                            o.created_at AS "createdAt"
                     FROM orders o
                     JOIN users buyer ON buyer.id = o.buyer_id
                     JOIN flash_sales fs ON fs.id = o.flash_sale_id
                     JOIN products p ON p.id = fs.product_id
                     WHERE o.buyer_id = $1
                     ORDER BY o.id DESC
                     LIMIT $2 OFFSET $3`;
        countQuery = `SELECT COUNT(*)::int AS n FROM orders WHERE buyer_id = $1`;
        params = [req.auth.id, limit, offset];
        countParams = [req.auth.id];
      } else if (req.auth.role === "host") {
        listQuery = `SELECT o.id,
                            o.buyer_id AS "buyerId",
                            buyer.name AS "buyerName",
                            o.flash_sale_id AS "flashSaleId",
                            p.id AS "productId",
                            p.name AS "productName",
                            o.quantity,
                            o.total_price AS "totalPrice",
                            o.status,
                            o.created_at AS "createdAt"
                     FROM orders o
                     JOIN users buyer ON buyer.id = o.buyer_id
                     JOIN flash_sales fs ON fs.id = o.flash_sale_id
                     JOIN products p ON p.id = fs.product_id
                     WHERE p.host_id = $1
                     ORDER BY o.id DESC
                     LIMIT $2 OFFSET $3`;
        countQuery = `SELECT COUNT(*)::int AS n
                      FROM orders o
                      JOIN flash_sales fs ON fs.id = o.flash_sale_id
                      JOIN products p ON p.id = fs.product_id
                      WHERE p.host_id = $1`;
        params = [req.auth.id, limit, offset];
        countParams = [req.auth.id];
      } else {
        listQuery = `SELECT o.id,
                            o.buyer_id AS "buyerId",
                            buyer.name AS "buyerName",
                            o.flash_sale_id AS "flashSaleId",
                            p.id AS "productId",
                            p.name AS "productName",
                            o.quantity,
                            o.total_price AS "totalPrice",
                            o.status,
                            o.created_at AS "createdAt"
                     FROM orders o
                     JOIN users buyer ON buyer.id = o.buyer_id
                     JOIN flash_sales fs ON fs.id = o.flash_sale_id
                     JOIN products p ON p.id = fs.product_id
                     ORDER BY o.id DESC
                     LIMIT $1 OFFSET $2`;
        countQuery = `SELECT COUNT(*)::int AS n FROM orders`;
        params = [limit, offset];
      }

      const [rows, total] = await Promise.all([
        pool.query(listQuery, params),
        pool.query(countQuery, countParams),
      ]);

      return res.json({
        data: rows.rows.map(mapOrderRow),
        page,
        limit,
        total: total.rows[0]?.n ?? 0,
      });
    } catch (error) {
      return next(error);
    }
  });

  app.post("/orders", requireRole("buyer", "admin"), async (req, res, next) => {
    const flashSaleId = positiveIntegerOrNull(req.body?.flashSaleId);
    const qty = positiveIntegerOrNull(req.body?.qty);

    if (!flashSaleId || !qty) {
      return res.status(400).json(
        galat("INPUT_TIDAK_VALID", "flashSaleId dan qty wajib bilangan bulat positif"),
      );
    }

    const idempotencyKey = req.header("Idempotency-Key")?.trim() || null;
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      if (idempotencyKey) {
        const { inserted, record } = await lockIdempotencyKey(client, idempotencyKey);

        if (!inserted && record.state === "done") {
          await client.query("COMMIT");
          return res.status(record.status_code ?? 200).json(record.response);
        }

        if (!inserted && record.state === "pending") {
          await client.query("COMMIT");
          return res.status(409).json(
            galat("REQUEST_SEDANG_DIPROSES", "Permintaan serupa sedang diproses"),
          );
        }
      }

      const flashSaleResult = await client.query(
        `SELECT id, product_id, stream_id, sale_price, sale_stock, quota_per_user, status
         FROM flash_sales
         WHERE id = $1
         FOR UPDATE`,
        [flashSaleId],
      );

      if (flashSaleResult.rowCount === 0) {
        const errorResult = {
          statusCode: 404,
          body: galat("FLASH_SALE_TIDAK_ADA", "Flash sale tidak ditemukan"),
        };
        await storeIdempotencyResult(client, idempotencyKey, errorResult.statusCode, errorResult.body);
        await client.query("COMMIT");
        return res.status(errorResult.statusCode).json(errorResult.body);
      }

      const flashSale = flashSaleResult.rows[0];
      const productResult = await client.query(
        `SELECT id, name, stock
         FROM products
         WHERE id = $1
         FOR UPDATE`,
        [flashSale.product_id],
      );
      const product = productResult.rows[0];

      const quotaResult = await client.query(
        `SELECT COALESCE(SUM(quantity), 0)::int AS purchased
         FROM orders
         WHERE buyer_id = $1 AND flash_sale_id = $2 AND status <> 'cancelled'`,
        [req.auth.id, flashSaleId],
      );

      const purchased = quotaResult.rows[0]?.purchased ?? 0;
      if (
        flashSale.status !== "active" ||
        flashSale.sale_stock < qty ||
        product.stock < qty ||
        purchased + qty > flashSale.quota_per_user
      ) {
        const orderError = await buildOrderError(client, flashSaleId, qty, req.auth.id);
        await storeIdempotencyResult(client, idempotencyKey, orderError.statusCode, orderError.body);
        await client.query("COMMIT");
        return res.status(orderError.statusCode).json(orderError.body);
      }

      await client.query(`UPDATE products SET stock = stock - $1::int WHERE id = $2::int`, [qty, product.id]);
      await client.query(`UPDATE flash_sales SET sale_stock = sale_stock - $1::int WHERE id = $2::int`, [qty, flashSale.id]);

      const totalPrice = flashSale.sale_price * qty;
      const orderResult = await client.query(
        `INSERT INTO orders (buyer_id, flash_sale_id, quantity, total_price, status)
         VALUES ($1, $2, $3, $4, 'paid')
         RETURNING id, status, created_at`,
        [req.auth.id, flashSaleId, qty, totalPrice],
      );

      const responseBody = {
        orderId: orderResult.rows[0].id,
        flashSaleId,
        streamId: flashSale.stream_id,
        productId: product.id,
        product: product.name,
        qty,
        totalPrice,
        remainingFlashSaleStock: flashSale.sale_stock - qty,
        remainingProductStock: product.stock - qty,
        status: orderResult.rows[0].status,
        createdAt: orderResult.rows[0].created_at,
      };

      await storeIdempotencyResult(client, idempotencyKey, 201, responseBody);
      await client.query("COMMIT");
      void emitRealtimeEvent("/events/stock", {
        streamId: flashSale.stream_id,
        flashSaleId,
        productId: product.id,
        saleStock: flashSale.sale_stock - qty,
        productStock: product.stock - qty,
      });
      return res.status(201).json(responseBody);
    } catch (error) {
      await client.query("ROLLBACK");
      return next(error);
    } finally {
      client.release();
    }
  });

  app.get("/streams/:streamId/chat", async (req, res, next) => {
    try {
      const streamId = positiveIntegerOrNull(req.params.streamId);
      if (!streamId) {
        return res.status(400).json(galat("INPUT_TIDAK_VALID", "streamId tidak valid"));
      }

      const page = Math.max(1, parsePositiveInteger(req.query.page, 1));
      const limit = Math.min(100, Math.max(1, parsePositiveInteger(req.query.limit, 20)));
      const offset = (page - 1) * limit;

      const [rows, total] = await Promise.all([
        pool.query(
          `SELECT cm.id,
                  cm.stream_id AS "streamId",
                  cm.user_id AS "userId",
                  u.name AS "userName",
                  cm.content,
                  cm.created_at AS "createdAt"
           FROM chat_messages cm
           JOIN users u ON u.id = cm.user_id
           WHERE cm.stream_id = $1
           ORDER BY cm.id DESC
           LIMIT $2 OFFSET $3`,
          [streamId, limit, offset],
        ),
        pool.query(`SELECT COUNT(*)::int AS n FROM chat_messages WHERE stream_id = $1`, [streamId]),
      ]);

      return res.json({
        data: rows.rows,
        page,
        limit,
        total: total.rows[0]?.n ?? 0,
      });
    } catch (error) {
      return next(error);
    }
  });

  app.post("/streams/:streamId/chat", requireAuth, async (req, res, next) => {
    try {
      const streamId = positiveIntegerOrNull(req.params.streamId);
      const content = textOrNull(req.body?.content);

      if (!streamId || !content) {
        return res.status(400).json(galat("INPUT_TIDAK_VALID", "streamId dan content wajib valid"));
      }

      const stream = await fetchStreamById(pool, streamId);
      if (!stream) {
        return res.status(404).json(galat("STREAM_TIDAK_ADA", "Stream tidak ditemukan"));
      }

      const inserted = await pool.query(
        `INSERT INTO chat_messages (stream_id, user_id, content)
         VALUES ($1, $2, $3)
         RETURNING id,
                   stream_id AS "streamId",
                   user_id AS "userId",
                   content,
                   created_at AS "createdAt"`,
        [streamId, req.auth.id, content],
      );

      const responseBody = {
        ...inserted.rows[0],
        userName: req.auth.name,
      };
      void emitRealtimeEvent("/events/chat", {
        streamId,
        userId: req.auth.id,
        userName: req.auth.name,
        content,
      });
      return res.status(201).json(responseBody);
    } catch (error) {
      return next(error);
    }
  });

  app.use((error, _req, res, _next) => {
    console.error(error);
    res.status(500).json(galat("GAGAL", "Terjadi kesalahan pada server"));
  });

  return app;
}