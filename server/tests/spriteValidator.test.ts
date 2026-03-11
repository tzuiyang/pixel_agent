import { describe, it, expect } from 'vitest';
import { validateSprite, validateFrame } from '../services/spriteGenerator';
import type { SpriteData, AnimationFrame } from '../../shared/types';

function makeFrame(w: number, h: number, color: string | null = null): AnimationFrame {
  return Array.from({ length: h }, () => Array.from({ length: w }, () => color));
}

describe('validateSprite', () => {
  it('should accept a valid 16x16 sprite with multiple frames', () => {
    const sprite: SpriteData = {
      width: 16,
      height: 16,
      frames: {
        idle_1: [makeFrame(16, 16, '#FF0000')],
        idle_2: [makeFrame(16, 16, '#00FF00')],
        work: [makeFrame(16, 16, '#0000FF')],
      },
    };
    expect(() => validateSprite(sprite)).not.toThrow();
  });

  it('should accept a valid 32x32 sprite', () => {
    const sprite: SpriteData = {
      width: 32,
      height: 32,
      frames: {
        idle: [makeFrame(32, 32, '#AABBCC')],
      },
    };
    expect(() => validateSprite(sprite)).not.toThrow();
  });

  it('should reject sprite with missing width', () => {
    const sprite = { height: 16, frames: { idle: [makeFrame(16, 16)] } } as any;
    expect(() => validateSprite(sprite)).toThrow('missing required fields');
  });

  it('should reject sprite with missing frames', () => {
    const sprite = { width: 16, height: 16 } as any;
    expect(() => validateSprite(sprite)).toThrow('missing required fields');
  });

  it('should reject invalid width', () => {
    const sprite: SpriteData = {
      width: 24,
      height: 16,
      frames: { idle: [makeFrame(24, 16)] },
    };
    expect(() => validateSprite(sprite)).toThrow('Invalid sprite width: 24');
  });

  it('should reject sprite with no frames', () => {
    const sprite: SpriteData = { width: 16, height: 16, frames: {} };
    expect(() => validateSprite(sprite)).toThrow('at least one frame');
  });

  it('should accept null pixels (transparency)', () => {
    const sprite: SpriteData = {
      width: 16,
      height: 16,
      frames: { idle: [makeFrame(16, 16, null)] },
    };
    expect(() => validateSprite(sprite)).not.toThrow();
  });

  it('should accept mixed colors and nulls', () => {
    const frame = makeFrame(16, 16, null);
    frame[5][5] = '#FF0000';
    frame[10][10] = '#00FF00';
    const sprite: SpriteData = { width: 16, height: 16, frames: { idle: [frame] } };
    expect(() => validateSprite(sprite)).not.toThrow();
  });

  it('should accept "transparent" as a pixel value', () => {
    const frame = makeFrame(16, 16, null);
    (frame[0][0] as any) = 'transparent';
    const sprite: SpriteData = { width: 16, height: 16, frames: { idle: [frame] } };
    expect(() => validateSprite(sprite)).not.toThrow();
  });

  it('should auto-wrap a bare frame (not wrapped in array)', () => {
    const sprite: SpriteData = {
      width: 16,
      height: 16,
      frames: {
        idle_1: makeFrame(16, 16, '#FF0000') as any, // bare frame, not [frame]
      },
    };
    expect(() => validateSprite(sprite)).not.toThrow();
    // After validation, it should be wrapped
    expect(Array.isArray(sprite.frames.idle_1)).toBe(true);
  });
});

describe('validateFrame', () => {
  it('should accept a correctly sized frame', () => {
    const frame = makeFrame(16, 16, '#ABCDEF');
    expect(() => validateFrame(frame, 16, 16, 'test')).not.toThrow();
  });

  it('should reject frame with wrong row count', () => {
    const frame = makeFrame(16, 10, '#ABCDEF');
    expect(() => validateFrame(frame, 16, 16, 'test')).toThrow('10 rows, expected 16');
  });

  it('should reject frame with wrong column count', () => {
    const frame = makeFrame(16, 16, '#ABCDEF');
    frame[0] = Array(12).fill('#ABCDEF');
    expect(() => validateFrame(frame, 16, 16, 'test')).toThrow('12 cols, expected 16');
  });

  it('should reject invalid hex color', () => {
    const frame = makeFrame(16, 16, '#ABCDEF');
    frame[0][0] = 'red'; // not a hex color
    expect(() => validateFrame(frame, 16, 16, 'test')).toThrow('Invalid pixel color');
  });

  it('should accept shorthand hex colors', () => {
    const frame = makeFrame(16, 16, '#FFF');
    expect(() => validateFrame(frame, 16, 16, 'test')).not.toThrow();
  });

  it('should accept 8-digit hex (with alpha)', () => {
    const frame = makeFrame(16, 16, '#FF000080');
    expect(() => validateFrame(frame, 16, 16, 'test')).not.toThrow();
  });

  it('should reject non-array frame', () => {
    expect(() => validateFrame('not a frame' as any, 16, 16, 'test')).toThrow('not a 2D array');
  });

  it('should reject non-array row', () => {
    const frame: any = Array(16).fill('not an array');
    expect(() => validateFrame(frame, 16, 16, 'test')).toThrow('not an array');
  });
});
