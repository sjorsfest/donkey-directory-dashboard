import { neon, type NeonQueryFunction } from "@neondatabase/serverless"
import { drizzle, type NeonHttpDatabase } from "drizzle-orm/neon-http"

let client: NeonQueryFunction<false, false> | null = null
let db: NeonHttpDatabase | null = null

export function getDb(): NeonHttpDatabase {
  if (db) return db

  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    throw new Error("DATABASE_URL environment variable is not set")
  }

  client = neon(databaseUrl)
  db = drizzle(client)

  return db
}

export async function initializeDatabase(): Promise<void> {
  const database = getDb()

  await database.execute(/*sql*/`
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
      created_at TEXT NOT NULL DEFAULT (NOW()::TEXT),
      updated_at TEXT NOT NULL DEFAULT (NOW()::TEXT)
    );

    CREATE TABLE IF NOT EXISTS donkey_webhook_events (
      event_id TEXT PRIMARY KEY,
      event_type TEXT NOT NULL,
      payload TEXT NOT NULL,
      processed INTEGER NOT NULL DEFAULT 0,
      processed_at TEXT,
      error_message TEXT,
      created_at TEXT NOT NULL DEFAULT (NOW()::TEXT)
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
      updated_at TEXT NOT NULL DEFAULT (NOW()::TEXT)
    );
  `)
}
