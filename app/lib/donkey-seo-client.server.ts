// Donkey SEO API Client

// ============================================================================
// Type Definitions
// ============================================================================

export interface ModularBlock {
  block_type:
    | "hero"
    | "summary"
    | "section"
    | "list"
    | "comparison_table"
    | "steps"
    | "faq"
    | "cta"
    | "conclusion"
    | "sources"
  semantic_tag?: "header" | "section" | "aside" | "footer" | "table" | string | null
  heading?: string | null
  level?: number | null
  body?: string | null
  items: unknown[]
  ordered?: boolean
  links?: Array<{
    anchor: string
    href: string
    target_brief_id?: string
  }>
  faq_items?: Array<{
    question: string
    answer: string
  }>
  table_columns?: string[]
  table_rows?: string[][]
  cta?: {
    label: string
    href: string
  } | null
  [key: string]: unknown
}

export interface ModularDocument {
  schema_version: string
  seo_meta?: {
    h1?: string
    meta_title?: string
    meta_description?: string
    slug?: string
    primary_keyword?: string
  }
  conversion_plan?: {
    primary_intent?: string
    cta_strategy?: string[]
  }
  author?: {
    id?: string
    name?: string
    bio?: string
    social_urls?: Record<string, string>
    profile_image?: {
      object_key: string
      mime_type: string
      width: number
      height: number
      byte_size: number
      sha256: string
      signed_url: string
    }
  }
  featured_image?: {
    object_key: string
    mime_type: string
    width: number
    height: number
    byte_size: number
    sha256: string
    title_text?: string
    signed_url: string
  }
  structured_data?: Array<Record<string, unknown>>
  blocks: ModularBlock[]
}

export interface DonkeyPillar {
  id: string
  project_id: string
  name: string
  slug: string
  description?: string
  status: "active" | "archived"
  source: "auto" | "manual"
  locked: boolean
  primary_brief_count: number
  secondary_brief_count: number
  total_brief_count: number
  primary_article_count: number
  published_primary_article_count: number
  created_at: string
  updated_at: string
}

export interface DonkeyArticleSummary {
  id: string
  project_id: string
  brief_id: string
  title: string
  slug: string
  primary_keyword: string
  current_version: number
  status: string
  publish_status: "scheduled" | "published" | "failed" | null
  published_at: string | null
  published_url: string | null
  primary_pillar?: {
    id: string
    name: string
    slug: string
  } | null
  secondary_pillars?: Array<{
    id: string
    name: string
    slug: string
  }>
  pillar_assignment_confidence?: number
  created_at: string
  updated_at: string
}

export interface DonkeyArticleDetail {
  id: string
  article_id: string
  project_id: string
  version_number: number
  title: string
  slug: string
  primary_keyword: string
  modular_document: ModularDocument
  rendered_html?: string
  qa_report?: unknown | null
  status: string
  change_reason?: string | null
  generation_model?: string
  generation_temperature?: number
  created_by_regeneration: boolean
  created_at: string
  updated_at: string
}

export interface DonkeyArticlesListResponse {
  items: DonkeyArticleSummary[]
  total: number
  page: number
  page_size: number
}

export interface DonkeyPillarsListResponse {
  items: DonkeyPillar[]
  total: number
}

export interface DonkeyPublicationPatch {
  publish_status?: "scheduled" | "published" | "failed"
  published_at?: string
  published_url?: string
}

export interface DonkeyPublicationResponse {
  article_id: string
  project_id: string
  publish_status: string
  published_at: string | null
  published_url: string | null
  updated_at: string
}

// ============================================================================
// API Client
// ============================================================================

class DonkeySeoClient {
  private baseUrl: string
  private projectId: string
  private apiKey: string

  constructor() {
    this.baseUrl = process.env.DONKEY_SEO_API_BASE_URL || "https://api.donkeyseo.io"
    this.projectId = this.getRequiredEnv("DONKEY_SEO_PROJECT_ID")
    this.apiKey = this.getRequiredEnv("DONKEY_SEO_API_KEY")
  }

  private getRequiredEnv(name: string): string {
    const value = process.env[name]
    if (!value) {
      throw new Error(`Missing required environment variable: ${name}`)
    }
    return value
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`

    const response = await fetch(url, {
      ...options,
      headers: {
        "X-API-Key": this.apiKey,
        "Content-Type": "application/json",
        ...options?.headers,
      },
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error")
      throw new Error(
        `Donkey SEO API error: ${response.status} ${response.statusText} - ${errorText}`
      )
    }

    return response.json() as Promise<T>
  }

  async getArticles(
    page = 1,
    pageSize = 20
  ): Promise<DonkeyArticlesListResponse> {
    return this.request<DonkeyArticlesListResponse>(
      `/api/v1/integration/articles?project_id=${this.projectId}&page=${page}&page_size=${pageSize}`
    )
  }

  async getPillars(includeArchived = false): Promise<DonkeyPillarsListResponse> {
    const archived = includeArchived ? "true" : "false"
    return this.request<DonkeyPillarsListResponse>(
      `/api/v1/integration/pillars?project_id=${this.projectId}&include_archived=${archived}`
    )
  }

  async getArticle(articleId: string): Promise<DonkeyArticleDetail> {
    return this.request<DonkeyArticleDetail>(
      `/api/v1/integration/article/${articleId}?project_id=${this.projectId}`
    )
  }

  async getArticleVersion(
    articleId: string,
    versionNumber: number
  ): Promise<DonkeyArticleDetail> {
    return this.request<DonkeyArticleDetail>(
      `/api/v1/integration/article/${articleId}/versions/${versionNumber}?project_id=${this.projectId}`
    )
  }

  async patchPublicationStatus(
    articleId: string,
    payload: DonkeyPublicationPatch
  ): Promise<DonkeyPublicationResponse> {
    return this.request<DonkeyPublicationResponse>(
      `/api/v1/integration/article/${articleId}/publication?project_id=${this.projectId}`,
      {
        method: "PATCH",
        body: JSON.stringify(payload),
      }
    )
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

let client: DonkeySeoClient | null = null

export function getDonkeySeoClient(): DonkeySeoClient {
  if (!client) {
    client = new DonkeySeoClient()
  }
  return client
}
