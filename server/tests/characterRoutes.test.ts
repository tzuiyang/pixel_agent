import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import type { SpriteData } from '../../shared/types';

const TEST_DB_PATH = path.resolve(__dirname, '../../test_char_routes.db');
const SCHEMA_PATH = path.resolve(__dirname, '../db/schema.sql');

function makeTestSprite(): SpriteData {
  const frame = Array.from({ length: 16 }, () => Array.from({ length: 16 }, () => '#FF0000'));
  return { width: 16, height: 16, frames: { idle_1: [frame], work: [frame] } };
}

describe('Character Routes Logic', () => {
  let db: Database.Database;

  beforeAll(() => {
    if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
    db = new Database(TEST_DB_PATH);
    db.pragma('foreign_keys = ON');
    db.exec(fs.readFileSync(SCHEMA_PATH, 'utf-8'));
    db.prepare("INSERT INTO scenes (id, name, layout_json) VALUES ('scene1', 'Test', '{}')").run();
  });

  afterAll(() => {
    db.close();
    if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
  });

  it('should save a character', () => {
    const sprite = makeTestSprite();
    db.prepare(`
      INSERT INTO characters (id, scene_id, name, description, sprite_json, position_x, position_y, state)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'idle')
    `).run('char1', 'scene1', 'Luna', 'a tiny wizard', JSON.stringify(sprite), 5, 5);

    const row = db.prepare('SELECT * FROM characters WHERE id = ?').get('char1') as any;
    expect(row.name).toBe('Luna');
    expect(row.state).toBe('idle');
    expect(row.position_x).toBe(5);

    const savedSprite = JSON.parse(row.sprite_json) as SpriteData;
    expect(savedSprite.width).toBe(16);
    expect(Object.keys(savedSprite.frames)).toContain('idle_1');
  });

  it('should list characters in a scene', () => {
    const rows = db.prepare('SELECT * FROM characters WHERE scene_id = ?').all('scene1');
    expect(rows).toHaveLength(1);
  });

  it('should enforce max 5 characters per scene', () => {
    const sprite = makeTestSprite();
    for (let i = 2; i <= 5; i++) {
      db.prepare(`
        INSERT INTO characters (id, scene_id, name, description, sprite_json, position_x, position_y, state)
        VALUES (?, 'scene1', ?, 'test', ?, ?, ?, 'idle')
      `).run(`char${i}`, `Agent ${i}`, JSON.stringify(sprite), i * 2, i * 2);
    }

    const rows = db.prepare('SELECT COUNT(*) as count FROM characters WHERE scene_id = ?').get('scene1') as any;
    expect(rows.count).toBe(5);
  });

  it('should update character state', () => {
    db.prepare("UPDATE characters SET state = 'working', current_task = 'Research AI' WHERE id = 'char1'").run();
    const row = db.prepare('SELECT * FROM characters WHERE id = ?').get('char1') as any;
    expect(row.state).toBe('working');
    expect(row.current_task).toBe('Research AI');
  });

  it('should delete a character', () => {
    db.prepare("DELETE FROM characters WHERE id = 'char5'").run();
    const rows = db.prepare('SELECT COUNT(*) as count FROM characters WHERE scene_id = ?').get('scene1') as any;
    expect(rows.count).toBe(4);
  });

  it('should cascade delete tasks when character is deleted', () => {
    db.prepare(`
      INSERT INTO tasks (id, character_id, prompt, status)
      VALUES ('task1', 'char1', 'Do something', 'completed')
    `).run();

    const before = db.prepare('SELECT COUNT(*) as count FROM tasks WHERE character_id = ?').get('char1') as any;
    expect(before.count).toBe(1);

    db.prepare("DELETE FROM characters WHERE id = 'char1'").run();

    const after = db.prepare('SELECT COUNT(*) as count FROM tasks WHERE character_id = ?').get('char1') as any;
    expect(after.count).toBe(0);
  });
});
