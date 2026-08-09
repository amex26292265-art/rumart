"use client";

import { useEffect, useState } from "react";
import { WS_URL } from "@/lib/api";

export function useLiveSocket(onEvent?: (msg: unknown) => void) {
  const [connected, setConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<unknown>(null);

  useEffect(() => {
    let ws: WebSocket | null = null;
    let closed = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const connect = () => {
      if (closed) return;
      ws = new WebSocket(WS_URL);
      ws.onopen = () => {
        setConnected(true);
        ws?.send("ping");
      };
      ws.onmessage = (ev) => {
        try {
          const data = JSON.parse(ev.data);
          setLastMessage(data);
          onEvent?.(data);
        } catch {
          /* ignore malformed */
        }
      };
      ws.onclose = () => {
        setConnected(false);
        timer = setTimeout(connect, 2000);
      };
      ws.onerror = () => ws?.close();
    };

    connect();
    const ping = setInterval(() => {
      if (ws && ws.readyState === WebSocket.OPEN) ws.send("ping");
    }, 15000);

    return () => {
      closed = true;
      clearInterval(ping);
      if (timer) clearTimeout(timer);
      ws?.close();
    };
  }, [onEvent]);

  return { connected, lastMessage };
}
