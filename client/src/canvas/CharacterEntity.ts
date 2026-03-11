import type { Character, AgentState } from '@shared/types';
import { SpriteRenderer } from './SpriteRenderer';
import { SpeechBubble } from './SpeechBubble';
import { bfsPath } from './Pathfinding';
import type { TileRenderer } from './TileRenderer';

const MOVE_SPEED = 0.05; // tiles per ms

export class CharacterEntity {
  id: string;
  name: string;
  state: AgentState;
  spriteRenderer: SpriteRenderer;
  speechBubble: SpeechBubble;

  // Position in grid coordinates (float for smooth movement)
  gridX: number;
  gridY: number;
  targetPath: { x: number; y: number }[] = [];
  moving: boolean = false;

  private tileSize: number;

  constructor(character: Character, tileSize: number) {
    this.id = character.id;
    this.name = character.name;
    this.state = character.state;
    this.gridX = character.positionX;
    this.gridY = character.positionY;
    this.tileSize = tileSize;
    this.spriteRenderer = new SpriteRenderer(character.sprite, 3);
    this.speechBubble = new SpeechBubble();
  }

  setState(state: AgentState, activity?: string) {
    this.state = state;

    // Map state to animation
    const animMap: Record<AgentState, string> = {
      idle: 'idle_1',
      working: 'work',
      thinking: 'idle_1',
      waiting: 'idle_1',
      done: 'idle_1',
      error: 'idle_1',
    };
    this.spriteRenderer.setAnimation(animMap[state] || 'idle_1');

    // Map state to speech bubble
    const bubbleMap: Record<AgentState, { text: string; style: SpeechBubble extends { style: infer S } ? never : string }> = {
      idle: { text: '', style: 'normal' },
      working: { text: activity || 'Working...', style: 'normal' },
      thinking: { text: activity || 'Thinking...', style: 'thought' },
      waiting: { text: activity || 'Your turn!', style: 'waiting' },
      done: { text: 'Done! Click me', style: 'success' },
      error: { text: activity || 'Something went wrong', style: 'error' },
    };

    const bubble = bubbleMap[state];
    if (bubble.text) {
      this.speechBubble.setText(bubble.text, bubble.style as any);
    } else {
      this.speechBubble.hide();
    }
  }

  moveTo(path: { x: number; y: number }[]) {
    this.targetPath = path;
    this.moving = path.length > 0;
  }

  moveToWorkstation(tileRenderer: TileRenderer) {
    const target = tileRenderer.findNearestWorkstation(Math.round(this.gridX), Math.round(this.gridY));
    if (target) {
      const path = bfsPath(tileRenderer, Math.round(this.gridX), Math.round(this.gridY), target.x, target.y);
      this.moveTo(path);
    }
  }

  update(deltaMs: number) {
    this.spriteRenderer.update(deltaMs);
    this.speechBubble.update(deltaMs);

    // Movement
    if (this.moving && this.targetPath.length > 0) {
      const target = this.targetPath[0];
      const dx = target.x - this.gridX;
      const dy = target.y - this.gridY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 0.1) {
        this.gridX = target.x;
        this.gridY = target.y;
        this.targetPath.shift();
        if (this.targetPath.length === 0) {
          this.moving = false;
        }
      } else {
        const step = MOVE_SPEED * deltaMs;
        this.gridX += (dx / dist) * Math.min(step, dist);
        this.gridY += (dy / dist) * Math.min(step, dist);
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    const px = this.gridX * this.tileSize;
    const py = this.gridY * this.tileSize;

    // Center sprite on tile
    const spriteW = this.spriteRenderer.pixelWidth;
    const spriteH = this.spriteRenderer.pixelHeight;
    const drawX = px + (this.tileSize - spriteW) / 2;
    const drawY = py + (this.tileSize - spriteH) / 2 - 8; // offset up slightly

    this.spriteRenderer.draw(ctx, drawX, drawY);

    // Name tag
    ctx.save();
    ctx.font = '9px monospace';
    ctx.fillStyle = '#E8E8F8';
    ctx.textAlign = 'center';
    ctx.fillText(this.name, px + this.tileSize / 2, drawY + spriteH + 10);
    ctx.restore();

    // Speech bubble
    this.speechBubble.draw(ctx, px + this.tileSize / 2, drawY - 4);
  }

  containsPoint(canvasX: number, canvasY: number): boolean {
    const px = this.gridX * this.tileSize;
    const py = this.gridY * this.tileSize;
    const spriteW = this.spriteRenderer.pixelWidth;
    const spriteH = this.spriteRenderer.pixelHeight;
    const drawX = px + (this.tileSize - spriteW) / 2;
    const drawY = py + (this.tileSize - spriteH) / 2 - 8;

    return (
      canvasX >= drawX &&
      canvasX <= drawX + spriteW &&
      canvasY >= drawY &&
      canvasY <= drawY + spriteH + 16
    );
  }
}
