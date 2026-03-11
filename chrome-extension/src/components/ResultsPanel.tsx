import type { FilledField } from "../types";

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
    <div className="results-section">
      <div className="results-header">
        <span className="result-count">{countText}</span>
      </div>
      <div>
        {fields.map((f) => {
          const displayValue =
            f.value != null && f.value !== ""
              ? String(f.value).slice(0, 80) +
                (String(f.value).length > 80 ? "..." : "")
              : null;

          return (
            <div key={f.field_id} className="result-field">
              <span className="field-label" title={f.field_id}>
                {f.field_id}
              </span>
              {displayValue ? (
                <span className="field-value">{displayValue}</span>
              ) : (
                <span className="field-skipped">skipped</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
