// Pillar Disambiguation Page
// Shows articles in a specific pillar category

import { Link } from "react-router"
import { data } from "react-router"
import type { Route } from "./+types/pillars.$slug"
import { getArticlesByPillar, getCachedPillars } from "~/lib/blog-data.server"
import type { BlogArticleSummary } from "~/lib/blog-data.server"

const HTML_CACHE_CONTROL =
  "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400"

export async function loader({ params }: Route.LoaderArgs) {
  const [articles, pillars] = await Promise.all([
    getArticlesByPillar(params.slug),
    getCachedPillars(),
  ])

  const pillar = pillars.find((p) => p.slug === params.slug)

  if (!pillar && articles.length === 0) {
    throw data({ message: "Pillar not found" }, { status: 404 })
  }

  return data(
    {
      pillar: pillar || { name: params.slug, slug: params.slug, description: null },
      articles,
    },
    { headers: { "Cache-Control": HTML_CACHE_CONTROL } }
  )
}

export function meta({ data }: Route.MetaArgs) {
  if (!data) {
    return [{ title: "Topic Not Found | Donkey Directories" }]
  }

  const { pillar } = data

  return [
    { title: `${pillar.name} | Donkey Directories Blog` },
    {
      name: "description",
      content:
        pillar.description ||
        `Articles and guides about ${pillar.name} from Donkey Directories.`,
    },
  ]
}

function formatDate(dateString: string): string {
  try {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  } catch {
    return ""
  }
}

function ArticleCard({ article }: { article: BlogArticleSummary }) {
  return (
    <Link
      to={`/blog/${article.slug}`}
      className="group block rounded-lg border-2 border-foreground bg-background shadow-[var(--shadow-md)] transition-all duration-150 hover:shadow-[var(--shadow-sm)] hover:translate-x-[2px] hover:translate-y-[2px] no-underline"
    >
      {article.featured_image_url && (
        <div className="overflow-hidden rounded-t-[calc(0.5rem-2px)] border-b-2 border-foreground">
          <img
            src={article.featured_image_url}
            alt={article.featured_image_alt || article.title}
            className="w-full h-48 object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        </div>
      )}
      <div className="p-4 sm:p-5 md:p-6">
        <h2 className="font-[Fredoka] text-lg sm:text-xl font-bold text-foreground leading-tight group-hover:text-accent-600 transition-colors">
          {article.title}
        </h2>
        {article.excerpt && (
          <p className="mt-2 text-sm text-muted-foreground line-clamp-3 leading-relaxed">
            {article.excerpt}
          </p>
        )}
        {article.published_at && (
          <p className="mt-3 text-xs text-muted-foreground">
            {formatDate(article.published_at)}
          </p>
        )}
      </div>
    </Link>
  )
}

export default function PillarPage({ loaderData }: Route.ComponentProps) {
  const { pillar, articles } = loaderData

  return (
    <main className="mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8 py-8 sm:py-12 md:py-16">
      <div className="mb-4">
        <Link
          to="/blog"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-accent-600 hover:text-accent-700 transition-colors no-underline"
        >
          <span>&larr;</span>
          <span>All articles</span>
        </Link>
      </div>

      <div className="mb-8 sm:mb-10 md:mb-12">
        <h1 className="font-[Fredoka] text-3xl sm:text-4xl md:text-5xl font-bold text-foreground">
          {pillar.name}
        </h1>
        {pillar.description && (
          <p className="mt-2 sm:mt-3 text-base sm:text-lg text-muted-foreground max-w-2xl">
            {pillar.description}
          </p>
        )}
      </div>

      {articles.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-foreground/30 bg-secondary-50 px-6 py-16 text-center">
          <p className="text-lg font-semibold text-foreground">No articles yet</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Check back soon for articles in this topic.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 sm:gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {articles.map((article) => (
            <ArticleCard key={article.article_id} article={article} />
          ))}
        </div>
      )}
    </main>
  )
}
