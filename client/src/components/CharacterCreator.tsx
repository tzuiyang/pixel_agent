import { useState, useRef, useEffect } from 'react';
import * as api from '../lib/api';
import type { SpriteData } from '@shared/types';
import { SpriteRenderer } from '../canvas/SpriteRenderer';
import { soundManager } from '../lib/soundManager';

interface CharacterCreatorProps {
  sceneId: string;
  onCharacterCreated: (character: any) => void;
  onClose: () => void;
}

export function CharacterCreator({ sceneId, onCharacterCreated, onClose }: CharacterCreatorProps) {
  const [description, setDescription] = useState('');
  const [name, setName] = useState('');
  const [sprite, setSprite] = useState<SpriteData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  // BUG-019 FIX: reset state when component mounts (key change or reopen)
  useEffect(() => {
    return () => {
      setDescription('');
      setName('');
      setSprite(null);
      setError('');
      setAttempt(0);
    };
  }, []);

  // Render sprite preview
  useEffect(() => {
    if (!sprite || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;

    const renderer = new SpriteRenderer(sprite, 6); // 6x scale for preview
    canvas.width = renderer.pixelWidth;
    canvas.height = renderer.pixelHeight;

    let lastTime = 0;
    const render = (timestamp: number) => {
      const delta = lastTime ? timestamp - lastTime : 16;
      lastTime = timestamp;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Checkerboard background for transparency
      for (let y = 0; y < canvas.height; y += 6) {
        for (let x = 0; x < canvas.width; x += 6) {
          ctx.fillStyle = (Math.floor(x / 6) + Math.floor(y / 6)) % 2 === 0 ? '#1A1A3A' : '#222244';
          ctx.fillRect(x, y, 6, 6);
        }
      }

      renderer.update(delta);
      renderer.draw(ctx, 0, 0);
      animRef.current = requestAnimationFrame(render);
    };

    animRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animRef.current);
  }, [sprite]);

  const handleGenerate = async () => {
    if (!description.trim()) return;
    setLoading(true);
    setError('');
    try {
      const result = await api.generateCharacter(description);
      setSprite(result.sprite);
      setName(result.suggestedName);
      setAttempt((a) => a + 1);
      soundManager.play('click');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!sprite || !name.trim()) return;
    setLoading(true);
    try {
      const character = await api.saveCharacter({
        sceneId,
        name: name.trim(),
        description,
        sprite,
      });
      soundManager.play('create');
      onCharacterCreated(character);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div
        className="rounded-xl p-6 w-full max-w-md border border-[#2A2A4A] shadow-2xl"
        style={{ backgroundColor: '#12122A' }}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold" style={{ color: '#9B5DE5' }}>
            Create Character
          </h2>
          <button onClick={onClose} className="text-[#8888AA] hover:text-white text-lg leading-none cursor-pointer" aria-label="Close">
            &times;
          </button>
        </div>

        {/* Description input */}
        <div className="mb-4">
          <label className="block text-sm text-[#8888AA] mb-1">Describe your character</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="a tiny wizard with a purple robe and glowing staff"
            className="w-full px-3 py-2 rounded-lg border border-[#2A2A4A] text-sm resize-none"
            style={{ backgroundColor: '#0A0A1A', color: '#E8E8F8' }}
            rows={3}
            maxLength={500}
          />
        </div>

        {/* Generate button */}
        {!sprite && (
          <button
            onClick={handleGenerate}
            disabled={loading || !description.trim()}
            className="w-full py-2 rounded-lg font-medium text-white disabled:opacity-50 cursor-pointer"
            style={{ backgroundColor: '#9B5DE5' }}
          >
            {loading ? 'Sketching your character...' : 'Generate Sprite'}
          </button>
        )}

        {/* Sprite preview */}
        {sprite && (
          <div className="flex flex-col items-center mb-4">
            <canvas
              ref={canvasRef}
              style={{ imageRendering: 'pixelated' }}
              className="border border-[#2A2A4A] rounded-lg mb-3"
            />

            {/* Name input */}
            <div className="w-full mb-3">
              <label className="block text-sm text-[#8888AA] mb-1">Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[#2A2A4A] text-sm"
                style={{ backgroundColor: '#0A0A1A', color: '#E8E8F8' }}
                maxLength={20}
              />
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 w-full">
              <button
                onClick={handleAccept}
                disabled={loading || !name.trim()}
                className="flex-1 py-2 rounded-lg font-medium text-white disabled:opacity-50 cursor-pointer"
                style={{ backgroundColor: '#06D6A0' }}
              >
                Accept
              </button>
              <button
                onClick={handleGenerate}
                disabled={loading}
                className="flex-1 py-2 rounded-lg font-medium text-white disabled:opacity-50 cursor-pointer"
                style={{ backgroundColor: '#FFD166', color: '#1A1A3A' }}
              >
                {loading ? 'Regenerating...' : 'Regenerate'}
              </button>
            </div>

            {attempt > 0 && (
              <p className="text-xs text-[#8888AA] mt-2">Attempt {attempt}</p>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mt-3 bg-red-900/30 border border-red-500/50 text-red-300 px-3 py-2 rounded text-sm">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
