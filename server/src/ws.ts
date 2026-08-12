import { WebSocketServer, WebSocket } from 'ws';
import type { Server as HttpServer } from 'http';

/**
 * Live updates for the frontend — new workflow runs, crisis alerts, and
 * approve/reject feedback push here instead of the client having to poll.
 * Deliberately minimal: no socket.io, no rooms/auth — every connected
 * dashboard tab gets every event, same as watching one shared command center.
 */
let wss: WebSocketServer | null = null;

export function initWebSocketServer(server: HttpServer) {
  wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (socket) => {
    socket.send(JSON.stringify({ type: 'connected', payload: { message: 'Live updates connected' }, at: new Date().toISOString() }));
  });

  console.log('WebSocket server listening on /ws');
  return wss;
}

export function broadcast(type: string, payload: unknown) {
  if (!wss) return;
  const message = JSON.stringify({ type, payload, at: new Date().toISOString() });
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) client.send(message);
  }
}
