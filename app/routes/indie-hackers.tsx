import { data, useLoaderData } from "react-router";
import { Link } from "react-router";
import { ListChecks, Zap, CheckCheck, Clock } from "lucide-react";

import type { Route } from "./+types/indie-hackers";
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
    { title: "Directory Submissions for Indie Hackers | Donkey Directories" },
    {
      name: "description",
      content:
        "You built it in a weekend. Stop spending another one on submissions. Browse 250+ launch directories, autofill every form in one click, and track your whole launch from one dashboard.",
    },
  ];
}

const BENEFITS = [
  {
    emoji: "⚡",
    title: "Submit in minutes, not days",
    body: "The Chrome extension fills every directory form with your saved product details. No copy-pasting taglines, no hunting for your logo URL.",
  },
  {
    emoji: "📋",
    title: "250+ directories, already curated",
    body: "Every meaningful place to list your product is already in here. Filter by category, domain authority, pricing, and whether you get a dofollow link.",
  },
  {
    emoji: "✅",
    title: "Never lose track",
    body: "The free dashboard shows every directory: submitted, in progress, or not started. No more wondering if you already submitted to BetaList.",
  },
  {
    emoji: "🔁",
    title: "Works for every project you ship",
    body: "Store brand details per project. When you launch the next thing, your profile is ready. Just submit.",
  },
];

export default function IndieHackersPage() {
  const { isAuthenticated } = useLoaderData<typeof loader>();

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8 space-y-6">

      {/* Hero */}
      <section className="rounded-lg border-2 border-foreground bg-card shadow-[var(--shadow-md)] overflow-hidden">
        <div className="px-6 py-10 sm:px-10 sm:py-14 flex flex-col items-center text-center gap-6 max-w-2xl mx-auto">

          <div className="inline-flex items-center gap-2 rounded-full border-2 border-foreground bg-foreground px-4 py-1.5 text-xs font-bold text-background">
            For indie hackers
          </div>

          <h1 className="font-heading text-3xl sm:text-5xl font-bold leading-[1.1]">
            You built it in a weekend.{" "}
            <span
              className="text-primary [-webkit-text-stroke:2px_hsl(var(--foreground))] sm:[-webkit-text-stroke:3px_hsl(var(--foreground))] [paint-order:stroke_fill]"
            >
              Stop spending another one on submissions.
            </span>
          </h1>

          <p className="text-sm sm:text-lg text-muted-foreground max-w-xl">
            Browse 250+ launch directories, autofill every form in one click, and track your whole launch from one dashboard. Free to start, no card needed.
          </p>

          {/* Bullets */}
          <ul className="flex flex-col gap-2.5 text-left w-full max-w-sm">
            {([
              { icon: ListChecks, text: "250+ curated directories in one place" },
              { icon: Zap,        text: "Chrome extension autofills every form" },
              { icon: CheckCheck, text: "Track every submission without a spreadsheet" },
              { icon: Clock,      text: "Save hours on every launch" },
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
                <Link to="/signup">Launch your project →</Link>
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
            Free forever. Upgrade only when you want one-click autofill.
          </p>
        </div>
      </section>

      {/* Benefits */}
      <section className="space-y-4">
        <div className="text-center space-y-1">
          <h2 className="font-heading text-2xl sm:text-3xl font-bold">
            Built for founders who ship, not marketers who strategize
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground">No bloat. No agency. Just your product in front of more people.</p>
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
