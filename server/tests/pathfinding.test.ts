import { describe, it, expect } from 'vitest';
// We test the BFS logic with a mock TileRenderer
import type { SceneLayout } from '../../shared/types';

// Minimal TileRenderer reimplementation for testing
class MockTileRenderer {
  private layout: SceneLayout;

  constructor(layout: SceneLayout) {
    this.layout = layout;
  }

  isWalkable(x: number, y: number): boolean {
    if (x < 0 || y < 0 || x >= this.layout.width || y >= this.layout.height) return false;
    const tile = this.layout.tiles[y]?.[x];
    if (!tile?.walkable) return false;
    for (const prop of this.layout.props) {
      if (prop.x === x && prop.y === y && !prop.walkable) return false;
    }
    return true;
  }
}

// BFS implementation (same as client)
function bfsPath(
  renderer: MockTileRenderer,
  startX: number, startY: number,
  endX: number, endY: number
): { x: number; y: number }[] {
  if (startX === endX && startY === endY) return [];

  interface Node { x: number; y: number; parent: Node | null }
  const visited = new Set<string>();
  const queue: Node[] = [{ x: startX, y: startY, parent: null }];
  visited.add(`${startX},${startY}`);

  const directions = [
    { dx: 0, dy: -1 }, { dx: 0, dy: 1 },
    { dx: -1, dy: 0 }, { dx: 1, dy: 0 },
  ];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current.x === endX && current.y === endY) {
      const path: { x: number; y: number }[] = [];
      let node: Node | null = current;
      while (node) {
        path.unshift({ x: node.x, y: node.y });
        node = node.parent;
      }
      return path.slice(1);
    }

    for (const dir of directions) {
      const nx = current.x + dir.dx;
      const ny = current.y + dir.dy;
      const key = `${nx},${ny}`;
      if (!visited.has(key) && (renderer.isWalkable(nx, ny) || (nx === endX && ny === endY))) {
        visited.add(key);
        queue.push({ x: nx, y: ny, parent: current });
      }
    }
  }

  return [];
}

function makeGrid(w: number, h: number, walkable: boolean = true): SceneLayout {
  return {
    width: w,
    height: h,
    tiles: Array.from({ length: h }, () =>
      Array.from({ length: w }, () => ({ type: 'floor_wood' as const, walkable }))
    ),
    props: [],
  };
}

describe('BFS Pathfinding', () => {
  it('should return empty path for same start and end', () => {
    const layout = makeGrid(5, 5);
    const renderer = new MockTileRenderer(layout);
    expect(bfsPath(renderer, 2, 2, 2, 2)).toEqual([]);
  });

  it('should find straight horizontal path', () => {
    const layout = makeGrid(5, 5);
    const renderer = new MockTileRenderer(layout);
    const path = bfsPath(renderer, 0, 0, 3, 0);
    expect(path).toHaveLength(3);
    expect(path[path.length - 1]).toEqual({ x: 3, y: 0 });
  });

  it('should find straight vertical path', () => {
    const layout = makeGrid(5, 5);
    const renderer = new MockTileRenderer(layout);
    const path = bfsPath(renderer, 0, 0, 0, 4);
    expect(path).toHaveLength(4);
    expect(path[path.length - 1]).toEqual({ x: 0, y: 4 });
  });

  it('should navigate around obstacles', () => {
    const layout = makeGrid(5, 5);
    // Block middle row except last column
    layout.tiles[2][0].walkable = false;
    layout.tiles[2][1].walkable = false;
    layout.tiles[2][2].walkable = false;
    layout.tiles[2][3].walkable = false;
    // layout.tiles[2][4] remains walkable

    const renderer = new MockTileRenderer(layout);
    const path = bfsPath(renderer, 0, 0, 0, 4);
    expect(path.length).toBeGreaterThan(4); // Must go around
    expect(path[path.length - 1]).toEqual({ x: 0, y: 4 });
  });

  it('should return empty path when no route exists', () => {
    const layout = makeGrid(5, 5);
    // Block entire row 2
    for (let x = 0; x < 5; x++) layout.tiles[2][x].walkable = false;

    const renderer = new MockTileRenderer(layout);
    const path = bfsPath(renderer, 0, 0, 0, 4);
    expect(path).toEqual([]);
  });

  it('should avoid non-walkable props', () => {
    const layout = makeGrid(5, 5);
    layout.props.push({ type: 'desk', x: 1, y: 0, walkable: false, isWorkstation: true });

    const renderer = new MockTileRenderer(layout);
    const path = bfsPath(renderer, 0, 0, 2, 0);
    // Path should not go through (1, 0)
    const goesThrough = path.some(p => p.x === 1 && p.y === 0);
    expect(goesThrough).toBe(false);
    expect(path[path.length - 1]).toEqual({ x: 2, y: 0 });
  });

  it('should find shortest path (BFS guarantee)', () => {
    const layout = makeGrid(10, 10);
    const renderer = new MockTileRenderer(layout);
    const path = bfsPath(renderer, 0, 0, 5, 5);
    // Manhattan distance is 10, BFS should find a path of length 10
    expect(path).toHaveLength(10);
  });
});
