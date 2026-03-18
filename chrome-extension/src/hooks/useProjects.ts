import { useState, useEffect, useCallback } from "react";
import { loadProjects } from "../lib/api";
import { getSelectedProjectId, setSelectedProjectId as persistSelectedProjectId } from "../lib/storage";
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
        const [data, storedId] = await Promise.all([
          loadProjects(onSessionExpired),
          getSelectedProjectId(),
        ]);
        if (cancelled) return;
        setProjects(data);
        if (data.length > 0) {
          const valid = storedId && data.some((p) => p.id === storedId);
          setSelectedProjectId(valid ? storedId : data[0].id);
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

  const handleSetSelectedProjectId = useCallback((id: string) => {
    setSelectedProjectId(id);
    void persistSelectedProjectId(id);
  }, []);

  return {
    projects,
    selectedProjectId,
    setSelectedProjectId: handleSetSelectedProjectId,
    isLoading,
    error,
  };
}
