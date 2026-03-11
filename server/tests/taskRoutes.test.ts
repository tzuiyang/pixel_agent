import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const TEST_DB_PATH = path.resolve(__dirname, '../../test_task_routes.db');
const SCHEMA_PATH = path.resolve(__dirname, '../db/schema.sql');

describe('Task Routes Logic', () => {
  let db: Database.Database;

  beforeAll(() => {
    if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
    db = new Database(TEST_DB_PATH);
    db.pragma('foreign_keys = ON');
    db.exec(fs.readFileSync(SCHEMA_PATH, 'utf-8'));

    db.prepare("INSERT INTO scenes (id, name, layout_json) VALUES ('s1', 'Test', '{}')").run();
    db.prepare(`
      INSERT INTO characters (id, scene_id, name, description, sprite_json, position_x, position_y, state)
      VALUES ('c1', 's1', 'Luna', 'wizard', '{}', 5, 5, 'idle')
    `).run();
  });

  afterAll(() => {
    db.close();
    if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
  });

  it('should create a task', () => {
    db.prepare(`
      INSERT INTO tasks (id, character_id, prompt, status, started_at, created_at)
      VALUES ('t1', 'c1', 'Research AI tools', 'running', datetime('now'), datetime('now'))
    `).run();

    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get('t1') as any;
    expect(task.prompt).toBe('Research AI tools');
    expect(task.status).toBe('running');
  });

  it('should complete a task with output', () => {
    db.prepare(`
      UPDATE tasks SET status = 'completed', output = 'Here are the results...', completed_at = datetime('now')
      WHERE id = 't1'
    `).run();

    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get('t1') as any;
    expect(task.status).toBe('completed');
    expect(task.output).toBe('Here are the results...');
    expect(task.completed_at).toBeTruthy();
  });

  it('should list tasks for a character', () => {
    for (let i = 2; i <= 5; i++) {
      db.prepare(`
        INSERT INTO tasks (id, character_id, prompt, status, created_at)
        VALUES (?, 'c1', ?, 'completed', datetime('now'))
      `).run(`t${i}`, `Task ${i}`);
    }

    const tasks = db.prepare(
      'SELECT * FROM tasks WHERE character_id = ? ORDER BY created_at DESC LIMIT 10'
    ).all('c1');
    expect(tasks.length).toBe(5);
  });

  it('should fail a task with error', () => {
    db.prepare(`
      INSERT INTO tasks (id, character_id, prompt, status, output, created_at)
      VALUES ('t_err', 'c1', 'Bad task', 'failed', 'API key expired', datetime('now'))
    `).run();

    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get('t_err') as any;
    expect(task.status).toBe('failed');
    expect(task.output).toBe('API key expired');
  });

  it('should store activity log as JSON', () => {
    const log = JSON.stringify([
      { timestamp: '2026-01-01T00:00:00Z', label: 'Started', detail: 'Initializing...' },
      { timestamp: '2026-01-01T00:00:05Z', label: 'Thinking' },
      { timestamp: '2026-01-01T00:00:10Z', label: 'Writing' },
    ]);

    db.prepare(`
      INSERT INTO tasks (id, character_id, prompt, status, activity_log_json, created_at)
      VALUES ('t_log', 'c1', 'Logged task', 'completed', ?, datetime('now'))
    `).run(log);

    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get('t_log') as any;
    const parsed = JSON.parse(task.activity_log_json);
    expect(parsed).toHaveLength(3);
    expect(parsed[0].label).toBe('Started');
    expect(parsed[2].label).toBe('Writing');
  });

  it('should cancel a task', () => {
    db.prepare(`
      INSERT INTO tasks (id, character_id, prompt, status, created_at)
      VALUES ('t_cancel', 'c1', 'Cancel me', 'running', datetime('now'))
    `).run();

    db.prepare("UPDATE tasks SET status = 'cancelled' WHERE id = 't_cancel'").run();

    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get('t_cancel') as any;
    expect(task.status).toBe('cancelled');
  });
});
