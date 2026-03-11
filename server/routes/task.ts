import { Router, Request, Response } from 'express';
import { getDb } from '../db/index.js';
import { executeTask, getOrCreateMachine } from '../services/taskExecutor.js';
import type { Character, Task, ActivityEntry } from '../../shared/types.js';

export const taskRoutes = Router();

// Assign a task to a character
taskRoutes.post('/assign', async (req: Request, res: Response) => {
  try {
    const { characterId, prompt } = req.body;

    if (!characterId || !prompt) {
      res.status(400).json({ error: 'Missing characterId or prompt' });
      return;
    }

    if (typeof prompt !== 'string' || prompt.length < 5) {
      res.status(400).json({ error: 'Task prompt must be at least 5 characters' });
      return;
    }

    if (prompt.length > 2000) {
      res.status(400).json({ error: 'Task prompt must be under 2000 characters' });
      return;
    }

    const db = getDb();
    const row = db.prepare('SELECT * FROM characters WHERE id = ?').get(characterId) as any;

    if (!row) {
      res.status(404).json({ error: 'Character not found' });
      return;
    }

    if (row.state === 'working' || row.state === 'thinking') {
      res.status(400).json({ error: 'Character is already working on a task' });
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

    // Reset state machine if needed
    const machine = getOrCreateMachine(characterId);
    if (machine.getState() === 'done' || machine.getState() === 'error') {
      machine.transition('idle');
    }

    // Execute task asynchronously — respond immediately
    res.json({ status: 'started', characterId, prompt });

    // Fire and forget — task runs in background
    executeTask(character, prompt).catch((err) => {
      console.error(`Task execution failed for ${characterId}:`, err);
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to assign task';
    console.error('Assign task error:', msg);
    res.status(500).json({ error: msg });
  }
});

// Get tasks for a character
taskRoutes.get('/character/:characterId', (req: Request, res: Response) => {
  const db = getDb();
  const rows = db.prepare(
    'SELECT * FROM tasks WHERE character_id = ? ORDER BY created_at DESC LIMIT 10'
  ).all(req.params.characterId) as any[];

  res.json(rows.map(rowToTask));
});

// Get a specific task
taskRoutes.get('/:id', (req: Request, res: Response) => {
  const db = getDb();
  const row = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id) as any;

  if (!row) {
    res.status(404).json({ error: 'Task not found' });
    return;
  }

  res.json(rowToTask(row));
});

function rowToTask(row: any): Task {
  return {
    id: row.id,
    characterId: row.character_id,
    prompt: row.prompt,
    status: row.status,
    output: row.output,
    activityLog: JSON.parse(row.activity_log_json) as ActivityEntry[],
    startedAt: row.started_at,
    completedAt: row.completed_at,
    createdAt: row.created_at,
  };
}
