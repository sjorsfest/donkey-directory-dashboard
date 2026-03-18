import { useEffect, useState, useCallback } from "react";
import { Header } from "./Header";
import { DirectoryView } from "./DirectoryView";
import { NotListedView } from "./NotListedView";
import { useProjects } from "../hooks/useProjects";
import { useDirectoryForTab } from "../hooks/useDirectoryForTab";
import { fetchSubmissionCounts, type SubmissionCounts } from "../lib/api";
import type { Project } from "../types";
import { Alert, AlertDescription } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";
import { Skeleton } from "@/shared/ui/skeleton";

interface MainViewProps {
  userEmail: string;
  isAdmin: boolean;
  onLogout: () => void;
  onSessionExpired: () => void;
}

export function MainView({ userEmail, isAdmin, onLogout, onSessionExpired }: MainViewProps) {
  const {
    projects,
    selectedProjectId,
    setSelectedProjectId,
    isLoading: projectsLoading,
    error: projectsError,
  } = useProjects(onSessionExpired);

  const { isLoading, directory, domain, isRestricted, error } =
    useDirectoryForTab(selectedProjectId || null, onSessionExpired);

  const [counts, setCounts] = useState<SubmissionCounts | null>(null);
  const [countsRefreshKey, setCountsRefreshKey] = useState(0);

  useEffect(() => {
    if (!selectedProjectId) {
      setCounts(null);
      return;
    }
    fetchSubmissionCounts(selectedProjectId, onSessionExpired).then(setCounts);
  }, [selectedProjectId, countsRefreshKey, onSessionExpired]);

  const handleStageUpdated = useCallback(() => {
    setCountsRefreshKey((k) => k + 1);
  }, []);

  return (
    <div className="flex min-h-screen flex-col">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 border-b-2 border-foreground bg-card px-3 py-2.5">
        <div className="mx-auto w-full max-w-lg">
          <Header />
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
      <div className="mx-auto w-full max-w-lg space-y-3">
        {counts && selectedProjectId && (
          <ProgressStrip
            counts={counts}
            projects={projects}
            selectedProjectId={selectedProjectId}
            onSwitchProject={setSelectedProjectId}
          />
        )}

        {isLoading && <DirectoryLoadingSkeleton />}

        {!isLoading && isRestricted && (
          <Card className="border-2 border-foreground shadow-[var(--shadow-md)]">
            <CardContent className="pt-6 pb-5 text-center space-y-2">
              <p className="text-2xl">🫏</p>
              <p className="text-sm font-semibold">Open a web page to use Donkey Directories</p>
              <p className="text-xs text-muted-foreground">
                Navigate to any directory site and the extension will check if it's listed.
              </p>
            </CardContent>
          </Card>
        )}

        {!isLoading && !isRestricted && domain && !directory && !error && (
          <NotListedView
            domain={domain}
            selectedProjectId={selectedProjectId || null}
            projectsLoading={projectsLoading}
            onSessionExpired={onSessionExpired}
          />
        )}

        {!isLoading && !isRestricted && directory && (
          <DirectoryView
            directory={directory}
            isAdmin={isAdmin}
            projects={projects}
            selectedProjectId={selectedProjectId}
            setSelectedProjectId={setSelectedProjectId}
            projectsLoading={projectsLoading}
            projectsError={projectsError}
            onSessionExpired={onSessionExpired}
            onStageUpdated={handleStageUpdated}
          />
        )}

        {error && (
          <Alert variant="destructive">
            <AlertDescription className="text-xs">{error}</AlertDescription>
          </Alert>
        )}
      </div>
      </div>

      {/* Subtle account footer */}
      <div className="sticky bottom-0 z-10 border-t-2 border-foreground bg-card px-3 py-2">
        <div className="mx-auto flex w-full max-w-lg items-center justify-between gap-2">
          <span className="truncate text-xs font-semibold text-muted-foreground">{userEmail}</span>
          <div className="flex shrink-0 items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-auto px-2 py-1 text-xs"
              onClick={() => {
                const params = new URLSearchParams({
                  supportWidgetOpen: "true",
                  supportEmail: userEmail,
                });
                chrome.tabs.create({ url: `https://donkey.directory/?${params}` });
              }}
            >
              Need help?
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-auto px-2 py-1 text-xs"
              onClick={onLogout}
            >
              Logout
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ProgressStrip({
  counts,
  projects,
  selectedProjectId,
  onSwitchProject,
}: {
  counts: SubmissionCounts;
  projects: Project[];
  selectedProjectId: string;
  onSwitchProject: (id: string) => void;
}) {
  const { completed_directories, total_directories } = counts;
  const pct = total_directories > 0 ? Math.round((completed_directories / total_directories) * 100) : 0;
  const isComplete = pct === 100;
  const project = projects.find((p) => p.id === selectedProjectId);

  function handleSwitch() {
    if (projects.length < 2) return;
    const idx = projects.findIndex((p) => p.id === selectedProjectId);
    const next = projects[(idx + 1) % projects.length];
    onSwitchProject(next.id);
  }

  return (
    <div
      className="relative rounded-xl border-2 bg-card px-3.5 py-2.5 transition-all duration-700"
      style={isComplete ? {
        borderColor: "#C3F73A",
        boxShadow: "var(--shadow-sm)",
      } : {
        borderColor: "#1A1A1A",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      {isComplete && (
        <style>{`
          @keyframes shimmer {
            0%   { background-position: 0% 50%; }
            50%  { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }
          @keyframes glint {
            0%   { transform: translateX(-100%) skewX(-20deg); opacity: 0; }
            15%  { opacity: 0.45; }
            85%  { opacity: 0.45; }
            100% { transform: translateX(600%) skewX(-20deg); opacity: 0; }
          }
        `}</style>
      )}
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-[11px] font-semibold text-muted-foreground shrink-0">Progress for</span>
          <span className="text-[11px] font-bold text-foreground truncate">{project?.domain ?? "your project"}</span>
          {projects.length > 1 && (
            <button
              type="button"
              onClick={handleSwitch}
              title="Switch project"
              className="shrink-0 inline-flex items-center justify-center h-4 w-4 rounded border border-foreground/20 text-muted-foreground hover:border-foreground hover:text-foreground transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M7 16V4m0 0L3 8m4-4 4 4" />
                <path d="M17 8v12m0 0 4-4m-4 4-4-4" />
              </svg>
            </button>
          )}
        </div>
        <span
          className="text-[11px] font-bold shrink-0 transition-colors duration-700"
          style={isComplete ? { color: "#3D3BF3" } : undefined}
        >
          {isComplete ? "🏆 " : ""}{completed_directories} / {total_directories}
        </span>
      </div>

      <div className="relative h-2 w-full rounded-full border border-foreground/15 bg-secondary overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={isComplete ? {
            width: "100%",
            background: "linear-gradient(90deg, #C3F73A, #E8F73A, #A8E632, #C3F73A)",
            backgroundSize: "250% 100%",
            animation: "shimmer 4s ease infinite",
          } : {
            width: `${pct}%`,
            background: "#C3F73A",
          }}
        />
        {isComplete && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              overflow: "hidden",
              borderRadius: "9999px",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "15%",
                height: "100%",
                background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)",
                animation: "glint 4s ease-in-out 1s infinite",
              }}
            />
          </div>
        )}
      </div>

      <div className="flex justify-between mt-1">
        <span className="text-[10px] text-muted-foreground">{counts.submitted_directories} submitted · {counts.skipped_directories} skipped</span>
        <span
          className="text-[10px] font-semibold transition-colors duration-700"
          style={isComplete ? { color: "#3D3BF3" } : { color: "var(--muted-foreground)" }}
        >
          {pct}%
        </span>
      </div>
    </div>
  );
}

function DirectoryLoadingSkeleton() {
  return (
    <div className="space-y-3">
      <div className="rounded-xl border-2 border-foreground bg-card p-4 space-y-3 shadow-[var(--shadow-md)]">
        <div className="flex items-center gap-2.5">
          <Skeleton className="h-8 w-8 rounded-md" />
          <div className="space-y-1.5 flex-1">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-4/5" />
        <div className="flex gap-1.5">
          <Skeleton className="h-5 w-12 rounded-md" />
          <Skeleton className="h-5 w-14 rounded-md" />
          <Skeleton className="h-5 w-10 rounded-md" />
        </div>
      </div>
      <div className="rounded-xl border-2 border-foreground bg-card p-4 space-y-3 shadow-[var(--shadow-md)]">
        <Skeleton className="h-9 w-full rounded-md" />
        <Skeleton className="h-9 w-full rounded-md" />
      </div>
    </div>
  );
}
