import { useMemo, useState } from "react";
import { Link, useFetcher, useSearchParams } from "react-router";
import type { ApiProjectSubmissionCountsResponse } from "~/lib/api-contract";
import {
  ArrowRight,
  ChevronDown,
  ChevronUp,
  LayoutList,
  LockKeyhole,
  SlidersHorizontal,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
import { Icon } from "@iconify/react";
import { ChromeExtensionLink } from "~/components/chrome-extension-link";

import { cn } from "@/shared/lib/utils";
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

export const CATEGORY_OPTIONS = [
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



function VoteButtons({
  directoryId,
  initialVote,
  thumbsUpCount,
  thumbsDownCount,
}: {
  directoryId: string;
  initialVote: "up" | "down" | null;
  thumbsUpCount: number;
  thumbsDownCount: number;
}) {
  const fetcher = useFetcher();
  const [vote, setVote] = useState<"up" | "down" | null>(initialVote);
  const optimisticVote = fetcher.formData?.get("vote") as "up" | "down" | "" | undefined;
  const activeVote = optimisticVote !== undefined ? (optimisticVote || null) : vote;

  const upCount = optimisticVote === "up" ? thumbsUpCount + (initialVote === "up" ? 0 : 1) :
    optimisticVote === "" && initialVote === "up" ? thumbsUpCount - 1 : thumbsUpCount;
  const downCount = optimisticVote === "down" ? thumbsDownCount + (initialVote === "down" ? 0 : 1) :
    optimisticVote === "" && initialVote === "down" ? thumbsDownCount - 1 : thumbsDownCount;

  function handleVote(next: "up" | "down") {
    const newVote = activeVote === next ? null : next;
    setVote(newVote);
    fetcher.submit(
      { intent: "directory_vote", directory_id: directoryId, vote: newVote ?? "" },
      { method: "post" }
    );
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => handleVote("up")}
        className={cn(
          "flex items-center gap-1 rounded p-1 transition-colors hover:bg-primary/10",
          activeVote === "up" ? "text-green-600" : "text-muted-foreground"
        )}
        aria-label="Thumbs up"
      >
        <ThumbsUp className="h-3.5 w-3.5" />
        {upCount > 0 && <span className="text-xs font-medium">{upCount}</span>}
      </button>
      <button
        onClick={() => handleVote("down")}
        className={cn(
          "flex items-center gap-1 rounded p-1 transition-colors hover:bg-primary/10",
          activeVote === "down" ? "text-red-500" : "text-muted-foreground"
        )}
        aria-label="Thumbs down"
      >
        <ThumbsDown className="h-3.5 w-3.5" />
        {downCount > 0 && <span className="text-xs font-medium">{downCount}</span>}
      </button>
    </div>
  );
}

export function parseNullableNumber(rawValue: string): number | null {
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

export function normalizeForSearch(value: string): string {
  return value.trim().toLowerCase();
}

export function formatEnumToken(token: string): string {
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

// ─── Project Submissions Table ────────────────────────────────────────────────

export type DirectorySubmissionStage = "not_submitted" | "in_progress" | "submitted" | "skipped";

export type DirectoryWithStage = {
  id: string;
  name: string;
  domain: string;
  category?: string | null;
  is_free: boolean;
  is_dofollow: boolean;
  submission_stage: DirectorySubmissionStage;
  domain_authority?: number | null;
  logo_url?: string | null;
  my_vote?: "up" | "down" | null;
  thumbs_up_count?: number;
  thumbs_down_count?: number;
  total_votes?: number;
  thumbs_up_percentage?: number | null;
};

const SUBMISSION_STAGE_LABELS: Record<DirectorySubmissionStage, string> = {
  not_submitted: "Not submitted",
  in_progress: "In progress",
  submitted: "Submitted",
  skipped: "Skipped",
};

const SUBMISSION_STAGE_CLASSES: Record<DirectorySubmissionStage, string> = {
  submitted: "border-emerald-500 bg-emerald-50 text-emerald-700",
  in_progress: "border-amber-500 bg-amber-50 text-amber-700",
  not_submitted: "border-foreground/20 bg-card text-muted-foreground",
  skipped: "border-foreground/20 bg-card text-muted-foreground",
};

const SUBMISSION_STAGE_ROW_CLASS: Record<DirectorySubmissionStage, string> = {
  submitted: "bg-emerald-50/50 hover:bg-emerald-50",
  in_progress: "bg-amber-50/50 hover:bg-amber-50",
  not_submitted: "bg-card hover:bg-secondary/40",
  skipped: "bg-foreground/[0.03] hover:bg-foreground/[0.06]",
};

const STAT_CARD_COLORS = {
  emerald: "border-l-emerald-500 bg-emerald-50 text-emerald-700",
  amber: "border-l-amber-500 bg-amber-50 text-amber-700",
  muted: "border-l-foreground/20 bg-card text-muted-foreground",
} as const;

export function daScoreColor(value: number): string {
  // hue 0 = red, 120 = green; scale linearly with score
  const hue = Math.round((value / 100) * 120);
  return `hsl(${hue}, 72%, 42%)`;
}

export function DaCircle({ value }: { value: number | null | undefined }) {
  const size = 32;
  const stroke = 3.5;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const pct = value != null ? Math.min(Math.max(value, 0), 100) / 100 : 0;
  const dash = circumference * pct;
  const hasValue = value != null;
  const color = hasValue ? daScoreColor(value) : undefined;

  return (
    <div className="flex flex-col items-center gap-0.5">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          className="stroke-foreground/10"
        />
        {hasValue && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            strokeWidth={stroke}
            strokeDasharray={`${dash} ${circumference}`}
            strokeLinecap="round"
            style={{ stroke: color }}
          />
        )}
        <text
          x={size / 2}
          y={size / 2}
          textAnchor="middle"
          dominantBaseline="central"
          transform={`rotate(90, ${size / 2}, ${size / 2})`}
          className="font-bold"
          style={{ fontSize: 9, fill: color ?? "currentColor" }}
        >
          {hasValue ? value : "—"}
        </text>
      </svg>
    </div>
  );
}

export function buildDirectoryHref(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.searchParams.set("ref", "donkeydirectories");
    return parsed.toString();
  } catch {
    return url;
  }
}

export function DirectoryLogo({ name, logoUrl }: { name: string; logoUrl?: string | null }) {
  const [imgFailed, setImgFailed] = useState(false);
  const src = logoUrl && !imgFailed ? logoUrl : null;
  const letter = name.charAt(0).toUpperCase();

  if (src) {
    return (
      <img
        src={src}
        alt=""
        aria-hidden="true"
        onError={() => setImgFailed(true)}
        className="h-6 w-6 rounded-full border border-foreground/10 object-contain bg-card flex-shrink-0"
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className="inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border border-foreground/10 bg-secondary text-[10px] font-bold text-foreground"
    >
      {letter}
    </span>
  );
}

type SubmissionFilters = {
  name: string;
  category: string;
  isFree: "ALL" | "true" | "false";
  isDofollow: "ALL" | "true" | "false";
  stage: DirectorySubmissionStage | "ALL";
};

const DEFAULT_SUBMISSION_FILTERS: SubmissionFilters = {
  name: "",
  category: "ALL",
  isFree: "ALL",
  isDofollow: "ALL",
  stage: "ALL",
};

function filtersFromSearchParams(params: URLSearchParams): SubmissionFilters {
  const dofollow = params.get("dofollow");
  const free = params.get("free");
  const stage = params.get("stage");
  const category = params.get("category");
  const name = params.get("name");
  return {
    name: name ?? "",
    category: category && (CATEGORY_OPTIONS as readonly string[]).includes(category) ? category : "ALL",
    isFree: free === "true" || free === "false" ? free : "ALL",
    isDofollow: dofollow === "true" || dofollow === "false" ? dofollow : "ALL",
    stage: stage && (["not_submitted", "in_progress", "submitted", "skipped"] as string[]).includes(stage)
      ? (stage as DirectorySubmissionStage)
      : "ALL",
  };
}

function getSubmissionFilterCount(filters: SubmissionFilters): number {
  let count = 0;
  if (filters.name.trim().length > 0) count++;
  if (filters.category !== "ALL") count++;
  if (filters.isFree !== "ALL") count++;
  if (filters.isDofollow !== "ALL") count++;
  if (filters.stage !== "ALL") count++;
  return count;
}

export function ProjectSubmissionsTable(props: {
  projectId: string;
  directories: DirectoryWithStage[];
  directoriesTotal: number;
  submissionCounts: ApiProjectSubmissionCountsResponse | null;
}) {
  const { directories, directoriesTotal, projectId, submissionCounts } = props;

  const [searchParams] = useSearchParams();
  const initialFilters = filtersFromSearchParams(searchParams);

  const [isFilterDialogOpen, setIsFilterDialogOpen] = useState(false);
  const [filters, setFilters] = useState<SubmissionFilters>(initialFilters);
  const [draftFilters, setDraftFilters] = useState<SubmissionFilters>(initialFilters);

  const activeFilterCount = useMemo(() => getSubmissionFilterCount(filters), [filters]);

  const visibleDirectories = useMemo(() => {
    const nameNeedle = normalizeForSearch(filters.name);
    return directories.filter((d) => {
      if (nameNeedle.length > 0 && !normalizeForSearch(d.name).includes(nameNeedle)) return false;
      if (filters.category !== "ALL" && d.category !== filters.category) return false;
      if (filters.isFree !== "ALL" && String(d.is_free) !== filters.isFree) return false;
      if (filters.isDofollow !== "ALL" && String(d.is_dofollow) !== filters.isDofollow) return false;
      if (filters.stage !== "ALL" && d.submission_stage !== filters.stage) return false;
      return true;
    });
  }, [directories, filters]);

  const totalCount = submissionCounts?.total_directories ?? directoriesTotal;
  const submittedCount = submissionCounts?.submitted_directories ?? null;
  const skippedCount = submissionCounts?.skipped_directories ?? null;
  const notSubmittedCount =
    submissionCounts != null
      ? submissionCounts.total_directories - submissionCounts.completed_directories
      : null;

  function openFilterDialog(open: boolean) {
    setIsFilterDialogOpen(open);
    if (open) setDraftFilters(filters);
  }

  function applyFilters() {
    setFilters(draftFilters);
    setIsFilterDialogOpen(false);
  }

  function clearFilters() {
    setFilters(DEFAULT_SUBMISSION_FILTERS);
    setDraftFilters(DEFAULT_SUBMISSION_FILTERS);
  }

  return (
    <div className="rounded-lg border-2 border-foreground bg-card shadow-[var(--shadow-md)] overflow-hidden">
      {/* Table header bar */}
      <div className="flex items-center justify-between gap-4 border-b-2 border-foreground px-5 py-4">
        <div className="flex items-center gap-3">
          <LayoutList size={18} className="shrink-0" />
          <h2 className="text-sm font-bold sm:text-base whitespace-nowrap">Submission tracker</h2>
          <span className="inline-flex items-center rounded-full border-2 border-foreground bg-secondary px-2.5 py-0.5 text-xs font-bold">
            {totalCount}
          </span>
          {directoriesTotal > directories.length && (
            <span className="text-xs text-muted-foreground">
              (showing {directories.length} of {directoriesTotal})
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          {submissionCounts != null && (
            <div className="hidden sm:flex items-center gap-3 text-xs font-semibold">
              <span className="flex items-center gap-1.5 text-emerald-700">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                {submittedCount} submitted
              </span>
              <span className="flex items-center gap-1.5 text-amber-700">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500" />
                {skippedCount} skipped
              </span>
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-foreground/30" />
                {notSubmittedCount} not submitted
              </span>
            </div>
          )}

          <div className="flex items-center gap-2">
            {activeFilterCount > 0 && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Clear
              </Button>
            )}
            <Dialog open={isFilterDialogOpen} onOpenChange={openFilterDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <SlidersHorizontal className="h-4 w-4" />
                  <span className="hidden sm:inline">Filters</span>
                  {activeFilterCount > 0 && (
                    <Badge variant="secondary" className="min-w-5 justify-center px-1.5 py-0">
                      {activeFilterCount}
                    </Badge>
                  )}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Filter directories</DialogTitle>
                  <DialogDescription>
                    Narrow down the list by name, category, pricing, link type, or submission status.
                  </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="sf-name">Name</Label>
                    <Input
                      id="sf-name"
                      value={draftFilters.name}
                      onChange={(e) => setDraftFilters((prev) => ({ ...prev, name: e.target.value }))}
                      placeholder="Partial match"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select
                      value={draftFilters.category}
                      onValueChange={(v) => setDraftFilters((prev) => ({ ...prev, category: v }))}
                    >
                      <SelectTrigger><SelectValue placeholder="All categories" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">All categories</SelectItem>
                        {CATEGORY_OPTIONS.map((c) => (
                          <SelectItem key={c} value={c}>{formatEnumToken(c)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Pricing</Label>
                    <Select
                      value={draftFilters.isFree}
                      onValueChange={(v) => setDraftFilters((prev) => ({ ...prev, isFree: v as SubmissionFilters["isFree"] }))}
                    >
                      <SelectTrigger><SelectValue placeholder="All pricing" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">All pricing</SelectItem>
                        <SelectItem value="true">Free</SelectItem>
                        <SelectItem value="false">Paid</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Dofollow</Label>
                    <Select
                      value={draftFilters.isDofollow}
                      onValueChange={(v) => setDraftFilters((prev) => ({ ...prev, isDofollow: v as SubmissionFilters["isDofollow"] }))}
                    >
                      <SelectTrigger><SelectValue placeholder="All types" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">All types</SelectItem>
                        <SelectItem value="true">Dofollow</SelectItem>
                        <SelectItem value="false">Nofollow</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select
                      value={draftFilters.stage}
                      onValueChange={(v) =>
                        setDraftFilters((prev) => ({ ...prev, stage: v as SubmissionFilters["stage"] }))
                      }
                    >
                      <SelectTrigger><SelectValue placeholder="All statuses" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">All statuses</SelectItem>
                        {(["not_submitted", "in_progress", "submitted", "skipped"] as DirectorySubmissionStage[]).map((s) => (
                          <SelectItem key={s} value={s}>{SUBMISSION_STAGE_LABELS[s]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <DialogFooter className="gap-2">
                  <Button variant="outline" onClick={clearFilters}>Reset</Button>
                  <Button onClick={applyFilters}>Apply filters</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {submissionCounts != null && (notSubmittedCount ?? 0) > 0 && (
        <div className="border-b border-border/60 bg-muted/40 px-5 py-2 text-xs text-muted-foreground">
          <ChromeExtensionLink className="inline-flex items-center gap-1 font-semibold text-foreground underline underline-offset-2 hover:opacity-70 transition-opacity">
            <Icon icon="logos:chrome" className="h-3 w-3 shrink-0" />
            Get the Chrome extension
          </ChromeExtensionLink>{" "}
          to autofill forms, update statuses, and move to the next directory automatically.
        </div>
      )}

      {visibleDirectories.length === 0 ? (
        <div className="grid gap-2 p-5 border-l-4 border-l-muted-foreground">
          <strong className="text-[0.9rem]">
            {directories.length === 0 ? "No directories found." : "No directories match your filters."}
          </strong>
          <p className="m-0 text-sm text-muted-foreground">
            {directories.length === 0
              ? "Directories will appear here once they are available for this project."
              : "Try adjusting or clearing your filters."}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm table-fixed">
              <thead>
                <tr className="border-b-2 border-foreground bg-secondary">
                  <th className="px-4 py-2.5 text-left text-[0.7rem] font-bold uppercase tracking-[0.05em] text-muted-foreground hidden sm:table-cell w-14">
                    DR
                  </th>
                  <th className="px-4 py-2.5 text-left text-[0.7rem] font-bold uppercase tracking-[0.05em] text-muted-foreground">
                    Directory
                  </th>
                  <th className="px-4 py-2.5 text-left text-[0.7rem] font-bold uppercase tracking-[0.05em] text-muted-foreground hidden sm:table-cell">
                    Category
                  </th>
                  <th className="px-4 py-2.5 text-left text-[0.7rem] font-bold uppercase tracking-[0.05em] text-muted-foreground hidden sm:table-cell">
                    Pricing
                  </th>
                  <th className="px-4 py-2.5 text-left text-[0.7rem] font-bold uppercase tracking-[0.05em] text-muted-foreground hidden sm:table-cell">
                    Dofollow
                  </th>
                  <th className="px-4 py-2.5 text-left text-[0.7rem] font-bold uppercase tracking-[0.05em] text-muted-foreground w-[7.5rem] sm:w-auto">
                    Status
                  </th>
                  <th className="px-4 py-2.5 text-left text-[0.7rem] font-bold uppercase tracking-[0.05em] text-muted-foreground hidden sm:table-cell">
                    Vote
                  </th>
                </tr>
              </thead>
              <tbody>
                {visibleDirectories.map((directory, index) => (
                  <tr
                    key={directory.id}
                    className={cn(
                      "border-b border-foreground/10 transition-colors",
                      SUBMISSION_STAGE_ROW_CLASS[directory.submission_stage],
                      index === visibleDirectories.length - 1 && "border-b-0",
                    )}
                  >
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <DaCircle value={directory.domain_authority} />
                    </td>
                    <td className="px-4 py-3 font-semibold min-w-0 text-xs sm:text-sm">
                      <a
                        href={buildDirectoryHref(`https://${directory.domain}`)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 hover:underline underline-offset-2 min-w-0"
                      >
                        <DirectoryLogo name={directory.name} logoUrl={directory.logo_url} />
                        <span className="truncate">{directory.name}</span>
                      </a>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      {directory.category ? (
                        <Badge variant="outline" className="text-xs font-medium">
                          {formatEnumToken(directory.category)}
                        </Badge>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      {directory.is_free ? (
                        <Badge variant="default">Free</Badge>
                      ) : (
                        <Badge variant="accent">Paid</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      {directory.is_dofollow ? (
                        <Badge variant="default" className="gap-1.5">
                          <span className="inline-block h-1.5 w-1.5 rounded-full bg-current" />
                          Yes
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="gap-1.5 text-muted-foreground">
                          <span className="inline-block h-1.5 w-1.5 rounded-full bg-current opacity-50" />
                          No
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <SubmissionStageSelector directory={directory} projectId={projectId} />
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <VoteButtons
                        directoryId={directory.id}
                        initialVote={directory.my_vote ?? null}
                        thumbsUpCount={directory.thumbs_up_count ?? 0}
                        thumbsDownCount={directory.thumbs_down_count ?? 0}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function SubmissionStageSelector(props: { directory: DirectoryWithStage; projectId: string }) {
  const fetcher = useFetcher();
  const optimisticStage = fetcher.formData?.get("submission_stage") as DirectorySubmissionStage | null;
  const stage = optimisticStage ?? props.directory.submission_stage;
  const isPending = fetcher.state !== "idle";

  return (
    <select
      value={stage}
      disabled={isPending}
      className={cn(
        "w-full rounded-lg border-2 px-2 py-1 text-xs font-bold cursor-pointer transition-opacity",
        SUBMISSION_STAGE_CLASSES[stage],
        isPending && "opacity-50",
      )}
      onChange={(e) => {
        const formData = new FormData();
        formData.set("intent", "submission_stage_update");
        formData.set("project_id", props.projectId);
        formData.set("directory_id", props.directory.id);
        formData.set("submission_stage", e.target.value);
        fetcher.submit(formData, { method: "post" });
      }}
    >
      {(["not_submitted", "in_progress", "submitted", "skipped"] as DirectorySubmissionStage[]).map((s) => (
        <option key={s} value={s}>
          {SUBMISSION_STAGE_LABELS[s]}
        </option>
      ))}
    </select>
  );
}
