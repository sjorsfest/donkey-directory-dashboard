import { useMemo, useState } from "react";
import { Link } from "react-router";
import {
  ArrowRight,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  LockKeyhole,
  SlidersHorizontal,
} from "lucide-react";

import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";

const CATEGORY_OPTIONS = [
  "AI",
  "SAAS",
  "STARTUP",
  "DEVELOPER_TOOLS",
  "DESIGN",
  "AGENCY",
  "API",
  "COMMUNITY",
  "SOFTWARE_DISCOVERY",
  "SOFTWARE_REVIEWS",
  "MARKETPLACE",
  "MEDIA",
  "DATA_ANALYTICS",
  "GENERAL_TECH",
  "NON_DIRECTORY",
  "OTHER",
] as const;

const PRICING_MODEL_OPTIONS = ["FREE", "PAID"] as const;

const LINK_TYPE_OPTIONS = ["DOFOLLOW", "NOFOLLOW", "CONDITIONAL_DOFOLLOW"] as const;

const STATUS_OPTIONS = [
  "PENDING_REVIEW",
  "ACTIVE",
  "INACTIVE",
  "BROKEN",
  "REJECTED",
  "ARCHIVED",
] as const;

type DirectoryCategory = (typeof CATEGORY_OPTIONS)[number];
type PricingModel = (typeof PRICING_MODEL_OPTIONS)[number];
type LinkType = (typeof LINK_TYPE_OPTIONS)[number];
type DirectoryStatus = (typeof STATUS_OPTIONS)[number];
type PricingBadgeLabel = "Free" | "Freemium" | "Paid";

type Directory = {
  name: string;
  url: string;
  domain: string;
  description: string;
  category: DirectoryCategory;
  categoryLabel: string;
  pricingModel: PricingModel;
  pricingLabel: PricingBadgeLabel;
  linkType: LinkType;
  domainAuthority: number;
  language: string;
  country: string;
  status: DirectoryStatus;
};

export const DIRECTORIES: Directory[] = [
  {
    name: "Product Hunt",
    url: "https://producthunt.com",
    domain: "producthunt.com",
    description: "Launch and discover new tech products.",
    category: "STARTUP",
    categoryLabel: "Tech / Startups",
    pricingModel: "FREE",
    pricingLabel: "Free",
    linkType: "NOFOLLOW",
    domainAuthority: 92,
    language: "English",
    country: "United States",
    status: "ACTIVE",
  },
  {
    name: "Hacker News",
    url: "https://news.ycombinator.com/show",
    domain: "ycombinator.com",
    description: "Community-driven tech and startup discussions.",
    category: "COMMUNITY",
    categoryLabel: "Tech",
    pricingModel: "FREE",
    pricingLabel: "Free",
    linkType: "NOFOLLOW",
    domainAuthority: 94,
    language: "English",
    country: "United States",
    status: "ACTIVE",
  },
  {
    name: "G2",
    url: "https://g2.com",
    domain: "g2.com",
    description: "Software review and comparison directory.",
    category: "SOFTWARE_REVIEWS",
    categoryLabel: "Software Reviews",
    pricingModel: "PAID",
    pricingLabel: "Freemium",
    linkType: "DOFOLLOW",
    domainAuthority: 90,
    language: "English",
    country: "United States",
    status: "ACTIVE",
  },
  {
    name: "Capterra",
    url: "https://capterra.com",
    domain: "capterra.com",
    description: "Business software listings and customer reviews.",
    category: "SOFTWARE_REVIEWS",
    pricingModel: "PAID",
    categoryLabel: "Software Reviews",
    pricingLabel: "Freemium",
    linkType: "DOFOLLOW",
    domainAuthority: 87,
    language: "English",
    country: "United States",
    status: "ACTIVE",
  },
  {
    name: "AppSumo",
    url: "https://appsumo.com",
    domain: "appsumo.com",
    description: "Marketplace for software deals and lifetime offers.",
    category: "MARKETPLACE",
    categoryLabel: "Deals / SaaS",
    pricingModel: "PAID",
    pricingLabel: "Paid",
    linkType: "CONDITIONAL_DOFOLLOW",
    domainAuthority: 79,
    language: "English",
    country: "United States",
    status: "ACTIVE",
  },
  {
    name: "BetaList",
    url: "https://betalist.com",
    domain: "betalist.com",
    description: "Early-stage startup directory and launch platform.",
    category: "STARTUP",
    categoryLabel: "Startups",
    pricingModel: "PAID",
    pricingLabel: "Freemium",
    linkType: "NOFOLLOW",
    domainAuthority: 72,
    language: "English",
    country: "United Kingdom",
    status: "ACTIVE",
  },
  {
    name: "Launching Next",
    url: "https://launchingnext.com",
    domain: "launchingnext.com",
    description: "Directory for startup launches and product showcases.",
    category: "STARTUP",
    categoryLabel: "Startups",
    pricingModel: "FREE",
    pricingLabel: "Free",
    linkType: "DOFOLLOW",
    domainAuthority: 58,
    language: "English",
    country: "United States",
    status: "PENDING_REVIEW",
  },
  {
    name: "SaaSHub",
    url: "https://saashub.com",
    domain: "saashub.com",
    description: "Software discovery portal with alternatives and rankings.",
    category: "SOFTWARE_DISCOVERY",
    categoryLabel: "Software Discovery",
    pricingModel: "FREE",
    pricingLabel: "Free",
    linkType: "DOFOLLOW",
    domainAuthority: 67,
    language: "English",
    country: "Netherlands",
    status: "ACTIVE",
  },
  {
    name: "There's An AI For That",
    url: "https://theresanaiforthat.com",
    domain: "theresanaiforthat.com",
    description: "Large AI tools directory with frequent new listings.",
    category: "AI",
    categoryLabel: "AI Tools",
    pricingModel: "PAID",
    pricingLabel: "Freemium",
    linkType: "NOFOLLOW",
    domainAuthority: 64,
    language: "English",
    country: "United States",
    status: "ACTIVE",
  },
  {
    name: "Futurepedia",
    url: "https://futurepedia.io",
    domain: "futurepedia.io",
    description: "Curated AI tools directory across many use cases.",
    category: "AI",
    categoryLabel: "AI Tools",
    pricingModel: "FREE",
    pricingLabel: "Free",
    linkType: "DOFOLLOW",
    domainAuthority: 70,
    language: "English",
    country: "United States",
    status: "ACTIVE",
  },
  {
    name: "Tool Finder",
    url: "https://toolfinder.co",
    domain: "toolfinder.co",
    description: "Productivity and software discovery site.",
    category: "SOFTWARE_DISCOVERY",
    categoryLabel: "SaaS Tools",
    pricingModel: "FREE",
    pricingLabel: "Free",
    linkType: "DOFOLLOW",
    domainAuthority: 55,
    language: "English",
    country: "United Kingdom",
    status: "INACTIVE",
  },
  {
    name: "Indie Hackers",
    url: "https://indiehackers.com",
    domain: "indiehackers.com",
    description: "Community for founders building online businesses.",
    category: "COMMUNITY",
    categoryLabel: "Community",
    pricingModel: "FREE",
    pricingLabel: "Free",
    linkType: "NOFOLLOW",
    domainAuthority: 83,
    language: "English",
    country: "United States",
    status: "ACTIVE",
  },
];

const PRICING_BADGE: Record<PricingBadgeLabel, React.ReactNode> = {
  Free: <Badge variant="default">Free</Badge>,
  Freemium: <Badge variant="secondary">Freemium</Badge>,
  Paid: <Badge variant="accent">Paid</Badge>,
};

type SignupStatus = "none" | "in_progress" | "submitted";

const SIGNUP_CYCLE: SignupStatus[] = ["none", "in_progress", "submitted"];

const STATUS_ROW_CLASS: Record<SignupStatus, string> = {
  none: "",
  in_progress: "bg-amber-50/60",
  submitted: "bg-accent/5",
};

type DirectoryFilters = {
  name: string;
  category: DirectoryCategory | "ALL";
  pricingModel: PricingModel | "ALL";
  linkType: LinkType | "ALL";
  minDomainAuthority: string;
  search: string;
  domain: string;
  language: string;
  country: string;
  status: DirectoryStatus | "ALL";
};

const DEFAULT_FILTERS: DirectoryFilters = {
  name: "",
  category: "ALL",
  pricingModel: "ALL",
  linkType: "ALL",
  minDomainAuthority: "",
  search: "",
  domain: "",
  language: "",
  country: "",
  status: "ALL",
};

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

type Props = {
  isAuthenticated: boolean;
  directoryCount: number | null;
};

export function DirectoriesTable({ isAuthenticated, directoryCount }: Props) {
  const [statuses, setStatuses] = useState<Record<string, SignupStatus>>({});
  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [filters, setFilters] = useState<DirectoryFilters>(DEFAULT_FILTERS);
  const [draftFilters, setDraftFilters] = useState<DirectoryFilters>(DEFAULT_FILTERS);

  const activeFilterCount = useMemo(
    () => (isAuthenticated ? getActiveFilterCount(filters) : 0),
    [filters, isAuthenticated],
  );

  const filteredDirectories = useMemo(() => {
    const activeFilters = isAuthenticated ? filters : DEFAULT_FILTERS;
    const nameNeedle = normalizeForSearch(activeFilters.name);
    const domainNeedle = normalizeForSearch(activeFilters.domain);
    const languageNeedle = normalizeForSearch(activeFilters.language);
    const countryNeedle = normalizeForSearch(activeFilters.country);
    const searchNeedle = normalizeForSearch(activeFilters.search);
    const minimumDomainAuthority = parseNullableNumber(activeFilters.minDomainAuthority);

    return DIRECTORIES.filter((directory) => {
      if (nameNeedle.length > 0 && !normalizeForSearch(directory.name).includes(nameNeedle)) {
        return false;
      }

      if (activeFilters.category !== "ALL" && directory.category !== activeFilters.category) {
        return false;
      }

      if (activeFilters.pricingModel !== "ALL" && directory.pricingModel !== activeFilters.pricingModel) {
        return false;
      }

      if (activeFilters.linkType !== "ALL" && directory.linkType !== activeFilters.linkType) {
        return false;
      }

      if (minimumDomainAuthority !== null && directory.domainAuthority < minimumDomainAuthority) {
        return false;
      }

      if (domainNeedle.length > 0 && !normalizeForSearch(directory.domain).includes(domainNeedle)) {
        return false;
      }

      if (languageNeedle.length > 0 && normalizeForSearch(directory.language) !== languageNeedle) {
        return false;
      }

      if (countryNeedle.length > 0 && normalizeForSearch(directory.country) !== countryNeedle) {
        return false;
      }

      if (activeFilters.status !== "ALL" && directory.status !== activeFilters.status) {
        return false;
      }

      if (searchNeedle.length > 0) {
        const haystack = normalizeForSearch(`${directory.name} ${directory.domain} ${directory.description}`);
        if (!haystack.includes(searchNeedle)) {
          return false;
        }
      }

      return true;
    });
  }, [filters, isAuthenticated]);

  const visibleDirectories = useMemo(
    () => (isAuthenticated ? filteredDirectories : filteredDirectories.slice(0, 13)),
    [filteredDirectories, isAuthenticated],
  );

  function cycleStatus(name: string) {
    setStatuses((prev) => {
      const current = prev[name] ?? "none";
      const next = SIGNUP_CYCLE[(SIGNUP_CYCLE.indexOf(current) + 1) % SIGNUP_CYCLE.length];
      return { ...prev, [name]: next };
    });
  }

  function onOpenFilterDialog(open: boolean) {
    setIsFilterDialogOpen(open);

    if (open) {
      if (!isAuthenticated) {
        setShowAdvancedFilters(false);
        return;
      }
      setDraftFilters(filters);
      setShowAdvancedFilters(hasAdvancedFilters(filters));
      return;
    }

    setShowAdvancedFilters(false);
  }

  function applyFilters() {
    setFilters(draftFilters);
    setIsFilterDialogOpen(false);
    setShowAdvancedFilters(false);
  }

  function clearFilters() {
    setFilters(DEFAULT_FILTERS);
    setDraftFilters(DEFAULT_FILTERS);
    setShowAdvancedFilters(false);
  }

  return (
    <div id="directories-table" className="rounded-lg border-2 border-foreground bg-card shadow-[var(--shadow-md)] overflow-hidden">
      {/* Table header bar */}
      <div className="flex items-center justify-between gap-4 border-b-2 border-foreground px-5 py-4">
        <div className="flex items-center gap-3">
          <h2 className="text-base font-bold">All directories</h2>
          <span className="inline-flex items-center rounded-full border-2 border-foreground bg-secondary px-2.5 py-0.5 text-xs font-bold">
            {directoryCount ?? DIRECTORIES.length}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {isAuthenticated && activeFilterCount > 0 && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Clear
            </Button>
          )}

          <Dialog open={isFilterDialogOpen} onOpenChange={onOpenFilterDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <SlidersHorizontal className="h-4 w-4" />
                Filters
                {isAuthenticated && activeFilterCount > 0 && (
                  <Badge variant="secondary" className="min-w-5 justify-center px-1.5 py-0">
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
              {!isAuthenticated ? (
                <>
                  <DialogHeader className="space-y-2">
                    <div className="inline-flex w-fit items-center gap-1.5 rounded-full border-2 border-foreground bg-secondary px-2.5 py-1 text-xs font-bold">
                      <LockKeyhole className="h-3.5 w-3.5" />
                      Free account required
                    </div>
                    <DialogTitle className="text-2xl leading-tight">
                      Skip the scroll. Find your best {directoryCount ?? DIRECTORIES.length} directories in minutes.
                    </DialogTitle>
                    <DialogDescription className="text-sm">
                      Filter by category, pricing, dofollow links, and domain authority — then track every submission in one place.
                    </DialogDescription>
                  </DialogHeader>

                  {/* Blurred filter preview — shows exactly what they unlock */}
                  <div className="relative overflow-hidden rounded-md border-2 border-foreground">
                    <div className="pointer-events-none select-none blur-[3px] brightness-95 p-4 grid gap-4 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Category</p>
                        <div className="flex h-9 w-full items-center justify-between rounded-md border-2 border-foreground bg-background px-3 text-sm">
                          <span>AI</span>
                          <ChevronDown className="h-4 w-4 opacity-50" />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pricing</p>
                        <div className="flex h-9 w-full items-center justify-between rounded-md border-2 border-foreground bg-background px-3 text-sm">
                          <span>Free only</span>
                          <ChevronDown className="h-4 w-4 opacity-50" />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Link type</p>
                        <div className="flex h-9 w-full items-center justify-between rounded-md border-2 border-foreground bg-background px-3 text-sm">
                          <span>Dofollow</span>
                          <ChevronDown className="h-4 w-4 opacity-50" />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Min. Domain Authority</p>
                        <div className="flex h-9 w-full items-center justify-between rounded-md border-2 border-foreground bg-background px-3 text-sm">
                          <span>50+</span>
                          <ChevronDown className="h-4 w-4 opacity-50" />
                        </div>
                      </div>
                    </div>
                    {/* Lock overlay */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-background/60 backdrop-blur-[1px]">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-foreground bg-secondary shadow-[3px_3px_0_#1A1A1A]">
                        <LockKeyhole className="h-5 w-5" />
                      </div>
                      <p className="text-xs font-bold">Unlock with a free account</p>
                    </div>
                  </div>

                  {/* CTAs */}
                  <div className="flex flex-col gap-3">
                    <Button asChild size="lg" className="w-full gap-2 text-base">
                      <Link to="/signup">
                        Create free account
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                    <p className="text-center text-sm text-muted-foreground">
                      Already have an account?{" "}
                      <Link to="/login" className="font-semibold text-foreground underline underline-offset-2 hover:no-underline">
                        Log in
                      </Link>
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <DialogHeader>
                    <DialogTitle>Filter directories</DialogTitle>
                    <DialogDescription>
                      Start with the core filters, then open advanced filters for a few extra controls.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="filter-name">Name</Label>
                      <Input
                        id="filter-name"
                        value={draftFilters.name}
                        onChange={(event) =>
                          setDraftFilters((prev) => ({
                            ...prev,
                            name: event.target.value,
                          }))
                        }
                        placeholder="Partial match"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Category</Label>
                      <Select
                        value={draftFilters.category}
                        onValueChange={(value) =>
                          setDraftFilters((prev) => ({
                            ...prev,
                            category: value as DirectoryFilters["category"],
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="All categories" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ALL">All categories</SelectItem>
                          {CATEGORY_OPTIONS.map((category) => (
                            <SelectItem key={category} value={category}>
                              {formatEnumToken(category)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Pricing model</Label>
                      <Select
                        value={draftFilters.pricingModel}
                        onValueChange={(value) =>
                          setDraftFilters((prev) => ({
                            ...prev,
                            pricingModel: value as DirectoryFilters["pricingModel"],
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="All pricing models" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ALL">All pricing models</SelectItem>
                          {PRICING_MODEL_OPTIONS.map((pricingModel) => (
                            <SelectItem key={pricingModel} value={pricingModel}>
                              {formatEnumToken(pricingModel)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Dofollow type</Label>
                      <Select
                        value={draftFilters.linkType}
                        onValueChange={(value) =>
                          setDraftFilters((prev) => ({
                            ...prev,
                            linkType: value as DirectoryFilters["linkType"],
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="All dofollow types" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ALL">All dofollow types</SelectItem>
                          {LINK_TYPE_OPTIONS.map((linkType) => (
                            <SelectItem key={linkType} value={linkType}>
                              {formatEnumToken(linkType)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="filter-min-da">Min domain authority</Label>
                      <Input
                        id="filter-min-da"
                        type="number"
                        min={0}
                        max={100}
                        inputMode="numeric"
                        value={draftFilters.minDomainAuthority}
                        onChange={(event) =>
                          setDraftFilters((prev) => ({
                            ...prev,
                            minDomainAuthority: event.target.value,
                          }))
                        }
                        placeholder="0 - 100"
                      />
                    </div>
                  </div>

                  <div className="mt-1">
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-8 px-0 text-sm"
                      onClick={() => setShowAdvancedFilters((prev) => !prev)}
                    >
                      {showAdvancedFilters ? <ChevronUp className="mr-1 h-4 w-4" /> : <ChevronDown className="mr-1 h-4 w-4" />}
                      Advanced filters
                    </Button>

                    {showAdvancedFilters && (
                      <div className="mt-3 grid gap-4 rounded-md border-2 border-foreground/15 p-3 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="filter-search">Search</Label>
                          <Input
                            id="filter-search"
                            value={draftFilters.search}
                            onChange={(event) =>
                              setDraftFilters((prev) => ({
                                ...prev,
                                search: event.target.value,
                              }))
                            }
                            placeholder="Name, domain or description"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="filter-domain">Domain</Label>
                          <Input
                            id="filter-domain"
                            value={draftFilters.domain}
                            onChange={(event) =>
                              setDraftFilters((prev) => ({
                                ...prev,
                                domain: event.target.value,
                              }))
                            }
                            placeholder="Partial match"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="filter-language">Language</Label>
                          <Input
                            id="filter-language"
                            value={draftFilters.language}
                            onChange={(event) =>
                              setDraftFilters((prev) => ({
                                ...prev,
                                language: event.target.value,
                              }))
                            }
                            placeholder="Exact match"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="filter-country">Country</Label>
                          <Input
                            id="filter-country"
                            value={draftFilters.country}
                            onChange={(event) =>
                              setDraftFilters((prev) => ({
                                ...prev,
                                country: event.target.value,
                              }))
                            }
                            placeholder="Exact match"
                          />
                        </div>

                        <div className="space-y-2 sm:col-span-2">
                          <Label>Status</Label>
                          <Select
                            value={draftFilters.status}
                            onValueChange={(value) =>
                              setDraftFilters((prev) => ({
                                ...prev,
                                status: value as DirectoryFilters["status"],
                              }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="All statuses" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ALL">All statuses</SelectItem>
                              {STATUS_OPTIONS.map((status) => (
                                <SelectItem key={status} value={status}>
                                  {formatEnumToken(status)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}
                  </div>

                  <DialogFooter className="gap-2">
                    <Button variant="outline" onClick={clearFilters}>
                      Reset
                    </Button>
                    <Button onClick={applyFilters}>Apply filters</Button>
                  </DialogFooter>
                </>
              )}
            </DialogContent>
          </Dialog>
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
            {visibleDirectories.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                  No directories match your filters.
                </TableCell>
              </TableRow>
            )}

            {visibleDirectories.map((dir, i) => {
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
                      {dir.categoryLabel}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-3.5">
                    {PRICING_BADGE[dir.pricingLabel]}
                  </TableCell>
                  <TableCell className="py-3.5">
                    {dir.linkType === "DOFOLLOW" ? (
                      <Badge
                        variant="default"
                        className="gap-1.5"
                      >
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-current" />
                        Yes
                      </Badge>
                    ) : dir.linkType === "CONDITIONAL_DOFOLLOW" ? (
                      <Badge
                        variant="secondary"
                        className="gap-1.5"
                      >
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-current" />
                        Conditional
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
  );
}

function getActiveFilterCount(filters: DirectoryFilters): number {
  let count = 0;

  if (filters.name.trim().length > 0) {
    count += 1;
  }

  if (filters.category !== "ALL") {
    count += 1;
  }

  if (filters.pricingModel !== "ALL") {
    count += 1;
  }

  if (filters.linkType !== "ALL") {
    count += 1;
  }

  if (filters.minDomainAuthority.trim().length > 0) {
    count += 1;
  }

  if (filters.search.trim().length > 0) {
    count += 1;
  }

  if (filters.domain.trim().length > 0) {
    count += 1;
  }

  if (filters.language.trim().length > 0) {
    count += 1;
  }

  if (filters.country.trim().length > 0) {
    count += 1;
  }

  if (filters.status !== "ALL") {
    count += 1;
  }

  return count;
}

function hasAdvancedFilters(filters: DirectoryFilters): boolean {
  return (
    filters.search.trim().length > 0 ||
    filters.domain.trim().length > 0 ||
    filters.language.trim().length > 0 ||
    filters.country.trim().length > 0 ||
    filters.status !== "ALL"
  );
}

function parseNullableNumber(rawValue: string): number | null {
  const trimmed = rawValue.trim();

  if (trimmed.length === 0) {
    return null;
  }

  const parsed = Number(trimmed);

  if (!Number.isFinite(parsed)) {
    return null;
  }

  return Math.max(0, Math.min(100, parsed));
}

function normalizeForSearch(value: string): string {
  return value.trim().toLowerCase();
}

function formatEnumToken(token: string): string {
  const keepUppercase = new Set(["AI", "API", "B2B", "ML", "SAAS", "SEO", "SMB"]);

  return token
    .split("_")
    .map((part) => {
      if (keepUppercase.has(part)) {
        return part;
      }

      return `${part.charAt(0)}${part.slice(1).toLowerCase()}`;
    })
    .join(" ");
}
