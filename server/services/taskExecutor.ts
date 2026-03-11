import Anthropic from '@anthropic-ai/sdk';
import { v4 as uuid } from 'uuid';
import { getDb } from '../db/index.js';
import { AgentStateMachine } from './agentStateMachine.js';
import { WSManager } from './wsManager.js';
import type { Task, ActivityEntry, Character } from '../../shared/types.js';

// Active state machines per character
const agentMachines = new Map<string, AgentStateMachine>();

// Concurrency control
const MAX_CONCURRENT = 3;
const activeTasks = new Set<string>(); // character IDs with running tasks
const taskQueue: { character: Character; prompt: string; resolve: (t: Task) => void; reject: (e: Error) => void }[] = [];

export function getOrCreateMachine(characterId: string, initialState: 'idle' | 'working' = 'idle'): AgentStateMachine {
  let machine = agentMachines.get(characterId);
  if (!machine) {
    machine = new AgentStateMachine(characterId, initialState);
    agentMachines.set(characterId, machine);
  }
  return machine;
}

export function removeMachine(characterId: string): void {
  agentMachines.delete(characterId);
  activeTasks.delete(characterId);
}

export function getActiveTaskCount(): number {
  return activeTasks.size;
}

export function getQueueLength(): number {
  return taskQueue.length;
}

export function isCharacterBusy(characterId: string): boolean {
  return activeTasks.has(characterId);
}

export async function executeTask(character: Character, prompt: string): Promise<Task> {
  // If already at max concurrency, queue it
  if (activeTasks.size >= MAX_CONCURRENT) {
    return new Promise<Task>((resolve, reject) => {
      taskQueue.push({ character, prompt, resolve, reject });
      const machine = getOrCreateMachine(character.id);
      if (machine.getState() === 'idle') {
        machine.transition('working', 'Queued — waiting for a slot...');
      }
      machine.emitActivity(`Queued (position ${taskQueue.length})`);
    });
  }

  return runTask(character, prompt);
}

async function runTask(character: Character, prompt: string): Promise<Task> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured');

  const db = getDb();
  const taskId = uuid();
  const now = new Date().toISOString();

  activeTasks.add(character.id);

  // Create task in DB
  db.prepare(`
    INSERT INTO tasks (id, character_id, prompt, status, activity_log_json, started_at, created_at)
    VALUES (?, ?, ?, 'running', '[]', ?, ?)
  `).run(taskId, character.id, prompt, now, now);

  // Update character state
  db.prepare(`UPDATE characters SET state = 'working', current_task = ? WHERE id = ?`)
    .run(prompt, character.id);

  const machine = getOrCreateMachine(character.id);
  if (machine.getState() !== 'working') {
    if (machine.canTransitionTo('working')) {
      machine.transition('working', 'Starting task...');
    }
  } else {
    machine.emitActivity('Starting task...');
  }

  const activityLog: ActivityEntry[] = [];

  // Get scene context for multi-agent awareness
  const sceneContext = buildSceneContext(character);

  try {
    const client = new Anthropic({ apiKey });

    machine.emitActivity('Thinking about the task...');
    addActivity(activityLog, 'Thinking about the task...');

    // Use streaming for real-time activity updates
    const stream = client.messages.stream({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      temperature: 0.8,
      system: `You are ${character.name}, a pixel art character in a virtual world. You have this personality based on your appearance: "${character.description}".

${sceneContext}

Complete tasks in a helpful, focused way. Be concise but thorough. Format your response in clean markdown when appropriate.`,
      messages: [{ role: 'user', content: prompt }],
    });

    let output = '';
    let chunkCount = 0;

    stream.on('text', (text) => {
      output += text;
      chunkCount++;

      // Emit activity updates at intervals
      if (chunkCount === 3) {
        machine.emitActivity('Forming ideas...');
        addActivity(activityLog, 'Forming ideas...');
      } else if (chunkCount === 10) {
        machine.emitActivity('Writing response...');
        addActivity(activityLog, 'Writing response...');
      } else if (chunkCount === 25) {
        machine.emitActivity('Almost done...');
        addActivity(activityLog, 'Almost done...');
      }
    });

    await stream.finalMessage();

    addActivity(activityLog, 'Finished writing response');

    // Save completed task
    db.prepare(`
      UPDATE tasks SET status = 'completed', output = ?, activity_log_json = ?, completed_at = ?
      WHERE id = ?
    `).run(output, JSON.stringify(activityLog), new Date().toISOString(), taskId);

    db.prepare(`UPDATE characters SET state = 'done', current_task = NULL WHERE id = ?`)
      .run(character.id);

    machine.transition('done', 'Task complete!');

    WSManager.broadcast({
      type: 'agent_output',
      characterId: character.id,
      taskId,
      output,
    });

    const task: Task = {
      id: taskId,
      characterId: character.id,
      prompt,
      status: 'completed',
      output,
      activityLog,
      startedAt: now,
      completedAt: new Date().toISOString(),
      createdAt: now,
    };

    activeTasks.delete(character.id);
    processQueue();

    return task;
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
    addActivity(activityLog, `Error: ${errorMsg}`);

    db.prepare(`
      UPDATE tasks SET status = 'failed', output = ?, activity_log_json = ?, completed_at = ?
      WHERE id = ?
    `).run(errorMsg, JSON.stringify(activityLog), new Date().toISOString(), taskId);

    db.prepare(`UPDATE characters SET state = 'error', current_task = NULL WHERE id = ?`)
      .run(character.id);

    if (machine.canTransitionTo('error')) {
      machine.transition('error', errorMsg);
    }

    WSManager.broadcast({
      type: 'agent_error',
      characterId: character.id,
      taskId,
      error: errorMsg,
    });

    activeTasks.delete(character.id);
    processQueue();

    throw err;
  }
}

function processQueue() {
  while (taskQueue.length > 0 && activeTasks.size < MAX_CONCURRENT) {
    const next = taskQueue.shift()!;
    runTask(next.character, next.prompt).then(next.resolve).catch(next.reject);
  }

  // Update queue positions
  taskQueue.forEach((item, i) => {
    const machine = getOrCreateMachine(item.character.id);
    machine.emitActivity(`Queued (position ${i + 1})`);
  });
}

function buildSceneContext(character: Character): string {
  try {
    const db = getDb();
    const others = db.prepare(
      'SELECT name, description, state, current_task FROM characters WHERE scene_id = ? AND id != ?'
    ).all(character.sceneId, character.id) as any[];

    if (others.length === 0) return '';

    const lines = others.map((o) => {
      const status = o.current_task ? `working on: ${o.current_task}` : o.state;
      return `- ${o.name} (${o.description}) — ${status}`;
    });

    return `Other agents in your scene:\n${lines.join('\n')}\nYou can reference them if relevant, but focus on your own task.`;
  } catch {
    return '';
  }
}

function addActivity(log: ActivityEntry[], label: string, detail?: string) {
  log.push({ timestamp: new Date().toISOString(), label, detail });
}
