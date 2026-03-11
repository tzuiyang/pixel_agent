// ─── Agent States ────────────────────────────────────

export type AgentState = 'idle' | 'working' | 'thinking' | 'waiting' | 'done' | 'error';

export const AGENT_STATES: AgentState[] = ['idle', 'working', 'thinking', 'waiting', 'done', 'error'];

export const AGENT_STATE_TRANSITIONS: Record<AgentState, AgentState[]> = {
  idle: ['working'],
  working: ['thinking', 'waiting', 'done', 'error'],
  thinking: ['working', 'error'],
  waiting: ['working'],
  done: ['idle'],
  error: ['idle'],
};

// ─── Sprites ─────────────────────────────────────────

export type AnimationFrame = (string | null)[][]; // 2D grid of hex colors or null (transparent)

export interface SpriteData {
  width: number;   // 16 or 32
  height: number;
  frames: Record<string, AnimationFrame[]>; // e.g. { idle: [frame1, frame2], walk: [frame1, frame2] }
}

// ─── Characters ──────────────────────────────────────

export interface Character {
  id: string;
  sceneId: string;
  name: string;
  description: string;
  sprite: SpriteData;
  positionX: number;
  positionY: number;
  state: AgentState;
  currentTask: string | null;
  createdAt: string;
}

export interface CharacterCreateRequest {
  description: string;
}

export interface CharacterSaveRequest {
  sceneId: string;
  name: string;
  description: string;
  sprite: SpriteData;
  positionX?: number;
  positionY?: number;
}

// ─── Scenes ──────────────────────────────────────────

export type TileType =
  | 'floor_wood' | 'floor_stone' | 'floor_grass' | 'floor_sand' | 'floor_carpet'
  | 'wall_brick' | 'wall_glass' | 'wall_hedge'
  | 'empty';

export type PropType =
  | 'desk' | 'chair' | 'bookshelf' | 'plant' | 'computer' | 'coffee_machine'
  | 'lamp' | 'rug' | 'couch' | 'bed' | 'table' | 'server_rack' | 'monitor'
  | 'tree' | 'bench' | 'hammock' | 'palm_tree' | 'tiki_desk';

export interface Tile {
  type: TileType;
  walkable: boolean;
}

export interface Prop {
  type: PropType;
  x: number;
  y: number;
  walkable: boolean;
  isWorkstation: boolean;
}

export interface SceneLayout {
  width: number;
  height: number;
  tiles: Tile[][];     // [y][x]
  props: Prop[];
}

export interface Scene {
  id: string;
  name: string;
  layout: SceneLayout;
  createdAt: string;
  updatedAt: string;
}

// ─── Tasks ───────────────────────────────────────────

export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface Task {
  id: string;
  characterId: string;
  prompt: string;
  status: TaskStatus;
  output: string | null;
  activityLog: ActivityEntry[];
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

export interface ActivityEntry {
  timestamp: string;
  label: string;
  detail?: string;
}

// ─── WebSocket Events ────────────────────────────────

export type WSEvent =
  | { type: 'agent_state_change'; characterId: string; state: AgentState; activity?: string }
  | { type: 'agent_activity'; characterId: string; label: string; detail?: string }
  | { type: 'agent_output'; characterId: string; taskId: string; output: string }
  | { type: 'agent_error'; characterId: string; taskId: string; error: string }
  | { type: 'scene_update'; scene: Scene }
  | { type: 'character_update'; character: Character };

// ─── API Responses ───────────────────────────────────

export interface HealthResponse {
  status: 'ok' | 'degraded';
  apiKeyConfigured: boolean;
  dbReady: boolean;
  timestamp: string;
}

export interface SpriteGenerationResponse {
  sprite: SpriteData;
  suggestedName: string;
}
