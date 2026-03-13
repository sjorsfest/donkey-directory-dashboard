import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { Link, data, useLoaderData } from "react-router";
import { CheckCheck, Chrome, ExternalLink, ListChecks, Zap } from "lucide-react";

import type { Route } from "./+types/home";
import { API_ROUTES, isApiDirectoryCountResponse } from "~/lib/api-contract";
import { sendAuthenticatedRequest } from "~/lib/authenticated-api.server";
import { getServerApiBaseUrl } from "~/lib/api-base-url.server";
import { getSession } from "~/lib/session.server";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";

type LoaderData = {
  isAuthenticated: boolean;
  directoryCount: number | null;
};

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Donkey Directories Dashboard" },
    {
      name: "description",
      content: "Donkey Directories dashboard — browse all directories.",
    },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const apiBaseUrl = getServerApiBaseUrl();
  const session = await getSession(request.headers.get("Cookie"));
  const hasSessionTokens =
    Boolean(toOptionalString(session.get("accessToken"))) ||
    Boolean(toOptionalString(session.get("refreshToken")));
  const directoryCount = await fetchDirectoryCount(apiBaseUrl);

  if (!hasSessionTokens) {
    return data<LoaderData>({
      isAuthenticated: false,
      directoryCount,
    });
  }

  const authResult = await sendAuthenticatedRequest({
    session,
    apiBaseUrl,
    path: API_ROUTES.auth.me,
    method: "GET",
  });

  return data<LoaderData>(
    {
      isAuthenticated: authResult.response.status === 200,
      directoryCount,
    },
    {
      headers: authResult.setCookie
        ? {
            "Set-Cookie": authResult.setCookie,
          }
        : undefined,
    },
  );
}

type PricingModel = "Free" | "Freemium" | "Paid";

type Directory = {
  name: string;
  url: string;
  category: string;
  pricingModel: PricingModel;
  dofollow: boolean;
};

const DIRECTORIES: Directory[] = [
  {
    name: "Product Hunt",
    url: "https://producthunt.com",
    category: "Tech / Startups",
    pricingModel: "Free",
    dofollow: false,
  },
  {
    name: "Hacker News",
    url: "https://news.ycombinator.com/show",
    category: "Tech",
    pricingModel: "Free",
    dofollow: false,
  },
  {
    name: "G2",
    url: "https://g2.com",
    category: "Software Reviews",
    pricingModel: "Freemium",
    dofollow: true,
  },
  {
    name: "Capterra",
    url: "https://capterra.com",
    category: "Software Reviews",
    pricingModel: "Freemium",
    dofollow: true,
  },
  {
    name: "AppSumo",
    url: "https://appsumo.com",
    category: "Deals / SaaS",
    pricingModel: "Paid",
    dofollow: true,
  },
  {
    name: "BetaList",
    url: "https://betalist.com",
    category: "Startups",
    pricingModel: "Freemium",
    dofollow: false,
  },
  {
    name: "Launching Next",
    url: "https://launchingnext.com",
    category: "Startups",
    pricingModel: "Free",
    dofollow: true,
  },
  {
    name: "SaaSHub",
    url: "https://saashub.com",
    category: "Software Discovery",
    pricingModel: "Free",
    dofollow: true,
  },
  {
    name: "There's An AI For That",
    url: "https://theresanaiforthat.com",
    category: "AI Tools",
    pricingModel: "Freemium",
    dofollow: false,
  },
  {
    name: "Futurepedia",
    url: "https://futurepedia.io",
    category: "AI Tools",
    pricingModel: "Free",
    dofollow: true,
  },
  {
    name: "Tool Finder",
    url: "https://toolfinder.co",
    category: "SaaS Tools",
    pricingModel: "Free",
    dofollow: true,
  },
  {
    name: "Indie Hackers",
    url: "https://indiehackers.com",
    category: "Community",
    pricingModel: "Free",
    dofollow: false,
  },
];

const PRICING_BADGE: Record<PricingModel, React.ReactNode> = {
  Free: <Badge variant="default">Free</Badge>,
  Freemium: <Badge variant="secondary">Freemium</Badge>,
  Paid: <Badge variant="accent">Paid</Badge>,
};

type SignupStatus = "none" | "in_progress" | "submitted";

const SIGNUP_CYCLE: SignupStatus[] = ["none", "in_progress", "submitted"];

function SignupBadge({ status }: { status: SignupStatus }) {
  if (status === "in_progress") {
    return (
      <Badge className="gap-1.5 border-amber-400 bg-amber-100 text-amber-800">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500" />
        In progress
      </Badge>
    );
  }
  if (status === "submitted") {
    return (
      <Badge variant="accent" className="gap-1.5">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-current opacity-75" />
        Submitted
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="gap-1.5 text-muted-foreground">
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-current opacity-30" />
      Not signed up
    </Badge>
  );
}

const STATUS_ROW_CLASS: Record<SignupStatus, string> = {
  none: "",
  in_progress: "bg-amber-50/60",
  submitted: "bg-accent/5",
};

type Ripple = { x: number; y: number; t: number };
type Burst = { x: number; y: number; t: number };

function DotRippleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef<{ x: number; y: number } | null>(null);
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
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      if (!mouseRef.current) {
        ripplesRef.current.push({ x, y, t: 0 });
      } else {
        const dx = x - mouseRef.current.x;
        const dy = y - mouseRef.current.y;
        if (dx * dx + dy * dy > 400) {
          ripplesRef.current.push({ x, y, t: 0 });
        }
      }
      mouseRef.current = { x, y };
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

      const mouse = mouseRef.current;

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

export default function HomePage() {
  const { isAuthenticated, directoryCount } = useLoaderData<typeof loader>();
  const [statuses, setStatuses] = useState<Record<string, SignupStatus>>({});

  function cycleStatus(name: string) {
    setStatuses((prev) => {
      const current = prev[name] ?? "none";
      const next = SIGNUP_CYCLE[(SIGNUP_CYCLE.indexOf(current) + 1) % SIGNUP_CYCLE.length];
      return { ...prev, [name]: next };
    });
  }

  return (
    <div className="mx-auto w-[min(1200px,calc(100vw-2rem))] max-[960px]:w-[min(1200px,calc(100vw-1rem))] py-8 space-y-8">
      {/* Hero */}
      <div className="rounded-lg border-2 border-foreground bg-card shadow-[var(--shadow-md)] overflow-hidden">
        <div className="grid max-[960px]:grid-cols-1 grid-cols-[1fr_420px]">

          {/* Left — copy */}
          <div className="px-10 py-12 max-[960px]:px-6 max-[960px]:py-8 flex flex-col justify-center gap-6">
            <span className="self-start inline-flex items-center gap-1.5 rounded-full border-2 border-foreground bg-accent text-accent-foreground px-3 py-1 text-[0.7rem] font-bold uppercase tracking-[0.1em]">
              Free launch toolkit
            </span>

            <div className="space-y-3">
              <h1 className="text-[2.6rem] font-bold leading-[1.1] max-[960px]:text-3xl">
                Track exactly where you&apos;ve submitted your product.
              </h1>
              <p className="text-muted-foreground text-base max-w-md">
                Every launch directory, curated in one place. Track each submission with a single click — and use the free Chrome extension to autofill forms in seconds instead of minutes.
              </p>
            </div>

            {/* Feature bullets */}
            <ul className="flex flex-col gap-2.5">
              {([
                { icon: ListChecks, text: `${directoryCount ?? DIRECTORIES.length}+ curated directories, always up to date` },
                { icon: CheckCheck, text: "Track every submission: not started, in progress, or done" },
                { icon: Zap,        text: "Chrome extension autofills forms — skip the copy-paste" },
              ] as const).map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-2.5 text-sm font-medium">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 border-foreground bg-accent shadow-[1px_1px_0_#1A1A1A]">
                    <Icon className="h-3.5 w-3.5 text-accent-foreground" />
                  </span>
                  {text}
                </li>
              ))}
            </ul>

            {/* CTAs */}
            <div className="flex items-center gap-4 flex-wrap pt-1">
              {!isAuthenticated && (
                <Button
                  asChild
                  size="default"
                  className="shadow-[var(--shadow-btn)] active:shadow-[var(--shadow-pressed)] active:translate-x-[3px] active:translate-y-[3px] transition-all"
                >
                  <Link to="/signup">Start tracking for free</Link>
                </Button>
              )}
              <button
                type="button"
                onClick={() => document.getElementById("directories-table")?.scrollIntoView({ behavior: "smooth" })}
                className="text-sm font-semibold underline underline-offset-4 decoration-foreground/30 hover:decoration-foreground transition-all"
              >
                See all directories ↓
              </button>
            </div>
          </div>

          {/* Right — visual mockup */}
          <div className="max-[960px]:hidden border-l-2 border-foreground bg-secondary/40 flex items-center justify-center p-8 relative overflow-hidden">
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
                backgroundImage: "radial-gradient(circle, #3D3BF3 1.5px, transparent 1.5px)",
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
                className="rounded-xl border-2 border-foreground bg-card shadow-[4px_4px_0_#1A1A1A] overflow-hidden"
              >
                {/* Browser bar */}
                <div className="flex items-center gap-1.5 px-3 py-2 border-b-2 border-foreground bg-secondary">
                  <div className="w-2 h-2 rounded-full bg-red-400 border border-black/20" />
                  <div className="w-2 h-2 rounded-full bg-yellow-400 border border-black/20" />
                  <div className="w-2 h-2 rounded-full bg-green-400 border border-black/20" />
                  <div className="flex-1 mx-2 h-4 rounded-sm bg-background border border-foreground/20 flex items-center px-2">
                    <span className="text-[0.5rem] text-muted-foreground">donkey.directory</span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="px-3 pt-2.5 pb-2 border-b border-foreground/10">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[0.55rem] font-bold text-foreground">Launch progress</span>
                    <span className="text-[0.55rem] font-bold" style={{ color: "hsl(var(--primary))" }}>2 of 5</span>
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
                  className="flex items-center justify-between px-2.5 py-2 border-t border-foreground/15 hover:bg-secondary/40 transition-colors group"
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

      {/* Directories table */}
      <div id="directories-table" className="rounded-lg border-2 border-foreground bg-card shadow-[var(--shadow-md)] overflow-hidden">
        {/* Table header bar */}
        <div className="flex items-center justify-between gap-4 border-b-2 border-foreground px-5 py-4">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-bold">All directories</h2>
            <span className="inline-flex items-center rounded-full border-2 border-foreground bg-secondary px-2.5 py-0.5 text-xs font-bold">
              {directoryCount ?? DIRECTORIES.length}
            </span>
          </div>
        </div>

        <div className="relative">
          <Table>
            <TableHeader>
              <TableRow className="border-b-2 border-foreground">
                <TableHead className="w-[220px]">Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Pricing</TableHead>
                <TableHead>Dofollow</TableHead>
                <TableHead>Signed up</TableHead>
                <TableHead className="text-right pr-5">Visit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(isAuthenticated ? DIRECTORIES : DIRECTORIES.slice(0, 13)).map((dir, i) => {
                const status = statuses[dir.name] ?? "none";
                // For unauthenticated users, blur rows starting at index 8
                const blurStart = 8;
                const blurStrength = !isAuthenticated && i >= blurStart
                  ? Math.min((i - blurStart + 1) * 2.5, 10)
                  : 0;
                const rowOpacity = !isAuthenticated && i >= blurStart
                  ? Math.max(1 - (i - blurStart) * 0.18, 0.15)
                  : 1;
                return (
                <TableRow
                  key={dir.name}
                  onClick={blurStrength === 0 ? () => cycleStatus(dir.name) : undefined}
                  style={blurStrength > 0 ? {
                    filter: `blur(${blurStrength}px)`,
                    opacity: rowOpacity,
                    pointerEvents: "none",
                    userSelect: "none",
                  } : {}}
                  className={`border-b border-foreground/10 transition-colors ${blurStrength === 0 ? "cursor-pointer hover:bg-primary/10" : ""} ${
                    STATUS_ROW_CLASS[status] || (i % 2 === 0 ? "" : "bg-secondary/30")
                  }`}
                >
                  <TableCell className="font-semibold py-3.5">
                    {dir.name}
                  </TableCell>
                  <TableCell className="py-3.5">
                    <Badge variant="outline" className="text-xs font-medium">
                      {dir.category}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-3.5">
                    {PRICING_BADGE[dir.pricingModel]}
                  </TableCell>
                  <TableCell className="py-3.5">
                    {dir.dofollow ? (
                      <Badge
                        variant="default"
                        className="gap-1.5"
                      >
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-current" />
                        Yes
                      </Badge>
                    ) : (
                      <Badge
                        variant="outline"
                        className="gap-1.5 text-muted-foreground"
                      >
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-current opacity-50" />
                        No
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="py-3.5">
                    <SignupBadge status={status} />
                  </TableCell>
                  <TableCell className="py-3.5 text-right pr-5">
                    <Button
                      asChild
                      size="sm"
                      variant="outline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <a href={dir.url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3.5 w-3.5" />
                        Visit
                      </a>
                    </Button>
                  </TableCell>
                </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {/* Blur gate for unauthenticated users */}
          {!isAuthenticated && (
            <>
              {/* Gradient fade overlay */}
              <div
                className="absolute bottom-0 left-0 right-0 pointer-events-none"
                style={{
                  height: "260px",
                  background: "linear-gradient(to top, #FAFAF8 45%, #FAFAF8cc 65%, transparent 100%)",
                }}
              />

              {/* CTA */}
              <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center gap-3 pb-10">
                <p className="text-sm font-semibold text-foreground">
                  See all {directoryCount ?? DIRECTORIES.length} directories, and keep track of the ones you&apos;ve submitted to!
                </p>
                <Button asChild size="default" className="shadow-[var(--shadow-btn)] active:shadow-[var(--shadow-pressed)] active:translate-x-[3px] active:translate-y-[3px] transition-all">
                  <Link to="/login">
                    Log in to unlock
                  </Link>
                </Button>
                <p className="text-xs text-muted-foreground">
                  No account yet?{" "}
                  <Link to="/signup" className="underline underline-offset-2 hover:text-foreground transition-colors">
                    Sign up, it&apos;s free
                  </Link>
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function toOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

async function fetchDirectoryCount(apiBaseUrl: string): Promise<number | null> {
  try {
    const response = await fetch(`${apiBaseUrl}${API_ROUTES.directories.count}`);

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as unknown;

    if (!isApiDirectoryCountResponse(payload)) {
      return null;
    }

    return payload.total;
  } catch {
    return null;
  }
}
