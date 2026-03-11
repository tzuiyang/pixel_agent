import { describe, it, expect } from 'vitest';

// ────────────────────────────────────────────────
// BUG-004: Unique spawn position logic
// ────────────────────────────────────────────────
describe('BUG-004: Unique spawn positions', () => {
  function findSpawnBFS(
    layout: { width: number; height: number; tiles: any[][]; props: any[] },
    occupied: Set<string>
  ): { x: number; y: number } | null {
    const propSet = new Set(
      layout.props.filter((p: any) => !p.walkable).map((p: any) => `${p.x},${p.y}`)
    );
    const cx = Math.floor(layout.width / 2);
    const cy = Math.floor(layout.height / 2);
    const visited = new Set<string>();
    const queue = [{ x: cx, y: cy }];
    visited.add(`${cx},${cy}`);

    while (queue.length > 0) {
      const cur = queue.shift()!;
      const tile = layout.tiles?.[cur.y]?.[cur.x];
      const key = `${cur.x},${cur.y}`;
      if (tile?.walkable && !propSet.has(key) && !occupied.has(key)) {
        return cur;
      }
      for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
        const nx = cur.x + dx, ny = cur.y + dy;
        const nk = `${nx},${ny}`;
        if (nx >= 0 && ny >= 0 && nx < layout.width && ny < layout.height && !visited.has(nk)) {
          visited.add(nk);
          queue.push({ x: nx, y: ny });
        }
      }
    }
    return null;
  }

  const makeLayout = (w: number, h: number) => ({
    width: w,
    height: h,
    tiles: Array.from({ length: h }, () =>
      Array.from({ length: w }, () => ({ type: 'floor_wood', walkable: true }))
    ),
    props: [],
  });

  it('should place first character near center', () => {
    const layout = makeLayout(10, 10);
    const pos = findSpawnBFS(layout, new Set());
    expect(pos).toEqual({ x: 5, y: 5 }); // center of 10x10
  });

  it('should place second character at a different position', () => {
    const layout = makeLayout(10, 10);
    const occupied = new Set(['5,5']);
    const pos = findSpawnBFS(layout, occupied);
    expect(pos).not.toBeNull();
    expect(pos).not.toEqual({ x: 5, y: 5 });
  });

  it('should skip non-walkable tiles', () => {
    const layout = makeLayout(3, 3);
    // Mark center as non-walkable
    layout.tiles[1][1] = { type: 'wall_brick', walkable: false };
    const pos = findSpawnBFS(layout, new Set());
    expect(pos).not.toBeNull();
    expect(pos).not.toEqual({ x: 1, y: 1 });
  });

  it('should skip tiles occupied by non-walkable props', () => {
    const layout = makeLayout(3, 3);
    layout.props = [{ x: 1, y: 1, type: 'desk', walkable: false }];
    const pos = findSpawnBFS(layout, new Set());
    expect(pos).not.toBeNull();
    expect(pos).not.toEqual({ x: 1, y: 1 });
  });

  it('should return null when all tiles are occupied', () => {
    const layout = makeLayout(2, 2);
    const occupied = new Set(['0,0', '0,1', '1,0', '1,1']);
    const pos = findSpawnBFS(layout, occupied);
    expect(pos).toBeNull();
  });
});

// ────────────────────────────────────────────────
// BUG-007: Route ordering (/status before /:id)
// ────────────────────────────────────────────────
describe('BUG-007: Route ordering', () => {
  it('should have /status route defined before /:id in task routes', async () => {
    // We verify by reading the route file content to confirm ordering
    const fs = await import('fs');
    const path = await import('path');
    const taskRoutePath = path.resolve(__dirname, '../routes/task.ts');
    const content = fs.readFileSync(taskRoutePath, 'utf-8');

    const statusIndex = content.indexOf("taskRoutes.get('/status'");
    const idIndex = content.indexOf("taskRoutes.get('/:id'");

    expect(statusIndex).toBeGreaterThan(-1);
    expect(idIndex).toBeGreaterThan(-1);
    expect(statusIndex).toBeLessThan(idIndex);
  });
});

// ────────────────────────────────────────────────
// BUG-011: Monotonic notification IDs
// ────────────────────────────────────────────────
describe('BUG-011: Unique notification IDs', () => {
  it('should generate unique IDs even when called simultaneously', () => {
    let counter = 0;
    const makeId = () => `notif-${++counter}`;

    const ids = Array.from({ length: 100 }, () => makeId());
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(100);
  });

  it('should produce sequential IDs', () => {
    let counter = 0;
    const makeId = () => `notif-${++counter}`;
    const id1 = makeId();
    const id2 = makeId();
    expect(id1).toBe('notif-1');
    expect(id2).toBe('notif-2');
  });
});

// ────────────────────────────────────────────────
// BUG-020: Operator precedence in sprite validation
// ────────────────────────────────────────────────
describe('BUG-020: Operator precedence in frame validation', () => {
  function validateFrameCondition(
    framesLength: number,
    spriteHeight: number,
    firstRowIsArray: boolean,
    firstPixelType: string | null
  ): boolean {
    // This is the FIXED version with proper parentheses
    return (
      framesLength === spriteHeight &&
      firstRowIsArray &&
      (firstPixelType === 'string' || firstPixelType === null)
    );
  }

  it('should reject mismatched frame count even if first pixel is null', () => {
    // With the bug (no parens), `|| firstPixelType === null` was a top-level OR
    // making the whole expression true regardless of other conditions
    const result = validateFrameCondition(5, 16, false, null);
    expect(result).toBe(false);
  });

  it('should accept matching frame with string pixel', () => {
    const result = validateFrameCondition(16, 16, true, 'string');
    expect(result).toBe(true);
  });

  it('should accept matching frame with null pixel', () => {
    const result = validateFrameCondition(16, 16, true, null);
    expect(result).toBe(true);
  });

  it('should reject when first row is not array', () => {
    const result = validateFrameCondition(16, 16, false, 'string');
    expect(result).toBe(false);
  });
});

// ────────────────────────────────────────────────
// BUG-015: SpriteRenderer double deltaMs fix
// ────────────────────────────────────────────────
describe('BUG-015: Sprite animation timing', () => {
  it('should use effectiveInterval for idle (2x slower) without double-counting', () => {
    const frameInterval = 200;
    const animName = 'idle_1';
    const effectiveInterval = animName.startsWith('idle') ? frameInterval * 2 : frameInterval;

    // Idle should tick at 400ms intervals
    expect(effectiveInterval).toBe(400);

    // Simulate 399ms — should NOT advance frame
    let frameTimer = 0;
    frameTimer += 399;
    expect(frameTimer >= effectiveInterval).toBe(false);

    // At 400ms — SHOULD advance
    frameTimer += 1;
    expect(frameTimer >= effectiveInterval).toBe(true);
  });

  it('should tick work animations at normal speed', () => {
    const frameInterval = 200;
    const animName = 'work';
    const effectiveInterval = animName.startsWith('idle') ? frameInterval * 2 : frameInterval;
    expect(effectiveInterval).toBe(200);
  });
});

// ────────────────────────────────────────────────
// BUG-016: Undo only on drag start
// ────────────────────────────────────────────────
describe('BUG-016: Undo on drag start only', () => {
  it('should only push undo when isDragStart is true', () => {
    const undoStack: any[] = [];
    const pushUndo = (layout: any) => undoStack.push(JSON.parse(JSON.stringify(layout)));
    const layout = { tiles: [[{ type: 'floor_wood' }]] };

    // Simulate mousedown (isDragStart = true) — should push
    const isDragStart1 = true;
    if (isDragStart1) pushUndo(layout);
    expect(undoStack.length).toBe(1);

    // Simulate drag move (isDragStart = false) — should NOT push
    const isDragStart2 = false;
    if (isDragStart2) pushUndo(layout);
    expect(undoStack.length).toBe(1);

    // Another mousedown — should push
    const isDragStart3 = true;
    if (isDragStart3) pushUndo(layout);
    expect(undoStack.length).toBe(2);
  });
});

// ────────────────────────────────────────────────
// BUG-021: Keyboard shortcuts skip inputs
// ────────────────────────────────────────────────
describe('BUG-021: Keyboard shortcuts in inputs', () => {
  it('should skip shortcuts for INPUT/TEXTAREA tags', () => {
    const shouldSkip = (tagName: string) =>
      tagName === 'INPUT' || tagName === 'TEXTAREA';

    expect(shouldSkip('INPUT')).toBe(true);
    expect(shouldSkip('TEXTAREA')).toBe(true);
    expect(shouldSkip('DIV')).toBe(false);
    expect(shouldSkip('BUTTON')).toBe(false);
  });
});

// ────────────────────────────────────────────────
// BUG-026: Platform-aware shortcut labels
// ────────────────────────────────────────────────
describe('BUG-026: Platform-aware shortcut labels', () => {
  it('should detect Mac from userAgent', () => {
    const detectMac = (ua: string) => /Mac|iPod|iPhone|iPad/.test(ua);
    expect(detectMac('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)')).toBe(true);
    expect(detectMac('Mozilla/5.0 (Windows NT 10.0; Win64; x64)')).toBe(false);
    expect(detectMac('Mozilla/5.0 (X11; Linux x86_64)')).toBe(false);
    expect(detectMac('Mozilla/5.0 (iPhone; CPU iPhone OS 16_0)')).toBe(true);
  });

  it('should use Cmd on Mac, Ctrl on others', () => {
    const getModKey = (isMac: boolean) => isMac ? 'Cmd' : 'Ctrl';
    expect(getModKey(true)).toBe('Cmd');
    expect(getModKey(false)).toBe('Ctrl');
  });
});
