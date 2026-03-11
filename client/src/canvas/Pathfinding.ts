import type { TileRenderer } from './TileRenderer';

interface Node {
  x: number;
  y: number;
  g: number;
  parent: Node | null;
}

export function bfsPath(
  tileRenderer: TileRenderer,
  startX: number,
  startY: number,
  endX: number,
  endY: number
): { x: number; y: number }[] {
  if (startX === endX && startY === endY) return [];

  const visited = new Set<string>();
  const queue: Node[] = [{ x: startX, y: startY, g: 0, parent: null }];
  visited.add(`${startX},${startY}`);

  const directions = [
    { dx: 0, dy: -1 },
    { dx: 0, dy: 1 },
    { dx: -1, dy: 0 },
    { dx: 1, dy: 0 },
  ];

  while (queue.length > 0) {
    const current = queue.shift()!;

    if (current.x === endX && current.y === endY) {
      // Reconstruct path
      const path: { x: number; y: number }[] = [];
      let node: Node | null = current;
      while (node) {
        path.unshift({ x: node.x, y: node.y });
        node = node.parent;
      }
      return path.slice(1); // remove start position
    }

    for (const dir of directions) {
      const nx = current.x + dir.dx;
      const ny = current.y + dir.dy;
      const key = `${nx},${ny}`;

      if (!visited.has(key) && (tileRenderer.isWalkable(nx, ny) || (nx === endX && ny === endY))) {
        visited.add(key);
        queue.push({ x: nx, y: ny, g: current.g + 1, parent: current });
      }
    }
  }

  return []; // No path found
}
