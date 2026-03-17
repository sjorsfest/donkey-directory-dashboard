import { useState } from "react";
import { fetchRandomDirectory } from "../lib/api";
import { Alert, AlertDescription } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";

interface NotListedViewProps {
  domain: string;
  onSessionExpired: () => void;
}

export function NotListedView({ domain, onSessionExpired }: NotListedViewProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleVisitRandom() {
    setIsLoading(true);
    setError(null);
    try {
      const result = await fetchRandomDirectory(onSessionExpired);
      if (!result) {
        setError("Could not find a random directory. Try again.");
        return;
      }
      await chrome.tabs.create({ url: result.redirect_url });
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
          disabled={isLoading}
          variant="outline"
          className="w-full"
        >
          {isLoading ? "Finding a directory..." : "✨ Visit Random Directory"}
        </Button>
        {error && (
          <Alert variant="destructive">
            <AlertDescription className="text-xs">{error}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
