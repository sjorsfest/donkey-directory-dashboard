import { motion } from "framer-motion";
import { Check, CheckCheck, Chrome, ListChecks, Zap } from "lucide-react";

import { Button } from "@/shared/ui/button";

// ─── Extension mockup (self-contained for this promo page) ───────────────────

const FIELDS = [
  { label: "App name", value: "Acme App", done: true },
  { label: "Website", value: "acmeapp.io", done: true },
  { label: "Tagline", value: "The fastest way to ship", done: true },
  { label: "Tags", value: "SaaS · Productivity · Tools", done: false },
] as const;

function ExtensionMockup() {
  return (
    <div className="w-[280px] rounded-xl border-2 border-foreground/20 bg-card overflow-hidden shadow-[8px_8px_0_hsl(var(--foreground))]">
      <div className="flex items-center justify-between bg-[#1A1A1A] px-4 py-3">
        <div className="flex items-center gap-2">
          <Chrome className="h-4 w-4 text-white/50" />
          <span className="text-[0.72rem] font-bold text-white/90 tracking-wide">
            Donkey Directories
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[0.58rem] font-medium text-white/35 uppercase tracking-wider">
            ProductHunt
          </span>
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
        </div>
      </div>

      <div className="px-4 pt-3.5 pb-2.5">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[0.65rem] font-semibold text-foreground/55">
            Auto-filling form…
          </span>
          <span className="text-[0.68rem] font-bold text-foreground">3 / 4</span>
        </div>
        <div className="h-2 rounded-full bg-foreground/10 overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-primary"
            initial={{ width: "0%" }}
            animate={{ width: "75%" }}
            transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
          />
        </div>
      </div>

      <div className="space-y-2.5 px-4 pb-3.5">
        {FIELDS.map((field) => (
          <div key={field.label}>
            <span className="mb-0.5 block text-[0.54rem] font-bold uppercase tracking-widest text-foreground/35">
              {field.label}
            </span>
            <div
              className={[
                "flex h-8 items-center gap-2 rounded-lg border px-3 text-[0.68rem] font-medium text-foreground",
                field.done
                  ? "border-emerald-200 bg-emerald-50"
                  : "border-foreground/15 bg-secondary/60",
              ].join(" ")}
            >
              <span className="flex-1 truncate">{field.value}</span>
              {field.done ? (
                <Check className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
              ) : (
                <motion.span
                  className="h-4 w-px shrink-0 bg-foreground"
                  animate={{ opacity: [1, 0, 1] }}
                  transition={{ duration: 0.85, repeat: Infinity }}
                />
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between border-t border-foreground/10 bg-secondary/30 px-4 py-3">
        <span className="text-[0.63rem] font-medium text-foreground/45">Filling last field…</span>
        <button className="rounded-lg border-2 border-foreground bg-primary px-3.5 py-1.5 text-[0.68rem] font-bold text-foreground shadow-[2px_2px_0_#1A1A1A]">
          Submit →
        </button>
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export function meta() {
  return [{ title: "Extension Promo 1 — Donkey Directories" }];
}

export default function ExtensionPromo1() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-8">
      <div
        className="relative w-[1280px] h-[800px] overflow-hidden rounded-2xl border-2 border-foreground bg-background shadow-[var(--shadow-md)] flex items-center"
        style={{ flexShrink: 0 }}
      >
        {/* ── Decorative blobs ── */}
        <div className="pointer-events-none absolute -top-24 -right-24 h-80 w-80 rounded-full bg-primary/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-accent/20 blur-3xl" />

        {/* ── Dot grid ── */}
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.04]"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern id="dots" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1.5" fill="hsl(var(--foreground))" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dots)" />
        </svg>

        {/* ── Left column ── */}
        <div className="relative z-10 flex flex-col gap-7 px-20 w-[580px] shrink-0">
          {/* Badge */}
          <span className="inline-flex w-fit items-center gap-2 rounded-full border-2 border-foreground bg-foreground px-4 py-1.5 text-sm font-bold text-background">
            <Chrome className="h-3.5 w-3.5" />
            Chrome Extension
          </span>

          {/* Headline */}
          <div>
            <h1 className="font-[Fredoka] text-[3.6rem] font-bold leading-[1.05] text-foreground">
              Your brand,{" "}
              <span className="text-primary [-webkit-text-stroke:3px_hsl(var(--foreground))] [paint-order:stroke_fill]">
                auto-filled
              </span>{" "}
              everywhere.
            </h1>
            <p className="mt-4 text-lg font-medium text-foreground/60 leading-relaxed">
              Open the extension on any directory site.
              <br />
              Fields fill themselves. Move on.
            </p>
          </div>

          {/* Bullets */}
          <ul className="space-y-3">
            {[
              { icon: <Zap className="h-4 w-4 text-foreground" />, text: "Pulls data from your saved brand profile" },
              { icon: <CheckCheck className="h-4 w-4 text-foreground" />, text: "Fills every field in under a second" },
              { icon: <ListChecks className="h-4 w-4 text-foreground" />, text: "Tracks your submission progress across 250+ dirs" },
            ].map(({ icon, text }) => (
              <li key={text} className="flex items-center gap-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border-2 border-foreground bg-primary shadow-[2px_2px_0_#1A1A1A]">
                  {icon}
                </span>
                <span className="text-base font-medium text-foreground/70">{text}</span>
              </li>
            ))}
          </ul>

          {/* CTA */}
          <Button size="lg" className="w-fit text-base font-bold shadow-[var(--shadow-btn)]">
            Get the extension →
          </Button>
        </div>

        {/* ── Right column ── */}
        <div className="relative z-10 flex flex-1 items-center justify-center pr-16">
          <div className="relative">
            {/* Subtle bg card behind mockup */}
            <div className="absolute -inset-8 rounded-2xl border-2 border-foreground/8 bg-secondary/40" />
            <div className="relative">
              <ExtensionMockup />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
