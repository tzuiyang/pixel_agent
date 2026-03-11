import { describe, it, expect, beforeEach } from 'vitest';
import { AgentStateMachine } from '../services/agentStateMachine';

describe('AgentStateMachine', () => {
  let machine: AgentStateMachine;

  beforeEach(() => {
    machine = new AgentStateMachine('test-char-1');
  });

  it('should start in idle state', () => {
    expect(machine.getState()).toBe('idle');
  });

  it('should allow idle → working', () => {
    expect(machine.canTransitionTo('working')).toBe(true);
    machine.transition('working', 'Starting task');
    expect(machine.getState()).toBe('working');
    expect(machine.getActivity()).toBe('Starting task');
  });

  it('should NOT allow idle → thinking', () => {
    expect(machine.canTransitionTo('thinking')).toBe(false);
  });

  it('should NOT allow idle → done', () => {
    expect(machine.canTransitionTo('done')).toBe(false);
  });

  it('should throw on invalid transition', () => {
    expect(() => machine.transition('done')).toThrow('Invalid state transition: idle → done');
  });

  it('should allow working → thinking → working', () => {
    machine.transition('working');
    machine.transition('thinking', 'Processing...');
    expect(machine.getState()).toBe('thinking');
    machine.transition('working', 'Continuing...');
    expect(machine.getState()).toBe('working');
  });

  it('should allow working → done → idle', () => {
    machine.transition('working');
    machine.transition('done', 'Task complete');
    expect(machine.getState()).toBe('done');
    machine.transition('idle');
    expect(machine.getState()).toBe('idle');
  });

  it('should allow working → error → idle', () => {
    machine.transition('working');
    machine.transition('error', 'Something failed');
    expect(machine.getState()).toBe('error');
    machine.transition('idle');
    expect(machine.getState()).toBe('idle');
  });

  it('should allow working → waiting → working', () => {
    machine.transition('working');
    machine.transition('waiting', 'Need user input');
    expect(machine.getState()).toBe('waiting');
    machine.transition('working', 'Got input, continuing');
    expect(machine.getState()).toBe('working');
  });

  it('should track activity text', () => {
    expect(machine.getActivity()).toBe('');
    machine.transition('working', 'Doing stuff');
    expect(machine.getActivity()).toBe('Doing stuff');
  });

  it('should reset to idle', () => {
    machine.transition('working', 'Busy');
    machine.reset();
    expect(machine.getState()).toBe('idle');
    expect(machine.getActivity()).toBe('');
  });

  it('should handle full lifecycle: idle → working → thinking → working → done → idle', () => {
    machine.transition('working', 'Started');
    machine.transition('thinking', 'Analyzing...');
    machine.transition('working', 'Writing response...');
    machine.transition('done', 'Complete!');
    machine.transition('idle');
    expect(machine.getState()).toBe('idle');
  });

  it('should accept custom initial state', () => {
    const m = new AgentStateMachine('char-2', 'done');
    expect(m.getState()).toBe('done');
    expect(m.canTransitionTo('idle')).toBe(true);
  });
});
