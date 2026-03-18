import { useState } from "react";
import { fetchRandomDirectory } from "../lib/api";
import { getTargetTab } from "../lib/tab-utils";
import { Alert, AlertDescription } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";

interface NotListedViewProps {
  domain: string;
  selectedProjectId: string | null;
  projectsLoading: boolean;
  onSessionExpired: () => void;
  allCompleted?: boolean;
}

export function NotListedView({
  domain,
  selectedProjectId,
  projectsLoading,
  onSessionExpired,
  allCompleted = false,
}: NotListedViewProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canVisitRandom = !isLoading && !projectsLoading && Boolean(selectedProjectId);
  const helperMessage = projectsLoading
    ? "Loading projects before we can pick a random directory."
    : !selectedProjectId
      ? "Select a project to get a random pending directory."
      : null;

  async function handleVisitRandom() {
    if (!selectedProjectId) {
      setError("Select a project before visiting a random directory.");
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const result = await fetchRandomDirectory(allCompleted ? null : selectedProjectId, onSessionExpired);
      if (!result) {
        setError("Could not find a random directory. Try again.");
        return;
      }
      const tab = await getTargetTab();
      if (tab?.id !== undefined) {
        await chrome.tabs.update(tab.id, { url: result.redirect_url });
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card className="border-2 border-foreground shadow-[var(--shadow-md)]">
      <CardContent className="px-5 pt-8 pb-6 space-y-5 text-center">
        <div className="text-5xl">🫏</div>
        <div className="space-y-2">
          <h2 className="text-sm font-bold">Not listed in Donkey Directories</h2>
          <p className="font-mono text-xs font-semibold text-muted-foreground bg-secondary inline-block px-2.5 py-1 rounded-lg border border-foreground/10">
            {domain}
          </p>
          <p className="text-xs text-muted-foreground">
            This site hasn't been added yet.
          </p>
        </div>
        <Button
          onClick={handleVisitRandom}
          disabled={!canVisitRandom}
          variant="outline"
          className="w-full"
        >
          {isLoading ? "Finding a directory..." : "✨ Visit Random Directory"}
        </Button>
        {helperMessage && (
          <p className="text-xs text-muted-foreground">{helperMessage}</p>
        )}
        {error && (
          <Alert variant="destructive">
            <AlertDescription className="text-xs">{error}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
