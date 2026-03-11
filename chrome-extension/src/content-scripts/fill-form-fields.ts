import type { FilledField, FillResult } from "../types";

/**
 * Injected into the active tab via chrome.scripting.executeScript.
 * Must be completely self-contained (no imports used at runtime).
 */
export async function fillFormFields(
  filledFields: FilledField[],
  timeoutMs = 8000
): Promise<FillResult> {
  const normalize = (value: string) =>
    value.toLowerCase().replace(/[^a-z0-9]+/g, "");

  const buildFieldVariants = (fieldId: string): string[] => {
    const lower = fieldId.toLowerCase();
    const variants = new Set<string>([fieldId, lower]);

    if (lower.endsWith("_id")) {
      variants.add(lower.slice(0, -3));
    }

    if (lower.startsWith("meta_")) {
      variants.add(lower.slice(5));
    }

    if (lower.endsWith("rules")) {
      variants.add(lower.slice(0, -1));
    }

    return Array.from(variants);
  };

  const getLabelText = (
    input: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
  ): string => {
    const ownerDoc = input.ownerDocument;
    if (input.id) {
      const label = ownerDoc.querySelector(`label[for="${CSS.escape(input.id)}"]`);
      if (label?.textContent) return label.textContent;
    }

    const parentLabel = input.closest("label");
    if (parentLabel?.textContent) return parentLabel.textContent;
    return "";
  };

  const getAccessibleDocuments = (): Document[] => {
    const docs: Document[] = [];
    const queue: Document[] = [document];
    const seen = new Set<Document>();

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (seen.has(current)) continue;
      seen.add(current);
      docs.push(current);

      const frames = current.querySelectorAll("iframe");
      frames.forEach((frame) => {
        try {
          const frameDoc = frame.contentDocument;
          if (frameDoc && !seen.has(frameDoc)) {
            queue.push(frameDoc);
          }
        } catch {
          // Ignore cross-origin frames.
        }
      });
    }

    return docs;
  };

  const getSearchRoots = (doc: Document): Array<Document | ShadowRoot> => {
    const roots: Array<Document | ShadowRoot> = [doc];
    const queue: Array<Document | ShadowRoot> = [doc];
    const seen = new Set<Document | ShadowRoot>([doc]);

    while (queue.length > 0) {
      const root = queue.shift()!;
      const elements = root.querySelectorAll("*");
      elements.forEach((node) => {
        const el = node as HTMLElement;
        if (el.shadowRoot && !seen.has(el.shadowRoot)) {
          seen.add(el.shadowRoot);
          roots.push(el.shadowRoot);
          queue.push(el.shadowRoot);
        }
      });
    }

    return roots;
  };

  const queryFirst = (selector: string): HTMLElement | null => {
    for (const doc of getAccessibleDocuments()) {
      for (const root of getSearchRoots(doc)) {
        const match = root.querySelector(selector) as HTMLElement | null;
        if (match) return match;
      }
    }
    return null;
  };

  const queryAllFields = (): Array<
    HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
  > => {
    const all: Array<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement> = [];
    const seen = new Set<Element>();

    for (const doc of getAccessibleDocuments()) {
      for (const root of getSearchRoots(doc)) {
        root.querySelectorAll("input, textarea, select").forEach((el) => {
          if (seen.has(el)) return;
          seen.add(el);
          all.push(el as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement);
        });
      }
    }

    return all;
  };

  const findElementForField = (fieldId: string): HTMLElement | null => {
    const byDataId = queryFirst(
      `[data-dd-field-id="${CSS.escape(fieldId)}"]`
    );
    if (byDataId) return byDataId;

    const variants = buildFieldVariants(fieldId);
    for (const variant of variants) {
      const escaped = CSS.escape(variant);
      const direct = queryFirst(`#${escaped}`) || queryFirst(`[name="${escaped}"]`);
      if (direct) return direct;
    }

    const normalizedVariants = new Set(variants.map(normalize));
    const candidates = queryAllFields();
    let bestEl: HTMLElement | null = null;
    let bestScore = 0;

    candidates.forEach((candidate) => {
      const input =
        candidate as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
      const aliases = [
        input.getAttribute("data-dd-field-id") || "",
        input.id || "",
        input.getAttribute("name") || "",
        getLabelText(input),
        input.getAttribute("placeholder") || "",
      ];

      let score = 0;
      for (const alias of aliases) {
        const normalizedAlias = normalize(alias);
        if (!normalizedAlias) continue;
        if (normalizedVariants.has(normalizedAlias)) score = Math.max(score, 80);

        for (const variant of normalizedVariants) {
          if (!variant) continue;
          if (normalizedAlias.includes(variant) || variant.includes(normalizedAlias)) {
            score = Math.max(score, 40);
          }
        }
      }

      if (score > bestScore) {
        bestScore = score;
        bestEl = input as HTMLElement;
      }
    });

    return bestScore >= 40 ? bestEl : null;
  };

  const waitForElementForField = async (
    fieldId: string,
    waitMs: number
  ): Promise<HTMLElement | null> => {
    const immediate = findElementForField(fieldId);
    if (immediate || waitMs <= 0) return immediate;

    const root = document.documentElement || document.body;
    if (!root) return null;

    return new Promise((resolve) => {
      let observer: MutationObserver | null = null;
      let intervalId: number | null = null;
      const startedAt = Date.now();

      const finish = (el: HTMLElement | null) => {
        if (observer) observer.disconnect();
        if (intervalId !== null) window.clearInterval(intervalId);
        resolve(el);
      };

      const attempt = () => {
        const found = findElementForField(fieldId);
        if (found) {
          finish(found);
          return;
        }
        if (Date.now() - startedAt >= waitMs) {
          finish(null);
        }
      };

      observer = new MutationObserver(() => attempt());
      observer.observe(root, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["class", "style", "hidden", "aria-hidden"],
      });
      intervalId = window.setInterval(() => attempt(), 250);

      attempt();
    });
  };

  let filled = 0;
  let skipped = 0;
  const deadline = Date.now() + timeoutMs;

  for (const { field_id, value } of filledFields) {
    try {
      let el = findElementForField(field_id);
      const remainingWaitMs = Math.max(0, deadline - Date.now());
      if (!el && remainingWaitMs > 0) {
        el = await waitForElementForField(field_id, remainingWaitMs);
      }

      if (!el || value == null || value === "") {
        skipped++;
        continue;
      }

      if (el.tagName === "SELECT") {
        const select = el as HTMLSelectElement;
        const match = Array.from(select.options).find(
          (o) =>
            String(o.value) === String(value) ||
            o.textContent!.trim().toLowerCase() ===
              String(value).toLowerCase()
        );
        if (match) {
          select.value = match.value;
          filled++;
        } else {
          skipped++;
          continue;
        }
      } else if ((el as HTMLInputElement).type === "checkbox") {
        (el as HTMLInputElement).checked =
          value === true || value === "true" || value === "1";
        filled++;
      } else if ((el as HTMLInputElement).type === "radio") {
        const radioName = (el as HTMLInputElement).name;
        const radios = queryAllFields().filter(
          (candidate) =>
            candidate instanceof HTMLInputElement &&
            candidate.type === "radio" &&
            candidate.name === radioName
        ) as HTMLInputElement[];
        let matched = false;
        radios.forEach((r) => {
          if (String(r.value) === String(value)) {
            r.checked = true;
            r.dispatchEvent(new Event("input", { bubbles: true }));
            r.dispatchEvent(new Event("change", { bubbles: true }));
            matched = true;
          }
        });
        if (matched) filled++;
        else skipped++;
        continue;
      } else {
        (el as HTMLInputElement | HTMLTextAreaElement).value = String(value);
        filled++;
      }

      // Dispatch events for framework reactivity
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
      el.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true }));

      // React-style native setter: apply the correct setter per element type.
      if (el.tagName === "INPUT") {
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype,
          "value"
        )?.set;
        if (nativeInputValueSetter) {
          nativeInputValueSetter.call(el, (el as HTMLInputElement).value);
          el.dispatchEvent(new Event("input", { bubbles: true }));
        }
      } else if (el.tagName === "TEXTAREA") {
        const nativeTextareaValueSetter = Object.getOwnPropertyDescriptor(
          window.HTMLTextAreaElement.prototype,
          "value"
        )?.set;
        if (nativeTextareaValueSetter) {
          nativeTextareaValueSetter.call(el, (el as HTMLTextAreaElement).value);
          el.dispatchEvent(new Event("input", { bubbles: true }));
        }
      }
    } catch {
      skipped++;
    }
  }

  return { filled, skipped };
}
