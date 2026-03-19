import { useState, useCallback } from "react";
import {
  fillForm,
  getCredits,
  isInsufficientCreditsError,
  resolveDirectoryIdForHostname,
} from "../lib/api";
import { getTargetTab, toHostname } from "../lib/tab-utils";
import { scanFormFields } from "../content-scripts/scan-form-fields";
import { fillFormFields } from "../content-scripts/fill-form-fields";
import type { BillingPack, StepInfo, FilledField, FillResult, ScannedField } from "../types";

interface FillResults {
  fields: FilledField[];
  fieldLabels: Record<string, string>;
  filled: number;
  skipped: number;
  outcomes: Record<string, "filled" | "not_filled">;
  chargedNow: boolean;
  alreadyChargedForPair: boolean;
  creditsRemaining: number | null;
  lifetimeUnlimited: boolean;
}

interface FillPaywallState {
  message: string;
  creditBalance: number;
  lifetimeUnlimited: boolean;
  availablePacks: BillingPack[];
}

interface FrameScanResult {
  frameId: number;
  fields: ScannedField[];
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

function asFrameScanResults(
  value: chrome.scripting.InjectionResult<ScannedField[]>[]
): FrameScanResult[] {
  return value
    .filter(
      (
        entry
      ): entry is chrome.scripting.InjectionResult<ScannedField[]> & { frameId: number } =>
        typeof entry.frameId === "number"
    )
    .map((entry) => ({
      frameId: entry.frameId,
      fields: Array.isArray(entry.result) ? entry.result : [],
    }))
    .filter((entry) => entry.fields.length > 0);
}

function toFillResult(value: unknown): FillResult {
  if (
    typeof value === "object" &&
    value !== null &&
    "filled" in value &&
    "skipped" in value &&
    typeof (value as { filled: unknown }).filled === "number" &&
    typeof (value as { skipped: unknown }).skipped === "number"
  ) {
    const raw = value as { filled: number; skipped: number; outcomes?: unknown };
    const outcomes =
      raw.outcomes !== null &&
      typeof raw.outcomes === "object"
        ? (raw.outcomes as Record<string, "filled" | "not_filled">)
        : {};
    return { filled: raw.filled, skipped: raw.skipped, outcomes };
  }

  return { filled: 0, skipped: 0, outcomes: {} };
}

function uniqueFieldsById(fields: FilledField[]): FilledField[] {
  const unique = new Map<string, FilledField>();

  for (const field of fields) {
    if (!unique.has(field.field_id)) {
      unique.set(field.field_id, field);
    }
  }

  return Array.from(unique.values());
}

export function useFillFlow(onSessionExpired?: () => void) {
  const [steps, setSteps] = useState<StepInfo[]>([]);
  const [results, setResults] = useState<FillResults | null>(null);
  const [paywall, setPaywall] = useState<FillPaywallState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const addStep = (text: string, state: StepInfo["state"] = "active") => {
    setSteps((prev) => [...prev, { text, state }]);
  };

  const updateLastStep = (text: string, state: StepInfo["state"]) => {
    setSteps((prev) => {
      if (prev.length === 0) {
        return prev;
      }

      const updated = [...prev];
      updated[updated.length - 1] = { text, state };
      return updated;
    });
  };

  const run = useCallback(
    async (projectId: string) => {
      setSteps([]);
      setResults(null);
      setPaywall(null);
      setError(null);
      setIsRunning(true);

      try {
        // Step 1: Get active tab
        const tab = await getTargetTab();
        if (tab?.id === undefined) {
          throw new Error(
            "Cannot access this page. Navigate to a directory submission form."
          );
        }
        const tabId = tab.id;

        // In side panel context, tab.url may be unavailable without extra permissions.
        // Read page metadata directly from the tab so the backend still receives URL/title.
        let pageUrl = tab.url || "";
        let pageTitle = tab.title || "";
        if (!pageUrl || !pageTitle) {
          const metadata = await chrome.scripting.executeScript({
            target: { tabId },
            func: () => ({
              url: window.location.href,
              title: document.title,
            }),
          });

          pageUrl = metadata?.[0]?.result?.url || pageUrl;
          pageTitle = metadata?.[0]?.result?.title || pageTitle;
        }

        const hostname = toHostname(pageUrl);
        if (!hostname) {
          throw new Error("Could not determine the active tab domain.");
        }

        addStep("Resolving directory identity...");
        const directoryId = await resolveDirectoryIdForHostname(hostname, onSessionExpired);
        if (!directoryId) {
          updateLastStep(`No directory found for ${hostname}.`, "error");
          return;
        }
        updateLastStep("Directory identity resolved", "done");

        // Step 2: Check credits before scanning
        const wallet = await getCredits(onSessionExpired);
        if (!wallet.lifetime_unlimited && wallet.credit_balance <= 0) {
          setPaywall({
            message: "You have no credits remaining. Top up to continue.",
            creditBalance: wallet.credit_balance,
            lifetimeUnlimited: wallet.lifetime_unlimited,
            availablePacks: wallet.available_packs,
          });
          return;
        }

        // Step 3: Scan form fields
        addStep("Scanning form fields (including iframe fields)...");
        const scanResults = await chrome.scripting.executeScript({
          target: { tabId, allFrames: true },
          func: scanFormFields,
          args: [12000],
        });

        const frameScanResults = asFrameScanResults(scanResults);
        const fields = frameScanResults.flatMap((entry) => entry.fields);

        if (fields.length === 0) {
          updateLastStep("No form fields found on this page.", "error");
          return;
        }
        updateLastStep(
          `Found ${fields.length} form fields across ${frameScanResults.length} frame${frameScanResults.length === 1 ? "" : "s"}`,
          "done"
        );

        // Step 4: Send to backend
        addStep("Generating fill values...");
        const data = await fillForm(
          {
            project_id: projectId,
            directory_id: directoryId,
            page_url: pageUrl,
            page_title: pageTitle,
            fields,
          },
          onSessionExpired
        );

        const filledFields = data.filled_fields || [];
        if (filledFields.length === 0) {
          updateLastStep("Backend returned no fill values.", "error");
          return;
        }

        const mappedFields = mapReturnedFieldsToScannedFields(filledFields, fields);
        updateLastStep(`Generated ${mappedFields.length} values`, "done");

        // Step 5: Fill the form
        addStep("Filling form fields across frames (waiting for delayed inputs)...");
        const fillResultsByFrame = await Promise.all(
          frameScanResults.map(async ({ frameId, fields: frameFields }) => {
            const frameFieldIdSet = new Set(frameFields.map((field) => field.field_id));
            const frameMappedFields = uniqueFieldsById(
              mappedFields.filter((field) => frameFieldIdSet.has(field.field_id))
            );

            if (frameMappedFields.length === 0) {
              return { filled: 0, skipped: 0, outcomes: {} as Record<string, "filled" | "not_filled"> };
            }

            try {
              const frameFillResults = await chrome.scripting.executeScript({
                target: { tabId, frameIds: [frameId] },
                func: fillFormFields,
                args: [frameMappedFields, 8000],
              });

              return toFillResult(frameFillResults?.[0]?.result);
            } catch {
              // Frame injection failed (e.g. cross-origin iframe blocked by the site).
              // Mark every field that was destined for this frame as not_filled.
              const outcomes: Record<string, "filled" | "not_filled"> = {};
              for (const f of frameMappedFields) outcomes[f.field_id] = "not_filled";
              return { filled: 0, skipped: frameMappedFields.length, outcomes };
            }
          })
        );

        const mergedOutcomes: Record<string, "filled" | "not_filled"> = {};
        const fillResult: FillResult = fillResultsByFrame.reduce(
          (acc, current) => {
            Object.assign(mergedOutcomes, current.outcomes);
            return {
              filled: acc.filled + current.filled,
              skipped: acc.skipped + current.skipped,
              outcomes: mergedOutcomes,
            };
          },
          { filled: 0, skipped: 0, outcomes: mergedOutcomes }
        );
        updateLastStep(`Filled ${fillResult.filled} fields`, "done");

        const fieldLabels: Record<string, string> = {};
        for (const f of fields) {
          if (f.label) fieldLabels[f.field_id] = f.label;
        }

        setResults({
          fields: mappedFields,
          fieldLabels,
          filled: fillResult.filled,
          skipped: fillResult.skipped,
          outcomes: mergedOutcomes,
          chargedNow: data.charged_now,
          alreadyChargedForPair: data.already_charged_for_pair,
          creditsRemaining: data.credits_remaining,
          lifetimeUnlimited: data.lifetime_unlimited,
        });
      } catch (err) {
        if (isInsufficientCreditsError(err)) {
          updateLastStep("Insufficient credits. Choose a pack to continue.", "error");
          setPaywall({
            message: err.message,
            creditBalance: err.creditBalance,
            lifetimeUnlimited: err.lifetimeUnlimited,
            availablePacks: err.availablePacks,
          });
          return;
        }

        setError(err instanceof Error ? err.message : "An error occurred.");
      } finally {
        setIsRunning(false);
      }
    },
    [onSessionExpired]
  );

  const refreshPaywall = useCallback(async () => {
    const wallet = await getCredits(onSessionExpired);
    setPaywall((current) => ({
      message: current?.message || "Insufficient credits. Choose a billing pack to continue.",
      creditBalance: wallet.credit_balance,
      lifetimeUnlimited: wallet.lifetime_unlimited,
      availablePacks: wallet.available_packs,
    }));
    return wallet;
  }, [onSessionExpired]);

  const reset = useCallback(() => {
    setSteps([]);
    setResults(null);
    setPaywall(null);
    setError(null);
  }, []);

  return { steps, results, paywall, error, isRunning, run, refreshPaywall, reset };
}
