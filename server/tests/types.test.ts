import { describe, it, expect } from 'vitest';
import {
  AGENT_STATES,
  AGENT_STATE_TRANSITIONS,
  type AgentState,
  type SpriteData,
  type Character,
  type Scene,
  type SceneLayout,
  type Task,
  type WSEvent,
} from '../../shared/types';

describe('AgentState', () => {
  it('should have 6 states', () => {
    expect(AGENT_STATES).toHaveLength(6);
    expect(AGENT_STATES).toEqual(['idle', 'working', 'thinking', 'waiting', 'done', 'error']);
  });

  it('should define valid transitions for every state', () => {
    for (const state of AGENT_STATES) {
      expect(AGENT_STATE_TRANSITIONS[state]).toBeDefined();
      expect(Array.isArray(AGENT_STATE_TRANSITIONS[state])).toBe(true);
    }
  });

  it('idle should only transition to working', () => {
    expect(AGENT_STATE_TRANSITIONS.idle).toEqual(['working']);
  });

  it('working should transition to thinking, waiting, done, or error', () => {
    expect(AGENT_STATE_TRANSITIONS.working).toEqual(['thinking', 'waiting', 'done', 'error']);
  });

  it('done should transition back to idle', () => {
    expect(AGENT_STATE_TRANSITIONS.done).toEqual(['idle']);
  });

  it('error should transition back to idle', () => {
    expect(AGENT_STATE_TRANSITIONS.error).toEqual(['idle']);
  });

  it('thinking should transition to working or error', () => {
    expect(AGENT_STATE_TRANSITIONS.thinking).toEqual(['working', 'error']);
  });

  it('waiting should transition to working', () => {
    expect(AGENT_STATE_TRANSITIONS.waiting).toEqual(['working']);
  });

  it('should have no self-transitions', () => {
    for (const state of AGENT_STATES) {
      expect(AGENT_STATE_TRANSITIONS[state]).not.toContain(state);
    }
  });

  it('every transition target should be a valid state', () => {
    for (const state of AGENT_STATES) {
      for (const target of AGENT_STATE_TRANSITIONS[state]) {
        expect(AGENT_STATES).toContain(target);
      }
    }
  });
});

describe('SpriteData type structure', () => {
  it('should accept a valid 16x16 sprite', () => {
    const sprite: SpriteData = {
      width: 16,
      height: 16,
      frames: {
        idle: [makeEmptyFrame(16, 16)],
      },
    };
    expect(sprite.width).toBe(16);
    expect(sprite.frames.idle).toHaveLength(1);
    expect(sprite.frames.idle[0]).toHaveLength(16);
    expect(sprite.frames.idle[0][0]).toHaveLength(16);
  });

  it('should accept null pixels for transparency', () => {
    const frame = makeEmptyFrame(16, 16);
    frame[0][0] = null;
    frame[5][5] = '#FF0000';
    const sprite: SpriteData = {
      width: 16,
      height: 16,
      frames: { idle: [frame] },
    };
    expect(sprite.frames.idle[0][0][0]).toBeNull();
    expect(sprite.frames.idle[0][5][5]).toBe('#FF0000');
  });
});

describe('Character type structure', () => {
  it('should accept a valid character', () => {
    const char: Character = {
      id: 'test-id',
      sceneId: 'scene-1',
      name: 'Luna',
      description: 'a tiny wizard',
      sprite: { width: 16, height: 16, frames: { idle: [makeEmptyFrame(16, 16)] } },
      positionX: 5,
      positionY: 5,
      state: 'idle',
      currentTask: null,
      createdAt: new Date().toISOString(),
    };
    expect(char.state).toBe('idle');
    expect(char.currentTask).toBeNull();
  });
});

describe('Task type structure', () => {
  it('should accept a valid task', () => {
    const task: Task = {
      id: 'task-1',
      characterId: 'char-1',
      prompt: 'Research productivity tools',
      status: 'pending',
      output: null,
      activityLog: [],
      startedAt: null,
      completedAt: null,
      createdAt: new Date().toISOString(),
    };
    expect(task.status).toBe('pending');
    expect(task.activityLog).toHaveLength(0);
  });
});

describe('WSEvent discriminated union', () => {
  it('should type-check agent_state_change events', () => {
    const event: WSEvent = {
      type: 'agent_state_change',
      characterId: 'char-1',
      state: 'working',
      activity: 'Starting...',
    };
    expect(event.type).toBe('agent_state_change');
  });

  it('should type-check agent_output events', () => {
    const event: WSEvent = {
      type: 'agent_output',
      characterId: 'char-1',
      taskId: 'task-1',
      output: 'Here are the results...',
    };
    expect(event.type).toBe('agent_output');
  });

  it('should type-check agent_error events', () => {
    const event: WSEvent = {
      type: 'agent_error',
      characterId: 'char-1',
      taskId: 'task-1',
      error: 'API key expired',
    };
    expect(event.type).toBe('agent_error');
  });
});

describe('SceneLayout structure', () => {
  it('should validate a basic scene layout', () => {
    const layout: SceneLayout = {
      width: 4,
      height: 4,
      tiles: Array.from({ length: 4 }, () =>
        Array.from({ length: 4 }, () => ({ type: 'floor_wood' as const, walkable: true }))
      ),
      props: [
        { type: 'desk', x: 1, y: 1, walkable: false, isWorkstation: true },
      ],
    };
    expect(layout.tiles).toHaveLength(4);
    expect(layout.tiles[0]).toHaveLength(4);
    expect(layout.props).toHaveLength(1);
    expect(layout.props[0].isWorkstation).toBe(true);
  });
});

function makeEmptyFrame(w: number, h: number): (string | null)[][] {
  return Array.from({ length: h }, () => Array.from({ length: w }, () => null));
}
