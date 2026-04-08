// Donkey SEO Webhook Endpoint

import type { Route } from "./+types/api.webhooks.donkey-seo"
import { sql } from "drizzle-orm"
import { getDb, initializeDatabase } from "~/lib/db.server"
import { verifyWebhookSignature } from "~/lib/webhook-verification.server"
import {
  processArticlePublication,
  type WebhookArticlePayload,
} from "~/lib/donkey-seo-publication.server"

interface WebhookEventPayload {
  event_id?: string
  event_type?: string
  article?: {
    article_id?: string
    slug?: string
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function hasBlogpostPayload(payload: WebhookEventPayload): payload is WebhookArticlePayload {
  return (
    isObject(payload.article) &&
    typeof payload.article.article_id === "string" &&
    payload.article.article_id.length > 0 &&
    typeof payload.article.slug === "string" &&
    payload.article.slug.length > 0
  )
}

export async function loader() {
  return Response.json(
    { ok: false, error: "Method not allowed. Use POST." },
    { status: 405 }
  )
}

export async function action({ request }: Route.ActionArgs) {
  if (request.method !== "POST") {
    return Response.json(
      { ok: false, error: "Method not allowed. Use POST." },
      { status: 405 }
    )
  }

  try {
    // Ensure database tables exist
    initializeDatabase()

    // 1. Read raw body for signature verification
    const rawBody = await request.text()

    // 2. Extract headers
    const signature = request.headers.get("x-donkey-signature")
    const timestamp = request.headers.get("x-donkey-timestamp")
    const deliveryId = request.headers.get("x-donkey-delivery-id")

    if (!signature) {
      console.warn("[Donkey SEO Webhook] Missing signature header")
      return Response.json(
        { ok: false, error: "Missing x-donkey-signature header" },
        { status: 401 }
      )
    }

    if (!timestamp) {
      console.warn("[Donkey SEO Webhook] Missing timestamp header")
      return Response.json(
        { ok: false, error: "Missing x-donkey-timestamp header" },
        { status: 401 }
      )
    }

    // 3. Verify signature
    const secret = process.env.DONKEY_SEO_WEBHOOK_SECRET
    if (!secret) {
      console.error("[Donkey SEO Webhook] DONKEY_SEO_WEBHOOK_SECRET not configured")
      return Response.json(
        { ok: false, error: "Server configuration error" },
        { status: 500 }
      )
    }

    const isValid = verifyWebhookSignature(rawBody, signature, timestamp, secret)
    if (!isValid) {
      console.warn("[Donkey SEO Webhook] Invalid signature", { deliveryId, timestamp })
      return Response.json({ ok: false, error: "Invalid signature" }, { status: 401 })
    }

    // 4. Parse payload
    let payload: WebhookEventPayload
    try {
      const parsedPayload = JSON.parse(rawBody) as unknown
      if (!isObject(parsedPayload)) {
        return Response.json(
          { ok: false, error: "Invalid payload format" },
          { status: 400 }
        )
      }
      payload = parsedPayload as WebhookEventPayload
    } catch {
      console.error("[Donkey SEO Webhook] Failed to parse JSON payload")
      return Response.json({ ok: false, error: "Invalid JSON payload" }, { status: 400 })
    }

    const { event_id, event_type } = payload

    if (typeof event_id !== "string" || typeof event_type !== "string") {
      console.warn("[Donkey SEO Webhook] Missing event_id or event_type")
      return Response.json(
        { ok: false, error: "Missing event_id or event_type" },
        { status: 400 }
      )
    }

    console.log(`[Donkey SEO Webhook] Received event: ${event_type} (${event_id})`)

    // 5. Check idempotency
    const db = getDb()
    const existingEvent = db.all(sql`
      SELECT event_id, processed, error_message
      FROM donkey_webhook_events
      WHERE event_id = ${event_id}
    `)

    const existingRow = existingEvent[0] as
      | { processed: number; error_message: string | null }
      | undefined

    if (existingRow?.processed === 1 && !existingRow.error_message) {
      console.log(`[Donkey SEO Webhook] Event ${event_id} already received, skipping`)
      return Response.json({
        ok: true,
        message: "Event already processed",
        event_id,
      })
    }

    // 6. Store event if this is the first delivery
    const now = new Date().toISOString()
    if (!existingRow) {
      db.run(sql`
        INSERT INTO donkey_webhook_events (event_id, event_type, payload, processed, created_at)
        VALUES (${event_id}, ${event_type}, ${rawBody}, 0, ${now})
      `)
    } else {
      console.log(
        `[Donkey SEO Webhook] Reprocessing existing event ${event_id} (processed=${String(
          existingRow.processed
        )}, had_error=${String(Boolean(existingRow.error_message))})`
      )
    }

    // 7. Process event based on type
    if (event_type === "content.article.publish_requested") {
      if (!hasBlogpostPayload(payload)) {
        console.warn("[Donkey SEO Webhook] Missing blogpost payload for publish event")
        return Response.json(
          { ok: false, error: "Missing article payload for publish event" },
          { status: 400 }
        )
      }

      await processArticlePublication(event_id, payload)

      return Response.json({
        ok: true,
        message: "Publication processed",
        event_id,
      })
    }

    // Unknown event type - mark as processed
    db.run(sql`
      UPDATE donkey_webhook_events
      SET processed = 1, processed_at = ${now}
      WHERE event_id = ${event_id}
    `)

    console.log(`[Donkey SEO Webhook] Unknown event type: ${event_type}`)
    return Response.json({
      ok: true,
      message: "Event received (unknown type)",
      event_id,
    })
  } catch (error) {
    console.error("[Donkey SEO Webhook] Processing error:", error)
    return Response.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unexpected error",
      },
      { status: 500 }
    )
  }
}
