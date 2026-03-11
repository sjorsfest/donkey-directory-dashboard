import { useState, useEffect } from "react";
import { loadProjects } from "../lib/api";
import type { Project } from "../types";

export function useProjects(onSessionExpired?: () => void) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetch() {
      try {
        const data = await loadProjects(onSessionExpired);
        if (cancelled) return;
        setProjects(data);
        if (data.length > 0) {
          setSelectedProjectId(data[0].id);
        }
        setError(null);
      } catch (err) {
        if (cancelled) return;
        setError(
          err instanceof Error ? err.message : "Failed to load projects."
        );
        setProjects([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    fetch();
    return () => {
      cancelled = true;
    };
  }, [onSessionExpired]);

  return {
    projects,
    selectedProjectId,
    setSelectedProjectId,
    isLoading,
    error,
  };
}
