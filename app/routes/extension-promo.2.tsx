import { Check, CheckCheck, Chrome } from "lucide-react";
import { motion } from "framer-motion";

// ─── Shared mockup pieces ─────────────────────────────────────────────────────

function UrlCard() {
  return (
    <div className="mt-auto pt-5 border-t border-foreground/10">
      <p className="text-[0.55rem] font-bold uppercase tracking-widest text-foreground/30 mb-2">
        You type
      </p>
      <div className="flex items-center gap-2 rounded-lg border border-foreground/20 bg-card px-3 py-2 mb-3">
        <span className="text-xs font-mono font-semibold text-foreground/70 flex-1">
          acmeapp.io
        </span>
        <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
      </div>
      <p className="text-[0.55rem] font-bold uppercase tracking-widest text-foreground/30 mb-2">
        We auto-scrape
      </p>
      <div className="flex flex-wrap gap-1.5">
        {["App name", "Tagline", "Description", "Screenshots", "Socials"].map((f) => (
          <span
            key={f}
            className="inline-flex items-center gap-1 rounded-md border border-foreground/15 bg-card px-2 py-1 text-[0.6rem] font-semibold text-foreground/55"
          >
            <Check className="h-2.5 w-2.5 text-emerald-500" />
            {f}
          </span>
        ))}
      </div>
    </div>
  );
}

const EXT_FIELDS = [
  { label: "App name", value: "Acme App", done: true },
  { label: "Website", value: "acmeapp.io", done: true },
  { label: "Tagline", value: "The fastest way to ship", done: false },
] as const;

function ExtensionMockupCompact() {
  return (
    <div className="mt-auto w-full rounded-xl border-2 border-primary/30 bg-card overflow-hidden shadow-[5px_5px_0_hsl(var(--primary))]">
      <div className="flex items-center justify-between bg-[#1A1A1A] px-3 py-2.5">
        <div className="flex items-center gap-1.5">
          <Chrome className="h-3.5 w-3.5 text-white/50" />
          <span className="text-[0.62rem] font-bold text-white/90">Donkey Directories</span>
        </div>
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
      </div>
      <div className="px-3 pt-3 pb-1.5">
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-[0.55rem] font-semibold text-foreground/55">Auto-filling…</span>
          <span className="text-[0.58rem] font-bold text-foreground">2 / 3</span>
        </div>
        <div className="h-1.5 rounded-full bg-foreground/10 overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-primary"
            initial={{ width: "0%" }}
            animate={{ width: "67%" }}
            transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1], delay: 0.5 }}
          />
        </div>
      </div>
      <div className="space-y-2 px-3 pb-3">
        {EXT_FIELDS.map((f) => (
          <div key={f.label}>
            <span className="mb-0.5 block text-[0.48rem] font-bold uppercase tracking-widest text-foreground/35">
              {f.label}
            </span>
            <div
              className={[
                "flex h-7 items-center gap-1.5 rounded-lg border px-2.5 text-[0.6rem] font-medium",
                f.done
                  ? "border-emerald-200 bg-emerald-50 text-foreground"
                  : "border-foreground/15 bg-secondary/60 text-foreground",
              ].join(" ")}
            >
              <span className="flex-1 truncate">{f.value}</span>
              {f.done ? (
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
      <div className="flex items-center justify-between border-t border-foreground/10 bg-secondary/30 px-3 py-2">
        <span className="text-[0.55rem] text-foreground/40">Filling field…</span>
        <button className="rounded-md border-2 border-foreground bg-primary px-2.5 py-1 text-[0.6rem] font-bold shadow-[2px_2px_0_#1A1A1A]">
          Submit →
        </button>
      </div>
    </div>
  );
}

const ROWS = [
  { name: "Product Hunt", dot: "bg-emerald-400", label: "Submitted", cls: "text-emerald-600 font-bold", icon: true },
  { name: "BetaList", dot: "bg-amber-400", label: "In progress", cls: "text-amber-600 font-bold", icon: false },
  { name: "Indie Hackers", dot: "bg-foreground/20", label: "Not started", cls: "text-foreground/35", muted: true },
  { name: "G2", dot: "bg-foreground/20", label: "Not started", cls: "text-foreground/35", muted: true },
  { name: "Futurepedia", dot: "bg-foreground/20", label: "Not started", cls: "text-foreground/35", muted: true },
] as const;

function ProgressMockup() {
  return (
    <div className="mt-auto space-y-2 pt-5 border-t border-foreground/10">
      {ROWS.map((row) => (
        <div
          key={row.name}
          className={[
            "flex items-center gap-2.5 rounded-lg border border-foreground/12 bg-card px-3 py-2",
            "muted" in row && row.muted ? "opacity-40" : "",
          ].join(" ")}
        >
          <span className={`h-2 w-2 shrink-0 rounded-full ${row.dot}`} />
          <span className="flex-1 text-xs font-medium text-foreground/60">{row.name}</span>
          <span className={`inline-flex items-center gap-1 text-[0.6rem] ${row.cls}`}>
            {row.icon && <CheckCheck className="h-3 w-3" />}
            {row.label}
          </span>
        </div>
      ))}
      <div className="pt-1">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[0.55rem] font-bold uppercase tracking-widest text-foreground/30">Progress</span>
          <span className="text-[0.62rem] font-bold text-foreground/50">12 / 250</span>
        </div>
        <div className="h-2 rounded-full bg-foreground/10 overflow-hidden">
          <div className="h-full w-[14%] rounded-full bg-primary" />
        </div>
      </div>
    </div>
  );
}

// ─── Step chip ────────────────────────────────────────────────────────────────

function StepChip({ n, inverted = false }: { n: string; inverted?: boolean }) {
  return (
    <span
      className={[
        "inline-flex h-8 w-8 items-center justify-center rounded-lg border-2 font-[Fredoka] text-sm font-bold",
        inverted ? "border-primary bg-primary text-foreground" : "border-foreground bg-primary text-foreground",
      ].join(" ")}
    >
      {n}
    </span>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function meta() {
  return [{ title: "Extension Promo 2 — Donkey Directories" }];
}

export default function ExtensionPromo2() {
  return (
    <div className="min-h-screen bg-secondary flex items-center justify-center p-8">
      <div
        className="relative w-[1280px] h-[800px] overflow-hidden rounded-2xl border-2 border-foreground bg-secondary shadow-[var(--shadow-md)] flex flex-col"
        style={{ flexShrink: 0 }}
      >
        {/* ── Decorative blobs ── */}
        <div className="pointer-events-none absolute -top-20 -right-20 h-64 w-64 rounded-full bg-primary/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-16 h-56 w-56 rounded-full bg-accent/15 blur-3xl" />

        {/* ── Header ── */}
        <div className="relative z-10 flex flex-col items-center text-center pt-12 pb-8 px-16">
          <span className="mb-4 inline-flex items-center gap-2 rounded-full border-2 border-foreground bg-foreground px-4 py-1.5 text-sm font-bold text-background">
            250+ directories
          </span>
          <h1 className="font-[Fredoka] text-[2.8rem] font-bold leading-[1.05] text-foreground">
            Track every submission,{" "}
            <span className="text-primary [-webkit-text-stroke:3px_hsl(var(--foreground))] [paint-order:stroke_fill]">
              effortlessly.
            </span>
          </h1>
          <p className="mt-3 max-w-xl text-base font-medium text-foreground/55">
            See what's done, what's pending, and where to go next — all in one place.
          </p>
        </div>

        {/* ── Cards ── */}
        <div className="relative z-10 flex flex-1 items-stretch gap-4 px-10 pb-10">

          {/* Card 1 */}
          <div className="flex-1 flex flex-col rounded-xl border-2 border-foreground bg-card shadow-[var(--shadow-sm)] p-6">
            <StepChip n="01" />
            <h3 className="font-[Fredoka] text-xl font-bold mt-5 mb-1.5 leading-tight">
              Just paste your URL
            </h3>
            <p className="text-sm font-medium text-foreground/55 leading-relaxed">
              We scrape your app name, tagline, description, screenshots, and socials automatically.
            </p>
            <UrlCard />
          </div>

          {/* Connector */}
          <div className="self-center text-2xl font-bold text-foreground/20 shrink-0 pb-8">→</div>

          {/* Card 2 — highlighted */}
          <div className="flex-1 flex flex-col rounded-xl border-2 border-foreground bg-foreground shadow-[6px_6px_0_hsl(var(--primary))] p-6">
            <div className="flex items-center gap-2.5 mb-4">
              <StepChip n="02" inverted />
              <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/15 px-2.5 py-1 text-[0.65rem] font-bold text-primary">
                <Chrome className="h-2.5 w-2.5" />
                Chrome Extension
              </span>
            </div>
            <h3 className="font-[Fredoka] text-xl font-bold text-background leading-tight mb-1.5">
              Click. Auto-filled. Submit.
            </h3>
            <p className="text-sm font-medium text-background/50 leading-relaxed">
              Open the extension on any directory. Every field fills in under a second. Hit submit and move on.
            </p>
            <ExtensionMockupCompact />
          </div>

          {/* Connector */}
          <div className="self-center text-2xl font-bold text-foreground/20 shrink-0 pb-8">→</div>

          {/* Card 3 */}
          <div className="flex-1 flex flex-col rounded-xl border-2 border-foreground bg-card shadow-[var(--shadow-sm)] p-6">
            <StepChip n="03" />
            <h3 className="font-[Fredoka] text-xl font-bold mt-5 mb-1.5 leading-tight">
              Watch your progress stack up
            </h3>
            <p className="text-sm font-medium text-foreground/55 leading-relaxed">
              Your dashboard shows exactly where you stand across every directory.
            </p>
            <ProgressMockup />
          </div>
        </div>

        {/* ── Footer bar ── */}
        <div className="relative z-10 border-t-2 border-foreground/10 bg-card/50 px-10 py-4 text-center">
          <p className="text-sm font-medium text-foreground/45">
            No copy-paste. No tab-switching. Just submissions.
          </p>
        </div>
      </div>
    </div>
  );
}
