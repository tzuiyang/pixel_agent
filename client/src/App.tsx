import { useState, useEffect, useCallback } from 'react';
import type { Scene, Character } from '@shared/types';
import * as api from './lib/api';
import { wsClient } from './lib/wsClient';
import { SceneSelector } from './components/SceneSelector';
import { SceneCanvas } from './components/SceneCanvas';
import { CharacterCreator } from './components/CharacterCreator';
import { AgentInspector } from './components/AgentInspector';
import { NotificationToast, type Notification } from './components/NotificationToast';
import './App.css';

function App() {
  const [scene, setScene] = useState<Scene | null>(null);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [showCreator, setShowCreator] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [health, setHealth] = useState<{ apiKeyConfigured: boolean } | null>(null);

  // Check health on load
  useEffect(() => {
    api.getHealth().then(setHealth).catch(() => {});
  }, []);

  // Connect WebSocket
  useEffect(() => {
    wsClient.connect();

    const unsub1 = wsClient.on('agent_state_change', (data) => {
      setCharacters((prev) =>
        prev.map((c) =>
          c.id === data.characterId ? { ...c, state: data.state, currentTask: data.activity || c.currentTask } : c
        )
      );

      setSelectedCharacter((prev) => {
        if (!prev || prev.id !== data.characterId) return prev;
        return { ...prev, state: data.state } as Character;
      });
    });

    const unsub2 = wsClient.on('agent_output', (data) => {
      addNotification(`An agent finished their task!`, 'success', data.characterId);

      setCharacters((prev) =>
        prev.map((c) =>
          c.id === data.characterId ? { ...c, state: 'done', currentTask: null } : c
        )
      );
    });

    const unsub3 = wsClient.on('agent_error', (data) => {
      addNotification(`Agent error: ${data.error}`, 'error', data.characterId);
    });

    return () => {
      unsub1();
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

  const addNotification = (message: string, type: Notification['type'], characterId?: string) => {
    const id = Date.now().toString();
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
    setSelectedCharacter(character);
  }, []);

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
            <span className="text-xs text-[#FFD166] mr-2">No API key configured</span>
          )}
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
              setScene(null);
              setCharacters([]);
              setSelectedCharacter(null);
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
        />
      </div>

      {/* Bottom hint */}
      {characters.length === 0 && (
        <div className="text-center pb-4">
          <p className="text-[#8888AA] text-sm">
            Click <span style={{ color: '#9B5DE5' }}>+ New Agent</span> to create your first character
          </p>
        </div>
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
      {selectedCharacter && (
        <AgentInspector
          character={selectedCharacter}
          onClose={() => setSelectedCharacter(null)}
          onTaskAssigned={() => {
            api.getSceneCharacters(scene.id).then(setCharacters);
          }}
          onDelete={handleDeleteCharacter}
        />
      )}

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
