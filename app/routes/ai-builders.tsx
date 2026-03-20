import { data, useLoaderData } from "react-router";
import { Link } from "react-router";
import { ListChecks, Zap, CheckCheck, RefreshCw } from "lucide-react";

import type { Route } from "./+types/ai-builders";
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
    { title: "Directory Submissions for AI Builders | Donkey Directories" },
    {
      name: "description",
      content:
        "You ship products fast with AI tools. Your launch marketing should keep up. Submit to 250+ directories with one click per form, track every listing, and move on to the next build.",
    },
  ];
}

const BENEFITS = [
  {
    emoji: "🚀",
    title: "Ship fast, launch faster",
    body: "You use AI to build in days. The Chrome extension submits your product to directories in minutes. Your launch cycle matches your build cycle.",
  },
  {
    emoji: "🔄",
    title: "Ready for every project you launch",
    body: "Store brand details per project. When the next one ships, your profile is already filled in. One click per directory form, every time.",
  },
  {
    emoji: "🎯",
    title: "250+ directories, filtered to what matters",
    body: "Skip the noise. Filter by domain authority, category, and link type so you only submit to directories worth your time.",
  },
  {
    emoji: "📊",
    title: "One dashboard for all your launches",
    body: "Track submissions across every project from a single view. See what's submitted, what's in progress, and what still needs to go out.",
  },
];

export default function AiBuildersPage() {
  const { isAuthenticated } = useLoaderData<typeof loader>();

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8 space-y-6">

      {/* Hero */}
      <section className="rounded-lg border-2 border-foreground bg-card shadow-[var(--shadow-md)] overflow-hidden">
        <div className="px-6 py-10 sm:px-10 sm:py-14 flex flex-col items-center text-center gap-6 max-w-2xl mx-auto">

          <div className="inline-flex items-center gap-2 rounded-full border-2 border-foreground bg-foreground px-4 py-1.5 text-xs font-bold text-background">
            For AI builders
          </div>

          <h1 className="font-heading text-3xl sm:text-5xl font-bold leading-[1.1]">
            You ship products with AI.{" "}
            <span
              className="text-primary [-webkit-text-stroke:2px_hsl(var(--foreground))] sm:[-webkit-text-stroke:3px_hsl(var(--foreground))] [paint-order:stroke_fill]"
            >
              Your directory submissions should be just as fast.
            </span>
          </h1>

          <p className="text-sm sm:text-lg text-muted-foreground max-w-xl">
            Store your product details once. The Chrome extension autofills every directory form in one click. Browse 250+ curated directories and track all your launches from one dashboard.
          </p>

          {/* Bullets */}
          <ul className="flex flex-col gap-2.5 text-left w-full max-w-sm">
            {([
              { icon: Zap,        text: "One click per form. No copy-pasting, ever." },
              { icon: ListChecks, text: "250+ directories, always up to date" },
              { icon: RefreshCw,  text: "Reuse your profile across multiple projects" },
              { icon: CheckCheck, text: "Track every submission in one place" },
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
                <Link to="/signup">Start submitting →</Link>
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
            Free to start. Pay per submission only when you want one-click autofill.
          </p>
        </div>
      </section>

      {/* Benefits */}
      <section className="space-y-4">
        <div className="text-center space-y-1">
          <h2 className="font-heading text-2xl sm:text-3xl font-bold">
            Built for the pace you work at
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground">You ship in days. Your distribution tool should match.</p>
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
