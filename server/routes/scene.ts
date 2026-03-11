import { Router, Request, Response } from 'express';
import { v4 as uuid } from 'uuid';
import { getDb } from '../db/index.js';
import { SCENE_TEMPLATES } from '../services/sceneTemplates.js';
import type { Scene } from '../../shared/types.js';

export const sceneRoutes = Router();

// List available templates
sceneRoutes.get('/templates', (_req: Request, res: Response) => {
  const templates = Object.entries(SCENE_TEMPLATES).map(([key, val]) => ({
    id: key,
    name: val.name,
    width: val.layout.width,
    height: val.layout.height,
    propCount: val.layout.props.length,
  }));
  res.json(templates);
});

// Create scene from template
sceneRoutes.post('/create', (req: Request, res: Response) => {
  try {
    const { templateId, name } = req.body;

    const template = SCENE_TEMPLATES[templateId];
    if (!template) {
      res.status(400).json({ error: `Invalid template: ${templateId}. Available: ${Object.keys(SCENE_TEMPLATES).join(', ')}` });
      return;
    }

    const db = getDb();
    const id = uuid();
    const now = new Date().toISOString();
    const layoutJson = JSON.stringify(template.layout);

    db.prepare(`
      INSERT INTO scenes (id, name, layout_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, name || template.name, layoutJson, now, now);

    const scene: Scene = {
      id,
      name: name || template.name,
      layout: template.layout,
      createdAt: now,
      updatedAt: now,
    };

    res.json(scene);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to create scene';
    console.error('Create scene error:', msg);
    res.status(500).json({ error: msg });
  }
});

// Get a scene by ID
sceneRoutes.get('/:id', (req: Request, res: Response) => {
  const db = getDb();
  const row = db.prepare('SELECT * FROM scenes WHERE id = ?').get(req.params.id) as any;

  if (!row) {
    res.status(404).json({ error: 'Scene not found' });
    return;
  }

  res.json(rowToScene(row));
});

// List all scenes
sceneRoutes.get('/', (_req: Request, res: Response) => {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM scenes ORDER BY updated_at DESC').all() as any[];
  res.json(rows.map(rowToScene));
});

// Update scene layout
sceneRoutes.put('/:id', (req: Request, res: Response) => {
  const { layout, name } = req.body;
  const db = getDb();
  const now = new Date().toISOString();

  const existing = db.prepare('SELECT id FROM scenes WHERE id = ?').get(req.params.id);
  if (!existing) {
    res.status(404).json({ error: 'Scene not found' });
    return;
  }

  if (layout) {
    db.prepare('UPDATE scenes SET layout_json = ?, updated_at = ? WHERE id = ?')
      .run(JSON.stringify(layout), now, req.params.id);
  }
  if (name) {
    db.prepare('UPDATE scenes SET name = ?, updated_at = ? WHERE id = ?')
      .run(name, now, req.params.id);
  }

  const updated = db.prepare('SELECT * FROM scenes WHERE id = ?').get(req.params.id) as any;
  res.json(rowToScene(updated));
});

// Delete a scene
sceneRoutes.delete('/:id', (req: Request, res: Response) => {
  const db = getDb();
  const result = db.prepare('DELETE FROM scenes WHERE id = ?').run(req.params.id);
  if (result.changes === 0) {
    res.status(404).json({ error: 'Scene not found' });
    return;
  }
  res.json({ deleted: true });
});

function rowToScene(row: any): Scene {
  return {
    id: row.id,
    name: row.name,
    layout: JSON.parse(row.layout_json),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
