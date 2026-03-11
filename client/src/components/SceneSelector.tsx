import { useState, useEffect } from 'react';
import * as api from '../lib/api';

interface SceneSelectorProps {
  onSceneCreated: (scene: any) => void;
}

export function SceneSelector({ onSceneCreated }: SceneSelectorProps) {
  const [templates, setTemplates] = useState<{ id: string; name: string; width: number; height: number }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getTemplates().then(setTemplates).catch((e) => setError(e.message));
  }, []);

  const handleSelect = async (templateId: string) => {
    setLoading(true);
    setError('');
    try {
      const scene = await api.createScene(templateId);
      onSceneCreated(scene);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const templateEmojis: Record<string, string> = {
    office: '🏢',
    apartment: '🏠',
    lab: '🔬',
    beach: '🏖️',
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8">
      <h1 className="text-4xl font-bold mb-2" style={{ color: '#9B5DE5' }}>
        Pixel Agent
      </h1>
      <p className="text-[#8888AA] mb-8 text-lg">
        Choose a room for your AI workers
      </p>

      {error && (
        <div className="bg-red-900/30 border border-red-500/50 text-red-300 px-4 py-2 rounded mb-4">
          {error}
        </div>
      )}

      {/* BUG-018 FIX: show loading state while templates fetch */}
      {templates.length === 0 && !error && (
        <p className="text-[#8888AA] animate-pulse mb-4">Loading rooms...</p>
      )}

      <div className="grid grid-cols-2 gap-4 max-w-lg">
        {templates.map((t) => (
          <button
            key={t.id}
            onClick={() => handleSelect(t.id)}
            disabled={loading}
            className="flex flex-col items-center p-6 rounded-xl border border-[#2A2A4A] hover:border-[#9B5DE5] transition-colors cursor-pointer disabled:opacity-50"
            style={{ backgroundColor: '#12122A' }}
          >
            <span className="text-4xl mb-3">{templateEmojis[t.id] || '🏗️'}</span>
            <span className="text-lg font-medium">{t.name}</span>
            <span className="text-sm text-[#8888AA]">
              {t.width}x{t.height} tiles
            </span>
          </button>
        ))}
      </div>

      {loading && (
        <p className="mt-4 text-[#9B5DE5] animate-pulse">Creating your world...</p>
      )}
    </div>
  );
}
