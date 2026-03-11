import { describe, it, expect, beforeEach } from 'vitest';
import {
  getOrCreateMachine,
  removeMachine,
  getActiveTaskCount,
  getQueueLength,
  isCharacterBusy,
} from '../services/taskExecutor';

describe('TaskExecutor utility functions', () => {
  describe('getOrCreateMachine', () => {
    it('should create a new machine for unknown character', () => {
      const machine = getOrCreateMachine('new-char-123');
      expect(machine).toBeDefined();
      expect(machine.getState()).toBe('idle');
    });

    it('should return the same machine for the same character', () => {
      const m1 = getOrCreateMachine('same-char');
      const m2 = getOrCreateMachine('same-char');
      expect(m1).toBe(m2);
    });

    it('should support custom initial state', () => {
      const machine = getOrCreateMachine('working-char', 'working');
      expect(machine.getState()).toBe('working');
    });

    it('should not override existing machine with different initial state', () => {
      const m1 = getOrCreateMachine('keep-state-char');
      m1.transition('working');
      const m2 = getOrCreateMachine('keep-state-char', 'idle');
      expect(m2.getState()).toBe('working'); // not reset to idle
    });
  });

  describe('removeMachine', () => {
    it('should remove machine for character', () => {
      getOrCreateMachine('remove-me-char');
      removeMachine('remove-me-char');
      // Creating again should give a fresh machine
      const fresh = getOrCreateMachine('remove-me-char');
      expect(fresh.getState()).toBe('idle');
    });

    it('should not throw for non-existent character', () => {
      expect(() => removeMachine('ghost-char-xyz')).not.toThrow();
    });
  });

  describe('getActiveTaskCount', () => {
    it('should return a number >= 0', () => {
      expect(getActiveTaskCount()).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getQueueLength', () => {
    it('should return a number >= 0', () => {
      expect(getQueueLength()).toBeGreaterThanOrEqual(0);
    });
  });

  describe('isCharacterBusy', () => {
    it('should return false for character with no active task', () => {
      expect(isCharacterBusy('definitely-not-busy')).toBe(false);
    });
  });
});
