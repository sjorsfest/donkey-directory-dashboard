import { MockDirectoriesTable } from "~/components/mock-table";

export function meta() {
  return [{ title: "Launching your app? 🚀" }];
}

// Rendered at 1200 × 630 (standard OG image dimensions).
// Screenshot this page to produce the og:image asset.
export default function OgImage() {
  const directoryCount = 250;

  return (
    <div style={{ width: 1280, height: 800, overflow: "hidden" }}>
      <div
        className="relative overflow-hidden bg-background"
        style={{ width: 1280, height: 800 }}
      >
        {/* ── Dot grid ── */}
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.045]"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern id="og-dots" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1.5" fill="hsl(var(--foreground))" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#og-dots)" />
        </svg>

        {/* ── Indigo blob top-right ── */}
        <div className="pointer-events-none absolute -top-28 -right-28 h-72 w-72 rounded-full bg-primary/25 blur-3xl" />
        {/* ── Lime blob bottom-left ── */}
        <div className="pointer-events-none absolute bottom-32 -left-20 h-56 w-56 rounded-full bg-accent/20 blur-3xl" />

        {/* ── Top section ── */}
        <div className="relative z-10 flex flex-col gap-2 px-16 pt-14">

          {/* Headline */}
          <h1 className="font-[Fredoka] text-[4.2rem] font-bold leading-[1.08] text-foreground">
            
                        <span
              className="text-white"
              style={{
                WebkitTextStroke: "5px hsl(var(--foreground))",
                paintOrder: "stroke fill",
              }}
            >
            Launching your app? 🚀
            </span>
            
            <br />
            <span
              className="text-primary text-[3.4rem]"
              style={{
                WebkitTextStroke: "5px hsl(var(--foreground))",
                paintOrder: "stroke fill",
              }}
            >
              {directoryCount}+ curated directories
            </span>{" "}
            to do it{" "}

              right!

          </h1>
        </div>

        {/* ── Table section (overflows bottom on purpose) ── */}
        <div
          className="absolute left-8 right-8 overflow-hidden rounded-t-xl border-2 border-b-0 border-foreground shadow-[var(--shadow-md)]"
          style={{ top: 240 }}
        >
          {/* Gradient mask that fades the rows into the page bg at the bottom */}
          <div
            className="pointer-events-none absolute bottom-0 left-0 right-0 z-10"
            style={{
              height: 140,
              background:
                "linear-gradient(to top, #FAFAF8 20%, rgba(250,250,248,0.7) 60%, transparent 100%)",
            }}
          />
          <MockDirectoriesTable isAuthenticated={false} directoryCount={directoryCount} />
        </div>
      </div>
    </div>
  );
}
