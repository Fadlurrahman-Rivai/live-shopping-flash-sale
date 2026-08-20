import { useState, useEffect, useRef } from "react";
import type { ChatMessage } from "../types";
import { getChatPool } from "../mock-data";

export function useSimulatedChat(_streamId: number): {
  messages: ChatMessage[];
  sendMessage: (content: string, userName: string, userId: number) => void;
} {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const poolRef = useRef(getChatPool());
  const idxRef = useRef(0);

  useEffect(() => {
    idxRef.current = 0;
    setMessages([]);

    // Seed a few messages immediately
    const initial = poolRef.current.slice(0, 3).map((m, i) => ({
      ...m,
      id: `init-${i}`,
    }));
    setMessages(initial);
    idxRef.current = 3;

    const interval = setInterval(() => {
      const pool = poolRef.current;
      if (idxRef.current >= pool.length) {
        idxRef.current = 0;
      }
      const next = { ...pool[idxRef.current], id: `${Date.now()}-${idxRef.current}` };
      idxRef.current++;
      setMessages((prev) => [...prev.slice(-60), next]);
    }, 1800);

    return () => clearInterval(interval);
  }, [_streamId]);

  function sendMessage(content: string, userName: string, userId: number) {
    setMessages((prev) => [
      ...prev.slice(-60),
      { id: `user-${Date.now()}`, userName, content, userId, isHost: false },
    ]);
  }

  return { messages, sendMessage };
}
