import { randomUUID } from "node:crypto";

import express from "express";

const port = Number(process.env.PORT || 5000);
const app = express();
app.use(express.json());

const sessions = new Map();

function buildSession(streamId, title) {
  const sessionId = randomUUID();
  return {
    id: sessionId,
    streamId,
    title,
    status: "ready",
    ingestUrl: `rtmp://media.local/live/${sessionId}`,
    playback: {
      hls: `https://media.local/hls/${sessionId}.m3u8`,
      webrtc: `wss://media.local/webrtc/${sessionId}`,
    },
    createdAt: new Date().toISOString(),
  };
}

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.post("/sessions", (req, res) => {
  const streamId = Number(req.body?.streamId);
  const title = typeof req.body?.title === "string" ? req.body.title.trim() : "Live Shopping Session";

  if (!Number.isInteger(streamId) || streamId < 1) {
    return res.status(400).json({ error: { code: "INPUT_TIDAK_VALID", message: "streamId wajib bilangan bulat positif" } });
  }

  const session = buildSession(streamId, title);
  sessions.set(session.id, session);
  return res.status(201).json(session);
});

app.get("/sessions/:sessionId", (req, res) => {
  const session = sessions.get(req.params.sessionId);
  if (!session) {
    return res.status(404).json({ error: { code: "SESSION_TIDAK_ADA", message: "Media session tidak ditemukan" } });
  }

  return res.json(session);
});

app.patch("/sessions/:sessionId", (req, res) => {
  const session = sessions.get(req.params.sessionId);
  if (!session) {
    return res.status(404).json({ error: { code: "SESSION_TIDAK_ADA", message: "Media session tidak ditemukan" } });
  }

  const nextStatus = typeof req.body?.status === "string" ? req.body.status.trim() : session.status;
  const updated = {
    ...session,
    status: nextStatus || session.status,
    updatedAt: new Date().toISOString(),
  };
  sessions.set(updated.id, updated);
  return res.json(updated);
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: { code: "GAGAL", message: "Media service gagal memproses permintaan" } });
});

app.listen(port, () => {
  console.log(`Media service listening on port ${port}`);
});