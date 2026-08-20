import { createServer } from "node:http";

import express from "express";
import { createClient } from "redis";
import { WebSocketServer } from "ws";

const port = Number(process.env.PORT || 4000);
const redisUrl = process.env.REDIS_URL;
const apiInternalUrl = process.env.API_INTERNAL_URL;

const app = express();
app.use(express.json());

const rooms = new Map();

function getRoom(streamId) {
  const key = String(streamId);
  if (!rooms.has(key)) {
    rooms.set(key, new Set());
  }

  return rooms.get(key);
}

function getPresence(streamId) {
  return getRoom(streamId).size;
}

function broadcastLocal(streamId, payload) {
  const room = getRoom(streamId);
  const message = JSON.stringify(payload);

  for (const socket of room) {
    if (socket.readyState === socket.OPEN) {
      socket.send(message);
    }
  }
}

const pub = redisUrl ? createClient({ url: redisUrl }) : null;
const sub = redisUrl ? createClient({ url: redisUrl }) : null;

async function publishEvent(streamId, payload) {
  const channel = `stream:${streamId}`;

  if (pub?.isOpen) {
    await pub.publish(channel, JSON.stringify(payload));
    return;
  }

  broadcastLocal(streamId, payload);
}

// Returns user object if token is valid, null otherwise
async function validateToken(token) {
  if (!apiInternalUrl || !token) return null;
  try {
    const res = await fetch(`${apiInternalUrl}/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const body = await res.json();
    return body?.user ?? null;
  } catch {
    return null;
  }
}

async function initializeRedis() {
  if (!pub || !sub) {
    return;
  }

  await pub.connect();
  await sub.connect();
  await sub.pSubscribe("stream:*", async (message, channel) => {
    const streamId = channel.split(":")[1];
    const payload = JSON.parse(message);
    broadcastLocal(streamId, payload);
  });
}

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    redis: pub?.isOpen ? "connected" : "disabled",
  });
});

app.get("/rooms/:streamId/presence", (req, res) => {
  const streamId = req.params.streamId;
  res.json({
    streamId,
    presence: getPresence(streamId),
  });
});

app.post("/events/chat", async (req, res, next) => {
  try {
    const { streamId, userId, userName, content } = req.body ?? {};
    if (!streamId || !userId || !userName || !content) {
      return res.status(400).json({ error: { code: "INPUT_TIDAK_VALID", message: "Payload chat tidak lengkap" } });
    }

    const payload = {
      type: "chat_message",
      streamId: String(streamId),
      userId,
      userName,
      content,
      createdAt: new Date().toISOString(),
    };
    await publishEvent(streamId, payload);
    return res.status(202).json({ ok: true });
  } catch (error) {
    return next(error);
  }
});

app.post("/events/stock", async (req, res, next) => {
  try {
    const { streamId, flashSaleId, productId, saleStock, productStock } = req.body ?? {};
    if (!streamId || !flashSaleId || !productId) {
      return res.status(400).json({ error: { code: "INPUT_TIDAK_VALID", message: "Payload stock update tidak lengkap" } });
    }

    const payload = {
      type: "stock_update",
      streamId: String(streamId),
      flashSaleId,
      productId,
      saleStock,
      productStock,
      createdAt: new Date().toISOString(),
    };
    await publishEvent(streamId, payload);
    return res.status(202).json({ ok: true });
  } catch (error) {
    return next(error);
  }
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: { code: "GAGAL", message: "Realtime service gagal memproses permintaan" } });
});

const server = createServer(app);
const wss = new WebSocketServer({ noServer: true });

server.on("upgrade", async (request, socket, head) => {
  const url = new URL(request.url || "/", `http://${request.headers.host}`);
  if (url.pathname !== "/ws") {
    socket.destroy();
    return;
  }

  const streamId = url.searchParams.get("streamId");
  if (!streamId) {
    socket.write("HTTP/1.1 400 Bad Request\r\n\r\n");
    socket.destroy();
    return;
  }

  const token = url.searchParams.get("token");
  const user = await validateToken(token);
  if (!user) {
    socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
    socket.destroy();
    return;
  }

  wss.handleUpgrade(request, socket, head, (ws) => {
    ws.streamId = String(streamId);
    ws.userId = user.id;
    ws.userName = user.name;
    wss.emit("connection", ws, request);
  });
});

wss.on("connection", async (socket) => {
  const streamId = socket.streamId;
  const room = getRoom(streamId);
  room.add(socket);

  await publishEvent(streamId, {
    type: "presence",
    streamId,
    presence: room.size,
    createdAt: new Date().toISOString(),
  });

  socket.on("message", async (raw) => {
    try {
      const parsed = JSON.parse(raw.toString());
      if (parsed?.type === "ping") {
        socket.send(JSON.stringify({ type: "pong", createdAt: new Date().toISOString() }));
      }
    } catch {
      socket.send(JSON.stringify({ type: "error", message: "Payload WebSocket tidak valid" }));
    }
  });

  socket.on("close", async () => {
    room.delete(socket);
    await publishEvent(streamId, {
      type: "presence",
      streamId,
      presence: room.size,
      createdAt: new Date().toISOString(),
    });
  });
});

await initializeRedis();

server.listen(port, () => {
  console.log(`Realtime service listening on port ${port}`);
});