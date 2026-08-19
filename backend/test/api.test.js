import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { newDb } from "pg-mem";
import request from "supertest";

import { createApp } from "../src/app.js";

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
  assert.equal(response.body.total, 4);
  assert.equal(response.body.data.length, 2);
  assert.deepEqual(Object.keys(response.body.data[0]), ["id", "nama", "harga", "sisa"]);
});

test("POST /orders stops when stock is exhausted", async (t) => {
  const { pool, app } = createTestContext();
  t.after(async () => {
    await pool.end();
  });

  await pool.query("UPDATE items SET sisa = 2, harga = 100000 WHERE id = 1");
  await pool.query("DELETE FROM orders");
  await pool.query("DELETE FROM idempotency_keys");

  const first = await request(app).post("/orders").send({ itemId: 1, qty: 1 });
  const second = await request(app).post("/orders").send({ itemId: 1, qty: 1 });
  const third = await request(app).post("/orders").send({ itemId: 1, qty: 1 });

  assert.equal(first.status, 201);
  assert.equal(second.status, 201);
  assert.equal(third.status, 409);
  assert.equal(third.body.error.code, "STOK_HABIS");

  const stock = await pool.query("SELECT sisa FROM items WHERE id = 1");
  const orderCount = await pool.query("SELECT COUNT(*)::int AS n FROM orders WHERE item_id = 1");

  assert.equal(stock.rows[0].sisa, 0);
  assert.equal(orderCount.rows[0].n, 2);
});

test("POST /orders with Idempotency-Key reuses the same response", async (t) => {
  const { pool, app } = createTestContext();
  t.after(async () => {
    await pool.end();
  });

  await pool.query("UPDATE items SET sisa = 5, harga = 125000 WHERE id = 2");
  await pool.query("DELETE FROM orders");
  await pool.query("DELETE FROM idempotency_keys");

  const first = await request(app)
    .post("/orders")
    .set("Idempotency-Key", "ulang-1")
    .send({ itemId: 2, qty: 2 });

  const second = await request(app)
    .post("/orders")
    .set("Idempotency-Key", "ulang-1")
    .send({ itemId: 2, qty: 2 });

  assert.equal(first.status, 201);
  assert.equal(second.status, 201);
  assert.deepEqual(second.body, first.body);

  const stock = await pool.query("SELECT sisa FROM items WHERE id = 2");
  const orderCount = await pool.query("SELECT COUNT(*)::int AS n FROM orders WHERE item_id = 2");

  assert.equal(stock.rows[0].sisa, 3);
  assert.equal(orderCount.rows[0].n, 1);
});