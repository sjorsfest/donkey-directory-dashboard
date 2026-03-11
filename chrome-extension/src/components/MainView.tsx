import { Header } from "./Header";
import { StatusSteps } from "./StatusSteps";
import { ResultsPanel } from "./ResultsPanel";
import { useProjects } from "../hooks/useProjects";
import { useFillFlow } from "../hooks/useFillFlow";

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
    <div className="view">
      <Header />
      <div className="user-bar">
        <span className="user-email">{userEmail}</span>
        <button className="link-btn" onClick={onLogout}>
          Logout
        </button>
      </div>

      <div className="project-section">
        <label htmlFor="project-select">Project</label>
        <select
          id="project-select"
          value={selectedProjectId}
          onChange={(e) => setSelectedProjectId(e.target.value)}
          disabled={projectsLoading}
        >
          {projectsLoading ? (
            <option value="">Loading projects...</option>
          ) : projects.length === 0 ? (
            <option value="">
              {projectsError || "No projects found"}
            </option>
          ) : (
            projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.domain})
              </option>
            ))
          )}
        </select>
      </div>

      <button
        className="primary-btn"
        disabled={!canFill}
        onClick={handleFill}
      >
        Fill Forms
      </button>

      {fillError && <p className="error">{fillError}</p>}

      <StatusSteps steps={steps} />

      {results && (
        <ResultsPanel
          fields={results.fields}
          filled={results.filled}
          skipped={results.skipped}
        />
      )}
    </div>
  );
}
