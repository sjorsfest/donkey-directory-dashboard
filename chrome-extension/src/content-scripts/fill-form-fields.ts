import type { FilledField, FillResult } from "../types";

/**
 * Injected into the active tab via chrome.scripting.executeScript.
 * Must be completely self-contained (no imports used at runtime).
 */
export function fillFormFields(filledFields: FilledField[]): FillResult {
  let filled = 0;
  let skipped = 0;

  filledFields.forEach(({ field_id, value }) => {
    const el = document.querySelector(
      `[data-dd-field-id="${CSS.escape(field_id)}"]`
    ) as HTMLElement | null;

    if (!el || value == null || value === "") {
      skipped++;
      return;
    }

    if (el.tagName === "SELECT") {
      const select = el as HTMLSelectElement;
      const match = Array.from(select.options).find(
        (o) =>
          o.value === value ||
          o.textContent!.trim().toLowerCase() ===
            String(value).toLowerCase()
      );
      if (match) {
        select.value = match.value;
        filled++;
      } else {
        skipped++;
        return;
      }
    } else if ((el as HTMLInputElement).type === "checkbox") {
      (el as HTMLInputElement).checked =
        value === true || value === "true" || value === "1";
      filled++;
    } else if ((el as HTMLInputElement).type === "radio") {
      const radios = document.querySelectorAll(
        `input[name="${CSS.escape((el as HTMLInputElement).name)}"]`
      );
      let matched = false;
      radios.forEach((r) => {
        const radio = r as HTMLInputElement;
        if (radio.value === value) {
          radio.checked = true;
          radio.dispatchEvent(new Event("input", { bubbles: true }));
          radio.dispatchEvent(new Event("change", { bubbles: true }));
          matched = true;
        }
      });
      if (matched) filled++;
      else skipped++;
      return;
    } else {
      (el as HTMLInputElement).value = String(value);
      filled++;
    }

    // Dispatch events for framework reactivity
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));

    // React 16+ native input value setter trick
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      "value"
    )?.set;
    if (
      nativeInputValueSetter &&
      (el.tagName === "INPUT" || el.tagName === "TEXTAREA")
    ) {
      nativeInputValueSetter.call(el, (el as HTMLInputElement).value);
      el.dispatchEvent(new Event("input", { bubbles: true }));
    }
  });

  return { filled, skipped };
}
