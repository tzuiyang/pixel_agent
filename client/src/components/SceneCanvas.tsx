import { useRef, useEffect, useCallback } from 'react';
import type { SceneLayout, Character } from '@shared/types';
import { TileRenderer } from '../canvas/TileRenderer';
import { CharacterEntity } from '../canvas/CharacterEntity';
import * as api from '../lib/api';

const TILE_SIZE = 24;

interface SceneCanvasProps {
  layout: SceneLayout;
  characters: Character[];
  onCharacterClick: (character: Character) => void;
  onTileClick?: (x: number, y: number, isDragStart: boolean) => void;
  editMode?: boolean;
}

export function SceneCanvas({ layout, characters, onCharacterClick, onTileClick, editMode }: SceneCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const tileRendererRef = useRef<TileRenderer | null>(null);
  const entitiesRef = useRef<Map<string, CharacterEntity>>(new Map());
  const animFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const isDragging = useRef(false);

  // Initialize tile renderer
  useEffect(() => {
    tileRendererRef.current = new TileRenderer(layout, TILE_SIZE);
  }, [layout]);

  // Track claimed workstations so multiple characters don't walk to the same one
  const claimedWorkstations = useRef<Set<string>>(new Set());

  // Sync character entities
  useEffect(() => {
    const entities = entitiesRef.current;
    const currentIds = new Set(characters.map((c) => c.id));

    // BUG-022 FIX: remove entities that no longer exist
    for (const [id] of entities) {
      if (!currentIds.has(id)) {
        entities.delete(id);
      }
    }

    for (const char of characters) {
      if (!entities.has(char.id)) {
        entities.set(char.id, new CharacterEntity(char, TILE_SIZE));
      } else {
        const entity = entities.get(char.id)!;
        const prevState = entity.state;
        entity.setState(char.state, char.currentTask || undefined);

        // BUG-008 FIX + IMPROVE 2.2: trigger walk to workstation with reservation
        if (char.state === 'working' && prevState !== 'working' && tileRendererRef.current) {
          entity.moveToWorkstation(tileRendererRef.current, claimedWorkstations.current);
        }

        // Release workstation claim when done/idle
        if ((char.state === 'done' || char.state === 'idle') && (prevState === 'working' || prevState === 'thinking')) {
          const key = `${Math.round(entity.gridX)},${Math.round(entity.gridY)}`;
          claimedWorkstations.current.delete(key);
        }
      }
    }
  }, [characters]);

  // BUG-022 FIX: clear entities when layout changes (scene switch)
  useEffect(() => {
    return () => {
      entitiesRef.current.clear();
    };
  }, []);

  const getTileCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / TILE_SIZE);
    const y = Math.floor((e.clientY - rect.top) / TILE_SIZE);
    return { x, y, canvasX: e.clientX - rect.left, canvasY: e.clientY - rect.top };
  };

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const coords = getTileCoords(e);
      if (!coords) return;

      if (editMode && onTileClick) {
        isDragging.current = true;
        // BUG-016 FIX: pass isDragStart=true on mousedown so undo only pushes once per stroke
        onTileClick(coords.x, coords.y, true);
        return;
      }

      // Check characters (reverse for z-order: front characters first)
      const entities = Array.from(entitiesRef.current.values()).reverse();
      for (const entity of entities) {
        if (entity.containsPoint(coords.canvasX, coords.canvasY)) {
          const char = characters.find((c) => c.id === entity.id);
          if (char) onCharacterClick(char);
          return;
        }
      }
    },
    [characters, onCharacterClick, editMode, onTileClick]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!editMode || !isDragging.current || !onTileClick) return;
      const coords = getTileCoords(e);
      // BUG-016 FIX: isDragStart=false for drag continuation
      if (coords) onTileClick(coords.x, coords.y, false);
    },
    [editMode, onTileClick]
  );

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  // Render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    const tileRenderer = tileRendererRef.current;
    if (!canvas || !tileRenderer) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = tileRenderer.canvasWidth;
    canvas.height = tileRenderer.canvasHeight;
    ctx.imageSmoothingEnabled = false;

    const render = (timestamp: number) => {
      const delta = lastTimeRef.current ? timestamp - lastTimeRef.current : 16;
      lastTimeRef.current = timestamp;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      tileRenderer.draw(ctx);

      // Draw grid overlay in edit mode
      if (editMode) {
        ctx.strokeStyle = 'rgba(155, 93, 229, 0.2)';
        ctx.lineWidth = 0.5;
        for (let x = 0; x <= layout.width; x++) {
          ctx.beginPath();
          ctx.moveTo(x * TILE_SIZE, 0);
          ctx.lineTo(x * TILE_SIZE, layout.height * TILE_SIZE);
          ctx.stroke();
        }
        for (let y = 0; y <= layout.height; y++) {
          ctx.beginPath();
          ctx.moveTo(0, y * TILE_SIZE);
          ctx.lineTo(layout.width * TILE_SIZE, y * TILE_SIZE);
          ctx.stroke();
        }
      }

      const sorted = Array.from(entitiesRef.current.values()).sort(
        (a, b) => a.gridY - b.gridY
      );

      for (const entity of sorted) {
        const wasMoving = entity.moving;
        entity.update(delta);
        entity.draw(ctx);

        // BUG-005 FIX: persist position to DB when character stops moving
        if (wasMoving && !entity.moving) {
          const finalX = Math.round(entity.gridX);
          const finalY = Math.round(entity.gridY);
          api.updateCharacterPosition(entity.id, finalX, finalY).catch(() => {});
        }
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [layout, editMode]);

  return (
    <canvas
      ref={canvasRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      className={`border rounded-lg ${editMode ? 'cursor-crosshair border-[#9B5DE5]' : 'cursor-pointer border-[#2A2A4A]'}`}
      style={{ imageRendering: 'pixelated' }}
    />
  );
}
