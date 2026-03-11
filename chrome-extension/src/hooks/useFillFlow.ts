import { useState, useCallback } from "react";
import { fillForm } from "../lib/api";
import { scanFormFields } from "../content-scripts/scan-form-fields";
import { fillFormFields } from "../content-scripts/fill-form-fields";
import type { StepInfo, FilledField, FillResult, ScannedField } from "../types";

interface FillResults {
  fields: FilledField[];
  filled: number;
  skipped: number;
}

function isRestrictedTabUrl(url?: string): boolean {
  if (!url) return false;

  return (
    url.startsWith("chrome://") ||
    url.startsWith("chrome-extension://") ||
    url.startsWith("edge://") ||
    url.startsWith("about:") ||
    url.startsWith("devtools://") ||
    url.startsWith("view-source:")
  );
}

async function getTargetTab(): Promise<chrome.tabs.Tab | undefined> {
  const strategies: chrome.tabs.QueryInfo[] = [
    { active: true, currentWindow: true },
    { active: true, lastFocusedWindow: true },
    { active: true },
  ];

  for (const query of strategies) {
    const tabs = await chrome.tabs.query(query);
    const usableTab = tabs.find(
      (tab) => tab.id !== undefined && !isRestrictedTabUrl(tab.url)
    );
    if (usableTab) return usableTab;
  }

  return undefined;
}

function normalizeKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function toTokens(value: string): string[] {
  return value
    .toLowerCase()
    .split(/[^a-z0-9]+/g)
    .filter((token) => token.length > 1);
}

function buildFieldIdVariants(fieldId: string): string[] {
  const lower = fieldId.toLowerCase();
  const variants = new Set<string>([fieldId, lower]);

  if (lower.endsWith("_id")) {
    const withoutId = lower.slice(0, -3);
    variants.add(withoutId);
  }

  if (lower.startsWith("meta_")) {
    const withoutMeta = lower.slice(5);
    variants.add(withoutMeta);
  }

  if (lower.endsWith("rules")) {
    variants.add(`${lower.slice(0, -1)}`);
  }

  return Array.from(variants);
}

function scoreMatch(fieldId: string, scanned: ScannedField): number {
  const variants = buildFieldIdVariants(fieldId);
  const variantNormalized = variants.map(normalizeKey).filter(Boolean);
  const fieldKey = scanned.field_id || "";
  const fieldLabel = scanned.label || "";
  const fieldPlaceholder = scanned.placeholder || "";
  const fieldAliases = [fieldKey, fieldLabel, fieldPlaceholder];
  const normalizedAliases = fieldAliases.map(normalizeKey).filter(Boolean);

  if (fieldAliases.includes(fieldId)) return 100;
  if (fieldAliases.some((a) => a.toLowerCase() === fieldId.toLowerCase())) return 90;
  if (normalizedAliases.some((a) => variantNormalized.includes(a))) return 75;

  const variantTokens = variants.flatMap(toTokens);
  const aliasTokens = fieldAliases.flatMap(toTokens);
  const aliasTokenSet = new Set(aliasTokens);
  const overlap = variantTokens.filter((t) => aliasTokenSet.has(t)).length;

  let score = overlap * 10;
  const variantText = variants.join(" ");

  if (variantText.includes("category") && scanned.tag === "select") score += 20;
  if (variantText.includes("agree") && scanned.type === "checkbox") score += 20;
  if (variantText.includes("meta") && /meta/i.test(fieldLabel)) score += 15;

  return score;
}

function mapReturnedFieldsToScannedFields(
  filledFields: FilledField[],
  scannedFields: ScannedField[]
): FilledField[] {
  const scannedIds = new Set(scannedFields.map((f) => f.field_id));

  return filledFields.map((field) => {
    if (scannedIds.has(field.field_id)) return field;

    let bestMatch: ScannedField | null = null;
    let bestScore = 0;

    for (const scanned of scannedFields) {
      const score = scoreMatch(field.field_id, scanned);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = scanned;
      }
    }

    if (!bestMatch || bestScore < 20) return field;

    return {
      ...field,
      field_id: bestMatch.field_id,
    };
  });
}

export function useFillFlow(onSessionExpired?: () => void) {
  const [steps, setSteps] = useState<StepInfo[]>([]);
  const [results, setResults] = useState<FillResults | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const addStep = (text: string, state: StepInfo["state"] = "active") => {
    setSteps((prev) => [...prev, { text, state }]);
  };

  const updateLastStep = (text: string, state: StepInfo["state"]) => {
    setSteps((prev) => {
      const updated = [...prev];
      updated[updated.length - 1] = { text, state };
      return updated;
    });
  };

  const run = useCallback(
    async (projectId: string) => {
      setSteps([]);
      setResults(null);
      setError(null);
      setIsRunning(true);

      try {
        // Step 1: Get active tab
        const tab = await getTargetTab();
        if (!tab?.id) {
          throw new Error(
            "Cannot access this page. Navigate to a directory submission form."
          );
        }

        // In side panel context, tab.url may be unavailable without extra permissions.
        // Read page metadata directly from the tab so the backend still receives URL/title.
        let pageUrl = tab.url || "";
        let pageTitle = tab.title || "";
        if (!pageUrl || !pageTitle) {
          const metadata = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => ({
              url: window.location.href,
              title: document.title,
            }),
          });

          pageUrl = metadata?.[0]?.result?.url || pageUrl;
          pageTitle = metadata?.[0]?.result?.title || pageTitle;
        }

        // Step 2: Scan form fields
        addStep("Scanning form fields (including lazy-loaded fields)...");
        const scanResults = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: scanFormFields,
          args: [12000],
        });

        const fields = scanResults?.[0]?.result;
        if (!fields || fields.length === 0) {
          updateLastStep("No form fields found on this page.", "error");
          return;
        }
        updateLastStep(`Found ${fields.length} form fields`, "done");

        // Step 3: Send to backend
        addStep("Generating fill values...");
        const data = await fillForm(
          projectId,
          pageUrl,
          pageTitle,
          fields,
          onSessionExpired
        );

        const filledFields = data.filled_fields || [];
        if (filledFields.length === 0) {
          updateLastStep("Backend returned no fill values.", "error");
          return;
        }
        const mappedFields = mapReturnedFieldsToScannedFields(filledFields, fields);
        updateLastStep(`Generated ${mappedFields.length} values`, "done");

        // Step 4: Fill the form
        addStep("Filling form fields (waiting for delayed inputs)...");
        const fillResults = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: fillFormFields,
          args: [mappedFields, 8000],
        });

        const fillResult: FillResult = fillResults?.[0]?.result || {
          filled: 0,
          skipped: 0,
        };
        updateLastStep(`Filled ${fillResult.filled} fields`, "done");

        setResults({
          fields: mappedFields,
          filled: fillResult.filled,
          skipped: fillResult.skipped,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred.");
      } finally {
        setIsRunning(false);
      }
    },
    [onSessionExpired]
  );

  const reset = useCallback(() => {
    setSteps([]);
    setResults(null);
    setError(null);
  }, []);

  return { steps, results, error, isRunning, run, reset };
}
