import type { SpriteData, AnimationFrame } from '@shared/types';

const PIXEL_ART_FPS = 5;

export class SpriteRenderer {
  private sprite: SpriteData;
  private scale: number;
  private currentAnimation: string = 'idle_1';
  private frameIndex: number = 0;
  private frameTimer: number = 0;
  private frameInterval: number = 1000 / PIXEL_ART_FPS;

  // Code-based animation
  private bounceOffset: number = 0;
  private bouncePhase: number = 0;

  // Sprite cache: pre-rendered frames as offscreen canvases
  private frameCache = new Map<string, OffscreenCanvas>();

  constructor(sprite: SpriteData, scale: number = 3) {
    this.sprite = sprite;
    this.scale = scale;
    this.prebakeFrames();
  }

  private prebakeFrames() {
    for (const [animName, frames] of Object.entries(this.sprite.frames)) {
      const resolvedFrames = Array.isArray(frames[0]?.[0])
        ? (frames as AnimationFrame[])
        : [frames as unknown as AnimationFrame];

      resolvedFrames.forEach((frame, i) => {
        const key = `${animName}:${i}`;
        const offscreen = new OffscreenCanvas(this.pixelWidth, this.pixelHeight);
        const octx = offscreen.getContext('2d')!;
        for (let py = 0; py < this.sprite.height; py++) {
          for (let px = 0; px < this.sprite.width; px++) {
            const color = frame[py]?.[px];
            if (color && color !== 'transparent') {
              octx.fillStyle = color;
              octx.fillRect(px * this.scale, py * this.scale, this.scale, this.scale);
            }
          }
        }
        this.frameCache.set(key, offscreen);
      });
    }
  }

  get pixelWidth(): number {
    return this.sprite.width * this.scale;
  }

  get pixelHeight(): number {
    return this.sprite.height * this.scale;
  }

  setAnimation(name: string) {
    const available = Object.keys(this.sprite.frames);
    if (available.includes(name)) {
      if (this.currentAnimation !== name) {
        this.currentAnimation = name;
        this.frameIndex = 0;
        this.frameTimer = 0;
      }
    }
  }

  update(deltaMs: number) {
    // BUG-015 FIX: use appropriate frame interval — don't double-add deltaMs
    const effectiveInterval = this.currentAnimation.startsWith('idle')
      ? this.frameInterval * 2  // slower cycling for idle
      : this.frameInterval;

    this.frameTimer += deltaMs;
    if (this.frameTimer >= effectiveInterval) {
      this.frameTimer -= effectiveInterval;
      const frames = this.getFrames();
      if (frames.length > 1) {
        this.frameIndex = (this.frameIndex + 1) % frames.length;
      }
    }

    // Bounce animation
    this.bouncePhase += deltaMs * 0.003;
    this.bounceOffset = Math.sin(this.bouncePhase) * 1.5;
  }

  draw(ctx: CanvasRenderingContext2D, x: number, y: number) {
    const drawY = y + this.bounceOffset;
    const idx = this.frameIndex % Math.max(1, this.getFrames().length);
    const cacheKey = `${this.currentAnimation}:${idx}`;
    const cached = this.frameCache.get(cacheKey);

    if (cached) {
      ctx.drawImage(cached, x, drawY);
      return;
    }

    // Fallback to per-pixel rendering if cache miss
    const frames = this.getFrames();
    if (frames.length === 0) return;
    const frame = frames[idx];

    for (let py = 0; py < this.sprite.height; py++) {
      for (let px = 0; px < this.sprite.width; px++) {
        const color = frame[py]?.[px];
        if (color && color !== 'transparent') {
          ctx.fillStyle = color;
          ctx.fillRect(
            x + px * this.scale,
            drawY + py * this.scale,
            this.scale,
            this.scale
          );
        }
      }
    }
  }

  drawPreview(ctx: CanvasRenderingContext2D, x: number, y: number, previewScale?: number) {
    const s = previewScale || this.scale;
    const frames = this.getFrames();
    if (frames.length === 0) return;
    const frame = frames[0];

    for (let py = 0; py < this.sprite.height; py++) {
      for (let px = 0; px < this.sprite.width; px++) {
        const color = frame[py]?.[px];
        if (color && color !== 'transparent') {
          ctx.fillStyle = color;
          ctx.fillRect(x + px * s, y + py * s, s, s);
        }
      }
    }
  }

  private getFrames(): AnimationFrame[] {
    let frames = this.sprite.frames[this.currentAnimation];
    if (!frames) {
      // Fallback: try first available animation
      const keys = Object.keys(this.sprite.frames);
      if (keys.length > 0) {
        frames = this.sprite.frames[keys[0]];
      }
    }
    if (!frames) return [];
    // Handle case where frames is a bare frame (not wrapped in array)
    if (!Array.isArray(frames[0]?.[0]) && frames.length > 0) {
      return [frames as unknown as AnimationFrame];
    }
    return frames;
  }
}
