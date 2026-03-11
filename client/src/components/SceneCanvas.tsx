import { useRef, useEffect, useCallback } from 'react';
import type { SceneLayout, Character } from '@shared/types';
import { TileRenderer } from '../canvas/TileRenderer';
import { CharacterEntity } from '../canvas/CharacterEntity';

const TILE_SIZE = 24;

interface SceneCanvasProps {
  layout: SceneLayout;
  characters: Character[];
  onCharacterClick: (character: Character) => void;
  onStateChange?: (characterId: string, state: string, activity?: string) => void;
}

export function SceneCanvas({ layout, characters, onCharacterClick }: SceneCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tileRendererRef = useRef<TileRenderer | null>(null);
  const entitiesRef = useRef<Map<string, CharacterEntity>>(new Map());
  const animFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  // Initialize tile renderer
  useEffect(() => {
    tileRendererRef.current = new TileRenderer(layout, TILE_SIZE);
  }, [layout]);

  // Sync character entities
  useEffect(() => {
    const entities = entitiesRef.current;
    const currentIds = new Set(characters.map((c) => c.id));

    // Remove entities for deleted characters
    for (const [id] of entities) {
      if (!currentIds.has(id)) {
        entities.delete(id);
      }
    }

    // Add/update entities
    for (const char of characters) {
      if (!entities.has(char.id)) {
        entities.set(char.id, new CharacterEntity(char, TILE_SIZE));
      } else {
        const entity = entities.get(char.id)!;
        entity.setState(char.state, char.currentTask || undefined);
      }
    }
  }, [characters]);

  // Click handling
  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Check characters (reverse order for z-ordering — topmost first)
      const entities = Array.from(entitiesRef.current.values()).reverse();
      for (const entity of entities) {
        if (entity.containsPoint(x, y)) {
          const char = characters.find((c) => c.id === entity.id);
          if (char) onCharacterClick(char);
          return;
        }
      }
    },
    [characters, onCharacterClick]
  );

  // Render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    const tileRenderer = tileRendererRef.current;
    if (!canvas || !tileRenderer) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = tileRenderer.canvasWidth;
    canvas.height = tileRenderer.canvasHeight;

    // Disable anti-aliasing for pixel art
    ctx.imageSmoothingEnabled = false;

    const render = (timestamp: number) => {
      const delta = lastTimeRef.current ? timestamp - lastTimeRef.current : 16;
      lastTimeRef.current = timestamp;

      // Clear
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw scene
      tileRenderer.draw(ctx);

      // Update and draw characters (sorted by Y for proper z-ordering)
      const sorted = Array.from(entitiesRef.current.values()).sort(
        (a, b) => a.gridY - b.gridY
      );

      for (const entity of sorted) {
        entity.update(delta);
        entity.draw(ctx);
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [layout]);

  return (
    <canvas
      ref={canvasRef}
      onClick={handleClick}
      className="cursor-pointer border border-[#2A2A4A] rounded-lg"
      style={{ imageRendering: 'pixelated' }}
    />
  );
}
