import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const TEST_DB_PATH = path.resolve(__dirname, '../../test_pixel_agent.db');
const SCHEMA_PATH = path.resolve(__dirname, '../db/schema.sql');

describe('Database Schema', () => {
  let db: Database.Database;

  beforeAll(() => {
    if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
    db = new Database(TEST_DB_PATH);
    db.pragma('foreign_keys = ON');
    const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');
    db.exec(schema);
  });

  afterAll(() => {
    db.close();
    if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
  });

  it('should create scenes table', () => {
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='scenes'").all();
    expect(tables).toHaveLength(1);
  });

  it('should create characters table', () => {
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='characters'").all();
    expect(tables).toHaveLength(1);
  });

  it('should create tasks table', () => {
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='tasks'").all();
    expect(tables).toHaveLength(1);
  });

  it('should insert and retrieve a scene', () => {
    db.prepare(`
      INSERT INTO scenes (id, name, layout_json) VALUES ('s1', 'Test Scene', '{"width":10,"height":10}')
    `).run();

    const scene = db.prepare('SELECT * FROM scenes WHERE id = ?').get('s1') as any;
    expect(scene.name).toBe('Test Scene');
    expect(JSON.parse(scene.layout_json)).toEqual({ width: 10, height: 10 });
  });

  it('should insert and retrieve a character', () => {
    db.prepare(`
      INSERT INTO characters (id, scene_id, name, description, sprite_json, position_x, position_y)
      VALUES ('c1', 's1', 'Luna', 'a wizard', '{"width":16}', 5, 5)
    `).run();

    const char = db.prepare('SELECT * FROM characters WHERE id = ?').get('c1') as any;
    expect(char.name).toBe('Luna');
    expect(char.state).toBe('idle');
    expect(char.position_x).toBe(5);
  });

  it('should insert and retrieve a task', () => {
    db.prepare(`
      INSERT INTO tasks (id, character_id, prompt, status)
      VALUES ('t1', 'c1', 'Research AI tools', 'pending')
    `).run();

    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get('t1') as any;
    expect(task.prompt).toBe('Research AI tools');
    expect(task.status).toBe('pending');
  });

  it('should cascade delete characters when scene is deleted', () => {
    const charsBefore = db.prepare('SELECT COUNT(*) as count FROM characters WHERE scene_id = ?').get('s1') as any;
    expect(charsBefore.count).toBe(1);

    db.prepare('DELETE FROM scenes WHERE id = ?').run('s1');

    const charsAfter = db.prepare('SELECT COUNT(*) as count FROM characters WHERE scene_id = ?').get('s1') as any;
    expect(charsAfter.count).toBe(0);
  });

  it('should handle idempotent schema migration (run twice)', () => {
    const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');
    expect(() => db.exec(schema)).not.toThrow();
  });

  it('should enforce foreign key on characters.scene_id', () => {
    expect(() =>
      db.prepare(`
        INSERT INTO characters (id, scene_id, name, description, sprite_json, position_x, position_y)
        VALUES ('c_bad', 'nonexistent', 'Bad', 'no scene', '{}', 0, 0)
      `).run()
    ).toThrow();
  });
});
