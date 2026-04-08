// Blog Article Page
// Displays individual article from Donkey SEO

import type { Route } from "./+types/blog.$slug"
import { data, Link } from "react-router"
import { ArticleRenderer } from "~/components/blog/ArticleRenderer"
import { getPublishedArticleBySlug } from "~/lib/blog-data.server"

const HTML_CACHE_CONTROL =
  "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400"

const CANONICAL_ORIGIN = "https://donkey.directory"

export async function loader({ params }: Route.LoaderArgs) {
  const article = await getPublishedArticleBySlug(params.slug)

  if (!article) {
    throw data({ message: "Article not found" }, { status: 404 })
  }

  const modularDocument = article.webhook_payload.modular_document

  return data(
    { article, modularDocument },
    { headers: { "Cache-Control": HTML_CACHE_CONTROL } }
  )
}

export function meta({ data }: Route.MetaArgs) {
  if (!data) {
    return [{ title: "Article Not Found | Donkey Directories" }]
  }

  const { article } = data

  return [
    { title: `${article.seo_title || article.title} | Donkey Directories` },
    {
      name: "description",
      content:
        article.seo_description ??
        article.excerpt ??
        "Insights and guidance from Donkey Directories.",
    },
    { property: "og:title", content: article.seo_title || article.title },
    {
      property: "og:description",
      content: article.seo_description ?? article.excerpt ?? "",
    },
    { property: "og:type", content: "article" },
    {
      property: "og:url",
      content: `${CANONICAL_ORIGIN}/blog/${article.slug}`,
    },
    ...(article.featured_image_url
      ? [{ property: "og:image", content: article.featured_image_url }]
      : []),
  ]
}

export default function BlogArticlePage({ loaderData }: Route.ComponentProps) {
  const { article, modularDocument } = loaderData

  const authorName = modularDocument.author?.name || "Donkey Directories"
  const authorType = modularDocument.author?.name ? "Person" : "Organization"

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.excerpt,
    image:
      modularDocument.featured_image?.signed_url ||
      article.featured_image_url ||
      `${CANONICAL_ORIGIN}/og`,
    datePublished: article.published_at,
    author: {
      "@type": authorType,
      name: authorName,
      ...(authorType === "Organization" ? { url: CANONICAL_ORIGIN } : {}),
    },
    publisher: {
      "@type": "Organization",
      name: "Donkey Directories",
      url: CANONICAL_ORIGIN,
    },
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData).replace(/</g, "\\u003c"),
        }}
      />
      <main className="mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8 py-8 sm:py-12 md:py-16">
        <div className="max-w-4xl mx-auto">
          {/* Pillar breadcrumb */}
          {article.pillar_slug && article.pillar_name && (
            <div className="mb-4 sm:mb-5 md:mb-6">
              <Link
                to={`/pillars/${article.pillar_slug}`}
                className="inline-flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-medium text-accent-600 hover:text-accent-700 transition-colors no-underline"
              >
                <span>&larr;</span>
                <span>{article.pillar_name}</span>
              </Link>
            </div>
          )}

          {/* Article content */}
          <ArticleRenderer
            document={modularDocument}
            featuredImageUrl={article.featured_image_url}
            featuredImageAlt={article.featured_image_alt}
            publishedAt={article.published_at}
            updatedAt={article.updated_at}
          />

          {/* Back to pillar */}
          {article.pillar_slug && article.pillar_name && (
            <div className="mt-8 sm:mt-10 md:mt-12 pt-6 sm:pt-7 md:pt-8 border-t-2 border-foreground/20">
              <Link
                to={`/pillars/${article.pillar_slug}`}
                className="inline-flex items-center gap-1.5 sm:gap-2 text-sm sm:text-base text-accent-600 hover:text-accent-700 font-medium transition-colors no-underline"
              >
                <span>&larr;</span>
                <span>More articles in {article.pillar_name}</span>
              </Link>
            </div>
          )}
        </div>
      </main>
    </>
  )
}
