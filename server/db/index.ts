import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.resolve(__dirname, '../../pixel_agent.db');
const SCHEMA_PATH = path.resolve(__dirname, 'schema.sql');

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    runMigrations();
  }
  return db;
}

function runMigrations() {
  const schema = fs.readFileSync(SCHEMA_PATH, 'utf-8');
  db.exec(schema);

  // BUG-024 FIX: reset characters stuck in working/thinking state from previous crash
  const stuck = db.prepare(`UPDATE characters SET state = 'idle', current_task = NULL WHERE state IN ('working', 'thinking', 'waiting')`).run();
  if (stuck.changes > 0) {
    console.log(`Reset ${stuck.changes} character(s) stuck in non-idle state from previous session`);
  }

  // Also fail any running tasks that survived a crash
  const stuckTasks = db.prepare(`UPDATE tasks SET status = 'failed', output = 'Server restarted', completed_at = ? WHERE status = 'running'`)
    .run(new Date().toISOString());
  if (stuckTasks.changes > 0) {
    console.log(`Marked ${stuckTasks.changes} stuck task(s) as failed`);
  }
}

export function closeDb() {
  if (db) {
    db.close();
  }
}
