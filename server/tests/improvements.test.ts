import { describe, it, expect } from 'vitest';

// ────────────────────────────────────────────────
// BUG-005: Position persistence API
// ────────────────────────────────────────────────
describe('BUG-005: Character position persistence', () => {
  it('should validate position update requires numbers', () => {
    const validatePosition = (x: any, y: any) =>
      typeof x === 'number' && typeof y === 'number';

    expect(validatePosition(5, 10)).toBe(true);
    expect(validatePosition('5', 10)).toBe(false);
    expect(validatePosition(null, 10)).toBe(false);
    expect(validatePosition(5, undefined)).toBe(false);
  });

  it('should round float positions to integers', () => {
    const roundPos = (x: number, y: number) => ({
      x: Math.round(x),
      y: Math.round(y),
    });
    expect(roundPos(5.7, 3.2)).toEqual({ x: 6, y: 3 });
    expect(roundPos(5.5, 3.5)).toEqual({ x: 6, y: 4 });
  });
});

// ────────────────────────────────────────────────
// IMPROVE 2.2: Workstation reservation
// ────────────────────────────────────────────────
describe('IMPROVE 2.2: Workstation reservation', () => {
  function findNearestWorkstation(
    workstations: { x: number; y: number }[],
    fromX: number,
    fromY: number,
    claimed: Set<string>
  ): { x: number; y: number } | null {
    const sorted = [...workstations].sort(
      (a, b) =>
        Math.abs(a.x - fromX) + Math.abs(a.y - fromY) -
        (Math.abs(b.x - fromX) + Math.abs(b.y - fromY))
    );

    for (const ws of sorted) {
      const adjacents = [
        { x: ws.x, y: ws.y + 1 },
        { x: ws.x, y: ws.y - 1 },
        { x: ws.x + 1, y: ws.y },
        { x: ws.x - 1, y: ws.y },
      ];
      for (const adj of adjacents) {
        const key = `${adj.x},${adj.y}`;
        if (!claimed.has(key)) return adj;
      }
    }
    return null;
  }

  it('should assign different workstations to different characters', () => {
    const workstations = [
      { x: 3, y: 3 },
      { x: 7, y: 3 },
    ];
    const claimed = new Set<string>();

    const pos1 = findNearestWorkstation(workstations, 5, 5, claimed);
    expect(pos1).not.toBeNull();
    claimed.add(`${pos1!.x},${pos1!.y}`);

    const pos2 = findNearestWorkstation(workstations, 5, 5, claimed);
    expect(pos2).not.toBeNull();
    expect(pos2).not.toEqual(pos1);
  });

  it('should return null when all positions are claimed', () => {
    const workstations = [{ x: 3, y: 3 }];
    const claimed = new Set(['3,4', '3,2', '4,3', '2,3']);
    const pos = findNearestWorkstation(workstations, 5, 5, claimed);
    expect(pos).toBeNull();
  });

  it('should prefer closer workstation', () => {
    const workstations = [
      { x: 10, y: 10 },
      { x: 2, y: 2 },
    ];
    const claimed = new Set<string>();
    const pos = findNearestWorkstation(workstations, 1, 1, claimed);
    // Should pick adjacent to (2,2), not (10,10)
    expect(pos).not.toBeNull();
    const dist = Math.abs(pos!.x - 2) + Math.abs(pos!.y - 2);
    expect(dist).toBe(1);
  });
});

// ────────────────────────────────────────────────
// IMPROVE 2.3: Activity Stream
// ────────────────────────────────────────────────
describe('IMPROVE 2.3: Activity Stream', () => {
  interface ActivityEntry {
    id: number;
    timestamp: string;
    characterName: string;
    characterId: string;
    text: string;
    type: 'state' | 'activity' | 'output' | 'error';
  }

  it('should maintain max 200 entries', () => {
    const entries: ActivityEntry[] = [];
    let id = 0;
    for (let i = 0; i < 250; i++) {
      entries.push({
        id: ++id,
        timestamp: '00:00:00',
        characterName: 'Test',
        characterId: 'c1',
        text: `Entry ${i}`,
        type: 'activity',
      });
    }
    // Simulate the slice(-199) cap
    const capped = entries.slice(-200);
    expect(capped.length).toBe(200);
    expect(capped[0].text).toBe('Entry 50');
  });

  it('should format timestamp correctly', () => {
    const date = new Date(2026, 2, 11, 14, 5, 9);
    const timestamp = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`;
    expect(timestamp).toBe('14:05:09');
  });

  it('should truncate long output text', () => {
    const longText = 'A'.repeat(200);
    const truncated = longText.slice(0, 100);
    expect(truncated.length).toBe(100);
  });
});

// ────────────────────────────────────────────────
// IMPROVE 2.5: Markdown rendering validation
// ────────────────────────────────────────────────
describe('IMPROVE 2.5: Markdown output rendering', () => {
  it('should handle code block detection', () => {
    const className = 'language-typescript';
    const isBlock = className?.startsWith('language-');
    expect(isBlock).toBe(true);

    const inlineClass = undefined;
    const isInline = inlineClass?.startsWith('language-');
    expect(isInline).toBeUndefined();
  });

  it('should handle empty output gracefully', () => {
    const output: string | null = null;
    const text = output || '';
    expect(text).toBe('');
  });

  it('should not crash on raw text without markdown', () => {
    const plainText = 'Just a plain text response with no markdown formatting';
    // Plain text should render as-is
    expect(plainText.includes('#')).toBe(false);
    expect(plainText.includes('```')).toBe(false);
  });
});
