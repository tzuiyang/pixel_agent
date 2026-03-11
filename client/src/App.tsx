import { useState, useEffect, useCallback, useRef } from 'react';
import type { Scene, Character, SceneLayout } from '@shared/types';
import * as api from './lib/api';
import { wsClient } from './lib/wsClient';
import { SceneSelector } from './components/SceneSelector';
import { SceneCanvas } from './components/SceneCanvas';
import { CharacterCreator } from './components/CharacterCreator';
import { AgentInspector } from './components/AgentInspector';
import { NotificationToast, type Notification } from './components/NotificationToast';
import { OnboardingGuide } from './components/OnboardingGuide';
import { SceneEditor } from './components/SceneEditor';
import { ActivityStream, type ActivityEntry } from './components/ActivityStream';
import './App.css';

// BUG-011 FIX: unique notification IDs
let notifCounter = 0;

// BUG-026 FIX: detect platform for shortcut labels
const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.userAgent);
const modKey = isMac ? 'Cmd' : 'Ctrl';

function App() {
  const [scene, setScene] = useState<Scene | null>(null);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [showCreator, setShowCreator] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [health, setHealth] = useState<{ apiKeyConfigured: boolean } | null>(null);
  const [taskAssignedOnce, setTaskAssignedOnce] = useState(false);
  const [showActivityStream, setShowActivityStream] = useState(false);
  const [activityEntries, setActivityEntries] = useState<ActivityEntry[]>([]);
  const activityIdRef = useRef(0);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Check health on load
  useEffect(() => {
    api.getHealth().then(setHealth).catch(() => {});
  }, []);

  // Connect WebSocket
  useEffect(() => {
    wsClient.connect();

    const unsub1 = wsClient.on('agent_state_change', (data) => {
      setCharacters((prev) => {
        const char = prev.find((c) => c.id === data.characterId);
        if (char) addActivity(data.characterId, char.name, `State: ${data.state}${data.activity ? ` — ${data.activity}` : ''}`, 'state');
        return prev.map((c) =>
          c.id === data.characterId ? { ...c, state: data.state, currentTask: data.activity || c.currentTask } : c
        );
      });

      setSelectedCharacter((prev) => {
        if (!prev || prev.id !== data.characterId) return prev;
        return { ...prev, state: data.state } as Character;
      });
    });

    // BUG-013 FIX: handle agent_activity events for real-time speech bubble updates
    const unsubActivity = wsClient.on('agent_activity', (data) => {
      setCharacters((prev) => {
        const char = prev.find((c) => c.id === data.characterId);
        if (char) addActivity(data.characterId, char.name, data.label, 'activity');
        return prev.map((c) =>
          c.id === data.characterId ? { ...c, currentTask: data.label } : c
        );
      });
    });

    const unsub2 = wsClient.on('agent_output', (data) => {
      // BUG-006 FIX: include character name in notification
      setCharacters((prev) => {
        const char = prev.find((c) => c.id === data.characterId);
        const name = char?.name || 'An agent';
        addNotification(`${name} finished their task!`, 'success', data.characterId);
        addActivity(data.characterId, name, data.output?.slice(0, 100) || 'Task completed', 'output');
        return prev.map((c) =>
          c.id === data.characterId ? { ...c, state: 'done', currentTask: null } : c
        );
      });
    });

    const unsub3 = wsClient.on('agent_error', (data) => {
      setCharacters((prev) => {
        const char = prev.find((c) => c.id === data.characterId);
        const name = char?.name || 'Agent';
        addNotification(`${name} error: ${data.error}`, 'error', data.characterId);
        addActivity(data.characterId, name, data.error, 'error');
        return prev;
      });
    });

    return () => {
      unsub1();
      unsubActivity();
      unsub2();
      unsub3();
      wsClient.disconnect();
    };
  }, []);

  // Load existing scene
  useEffect(() => {
    api.getScenes().then((scenes) => {
      if (scenes.length > 0) {
        setScene(scenes[0]);
        api.getSceneCharacters(scenes[0].id).then(setCharacters);
      }
    }).catch(() => {});
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      // BUG-021 FIX: don't fire shortcuts when typing in inputs
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        if (e.key === 'Escape') {
          // Allow escape to blur input
          target.blur();
        }
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key === 'e') {
        e.preventDefault();
        setShowEditor((prev) => !prev);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault();
        setScene((s) => {
          if (s) setShowCreator(true);
          return s;
        });
      }
      if (e.key === 'Escape') {
        if (showCreator) setShowCreator(false);
        else if (selectedCharacter) setSelectedCharacter(null);
        else if (showEditor) setShowEditor(false);
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [showCreator, selectedCharacter, showEditor]);

  const addActivity = useCallback((characterId: string, characterName: string, text: string, type: ActivityEntry['type']) => {
    const now = new Date();
    const timestamp = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
    setActivityEntries((prev) => [
      ...prev.slice(-199),
      { id: ++activityIdRef.current, timestamp, characterName, characterId, text, type },
    ]);
  }, []);

  const addNotification = (message: string, type: Notification['type'], characterId?: string) => {
    // BUG-011 FIX: monotonic counter instead of Date.now()
    const id = `notif-${++notifCounter}`;
    setNotifications((prev) => [...prev, { id, message, type, characterId }]);
  };

  const handleSceneCreated = (newScene: Scene) => {
    setScene(newScene);
    setCharacters([]);
  };

  const handleCharacterCreated = (character: Character) => {
    setCharacters((prev) => [...prev, character]);
    setShowCreator(false);
    addNotification(`${character.name} joined your world!`, 'info');
  };

  const handleCharacterClick = useCallback((character: Character) => {
    if (!showEditor) setSelectedCharacter(character);
  }, [showEditor]);

  const handleDeleteCharacter = async (id: string) => {
    try {
      await api.deleteCharacter(id);
      setCharacters((prev) => prev.filter((c) => c.id !== id));
      setSelectedCharacter(null);
    } catch (e: any) {
      addNotification(e.message, 'error');
    }
  };

  const handleDismissNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  // BUG-002 FIX: use functional updater to avoid stale closure
  // BUG-017 FIX: use api helper instead of raw fetch
  const handleLayoutChange = useCallback((newLayout: SceneLayout) => {
    setScene((prev) => {
      if (!prev) return prev;

      // Debounced auto-save
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        api.updateScene(prev.id, newLayout).catch(() => {});
      }, 2000);

      return { ...prev, layout: newLayout };
    });
  }, []);

  // No scene yet — show selector
  if (!scene) {
    return <SceneSelector onSceneCreated={handleSceneCreated} />;
  }

  return (
    <div className="flex flex-col h-screen" style={{ backgroundColor: '#0A0A1A' }}>
      {/* Top bar */}
      <div
        className="flex items-center justify-between px-4 py-2 border-b border-[#2A2A4A]"
        style={{ backgroundColor: '#12122A' }}
      >
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold" style={{ color: '#9B5DE5' }}>
            Pixel Agent
          </h1>
          <span className="text-sm text-[#8888AA]">{scene.name}</span>
          <span className="text-xs text-[#555577]">
            {characters.length}/5 agents
          </span>
        </div>
        <div className="flex items-center gap-2">
          {health && !health.apiKeyConfigured && (
            <span className="text-xs text-[#FFD166] mr-2">No API key</span>
          )}
          <button
            onClick={() => setShowActivityStream((prev) => !prev)}
            className={`px-3 py-1 rounded-lg text-sm font-medium cursor-pointer ${
              showActivityStream ? 'text-white' : 'text-[#8888AA] hover:text-white'
            }`}
            style={{
              backgroundColor: showActivityStream ? '#06D6A0' : 'transparent',
              color: showActivityStream ? '#1A1A3A' : undefined,
              border: showActivityStream ? 'none' : '1px solid #2A2A4A',
            }}
          >
            {showActivityStream ? 'Stream' : 'Activity'}
          </button>
          <button
            onClick={() => setShowEditor((prev) => !prev)}
            className={`px-3 py-1 rounded-lg text-sm font-medium cursor-pointer ${
              showEditor ? 'text-white' : 'text-[#8888AA] hover:text-white'
            }`}
            style={{
              backgroundColor: showEditor ? '#FFD166' : 'transparent',
              color: showEditor ? '#1A1A3A' : undefined,
              border: showEditor ? 'none' : '1px solid #2A2A4A',
            }}
          >
            {showEditor ? 'Editing' : 'Edit Scene'}
          </button>
          <button
            onClick={() => setShowCreator(true)}
            disabled={characters.length >= 5}
            className="px-3 py-1 rounded-lg text-sm font-medium text-white disabled:opacity-50 cursor-pointer"
            style={{ backgroundColor: '#9B5DE5' }}
          >
            + New Agent
          </button>
          <button
            onClick={() => {
              // BUG-022 FIX: clean state on scene switch
              setScene(null);
              setCharacters([]);
              setSelectedCharacter(null);
              setShowEditor(false);
              setShowCreator(false);
            }}
            className="px-3 py-1 rounded-lg text-sm text-[#8888AA] hover:text-white border border-[#2A2A4A] cursor-pointer"
          >
            Switch Room
          </button>
        </div>
      </div>

      {/* Main area */}
      <div className="flex-1 flex items-center justify-center overflow-auto p-4">
        <SceneCanvas
          layout={scene.layout}
          characters={characters}
          onCharacterClick={handleCharacterClick}
          editMode={showEditor}
          onTileClick={showEditor ? (x, y, isDragStart) => {
            window.dispatchEvent(new CustomEvent('scene-editor-click', { detail: { x, y, isDragStart } }));
          } : undefined}
        />
      </div>

      {/* Bottom bar with keyboard hints */}
      <div
        className="flex items-center justify-between px-4 py-1.5 border-t border-[#2A2A4A] text-xs text-[#555577]"
        style={{ backgroundColor: '#12122A' }}
      >
        <div className="flex gap-4">
          {characters.length === 0 && (
            <span>Click <span style={{ color: '#9B5DE5' }}>+ New Agent</span> to start</span>
          )}
          {characters.length > 0 && !showEditor && (
            <span>Click a character to inspect or assign tasks</span>
          )}
          {showEditor && (
            <span style={{ color: '#FFD166' }}>Click tiles to paint — drag to fill</span>
          )}
        </div>
        <div className="flex gap-3">
          <span>{modKey}+N new agent</span>
          <span>{modKey}+E edit scene</span>
          <span>Esc close</span>
        </div>
      </div>

      {/* Activity Stream panel */}
      {showActivityStream && !showEditor && (
        <ActivityStream
          entries={activityEntries}
          onClose={() => setShowActivityStream(false)}
          onCharacterClick={(charId) => {
            const char = characters.find((c) => c.id === charId);
            if (char) setSelectedCharacter(char);
          }}
        />
      )}

      {/* BUG-001 FIX: SceneEditor directly handles tile clicks via CustomEvent */}
      {showEditor && (
        <SceneEditor
          layout={scene.layout}
          onLayoutChange={handleLayoutChange}
          onClose={() => setShowEditor(false)}
        />
      )}

      {/* Character creator modal */}
      {showCreator && (
        <CharacterCreator
          sceneId={scene.id}
          onCharacterCreated={handleCharacterCreated}
          onClose={() => setShowCreator(false)}
        />
      )}

      {/* Agent inspector panel */}
      {selectedCharacter && !showEditor && (
        <AgentInspector
          character={selectedCharacter}
          onClose={() => setSelectedCharacter(null)}
          onTaskAssigned={() => {
            setTaskAssignedOnce(true);
            api.getSceneCharacters(scene.id).then(setCharacters);
          }}
          onDelete={handleDeleteCharacter}
        />
      )}

      {/* Onboarding guide */}
      <OnboardingGuide
        step={taskAssignedOnce ? 'task-assigned' : characters.length > 0 ? 'has-characters' : 'scene-created'}
      />

      {/* Notifications */}
      <NotificationToast
        notifications={notifications}
        onDismiss={handleDismissNotification}
        onCharacterClick={(charId) => {
          const char = characters.find((c) => c.id === charId);
          if (char) setSelectedCharacter(char);
        }}
      />
    </div>
  );
}

export default App;
