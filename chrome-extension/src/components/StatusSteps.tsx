import type { StepInfo } from "../types";
import { Badge } from "@/shared/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";

interface StatusStepsProps {
  steps: StepInfo[];
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
          <div key={i} className="flex items-center justify-between gap-2 rounded-md border p-2 text-xs">
            <span className="truncate">{step.text}</span>
            <Badge
              variant={
                step.state === "error"
                  ? "destructive"
                  : step.state === "done"
                    ? "secondary"
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
