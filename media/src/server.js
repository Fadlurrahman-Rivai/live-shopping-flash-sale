import { randomUUID } from "node:crypto";

import express from "express";

const port = Number(process.env.PORT || 5000);
// Public Big Buck Bunny HLS stream — demo fallback when no real ingest is active
const DEMO_HLS_URL = process.env.DEMO_HLS_URL || "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8";

const app = express();
app.use(express.json());

const sessions = new Map();    // sessionId → session
const byStream = new Map();    // streamId  → sessionId

function buildSession(streamId, title) {
  const sessionId = randomUUID();
  return {
    id: sessionId,
    streamId,
    title,
    status: "ready",
    ingestUrl: `rtmp://media.local/live/${sessionId}`,
    playback: {
      hls: DEMO_HLS_URL,
      webrtc: `wss://media.local/webrtc/${sessionId}`,
    },
    createdAt: new Date().toISOString(),
  };
}

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Look up (or auto-create) a session for a given streamId — called by the frontend player
app.get("/sessions/by-stream/:streamId", (req, res) => {
  const streamId = Number(req.params.streamId);
  if (!Number.isInteger(streamId) || streamId < 1) {
    return res.status(400).json({ error: { code: "INPUT_TIDAK_VALID", message: "streamId harus bilangan bulat positif" } });
  }
  const existingId = byStream.get(streamId);
  if (existingId) return res.json(sessions.get(existingId));
  const session = buildSession(streamId, `Stream ${streamId}`);
  sessions.set(session.id, session);
  byStream.set(streamId, session.id);
  return res.json(session);
});

app.post("/sessions", (req, res) => {
  const streamId = Number(req.body?.streamId);
  const title = typeof req.body?.title === "string" ? req.body.title.trim() : "Live Shopping Session";

  if (!Number.isInteger(streamId) || streamId < 1) {
    return res.status(400).json({ error: { code: "INPUT_TIDAK_VALID", message: "streamId wajib bilangan bulat positif" } });
  }

  const session = buildSession(streamId, title);
  sessions.set(session.id, session);
  byStream.set(streamId, session.id);
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