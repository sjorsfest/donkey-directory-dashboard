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
    // This function runs once per frame via chrome.scripting.executeScript(allFrames: true),
    // so each injection only needs to operate on its own document.
    return [document];
  };

  // Cache shadow root discovery — roots don't change during fill, so we compute once.
  const rootsCache = new Map<Document, Array<Document | ShadowRoot>>();

  // Use TreeWalker instead of querySelectorAll("*") — avoids allocating a large NodeList.
  const getSearchRoots = (doc: Document): Array<Document | ShadowRoot> => {
    const cached = rootsCache.get(doc);
    if (cached) return cached;

    const roots: Array<Document | ShadowRoot> = [doc];
    const queue: Array<Document | ShadowRoot> = [doc];
    const seen = new Set<Document | ShadowRoot>([doc]);

    while (queue.length > 0) {
      const root = queue.shift()!;
      const walker = doc.createTreeWalker(root as unknown as Node, NodeFilter.SHOW_ELEMENT);
      let node: Node | null = walker.nextNode();
      while (node !== null) {
        const el = node as HTMLElement;
        if (el.shadowRoot && !seen.has(el.shadowRoot)) {
          seen.add(el.shadowRoot);
          roots.push(el.shadowRoot);
          queue.push(el.shadowRoot);
        }
        node = walker.nextNode();
      }
    }

    rootsCache.set(doc, roots);
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

  // Pre-build O(1) lookup maps from attributes set during scanning.
  // Replaces repeated queryFirst()/querySelectorAll() calls in the hot path —
  // findElementForField was previously called once per field and triggered
  // a full DOM scan each time via queryFirst and queryAllFields.
  const byDataId = new Map<string, HTMLElement>();
  const byDataField = new Map<string, HTMLElement>();
  const byId = new Map<string, HTMLElement>();
  const byName = new Map<string, HTMLElement>();

  for (const doc of getAccessibleDocuments()) {
    for (const root of getSearchRoots(doc)) {
      root.querySelectorAll("input, textarea, select, [role='combobox']").forEach((el) => {
        const htmlEl = el as HTMLElement;
        const dataId = htmlEl.getAttribute("data-dd-field-id");
        if (dataId) byDataId.set(dataId, htmlEl);
        if (htmlEl.id) byId.set(htmlEl.id, htmlEl);
        const name = htmlEl.getAttribute("name");
        if (name) byName.set(name, htmlEl);
      });
      root.querySelectorAll<HTMLElement>("[data-field]").forEach((el) => {
        const name = el.getAttribute("data-field");
        if (name) byDataField.set(name, el);
      });
    }
  }

  const findElementForField = (fieldId: string): HTMLElement | null => {
    // Fast path: O(1) map lookup by data-dd-field-id (stamped during scanning)
    const fromDataId = byDataId.get(fieldId);
    if (fromDataId) return fromDataId;

    // Fast path: O(1) lookup by id or name variants
    const variants = buildFieldVariants(fieldId);
    for (const variant of variants) {
      const fromId = byId.get(variant) || byName.get(variant);
      if (fromId) return fromId;
    }

    // Slow path: full DOM scan with fuzzy matching.
    // Only reached when the backend returned a field_id that doesn't exactly match
    // any scanned attribute — relatively rare.
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
        // Invalidate root cache so newly added shadow roots are discovered
        rootsCache.clear();
        // Extend lookup maps with any elements that appeared after initial build
        for (const doc of getAccessibleDocuments()) {
          for (const r of getSearchRoots(doc)) {
            r.querySelectorAll("input, textarea, select, [role='combobox']").forEach((el) => {
              const htmlEl = el as HTMLElement;
              const dataId = htmlEl.getAttribute("data-dd-field-id");
              if (dataId && !byDataId.has(dataId)) byDataId.set(dataId, htmlEl);
              if (htmlEl.id && !byId.has(htmlEl.id)) byId.set(htmlEl.id, htmlEl);
              const name = htmlEl.getAttribute("name");
              if (name && !byName.has(name)) byName.set(name, htmlEl);
            });
          }
        }
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

  // Fill a contenteditable editor (Tiptap/ProseMirror) via execCommand
  const fillContentEditable = (container: Element, value: string): boolean => {
    const editor = container.querySelector('[contenteditable="true"]') as HTMLElement | null;
    if (!editor) return false;
    editor.focus();
    const ownerDoc = editor.ownerDocument;
    ownerDoc.execCommand("selectAll", false, "");
    ownerDoc.execCommand("insertText", false, value);
    return true;
  };

  // Fill clickable chip groups by clicking chips whose text matches the value(s)
  const fillClickableChips = (container: Element, value: string | string[]): boolean => {
    const rawValues = Array.isArray(value)
      ? (value as string[])
      : String(value).split(",");
    const targets = rawValues.map((v) => normalize(String(v).trim())).filter(Boolean);
    if (targets.length === 0) return false;

    let clickedCount = 0;
    container.querySelectorAll<HTMLElement>(".cursor-pointer").forEach((chip) => {
      const chipNorm = normalize(chip.textContent?.trim() || "");
      if (targets.some((t) => chipNorm === t)) {
        chip.click();
        clickedCount++;
      }
    });
    return clickedCount > 0;
  };

  // Fill a Radix UI / custom combobox: click to open, wait for popup, click matching options
  const fillCombobox = async (button: HTMLElement, value: string | string[]): Promise<boolean> => {
    const rawValues = Array.isArray(value) ? (value as string[]) : String(value).split(",");
    const targets = rawValues.map((v) => normalize(String(v).trim())).filter(Boolean);
    if (targets.length === 0) return false;

    button.click();

    const controlsId = button.getAttribute("aria-controls");
    const popup = await new Promise<HTMLElement | null>((resolve) => {
      let resolved = false;
      const finish = (el: HTMLElement | null) => {
        if (resolved) return;
        resolved = true;
        clearTimeout(timeoutId);
        clearInterval(intervalId);
        obs.disconnect();
        resolve(el);
      };

      const check = (): HTMLElement | null => {
        if (controlsId) {
          const el = document.getElementById(controlsId);
          // Only return the element if it's actually visible (not toggled via hidden class)
          if (el && !el.classList.contains("hidden") && el.style.display !== "none") return el as HTMLElement;
        }
        return document.querySelector<HTMLElement>(
          '[role="dialog"][data-state="open"], [role="listbox"][data-state="open"]'
        );
      };

      const obs = new MutationObserver(() => {
        const found = check();
        if (found) finish(found);
      });
      obs.observe(document.body || document.documentElement, { childList: true, subtree: true });
      const intervalId = setInterval(() => {
        const found = check();
        if (found) finish(found);
      }, 100);
      const timeoutId = setTimeout(() => finish(null), 3000);

      const immediate = check();
      if (immediate) finish(immediate);
    });

    if (!popup) return false;

    let clickedCount = 0;
    const optionSelectors = '[role="option"], [role="menuitemcheckbox"], [role="menuitem"], [data-radix-collection-item]';
    popup.querySelectorAll<HTMLElement>(optionSelectors).forEach((opt) => {
      const optNorm = normalize(opt.textContent?.trim() || "");
      if (targets.some((t) => optNorm === t || optNorm.includes(t) || t.includes(optNorm))) {
        opt.click();
        clickedCount++;
      }
    });

    if (clickedCount === 0) {
      popup.querySelectorAll<HTMLElement>(".cursor-pointer").forEach((opt) => {
        const optNorm = normalize(opt.textContent?.trim() || "");
        if (targets.some((t) => optNorm === t)) {
          opt.click();
          clickedCount++;
        }
      });
    }

    if (button.getAttribute("aria-expanded") === "true") {
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", code: "Escape", keyCode: 27, which: 27, bubbles: true })
      );
    }

    return clickedCount > 0;
  };

  let filled = 0;
  let skipped = 0;
  const outcomes: Record<string, "filled" | "not_filled"> = {};
  const deadline = Date.now() + timeoutMs;

  for (const { field_id, value } of filledFields) {
    try {
      // Handle special [data-field] containers before standard input lookup.
      // Use pre-built map (O(1)) instead of queryFirst (full DOM scan).
      const dataContainer = byDataField.get(field_id) ?? queryFirst(`[data-field="${CSS.escape(field_id)}"]`);
      if (dataContainer) {
        const editor = dataContainer.querySelector('[contenteditable="true"]');
        if (editor) {
          if (value == null || value === "") { outcomes[field_id] = "not_filled"; skipped++; continue; }
          if (fillContentEditable(dataContainer, String(value))) { outcomes[field_id] = "filled"; filled++; }
          else { outcomes[field_id] = "not_filled"; skipped++; }
          continue;
        }

        // Check for file upload
        const fileInput = dataContainer.querySelector<HTMLInputElement>("input[type=file]");
        if (fileInput) {
          const url = value == null ? "" : String(value).trim();
          if (!url.startsWith("http://") && !url.startsWith("https://")) {
            outcomes[field_id] = "not_filled";
            skipped++;
            continue;
          }
          try {
            const response = await fetch(url);
            if (!response.ok) { outcomes[field_id] = "not_filled"; skipped++; continue; }
            const blob = await response.blob();
            const filename = new URL(url).pathname.split("/").pop() || "upload";
            const file = new File([blob], filename, {
              type: blob.type || "application/octet-stream",
            });
            const dt = new DataTransfer();
            dt.items.add(file);
            fileInput.files = dt.files;
            fileInput.dispatchEvent(new Event("change", { bubbles: true }));
            fileInput.dispatchEvent(new Event("input", { bubbles: true }));
            outcomes[field_id] = "filled";
            filled++;
          } catch {
            outcomes[field_id] = "not_filled";
            skipped++;
          }
          continue;
        }

        // Check for tag input (text input where Enter commits each tag)
        const tagInputEl = dataContainer.querySelector<HTMLInputElement>(
          "input[type=text], input:not([type])"
        );
        const containerLabel = dataContainer.querySelector("label")?.textContent || "";
        const isTagInput =
          tagInputEl &&
          (/tag/i.test(tagInputEl.placeholder || "") ||
            /add/i.test(tagInputEl.placeholder || "") ||
            /tag/i.test(containerLabel));
        if (isTagInput && tagInputEl) {
          if (value == null || value === "") { outcomes[field_id] = "not_filled"; skipped++; continue; }
          const tags = Array.isArray(value)
            ? (value as string[]).map((t) => String(t).trim()).filter(Boolean)
            : String(value).split(",").map((t) => t.trim()).filter(Boolean);
          const nativeSetter = Object.getOwnPropertyDescriptor(
            window.HTMLInputElement.prototype,
            "value"
          )?.set;
          let added = 0;
          for (const tag of tags) {
            if (nativeSetter) nativeSetter.call(tagInputEl, tag);
            else tagInputEl.value = tag;
            tagInputEl.dispatchEvent(new Event("input", { bubbles: true }));
            tagInputEl.dispatchEvent(
              new KeyboardEvent("keydown", { key: "Enter", code: "Enter", keyCode: 13, which: 13, bubbles: true })
            );
            tagInputEl.dispatchEvent(
              new KeyboardEvent("keypress", { key: "Enter", code: "Enter", keyCode: 13, which: 13, bubbles: true })
            );
            tagInputEl.dispatchEvent(
              new KeyboardEvent("keyup", { key: "Enter", code: "Enter", keyCode: 13, which: 13, bubbles: true })
            );
            added++;
          }
          if (added > 0) { outcomes[field_id] = "filled"; filled++; }
          else { outcomes[field_id] = "not_filled"; skipped++; }
          continue;
        }

        const hasInput = dataContainer.querySelector(
          "input:not([type=hidden]):not([type=file]), textarea, select"
        );
        if (!hasInput) {
          if (value == null || value === "") { outcomes[field_id] = "not_filled"; skipped++; continue; }
          if (fillClickableChips(dataContainer, value as string | string[])) { outcomes[field_id] = "filled"; filled++; }
          else { outcomes[field_id] = "not_filled"; skipped++; }
          continue;
        }
      }

      let el = findElementForField(field_id);
      const remainingWaitMs = Math.max(0, deadline - Date.now());
      if (!el && remainingWaitMs > 0) {
        el = await waitForElementForField(field_id, remainingWaitMs);
      }

      if (!el || value == null || value === "") {
        outcomes[field_id] = "not_filled";
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
          outcomes[field_id] = "filled";
          filled++;
        } else {
          outcomes[field_id] = "not_filled";
          skipped++;
          continue;
        }
      } else if ((el as HTMLInputElement).type === "checkbox") {
        (el as HTMLInputElement).checked =
          value === true || value === "true" || value === "1";
        outcomes[field_id] = "filled";
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
        if (matched) { outcomes[field_id] = "filled"; filled++; }
        else { outcomes[field_id] = "not_filled"; skipped++; }
        continue;
      } else if (el.tagName === "INPUT" && (el as HTMLInputElement).type === "file") {
        const url = String(value).trim();
        if (!url.startsWith("http://") && !url.startsWith("https://")) {
          outcomes[field_id] = "not_filled";
          skipped++;
          continue;
        }
        try {
          const response = await fetch(url);
          if (!response.ok) { outcomes[field_id] = "not_filled"; skipped++; continue; }
          const blob = await response.blob();
          const filename = new URL(url).pathname.split("/").pop() || "upload";
          const file = new File([blob], filename, { type: blob.type || "application/octet-stream" });
          const dt = new DataTransfer();
          dt.items.add(file);
          (el as HTMLInputElement).files = dt.files;
          el.dispatchEvent(new Event("change", { bubbles: true }));
          el.dispatchEvent(new Event("input", { bubbles: true }));
          outcomes[field_id] = "filled";
          filled++;
        } catch {
          outcomes[field_id] = "not_filled";
          skipped++;
        }
        continue;
      } else if (el.getAttribute("role") === "combobox") {
        const ok = await fillCombobox(el, value as string | string[]);
        if (ok) { outcomes[field_id] = "filled"; filled++; }
        else { outcomes[field_id] = "not_filled"; skipped++; }
        continue;
      } else {
        (el as HTMLInputElement | HTMLTextAreaElement).value = String(value);
        outcomes[field_id] = "filled";
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
      outcomes[field_id] = "not_filled";
      skipped++;
    }
  }

  return { filled, skipped, outcomes };
}
