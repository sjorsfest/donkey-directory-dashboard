import { Chrome } from "lucide-react";

// ─── Page ─────────────────────────────────────────────────────────────────────

export function meta() {
  return [{ title: "Extension Promo 4 (Small Tile) — Donkey Directories" }];
}

export default function ExtensionPromo4() {
  return (
    <div style={{ width: 440, height: 280, overflow: "hidden" }}>
      <div
        className="relative overflow-hidden bg-background flex flex-col items-center justify-center gap-4"
        style={{ width: 440, height: 280 }}
      >
        {/* ── Decorative blobs ── */}
        <div className="pointer-events-none absolute -top-8 -right-8 h-32 w-32 rounded-full bg-primary/25 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-8 -left-8 h-28 w-28 rounded-full bg-accent/20 blur-2xl" />

        {/* ── Dot grid ── */}
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.045]"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern id="dots4" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1.5" fill="hsl(var(--foreground))" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#dots4)" />
        </svg>

        {/* ── Content ── */}
        <div className="relative z-10 flex flex-col items-center gap-3 text-center px-6">
          {/* Logo */}
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-foreground bg-card shadow-[4px_4px_0_hsl(var(--foreground))]">
            <img
              src="/static/donkey-128.webp"
              srcSet="/static/donkey-64.webp 64w, /static/donkey-128.webp 128w, /static/donkey-192.webp 192w"
              sizes="40px"
              alt=""
              aria-hidden="true"
              width={40}
              height={40}
              className="h-10 w-10 object-contain"
            />
          </div>

          {/* Name */}
          <div>
            <h2
              className="font-[Fredoka] text-[1.75rem] font-bold leading-tight text-white"
              style={{
                WebkitTextStroke: "4px hsl(var(--foreground))",
                paintOrder: "stroke fill",
              }}
            >
              Donkey Directories
            </h2>
            <p className="mt-1 text-sm font-medium text-foreground/60">
              Auto-fill directory submission forms
            </p>
          </div>

          {/* Badge */}
          <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-foreground bg-foreground px-3.5 py-1 text-xs font-bold text-background">
            <Chrome className="h-3 w-3" />
            Chrome Extension
          </span>
        </div>
      </div>
    </div>
  );
}
