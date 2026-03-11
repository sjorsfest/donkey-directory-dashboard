import type { ScannedField } from "../types";

/**
 * Injected into the active tab via chrome.scripting.executeScript.
 * Must be completely self-contained (no imports used at runtime).
 */
export function scanFormFields(): ScannedField[] {
  const SKIP_TYPES = new Set([
    "hidden",
    "submit",
    "button",
    "image",
    "reset",
    "file",
  ]);
  const elements = document.querySelectorAll("input, textarea, select");
  const fields: ScannedField[] = [];
  let generatedIndex = 0;

  elements.forEach((el) => {
    const input = el as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
    if (SKIP_TYPES.has(input.type)) return;
    if (input.offsetParent === null && input.type !== "hidden") return;

    const fieldId = input.id || input.name || `dd-field-${generatedIndex++}`;
    input.setAttribute("data-dd-field-id", fieldId);

    let label = "";
    if (input.id) {
      const labelEl = document.querySelector(
        `label[for="${CSS.escape(input.id)}"]`
      );
      if (labelEl) label = labelEl.textContent!.trim();
    }
    if (!label && input.closest("label")) {
      const clone = input.closest("label")!.cloneNode(true) as HTMLElement;
      clone
        .querySelectorAll("input, textarea, select")
        .forEach((c) => c.remove());
      label = clone.textContent!.trim();
    }
    if (!label) label = input.getAttribute("aria-label") || "";
    if (!label && "placeholder" in input) label = input.placeholder || "";

    let options: { value: string; text: string }[] | null = null;
    if (input.tagName === "SELECT") {
      const select = input as HTMLSelectElement;
      options = Array.from(select.options).map((o) => ({
        value: o.value,
        text: o.textContent!.trim(),
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

  return fields;
}
