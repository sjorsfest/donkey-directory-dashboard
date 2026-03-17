import { useState } from "react";
import type { FilledField } from "../types";
import { Badge } from "@/shared/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { cn } from "@/shared/lib/utils";

interface ResultsPanelProps {
  fields: FilledField[];
  fieldLabels: Record<string, string>;
  filled: number;
  skipped: number;
  outcomes: Record<string, "filled" | "not_filled">;
  chargedNow: boolean;
  alreadyChargedForPair: boolean;
}

function CopyIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-3"
    >
      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-3"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function FieldRow({
  field,
  label,
  outcome,
}: {
  field: FilledField;
  label: string | undefined;
  outcome: "filled" | "not_filled" | undefined;
}) {
  const [copied, setCopied] = useState(false);
  const rawValue =
    field.value != null && field.value !== "" ? String(field.value) : null;

  // Three states:
  // 1. no value (AI chose not to fill) → grey + dashed
  // 2. value + filled in DOM → normal
  // 3. value + NOT filled in DOM → amber warning, copy prominent
  const hasValue = rawValue !== null;
  const didFill = hasValue && outcome === "filled";
  const couldNotFill = hasValue && outcome === "not_filled";
  const noValue = !hasValue;

  const handleCopy = () => {
    if (!rawValue) return;
    navigator.clipboard.writeText(rawValue).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <div
      className={cn(
        "rounded-md border-2 p-2.5",
        noValue && "border-dashed opacity-50",
        couldNotFill && "border-amber-400 bg-amber-50",
        didFill && "border-solid",
      )}
    >
      {/* Row header: label + status dot + copy button */}
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5">
          {/* Status indicator dot */}
          {didFill && (
            <span className="size-1.5 shrink-0 rounded-full bg-primary-600" title="Filled in page" />
          )}
          {couldNotFill && (
            <span className="size-1.5 shrink-0 rounded-full bg-amber-500" title="Could not fill" />
          )}
          <span
            className="truncate text-xs font-semibold text-foreground"
            title={field.field_id}
          >
            {label || field.field_id}
          </span>
        </div>

        {hasValue && (
          <button
            onClick={handleCopy}
            className={cn(
              "flex shrink-0 items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-bold transition-all",
              copied
                ? "border-primary-600 bg-primary-100 text-primary-700"
                : couldNotFill
                  ? "border-amber-400 bg-amber-100 text-amber-700 hover:border-amber-600 hover:bg-amber-200"
                  : "border-border bg-muted text-muted-foreground hover:border-foreground hover:text-foreground active:translate-x-px active:translate-y-px",
            )}
            title="Copy to clipboard"
          >
            {copied ? <CheckIcon /> : <CopyIcon />}
            {copied ? "Copied!" : "Copy"}
          </button>
        )}
      </div>

      {/* Value / status message */}
      {noValue ? (
        <span className="text-xs italic text-muted-foreground">— no value</span>
      ) : couldNotFill ? (
        <div className="space-y-1">
          <p className="break-words text-xs font-medium leading-relaxed text-foreground">
            {rawValue}
          </p>
          <p className="text-[10px] font-semibold text-amber-600">
            Couldn't fill automatically — paste manually
          </p>
        </div>
      ) : (
        <p className="break-words text-xs font-medium leading-relaxed text-foreground">
          {rawValue}
        </p>
      )}
    </div>
  );
}

export function ResultsPanel({
  fields,
  fieldLabels,
  filled,
  skipped,
  outcomes,
  chargedNow,
  alreadyChargedForPair,
}: ResultsPanelProps) {
  const total = fields.length;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between gap-2 text-sm">
          Results
          <Badge variant="accent">
            {filled}/{total} filled{skipped > 0 ? `, ${skipped} skipped` : ""}
          </Badge>
        </CardTitle>

        {/* Credit charge status */}
        {(chargedNow || alreadyChargedForPair) && (
          <div className="pt-1">
            {chargedNow ? (
              <Badge variant="destructive">1 credit used</Badge>
            ) : (
              <Badge variant="accent">No new credit used</Badge>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent className="pt-0">
        <div className="space-y-2">
          {fields.map((f) => (
            <FieldRow key={f.field_id} field={f} label={fieldLabels[f.field_id]} outcome={outcomes[f.field_id]} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
