import { motion } from "framer-motion";
import { Check, Chrome } from "lucide-react";

// ─── Compact extension mockup ─────────────────────────────────────────────────

const FIELDS = [
  { label: "App name", value: "Acme App", done: true },
  { label: "Website", value: "acmeapp.io", done: true },
  { label: "Tagline", value: "The fastest way to ship", done: false },
] as const;

function ExtensionMockup() {
  return (
    <div className="w-[300px] rounded-xl border-2 border-foreground/20 bg-card overflow-hidden shadow-[8px_8px_0_hsl(var(--foreground))]">
      <div className="flex items-center justify-between bg-[#1A1A1A] px-4 py-3">
        <div className="flex items-center gap-2">
          <Chrome className="h-4 w-4 text-white/50" />
          <span className="text-[0.72rem] font-bold text-white/90 tracking-wide">
            Donkey Directories
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[0.58rem] text-white/35 uppercase tracking-wider font-medium">
            ProductHunt
          </span>
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
        </div>
      </div>

      <div className="px-4 pt-3.5 pb-2">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[0.65rem] font-semibold text-foreground/55">Auto-filling form…</span>
          <span className="text-[0.68rem] font-bold text-foreground">2 / 3</span>
        </div>
        <div className="h-2 rounded-full bg-foreground/10 overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-primary"
            initial={{ width: "0%" }}
            animate={{ width: "67%" }}
            transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
          />
        </div>
      </div>

      <div className="space-y-2.5 px-4 pb-4">
        {FIELDS.map((f) => (
          <div key={f.label}>
            <span className="mb-0.5 block text-[0.52rem] font-bold uppercase tracking-widest text-foreground/35">
              {f.label}
            </span>
            <div
              className={[
                "flex h-8 items-center gap-2 rounded-lg border px-3 text-[0.68rem] font-medium text-foreground",
                f.done
                  ? "border-emerald-200 bg-emerald-50"
                  : "border-foreground/15 bg-secondary/60",
              ].join(" ")}
            >
              <span className="flex-1 truncate">{f.value}</span>
              {f.done ? (
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

      <div className="flex items-center justify-between border-t border-foreground/10 bg-secondary/30 px-4 py-2.5">
        <span className="text-[0.62rem] text-foreground/45">Filling last field…</span>
        <button className="rounded-lg border-2 border-foreground bg-primary px-3.5 py-1.5 text-[0.68rem] font-bold text-foreground shadow-[2px_2px_0_#1A1A1A]">
          Submit →
        </button>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function meta() {
  return [{ title: "Extension Promo 3 (Marquee) — Donkey Directories" }];
}

export default function ExtensionPromo3() {
  return (
    <div style={{ width: 1400, height: 560, overflow: "hidden" }}>
      <div
        className="relative overflow-hidden bg-background flex items-center"
        style={{ width: 1400, height: 560 }}
      >
        {/* ── Decorative blobs ── */}
        <div className="pointer-events-none absolute -top-28 -right-28 h-72 w-72 rounded-full bg-primary/25 blur-3xl" />
        <div className="pointer-events-none absolute bottom-32 -left-20 h-56 w-56 rounded-full bg-accent/20 blur-3xl" />

        {/* ── Dot grid ── */}
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.045]"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern id="dots3" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1.5" fill="hsl(var(--foreground))" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dots3)" />
        </svg>

        {/* ── Left column ── */}
        <div className="relative z-10 flex flex-col gap-6 pl-20 pr-12 w-[640px] shrink-0">
          {/* Logo + name */}
          <div className="flex items-center gap-3">
            <img
              src="/static/donkey-128.webp"
              srcSet="/static/donkey-64.webp 64w, /static/donkey-128.webp 128w, /static/donkey-192.webp 192w"
              sizes="48px"
              alt=""
              aria-hidden="true"
              width={48}
              height={48}
              className="h-12 w-12 object-contain rounded-xl border-2 border-foreground/20 bg-secondary/40 p-1"
            />
            <span className="font-[Fredoka] text-lg font-bold text-foreground/70">
              Donkey Directories
            </span>
          </div>

          {/* Headline */}
          <h1 className="font-[Fredoka] text-[3.4rem] font-bold leading-[1.05]">
            <span
              className="text-white"
              style={{
                WebkitTextStroke: "5px hsl(var(--foreground))",
                paintOrder: "stroke fill",
              }}
            >
              Submit to 250+ directories
            </span>
            <br />
            <span
              className="text-primary"
              style={{
                WebkitTextStroke: "5px hsl(var(--foreground))",
                paintOrder: "stroke fill",
              }}
            >
              without copy-pasting.
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-lg font-medium text-foreground/60 max-w-[500px] leading-relaxed">
            Auto-fill every submission form with your saved brand profile.
            One click. Done.
          </p>

          {/* CTA */}
          <button className="w-fit rounded-xl border-2 border-foreground bg-foreground px-7 py-3.5 text-base font-bold text-background shadow-[4px_4px_0_hsl(var(--primary))] transition-all hover:translate-x-px hover:translate-y-px hover:shadow-[3px_3px_0_hsl(var(--primary))]">
            Add to Chrome →
          </button>
        </div>

        {/* ── Right column ── */}
        <div className="relative z-10 flex flex-1 items-center justify-center pr-16">
          <ExtensionMockup />
        </div>
      </div>
    </div>
  );
}
