import { createApp } from "./app.js";
import { createCache } from "./cache.js";
import { createPool } from "./db.js";

const port = Number(process.env.PORT || 3000);
const pool = createPool();
const cache = await createCache(process.env.REDIS_URL);
const app = createApp({ pool, cache });

const server = app.listen(port, () => {
  console.log(`Backend API listening on port ${port}`);
});

async function shutdown(signal) {
  console.log(`${signal} received, shutting down API server`);

  server.close(async () => {
    await pool.end();
    if (cache) await cache.disconnect();
    process.exit(0);
  });
}

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});