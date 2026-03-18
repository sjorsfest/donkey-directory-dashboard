import { useEffect } from "react";

interface SupportWidgetProps {
  accountId: string;
  email?: string;
  name?: string;
  metadata?: Record<string, any>;
  metadataToken?: string;
  controlledByHost?: boolean;
  widgetIsOpen?: boolean;
}

export function SupportWidget({
  accountId,
  email,
  name,
  metadata,
  metadataToken,
  controlledByHost,
  widgetIsOpen,
}: SupportWidgetProps) {
  useEffect(() => {
    if (controlledByHost && (window as any).SupportWidget) {
      (window as any).SupportWidget.widgetIsOpen = widgetIsOpen;
    }
  }, [controlledByHost, widgetIsOpen]);

  useEffect(() => {
    (window as any).SupportWidget = {
      accountId,
      email,
      name,
      metadata,
      metadataToken,
      controlledByHost,
      widgetIsOpen,
    };

    const scriptId = "support-widget-loader";
    if (document.getElementById(scriptId)) return;

    const script = document.createElement("script");
    script.id = scriptId;
    script.src = "https://app.donkey.support/widget/loader.js";
    script.async = true;
    document.body.appendChild(script);
  }, [accountId, email, name, metadata, metadataToken, controlledByHost, widgetIsOpen]);

  return null;
}
