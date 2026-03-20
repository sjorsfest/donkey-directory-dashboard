import { useEffect } from "react";

interface SupportWidgetProps {
  accountId: string;
  email?: string;
  name?: string;
  metadata?: Record<string, any>;
  metadataToken?: string;
  widgetIsOpen?: boolean;
}

export function SupportWidget({
  accountId,
  email,
  name,
  metadata,
  metadataToken,
  widgetIsOpen,
}: SupportWidgetProps) {
  // Load the widget script once on mount
  useEffect(() => {
    (window as any).SupportWidget = {
      accountId,
      email,
      name,
      metadata,
      metadataToken,
    };

    const scriptId = "support-widget-loader";
    if (document.getElementById(scriptId)) return;

    const script = document.createElement("script");
    script.id = scriptId;
    script.src = "https://app.donkey.support/widget/loader.js";
    script.async = true;
    document.body.appendChild(script);
  }, []);

  // Imperatively open/close the widget when widgetIsOpen changes,
  // retrying until the widget script has loaded and exposed its API.
  useEffect(() => {
    if (widgetIsOpen === undefined) return;

    let attempts = 0;
    const maxAttempts = 20;

    const tryAction = () => {
      const sw = (window as any).SupportWidget;
      if (widgetIsOpen && typeof sw?.open === "function") {
        sw.open();
        return;
      }
      if (!widgetIsOpen && typeof sw?.close === "function") {
        sw.close();
        return;
      }
      if (attempts < maxAttempts) {
        attempts++;
        setTimeout(tryAction, 250);
      }
    };

    tryAction();
  }, [widgetIsOpen]);

  return null;
}
