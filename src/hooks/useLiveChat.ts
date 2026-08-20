import { useState, useEffect, useRef } from "react";
import type { ChatMessage } from "../types";
import { useSimulatedChat } from "./useSimulatedChat";
import { api } from "../api";

export function useLiveChat(
  streamId: number,
  token: string | null,
): {
  messages: ChatMessage[];
  wsConnected: boolean;
  sendMessage: (content: string, userName: string, userId: number) => Promise<void>;
} {
  const { messages: simMessages, sendMessage: simSend } = useSimulatedChat(streamId);
  const [wsMessages, setWsMessages] = useState<ChatMessage[]>([]);
  const [wsConnected, setWsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  // Load recent chat history from API
  useEffect(() => {
    api
      .getChatHistory(streamId)
      .then((res) => {
        if (res.data.length > 0) {
          setWsMessages(
            res.data
              .slice()
              .reverse()
              .map((m) => ({
                id: String(m.id),
                userName: m.userName,
                content: m.content,
                userId: m.userId,
              })),
          );
        }
      })
      .catch(() => {});
  }, [streamId]);

  // Real WebSocket connection
  useEffect(() => {
    if (!token) return;

    const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
    const url = `${proto}//${window.location.host}/ws?streamId=${streamId}&token=${encodeURIComponent(token)}`;

    let ws: WebSocket;
    try {
      ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => setWsConnected(true);
      ws.onerror = () => setWsConnected(false);
      ws.onclose = () => setWsConnected(false);
      ws.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data as string);
          if (data.type === "chat_message") {
            setWsMessages((prev) => [
              ...prev.slice(-60),
              {
                id: data.createdAt ?? String(Date.now()),
                userName: data.userName,
                content: data.content,
                userId: data.userId,
              },
            ]);
          }
        } catch {}
      };
    } catch {}

    return () => {
      try {
        wsRef.current?.close();
      } catch {}
    };
  }, [streamId, token]);

  async function sendMessage(content: string, userName: string, userId: number) {
    if (token) {
      try {
        await api.sendChat(token, streamId, content);
        // WebSocket will echo back the message; optimistically show it if WS not connected
        if (!wsConnected) {
          setWsMessages((prev) => [
            ...prev.slice(-60),
            { id: String(Date.now()), userName, content, userId },
          ]);
        }
        return;
      } catch {}
    }
    simSend(content, userName, userId);
  }

  // Show real messages when available, otherwise simulated
  const messages =
    wsConnected || wsMessages.length > 0
      ? [...simMessages.slice(-20), ...wsMessages].slice(-60)
      : simMessages;

  return { messages, wsConnected, sendMessage };
}
