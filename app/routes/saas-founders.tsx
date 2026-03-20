import { data, useLoaderData } from "react-router";
import { Link } from "react-router";
import { ListChecks, Zap, CheckCheck, TrendingUp } from "lucide-react";

import type { Route } from "./+types/saas-founders";
import { API_ROUTES } from "~/lib/api-contract";
import { sendAuthenticatedRequest } from "~/lib/authenticated-api.server";
import { getServerApiBaseUrl } from "~/lib/api-base-url.server";
import { getSession } from "~/lib/session.server";
import { Button } from "@/shared/ui/button";
import { HowItWorks } from "~/components/how-it-works";
import { PricingSection } from "~/components/pricing-section";
import { FinalCtaSection } from "~/components/final-cta-section";

type LoaderData = {
  isAuthenticated: boolean;
};

function toOptionalString(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim().length > 0) return value.trim();
  return undefined;
}

export async function loader({ request }: Route.LoaderArgs) {
  const apiBaseUrl = getServerApiBaseUrl();
  const session = await getSession(request.headers.get("Cookie"));
  const hasSessionTokens =
    Boolean(toOptionalString(session.get("accessToken"))) ||
    Boolean(toOptionalString(session.get("refreshToken")));

  if (!hasSessionTokens) {
    return data<LoaderData>({ isAuthenticated: false });
  }

  const authResult = await sendAuthenticatedRequest({
    session,
    apiBaseUrl,
    path: API_ROUTES.auth.me,
    method: "GET",
  });

  return data<LoaderData>(
    { isAuthenticated: authResult.response.status === 200 },
    {
      headers: authResult.setCookie
        ? { "Set-Cookie": authResult.setCookie }
        : undefined,
    },
  );
}

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Directory Submissions for SaaS Founders | Donkey Directories" },
    {
      name: "description",
      content:
        "250+ dofollow backlinks. One afternoon. Directory submissions are your cheapest SEO investment. Filter by domain authority, autofill every form, and track your progress from one dashboard.",
    },
  ];
}

const BENEFITS = [
  {
    emoji: "🔗",
    title: "Filter by dofollow and domain authority",
    body: "Every directory in our database is tagged with link type and DA score. Focus your time on the listings that actually move your SEO needle.",
  },
  {
    emoji: "📈",
    title: "Backlinks that compound over time",
    body: "Directory listings send a steady trickle of referral traffic and pass link equity long after you submit. One afternoon of work, ongoing returns.",
  },
  {
    emoji: "⚡",
    title: "Autofill every form in one click",
    body: "Store your brand details once. The Chrome extension fills product name, tagline, description, tags, and URL into every directory form automatically.",
  },
  {
    emoji: "📊",
    title: "Track what you've submitted, what's live",
    body: "No more spreadsheets. The dashboard shows exactly where you stand across every directory: submitted, in progress, or not yet started.",
  },
];

export default function SaasFoundersPage() {
  const { isAuthenticated } = useLoaderData<typeof loader>();

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8 space-y-6">

      {/* Hero */}
      <section className="rounded-lg border-2 border-foreground bg-card shadow-[var(--shadow-md)] overflow-hidden">
        <div className="px-6 py-10 sm:px-10 sm:py-14 flex flex-col items-center text-center gap-6 max-w-2xl mx-auto">

          <div className="inline-flex items-center gap-2 rounded-full border-2 border-foreground bg-foreground px-4 py-1.5 text-xs font-bold text-background">
            For SaaS founders
          </div>

          <h1 className="font-heading text-3xl sm:text-5xl font-bold leading-[1.1]">
            250+ dofollow backlinks.{" "}
            <span
              className="text-primary [-webkit-text-stroke:2px_hsl(var(--foreground))] sm:[-webkit-text-stroke:3px_hsl(var(--foreground))] [paint-order:stroke_fill]"
            >
              One afternoon of work.
            </span>
          </h1>

          <p className="text-sm sm:text-lg text-muted-foreground max-w-xl">
            Directory submissions are your cheapest SEO investment. Filter by domain authority and link type, autofill every form with one click, and track every submission from one dashboard.
          </p>

          {/* Bullets */}
          <ul className="flex flex-col gap-2.5 text-left w-full max-w-sm">
            {([
              { icon: TrendingUp, text: "Filter by domain authority and link type" },
              { icon: Zap,        text: "Chrome extension autofills every form in one click" },
              { icon: ListChecks, text: "250+ directories, curated and always up to date" },
              { icon: CheckCheck, text: "Full submission tracker, free forever" },
            ] as const).map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-2.5 text-xs sm:text-sm font-medium">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 border-foreground bg-accent shadow-[1px_1px_0_#1A1A1A]">
                  <Icon className="h-3.5 w-3.5 text-accent-foreground" />
                </span>
                {text}
              </li>
            ))}
          </ul>

          {/* CTAs */}
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 pt-1">
            <Button
              asChild
              size="default"
              className="shadow-[var(--shadow-btn)] active:shadow-[var(--shadow-pressed)] active:translate-x-[3px] active:translate-y-[3px] transition-all"
            >
              {isAuthenticated ? (
                <Link to="/dashboard">Go to dashboard →</Link>
              ) : (
                <Link to="/signup">Start building backlinks →</Link>
              )}
            </Button>
            <Button
              asChild
              variant="outline"
              size="default"
              className="shadow-[var(--shadow-btn)] active:shadow-[var(--shadow-pressed)] active:translate-x-[3px] active:translate-y-[3px] transition-all"
            >
              <Link to="/">Browse directories ↓</Link>
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            Free to start. Upgrade for one-click autofill when you're ready to move fast.
          </p>
        </div>
      </section>

      {/* Benefits */}
      <section className="space-y-4">
        <div className="text-center space-y-1">
          <h2 className="font-heading text-2xl sm:text-3xl font-bold">
            The highest-ROI marketing channel you haven't fully worked yet
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground">No agency fees. No ongoing costs. Just backlinks that keep sending traffic.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {BENEFITS.map((b) => (
            <div
              key={b.title}
              className="rounded-xl border-2 border-foreground bg-card shadow-[var(--shadow-sm)] p-5 sm:p-6"
            >
              <div className="mb-3 text-2xl">{b.emoji}</div>
              <h3 className="font-heading text-base font-bold mb-1.5">{b.title}</h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{b.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <HowItWorks />

      {/* Pricing */}
      <div className="hidden sm:block">
        <PricingSection isAuthenticated={isAuthenticated} />
      </div>

      {/* Final CTA */}
      <FinalCtaSection isAuthenticated={isAuthenticated} />

    </div>
  );
}
