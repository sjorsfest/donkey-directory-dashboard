import type { StepInfo } from "../types";
import { Badge } from "@/shared/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";

interface StatusStepsProps {
  steps: StepInfo[];
}

function Spinner() {
  return (
    <svg
      className="size-3.5 shrink-0 animate-spin text-foreground/50"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

export function StatusSteps({ steps }: StatusStepsProps) {
  if (steps.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Status</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {steps.map((step, i) => (
          <div
            key={i}
            className={`flex items-center justify-between gap-2 rounded-md border-2 p-2 text-xs font-semibold ${
              step.state === "error"
                ? "border-l-4 border-l-destructive bg-destructive/10"
                : step.state === "done"
                  ? "border-l-4 border-l-accent bg-accent/20"
                  : "border-l-4 border-l-primary bg-secondary"
            }`}
          >
            <div className="flex min-w-0 items-center gap-2">
              {step.state === "active" && <Spinner />}
              <span className="truncate">{step.text}</span>
            </div>
            <Badge
              variant={
                step.state === "error"
                  ? "destructive"
                  : step.state === "done"
                    ? "accent"
                    : "outline"
              }
            >
              {step.state}
            </Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
