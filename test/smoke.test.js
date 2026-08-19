import test from "node:test";
import assert from "node:assert/strict";

const BASE = process.env.BASE || "http://localhost:3000";

test("GET /health membalas ok", async () => {
  const res = await fetch(`${BASE}/health`);
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.status, "ok");
});

test("POST /orders yang sah → 201", async () => {
  // Gunakan itemId = 4 (Phone Holder Flex) yang memiliki stok banyak (15) untuk smoke test
  const res = await fetch(`${BASE}/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ itemId: 4, qty: 1 }),
  });
  assert.equal(res.status, 201);
  const data = await res.json();
  assert.equal(data.qty, 1);
  assert.equal(data.itemId, 4);
});

test("POST /orders tanpa qty atau itemId salah → 400", async () => {
  const res = await fetch(`${BASE}/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ itemId: 1 }),
  });
  assert.equal(res.status, 400);
});

test("POST /orders item tidak ada → 404", async () => {
  const res = await fetch(`${BASE}/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ itemId: 9999, qty: 1 }),
  });
  assert.equal(res.status, 404);
});