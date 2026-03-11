import { useState, useEffect, useRef } from 'react';

export interface ActivityEntry {
  id: number;
  timestamp: string;
  characterName: string;
  characterId: string;
  text: string;
  type: 'state' | 'activity' | 'output' | 'error';
}

interface ActivityStreamProps {
  entries: ActivityEntry[];
  onClose: () => void;
  onCharacterClick?: (characterId: string) => void;
}

const TYPE_COLORS: Record<string, string> = {
  state: '#9B5DE5',
  activity: '#8888AA',
  output: '#06D6A0',
  error: '#EF476F',
};

export function ActivityStream({ entries, onClose, onCharacterClick }: ActivityStreamProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  useEffect(() => {
    if (autoScroll) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [entries.length, autoScroll]);

  return (
    <div
      className="fixed left-0 top-0 h-full w-80 border-r border-[#2A2A4A] shadow-2xl z-40 flex flex-col"
      style={{ backgroundColor: '#12122A' }}
    >
      <div className="flex justify-between items-center p-4 border-b border-[#2A2A4A]">
        <h2 className="text-lg font-bold" style={{ color: '#06D6A0' }}>
          Activity Stream
        </h2>
        <button
          onClick={onClose}
          className="text-[#8888AA] hover:text-white text-lg leading-none cursor-pointer"
          aria-label="Close"
        >
          &times;
        </button>
      </div>

      <div
        className="flex-1 overflow-y-auto p-3 space-y-1"
        onScroll={(e) => {
          const el = e.currentTarget;
          const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
          setAutoScroll(atBottom);
        }}
      >
        {entries.length === 0 && (
          <p className="text-sm text-[#555577] text-center mt-8">
            No activity yet. Assign a task to get started.
          </p>
        )}
        {entries.map((entry) => (
          <div
            key={entry.id}
            className="text-xs py-1 border-b border-[#1A1A3A] cursor-pointer hover:bg-[#1A1A3A] px-1 rounded"
            onClick={() => onCharacterClick?.(entry.characterId)}
          >
            <span className="text-[#555577]">{entry.timestamp}</span>{' '}
            <span style={{ color: TYPE_COLORS[entry.type] || '#8888AA' }}>
              {entry.characterName}
            </span>
            <span className="text-[#8888AA]">
              {': '}
              {entry.type === 'output'
                ? entry.text.slice(0, 60) + (entry.text.length > 60 ? '...' : '')
                : entry.text}
            </span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="p-2 border-t border-[#2A2A4A] text-xs text-[#555577] text-center">
        {entries.length} events
      </div>
    </div>
  );
}
