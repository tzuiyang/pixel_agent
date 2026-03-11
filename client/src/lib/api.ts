const BASE = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || `Request failed: ${res.status}`);
  }

  return data as T;
}

// Health
export const getHealth = () => request<{ status: string; apiKeyConfigured: boolean; dbReady: boolean }>('/health');

// Scenes
export const getTemplates = () => request<{ id: string; name: string; width: number; height: number }[]>('/scene/templates');
export const createScene = (templateId: string, name?: string) =>
  request('/scene/create', { method: 'POST', body: JSON.stringify({ templateId, name }) });
export const getScene = (id: string) => request(`/scene/${id}`);
export const getScenes = () => request<any[]>('/scene');
export const deleteScene = (id: string) => request(`/scene/${id}`, { method: 'DELETE' });

// Characters
export const generateCharacter = (description: string) =>
  request<{ sprite: any; suggestedName: string }>('/character/generate', {
    method: 'POST',
    body: JSON.stringify({ description }),
  });
export const saveCharacter = (data: { sceneId: string; name: string; description: string; sprite: any; positionX?: number; positionY?: number }) =>
  request('/character/save', { method: 'POST', body: JSON.stringify(data) });
export const getSceneCharacters = (sceneId: string) => request<any[]>(`/character/scene/${sceneId}`);
export const deleteCharacter = (id: string) => request(`/character/${id}`, { method: 'DELETE' });

// Tasks
export const assignTask = (characterId: string, prompt: string) =>
  request('/task/assign', { method: 'POST', body: JSON.stringify({ characterId, prompt }) });
export const getCharacterTasks = (characterId: string) => request<any[]>(`/task/character/${characterId}`);
export const getTask = (id: string) => request(`/task/${id}`);
