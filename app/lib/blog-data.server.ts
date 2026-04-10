// Blog Data Access Layer
// Handles all database queries for blog articles

import { sql } from "drizzle-orm"
import { getDb } from "~/lib/db.server"
import { getCached, setCached } from "~/lib/redis.server"
import type { ModularDocument } from "~/lib/donkey-seo-client.server"

const ARTICLE_CACHE_TTL = 3600
const ARTICLES_LIST_CACHE_TTL = 3600

export interface BlogArticle {
  article_id: string
  slug: string
  title: string
  excerpt: string | null
  seo_title: string | null
  seo_description: string | null
  seo_h1: string | null
  featured_image_url: string | null
  featured_image_alt: string | null
  pillar_slug: string | null
  pillar_name: string | null
  webhook_payload: {
    modular_document: ModularDocument
  }
  published_at: string
  updated_at: string
}

export interface BlogArticleSummary {
  article_id: string
  slug: string
  title: string
  excerpt: string | null
  featured_image_url: string | null
  featured_image_alt: string | null
  pillar_slug: string | null
  pillar_name: string | null
  published_at: string
}

export interface BlogArticleForSitemap {
  slug: string
  updated_at: string
}

function parseArticleRow(row: Record<string, unknown>): BlogArticle {
  return {
    ...row,
    webhook_payload:
      typeof row.webhook_payload === "string"
        ? JSON.parse(row.webhook_payload)
        : row.webhook_payload,
  } as BlogArticle
}

/**
 * Get a single published article by slug
 */
export async function getPublishedArticleBySlug(
  slug: string
): Promise<BlogArticle | null> {
  const cacheKey = `blog:article:${slug}`
  const cached = await getCached<BlogArticle>(cacheKey)
  if (cached) return cached

  try {
    const db = getDb()
    const result = await db.execute(sql`
      SELECT
        article_id, slug, title, excerpt,
        seo_title, seo_description, seo_h1,
        featured_image_url, featured_image_alt,
        pillar_slug, pillar_name,
        webhook_payload, published_at, updated_at
      FROM donkey_articles
      WHERE slug = ${slug} AND publish_status = 'published'
      LIMIT 1
    `)

    if (result.rows.length === 0) return null

    const article = parseArticleRow(result.rows[0] as Record<string, unknown>)
    await setCached(cacheKey, article, ARTICLE_CACHE_TTL)
    return article
  } catch (error) {
    console.error("[Blog Data] Failed to get article by slug:", error)
    return null
  }
}

/**
 * Get all published articles ordered by publish date (newest first)
 */
export async function getAllPublishedArticles(
  limit?: number
): Promise<BlogArticleSummary[]> {
  const cacheKey = `blog:articles:all:${limit ?? "all"}`
  const cached = await getCached<BlogArticleSummary[]>(cacheKey)
  if (cached) return cached

  try {
    const db = getDb()
    const query = limit
      ? sql`
          SELECT
            article_id, slug, title, excerpt,
            featured_image_url, featured_image_alt,
            pillar_slug, pillar_name, published_at
          FROM donkey_articles
          WHERE publish_status = 'published'
          ORDER BY published_at DESC
          LIMIT ${limit}
        `
      : sql`
          SELECT
            article_id, slug, title, excerpt,
            featured_image_url, featured_image_alt,
            pillar_slug, pillar_name, published_at
          FROM donkey_articles
          WHERE publish_status = 'published'
          ORDER BY published_at DESC
        `

    const result = await db.execute(query)
    const articles = result.rows as unknown as BlogArticleSummary[]
    await setCached(cacheKey, articles, ARTICLES_LIST_CACHE_TTL)
    return articles
  } catch (error) {
    console.error("[Blog Data] Failed to get all articles:", error)
    return []
  }
}

/**
 * Get articles in a specific pillar
 */
export async function getArticlesByPillar(
  pillarSlug: string
): Promise<BlogArticleSummary[]> {
  const cacheKey = `blog:articles:pillar:${pillarSlug}`
  const cached = await getCached<BlogArticleSummary[]>(cacheKey)
  if (cached) return cached

  try {
    const db = getDb()
    const result = await db.execute(sql`
      SELECT
        article_id, slug, title, excerpt,
        featured_image_url, featured_image_alt,
        pillar_slug, pillar_name, published_at
      FROM donkey_articles
      WHERE pillar_slug = ${pillarSlug} AND publish_status = 'published'
      ORDER BY published_at DESC
    `)
    const articles = result.rows as unknown as BlogArticleSummary[]

    await setCached(cacheKey, articles, ARTICLES_LIST_CACHE_TTL)
    return articles
  } catch (error) {
    console.error("[Blog Data] Failed to get articles by pillar:", error)
    return []
  }
}

/**
 * Get all published articles for sitemap generation
 */
export async function getPublishedArticlesForSitemap(): Promise<
  BlogArticleForSitemap[]
> {
  try {
    const db = getDb()
    const result = await db.execute(sql`
      SELECT slug, updated_at
      FROM donkey_articles
      WHERE publish_status = 'published'
      ORDER BY published_at DESC
    `)
    return result.rows as unknown as BlogArticleForSitemap[]
  } catch (error) {
    console.error("[Blog Data] Failed to get articles for sitemap:", error)
    return []
  }
}

/**
 * Get cached pillars from database
 */
export async function getCachedPillars(): Promise<
  Array<{ id: string; name: string; slug: string; description: string | null }>
> {
  const cacheKey = "blog:pillars:active"
  const cached = await getCached<
    Array<{ id: string; name: string; slug: string; description: string | null }>
  >(cacheKey)
  if (cached) return cached

  try {
    const db = getDb()
    const result = await db.execute(sql`
      SELECT id, name, slug, description
      FROM donkey_pillars
      WHERE status = 'active'
      ORDER BY name ASC
    `)
    const pillars = result.rows as unknown as Array<{ id: string; name: string; slug: string; description: string | null }>

    await setCached(cacheKey, pillars, ARTICLES_LIST_CACHE_TTL)
    return pillars
  } catch (error) {
    console.error("[Blog Data] Failed to get cached pillars:", error)
    return []
  }
}
