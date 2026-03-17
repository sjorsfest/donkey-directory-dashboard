import { useState, useEffect, useCallback } from "react";
import { fetchDirectoryByDomain } from "../lib/api";
import { getTargetTab, toHostname } from "../lib/tab-utils";
import type { DirectoryDetails } from "../types";

type State =
  | { status: "loading" }
  | { status: "restricted" }
  | { status: "done"; domain: string; directory: DirectoryDetails | null }
  | { status: "error"; domain: string | null; message: string };

export interface UseDirectoryForTabResult {
  isLoading: boolean;
  directory: DirectoryDetails | null;
  domain: string | null;
  isRestricted: boolean;
  error: string | null;
  refetch: () => void;
}

export function useDirectoryForTab(
  projectId: string | null,
  onSessionExpired?: () => void
): UseDirectoryForTabResult {
  const [state, setState] = useState<State>({ status: "loading" });
  const [refreshKey, setRefreshKey] = useState(0);

  const refetch = useCallback(() => {
    setState({ status: "loading" });
    setRefreshKey((k) => k + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setState({ status: "loading" });

      try {
        const tab = await getTargetTab();
        if (!tab) {
          if (!cancelled) setState({ status: "restricted" });
          return;
        }

        let hostname = toHostname(tab.url);
        if (!hostname && tab.id) {
          const metadata = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => window.location.hostname,
          });
          hostname = toHostname(metadata?.[0]?.result);
        }

        if (!hostname) {
          if (!cancelled) setState({ status: "restricted" });
          return;
        }

        const directory = await fetchDirectoryByDomain(hostname, projectId, onSessionExpired);
        if (!cancelled) {
          setState({ status: "done", domain: hostname, directory });
        }
      } catch (err) {
        if (!cancelled) {
          setState({
            status: "error",
            domain: null,
            message: err instanceof Error ? err.message : "Failed to load directory info.",
          });
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [projectId, onSessionExpired, refreshKey]);

  return {
    isLoading: state.status === "loading",
    isRestricted: state.status === "restricted",
    directory: state.status === "done" ? state.directory : null,
    domain: state.status === "done" || state.status === "error" ? (state.status === "done" ? state.domain : state.domain) : null,
    error: state.status === "error" ? state.message : null,
    refetch,
  };
}
