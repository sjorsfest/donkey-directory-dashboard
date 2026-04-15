// Article Renderer Component
// Renders Donkey SEO modular document blocks with neo-brutalist design

import type { ReactNode } from "react"
import type { ModularDocument, ModularBlock } from "~/lib/donkey-seo-client.server"
import { cn } from "@/shared/lib/utils"

const CANONICAL_ORIGIN = "https://donkey.directory"

// ============================================================================
// Type Helpers
// ============================================================================

function safeString(value: unknown): string {
  if (value === null || value === undefined) return ""
  return String(value)
}

function safeArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : []
}

function isJsonLdObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false
  const record = value as Record<string, unknown>
  return typeof record["@type"] === "string" || typeof record["@context"] === "string"
}

function safeStructuredData(value: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(value)) {
    return value.filter(isJsonLdObject)
  }
  return isJsonLdObject(value) ? [value] : []
}

function serializeJsonLd(data: Record<string, unknown>): string {
  return JSON.stringify(data).replace(/</g, "\\u003c")
}

// ============================================================================
// Markdown Rendering
// ============================================================================

const INLINE_MARKDOWN_PATTERN = /(\[[^\]]+\]\([^)]+\)|\*\*[^*\n]+\*\*|`[^`\n]+`)/g
const LINK_MARKDOWN_PATTERN = /^\[([^\]]+)\]\(([^)]+)\)$/
const FENCED_CODE_BLOCK_PATTERN = /```([a-zA-Z0-9_-]+)?\n([\s\S]*?)```/g
const TABLE_PATTERN = /(?:^|\n)(\|.+\|(?:\n\|.+\|)+)/gm
const INTERNAL_HOST_SUFFIX = "donkey.directory"

function isExternalHref(href: string): boolean {
  const normalizedHref = href.trim()
  if (!normalizedHref) return false

  if (
    normalizedHref.startsWith("#") ||
    normalizedHref.startsWith("/") ||
    normalizedHref.startsWith("./") ||
    normalizedHref.startsWith("../") ||
    normalizedHref.startsWith("mailto:") ||
    normalizedHref.startsWith("tel:")
  ) {
    return false
  }

  try {
    const url = new URL(normalizedHref, CANONICAL_ORIGIN)
    if (url.protocol !== "http:" && url.protocol !== "https:") return false

    const hostname = url.hostname.toLowerCase()
    const isInternalHost = hostname === INTERNAL_HOST_SUFFIX || hostname.endsWith(`.${INTERNAL_HOST_SUFFIX}`)
    return !isInternalHost
  } catch {
    return false
  }
}

function getLinkAttrs(href: string): { target?: "_blank"; rel?: string } {
  if (!isExternalHref(href)) return {}
  return { target: "_blank", rel: "noopener noreferrer" }
}

type MarkdownBlock = {
  type: "paragraph" | "code" | "table"
  value: string
  language?: string
  tableData?: {
    headers: string[]
    rows: string[][]
  }
}

function renderTextWithLineBreaks(text: string, keyPrefix: string): ReactNode[] {
  const lines = text.split("\n")
  const nodes: ReactNode[] = []
  lines.forEach((line, index) => {
    nodes.push(line)
    if (index < lines.length - 1) {
      nodes.push(<br key={`${keyPrefix}-br-${index}`} />)
    }
  })
  return nodes
}

function renderInlineMarkdown(value: string): ReactNode[] {
  const nodes: ReactNode[] = []
  let cursor = 0
  let tokenIndex = 0

  for (const match of value.matchAll(INLINE_MARKDOWN_PATTERN)) {
    const token = match[0]
    if (!token) continue
    const start = match.index ?? 0
    const plainText = value.slice(cursor, start)
    if (plainText) {
      nodes.push(...renderTextWithLineBreaks(plainText, `plain-${tokenIndex}`))
      tokenIndex += 1
    }

    if (token.startsWith("**") && token.endsWith("**")) {
      nodes.push(
        <strong key={`strong-${tokenIndex}`} className="font-bold text-foreground">
          {token.slice(2, -2)}
        </strong>,
      )
      tokenIndex += 1
    } else if (token.startsWith("`") && token.endsWith("`")) {
      nodes.push(
        <code
          key={`code-${tokenIndex}`}
          className="rounded border border-foreground/20 bg-secondary-100 px-1.5 sm:px-2 py-0.5 font-mono text-xs sm:text-sm text-foreground break-words"
        >
          {token.slice(1, -1)}
        </code>,
      )
      tokenIndex += 1
    } else {
      const linkMatch = token.match(LINK_MARKDOWN_PATTERN)
      if (linkMatch) {
        const [, label, href] = linkMatch
        const linkAttrs = getLinkAttrs(href)
        nodes.push(
          <a
            key={`link-${tokenIndex}`}
            href={href}
            target={linkAttrs.target}
            rel={linkAttrs.rel}
            className="text-accent-600 hover:text-accent-700 underline underline-offset-2 font-medium transition-colors break-words"
          >
            {label}
          </a>,
        )
        tokenIndex += 1
      } else {
        nodes.push(...renderTextWithLineBreaks(token, `token-${tokenIndex}`))
        tokenIndex += 1
      }
    }

    cursor = start + token.length
  }

  const trailingText = value.slice(cursor)
  if (trailingText) {
    nodes.push(...renderTextWithLineBreaks(trailingText, `trail-${tokenIndex}`))
  }

  return nodes
}

function parseTableData(tableMarkdown: string): { headers: string[]; rows: string[][] } {
  const lines = tableMarkdown.trim().split("\n").map(line => line.trim()).filter(Boolean)
  if (lines.length < 3) return { headers: [], rows: [] }

  let separatorIndex = -1
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    if (line.startsWith("|") && line.endsWith("|") && /^[\s|:-]+$/.test(line)) {
      separatorIndex = i
      break
    }
  }

  if (separatorIndex < 1) return { headers: [], rows: [] }

  const headerLine = lines[separatorIndex - 1]
  const headers = headerLine.split("|").map((cell) => cell.trim()).filter(Boolean)

  const rows: string[][] = []
  for (let i = separatorIndex + 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line || !line.startsWith("|")) continue
    const cells = line.split("|").map((cell) => cell.trim()).filter(Boolean)
    if (cells.length > 0) rows.push(cells)
  }

  return { headers, rows }
}

function parseMarkdownBlocks(value: string): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = []
  let cursor = 0

  const pushParagraphBlocks = (text: string) => {
    text
      .split(/\n{2,}/)
      .map((paragraph) => paragraph.trim())
      .filter(Boolean)
      .forEach((paragraph) => {
        blocks.push({ type: "paragraph", value: paragraph })
      })
  }

  const allMatches: Array<{ type: "code" | "table"; index: number; length: number; data: MarkdownBlock }> = []

  for (const match of value.matchAll(FENCED_CODE_BLOCK_PATTERN)) {
    const fullMatch = match[0]
    if (!fullMatch) continue
    const start = match.index ?? 0
    allMatches.push({
      type: "code",
      index: start,
      length: fullMatch.length,
      data: {
        type: "code",
        language: safeString(match[1]),
        value: safeString(match[2]).replace(/\n$/, ""),
      },
    })
  }

  for (const match of value.matchAll(TABLE_PATTERN)) {
    const fullMatch = match[0]
    const tableContent = match[1]
    if (!tableContent) continue
    const start = match.index ?? 0
    const tableData = parseTableData(tableContent)
    if (tableData.headers.length > 0) {
      allMatches.push({
        type: "table",
        index: start,
        length: fullMatch.length,
        data: { type: "table", value: tableContent, tableData },
      })
    }
  }

  allMatches.sort((a, b) => a.index - b.index)

  for (const match of allMatches) {
    pushParagraphBlocks(value.slice(cursor, match.index))
    blocks.push(match.data)
    cursor = match.index + match.length
  }

  pushParagraphBlocks(value.slice(cursor))
  return blocks
}

function MarkdownContent({
  content,
  className,
  paragraphClassName,
}: {
  content: string
  className?: string
  paragraphClassName: string
}) {
  const normalized = safeString(content).trim()
  if (!normalized) return null

  const blocks = parseMarkdownBlocks(normalized)
  if (blocks.length === 0) return null

  return (
    <div className={cn("space-y-3 sm:space-y-4", className)}>
      {blocks.map((block, index) => {
        if (block.type === "code") {
          return (
            <pre
              key={index}
              data-language={block.language || undefined}
              className="overflow-x-auto rounded-lg border-2 border-foreground bg-foreground px-3 sm:px-4 md:px-5 py-3 sm:py-4 text-xs sm:text-sm leading-relaxed text-secondary-100 shadow-[var(--shadow-sm)] font-mono -mx-5 sm:mx-0"
            >
              <code>{block.value}</code>
            </pre>
          )
        }

        if (block.type === "table" && block.tableData) {
          const { headers, rows } = block.tableData
          return (
            <div key={index} className="overflow-x-auto rounded-lg border-2 border-foreground shadow-[var(--shadow-sm)] -mx-5 sm:mx-0">
              <table className="w-full text-xs sm:text-sm">
                <thead>
                  <tr className="border-b-2 border-foreground bg-primary-100">
                    {headers.map((header, i) => (
                      <th
                        key={i}
                        className="px-3 sm:px-4 md:px-6 py-2.5 sm:py-3 md:py-4 text-left text-[10px] sm:text-xs font-bold uppercase tracking-wide text-foreground"
                      >
                        <MarkdownInline content={header} />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, ri) => (
                    <tr
                      key={ri}
                      className="border-b border-foreground/20 last:border-b-0 even:bg-secondary-50 hover:bg-secondary-100 transition-colors"
                    >
                      {row.map((cell, ci) => (
                        <td key={ci} className="px-3 sm:px-4 md:px-6 py-2.5 sm:py-3 md:py-4 text-muted-foreground">
                          <MarkdownInline content={cell} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        }

        return (
          <p key={index} className={paragraphClassName}>
            {renderInlineMarkdown(block.value)}
          </p>
        )
      })}
    </div>
  )
}

function MarkdownInline({ content }: { content: string }) {
  const text = safeString(content)
  if (!text) return null
  return <>{renderInlineMarkdown(text)}</>
}

// ============================================================================
// Heading Tag Helper
// ============================================================================

function headingTag(level: number | undefined | null): "h2" | "h3" | "h4" {
  if (!level || level < 2) return "h2"
  if (level === 3) return "h3"
  return "h4"
}

const headingStyles: Record<string, string> = {
  h2: "font-[Fredoka] text-xl sm:text-3xl md:text-4xl font-bold leading-tight text-foreground",
  h3: "font-[Fredoka] text-lg sm:text-2xl md:text-3xl font-bold leading-tight text-foreground",
  h4: "font-[Fredoka] text-base sm:text-xl md:text-2xl font-bold leading-snug text-foreground",
}

// ============================================================================
// Link List Component
// ============================================================================

type LinkObject = { href?: string; anchor?: string }

function BlockLinks({ links }: { links?: ModularBlock["links"] }) {
  const safeLinks = safeArray(links).filter(
    (l): l is LinkObject => typeof l === "object" && l !== null && !!safeString((l as LinkObject).href),
  )
  if (safeLinks.length === 0) return null

  return (
    <ul className="mt-3 sm:mt-4 md:mt-5 flex flex-wrap gap-2 sm:gap-3">
      {safeLinks.map((link, i) => {
        const href = safeString(link.href)
        const text = safeString(link.anchor) || href
        const linkAttrs = getLinkAttrs(href)
        return (
          <li key={i}>
            <a
              href={href}
              target={linkAttrs.target}
              rel={linkAttrs.rel}
              className="inline-flex items-center gap-1 sm:gap-1.5 text-xs sm:text-sm text-accent-600 hover:text-accent-700 font-medium transition-colors underline underline-offset-2"
            >
              <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              {text}
            </a>
          </li>
        )
      })}
    </ul>
  )
}

// ============================================================================
// Block Renderers
// ============================================================================

function HeroBlock({ block, skipHeading }: { block: ModularBlock; skipHeading: boolean }) {
  const heading = safeString(block.heading)
  const body = safeString(block.body)
  const visibleHeading = heading && !skipHeading
  if (!visibleHeading && !body) return null

  return (
    <header className="rounded-lg border-2 border-foreground bg-primary-100 px-4 sm:px-6 md:px-8 py-6 sm:py-8 md:py-10 shadow-[var(--shadow-md)]">
      {visibleHeading && (
        <h2 className="font-[Fredoka] text-xl sm:text-3xl md:text-4xl font-bold leading-tight text-foreground mb-3 sm:mb-5">
          {heading}
        </h2>
      )}
      {body && (
        <MarkdownContent
          content={body}
          className={cn(visibleHeading && "mt-0")}
          paragraphClassName="text-base sm:text-lg leading-relaxed text-foreground/80"
        />
      )}
      <BlockLinks links={block.links} />
    </header>
  )
}

function SummaryBlock({ block }: { block: ModularBlock }) {
  const heading = safeString(block.heading)
  const body = safeString(block.body)
  const items = safeArray<string>(block.items)

  return (
    <section className="rounded-lg border-2 border-foreground border-l-4 border-l-accent-500 bg-secondary-100 px-4 sm:px-6 md:px-7 py-4 sm:py-5 md:py-6 shadow-[var(--shadow-sm)]">
      {heading && (
        <h3 className="font-[Fredoka] text-xs sm:text-sm md:text-base font-bold uppercase tracking-wide text-foreground mb-2 sm:mb-3">
          {heading}
        </h3>
      )}
      {body && (
        <MarkdownContent
          content={body}
          className={cn(heading && "mt-0")}
          paragraphClassName="text-sm sm:text-base leading-relaxed text-muted-foreground"
        />
      )}
      {items.length > 0 && (
        <ul className="mt-3 sm:mt-4 space-y-2 sm:space-y-2.5">
          {items.map((item, i) => (
            <li key={i} className="flex items-start gap-2 sm:gap-3">
              <span className="flex-shrink-0 mt-1.5 w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-accent-500" />
              <span className="text-sm sm:text-base leading-relaxed text-muted-foreground">
                <MarkdownInline content={safeString(item)} />
              </span>
            </li>
          ))}
        </ul>
      )}
      <BlockLinks links={block.links} />
    </section>
  )
}

function SectionBlock({ block }: { block: ModularBlock }) {
  const heading = safeString(block.heading)
  const body = safeString(block.body)
  const items = safeArray<string>(block.items)
  const Tag = headingTag(block.level)

  return (
    <section className="space-y-3 sm:space-y-4">
      {heading && <Tag className={headingStyles[Tag]}>{heading}</Tag>}
      {body && (
        <MarkdownContent
          content={body}
          paragraphClassName="text-sm sm:text-base leading-relaxed text-muted-foreground"
        />
      )}
      {items.length > 0 && (
        <ul className="space-y-2 sm:space-y-3 mt-3 sm:mt-4 md:mt-5">
          {items.map((item, i) => (
            <li key={i} className="flex items-start gap-2 sm:gap-3 pl-0.5 sm:pl-1">
              <span className="flex-shrink-0 mt-2 w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-accent-500" />
              <span className="flex-1 text-sm sm:text-base leading-relaxed text-muted-foreground">
                <MarkdownInline content={safeString(item)} />
              </span>
            </li>
          ))}
        </ul>
      )}
      <BlockLinks links={block.links} />
    </section>
  )
}

function ListBlock({ block }: { block: ModularBlock }) {
  const heading = safeString(block.heading)
  const items = safeArray<string>(block.items)
  const isOrdered = block.ordered === true
  const Tag = headingTag(block.level)

  return (
    <section className="space-y-3 sm:space-y-4">
      {heading && <Tag className={headingStyles[Tag]}>{heading}</Tag>}
      {isOrdered ? (
        <ol className="space-y-2 sm:space-y-3 pl-5 sm:pl-6">
          {items.map((item, i) => (
            <li
              key={i}
              className="list-decimal pl-1.5 sm:pl-2 text-sm sm:text-base leading-relaxed text-muted-foreground marker:font-bold marker:text-accent-500"
            >
              <MarkdownInline content={safeString(item)} />
            </li>
          ))}
        </ol>
      ) : (
        <ul className="space-y-2 sm:space-y-3">
          {items.map((item, i) => (
            <li key={i} className="flex items-start gap-2 sm:gap-3 pl-0.5 sm:pl-1">
              <span className="flex-shrink-0 mt-2 w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-accent-500" />
              <span className="flex-1 text-sm sm:text-base leading-relaxed text-muted-foreground">
                <MarkdownInline content={safeString(item)} />
              </span>
            </li>
          ))}
        </ul>
      )}
      <BlockLinks links={block.links} />
    </section>
  )
}

function StepsBlock({ block }: { block: ModularBlock }) {
  const heading = safeString(block.heading)
  const items = safeArray<string>(block.items)
  const Tag = headingTag(block.level)

  return (
    <section className="space-y-3 sm:space-y-4 md:space-y-5">
      {heading && <Tag className={headingStyles[Tag]}>{heading}</Tag>}
      <ol className="space-y-3 sm:space-y-4 md:space-y-5">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-3 sm:gap-3.5 md:gap-4">
            <span className="flex h-7 w-7 sm:h-8 sm:w-8 md:h-9 md:w-9 flex-shrink-0 items-center justify-center rounded-full border-2 border-foreground bg-primary-300 text-foreground font-bold text-sm sm:text-base shadow-[var(--shadow-sm)]">
              {i + 1}
            </span>
            <span className="flex-1 pt-0.5 sm:pt-1 text-sm sm:text-base leading-relaxed text-muted-foreground">
              <MarkdownInline content={safeString(item)} />
            </span>
          </li>
        ))}
      </ol>
      <BlockLinks links={block.links} />
    </section>
  )
}

function ComparisonTableBlock({ block }: { block: ModularBlock }) {
  const heading = safeString(block.heading)
  const columns = safeArray<string>(block.table_columns)
  const rows = safeArray<string[]>(block.table_rows)
  const Tag = headingTag(block.level)

  if (columns.length === 0) return null

  return (
    <section className="space-y-3 sm:space-y-4 md:space-y-5">
      {heading && <Tag className={headingStyles[Tag]}>{heading}</Tag>}
      <div className="overflow-x-auto rounded-lg border-2 border-foreground shadow-[var(--shadow-md)] -mx-5 sm:mx-0">
        <table className="w-full text-xs sm:text-sm">
          <thead>
            <tr className="border-b-2 border-foreground bg-primary-100">
              {columns.map((col, i) => (
                <th
                  key={i}
                  className="px-3 sm:px-4 md:px-6 py-2.5 sm:py-3 md:py-4 text-left text-[10px] sm:text-xs font-bold uppercase tracking-wide text-foreground"
                >
                  {safeString(col)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => {
              const cells = Array.isArray(row) ? row : []
              return (
                <tr
                  key={ri}
                  className="border-b border-foreground/20 last:border-b-0 even:bg-secondary-50 hover:bg-secondary-100 transition-colors"
                >
                  {cells.map((cell, ci) => (
                    <td key={ci} className="px-3 sm:px-4 md:px-6 py-2.5 sm:py-3 md:py-4 text-muted-foreground">
                      <MarkdownInline content={safeString(cell)} />
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <BlockLinks links={block.links} />
    </section>
  )
}

type FaqItem = { question?: string; answer?: string }

function FaqBlock({ block }: { block: ModularBlock }) {
  const heading = safeString(block.heading)
  const faqItems = safeArray(block.faq_items).filter(
    (item): item is FaqItem => typeof item === "object" && item !== null && !!safeString((item as FaqItem).question),
  )
  const Tag = headingTag(block.level)

  if (faqItems.length === 0) return null

  return (
    <section className="space-y-3 sm:space-y-4 md:space-y-5">
      {heading && <Tag className={headingStyles[Tag]}>{heading}</Tag>}
      <div className="space-y-2 sm:space-y-3">
        {faqItems.map((item, i) => (
          <details
            key={i}
            className="group rounded-lg border-2 border-foreground bg-background overflow-hidden shadow-[var(--shadow-sm)]"
          >
            <summary className="cursor-pointer select-none list-none px-4 sm:px-5 md:px-6 py-3 sm:py-3.5 md:py-4 text-sm sm:text-base font-semibold text-foreground marker:content-[''] transition-colors hover:bg-secondary-100">
              <span className="flex items-center justify-between gap-2 sm:gap-3">
                <span className="flex-1">
                  <MarkdownInline content={safeString(item.question)} />
                </span>
                <span className="flex h-5 w-5 sm:h-6 sm:w-6 flex-shrink-0 items-center justify-center text-accent-500 text-lg sm:text-xl font-bold transition-transform group-open:rotate-45">
                  +
                </span>
              </span>
            </summary>
            <div className="border-t-2 border-foreground/20 bg-secondary-50 px-4 sm:px-5 md:px-6 py-3 sm:py-4 md:py-5">
              <MarkdownContent
                content={safeString(item.answer)}
                paragraphClassName="text-xs sm:text-sm leading-relaxed text-muted-foreground"
              />
            </div>
          </details>
        ))}
      </div>
      <BlockLinks links={block.links} />
    </section>
  )
}

type CtaObject = { label?: string; href?: string }

function CtaBlock({ block }: { block: ModularBlock }) {
  const heading = safeString(block.heading)
  const body = safeString(block.body)
  const cta: CtaObject = typeof block.cta === "object" && block.cta !== null ? block.cta as CtaObject : {}
  const ctaLabel = safeString(cta.label) || "Learn more"
  const ctaHref = safeString(cta.href) || "#"

  return (
    <aside className="rounded-lg border-2 border-foreground bg-primary-100 px-5 sm:px-8 md:px-10 py-8 sm:py-10 md:py-12 text-center shadow-[var(--shadow-md)]">
      {heading && (
        <h2 className="font-[Fredoka] text-lg sm:text-2xl md:text-3xl font-bold text-foreground mb-3 sm:mb-4">
          {heading}
        </h2>
      )}
      {body && (
        <MarkdownContent
          content={body}
          className={cn(heading && "mt-0")}
          paragraphClassName="mx-auto max-w-2xl text-sm sm:text-base leading-relaxed text-foreground/80"
        />
      )}
      <a
        href={ctaHref}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "inline-flex items-center gap-2 rounded-lg border-2 border-foreground bg-accent-500 px-5 sm:px-6 md:px-7 py-2.5 sm:py-3 md:py-3.5 text-sm sm:text-base font-semibold text-white shadow-[var(--shadow-btn)] transition-all duration-150 hover:brightness-110 active:translate-y-[2px] active:shadow-[var(--shadow-pressed)]",
          heading || body ? "mt-5 sm:mt-6" : "",
        )}
      >
        {ctaLabel}
        <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
        </svg>
      </a>
    </aside>
  )
}

function ConclusionBlock({ block }: { block: ModularBlock }) {
  const heading = safeString(block.heading)
  const body = safeString(block.body)
  const items = safeArray<string>(block.items)
  const Tag = headingTag(block.level)

  return (
    <footer className="rounded-lg border-2 border-foreground border-l-4 border-l-primary-500 bg-primary-50 px-4 sm:px-6 md:px-7 py-4 sm:py-5 md:py-6 shadow-[var(--shadow-sm)]">
      {heading && <Tag className={headingStyles[Tag]}>{heading}</Tag>}
      {body && (
        <MarkdownContent
          content={body}
          className={cn(heading && "mt-3 sm:mt-4")}
          paragraphClassName="text-sm sm:text-base leading-relaxed text-muted-foreground"
        />
      )}
      {items.length > 0 && (
        <ul className="mt-3 sm:mt-4 space-y-2 sm:space-y-2.5">
          {items.map((item, i) => (
            <li key={i} className="flex items-start gap-2 sm:gap-3">
              <span className="flex-shrink-0 mt-1.5 w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-primary-500" />
              <span className="text-sm sm:text-base leading-relaxed text-muted-foreground">
                <MarkdownInline content={safeString(item)} />
              </span>
            </li>
          ))}
        </ul>
      )}
      <BlockLinks links={block.links} />
    </footer>
  )
}

function SourcesBlock({ block }: { block: ModularBlock }) {
  const heading = safeString(block.heading) || "Sources"
  const body = safeString(block.body)
  const links = safeArray(block.links).filter(
    (l): l is LinkObject => typeof l === "object" && l !== null && !!safeString((l as LinkObject).href),
  )
  if (links.length === 0) return null

  return (
    <section className="rounded-lg border-2 border-foreground/30 bg-secondary-100 px-4 sm:px-5 md:px-6 py-4 sm:py-5">
      <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-muted-foreground">{heading}</h3>
      {body && (
        <MarkdownContent
          content={body}
          className="mt-2"
          paragraphClassName="text-xs sm:text-sm leading-relaxed text-muted-foreground"
        />
      )}
      {links.length > 0 && (
        <ul className="mt-3 sm:mt-4 space-y-1.5 sm:space-y-2">
          {links.map((link, i) => {
            const href = safeString(link.href)
            const text = safeString(link.anchor) || href
            return (
              <li key={i}>
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 sm:gap-1.5 text-xs sm:text-sm text-accent-600 hover:text-accent-700 transition-colors underline underline-offset-2 break-words"
                >
                  <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  {text}
                </a>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

function FallbackBlock({ block }: { block: ModularBlock }) {
  const heading = safeString(block.heading)
  const body = safeString(block.body)
  if (!heading && !body) return null

  return (
    <section className="space-y-4 rounded-lg border-2 border-dashed border-foreground/30 bg-secondary-50 p-6">
      <p className="text-xs text-muted-foreground">Unknown block type: {block.block_type}</p>
      {heading && <h3 className="font-bold text-lg text-foreground">{heading}</h3>}
      {body && (
        <MarkdownContent
          content={body}
          paragraphClassName="text-base leading-relaxed text-muted-foreground"
        />
      )}
      <BlockLinks links={block.links} />
    </section>
  )
}

// ============================================================================
// Block Dispatcher
// ============================================================================

function ArticleBlock({
  block,
  articleHasH1,
}: {
  block: ModularBlock
  articleHasH1: boolean
}) {
  const blockType = safeString(block.block_type)

  switch (blockType) {
    case "hero":
      return <HeroBlock block={block} skipHeading={articleHasH1} />
    case "summary":
      return <SummaryBlock block={block} />
    case "section":
      return <SectionBlock block={block} />
    case "list":
      return <ListBlock block={block} />
    case "steps":
      return <StepsBlock block={block} />
    case "comparison_table":
      return <ComparisonTableBlock block={block} />
    case "faq":
      return <FaqBlock block={block} />
    case "cta":
      return <CtaBlock block={block} />
    case "conclusion":
      return <ConclusionBlock block={block} />
    case "sources":
      return <SourcesBlock block={block} />
    default:
      return <FallbackBlock block={block} />
  }
}

// ============================================================================
// Main Article Renderer
// ============================================================================

interface ArticleRendererProps {
  document: ModularDocument
  featuredImageUrl?: string | null
  featuredImageAlt?: string | null
  publishedAt?: string | null
  updatedAt?: string | null
}

export function ArticleRenderer({
  document,
  featuredImageUrl: externalFeaturedImageUrl,
  featuredImageAlt: externalFeaturedImageAlt,
  publishedAt,
  updatedAt,
}: ArticleRendererProps) {
  const seoMeta = document.seo_meta
  const author = document.author
  const featuredImage = document.featured_image
  const blocks = safeArray<ModularBlock>(document.blocks)

  const h1Text = safeString(seoMeta?.h1)
  const featuredImageUrl = safeString(externalFeaturedImageUrl) || safeString(featuredImage?.signed_url)
  const featuredImageTitle = safeString(externalFeaturedImageAlt) || safeString(featuredImage?.title_text)
  const authorName = safeString(author?.name)
  const authorBio = safeString(author?.bio)
  const authorProfileImage = safeString(author?.profile_image?.signed_url)
  const authorTwitter = author?.social_urls?.twitter || author?.social_urls?.x
  const authorWebsite = author?.social_urls?.website
  const structuredData = safeStructuredData(document.structured_data)

  const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return ""
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    } catch {
      return ""
    }
  }

  const calculateReadingTime = (doc: ModularDocument): number => {
    const WORDS_PER_MINUTE = 255
    let wordCount = 0

    const h1 = safeString(doc.seo_meta?.h1)
    if (h1) wordCount += h1.split(/\s+/).filter(Boolean).length

    const docBlocks = safeArray<ModularBlock>(doc.blocks)
    docBlocks.forEach((block) => {
      const heading = safeString(block.heading)
      if (heading) wordCount += heading.split(/\s+/).filter(Boolean).length

      const body = safeString(block.body)
      if (body) wordCount += body.split(/\s+/).filter(Boolean).length

      const items = safeArray<string>(block.items)
      items.forEach((item) => {
        const itemText = safeString(item)
        if (itemText) wordCount += itemText.split(/\s+/).filter(Boolean).length
      })

      if (block.faq_items) {
        const faqItems = safeArray(block.faq_items) as Array<{ question?: string; answer?: string }>
        faqItems.forEach((item) => {
          const question = safeString(item?.question)
          const answer = safeString(item?.answer)
          if (question) wordCount += question.split(/\s+/).filter(Boolean).length
          if (answer) wordCount += answer.split(/\s+/).filter(Boolean).length
        })
      }

      if (block.table_columns) {
        safeArray<string>(block.table_columns).forEach((col) => {
          const colText = safeString(col)
          if (colText) wordCount += colText.split(/\s+/).filter(Boolean).length
        })
      }
      if (block.table_rows) {
        safeArray<string[]>(block.table_rows).forEach((row) => {
          if (Array.isArray(row)) {
            row.forEach((cell) => {
              const cellText = safeString(cell)
              if (cellText) wordCount += cellText.split(/\s+/).filter(Boolean).length
            })
          }
        })
      }
    })

    return Math.max(1, Math.ceil(wordCount / WORDS_PER_MINUTE))
  }

  const formattedPublishedDate = formatDate(publishedAt)
  const formattedUpdatedDate = formatDate(updatedAt)
  const showUpdatedDate = formattedUpdatedDate && publishedAt !== updatedAt
  const readingTimeMinutes = calculateReadingTime(document)

  return (
    <div className="mx-auto max-w-5xl">
      {structuredData.map((item, index) => (
        <script
          key={`structured-data-${index}`}
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: serializeJsonLd(item),
          }}
        />
      ))}

      <article className="rounded-lg border-2 border-foreground bg-white px-5 sm:px-8 md:px-12 lg:px-16 py-8 sm:py-10 md:py-12 space-y-8 sm:space-y-10 md:space-y-12 shadow-[var(--shadow-md)]">
        {/* Article H1 */}
        {h1Text && (
          <h1 className="font-[Fredoka] text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-tight tracking-tight text-foreground">
            {h1Text}
          </h1>
        )}

        {/* Featured Image */}
        {featuredImageUrl && (
          <div className="overflow-hidden rounded-lg border-2 border-foreground shadow-[var(--shadow-sm)]">
            <img
              src={featuredImageUrl}
              alt={featuredImageTitle || h1Text || "Article featured image"}
              className="w-full object-cover"
              loading="lazy"
              style={{
                aspectRatio:
                  featuredImage?.width && featuredImage?.height
                    ? `${featuredImage.width} / ${featuredImage.height}`
                    : "16 / 9",
              }}
            />
          </div>
        )}

        {/* Article Metadata (Author & Dates) */}
        {(authorName || formattedPublishedDate) && (
          <div className="pb-6 sm:pb-7 md:pb-8 border-b-2 border-foreground/20 space-y-4">
            {authorName && (
              <div className="flex items-center gap-3 sm:gap-4 md:gap-5">
                {authorProfileImage ? (
                  <img
                    src={authorProfileImage}
                    alt={authorName}
                    className="h-11 w-11 sm:h-12 sm:w-12 md:h-14 md:w-14 rounded-full object-cover border-2 border-foreground"
                  />
                ) : (
                  <div className="flex h-11 w-11 sm:h-12 sm:w-12 md:h-14 md:w-14 items-center justify-center rounded-full border-2 border-foreground bg-secondary-100 text-muted-foreground">
                    <svg className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                    <span className="font-semibold text-sm sm:text-base text-foreground">
                      {authorName}
                    </span>
                    {(authorTwitter || authorWebsite) && (
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        {authorTwitter && (
                          <a
                            href={authorTwitter}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-muted-foreground hover:text-accent-500 transition-colors"
                            aria-label="Twitter"
                          >
                            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                            </svg>
                          </a>
                        )}
                        {authorWebsite && (
                          <a
                            href={authorWebsite}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-muted-foreground hover:text-accent-500 transition-colors"
                            aria-label="Website"
                          >
                            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                            </svg>
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                  {authorBio && (
                    <p className="mt-0.5 sm:mt-1 text-xs sm:text-sm leading-relaxed text-muted-foreground">{authorBio}</p>
                  )}
                </div>
              </div>
            )}

            {(formattedPublishedDate || readingTimeMinutes) && (
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs sm:text-sm text-muted-foreground">
                {formattedPublishedDate && (
                  <time dateTime={publishedAt || undefined}>
                    {formattedPublishedDate}
                  </time>
                )}
                {showUpdatedDate && (
                  <>
                    <span className="text-foreground/30">•</span>
                    <time dateTime={updatedAt || undefined} title={`Last updated: ${formattedUpdatedDate}`}>
                      Updated {formattedUpdatedDate}
                    </time>
                  </>
                )}
                {readingTimeMinutes > 0 && (
                  <>
                    <span className="text-foreground/30">•</span>
                    <span>{readingTimeMinutes} min read</span>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* Article Blocks */}
        {blocks.map((block, index) => (
          <ArticleBlock key={index} block={block} articleHasH1={!!h1Text} />
        ))}
      </article>
    </div>
  )
}
