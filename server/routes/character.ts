import { Router, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { getDb } from '../db/index.js';
import { generateSprite } from '../services/spriteGenerator.js';
import { removeMachine } from '../services/taskExecutor.js';
import type { Character, CharacterSaveRequest } from '../../shared/types.js';

export const characterRoutes = Router();

// Generate a new sprite from description
characterRoutes.post('/generate', async (req: Request, res: Response) => {
  try {
    const { description } = req.body;
    if (!description || typeof description !== 'string' || description.length < 3) {
      res.status(400).json({ error: 'Description must be at least 3 characters' });
      return;
    }
    if (description.length > 500) {
      res.status(400).json({ error: 'Description must be under 500 characters' });
      return;
    }

    const result = await generateSprite(description);
    res.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Sprite generation failed';
    console.error('Sprite generation error:', msg);
    res.status(500).json({ error: msg });
  }
});

// Save an accepted character to a scene
characterRoutes.post('/save', (req: Request, res: Response) => {
  try {
    const body: CharacterSaveRequest = req.body;

    if (!body.sceneId || !body.name || !body.description || !body.sprite) {
      res.status(400).json({ error: 'Missing required fields: sceneId, name, description, sprite' });
      return;
    }

    const db = getDb();

    // Verify scene exists
    const scene = db.prepare('SELECT id FROM scenes WHERE id = ?').get(body.sceneId);
    if (!scene) {
      res.status(404).json({ error: 'Scene not found' });
      return;
    }

    // Check character limit per scene (max 5)
    const count = db.prepare('SELECT COUNT(*) as count FROM characters WHERE scene_id = ?').get(body.sceneId) as { count: number };
    if (count.count >= 5) {
      res.status(400).json({ error: 'Maximum 5 characters per scene' });
      return;
    }

    const id = uuid();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO characters (id, scene_id, name, description, sprite_json, position_x, position_y, state, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'idle', ?)
    `).run(id, body.sceneId, body.name, body.description, JSON.stringify(body.sprite), body.positionX ?? 5, body.positionY ?? 5, now);

    const character: Character = {
      id,
      sceneId: body.sceneId,
      name: body.name,
      description: body.description,
      sprite: body.sprite,
      positionX: body.positionX ?? 5,
      positionY: body.positionY ?? 5,
      state: 'idle',
      currentTask: null,
      createdAt: now,
    };

    res.json(character);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to save character';
    console.error('Save character error:', msg);
    res.status(500).json({ error: msg });
  }
});

// Get a character by ID
characterRoutes.get('/:id', (req: Request, res: Response) => {
  const db = getDb();
  const row = db.prepare('SELECT * FROM characters WHERE id = ?').get(req.params.id) as any;

  if (!row) {
    res.status(404).json({ error: 'Character not found' });
    return;
  }

  res.json(rowToCharacter(row));
});

// List characters in a scene
characterRoutes.get('/scene/:sceneId', (req: Request, res: Response) => {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM characters WHERE scene_id = ?').all(req.params.sceneId) as any[];
  res.json(rows.map(rowToCharacter));
});

// Delete a character
characterRoutes.delete('/:id', (req: Request, res: Response) => {
  const db = getDb();
  const result = db.prepare('DELETE FROM characters WHERE id = ?').run(req.params.id);
  if (result.changes === 0) {
    res.status(404).json({ error: 'Character not found' });
    return;
  }
  removeMachine(req.params.id);
  res.json({ deleted: true });
});

function rowToCharacter(row: any): Character {
  return {
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
}
