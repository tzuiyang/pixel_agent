import Anthropic from '@anthropic-ai/sdk';
import { v4 as uuid } from 'uuid';
import { getDb } from '../db/index.js';
import { AgentStateMachine } from './agentStateMachine.js';
import { WSManager } from './wsManager.js';
import type { Task, ActivityEntry, Character } from '../../shared/types.js';

// Active state machines per character
const agentMachines = new Map<string, AgentStateMachine>();

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
}

export async function executeTask(character: Character, prompt: string): Promise<Task> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured');

  const db = getDb();
  const taskId = uuid();
  const now = new Date().toISOString();

  // Create task in DB
  db.prepare(`
    INSERT INTO tasks (id, character_id, prompt, status, activity_log_json, started_at, created_at)
    VALUES (?, ?, ?, 'running', '[]', ?, ?)
  `).run(taskId, character.id, prompt, now, now);

  // Update character state
  db.prepare(`UPDATE characters SET state = 'working', current_task = ? WHERE id = ?`)
    .run(prompt, character.id);

  const machine = getOrCreateMachine(character.id);
  if (machine.getState() === 'idle') {
    machine.transition('working', 'Starting task...');
  }

  const activityLog: ActivityEntry[] = [];

  try {
    const client = new Anthropic({ apiKey });

    machine.emitActivity('Thinking about the task...');
    addActivity(activityLog, 'Thinking about the task...');

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      temperature: 0.8,
      system: `You are ${character.name}, a pixel art character in a virtual world. You have this personality based on your appearance: "${character.description}".

Complete tasks in a helpful, focused way. Be concise but thorough. Format your response in clean markdown when appropriate.`,
      messages: [{ role: 'user', content: prompt }],
    });

    const output = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('\n');

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

    return {
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

    throw err;
  }
}

function addActivity(log: ActivityEntry[], label: string, detail?: string) {
  log.push({ timestamp: new Date().toISOString(), label, detail });
}
