import type { StepInfo } from "../types";

interface StatusStepsProps {
  steps: StepInfo[];
}

export function StatusSteps({ steps }: StatusStepsProps) {
  if (steps.length === 0) return null;

  return (
    <div className="status-section">
      <div>
        {steps.map((step, i) => (
          <div key={i} className={`status-step ${step.state}`}>
            <span className="step-icon">
              {step.state === "active" && <div className="spinner-small" />}
              {step.state === "done" && "\u2713"}
              {step.state === "error" && "\u2717"}
            </span>
            <span>{step.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
