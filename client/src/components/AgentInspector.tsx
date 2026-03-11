import { useState, useEffect } from 'react';
import Markdown from 'react-markdown';
import * as api from '../lib/api';
import type { Character, Task } from '@shared/types';
import { soundManager } from '../lib/soundManager';

interface AgentInspectorProps {
  character: Character;
  onClose: () => void;
  onTaskAssigned: () => void;
  onDelete: (id: string) => void;
}

const STATE_LABELS: Record<string, { label: string; color: string }> = {
  idle: { label: 'Idle', color: '#8888AA' },
  working: { label: 'Working', color: '#FFD166' },
  thinking: { label: 'Thinking', color: '#9B5DE5' },
  waiting: { label: 'Waiting for input', color: '#FFD166' },
  done: { label: 'Done!', color: '#06D6A0' },
  error: { label: 'Error', color: '#EF476F' },
};

export function AgentInspector({ character, onClose, onTaskAssigned, onDelete }: AgentInspectorProps) {
  const [taskInput, setTaskInput] = useState('');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Load task history
  useEffect(() => {
    api.getCharacterTasks(character.id).then(setTasks).catch(() => {});
  }, [character.id, character.state]);

  const handleAssign = async () => {
    if (!taskInput.trim() || taskInput.length < 5) return;
    setLoading(true);
    setError('');
    try {
      await api.assignTask(character.id, taskInput.trim());
      soundManager.play('assign');
      setTaskInput('');
      onTaskAssigned();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAssign();
    }
  };

  const stateInfo = STATE_LABELS[character.state] || STATE_LABELS.idle;
  const latestTask = tasks[0];
  const canAssign = character.state === 'idle' || character.state === 'done' || character.state === 'error';

  return (
    <div
      className="fixed right-0 top-0 h-full w-96 border-l border-[#2A2A4A] shadow-2xl overflow-y-auto z-40"
      style={{ backgroundColor: '#12122A' }}
    >
      {/* Header */}
      <div className="flex justify-between items-center p-4 border-b border-[#2A2A4A]">
        <div>
          <h2 className="text-lg font-bold">{character.name}</h2>
          <p className="text-xs text-[#8888AA]">{character.description}</p>
        </div>
        {/* BUG-025 FIX: proper close button */}
        <button onClick={onClose} className="text-[#8888AA] hover:text-white text-lg leading-none cursor-pointer" aria-label="Close">
          &times;
        </button>
      </div>

      {/* Status */}
      <div className="p-4 border-b border-[#2A2A4A]">
        <div className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: stateInfo.color }}
          />
          <span className="text-sm" style={{ color: stateInfo.color }}>
            {stateInfo.label}
          </span>
        </div>
        {character.currentTask && (
          <p className="text-sm text-[#8888AA] mt-2">
            Current: {character.currentTask}
          </p>
        )}
      </div>

      {/* Task input */}
      {canAssign && (
        <div className="p-4 border-b border-[#2A2A4A]">
          <label className="block text-sm text-[#8888AA] mb-1">
            What should {character.name} work on?
          </label>
          <textarea
            value={taskInput}
            onChange={(e) => setTaskInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Research the best productivity tools..."
            className="w-full px-3 py-2 rounded-lg border border-[#2A2A4A] text-sm resize-none mb-2"
            style={{ backgroundColor: '#0A0A1A', color: '#E8E8F8' }}
            rows={3}
            maxLength={2000}
          />
          <button
            onClick={handleAssign}
            disabled={loading || taskInput.trim().length < 5}
            className="w-full py-2 rounded-lg font-medium text-white disabled:opacity-50 cursor-pointer"
            style={{ backgroundColor: '#9B5DE5' }}
          >
            {loading ? 'Assigning...' : 'Assign Task'}
          </button>
        </div>
      )}

      {/* Latest task output */}
      {latestTask?.output && (
        <div className="p-4 border-b border-[#2A2A4A]">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-medium">Latest Result</h3>
            <button
              onClick={() => navigator.clipboard.writeText(latestTask.output!)}
              className="text-xs text-[#9B5DE5] hover:text-[#B87DF7] cursor-pointer"
            >
              Copy
            </button>
          </div>
          <p className="text-xs text-[#8888AA] mb-2">{latestTask.prompt}</p>
          <div
            className="text-sm p-3 rounded-lg max-h-64 overflow-y-auto prose prose-invert prose-sm max-w-none"
            style={{ backgroundColor: '#0A0A1A', color: '#C8C8E8' }}
          >
            <Markdown
              components={{
                code: ({ children, className }) => {
                  const isBlock = className?.startsWith('language-');
                  return isBlock ? (
                    <pre className="bg-[#1A1A3A] p-2 rounded overflow-x-auto text-xs"><code>{children}</code></pre>
                  ) : (
                    <code className="bg-[#1A1A3A] px-1 rounded text-xs">{children}</code>
                  );
                },
                pre: ({ children }) => <>{children}</>,
              }}
            >
              {latestTask.output}
            </Markdown>
          </div>
        </div>
      )}

      {/* Task history */}
      {tasks.length > 1 && (
        <div className="p-4 border-b border-[#2A2A4A]">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="text-sm text-[#9B5DE5] hover:text-[#B87DF7] cursor-pointer"
          >
            {showHistory ? 'Hide' : 'Show'} Task History ({tasks.length})
          </button>
          {showHistory && (
            <div className="mt-2 space-y-2">
              {tasks.slice(1).map((task) => (
                <div
                  key={task.id}
                  className="p-2 rounded-lg text-xs"
                  style={{ backgroundColor: '#0A0A1A' }}
                >
                  <p className="text-[#8888AA]">{task.prompt}</p>
                  <p className="text-[#06D6A0] mt-1">
                    {task.status === 'completed' ? 'Completed' : task.status}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="p-4">
          <div className="bg-red-900/30 border border-red-500/50 text-red-300 px-3 py-2 rounded text-sm">
            {error}
          </div>
        </div>
      )}

      {/* BUG-010 FIX: delete with confirmation */}
      <div className="p-4">
        {!confirmDelete ? (
          <button
            onClick={() => setConfirmDelete(true)}
            className="text-xs text-red-400 hover:text-red-300 cursor-pointer"
          >
            Remove Character
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-xs text-red-300">Delete {character.name}?</span>
            <button
              onClick={() => onDelete(character.id)}
              className="text-xs px-2 py-1 rounded bg-red-600 text-white cursor-pointer hover:bg-red-500"
            >
              Yes, delete
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="text-xs px-2 py-1 rounded border border-[#2A2A4A] text-[#8888AA] cursor-pointer hover:text-white"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
