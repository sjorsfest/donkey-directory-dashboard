import { useState, useCallback } from "react";
import { fillForm } from "../lib/api";
import { scanFormFields } from "../content-scripts/scan-form-fields";
import { fillFormFields } from "../content-scripts/fill-form-fields";
import type { StepInfo, FilledField, FillResult } from "../types";

interface FillResults {
  fields: FilledField[];
  filled: number;
  skipped: number;
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
        const [tab] = await chrome.tabs.query({
          active: true,
          currentWindow: true,
        });
        if (!tab?.id || !tab.url || tab.url.startsWith("chrome://")) {
          throw new Error(
            "Cannot access this page. Navigate to a directory submission form."
          );
        }

        // Step 2: Scan form fields
        addStep("Scanning form fields...");
        const scanResults = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: scanFormFields,
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
          tab.url,
          tab.title || "",
          fields,
          onSessionExpired
        );

        const filledFields = data.filled_fields || [];
        if (filledFields.length === 0) {
          updateLastStep("Backend returned no fill values.", "error");
          return;
        }
        updateLastStep(`Generated ${filledFields.length} values`, "done");

        // Step 4: Fill the form
        addStep("Filling form fields...");
        const fillResults = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: fillFormFields,
          args: [filledFields],
        });

        const fillResult: FillResult = fillResults?.[0]?.result || {
          filled: 0,
          skipped: 0,
        };
        updateLastStep(`Filled ${fillResult.filled} fields`, "done");

        setResults({
          fields: filledFields,
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
