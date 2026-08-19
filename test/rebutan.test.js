import test from "node:test";
import assert from "node:assert/strict";

const BASE = process.env.BASE || "http://localhost:3000";

// Gunakan item Mic Wireless Creator (ID=3) yang diseed dengan stok = 5
const ITEM_ID = 3;
const PENYERBU = 300;

async function beli() {
  const res = await fetch(`${BASE}/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ itemId: ITEM_ID, qty: 1 }),
  });
  return res.status;
}

async function getStockOfItem(itemId) {
  const res = await fetch(`${BASE}/catalog?page=1&limit=100`);
  const body = await res.json();
  const item = body.data.find(i => i.id === itemId);
  return item ? item.sisa : 0;
}

test(`stok diserbu ${PENYERBU} penonton tak boleh oversell`, async () => {
  const initialStock = await getStockOfItem(ITEM_ID);
  console.log(`Stok awal item ${ITEM_ID}: ${initialStock}`);

  // Eksekusi checkout massal secara parallel
  const statusCodes = await Promise.all(
    Array.from({ length: PENYERBU }, beli)
  );

  const sukses = statusCodes.filter((s) => s === 201).length;
  const ditolak = statusCodes.filter((s) => s === 409).length;
  const sisaStok = await getStockOfItem(ITEM_ID);

  console.log(`--- HASIL UJI REBUTAN ---`);
  console.log(`Sukses (201): ${sukses}`);
  console.log(`Ditolak (409): ${ditolak}`);
  console.log(`Sisa stok di DB: ${sisaStok}`);

  assert.ok(sisaStok >= 0, `OVERSELL: Sisa stok negatif (${sisaStok})`);
  assert.ok(sukses <= initialStock, `OVERSELL: Terjual ${sukses} padahal stok hanya ${initialStock}`);
  assert.equal(sukses + ditolak, PENYERBU, "Setiap request harus membalas 201 atau 409 (bukan 5xx)");
});