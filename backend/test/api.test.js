import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { newDb } from "pg-mem";
import request from "supertest";

import { createApp } from "../src/app.js";

const HOST_TOKEN = "host-demo-token";
const BUYER_TOKEN = "buyer-demo-token";

function createTestContext() {
  const db = newDb();
  const schema = readFileSync(new URL("../sql/init.sql", import.meta.url), "utf8");
  db.public.none(schema);

  const { Pool } = db.adapters.createPg();
  const pool = new Pool();
  const app = createApp({ pool });

  return { pool, app };
}

test("GET /catalog returns paginated catalog data", async (t) => {
  const { pool, app } = createTestContext();
  t.after(async () => {
    await pool.end();
  });

  const response = await request(app).get("/catalog?page=1&limit=2");

  assert.equal(response.status, 200);
  assert.equal(response.body.page, 1);
  assert.equal(response.body.limit, 2);
  assert.equal(response.body.total, 3);
  assert.equal(response.body.data.length, 2);
  assert.equal(response.body.data[0].name, "Ring Light Studio");
  assert.equal(response.body.data[0].flashSaleStatus, "active");
  assert.equal(response.body.data[0].streamTitle, "Live Studio Setup Mingguan");
});

test("POST /auth/login returns session token for seeded host", async (t) => {
  const { pool, app } = createTestContext();
  t.after(async () => {
    await pool.end();
  });

  const response = await request(app).post("/auth/login").send({
    email: "host@cozylab.local",
    password: "host123",
  });

  assert.equal(response.status, 200);
  assert.equal(response.body.user.role, "host");
  assert.equal(typeof response.body.token, "string");
  assert.ok(response.body.token.length > 10);
});

test("Host can create product, stream, and flash sale", async (t) => {
  const { pool, app } = createTestContext();
  t.after(async () => {
    await pool.end();
  });

  const product = await request(app)
    .post("/products")
    .set("Authorization", `Bearer ${HOST_TOKEN}`)
    .send({
      name: "Backdrop Studio Lipat",
      description: "Backdrop portabel untuk live shopping.",
      imageUrl: "/images/backdrop.png",
      normalPrice: 199000,
      stock: 10,
    });

  assert.equal(product.status, 201);
  assert.equal(product.body.name, "Backdrop Studio Lipat");

  const stream = await request(app)
    .post("/streams")
    .set("Authorization", `Bearer ${HOST_TOKEN}`)
    .send({
      title: "Studio Tour Malam Ini",
      status: "scheduled",
      startedAt: "2026-09-01T10:00:00Z",
      endedAt: "2026-09-01T11:00:00Z",
    });

  assert.equal(stream.status, 201);
  assert.equal(stream.body.title, "Studio Tour Malam Ini");

  const flashSale = await request(app)
    .post("/flash-sales")
    .set("Authorization", `Bearer ${HOST_TOKEN}`)
    .send({
      productId: product.body.id,
      streamId: stream.body.id,
      salePrice: 149000,
      saleStock: 4,
      quotaPerUser: 2,
      startTime: "2026-09-01T10:00:00Z",
      endTime: "2026-09-01T10:30:00Z",
      status: "scheduled",
    });

  assert.equal(flashSale.status, 201);
  assert.equal(flashSale.body.productId, product.body.id);
  assert.equal(flashSale.body.streamId, stream.body.id);
});

test("POST /orders stops when stock is exhausted", async (t) => {
  const { pool, app } = createTestContext();
  t.after(async () => {
    await pool.end();
  });

  await pool.query("UPDATE products SET stock = 2 WHERE id = 1");
  await pool.query("UPDATE flash_sales SET sale_stock = 2, sale_price = 100000, quota_per_user = 5, status = 'active' WHERE id = 1");
  await pool.query("DELETE FROM orders");
  await pool.query("DELETE FROM idempotency_keys");

  const first = await request(app)
    .post("/orders")
    .set("Authorization", `Bearer ${BUYER_TOKEN}`)
    .send({ flashSaleId: 1, qty: 1 });
  const second = await request(app)
    .post("/orders")
    .set("Authorization", `Bearer ${BUYER_TOKEN}`)
    .send({ flashSaleId: 1, qty: 1 });
  const third = await request(app)
    .post("/orders")
    .set("Authorization", `Bearer ${BUYER_TOKEN}`)
    .send({ flashSaleId: 1, qty: 1 });

  assert.equal(first.status, 201);
  assert.equal(second.status, 201);
  assert.equal(third.status, 409);
  assert.equal(third.body.error.code, "STOK_HABIS");

  const stock = await pool.query("SELECT stock FROM products WHERE id = 1");
  const saleStock = await pool.query("SELECT sale_stock FROM flash_sales WHERE id = 1");
  const orderCount = await pool.query("SELECT COUNT(*)::int AS n FROM orders WHERE flash_sale_id = 1");

  assert.equal(stock.rows[0].stock, 0);
  assert.equal(saleStock.rows[0].sale_stock, 0);
  assert.equal(orderCount.rows[0].n, 2);
});

test("POST /orders with Idempotency-Key reuses the same response", async (t) => {
  const { pool, app } = createTestContext();
  t.after(async () => {
    await pool.end();
  });

  await pool.query("UPDATE products SET stock = 5 WHERE id = 1");
  await pool.query("UPDATE flash_sales SET sale_stock = 5, sale_price = 125000, quota_per_user = 5, status = 'active' WHERE id = 1");
  await pool.query("DELETE FROM orders");
  await pool.query("DELETE FROM idempotency_keys");

  const first = await request(app)
    .post("/orders")
    .set("Authorization", `Bearer ${BUYER_TOKEN}`)
    .set("Idempotency-Key", "ulang-1")
    .send({ flashSaleId: 1, qty: 2 });

  const second = await request(app)
    .post("/orders")
    .set("Authorization", `Bearer ${BUYER_TOKEN}`)
    .set("Idempotency-Key", "ulang-1")
    .send({ flashSaleId: 1, qty: 2 });

  assert.equal(first.status, 201);
  assert.equal(second.status, 201);
  assert.deepEqual(second.body, first.body);

  const stock = await pool.query("SELECT stock FROM products WHERE id = 1");
  const saleStock = await pool.query("SELECT sale_stock FROM flash_sales WHERE id = 1");
  const orderCount = await pool.query("SELECT COUNT(*)::int AS n FROM orders WHERE flash_sale_id = 1");

  assert.equal(stock.rows[0].stock, 3);
  assert.equal(saleStock.rows[0].sale_stock, 3);
  assert.equal(orderCount.rows[0].n, 1);
});