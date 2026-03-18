import { motion } from "framer-motion";
import { Check, Chrome, CheckCheck, ListChecks } from "lucide-react";
import { Link } from "react-router";

import { MAIN_DOMAIN } from "@/shared/lib/main-domain";
import { Button } from "@/shared/ui/button";

// ─── Extension popup mockup ──────────────────────────────────────────────────

const EXTENSION_FIELDS = [
  { label: "App name",  value: "Donkey Directories",          done: true  },
  { label: "Website",   value: MAIN_DOMAIN,                   done: true  },
  { label: "Tagline",   value: "Submit to 100+ dirs without", done: false },
  { label: "Tags",      value: "SaaS · Productivity · Tools", done: true  },
] as const;

function ExtensionMockup() {
  return (
    <div className="w-full rounded-xl border-2 border-foreground/20 bg-card overflow-hidden shadow-[5px_5px_0_hsl(var(--primary))]">
      {/* Title bar */}
      <div className="flex items-center justify-between bg-[#1A1A1A] px-3.5 py-2.5">
        <div className="flex items-center gap-2">
          <Chrome className="h-3.5 w-3.5 text-white/50" />
          <span className="text-[0.65rem] font-bold text-white/90 tracking-wide">
            Donkey Directories
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[0.52rem] font-medium text-white/35 uppercase tracking-wider">
            Product Hunt
          </span>
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
        </div>
      </div>

      {/* Progress */}
      <div className="px-3.5 pt-3 pb-2">
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-[0.58rem] font-semibold text-foreground/55">
            Auto-filling form…
          </span>
          <span className="text-[0.6rem] font-bold text-foreground">3 / 4</span>
        </div>
        <div className="h-1.5 rounded-full bg-foreground/10 overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-primary"
            initial={{ width: "0%" }}
            animate={{ width: "75%" }}
            transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1], delay: 0.4 }}
          />
        </div>
      </div>

      {/* Fields */}
      <div className="space-y-2 px-3.5 pb-3">
        {EXTENSION_FIELDS.map((field) => (
          <div key={field.label}>
            <span className="mb-0.5 block text-[0.5rem] font-bold uppercase tracking-widest text-foreground/35">
              {field.label}
            </span>
            <div
              className={[
                "flex h-7 items-center gap-1.5 rounded-lg border px-2.5 text-[0.62rem] font-medium text-foreground",
                field.done
                  ? "border-emerald-200 bg-emerald-50"
                  : "border-foreground/15 bg-secondary/60",
              ].join(" ")}
            >
              <span className="flex-1 truncate">{field.value}</span>
              {field.done ? (
                <Check className="h-3 w-3 shrink-0 text-emerald-500" />
              ) : (
                <motion.span
                  className="h-3.5 w-px shrink-0 bg-foreground"
                  animate={{ opacity: [1, 0, 1] }}
                  transition={{ duration: 0.85, repeat: Infinity }}
                />
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Submit footer */}
      <div className="flex items-center justify-between border-t border-foreground/10 bg-secondary/30 px-3.5 py-2.5">
        <span className="text-[0.58rem] font-medium text-foreground/45">Filling last field…</span>
        <button className="rounded-lg border-2 border-foreground bg-primary px-3 py-1 text-[0.62rem] font-bold text-foreground shadow-[2px_2px_0_#1A1A1A] transition-all hover:translate-x-px hover:translate-y-px hover:shadow-[1px_1px_0_#1A1A1A]">
          Submit →
        </button>
      </div>
    </div>
  );
}

// ─── Step card components ─────────────────────────────────────────────────────

function StepChip({ number, inverted = false }: { number: string; inverted?: boolean }) {
  return (
    <span
      className={[
        "inline-flex h-8 w-8 items-center justify-center rounded-lg border-2 font-[Fredoka] text-sm font-bold",
        inverted
          ? "border-primary bg-primary text-foreground"
          : "border-foreground bg-primary text-foreground",
      ].join(" ")}
    >
      {number}
    </span>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function HowItWorks() {
  return (
    <section id="how-it-works" className="rounded-lg border-2 border-foreground bg-card shadow-[var(--shadow-md)] overflow-hidden">

      {/* ── Header ── */}
      <div className="px-8 pt-12 pb-8 text-center max-[640px]:px-5 max-[640px]:pt-8 max-[640px]:pb-6">
        <span className="mb-4 inline-flex items-center rounded-full border-2 border-foreground bg-foreground px-4 py-1.5 text-xs font-bold text-background">
          How it works
        </span>
        <h2 className="font-[Fredoka] text-[2.8rem] font-bold leading-[1.05] max-[640px]:text-[2rem]">
          Launch everywhere.{" "}
          <span
            className="text-primary"
            style={
              {
                WebkitTextStroke: "5px hsl(var(--foreground))",
                paintOrder: "stroke fill",
              } as React.CSSProperties
            }
          >
            Do it once.
          </span>
        </h2>
        <p className="mx-auto mt-3 max-w-md text-base font-medium text-muted-foreground max-[640px]:text-sm">
          Set up your product once. The Chrome extension fills every form for you.
          Your dashboard tracks it all.
        </p>
      </div>

      {/* ── Step cards ── */}
      <div className="flex items-stretch gap-3 px-8 pb-10 max-[800px]:flex-col max-[640px]:px-5 max-[640px]:pb-7">

        {/* ── Step 01 ── */}
        <div className="flex-1 rounded-xl border-2 border-foreground bg-secondary shadow-[var(--shadow-sm)] p-7 max-[640px]:p-5 flex flex-col">
          <StepChip number="01" />
          <h3 className="font-[Fredoka] text-[1.3rem] font-bold text-foreground leading-tight mb-2 mt-6">
            Just paste your URL
          </h3>
          <p className="text-sm font-medium text-muted-foreground leading-relaxed">
            That's literally it. We scrape your app name, tagline, description,
            screenshots, and socials automatically. Nothing else needed.
          </p>

          {/* Proof: URL in → everything out */}
          <div className="mt-6 pt-5 border-t border-foreground/10">
            <p className="text-[0.58rem] font-bold uppercase tracking-widest text-foreground/30 mb-2.5">
              You type
            </p>
            <div className="flex items-center gap-2 rounded-lg border border-foreground/20 bg-card px-3 py-2 mb-4">
              <span className="text-xs font-mono font-semibold text-foreground/70 flex-1">
                {MAIN_DOMAIN}
              </span>
              <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
            </div>
            <p className="text-[0.58rem] font-bold uppercase tracking-widest text-foreground/30 mb-2.5">
              We auto-scrape
            </p>
            <div className="flex flex-wrap gap-1.5">
              {["App name", "Tagline", "Description", "Screenshots", "Socials", "Tags"].map((f) => (
                <span
                  key={f}
                  className="inline-flex items-center gap-1 rounded-md border border-foreground/15 bg-card px-2 py-1 text-[0.62rem] font-semibold text-foreground/55"
                >
                  <Check className="h-2.5 w-2.5 text-emerald-500" />
                  {f}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Connector */}
        <div className="self-start mt-[52px] px-1 text-2xl font-bold text-foreground/20 shrink-0 max-[800px]:hidden">
          →
        </div>

        {/* ── Step 02 — hero card ── */}
        <div className="flex-1 rounded-xl border-2 border-foreground bg-foreground shadow-[6px_6px_0_hsl(var(--primary))] p-7 max-[640px]:p-5 flex flex-col">

          {/* Top row: chip + badge */}
          <div className="flex items-center gap-2.5 mb-4">
            <StepChip number="02" inverted />
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/15 px-2.5 py-1 text-[0.65rem] font-bold text-primary">
              <Chrome className="h-2.5 w-2.5" />
              Chrome Extension
            </span>
          </div>

          {/* Copy — above the mockup so it aligns with cards 1 & 3 */}
          <h3 className="font-[Fredoka] text-[1.3rem] font-bold text-background leading-tight mb-2">
            Click. Auto-filled. Submit.
          </h3>
          <p className="text-sm font-medium text-background/55 leading-relaxed mb-5">
            Open the extension on any directory site and every field fills itself in
            under a second. Hit submit and move on to the next one.
          </p>

          {/* Extension mockup — pushed to the bottom */}
          <div className="mt-auto">
            <ExtensionMockup />
          </div>
        </div>

        {/* Connector */}
        <div className="self-start mt-[52px] px-1 text-2xl font-bold text-foreground/20 shrink-0 max-[800px]:hidden">
          →
        </div>

        {/* ── Step 03 ── */}
        <div className="flex-1 rounded-xl border-2 border-foreground bg-secondary shadow-[var(--shadow-sm)] p-7 max-[640px]:p-5 flex flex-col">
          <StepChip number="03" />
          <h3 className="font-[Fredoka] text-[1.3rem] font-bold text-foreground leading-tight mb-2 mt-6">
            Watch your progress stack up
          </h3>
          <p className="text-sm font-medium text-muted-foreground leading-relaxed">
            Your dashboard shows exactly where you stand across every directory:
            submitted, in progress, or not yet started.
          </p>

          {/* Proof: tracking rows + progress */}
          <div className="mt-6 pt-5 border-t border-foreground/10 space-y-2">
            {([
              { name: "Product Hunt",  dot: "bg-emerald-400", label: "Submitted",   labelCls: "text-emerald-600 font-bold", icon: true  },
              { name: "BetaList",      dot: "bg-amber-400",   label: "In progress", labelCls: "text-amber-600 font-bold",   icon: false },
              { name: "Indie Hackers", dot: "bg-foreground/20", label: "Not started", labelCls: "text-foreground/35",       icon: false, muted: true },
              { name: "G2",            dot: "bg-foreground/20", label: "Not started", labelCls: "text-foreground/35",       icon: false, muted: true },
              { name: "Futurepedia",   dot: "bg-foreground/20", label: "Not started", labelCls: "text-foreground/35",       icon: false, muted: true },
            ] as const).map((row) => (
              <div
                key={row.name}
                className={[
                  "flex items-center gap-2.5 rounded-lg border border-foreground/12 bg-card px-3 py-2",
                  "muted" in row && row.muted ? "opacity-50" : "",
                ].join(" ")}
              >
                <span className={`h-2 w-2 shrink-0 rounded-full ${row.dot}`} />
                <span className="flex-1 text-xs font-medium text-foreground/60">{row.name}</span>
                <span className={`inline-flex items-center gap-1 text-[0.6rem] ${row.labelCls}`}>
                  {row.icon && <CheckCheck className="h-3 w-3" />}
                  {row.label}
                </span>
              </div>
            ))}

            {/* Progress bar */}
            <div className="pt-1">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[0.58rem] font-bold uppercase tracking-widest text-foreground/30">Progress</span>
                <span className="text-[0.65rem] font-bold text-foreground/50">12 / 84</span>
              </div>
              <div className="h-2 rounded-full bg-foreground/10 overflow-hidden">
                <div className="h-full w-[14%] rounded-full bg-primary" />
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* ── CTA bar ── */}
      <div className="flex items-center justify-between gap-4 flex-wrap border-t-2 border-foreground/10 bg-secondary/30 px-8 py-5 max-[640px]:px-5 max-[480px]:flex-col max-[480px]:items-stretch">
        <p className="text-sm font-medium text-muted-foreground">
          First{" "}
          <span className="font-bold text-foreground">5 submissions are free</span>, no credit card needed.
        </p>
        <div className="flex items-center gap-3 flex-wrap max-[480px]:flex-col">
          <Button
            asChild
            size="default"
            className="shadow-[var(--shadow-btn)] active:shadow-[var(--shadow-pressed)] active:translate-x-[3px] active:translate-y-[3px] transition-all font-bold"
          >
            <a
              href="https://chromewebstore.google.com/detail/donkey-directories/blphoelcahjoemkagpmeabpedloiepnm"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Chrome className="mr-1.5 h-4 w-4" />
              Install the Extension
            </a>
          </Button>
          <Button
            asChild
            variant="outline"
            size="default"
            className="shadow-[var(--shadow-btn)] active:shadow-[var(--shadow-pressed)] active:translate-x-[3px] active:translate-y-[3px] transition-all"
          >
            <Link to="/dashboard">Browse Directories →</Link>
          </Button>
        </div>
      </div>

    </section>
  );
}
