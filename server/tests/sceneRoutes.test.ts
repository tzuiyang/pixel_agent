import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { SCENE_TEMPLATES } from '../services/sceneTemplates';

const TEST_DB_PATH = path.resolve(__dirname, '../../test_scene_routes.db');
const SCHEMA_PATH = path.resolve(__dirname, '../db/schema.sql');

describe('Scene Routes Logic', () => {
  let db: Database.Database;

  beforeAll(() => {
    if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
    db = new Database(TEST_DB_PATH);
    db.pragma('foreign_keys = ON');
    db.exec(fs.readFileSync(SCHEMA_PATH, 'utf-8'));
  });

  afterAll(() => {
    db.close();
    if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
  });

  it('should create a scene from office template', () => {
    const template = SCENE_TEMPLATES['office'];
    const id = 'test-scene-1';
    const layoutJson = JSON.stringify(template.layout);

    db.prepare('INSERT INTO scenes (id, name, layout_json) VALUES (?, ?, ?)').run(id, 'My Office', layoutJson);

    const row = db.prepare('SELECT * FROM scenes WHERE id = ?').get(id) as any;
    expect(row.name).toBe('My Office');

    const layout = JSON.parse(row.layout_json);
    expect(layout.width).toBe(template.layout.width);
    expect(layout.height).toBe(template.layout.height);
    expect(layout.props.length).toBe(template.layout.props.length);
  });

  it('should create scenes from all 4 templates', () => {
    for (const [key, template] of Object.entries(SCENE_TEMPLATES)) {
      const id = `template-${key}`;
      const layoutJson = JSON.stringify(template.layout);
      db.prepare('INSERT INTO scenes (id, name, layout_json) VALUES (?, ?, ?)').run(id, template.name, layoutJson);

      const row = db.prepare('SELECT * FROM scenes WHERE id = ?').get(id) as any;
      const layout = JSON.parse(row.layout_json);
      expect(layout.tiles.length).toBe(template.layout.height);
      expect(layout.tiles[0].length).toBe(template.layout.width);
    }
  });

  it('should list all scenes', () => {
    const rows = db.prepare('SELECT * FROM scenes').all();
    expect(rows.length).toBeGreaterThanOrEqual(4);
  });

  it('should update scene name', () => {
    db.prepare('UPDATE scenes SET name = ? WHERE id = ?').run('Renamed Office', 'test-scene-1');
    const row = db.prepare('SELECT * FROM scenes WHERE id = ?').get('test-scene-1') as any;
    expect(row.name).toBe('Renamed Office');
  });

  it('should delete a scene', () => {
    db.prepare('DELETE FROM scenes WHERE id = ?').run('test-scene-1');
    const row = db.prepare('SELECT * FROM scenes WHERE id = ?').get('test-scene-1');
    expect(row).toBeUndefined();
  });
});
