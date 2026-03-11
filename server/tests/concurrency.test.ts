import { describe, it, expect } from 'vitest';
import { AgentStateMachine } from '../services/agentStateMachine';
import { AGENT_STATE_TRANSITIONS } from '../../shared/types';

describe('Multi-Agent Concurrency', () => {
  it('should support multiple independent state machines', () => {
    const m1 = new AgentStateMachine('agent-1');
    const m2 = new AgentStateMachine('agent-2');
    const m3 = new AgentStateMachine('agent-3');

    m1.transition('working', 'Task A');
    m2.transition('working', 'Task B');
    m3.transition('working', 'Task C');

    expect(m1.getState()).toBe('working');
    expect(m2.getState()).toBe('working');
    expect(m3.getState()).toBe('working');

    m1.transition('done', 'Complete');
    expect(m1.getState()).toBe('done');
    expect(m2.getState()).toBe('working'); // unaffected
    expect(m3.getState()).toBe('working'); // unaffected
  });

  it('should handle agents in different states simultaneously', () => {
    const machines = [
      new AgentStateMachine('a1', 'idle'),
      new AgentStateMachine('a2', 'idle'),
      new AgentStateMachine('a3', 'idle'),
      new AgentStateMachine('a4', 'idle'),
      new AgentStateMachine('a5', 'idle'),
    ];

    // Agent 1: working
    machines[0].transition('working');

    // Agent 2: thinking
    machines[1].transition('working');
    machines[1].transition('thinking');

    // Agent 3: done
    machines[2].transition('working');
    machines[2].transition('done');

    // Agent 4: error
    machines[3].transition('working');
    machines[3].transition('error', 'API failed');

    // Agent 5: idle (never started)

    expect(machines[0].getState()).toBe('working');
    expect(machines[1].getState()).toBe('thinking');
    expect(machines[2].getState()).toBe('done');
    expect(machines[3].getState()).toBe('error');
    expect(machines[4].getState()).toBe('idle');
  });

  it('should prevent invalid concurrent transitions', () => {
    const m1 = new AgentStateMachine('c1');
    const m2 = new AgentStateMachine('c2');

    m1.transition('working');
    m2.transition('working');

    // m1 can go to thinking, m2 cannot go back to idle directly
    expect(m1.canTransitionTo('thinking')).toBe(true);
    expect(m2.canTransitionTo('idle')).toBe(false);

    m1.transition('thinking');
    // m1 is thinking, m2 is still working — both valid states
    expect(m1.canTransitionTo('working')).toBe(true);
    expect(m2.canTransitionTo('done')).toBe(true);
  });

  it('all state transitions should be deterministic', () => {
    // Every state should have exactly defined transition targets
    for (const [state, targets] of Object.entries(AGENT_STATE_TRANSITIONS)) {
      expect(targets.length).toBeGreaterThan(0);
      // No duplicates
      const unique = new Set(targets);
      expect(unique.size).toBe(targets.length);
    }
  });

  it('should have reachable done state from every non-terminal state', () => {
    // BFS from each state to verify 'done' is reachable
    for (const startState of ['idle', 'working', 'thinking', 'waiting'] as const) {
      const visited = new Set<string>();
      const queue = [startState];
      visited.add(startState);

      while (queue.length > 0) {
        const current = queue.shift()!;
        const targets = AGENT_STATE_TRANSITIONS[current as keyof typeof AGENT_STATE_TRANSITIONS];
        for (const target of targets) {
          if (!visited.has(target)) {
            visited.add(target);
            queue.push(target);
          }
        }
      }

      expect(visited.has('done')).toBe(true);
    }
  });

  it('should have reachable idle state from every state', () => {
    for (const startState of ['working', 'thinking', 'waiting', 'done', 'error'] as const) {
      const visited = new Set<string>();
      const queue = [startState];
      visited.add(startState);

      while (queue.length > 0) {
        const current = queue.shift()!;
        const targets = AGENT_STATE_TRANSITIONS[current as keyof typeof AGENT_STATE_TRANSITIONS];
        for (const target of targets) {
          if (!visited.has(target)) {
            visited.add(target);
            queue.push(target);
          }
        }
      }

      expect(visited.has('idle')).toBe(true);
    }
  });
});
