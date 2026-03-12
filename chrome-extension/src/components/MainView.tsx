import { Header } from "./Header";
import { StatusSteps } from "./StatusSteps";
import { ResultsPanel } from "./ResultsPanel";
import { useProjects } from "../hooks/useProjects";
import { useFillFlow } from "../hooks/useFillFlow";
import { Alert, AlertDescription } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";
import { Label } from "@/shared/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";

interface MainViewProps {
  userEmail: string;
  onLogout: () => void;
  onSessionExpired: () => void;
}

export function MainView({
  userEmail,
  onLogout,
  onSessionExpired,
}: MainViewProps) {
  const {
    projects,
    selectedProjectId,
    setSelectedProjectId,
    isLoading: projectsLoading,
    error: projectsError,
  } = useProjects(onSessionExpired);

  const { steps, results, error: fillError, isRunning, run, reset } =
    useFillFlow(onSessionExpired);

  const canFill = !!selectedProjectId && !isRunning && !projectsLoading;

  function handleFill() {
    reset();
    run(selectedProjectId);
  }

  return (
    <div className="view p-4 space-y-4">
      <Card>
        <CardContent className="pt-6 space-y-4">
          <Header />
          <div className="flex items-center justify-between gap-2 rounded-md border-2 bg-secondary p-2">
            <span className="truncate text-xs font-semibold text-muted-foreground">{userEmail}</span>
            <Button variant="ghost" size="sm" className="h-auto px-2 py-1 text-xs" onClick={onLogout}>
              Logout
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6 space-y-3">
          <div className="space-y-2">
            <Label htmlFor="project-select">Project</Label>
            <Select
              value={selectedProjectId || undefined}
              onValueChange={setSelectedProjectId}
              disabled={projectsLoading || projects.length === 0}
            >
              <SelectTrigger id="project-select">
                <SelectValue
                  placeholder={
                    projectsLoading ? "Loading projects..." : projectsError || "No projects found"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} ({p.domain})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            disabled={!canFill}
            onClick={handleFill}
            className="w-full"
          >
            Fill Forms
          </Button>
        </CardContent>
      </Card>

      {fillError && (
        <Alert variant="destructive">
          <AlertDescription>{fillError}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-4">
        <StatusSteps steps={steps} />
        {results && (
          <ResultsPanel
            fields={results.fields}
            filled={results.filled}
            skipped={results.skipped}
          />
        )}
      </div>
    </div>
  );
}
