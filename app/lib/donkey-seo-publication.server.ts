// Article Publication Service
// Handles the full publication workflow for Donkey SEO articles

import { sql } from "drizzle-orm"
import { getDb } from "~/lib/db.server"
import { getDonkeySeoClient } from "~/lib/donkey-seo-client.server"
import { uploadImageToR2 } from "~/lib/r2.server"
import type { ModularBlock, ModularDocument } from "~/lib/donkey-seo-client.server"

const CANONICAL_ORIGIN = process.env.VITE_WEB_APP_ORIGIN || "https://donkey.directory"

/**
 * Webhook article payload structure
 */
export interface WebhookArticlePayload {
  event_id: string
  event_type: string
  occurred_at: string
  project: {
    id: string
    domain: string
    locale: string
  }
  article: {
    article_id: string
    brief_id: string
    version_number: number
    title: string
    slug: string
    primary_keyword: string
    proposed_publication_date?: string | null
  }
  modular_document: ModularDocument
  rendered_html?: string
}

/**
 * Download image from URL and upload to R2
 */
async function downloadAndUploadImage(
  imageUrl: string,
  keyPrefix: string
): Promise<string> {
  const response = await fetch(imageUrl)
  if (!response.ok) {
    throw new Error(`Failed to download image: ${response.status} ${response.statusText}`)
  }

  const contentType = response.headers.get("content-type") || "image/jpeg"
  const buffer = Buffer.from(await response.arrayBuffer())

  const result = await uploadImageToR2({
    body: buffer,
    contentType,
    keyPrefix,
  })

  return result.publicUrl
}

/**
 * Process images in modular_document blocks
 */
async function processBlockImages(
  blocks: ModularBlock[],
  keyPrefix: string
): Promise<ModularBlock[]> {
  const processedBlocks: ModularBlock[] = []

  for (const block of blocks) {
    const processedBlock = { ...block }

    if (block.block_type === "hero" && block.image) {
      const imageData = block.image as { url?: string; alt_text?: string }
      if (imageData.url && imageData.url.startsWith("http")) {
        try {
          const publicUrl = await downloadAndUploadImage(imageData.url, keyPrefix)
          processedBlock.image = { ...imageData, url: publicUrl }
        } catch (error) {
          console.error("Failed to process hero image:", error)
        }
      }
    }

    if (block.block_type === "comparison_table" && Array.isArray(block.items)) {
      processedBlock.items = await Promise.all(
        block.items.map(async (item: unknown) => {
          if (
            typeof item === "object" &&
            item !== null &&
            "image" in item &&
            typeof item.image === "object" &&
            item.image !== null &&
            "url" in item.image &&
            typeof item.image.url === "string" &&
            item.image.url.startsWith("http")
          ) {
            try {
              const publicUrl = await downloadAndUploadImage(item.image.url, keyPrefix)
              return { ...item, image: { ...item.image, url: publicUrl } }
            } catch (error) {
              console.error("Failed to process comparison item image:", error)
              return item
            }
          }
          return item
        })
      )
    }

    processedBlocks.push(processedBlock)
  }

  return processedBlocks
}

/**
 * Extract article metadata from webhook payload
 */
function extractArticleMetadata(payload: WebhookArticlePayload) {
  const { modular_document, article } = payload
  const seoMeta = modular_document.seo_meta || {}
  const excerpt = modular_document.blocks
    .find((b) => b.block_type === "summary")
    ?.body?.substring(0, 200)

  return {
    article_id: article.article_id,
    project_id: payload.project.id,
    slug: article.slug,
    title: article.title,
    excerpt: excerpt || null,
    seo_title: seoMeta.meta_title || article.title,
    seo_description: seoMeta.meta_description || excerpt || null,
    seo_h1: seoMeta.h1 || article.title,
    primary_keyword: article.primary_keyword,
    proposed_publication_date: article.proposed_publication_date || null,
  }
}

/**
 * Main publication workflow
 */
export async function processArticlePublication(
  eventId: string,
  payload: WebhookArticlePayload
): Promise<void> {
  const db = getDb()
  const client = getDonkeySeoClient()

  try {
    console.log(`[Donkey SEO] Processing article publication: ${payload.article.article_id}`)

    const keyPrefix = `blog/${payload.article.slug}`

    // 1. Process featured image
    let featuredImageUrl: string | null = null
    let featuredImageAlt: string | null = null

    if (payload.modular_document.featured_image) {
      const featuredImage = payload.modular_document.featured_image
      if (featuredImage.signed_url) {
        try {
          featuredImageUrl = await downloadAndUploadImage(
            featuredImage.signed_url,
            keyPrefix
          )
          featuredImageAlt = featuredImage.title_text || null
        } catch (error) {
          console.error("[Donkey SEO] Failed to upload featured image:", error)
        }
      }
    }

    // 2. Process author profile image
    if (payload.modular_document.author?.profile_image?.signed_url) {
      try {
        const authorImageUrl = await downloadAndUploadImage(
          payload.modular_document.author.profile_image.signed_url,
          `authors/${payload.modular_document.author.id || "unknown"}`
        )
        payload.modular_document.author.profile_image = {
          ...payload.modular_document.author.profile_image,
          signed_url: authorImageUrl,
        }
      } catch (error) {
        console.error("[Donkey SEO] Failed to upload author image:", error)
      }
    }

    // 3. Process block images
    const processedBlocks = await processBlockImages(
      payload.modular_document.blocks,
      keyPrefix
    )

    // 4. Update modular_document with processed blocks
    const processedDocument: ModularDocument = {
      ...payload.modular_document,
      blocks: processedBlocks,
    }

    // 5. Extract article metadata
    const metadata = extractArticleMetadata(payload)
    const now = new Date().toISOString()

    // 6. Store article in database (upsert)
    db.run(sql`
      INSERT INTO donkey_articles (
        article_id, project_id, slug, title, excerpt,
        seo_title, seo_description, seo_h1, primary_keyword,
        featured_image_url, featured_image_alt,
        webhook_payload, publish_status, published_at, proposed_publication_date,
        created_at, updated_at
      ) VALUES (
        ${metadata.article_id},
        ${metadata.project_id},
        ${metadata.slug},
        ${metadata.title},
        ${metadata.excerpt},
        ${metadata.seo_title},
        ${metadata.seo_description},
        ${metadata.seo_h1},
        ${metadata.primary_keyword},
        ${featuredImageUrl},
        ${featuredImageAlt},
        ${JSON.stringify({ ...payload, modular_document: processedDocument })},
        ${"published"},
        ${now},
        ${metadata.proposed_publication_date},
        ${now},
        ${now}
      )
      ON CONFLICT (article_id) DO UPDATE SET
        project_id = excluded.project_id,
        slug = excluded.slug,
        title = excluded.title,
        excerpt = excluded.excerpt,
        seo_title = excluded.seo_title,
        seo_description = excluded.seo_description,
        seo_h1 = excluded.seo_h1,
        primary_keyword = excluded.primary_keyword,
        featured_image_url = excluded.featured_image_url,
        featured_image_alt = excluded.featured_image_alt,
        webhook_payload = excluded.webhook_payload,
        publish_status = excluded.publish_status,
        published_at = excluded.published_at,
        proposed_publication_date = excluded.proposed_publication_date,
        updated_at = excluded.updated_at
    `)

    // 7. Notify Donkey SEO of successful publication
    const publishedUrl = `${CANONICAL_ORIGIN}/blog/${metadata.slug}`
    await client.patchPublicationStatus(metadata.article_id, {
      publish_status: "published",
      published_at: now,
      published_url: publishedUrl,
    })

    // 8. Mark webhook event as processed
    db.run(sql`
      UPDATE donkey_webhook_events
      SET processed = 1, processed_at = ${now}
      WHERE event_id = ${eventId}
    `)

    console.log(`[Donkey SEO] Successfully published article: ${metadata.slug}`)
  } catch (error) {
    console.error(
      `[Donkey SEO] Failed to publish article ${payload.article.article_id}:`,
      error
    )

    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    const now = new Date().toISOString()

    db.run(sql`
      UPDATE donkey_webhook_events
      SET processed = 1, processed_at = ${now}, error_message = ${errorMessage}
      WHERE event_id = ${eventId}
    `)

    db.run(sql`
      INSERT INTO donkey_articles (
        article_id, project_id, slug, title, primary_keyword,
        webhook_payload, publish_status, created_at, updated_at
      ) VALUES (
        ${payload.article.article_id},
        ${payload.project.id},
        ${payload.article.slug},
        ${payload.article.title},
        ${payload.article.primary_keyword},
        ${JSON.stringify(payload)},
        ${"failed"},
        ${now},
        ${now}
      )
      ON CONFLICT (article_id) DO UPDATE SET
        publish_status = 'failed',
        updated_at = ${now}
    `)

    try {
      await client.patchPublicationStatus(payload.article.article_id, {
        publish_status: "failed",
      })
    } catch (notifyError) {
      console.error("[Donkey SEO] Failed to notify publication failure:", notifyError)
    }

    throw error
  }
}
