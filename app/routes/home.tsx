import { useState } from "react";
import { Link, data, useLoaderData } from "react-router";
import { ExternalLink } from "lucide-react";

import type { Route } from "./+types/home";
import { API_ROUTES } from "~/lib/api-contract";
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
  const session = await getSession(request.headers.get("Cookie"));
  const hasSessionTokens =
    Boolean(toOptionalString(session.get("accessToken"))) ||
    Boolean(toOptionalString(session.get("refreshToken")));

  if (!hasSessionTokens) {
    return data<LoaderData>({ isAuthenticated: false });
  }

  const authResult = await sendAuthenticatedRequest({
    session,
    apiBaseUrl: getServerApiBaseUrl(),
    path: API_ROUTES.auth.me,
    method: "GET",
  });

  return data<LoaderData>(
    {
      isAuthenticated: authResult.response.status === 200,
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

export default function HomePage() {
  const { isAuthenticated } = useLoaderData<typeof loader>();
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
      {/* Page header */}
      <div className="space-y-1">
        <p className="text-[0.75rem] font-bold uppercase tracking-[0.1em] text-muted-foreground">
          Overview
        </p>
        <h1 className="text-3xl font-bold leading-tight max-[960px]:text-2xl">
          Directories
        </h1>
        <p className="text-muted-foreground max-w-lg">
          A curated list of directories where you can submit your product for
          visibility and backlinks.
        </p>
      </div>

      {/* Auth nudge */}
      {!isAuthenticated && (
        <div className="rounded-lg border-2 border-foreground bg-card p-4 shadow-[var(--shadow-sm)] flex items-center justify-between gap-4 flex-wrap">
          <p className="text-sm font-medium">
            Sign in to track your submission status across directories.
          </p>
          <div className="flex gap-2">
            <Button asChild size="sm" variant="outline">
              <Link to="/login">Login</Link>
            </Button>
            <Button asChild size="sm">
              <Link to="/signup">Sign up</Link>
            </Button>
          </div>
        </div>
      )}

      {/* Directories table */}
      <div className="rounded-lg border-2 border-foreground bg-card shadow-[var(--shadow-md)] overflow-hidden">
        {/* Table header bar */}
        <div className="flex items-center justify-between gap-4 border-b-2 border-foreground px-5 py-4">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-bold">All directories</h2>
            <span className="inline-flex items-center rounded-full border-2 border-foreground bg-secondary px-2.5 py-0.5 text-xs font-bold">
              {DIRECTORIES.length}
            </span>
          </div>
        </div>

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
            {DIRECTORIES.map((dir, i) => {
              const status = statuses[dir.name] ?? "none";
              return (
              <TableRow
                key={dir.name}
                onClick={() => cycleStatus(dir.name)}
                className={`border-b border-foreground/10 transition-colors cursor-pointer hover:bg-primary/10 ${
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
