import { Icon } from "@iconify/react";
import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { CheckCheck, Chrome, ListChecks, Zap } from "lucide-react";

import { MAIN_DOMAIN } from "@/shared/lib/main-domain";
import { Button } from "@/shared/ui/button";
import { ChromeExtensionLink } from "~/components/chrome-extension-link";

type Ripple = { x: number; y: number; t: number };
type Burst = { x: number; y: number; t: number };

function DotRippleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef<{ x: number; y: number } | null>(null);
  const displayMouseRef = useRef<{ x: number; y: number } | null>(null);
  const ripplesRef = useRef<Ripple[]>([]);
  const burstsRef = useRef<Burst[]>([]);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const GRID = 20;
    const BASE_R = 1;
    const MAX_EXTRA = 2.5;
    const RIPPLE_SPEED = 80;
    const RIPPLE_WIDTH = 28;
    const RIPPLE_LIFE = 1.4;
    const HOVER_RADIUS = 70;

    const BURST_SPEED = 180;
    const BURST_WIDTH = 40;
    const BURST_LIFE = 2.2;
    const BURST_MAX_EXTRA = 4.5;

    let last = performance.now();

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    const onMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };
    const onMouseLeave = () => { mouseRef.current = null; };
    const onClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      burstsRef.current.push({ x: e.clientX - rect.left, y: e.clientY - rect.top, t: 0 });
    };

    canvas.parentElement?.addEventListener("mousemove", onMouseMove);
    canvas.parentElement?.addEventListener("mouseleave", onMouseLeave);
    canvas.parentElement?.addEventListener("click", onClick);

    const draw = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;

      ripplesRef.current = ripplesRef.current
        .map(r => ({ ...r, t: r.t + dt }))
        .filter(r => r.t < RIPPLE_LIFE);

      burstsRef.current = burstsRef.current
        .map(b => ({ ...b, t: b.t + dt }))
        .filter(b => b.t < BURST_LIFE);

      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      // Lerp display mouse toward actual mouse for a "following" lag effect
      const LERP = 1 - Math.pow(0.008, dt);
      if (mouseRef.current) {
        if (!displayMouseRef.current) {
          displayMouseRef.current = { ...mouseRef.current };
        } else {
          displayMouseRef.current.x += (mouseRef.current.x - displayMouseRef.current.x) * LERP;
          displayMouseRef.current.y += (mouseRef.current.y - displayMouseRef.current.y) * LERP;
        }
      } else {
        displayMouseRef.current = null;
      }

      const mouse = displayMouseRef.current;

      for (let gx = GRID / 2; gx < w + GRID; gx += GRID) {
        for (let gy = GRID / 2; gy < h + GRID; gy += GRID) {
          let extra = 0;
          let color: string | null = null;

          // static hover bulge
          if (mouse) {
            const d = Math.hypot(gx - mouse.x, gy - mouse.y);
            if (d < HOVER_RADIUS) {
              const t = 1 - d / HOVER_RADIUS;
              extra = Math.max(extra, MAX_EXTRA * t * t);
            }
          }

          // ripple rings
          for (const r of ripplesRef.current) {
            const radius = r.t * RIPPLE_SPEED;
            const d = Math.hypot(gx - r.x, gy - r.y);
            const delta = Math.abs(d - radius);
            if (delta < RIPPLE_WIDTH) {
              const fade = 1 - r.t / RIPPLE_LIFE;
              const ring = 1 - delta / RIPPLE_WIDTH;
              extra = Math.max(extra, MAX_EXTRA * ring * fade);
            }
          }

          // burst rings (rainbow)
          for (const b of burstsRef.current) {
            const radius = b.t * BURST_SPEED;
            const d = Math.hypot(gx - b.x, gy - b.y);
            const delta = Math.abs(d - radius);
            if (delta < BURST_WIDTH) {
              const fade = 1 - b.t / BURST_LIFE;
              const ring = 1 - delta / BURST_WIDTH;
              const strength = BURST_MAX_EXTRA * ring * fade;
              if (strength > extra) {
                extra = strength;
                const angle = Math.atan2(gy - b.y, gx - b.x);
                const hue = ((angle / (Math.PI * 2)) * 360 + 360) % 360;
                color = `hsla(${hue}, 100%, 55%, ${0.3 + ring * fade * 0.7})`;
              }
            }
          }

          if (extra < 0.05) continue;

          ctx.beginPath();
          ctx.arc(gx, gy, BASE_R + extra, 0, Math.PI * 2);
          ctx.fillStyle = color ?? `rgba(61, 59, 243, ${0.15 + extra / MAX_EXTRA * 0.55})`;
          ctx.fill();
        }
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    rafRef.current = requestAnimationFrame(draw);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      canvas.parentElement?.removeEventListener("mousemove", onMouseMove);
      canvas.parentElement?.removeEventListener("mouseleave", onMouseLeave);
      canvas.parentElement?.removeEventListener("click", onClick);
      ro.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
    />
  );
}

const HERO_PHRASES = [
  { text: "auto-filled for you",       emoji: "⚡" },
  { text: "your progress, tracked",    emoji: "" },
  { text: "curated & fresh",    emoji: "✅" },
  { text: "zero copy-paste",           emoji: "🎯" },
];

type Props = {
  isAuthenticated: boolean;
  directoryCount: number | null;
  localDirectoryCount: number;
};

export function HomeHero({ isAuthenticated, directoryCount, localDirectoryCount }: Props) {
  const [activePhraseIndex, setActivePhraseIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActivePhraseIndex((prev) => (prev + 1) % HERO_PHRASES.length);
    }, 2800);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="rounded-lg border-2 border-foreground bg-card shadow-[var(--shadow-md)] overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px]">

        {/* Left — copy */}
        <div className="px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-12 flex flex-col justify-center gap-5 sm:gap-6">
          <div className="space-y-3">
            <h1 className="text-xl font-bold leading-[1.15] sm:text-3xl lg:text-[3.2rem]">
              <span className="text-2xl sm:text-3xl lg:text-[3.4rem] text-secondary [-webkit-text-stroke:2px_hsl(var(--foreground))] sm:[-webkit-text-stroke:4px_hsl(var(--foreground))] lg:[-webkit-text-stroke:6px_hsl(var(--foreground))] [paint-order:stroke_fill]">{directoryCount ?? localDirectoryCount}+ launch directories,</span>{" "}
              <span className="relative inline-block">
                <motion.span
                  key={activePhraseIndex}
                  initial={{ opacity: 0, y: 12, rotate: -2 }}
                  animate={{ opacity: 1, y: 0, rotate: 0 }}
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  className="inline-block text-[1.4rem] leading-[1.15] sm:text-[2.2rem] lg:text-[3.6rem] text-primary decoration-4 decoration-current [-webkit-text-stroke:2px_hsl(var(--foreground))] sm:[-webkit-text-stroke:4px_hsl(var(--foreground))] lg:[-webkit-text-stroke:6px_hsl(var(--foreground))] [paint-order:stroke_fill]"
                >
                  {HERO_PHRASES[activePhraseIndex].text}
                </motion.span>
                <motion.span
                  key={`emoji-${activePhraseIndex}`}
                  initial={{ opacity: 0, y: 12, rotate: -2 }}
                  animate={{ opacity: 1, y: 0, rotate: 0 }}
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  className="ml-1.5 inline-block text-[1.3rem] leading-[1.15] sm:text-[2.2rem] lg:text-[3.4rem]"
                >
                  {HERO_PHRASES[activePhraseIndex].emoji}
                </motion.span>
              </span>
            </h1>
            <p className="hidden sm:block text-foreground/80 text-sm font-medium max-w-md -mb-1">
              The complete checklist for a successful product launch.
            </p>
            <p className="text-foreground/60 text-xs sm:text-sm sm:text-foreground/80 font-medium max-w-md">
              Built to get you your first customers.
            </p>
          </div>

          {/* Feature bullets */}
          <ul className="flex flex-col gap-2.5">
            {([
              { icon: ListChecks, text: `${directoryCount ?? localDirectoryCount}+ curated directories, always up to date` },
              { icon: Zap,        text: "Chrome extension autofills forms. Skip the copy-paste." },
              { icon: CheckCheck, text: "Track every submission: not started, in progress, or done" },
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
          <div className="flex flex-col gap-3 pt-1">
            <div className="flex items-center gap-3 flex-wrap sm:gap-4">
              {!isAuthenticated && (
                <Button
                  asChild
                  size="default"
                  className="shadow-[var(--shadow-btn)] active:shadow-[var(--shadow-pressed)] active:translate-x-[3px] active:translate-y-[3px] transition-all"
                >
                  <Link to="/signup">Start your launch →</Link>
                </Button>
              )}
              {isAuthenticated ? (
                <Button
                  asChild
                  variant="outline"
                  size="default"
                  className="shadow-[var(--shadow-btn)] active:shadow-[var(--shadow-pressed)] active:translate-x-[3px] active:translate-y-[3px] transition-all"
                >
                  <Link to="/dashboard">See all directories ↓</Link>
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="default"
                  type="button"
                  onClick={() => document.getElementById("directories-table")?.scrollIntoView({ behavior: "smooth" })}
                  className="shadow-[var(--shadow-btn)] active:shadow-[var(--shadow-pressed)] active:translate-x-[3px] active:translate-y-[3px] transition-all"
                >
                  See all directories ↓
                </Button>
              )}
              {isAuthenticated && (
              <Button
                asChild
                size="default"
                className="hidden sm:inline-flex bg-primary text-secondary-foreground border-2 border-foreground shadow-[var(--shadow-btn)] active:shadow-[var(--shadow-pressed)] active:translate-x-[3px] active:translate-y-[3px] transition-all hover:bg-secondary/90"
              >
                <ChromeExtensionLink className="flex items-center gap-2">
                  <Icon icon="logos:chrome" className="size-5 shrink-0" />
                  Autofill every directory form
                </ChromeExtensionLink>
              </Button>
              )}
            </div>
            <button
              type="button"
              onClick={() => document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })}
              className="w-fit ml-2 text-sm font-medium text-foreground/45 hover:text-foreground/70 transition-colors flex items-center gap-1"
            >
              How does it work?
            </button>
          </div>

        </div>

        {/* Right — visual mockup */}
        <div className="hidden lg:flex border-l-2 border-foreground bg-secondary/40 items-center justify-center p-8 relative overflow-hidden">
          {/* Dot grid bg */}
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: "radial-gradient(circle, #1A1A1A 1.5px, transparent 1.5px)",
              backgroundSize: "20px 20px",
              maskImage: "linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.05) 10%, rgba(0,0,0,0.25) 35%, rgba(0,0,0,0.10) 50%, rgba(0,0,0,0.25) 65%, rgba(0,0,0,0.05) 90%, transparent 100%)",
              WebkitMaskImage: "linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.05) 10%, rgba(0,0,0,0.25) 35%, rgba(0,0,0,0.10) 50%, rgba(0,0,0,0.25) 65%, rgba(0,0,0,0.05) 90%, transparent 100%)",
              maskSize: "60% 100%",
              WebkitMaskSize: "60% 100%",
              maskRepeat: "no-repeat",
              WebkitMaskRepeat: "no-repeat",
              animation: "dot-wave 6s ease-in-out infinite",
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: "radial-gradient(circle, #C97A5A 1.5px, transparent 1.5px)",
              backgroundSize: "20px 20px",
              maskImage: "linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.05) 10%, rgba(0,0,0,0.25) 35%, rgba(0,0,0,0.10) 50%, rgba(0,0,0,0.25) 65%, rgba(0,0,0,0.05) 90%, transparent 100%)",
              WebkitMaskImage: "linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.05) 10%, rgba(0,0,0,0.25) 35%, rgba(0,0,0,0.10) 50%, rgba(0,0,0,0.25) 65%, rgba(0,0,0,0.05) 90%, transparent 100%)",
              maskSize: "60% 100%",
              WebkitMaskSize: "60% 100%",
              maskRepeat: "no-repeat",
              WebkitMaskRepeat: "no-repeat",
              animation: "dot-wave 6s ease-in-out infinite",
              animationDelay: "2s",
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: "radial-gradient(circle, hsl(var(--primary)) 1.5px, transparent 1.5px)",
              backgroundSize: "20px 20px",
              maskImage: "linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.05) 10%, rgba(0,0,0,0.25) 35%, rgba(0,0,0,0.10) 50%, rgba(0,0,0,0.25) 65%, rgba(0,0,0,0.05) 90%, transparent 100%)",
              WebkitMaskImage: "linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.05) 10%, rgba(0,0,0,0.25) 35%, rgba(0,0,0,0.10) 50%, rgba(0,0,0,0.25) 65%, rgba(0,0,0,0.05) 90%, transparent 100%)",
              maskSize: "60% 100%",
              WebkitMaskSize: "60% 100%",
              maskRepeat: "no-repeat",
              WebkitMaskRepeat: "no-repeat",
              animation: "dot-wave 6s ease-in-out infinite",
              animationDelay: "4s",
            }}
          />

          <DotRippleCanvas />

          {/* Outer wrapper — positions the extension card as an overlay */}
          <div className="relative w-full max-w-[300px]">

            {/* ── Dashboard window ── */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              whileHover={{ rotate: [-1, 1.5, -1.5, 1, 0], y: -3, transition: { duration: 0.45, ease: "easeInOut" } }}
              className="rounded-xl border-2 border-foreground bg-card shadow-[4px_4px_0_#1A1A1A] overflow-hidden"
            >
              {/* Browser bar */}
              <div className="flex items-center gap-1.5 px-3 py-2 border-b-2 border-foreground bg-secondary">
                <div className="w-2 h-2 rounded-full bg-red-400 border border-black/20" />
                <div className="w-2 h-2 rounded-full bg-yellow-400 border border-black/20" />
                <div className="w-2 h-2 rounded-full bg-green-400 border border-black/20" />
                <div className="flex-1 mx-2 h-4 rounded-sm bg-secondary-50 border border-foreground/20 flex items-center px-2">
                  <span className="text-[0.5rem] text-muted-foreground">{MAIN_DOMAIN}</span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="px-3 pt-2.5 pb-2 border-b border-foreground/10">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[0.55rem] font-bold text-foreground">Launch progress</span>
                  <span className="text-[0.55rem] font-bold" style={{ color: "hsl(var(--accent))" }}>2 of 5</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden bg-secondary border border-foreground/10">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: "hsl(var(--primary))" }}
                    initial={{ width: "0%" }}
                    animate={{ width: "40%" }}
                    transition={{ duration: 1, delay: 0.4, ease: "easeOut" }}
                  />
                </div>
              </div>

              {/* Table header */}
              <div className="grid grid-cols-[1fr_auto] gap-2 px-3 py-1.5 bg-secondary/30 border-b border-foreground/10">
                <span className="text-[0.45rem] font-bold uppercase tracking-widest text-muted-foreground">Directory</span>
                <span className="text-[0.45rem] font-bold uppercase tracking-widest text-muted-foreground">Status</span>
              </div>

              {/* Rows */}
              {([
                { name: "Product Hunt", status: "submitted"   },
                { name: "Hacker News",  status: "in_progress" },
                { name: "G2",           status: "none"        },
                { name: "BetaList",     status: "none"        },
                { name: "Futurepedia", status: "submitted"   },
              ] as { name: string; status: "submitted" | "in_progress" | "none" }[]).map((row, i) => (
                <motion.div
                  key={row.name}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: 0.15 + i * 0.07 }}
                  className="flex items-center justify-between pr-3 py-2 border-b border-foreground/8 last:border-0"
                  style={{
                    paddingLeft: row.status === "submitted" ? "calc(0.75rem - 2px)" : "0.75rem",
                    borderLeft: row.status === "submitted" ? "2px solid hsl(var(--primary))" : undefined,
                    background: row.status === "submitted"
                      ? "hsl(var(--primary) / 0.06)"
                      : row.status === "in_progress"
                      ? "hsl(45 100% 97%)"
                      : undefined,
                  } as React.CSSProperties}
                >
                  <span className="text-[0.6rem] font-semibold">{row.name}</span>
                  {row.status === "submitted" && (
                    <span className="text-[0.48rem] font-bold bg-accent text-accent-foreground rounded-full px-1.5 py-0.5 border border-foreground whitespace-nowrap">
                      ✓ Submitted
                    </span>
                  )}
                  {row.status === "in_progress" && (
                    <span className="text-[0.48rem] font-bold bg-amber-100 text-amber-800 rounded-full px-1.5 py-0.5 border border-amber-300 whitespace-nowrap">
                      In progress
                    </span>
                  )}
                  {row.status === "none" && (
                    <span className="text-[0.48rem] text-muted-foreground rounded-full px-1.5 py-0.5 border border-foreground/12 whitespace-nowrap">
                      Not started
                    </span>
                  )}
                </motion.div>
              ))}
            </motion.div>

            {/* ── Chrome extension popup — overlapping bottom-right ── */}
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.45, delay: 0.75, ease: [0.22, 1, 0.36, 1] }}
              whileHover={{ rotate: [1, -2, 2, -1, 0], y: -4, transition: { duration: 0.4, ease: "easeInOut" } }}
              style={{ y: 0 }}
              className="absolute -bottom-4 -right-4 w-[185px] rounded-xl border-2 border-foreground bg-card shadow-[4px_4px_0_#1A1A1A] overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-2.5 py-2 bg-foreground">
                <div className="flex items-center gap-1.5">
                  <Chrome className="h-3 w-3 text-background/80" />
                  <span className="text-[0.58rem] font-bold text-background">Chrome Extension</span>
                </div>
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              </div>

              {/* Autofill body */}
              <div className="px-2.5 py-2 space-y-1.5">
                <p className="text-[0.5rem] text-muted-foreground">
                  Submitting to <span className="font-bold text-foreground">BetaList</span> for you...
                </p>
                {/* Single field with cursor */}
                <div className="h-5 rounded-md border border-foreground/20 bg-secondary/40 px-2 flex items-center gap-0.5">
                  <span className="text-[0.55rem] text-foreground">My new app</span>
                  <motion.span
                    className="h-2.5 w-px bg-foreground"
                    animate={{ opacity: [1, 0, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  />
                </div>
              </div>

              {/* CTA */}
              <a
                href="https://chromewebstore.google.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between px-2.5 py-2 bg-accent-100 border-t border-foreground/15 hover:bg-secondary/40 transition-colors group"
              >
                <span className="text-[0.55rem] font-bold" style={{ color: "hsl(var(--accent))" }}>
                  Add to Chrome, it's free!
                </span>
                <span className="text-[0.6rem] font-bold text-muted-foreground group-hover:translate-x-0.5 transition-transform">→</span>
              </a>
            </motion.div>

          </div>
        </div>

      </div>
    </div>
  );
}
