import type { SceneLayout, TileType, PropType } from '@shared/types';

// Color mappings for tile types
const TILE_COLORS: Record<TileType, string> = {
  floor_wood: '#8B6914',
  floor_stone: '#6B6B6B',
  floor_grass: '#3A7D44',
  floor_sand: '#D4B483',
  floor_carpet: '#4A3B6B',
  wall_brick: '#5C3A21',
  wall_glass: '#7BC8F6',
  wall_hedge: '#2D5A27',
  empty: '#000000',
};

// Secondary colors for floor patterns
const TILE_ACCENTS: Partial<Record<TileType, string>> = {
  floor_wood: '#9B7924',
  floor_stone: '#7B7B7B',
  floor_grass: '#4A8D54',
  floor_carpet: '#5A4B7B',
};

// Color mappings for prop types
const PROP_COLORS: Record<PropType, { fill: string; accent: string }> = {
  desk: { fill: '#6B4E2F', accent: '#8B6E4F' },
  chair: { fill: '#4A4A6A', accent: '#5A5A7A' },
  bookshelf: { fill: '#5C3A21', accent: '#8B5E3C' },
  plant: { fill: '#2D7D32', accent: '#4CAF50' },
  computer: { fill: '#333344', accent: '#6666FF' },
  coffee_machine: { fill: '#444444', accent: '#8B4513' },
  lamp: { fill: '#FFD700', accent: '#FFA000' },
  rug: { fill: '#8B3A62', accent: '#A85080' },
  couch: { fill: '#4A3B6B', accent: '#6A5B8B' },
  bed: { fill: '#5577AA', accent: '#7799CC' },
  table: { fill: '#6B4E2F', accent: '#8B6E4F' },
  server_rack: { fill: '#222233', accent: '#00FF66' },
  monitor: { fill: '#222233', accent: '#4488FF' },
  tree: { fill: '#2D5A27', accent: '#4A8D3E' },
  bench: { fill: '#8B6914', accent: '#A08020' },
  hammock: { fill: '#D4A574', accent: '#E8C494' },
  palm_tree: { fill: '#2D7D32', accent: '#8B6914' },
  tiki_desk: { fill: '#B8860B', accent: '#D4A574' },
};

export class TileRenderer {
  private layout: SceneLayout;
  private tileSize: number;

  constructor(layout: SceneLayout, tileSize: number = 24) {
    this.layout = layout;
    this.tileSize = tileSize;
  }

  get canvasWidth(): number {
    return this.layout.width * this.tileSize;
  }

  get canvasHeight(): number {
    return this.layout.height * this.tileSize;
  }

  setLayout(layout: SceneLayout) {
    this.layout = layout;
  }

  draw(ctx: CanvasRenderingContext2D) {
    // Draw tiles
    for (let y = 0; y < this.layout.height; y++) {
      for (let x = 0; x < this.layout.width; x++) {
        const tile = this.layout.tiles[y]?.[x];
        if (!tile) continue;

        const px = x * this.tileSize;
        const py = y * this.tileSize;

        // Base color
        ctx.fillStyle = TILE_COLORS[tile.type] || '#000000';
        ctx.fillRect(px, py, this.tileSize, this.tileSize);

        // Floor pattern (subtle grid lines for floors)
        if (tile.type.startsWith('floor_')) {
          const accent = TILE_ACCENTS[tile.type];
          if (accent && (x + y) % 2 === 0) {
            ctx.fillStyle = accent;
            ctx.globalAlpha = 0.15;
            ctx.fillRect(px, py, this.tileSize, this.tileSize);
            ctx.globalAlpha = 1;
          }

          // Grid line
          ctx.strokeStyle = 'rgba(0,0,0,0.1)';
          ctx.lineWidth = 0.5;
          ctx.strokeRect(px, py, this.tileSize, this.tileSize);
        }

        // Wall highlight
        if (tile.type.startsWith('wall_')) {
          ctx.fillStyle = 'rgba(0,0,0,0.3)';
          ctx.fillRect(px, py + this.tileSize - 2, this.tileSize, 2);
        }
      }
    }

    // Draw props
    for (const prop of this.layout.props) {
      this.drawProp(ctx, prop.type, prop.x, prop.y, prop.isWorkstation);
    }
  }

  private drawProp(ctx: CanvasRenderingContext2D, type: PropType, x: number, y: number, isWorkstation: boolean) {
    const px = x * this.tileSize;
    const py = y * this.tileSize;
    const colors = PROP_COLORS[type] || { fill: '#555555', accent: '#777777' };
    const s = this.tileSize;
    const pad = Math.floor(s * 0.15);

    // Main body
    ctx.fillStyle = colors.fill;
    ctx.fillRect(px + pad, py + pad, s - pad * 2, s - pad * 2);

    // Accent detail (smaller rectangle inside)
    ctx.fillStyle = colors.accent;
    const accentPad = Math.floor(s * 0.3);
    ctx.fillRect(px + accentPad, py + accentPad, s - accentPad * 2, s - accentPad * 2);

    // Workstation indicator
    if (isWorkstation) {
      ctx.fillStyle = '#FFD700';
      ctx.globalAlpha = 0.4;
      ctx.fillRect(px, py, s, 2);
      ctx.globalAlpha = 1;
    }
  }

  gridToPixel(gridX: number, gridY: number): { x: number; y: number } {
    return { x: gridX * this.tileSize, y: gridY * this.tileSize };
  }

  pixelToGrid(pixelX: number, pixelY: number): { x: number; y: number } {
    return {
      x: Math.floor(pixelX / this.tileSize),
      y: Math.floor(pixelY / this.tileSize),
    };
  }

  isWalkable(gridX: number, gridY: number): boolean {
    if (gridX < 0 || gridY < 0 || gridX >= this.layout.width || gridY >= this.layout.height) {
      return false;
    }
    const tile = this.layout.tiles[gridY]?.[gridX];
    if (!tile?.walkable) return false;

    // Check props
    for (const prop of this.layout.props) {
      if (prop.x === gridX && prop.y === gridY && !prop.walkable) {
        return false;
      }
    }
    return true;
  }

  findNearestWorkstation(fromX: number, fromY: number): { x: number; y: number } | null {
    const workstations = this.layout.props.filter((p) => p.isWorkstation);
    if (workstations.length === 0) return null;

    let closest = workstations[0];
    let minDist = Infinity;

    for (const ws of workstations) {
      const dist = Math.abs(ws.x - fromX) + Math.abs(ws.y - fromY);
      if (dist < minDist) {
        minDist = dist;
        closest = ws;
      }
    }

    // Find walkable tile adjacent to workstation
    const adjacents = [
      { x: closest.x, y: closest.y + 1 },
      { x: closest.x, y: closest.y - 1 },
      { x: closest.x + 1, y: closest.y },
      { x: closest.x - 1, y: closest.y },
    ];

    for (const adj of adjacents) {
      if (this.isWalkable(adj.x, adj.y)) {
        return adj;
      }
    }

    return null;
  }
}
