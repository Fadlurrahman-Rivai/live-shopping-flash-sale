import express from "express";

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

async function buildStockError(client, itemId) {
  const item = await client.query("SELECT 1 FROM items WHERE id = $1", [itemId]);

  if (item.rowCount === 0) {
    return {
      statusCode: 404,
      body: galat("ITEM_TIDAK_ADA", "Item tidak ditemukan"),
    };
  }

  return {
    statusCode: 409,
    body: galat("STOK_HABIS", "Stok tidak mencukupi untuk pesanan ini"),
  };
}

export function createApp({ pool }) {
  const app = express();

  app.use(express.json());

  app.get("/health", async (_req, res, next) => {
    try {
      await pool.query("SELECT 1");
      res.json({ status: "ok" });
    } catch (error) {
      next(error);
    }
  });

  app.get("/catalog", async (req, res, next) => {
    try {
      const page = Math.max(1, parsePositiveInteger(req.query.page, 1));
      const limit = Math.min(100, Math.max(1, parsePositiveInteger(req.query.limit, 20)));
      const offset = (page - 1) * limit;

      const itemsPromise = pool.query(
        `SELECT id, nama, harga, sisa
         FROM items
         ORDER BY id
         LIMIT $1 OFFSET $2`,
        [limit, offset],
      );
      const totalPromise = pool.query("SELECT COUNT(*)::int AS n FROM items");

      const [itemsResult, totalResult] = await Promise.all([itemsPromise, totalPromise]);

      res.json({
        data: itemsResult.rows,
        page,
        limit,
        total: totalResult.rows[0]?.n ?? 0,
      });
    } catch (error) {
      next(error);
    }
  });

  app.post("/orders", async (req, res, next) => {
    const itemId = Number(req.body?.itemId);
    const qty = Number(req.body?.qty);

    if (!Number.isInteger(itemId) || !Number.isInteger(qty) || qty < 1) {
      return res.status(400).json(
        galat("INPUT_TIDAK_VALID", "itemId dan qty wajib bilangan bulat, qty minimal 1"),
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

        if (!inserted && record.state !== "pending") {
          await client.query("ROLLBACK");
          return res.status(409).json(
            galat("REQUEST_SEDANG_DIPROSES", "Permintaan serupa sedang diproses"),
          );
        }
      }

      const updatedItem = await client.query(
        `UPDATE items
         SET sisa = sisa - $1::int
         WHERE id = $2::int AND sisa >= $1::int
         RETURNING id, nama, harga, sisa`,
        [qty, itemId],
      );

      if (updatedItem.rowCount === 0) {
        const stockError = await buildStockError(client, itemId);
        await storeIdempotencyResult(client, idempotencyKey, stockError.statusCode, stockError.body);
        await client.query("COMMIT");
        return res.status(stockError.statusCode).json(stockError.body);
      }

      const item = updatedItem.rows[0];
      const total = item.harga * qty;
      const orderResult = await client.query(
        `INSERT INTO orders (item_id, qty, total)
         VALUES ($1, $2, $3)
         RETURNING id, created_at`,
        [item.id, qty, total],
      );

      const responseBody = {
        orderId: orderResult.rows[0].id,
        itemId: item.id,
        item: item.nama,
        qty,
        total,
        sisa: item.sisa,
        createdAt: orderResult.rows[0].created_at,
      };

      await storeIdempotencyResult(client, idempotencyKey, 201, responseBody);
      await client.query("COMMIT");
      return res.status(201).json(responseBody);
    } catch (error) {
      await client.query("ROLLBACK");
      return next(error);
    } finally {
      client.release();
    }
  });

  app.use((error, _req, res, _next) => {
    console.error(error);
    res.status(500).json(galat("GAGAL", "Terjadi kesalahan pada server"));
  });

  return app;
}