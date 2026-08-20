import { createClient } from "redis";

export async function createCache(redisUrl) {
  if (!redisUrl) return null;

  const client = createClient({ url: redisUrl });
  client.on("error", (err) => console.error("Redis cache error:", err.message));

  await client.connect();
  return client;
}

// Deletes all catalog:* keys — call after any product/flash_sale mutation
export async function invalidateCatalog(cache) {
  if (!cache) return;
  const keys = await cache.keys("catalog:*");
  if (keys.length > 0) await cache.del(keys);
}
