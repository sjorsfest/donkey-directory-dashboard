import Database from "better-sqlite3"
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3"

let sqlite: Database.Database | null = null
let db: BetterSQLite3Database | null = null

function getDatabasePath(): string {
  return process.env.DATABASE_PATH || "./data/donkey.db"
}

export function getDb(): BetterSQLite3Database {
  if (db) return db

  const dbPath = getDatabasePath()
  sqlite = new Database(dbPath)
  sqlite.pragma("journal_mode = WAL")
  sqlite.pragma("foreign_keys = ON")
  db = drizzle(sqlite)

  return db
}

export function initializeDatabase(): void {
  const database = getDb()

  const rawDb = sqlite!
  rawDb.exec(`
    CREATE TABLE IF NOT EXISTS donkey_articles (
      article_id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL,
      excerpt TEXT,
      seo_title TEXT,
      seo_description TEXT,
      seo_h1 TEXT,
      primary_keyword TEXT NOT NULL,
      featured_image_url TEXT,
      featured_image_alt TEXT,
      pillar_id TEXT,
      pillar_slug TEXT,
      pillar_name TEXT,
      webhook_payload TEXT NOT NULL,
      publish_status TEXT NOT NULL DEFAULT 'published',
      published_at TEXT,
      proposed_publication_date TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS donkey_webhook_events (
      event_id TEXT PRIMARY KEY,
      event_type TEXT NOT NULL,
      payload TEXT NOT NULL,
      processed INTEGER NOT NULL DEFAULT 0,
      processed_at TEXT,
      error_message TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS donkey_pillars (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      primary_article_count INTEGER DEFAULT 0,
      published_primary_article_count INTEGER DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `)
}
