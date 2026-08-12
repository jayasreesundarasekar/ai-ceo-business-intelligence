import { useEffect, useRef, useState } from 'react';
import { API_URL } from './api';

export interface LiveEvent {
  type: string;
  payload: unknown;
  at: string;
}

/**
 * Native browser WebSocket — no client library needed. Connects to the
 * backend's /ws endpoint (see server/src/ws.ts), auto-reconnects with
 * backoff, and keeps a small rolling log of recent events for the UI.
 */
export function useLiveUpdates(maxEvents = 20) {
  const [connected, setConnected] = useState(false);
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const retryDelay = useRef(1000);

  useEffect(() => {
    let socket: WebSocket | null = null;
    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout>;

    const wsUrl = API_URL.replace(/^http/, 'ws') + '/ws';

    function connect() {
      if (cancelled) return;
      socket = new WebSocket(wsUrl);

      socket.onopen = () => {
        setConnected(true);
        retryDelay.current = 1000;
      };

      socket.onmessage = (msg) => {
        try {
          const event = JSON.parse(msg.data) as LiveEvent;
          if (event.type === 'connected') return;
          setEvents((prev) => [event, ...prev].slice(0, maxEvents));
        } catch {
          // ignore malformed frames
        }
      };

      socket.onclose = () => {
        setConnected(false);
        if (cancelled) return;
        retryTimer = setTimeout(connect, retryDelay.current);
        retryDelay.current = Math.min(retryDelay.current * 1.5, 15000);
      };

      socket.onerror = () => socket?.close();
    }

    connect();

    return () => {
      cancelled = true;
      clearTimeout(retryTimer);
      socket?.close();
    };
  }, [maxEvents]);

  return { connected, events };
}
