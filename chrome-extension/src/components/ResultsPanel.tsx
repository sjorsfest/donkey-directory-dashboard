import type { FilledField } from "../types";
import { Badge } from "@/shared/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { ScrollArea } from "@/shared/ui/scroll-area";

interface ResultsPanelProps {
  fields: FilledField[];
  filled: number;
  skipped: number;
}

export function ResultsPanel({ fields, filled, skipped }: ResultsPanelProps) {
  const total = fields.length;
  let countText = `Filled ${filled} of ${total} fields`;
  if (skipped > 0) countText += ` (${skipped} skipped)`;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between gap-2 text-sm">
          Results
          <Badge variant="secondary">{countText}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-48 pr-2">
          <div className="space-y-2">
            {fields.map((f) => {
              const displayValue =
                f.value != null && f.value !== ""
                  ? String(f.value).slice(0, 80) +
                    (String(f.value).length > 80 ? "..." : "")
                  : null;

              return (
                <div key={f.field_id} className="flex items-start justify-between gap-2 rounded-md border p-2 text-xs">
                  <span className="max-w-32 truncate text-muted-foreground" title={f.field_id}>
                    {f.field_id}
                  </span>
                  {displayValue ? (
                    <span className="text-right break-all">{displayValue}</span>
                  ) : (
                    <span className="italic text-muted-foreground">skipped</span>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
