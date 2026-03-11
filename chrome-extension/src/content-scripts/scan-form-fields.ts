import type { ScannedField } from "../types";

/**
 * Injected into the active tab via chrome.scripting.executeScript.
 * Must be completely self-contained (no imports used at runtime).
 */
export async function scanFormFields(timeoutMs = 12000): Promise<ScannedField[]> {
  const SKIP_TYPES = new Set([
    "hidden",
    "submit",
    "button",
    "image",
    "reset",
    "file",
  ]);

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

  const isVisible = (
    input: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
  ): boolean => {
    if (input instanceof HTMLInputElement && SKIP_TYPES.has(input.type)) return false;
    if (input.hidden || input.getAttribute("aria-hidden") === "true") return false;

    const ownerWindow = input.ownerDocument.defaultView;
    if (!ownerWindow) return true;

    const style = ownerWindow.getComputedStyle(input);
    if (style.display === "none" || style.visibility === "hidden") return false;

    const rect = input.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  };

  const collectFields = (): ScannedField[] => {
    const fields: ScannedField[] = [];
    const seenElements = new Set<Element>();
    let generatedIndex = 0;

    for (const doc of getAccessibleDocuments()) {
      for (const root of getSearchRoots(doc)) {
        const elements = root.querySelectorAll("input, textarea, select");
        elements.forEach((el) => {
          if (seenElements.has(el)) return;
          seenElements.add(el);

          const input = el as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
          if (!isVisible(input)) return;

          const fieldId =
            input.getAttribute("name")?.trim() || input.id || `dd-field-${generatedIndex++}`;
          input.setAttribute("data-dd-field-id", fieldId);

          let label = "";
          if (input.id) {
            const labelEl = input.ownerDocument.querySelector(
              `label[for="${CSS.escape(input.id)}"]`
            );
            if (labelEl?.textContent) label = labelEl.textContent.trim();
          }
          if (!label && input.closest("label")) {
            const clone = input.closest("label")!.cloneNode(true) as HTMLElement;
            clone.querySelectorAll("input, textarea, select").forEach((c) => c.remove());
            label = clone.textContent?.trim() || "";
          }
          if (!label) label = input.getAttribute("aria-label") || "";
          if (!label && "placeholder" in input) label = input.placeholder || "";

          let options: { value: string; text: string }[] | null = null;
          if (input.tagName === "SELECT") {
            const select = input as HTMLSelectElement;
            options = Array.from(select.options).map((o) => ({
              value: o.value,
              text: o.textContent?.trim() || "",
            }));
          }

          fields.push({
            field_id: fieldId,
            type: input.type || input.tagName.toLowerCase(),
            tag: input.tagName.toLowerCase(),
            label,
            placeholder: "placeholder" in input ? input.placeholder || null : null,
            required: input.required,
            max_length:
              "maxLength" in input &&
              input.maxLength > 0 &&
              input.maxLength < 524288
                ? input.maxLength
                : null,
            options,
            pattern: "pattern" in input ? input.pattern || null : null,
          });
        });
      }
    }

    return fields;
  };

  const immediate = collectFields();
  if (immediate.length > 0 || timeoutMs <= 0) {
    return immediate;
  }

  const root = document.documentElement || document.body;
  if (!root) {
    return immediate;
  }

  return new Promise((resolve) => {
    let observer: MutationObserver | null = null;
    let intervalId: number | null = null;
    const startedAt = Date.now();

    const finish = (result: ScannedField[]) => {
      if (observer) observer.disconnect();
      if (intervalId !== null) window.clearInterval(intervalId);
      resolve(result);
    };

    const attempt = () => {
      const fields = collectFields();
      if (fields.length > 0) {
        finish(fields);
        return;
      }
      if (Date.now() - startedAt >= timeoutMs) {
        finish(fields);
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

    // Nudge common lazy-loaders that react to viewport/resize events.
    window.dispatchEvent(new Event("scroll"));
    window.dispatchEvent(new Event("resize"));
    attempt();
  });
}
