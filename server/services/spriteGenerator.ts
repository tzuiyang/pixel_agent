import Anthropic from '@anthropic-ai/sdk';
import type { SpriteData, AnimationFrame } from '../../shared/types.js';

const SPRITE_SYSTEM_PROMPT = `You are a pixel art character designer. You generate 16x16 pixel art sprites as JSON color grids.

RULES:
- Output ONLY valid JSON, no markdown, no explanation
- Each frame is a 16x16 2D array of hex color strings or null for transparent pixels
- Use a LIMITED palette of 6-10 colors max
- Characters should be cute, clear, and recognizable at small size
- Include clean outlines (1px dark border around the character)
- Character should face forward and be centered in the grid
- Leave 1-2 pixels of padding on each side
- NO gradients, NO sub-pixel details, NO anti-aliasing
- Use null for transparent/empty pixels (background)

OUTPUT FORMAT:
{
  "width": 16,
  "height": 16,
  "frames": {
    "idle_1": [["#hex"|null, ...], ...],  // 16 rows of 16 values
    "idle_2": [["#hex"|null, ...], ...],  // slight variation (e.g. blink or weight shift)
    "work": [["#hex"|null, ...], ...]     // working pose (leaning forward, arms on desk)
  }
}

GOOD EXAMPLE — a tiny blue robot:
- Body: #4A90D9 (blue), #3A7BC8 (darker blue for shading)
- Eyes: #FFFFFF (white), #333333 (pupils)
- Outline: #2D2D2D
- Antenna: #FFD700 (gold)
- Background: null

BAD EXAMPLE (DON'T DO THIS):
- Using 30+ colors
- Gradients or dithering
- Character too small (3x3 pixels) or too large (fills entire grid)
- No outline making character blend into background`;

export async function generateSprite(description: string): Promise<{ sprite: SpriteData; suggestedName: string }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not configured');
  }

  const client = new Anthropic({ apiKey });

  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 8000,
    temperature: 0.9,
    system: SPRITE_SYSTEM_PROMPT,
    messages: [
      {
        role: 'user',
        content: `Generate a 16x16 pixel art sprite for: "${description}"

Return the JSON sprite data with frames: idle_1, idle_2, and work.
After the JSON, on a new line, write SUGGESTED_NAME: followed by a short cute name for this character.`,
      },
    ],
  });

  const text = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('');

  // Parse sprite JSON
  const jsonMatch = text.match(/\{[\s\S]*"frames"[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Failed to parse sprite JSON from response');
  }

  let spriteData: SpriteData;
  try {
    spriteData = JSON.parse(jsonMatch[0]);
  } catch {
    throw new Error('Invalid JSON in sprite response');
  }

  // Validate sprite structure
  validateSprite(spriteData);

  // Parse suggested name
  const nameMatch = text.match(/SUGGESTED_NAME:\s*(.+)/i);
  const suggestedName = nameMatch ? nameMatch[1].trim() : 'Pixel';

  return { sprite: spriteData, suggestedName };
}

function validateSprite(sprite: SpriteData): void {
  if (!sprite.width || !sprite.height || !sprite.frames) {
    throw new Error('Sprite missing required fields: width, height, frames');
  }

  if (sprite.width !== 16 && sprite.width !== 32) {
    throw new Error(`Invalid sprite width: ${sprite.width}. Must be 16 or 32.`);
  }

  if (sprite.height !== 16 && sprite.height !== 32) {
    throw new Error(`Invalid sprite height: ${sprite.height}. Must be 16 or 32.`);
  }

  const frameNames = Object.keys(sprite.frames);
  if (frameNames.length === 0) {
    throw new Error('Sprite must have at least one frame');
  }

  for (const frameName of frameNames) {
    const frames = sprite.frames[frameName];
    if (!Array.isArray(frames)) {
      // Single frame, wrap it
      sprite.frames[frameName] = [frames as unknown as AnimationFrame];
      continue;
    }

    // Handle case where frames is directly a 2D grid (single frame not wrapped in array)
    if (frames.length === sprite.height && Array.isArray(frames[0]) && typeof frames[0][0] === 'string' || frames[0][0] === null) {
      sprite.frames[frameName] = [frames as unknown as AnimationFrame];
      continue;
    }

    for (const frame of frames) {
      validateFrame(frame, sprite.width, sprite.height, frameName);
    }
  }
}

function validateFrame(frame: AnimationFrame, width: number, height: number, frameName: string): void {
  if (!Array.isArray(frame)) {
    throw new Error(`Frame "${frameName}" is not a 2D array`);
  }

  if (frame.length !== height) {
    throw new Error(`Frame "${frameName}" has ${frame.length} rows, expected ${height}`);
  }

  for (let y = 0; y < frame.length; y++) {
    const row = frame[y];
    if (!Array.isArray(row)) {
      throw new Error(`Frame "${frameName}" row ${y} is not an array`);
    }
    if (row.length !== width) {
      throw new Error(`Frame "${frameName}" row ${y} has ${row.length} cols, expected ${width}`);
    }

    for (const pixel of row) {
      if (pixel !== null && pixel !== 'transparent') {
        if (typeof pixel !== 'string' || !pixel.match(/^#[0-9a-fA-F]{3,8}$/)) {
          throw new Error(`Invalid pixel color "${pixel}" in frame "${frameName}"`);
        }
      }
    }
  }
}

export { validateSprite, validateFrame };
