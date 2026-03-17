import { Header } from "./Header";
import { DirectoryView } from "./DirectoryView";
import { NotListedView } from "./NotListedView";
import { useProjects } from "../hooks/useProjects";
import { useDirectoryForTab } from "../hooks/useDirectoryForTab";
import { Alert, AlertDescription } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";
import { Skeleton } from "@/shared/ui/skeleton";

interface MainViewProps {
  userEmail: string;
  onLogout: () => void;
  onSessionExpired: () => void;
}

export function MainView({ userEmail, onLogout, onSessionExpired }: MainViewProps) {
  const {
    projects,
    selectedProjectId,
    setSelectedProjectId,
    isLoading: projectsLoading,
    error: projectsError,
  } = useProjects(onSessionExpired);

  const { isLoading, directory, domain, isRestricted, error } =
    useDirectoryForTab(selectedProjectId || null, onSessionExpired);

  return (
    <div className="flex min-h-screen flex-col">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 border-b-2 border-foreground bg-card px-3 py-2.5">
        <Header />
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
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
          <NotListedView domain={domain} onSessionExpired={onSessionExpired} />
        )}

        {!isLoading && !isRestricted && directory && (
          <DirectoryView
            directory={directory}
            projects={projects}
            selectedProjectId={selectedProjectId}
            setSelectedProjectId={setSelectedProjectId}
            projectsLoading={projectsLoading}
            projectsError={projectsError}
            onSessionExpired={onSessionExpired}
          />
        )}

        {error && (
          <Alert variant="destructive">
            <AlertDescription className="text-xs">{error}</AlertDescription>
          </Alert>
        )}
      </div>

      {/* Subtle account footer */}
      <div className="sticky bottom-0 z-10 flex items-center justify-between gap-2 border-t-2 border-foreground bg-card px-3 py-2">
        <span className="truncate text-xs font-semibold text-muted-foreground">{userEmail}</span>
        <Button
          variant="ghost"
          size="sm"
          className="h-auto shrink-0 px-2 py-1 text-xs"
          onClick={onLogout}
        >
          Logout
        </Button>
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
