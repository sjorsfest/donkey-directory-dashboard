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

  // Use TreeWalker instead of querySelectorAll("*") — avoids allocating a large NodeList
  // and lets the browser iterate lazily.
  const getSearchRoots = (doc: Document): Array<Document | ShadowRoot> => {
    const roots: Array<Document | ShadowRoot> = [doc];
    const seen = new Set<Document | ShadowRoot>([doc]);

    // Use index pointer instead of queue.shift() — avoids O(n) array copy per iteration.
    let qi = 0;
    while (qi < roots.length) {
      const root = roots[qi++];
      const walker = doc.createTreeWalker(root as unknown as Node, NodeFilter.SHOW_ELEMENT);
      let node: Node | null = walker.nextNode();
      while (node !== null) {
        const el = node as HTMLElement;
        if (el.shadowRoot && !seen.has(el.shadowRoot)) {
          seen.add(el.shadowRoot);
          roots.push(el.shadowRoot);
        }
        node = walker.nextNode();
      }
    }

    return roots;
  };

  type WithCheckVisibility = Element & {
    checkVisibility?: (opts?: { checkOpacity?: boolean; checkVisibilityCSS?: boolean }) => boolean;
  };

  const isVisible = (
    input: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
  ): boolean => {
    if (input instanceof HTMLInputElement && SKIP_TYPES.has(input.type)) return false;
    if (input.hidden || input.getAttribute("aria-hidden") === "true") return false;

    // checkVisibility() checks the full ancestor chain in one browser-optimized call —
    // much faster than walking getComputedStyle on every ancestor.
    // Available in Chrome 105+ (all current extension targets).
    if (typeof (input as WithCheckVisibility).checkVisibility === "function") {
      if (
        !(input as WithCheckVisibility).checkVisibility!({
          checkOpacity: true,
          checkVisibilityCSS: true,
        })
      ) {
        return false;
      }
      const rect = input.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    }

    // Fallback for older environments: walk ancestor chain with getComputedStyle.
    const ownerWindow = input.ownerDocument.defaultView;
    if (!ownerWindow) return true;

    let el: Element | null = input;
    while (el && el !== input.ownerDocument.documentElement) {
      const style = ownerWindow.getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden") return false;
      if (parseFloat(style.opacity) === 0) return false;
      el = el.parentElement;
    }

    const rect = input.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  };

  // Single combined selector — queried once per root instead of 7 separate passes.
  const COMBINED_SELECTOR =
    'input, textarea, select, [data-field], [role="combobox"], ' +
    '[contenteditable="true"], button[role="checkbox"], button[role="radio"]';

  // Element buckets collected per root, processed in pass order.
  type RootBuckets = {
    formFields: HTMLElement[];
    dataFieldContainers: HTMLElement[];
    comboboxes: HTMLElement[];
    contenteditables: HTMLElement[];
    fileInputs: HTMLInputElement[];
    checkboxButtons: HTMLElement[];
    radioButtons: HTMLElement[];
  };

  const collectFields = (): ScannedField[] => {
    const fields: ScannedField[] = [];
    const seenElements = new Set<Element>();
    const scannedFieldIds = new Set<string>();
    let generatedIndex = 0;

    // Deferred DOM writes — batched and flushed at the end to avoid layout thrashing.
    const pendingWrites: Array<{ el: Element; attr: string; value: string }> = [];

    const GENERIC_LABELS = new Set([
      "your answer",
      "jouw antwoord",
      "enter your answer",
      "your informative answer",
    ]);

    const normalizeText = (value: string): string => value.trim().replace(/\s+/g, " ");

    const isGenericLabel = (value: string): boolean => {
      const normalized = normalizeText(value).toLowerCase();
      if (!normalized) return false;
      if (GENERIC_LABELS.has(normalized)) return true;
      return /^(your|enter|type|add)\b.*\banswer\b/.test(normalized);
    };

    const nextGeneratedFieldId = (): string => `dd-field-${generatedIndex++}`;

    // Shared helper: derive a label from an element by walking ancestors
    // looking for sibling label-like elements. Used by passes 3–5.
    const findNearbyLabel = (el: Element, maxDepth = 5): string => {
      let label = "";
      let ancestor = el.parentElement;
      for (let depth = 0; depth < maxDepth && ancestor; depth++, ancestor = ancestor.parentElement) {
        for (const sibling of Array.from(ancestor.children)) {
          if (sibling === el || sibling.contains(el)) continue;
          const tag = sibling.tagName.toLowerCase();
          const isLabelLike =
            tag === "label" ||
            tag.match(/^h[1-6]$/) ||
            sibling.getAttribute("role") === "heading";
          const isDivSpanLabel =
            (tag === "div" || tag === "span") &&
            !sibling.querySelector("input, textarea, select, button, [contenteditable]");
          if (!isLabelLike && !isDivSpanLabel) continue;
          const text = sibling.textContent?.trim().replace(/[\s*]+$/, "").trim() || "";
          if (text && text.length < 100) { label = text; break; }
        }
        if (label) break;
      }
      return label;
    };

    // Shared helper: derive a field_id from label text
    const labelToFieldId = (label: string): string =>
      label
        .replace(/\(.*?\)/g, "")
        .replace(/[\s*]+$/, "")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");

    const makeUniqueFieldId = (
      preferredIds: Array<string | null | undefined>
    ): string => {
      const cleaned = preferredIds
        .map((id) => id?.trim())
        .filter((id): id is string => Boolean(id));

      for (const candidate of cleaned) {
        if (!scannedFieldIds.has(candidate)) {
          return candidate;
        }
      }

      const base = cleaned[0] || nextGeneratedFieldId();
      if (!scannedFieldIds.has(base)) {
        return base;
      }

      let suffix = 2;
      let candidate = `${base}__${suffix}`;
      while (scannedFieldIds.has(candidate)) {
        suffix += 1;
        candidate = `${base}__${suffix}`;
      }

      return candidate;
    };

    for (const doc of getAccessibleDocuments()) {
      const roots = getSearchRoots(doc);

      // Query combined selector once per root and categorize into buckets.
      // This replaces 7 separate querySelectorAll calls per root.
      const allBuckets: RootBuckets[] = roots.map((root) => {
        const buckets: RootBuckets = {
          formFields: [],
          dataFieldContainers: [],
          comboboxes: [],
          contenteditables: [],
          fileInputs: [],
          checkboxButtons: [],
          radioButtons: [],
        };

        root.querySelectorAll<HTMLElement>(COMBINED_SELECTOR).forEach((el) => {
          const tag = el.tagName;
          if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
            buckets.formFields.push(el);
            if (tag === "INPUT" && (el as HTMLInputElement).type === "file") {
              buckets.fileInputs.push(el as HTMLInputElement);
            }
          }
          if (el.hasAttribute("data-field")) buckets.dataFieldContainers.push(el);
          if (el.getAttribute("role") === "combobox") buckets.comboboxes.push(el);
          if (el.getAttribute("contenteditable") === "true") buckets.contenteditables.push(el);
          if (tag === "BUTTON") {
            const role = el.getAttribute("role");
            if (role === "checkbox") buckets.checkboxButtons.push(el);
            if (role === "radio") buckets.radioButtons.push(el);
          }
        });

        return buckets;
      });

      // Pass 1: standard form fields (input, textarea, select)
      for (const buckets of allBuckets) {
        for (const el of buckets.formFields) {
          if (seenElements.has(el)) continue;
          seenElements.add(el);

          const input = el as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
          if (!isVisible(input)) continue;

          const fieldId = makeUniqueFieldId([input.getAttribute("name"), input.id]);
          pendingWrites.push({ el: input, attr: "data-dd-field-id", value: fieldId });

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
          if (!label || isGenericLabel(label)) {
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
              if (label && !isGenericLabel(label)) break;
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
          scannedFieldIds.add(fieldId);
        }
      }

      // Pass 2: scan [data-field] containers for special fields
      // (contenteditable rich text editors and clickable chip groups)
      for (const buckets of allBuckets) {
        for (const container of buckets.dataFieldContainers) {
          const fieldName = container.getAttribute("data-field");
          if (!fieldName || scannedFieldIds.has(fieldName)) continue;

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
            continue;
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
              continue;
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
                pendingWrites.push({ el: textInput, attr: "data-dd-field-id", value: fieldName });
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
            continue;
          }

          const chips = Array.from(container.querySelectorAll<HTMLElement>(".cursor-pointer"));
          if (chips.length === 0) continue;

          const options = chips
            .map((chip) => {
              const text = chip.textContent?.trim() || "";
              return { value: text, text };
            })
            .filter((o) => o.text.length > 0);
          if (options.length === 0) continue;

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
        }
      }

      // Pass 3: scan [role="combobox"] buttons (Radix UI and similar custom selects)
      for (const buckets of allBuckets) {
        for (const button of buckets.comboboxes) {
          let fieldId = button.getAttribute("name")?.trim() || "";
          let label = "";

          if (button.id) {
            const labelEl = (button.ownerDocument || document).querySelector(
              `label[for="${CSS.escape(button.id)}"]`
            );
            if (labelEl?.textContent) label = labelEl.textContent.trim();
          }
          if (!label) label = button.getAttribute("aria-label") || "";
          if (!label) label = findNearbyLabel(button);
          if (!fieldId && label) fieldId = labelToFieldId(label);

          if (!fieldId || scannedFieldIds.has(fieldId)) continue;

          pendingWrites.push({ el: button, attr: "data-dd-field-id", value: fieldId });
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
        }
      }

      // Pass 4: orphaned contenteditable editors (e.g. Tiptap/ProseMirror)
      // not inside a [data-field] container — caught by label[for] or ancestor walk.
      {
        // Cache orphan labels once — labels whose `for` doesn't match any real input.
        // Previously re-queried for every contenteditable editor.
        let orphanLabelsCache: { lbl: HTMLLabelElement; forId: string }[] | null = null;
        const getOrphanLabels = (ownerDoc: Document) => {
          if (orphanLabelsCache) return orphanLabelsCache;
          orphanLabelsCache = [];
          ownerDoc.querySelectorAll<HTMLLabelElement>("label[for]").forEach((lbl) => {
            const forId = lbl.getAttribute("for") || "";
            if (forId && !ownerDoc.getElementById(forId)) {
              orphanLabelsCache!.push({ lbl, forId });
            }
          });
          return orphanLabelsCache;
        };

        for (const buckets of allBuckets) {
          for (const editor of buckets.contenteditables) {
            // Skip if already captured by pass 2 (inside a [data-field] container)
            if (editor.closest("[data-field]")) continue;
            // Skip tiny editors (likely inline formatting, not a form field)
            const rect = editor.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0) continue;

            let label = "";
            let fieldId = "";
            const ownerDoc = editor.ownerDocument || document;

            // Check if any label[for] references a sibling/parent id that wraps this editor
            let container = editor.parentElement;
            for (let depth = 0; depth < 8 && container; depth++, container = container.parentElement) {
              if (container.id) {
                const labelEl = ownerDoc.querySelector(
                  `label[for="${CSS.escape(container.id)}"]`
                );
                if (labelEl?.textContent) {
                  label = labelEl.textContent.trim().replace(/[\s*]+$/, "").trim();
                  fieldId = container.id;
                  break;
                }
              }
            }

            // Also try orphaned labels (cached)
            if (!label) {
              for (const { lbl, forId } of getOrphanLabels(ownerDoc)) {
                // Check if this label is near the editor (within the same parent container)
                let editorAncestor = editor.parentElement;
                for (let d = 0; d < 8 && editorAncestor; d++, editorAncestor = editorAncestor.parentElement) {
                  if (editorAncestor.contains(lbl)) {
                    label = lbl.textContent?.trim().replace(/[\s*]+$/, "").trim() || "";
                    fieldId = forId;
                    break;
                  }
                }
                if (label) break;
              }
            }

            if (!label) label = findNearbyLabel(editor, 8);
            if (!fieldId && label) fieldId = labelToFieldId(label);
            if (!fieldId) fieldId = nextGeneratedFieldId();
            fieldId = makeUniqueFieldId([fieldId]);
            if (scannedFieldIds.has(fieldId)) continue;

            // Stamp data-field on the nearest wrapper so fillFormFields can locate it
            const wrapper = editor.closest("div:has(> [contenteditable])") || editor.parentElement;
            if (wrapper) pendingWrites.push({ el: wrapper, attr: "data-field", value: fieldId });

            const placeholderEl = editor.querySelector("[data-placeholder]");
            const placeholder = placeholderEl?.getAttribute("data-placeholder") || null;

            fields.push({
              field_id: fieldId,
              type: "contenteditable",
              tag: "div",
              label: label || fieldId,
              placeholder,
              required: false,
              max_length: null,
              options: null,
              pattern: null,
            });
            scannedFieldIds.add(fieldId);
          }
        }
      }

      // Pass 5: orphaned file inputs (hidden inputs not captured by pass 1 or 2)
      for (const buckets of allBuckets) {
        for (const fileInput of buckets.fileInputs) {
          if (seenElements.has(fileInput)) continue;
          // Skip if already inside a [data-field] container (handled by pass 2)
          if (fileInput.closest("[data-field]")) continue;

          let label = "";
          let fieldId = fileInput.getAttribute("name")?.trim() || fileInput.id || "";
          const ownerDoc = fileInput.ownerDocument || document;

          if (fileInput.id) {
            const labelEl = ownerDoc.querySelector(
              `label[for="${CSS.escape(fileInput.id)}"]`
            );
            if (labelEl?.textContent) label = labelEl.textContent.trim();
          }

          // Walk ancestors to find nearby label or button text ("Upload Logo", etc.)
          if (!label) {
            let ancestor = fileInput.parentElement;
            for (let depth = 0; depth < 6 && ancestor; depth++, ancestor = ancestor.parentElement) {
              // Check for a label element
              const labelEl = ancestor.querySelector("label");
              if (labelEl?.textContent) {
                label = labelEl.textContent.trim().replace(/[\s*]+$/, "").trim();
                break;
              }
              // Check for a nearby button with descriptive text (e.g. "Upload Logo")
              const btnEl = ancestor.querySelector("button");
              if (btnEl?.textContent) {
                const btnText = btnEl.textContent.trim();
                if (btnText.length < 80) { label = btnText; break; }
              }
            }
          }

          if (!label) label = findNearbyLabel(fileInput, 6);
          if (!fieldId && label) fieldId = labelToFieldId(label);
          if (!fieldId) fieldId = nextGeneratedFieldId();
          fieldId = makeUniqueFieldId([fieldId]);
          if (scannedFieldIds.has(fieldId)) continue;

          // Stamp data-field on the wrapping container that holds both the label and the file input,
          // so fillFormFields can find it via [data-field].
          let wrapper: Element | null = null;
          let anc = fileInput.parentElement;
          for (let d = 0; d < 6 && anc; d++, anc = anc.parentElement) {
            if (anc.querySelector("label") && anc.contains(fileInput)) {
              wrapper = anc;
              break;
            }
          }
          if (!wrapper) wrapper = fileInput.parentElement;
          if (wrapper) pendingWrites.push({ el: wrapper, attr: "data-field", value: fieldId });
          pendingWrites.push({ el: fileInput, attr: "data-dd-field-id", value: fieldId });

          fields.push({
            field_id: fieldId,
            type: "file-upload",
            tag: "input",
            label: label || fieldId,
            placeholder: fileInput.accept || null,
            required: false,
            max_length: null,
            options: null,
            pattern: fileInput.accept || null,
          });
          scannedFieldIds.add(fieldId);
        }
      }

      // Pass 6: Radix UI checkbox groups (button[role="checkbox"])
      // These use data-state="checked"/"unchecked" instead of native checked.
      // The hidden <input type="checkbox"> siblings fail isVisible(), so pass 1 misses them.
      {
        const processed = new Set<Element>();
        for (const buckets of allBuckets) {
          for (const btn of buckets.checkboxButtons) {
            if (processed.has(btn)) continue;

            // Walk up to find the container that holds the group label + all checkboxes
            let groupContainer: Element | null = null;
            let groupLabel = "";
            let ancestor = btn.parentElement;
            for (let depth = 0; depth < 8 && ancestor; depth++, ancestor = ancestor.parentElement) {
              const lbl = ancestor.querySelector(":scope > label");
              const checkboxes = ancestor.querySelectorAll('button[role="checkbox"]');
              if (lbl && checkboxes.length >= 2) {
                groupContainer = ancestor;
                groupLabel = lbl.textContent?.trim().replace(/[\s*]+$/, "").trim() || "";
                break;
              }
            }

            if (!groupContainer || !groupLabel) continue;

            const allCheckboxes = groupContainer.querySelectorAll<HTMLElement>('button[role="checkbox"]');
            allCheckboxes.forEach((cb) => processed.add(cb));

            let fieldId = labelToFieldId(groupLabel);
            if (!fieldId || scannedFieldIds.has(fieldId)) continue;
            fieldId = makeUniqueFieldId([fieldId]);

            // Collect options from associated labels
            const options: { value: string; text: string }[] = [];
            allCheckboxes.forEach((cb) => {
              let optLabel = "";
              if (cb.id) {
                const lblEl = (cb.ownerDocument || document).querySelector(
                  `label[for="${CSS.escape(cb.id)}"]`
                );
                if (lblEl?.textContent) optLabel = lblEl.textContent.trim();
              }
              if (!optLabel) {
                // Skip the hidden input sibling, look for the label after it
                let sibling = cb.nextElementSibling;
                if (sibling?.tagName === "INPUT") sibling = sibling.nextElementSibling;
                if (sibling?.tagName === "LABEL") optLabel = sibling.textContent?.trim() || "";
              }
              if (optLabel) options.push({ value: optLabel, text: optLabel });
            });

            pendingWrites.push({ el: groupContainer, attr: "data-field", value: fieldId });
            fields.push({
              field_id: fieldId,
              type: "checkbox-group",
              tag: "div",
              label: groupLabel,
              placeholder: null,
              required: false,
              max_length: null,
              options,
              pattern: null,
            });
            scannedFieldIds.add(fieldId);
          }
        }
      }

      // Pass 7: Radix UI radio groups (button[role="radio"] inside [role="radiogroup"] or grouped)
      {
        const processed = new Set<Element>();
        for (const buckets of allBuckets) {
          for (const btn of buckets.radioButtons) {
            if (processed.has(btn)) continue;

            // Prefer [role="radiogroup"] wrapper, otherwise walk up like checkbox groups
            let groupContainer: Element | null = btn.closest('[role="radiogroup"]');
            let groupLabel = "";

            if (groupContainer) {
              // Find label from a sibling or parent of the radiogroup
              let anc = groupContainer.parentElement;
              for (let d = 0; d < 4 && anc; d++, anc = anc.parentElement) {
                const lbl = anc.querySelector(":scope > label");
                if (lbl?.textContent) {
                  groupLabel = lbl.textContent.trim().replace(/[\s*]+$/, "").trim();
                  groupContainer = anc; // use the wider container that has the label
                  break;
                }
              }
            } else {
              let ancestor = btn.parentElement;
              for (let depth = 0; depth < 8 && ancestor; depth++, ancestor = ancestor.parentElement) {
                const lbl = ancestor.querySelector(":scope > label");
                const radios = ancestor.querySelectorAll('button[role="radio"]');
                if (lbl && radios.length >= 2) {
                  groupContainer = ancestor;
                  groupLabel = lbl.textContent?.trim().replace(/[\s*]+$/, "").trim() || "";
                  break;
                }
              }
            }

            if (!groupContainer || !groupLabel) continue;

            const allRadios = groupContainer.querySelectorAll<HTMLElement>('button[role="radio"]');
            allRadios.forEach((rb) => processed.add(rb));

            let fieldId = labelToFieldId(groupLabel);
            if (!fieldId || scannedFieldIds.has(fieldId)) continue;
            fieldId = makeUniqueFieldId([fieldId]);

            const options: { value: string; text: string }[] = [];
            allRadios.forEach((rb) => {
              let optLabel = "";
              if (rb.id) {
                const lblEl = (rb.ownerDocument || document).querySelector(
                  `label[for="${CSS.escape(rb.id)}"]`
                );
                if (lblEl?.textContent) optLabel = lblEl.textContent.trim();
              }
              if (!optLabel) {
                let sibling = rb.nextElementSibling;
                if (sibling?.tagName === "INPUT") sibling = sibling.nextElementSibling;
                if (sibling?.tagName === "LABEL") optLabel = sibling.textContent?.trim() || "";
              }
              if (optLabel) options.push({ value: optLabel, text: optLabel });
            });

            pendingWrites.push({ el: groupContainer, attr: "data-field", value: fieldId });
            fields.push({
              field_id: fieldId,
              type: "radio-group",
              tag: "div",
              label: groupLabel,
              placeholder: null,
              required: false,
              max_length: null,
              options,
              pattern: null,
            });
            scannedFieldIds.add(fieldId);
          }
        }
      }
    }

    // Flush all deferred DOM writes in one batch — avoids layout thrashing
    // from interleaving reads (getBoundingClientRect, checkVisibility) with writes.
    for (const { el, attr, value } of pendingWrites) {
      el.setAttribute(attr, value);
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
    let debounceTimer: number | null = null;
    const startedAt = Date.now();

    const finish = (result: ScannedField[]) => {
      if (observer) observer.disconnect();
      if (intervalId !== null) window.clearInterval(intervalId);
      if (debounceTimer !== null) window.clearTimeout(debounceTimer);
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

    // Debounce observer callbacks — page load can fire hundreds of mutations per second.
    // The 50ms debounce collapses bursts into a single re-scan.
    const debouncedAttempt = () => {
      if (debounceTimer !== null) window.clearTimeout(debounceTimer);
      debounceTimer = window.setTimeout(() => {
        debounceTimer = null;
        attempt();
      }, 50);
    };

    observer = new MutationObserver(debouncedAttempt);
    observer.observe(root, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "style", "hidden", "aria-hidden"],
    });
    // Fallback polling for visibility changes not triggered by DOM mutations
    // (e.g. CSS-only transitions). Reduced from 250ms to 500ms since the
    // MutationObserver handles the common case immediately via debounced callback.
    intervalId = window.setInterval(() => attempt(), 500);

    // Nudge common lazy-loaders that react to viewport/resize events.
    window.dispatchEvent(new Event("scroll"));
    window.dispatchEvent(new Event("resize"));
    attempt();
  });
}
