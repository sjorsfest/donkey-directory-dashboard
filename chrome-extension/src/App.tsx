import { useCallback, useState } from "react";
import { useAuth } from "./hooks/useAuth";
import { LoginView } from "./components/LoginView";
import { MainView } from "./components/MainView";
import { findDirectoryByHostname, voteDirectory } from "./lib/api";
import type { DirectoryVoteChoice } from "./types";
import { Card, CardContent } from "@/shared/ui/card";
import { Skeleton } from "@/shared/ui/skeleton";

interface VoteState {
  isSubmitting: boolean;
  targetDomain: string | null;
  selectedVote: DirectoryVoteChoice | null;
  successMessage: string | null;
  errorMessage: string | null;
}

export function App() {
  const { isLoading, isAuthenticated, userEmail, onLoginSuccess, logout, onSessionExpired } =
    useAuth();
  const [voteState, setVoteState] = useState<VoteState>({
    isSubmitting: false,
    targetDomain: null,
    selectedVote: null,
    successMessage: null,
    errorMessage: null,
  });

  const handleVote = useCallback(
    async (vote: DirectoryVoteChoice) => {
      setVoteState((prev) => ({
        ...prev,
        isSubmitting: true,
        successMessage: null,
        errorMessage: null,
      }));

      try {
        const tab = await getTargetTab();
        if (!tab?.id) {
          throw new Error(
            "Cannot access this page. Open a directory site tab and try again."
          );
        }

        let hostname = toHostname(tab.url);
        if (!hostname) {
          const metadata = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => window.location.hostname,
          });
          hostname = toHostname(metadata?.[0]?.result);
        }

        if (!hostname) {
          throw new Error("Could not determine the current tab domain.");
        }

        const directory = await findDirectoryByHostname(hostname, onSessionExpired);
        if (!directory) {
          throw new Error(`No directory found for ${hostname}.`);
        }

        await voteDirectory(directory.id, vote, onSessionExpired);

        setVoteState({
          isSubmitting: false,
          targetDomain: directory.domain,
          selectedVote: vote,
          successMessage:
            vote === "up"
              ? `Thumbs up recorded for ${directory.name}.`
              : `Thumbs down recorded for ${directory.name}.`,
          errorMessage: null,
        });
      } catch (error) {
        setVoteState((prev) => ({
          ...prev,
          isSubmitting: false,
          successMessage: null,
          errorMessage:
            error instanceof Error ? error.message : "Could not submit vote.",
        }));
      }
    },
    [onSessionExpired]
  );

  if (isLoading) {
    return (
      <div className="view p-4">
        <Card>
          <CardContent className="pt-6 space-y-3">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginView onLoginSuccess={onLoginSuccess} />;
  }

  return (
    <MainView
      userEmail={userEmail!}
      onLogout={logout}
      onSessionExpired={onSessionExpired}
      voteState={voteState}
      onVote={handleVote}
    />
  );
}

function isRestrictedTabUrl(url?: string): boolean {
  if (!url) return false;

  return (
    url.startsWith("chrome://") ||
    url.startsWith("chrome-extension://") ||
    url.startsWith("edge://") ||
    url.startsWith("about:") ||
    url.startsWith("devtools://") ||
    url.startsWith("view-source:")
  );
}

async function getTargetTab(): Promise<chrome.tabs.Tab | undefined> {
  const strategies: chrome.tabs.QueryInfo[] = [
    { active: true, currentWindow: true },
    { active: true, lastFocusedWindow: true },
    { active: true },
  ];

  for (const query of strategies) {
    const tabs = await chrome.tabs.query(query);
    const usableTab = tabs.find(
      (tab) => tab.id !== undefined && !isRestrictedTabUrl(tab.url)
    );
    if (usableTab) return usableTab;
  }

  return undefined;
}

function toHostname(value: unknown): string | null {
  if (typeof value !== "string" || value.trim().length === 0) {
    return null;
  }

  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    const hostname = value.trim().toLowerCase();
    return hostname.length > 0 ? hostname : null;
  }
}
