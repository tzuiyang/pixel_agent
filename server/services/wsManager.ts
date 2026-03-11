import { WebSocketServer, WebSocket } from 'ws';
import type { WSEvent } from '../../shared/types.js';

export class WSManager {
  private static wss: WebSocketServer;

  static init(wss: WebSocketServer) {
    WSManager.wss = wss;
  }

  static broadcast(event: WSEvent) {
    if (!WSManager.wss) return;
    const data = JSON.stringify(event);
    WSManager.wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    });
  }

  static sendTo(ws: WebSocket, event: WSEvent) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(event));
    }
  }
}
