import { getDb } from '../db/index.js';
import { executeTask, getOrCreateMachine } from './taskExecutor.js';
import { WSManager } from './wsManager.js';
import type { Character } from '../../shared/types.js';

export interface Pipeline {
  id: string;
  sceneId: string;
  steps: PipelineStep[];
  status: 'pending' | 'running' | 'completed' | 'failed';
  currentStep: number;
  createdAt: string;
}

export interface PipelineStep {
  characterId: string;
  promptTemplate: string;  // Can include {{previousOutput}}
  status: 'pending' | 'running' | 'completed' | 'failed';
  taskId?: string;
  output?: string;
}

// In-memory pipeline storage (could be persisted to DB later)
const pipelines = new Map<string, Pipeline>();

export function createPipeline(
  id: string,
  sceneId: string,
  steps: { characterId: string; promptTemplate: string }[]
): Pipeline {
  const pipeline: Pipeline = {
    id,
    sceneId,
    steps: steps.map((s) => ({
      characterId: s.characterId,
      promptTemplate: s.promptTemplate,
      status: 'pending',
    })),
    status: 'pending',
    currentStep: 0,
    createdAt: new Date().toISOString(),
  };
  pipelines.set(id, pipeline);
  return pipeline;
}

export function getPipeline(id: string): Pipeline | undefined {
  return pipelines.get(id);
}

export function listPipelines(sceneId: string): Pipeline[] {
  return Array.from(pipelines.values()).filter((p) => p.sceneId === sceneId);
}

export async function runPipeline(pipeline: Pipeline): Promise<void> {
  const db = getDb();
  pipeline.status = 'running';

  for (let i = 0; i < pipeline.steps.length; i++) {
    pipeline.currentStep = i;
    const step = pipeline.steps[i];

    // Get character from DB
    const row = db.prepare('SELECT * FROM characters WHERE id = ?').get(step.characterId) as any;
    if (!row) {
      step.status = 'failed';
      pipeline.status = 'failed';
      return;
    }

    const character: Character = {
      id: row.id,
      sceneId: row.scene_id,
      name: row.name,
      description: row.description,
      sprite: JSON.parse(row.sprite_json),
      positionX: row.position_x,
      positionY: row.position_y,
      state: row.state,
      currentTask: row.current_task,
      createdAt: row.created_at,
    };

    // Build prompt with previous output injected
    let prompt = step.promptTemplate;
    if (i > 0 && pipeline.steps[i - 1].output) {
      prompt = prompt.replace('{{previousOutput}}', pipeline.steps[i - 1].output!);
    }

    // Reset state machine
    const machine = getOrCreateMachine(character.id);
    if (machine.getState() === 'done' || machine.getState() === 'error') {
      machine.transition('idle');
    }

    step.status = 'running';

    // Broadcast handoff event
    if (i > 0) {
      WSManager.broadcast({
        type: 'agent_activity',
        characterId: pipeline.steps[i - 1].characterId,
        label: `Passing work to ${character.name}...`,
      });
    }

    try {
      const task = await executeTask(character, prompt);
      step.status = 'completed';
      step.taskId = task.id;
      step.output = task.output || '';
    } catch (err) {
      step.status = 'failed';
      pipeline.status = 'failed';
      return;
    }
  }

  pipeline.status = 'completed';
}

export function deletePipeline(id: string): boolean {
  return pipelines.delete(id);
}
