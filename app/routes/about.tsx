import { data, useLoaderData } from "react-router";
import { ArrowRight, Check, Chrome, ListChecks, Rocket, Star, Target, Zap } from "lucide-react";
import { Link } from "react-router";

import type { Route } from "./+types/about";
import { API_ROUTES } from "~/lib/api-contract";
import { sendAuthenticatedRequest } from "~/lib/authenticated-api.server";
import { getServerApiBaseUrl } from "~/lib/api-base-url.server";
import { getSession } from "~/lib/session.server";
import { Button } from "@/shared/ui/button";
import { FAQSection } from "~/components/faq-section";
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
    { title: "About | Donkey Directories" },
    {
      name: "description",
      content:
        "Learn what Donkey Directories offers, who built it, and who it is built for.",
    },
  ];
}

const STATS = [
  { value: "250+", label: "Launch directories" },
  { value: "€0", label: "To start" },
  { value: "1-click", label: "Form autofill" },
  { value: "0", label: "Subscriptions ever" },
] as const;

const OFFERING_ITEMS = [
  {
    title: "Curated directory discovery",
    description:
      "Browse and filter 250+ launch directories by category, pricing, dofollow links, and domain authority.",
    icon: ListChecks,
    iconBg: "bg-primary",
    iconFg: "text-foreground",
    cellBg: "bg-card",
    badge: null,
  },
  {
    title: "Chrome extension autofill",
    description:
      "One-click form filling submits faster without copy-pasting your brand details across every site.",
    icon: Chrome,
    iconBg: "bg-accent",
    iconFg: "text-accent-foreground",
    cellBg: "bg-primary-100",
    badge: "Most time-saving",
  },
  {
    title: "Submission tracking dashboard",
    description:
      "Track each listing from not started to in progress to submitted so you always know what is left.",
    icon: Rocket,
    iconBg: "bg-secondary-300",
    iconFg: "text-foreground",
    cellBg: "bg-accent-100",
    badge: null,
  },
] as const;

const FREE_FEATURES = [
  "Browse 250+ directories",
  "Full tracker dashboard",
  "5 free autofill fills",
] as const;

const STARTER_FEATURES = [
  "100 autofill credits",
  "Credits never expire",
  "No subscription, ever",
] as const;

const LIFETIME_FEATURES = [
  "Unlimited one-click submissions",
  "Every new directory automatically",
  "All future product launches",
] as const;

const AUDIENCE_ITEMS = [
  "Indie founders launching their first product",
  "Solo builders who want distribution without manual busywork",
  "Early startup teams that need repeatable launch workflows",
] as const;

export default function AboutPage() {
  const { isAuthenticated } = useLoaderData<typeof loader>();

  return (
    <div className="mx-auto w-full max-w-[1200px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8 space-y-8 sm:space-y-10">
      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden rounded-2xl border-2 border-foreground bg-card shadow-[var(--shadow-md)]">
        {/* Dot-grid background */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage:
              "radial-gradient(circle, #1A1A1A 1.5px, transparent 1.5px)",
            backgroundSize: "22px 22px",
          }}
        />
        {/* Accent blobs */}
        <div className="pointer-events-none absolute -top-12 -right-12 h-48 w-48 rounded-full bg-primary/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-10 -left-10 h-36 w-36 rounded-full bg-accent/20 blur-3xl" />

        <div className="relative px-6 py-10 sm:px-10 sm:py-14 lg:py-16">
          {/* Eyebrow pill */}
          <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-foreground bg-primary px-3 py-1 text-xs font-bold uppercase tracking-widest text-foreground shadow-[var(--shadow-sm)]">
            <img
              src="/static/donkey.png"
              alt=""
              className="h-4 w-4 object-contain"
            />
            About Donkey Directories
          </span>

          {/* Headline */}
          <h1 className="mt-5 mb-0 max-w-[18ch] font-heading text-4xl font-bold leading-[1.05] sm:text-5xl lg:text-[3.8rem]">
            Launch everywhere.{" "}
            <span
              className="text-primary"
              style={{
                WebkitTextStroke: "3px hsl(0 0% 10%)",
                paintOrder: "stroke fill",
              }}
            >
              Stop repeating yourself.
            </span>
          </h1>

          <p className="mt-5 mb-0 max-w-[58ch] text-base leading-relaxed text-muted-foreground sm:text-lg">
            Donkey Directories gives founders one place to discover directories,
            submit with one-click autofill, and track every listing — without
            copy-pasting the same details 250 times.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button asChild size="lg">
              <Link to="/signup">
                Start for free
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/#pricing">See pricing</Link>
            </Button>
          </div>
        </div>

        {/* Stats strip */}
        <div className="relative border-t-2 border-foreground bg-foreground px-6 py-4 sm:px-10">
          <div className="flex flex-wrap items-center gap-6 sm:gap-10">
            {STATS.map(({ value, label }) => (
              <div key={label} className="flex flex-col">
                <span className="font-heading text-xl font-bold text-primary sm:text-2xl">
                  {value}
                </span>
                <span className="text-xs font-medium text-white/60">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────────── */}
      <section className="overflow-hidden rounded-2xl border-2 border-foreground bg-card shadow-[var(--shadow-md)]">
        <div className="border-b-2 border-foreground/10 px-6 py-6 sm:px-8 sm:py-7">
          <p className="mb-1.5 text-xs font-bold uppercase tracking-widest text-muted-foreground">
            What it does
          </p>
          <h2 className="m-0 font-heading text-2xl font-bold leading-tight sm:text-3xl">
            Everything your launch needs in one place
          </h2>
        </div>

        <div className="grid divide-y-2 divide-foreground/10 sm:grid-cols-3 sm:divide-x-2 sm:divide-y-0">
          {OFFERING_ITEMS.map(({ title, description, icon: Icon, iconBg, iconFg, cellBg, badge }) => (
            <article key={title} className={`${cellBg} flex flex-col gap-4 px-6 py-7`}>
              <div className="flex items-start justify-between">
                <span
                  className={`inline-flex h-10 w-10 items-center justify-center rounded-lg border-2 border-foreground ${iconBg} ${iconFg} shadow-[var(--shadow-sm)]`}
                >
                  <Icon className="h-5 w-5" />
                </span>
                {badge && (
                  <span className="inline-flex items-center rounded-full border border-foreground/15 bg-foreground/8 px-2.5 py-0.5 text-[0.6rem] font-bold uppercase tracking-wider text-muted-foreground">
                    {badge}
                  </span>
                )}
              </div>
              <div>
                <h3 className="mb-0 font-heading text-lg font-bold leading-tight">
                  {title}
                </h3>
                <p className="mb-0 mt-2 text-sm leading-relaxed text-muted-foreground">
                  {description}
                </p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ── Pricing ──────────────────────────────────────────────────── */}
      <section className="overflow-hidden rounded-2xl border-2 border-foreground bg-card shadow-[var(--shadow-md)]">
        <div className="border-b-2 border-foreground/10 px-6 py-6 sm:px-8 sm:py-7">
          <p className="mb-1.5 text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Pricing
          </p>
          <h2 className="m-0 font-heading text-2xl font-bold leading-tight">
            Simple, founder-friendly pricing
          </h2>
          <p className="mt-2 mb-0 text-sm text-muted-foreground">
            No subscription. Pay once, use forever.
          </p>
        </div>

        <div className="grid gap-4 p-5 sm:grid-cols-3 sm:p-7">
          {/* Free */}
          <div className="flex flex-col gap-3 rounded-xl border-2 border-foreground bg-secondary p-6 shadow-[var(--shadow-sm)]">
            <p className="m-0 text-[0.68rem] font-bold uppercase tracking-widest text-muted-foreground">
              Free
            </p>
            <div className="flex items-baseline gap-2">
              <span className="font-heading text-4xl font-bold tracking-tight">€0</span>
              <span className="text-sm text-muted-foreground">forever</span>
            </div>
            <p className="m-0 text-sm text-muted-foreground">
              Track all 250+ directories. No card needed.
            </p>
            <ul className="mt-1 flex flex-col gap-2">
              {FREE_FEATURES.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Check className="h-3.5 w-3.5 shrink-0" strokeWidth={2.5} />
                  {f}
                </li>
              ))}
            </ul>
          </div>

          {/* Starter */}
          <div className="relative flex flex-col gap-3 rounded-xl border-2 border-foreground bg-secondary p-6 shadow-[var(--shadow-sm)]">
            <div className="absolute inset-x-0 top-0 h-[3px] rounded-t-xl bg-primary" />
            <div className="flex items-center gap-2">
              <p className="m-0 text-[0.68rem] font-bold uppercase tracking-widest text-muted-foreground">
                Starter pack
              </p>
              <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[0.58rem] font-bold uppercase tracking-wider text-foreground">
                <Zap className="h-2.5 w-2.5" fill="currentColor" />
                Popular
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-heading text-4xl font-bold tracking-tight">€10</span>
              <span className="text-sm text-muted-foreground">one-time</span>
            </div>
            <p className="m-0 text-sm text-muted-foreground">
              100 one-click form fills. 10¢ per submission.
            </p>
            <ul className="mt-1 flex flex-col gap-2">
              {STARTER_FEATURES.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm font-medium text-foreground/80">
                  <Check className="h-3.5 w-3.5 shrink-0" strokeWidth={2.5} />
                  {f}
                </li>
              ))}
            </ul>
          </div>

          {/* Lifetime — inverted dark */}
          <div className="flex flex-col gap-3 rounded-xl border-2 border-foreground bg-foreground p-6 shadow-[var(--shadow-md)]">
            <div className="flex items-center gap-2">
              <p className="m-0 text-[0.68rem] font-bold uppercase tracking-widest text-white/60">
                Lifetime
              </p>
              <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-[0.58rem] font-bold uppercase tracking-wider text-white">
                <Star className="h-2.5 w-2.5" fill="currentColor" />
                Best value
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-heading text-4xl font-bold tracking-tight text-white">€50</span>
              <span className="text-sm text-white/60">once</span>
            </div>
            <p className="m-0 text-sm text-white/70">
              Pay once. Submit unlimited directories forever.
            </p>
            <ul className="mt-1 flex flex-col gap-2">
              {LIFETIME_FEATURES.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm font-medium text-white/80">
                  <Check className="h-3.5 w-3.5 shrink-0 text-primary" strokeWidth={2.5} />
                  {f}
                </li>
              ))}
            </ul>
            <Button asChild className="mt-2 w-full border-foreground bg-primary text-foreground hover:bg-primary/90">
              <Link to="/signup">Get lifetime access →</Link>
            </Button>
          </div>
        </div>

        <div className="border-t-2 border-foreground/10 bg-secondary/40 px-6 py-3 sm:px-8">
          <p className="m-0 text-xs text-muted-foreground">
            Secure payment via Stripe. All packs are one-time purchases — no recurring charges.
          </p>
        </div>
      </section>

      {/* ── Founder + Who it's for ────────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Founder */}
        <article className="rounded-2xl border-2 border-foreground bg-accent-100 p-6 shadow-[var(--shadow-md)] sm:p-8">
          <div className="mb-5 flex items-center gap-3">
            <div className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-foreground bg-accent font-heading text-lg font-bold text-white shadow-[var(--shadow-sm)]">
              S
            </div>
            <div>
              <p className="m-0 font-bold text-foreground">sjorsfest</p>
              <p className="m-0 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Indie maker · Amsterdam
              </p>
            </div>
          </div>

          <blockquote className="m-0 border-l-4 border-accent pl-4">
            <p className="m-0 text-base font-medium italic leading-relaxed text-foreground">
              &ldquo;I built Donkey Directories because I kept opening the same form fields on 50 different sites.
              I wanted one place to track it all and skip the copy-paste for good.&rdquo;
            </p>
          </blockquote>

          <p className="mb-0 mt-4 text-sm leading-relaxed text-muted-foreground">
            Donkey Directories is founder-built and shaped by the real work of launching products —
            not a VC-funded feature factory. Every feature exists because it solved a real launch problem.
          </p>
        </article>

        {/* Who it's for */}
        <article className="rounded-2xl border-2 border-foreground bg-primary-100 p-6 shadow-[var(--shadow-md)] sm:p-8">
          <span className="mb-5 inline-flex h-10 w-10 items-center justify-center rounded-lg border-2 border-foreground bg-primary shadow-[var(--shadow-sm)]">
            <Target className="h-5 w-5 text-foreground" />
          </span>
          <h2 className="mb-4 mt-4 font-heading text-2xl font-bold leading-tight">
            Built for you if&hellip;
          </h2>
          <ul className="flex flex-col gap-3">
            {AUDIENCE_ITEMS.map((item) => (
              <li key={item} className="flex items-start gap-3">
                <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 border-foreground bg-card shadow-[1px_1px_0_#1A1A1A]">
                  <Check className="h-3.5 w-3.5" strokeWidth={3} />
                </span>
                <span className="text-base font-medium leading-snug text-foreground">
                  {item}
                </span>
              </li>
            ))}
          </ul>
        </article>
      </div>

      {/* ── FAQ ──────────────────────────────────────────────────────── */}
      <FAQSection />

      {/* ── Final CTA ────────────────────────────────────────────────── */}
      <FinalCtaSection isAuthenticated={isAuthenticated} />
    </div>
  );
}
