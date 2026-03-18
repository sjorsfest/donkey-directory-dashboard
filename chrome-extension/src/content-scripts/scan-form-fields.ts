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
  ]);

  const getAccessibleDocuments = (): Document[] => {
    // This function runs once per frame via chrome.scripting.executeScript(allFrames: true),
    // so each injection only needs to scan its own document.
    return [document];
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

    // Walk up the ancestor chain — popups/modals often hide via display:none,
    // visibility:hidden, or opacity:0 on a parent, not on the input itself.
    let el: Element | null = input;
    while (el && el !== input.ownerDocument.documentElement) {
      const style = ownerWindow.getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden") return false;
      // Treat opacity:0 as hidden (covers slide-out/fade-out popups)
      if (parseFloat(style.opacity) === 0) return false;
      el = el.parentElement;
    }

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

          // Fallback: walk ancestors looking for a sibling heading or title element.
          // Handles form builders (Google Forms, Typeform, etc.) where the question
          // title is a nearby div/span, not a <label> or aria-label.
          // Also fires when aria-label is a generic placeholder like "Your answer".
          const GENERIC_LABELS = new Set(["your answer", "jouw antwoord", "enter your answer"]);
          if (!label || GENERIC_LABELS.has(label.toLowerCase())) {
            let ancestor = input.parentElement;
            for (let depth = 0; depth < 8 && ancestor; depth++, ancestor = ancestor.parentElement) {
              for (const sibling of Array.from(ancestor.children)) {
                if (sibling === input || sibling.contains(input)) continue;
                const tag = sibling.tagName.toLowerCase();
                const role = sibling.getAttribute("role") || "";
                const isHeadingLike =
                  tag.match(/^h[1-6]$/) ||
                  role === "heading" ||
                  tag === "label" ||
                  sibling.getAttribute("aria-label") != null;

                // Also look inside the sibling for a nested heading element
                // (covers Google Forms where the question title lives inside a wrapper div)
                const nestedHeading = !isHeadingLike
                  ? (sibling.querySelector('[role="heading"], h1, h2, h3, h4, h5, h6, label') as Element | null)
                  : null;

                const sourceEl = isHeadingLike ? sibling : nestedHeading;
                if (!sourceEl) continue;

                const text = (sourceEl.textContent || "")
                  .trim()
                  .replace(/\s+/g, " ")
                  .replace(/[\s*]+$/, "") // strip trailing asterisks (required markers)
                  .trim();
                if (text && text.length < 150) {
                  label = text;
                  break;
                }
              }
              if (label && !GENERIC_LABELS.has(label.toLowerCase())) break;
            }
          }

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

    // Second pass: scan [data-field] containers for special fields
    // (contenteditable rich text editors and clickable chip groups)
    const scannedFieldIds = new Set(fields.map((f) => f.field_id));

    for (const doc2 of getAccessibleDocuments()) {
      for (const root2 of getSearchRoots(doc2)) {
        const containers = root2.querySelectorAll<HTMLElement>("[data-field]");
        containers.forEach((container) => {
          const fieldName = container.getAttribute("data-field");
          if (!fieldName || scannedFieldIds.has(fieldName)) return;

          // Contenteditable rich text editor (e.g. Tiptap/ProseMirror)
          const editor = container.querySelector('[contenteditable="true"]') as HTMLElement | null;
          if (editor) {
            const labelEl = container.querySelector("label");
            const label = labelEl?.textContent?.trim() || fieldName;
            const placeholderEl = container.querySelector("[data-placeholder]");
            const placeholder = placeholderEl?.getAttribute("data-placeholder") || null;
            fields.push({
              field_id: fieldName,
              type: "contenteditable",
              tag: "div",
              label,
              placeholder,
              required: false,
              max_length: null,
              options: null,
              pattern: null,
            });
            scannedFieldIds.add(fieldName);
            return;
          }

          // Clickable chip groups (no standard input inside)
          const hasInput = container.querySelector("input, textarea, select");
          if (hasInput) {
            // Check for file upload
            const fileInput = container.querySelector<HTMLInputElement>("input[type=file]");
            if (fileInput) {
              const labelEl = container.querySelector("label");
              const label = labelEl?.textContent?.trim() || fieldName;
              fields.push({
                field_id: fieldName,
                type: "file-upload",
                tag: "input",
                label,
                placeholder: fileInput.accept || null,
                required: false,
                max_length: null,
                options: null,
                pattern: fileInput.accept || null,
              });
              scannedFieldIds.add(fieldName);
              return;
            }

            // Check for tag input: a text input where typing + Enter adds a tag
            const textInput = container.querySelector<HTMLInputElement>(
              "input[type=text], input:not([type])"
            );
            if (textInput) {
              const containerLabel = container.querySelector("label")?.textContent?.trim() || "";
              const ph = textInput.placeholder || "";
              if (/tag/i.test(ph) || /add/i.test(ph) || /tag/i.test(containerLabel)) {
                const inputId = textInput.getAttribute("name")?.trim() || textInput.id || "";
                if (inputId) {
                  const existingIdx = fields.findIndex((f) => f.field_id === inputId);
                  if (existingIdx !== -1) fields.splice(existingIdx, 1);
                }
                // Point data-dd-field-id to the semantic [data-field] name
                textInput.setAttribute("data-dd-field-id", fieldName);
                fields.push({
                  field_id: fieldName,
                  type: "tag-input",
                  tag: "input",
                  label: containerLabel || fieldName,
                  placeholder: ph || null,
                  required: textInput.required,
                  max_length: null,
                  options: null,
                  pattern: null,
                });
                scannedFieldIds.add(fieldName);
              }
            }
            return;
          }

          const chips = Array.from(container.querySelectorAll<HTMLElement>(".cursor-pointer"));
          if (chips.length === 0) return;

          const options = chips
            .map((chip) => {
              const text = chip.textContent?.trim() || "";
              return { value: text, text };
            })
            .filter((o) => o.text.length > 0);
          if (options.length === 0) return;

          const labelEl = container.querySelector("label");
          const label = labelEl?.textContent?.trim() || fieldName;
          fields.push({
            field_id: fieldName,
            type: "clickable-chips",
            tag: "div",
            label,
            placeholder: null,
            required: false,
            max_length: null,
            options,
            pattern: null,
          });
          scannedFieldIds.add(fieldName);
        });
      }
    }

    // Third pass: scan [role="combobox"] buttons (Radix UI and similar custom selects)
    for (const doc3 of getAccessibleDocuments()) {
      for (const root3 of getSearchRoots(doc3)) {
        root3.querySelectorAll<HTMLElement>('[role="combobox"]').forEach((button) => {
          let fieldId = button.getAttribute("name")?.trim() || "";
          let label = "";

          if (button.id) {
            const labelEl = (button.ownerDocument || document).querySelector(
              `label[for="${CSS.escape(button.id)}"]`
            );
            if (labelEl?.textContent) label = labelEl.textContent.trim();
          }
          if (!label) label = button.getAttribute("aria-label") || "";

          // Derive a fieldId from the label text if no name attribute
          if (!fieldId && label) {
            fieldId = label
              .replace(/\(.*?\)/g, "")
              .trim()
              .toLowerCase()
              .replace(/[^a-z0-9]+/g, "_")
              .replace(/^_+|_+$/g, "");
          }

          if (!fieldId || scannedFieldIds.has(fieldId)) return;

          button.setAttribute("data-dd-field-id", fieldId);
          fields.push({
            field_id: fieldId,
            type: "combobox",
            tag: "button",
            label,
            placeholder: null,
            required: false,
            max_length: null,
            options: null,
            pattern: null,
          });
          scannedFieldIds.add(fieldId);
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
