import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WSManager } from '../services/wsManager';
import { WebSocketServer, WebSocket } from 'ws';

describe('WSManager', () => {
  it('should not throw when broadcasting without init', () => {
    // WSManager.broadcast should gracefully handle no wss
    expect(() =>
      WSManager.broadcast({
        type: 'agent_state_change',
        characterId: 'test',
        state: 'idle',
      } as any)
    ).not.toThrow();
  });

  it('should initialize with a WebSocketServer', () => {
    const server = new WebSocketServer({ noServer: true });
    expect(() => WSManager.init(server)).not.toThrow();
    server.close();
  });

  it('should serialize events as JSON for broadcast', () => {
    const server = new WebSocketServer({ noServer: true });
    WSManager.init(server);

    // With no connected clients, broadcast is a no-op but shouldn't throw
    expect(() =>
      WSManager.broadcast({
        type: 'agent_output',
        characterId: 'char-1',
        taskId: 'task-1',
        output: 'Hello world',
      } as any)
    ).not.toThrow();

    server.close();
  });

  it('should send to specific client via sendTo', () => {
    const sent: string[] = [];
    const mockWs = {
      readyState: WebSocket.OPEN,
      send: (data: string) => sent.push(data),
    } as unknown as WebSocket;

    WSManager.sendTo(mockWs, {
      type: 'agent_activity',
      characterId: 'c1',
      label: 'Working...',
    } as any);

    expect(sent).toHaveLength(1);
    const parsed = JSON.parse(sent[0]);
    expect(parsed.type).toBe('agent_activity');
    expect(parsed.characterId).toBe('c1');
    expect(parsed.label).toBe('Working...');
  });

  it('should not send to closed client', () => {
    const sent: string[] = [];
    const mockWs = {
      readyState: WebSocket.CLOSED,
      send: (data: string) => sent.push(data),
    } as unknown as WebSocket;

    WSManager.sendTo(mockWs, {
      type: 'agent_error',
      characterId: 'c1',
      error: 'Failed',
    } as any);

    expect(sent).toHaveLength(0);
  });
});
