export function isRestrictedTabUrl(url?: string): boolean {
  if (!url) return false;

  return (
    url.startsWith("chrome://") ||
    url.startsWith("chrome-extension://") ||
    url.startsWith("edge://") ||
    url.startsWith("about:") ||
    url.startsWith("devtools://") ||
    url.startsWith("view-source:")
  );
}

export async function getTargetTab(): Promise<chrome.tabs.Tab | undefined> {
  const strategies: chrome.tabs.QueryInfo[] = [
    { active: true, currentWindow: true },
    { active: true, lastFocusedWindow: true },
    { active: true },
  ];

  for (const query of strategies) {
    const tabs = await chrome.tabs.query(query);
    const usableTab = tabs.find(
      (tab) => tab.id !== undefined && !isRestrictedTabUrl(tab.url)
    );
    if (usableTab) return usableTab;
  }

  return undefined;
}

export function toHostname(value: unknown): string | null {
  if (typeof value !== "string" || value.trim().length === 0) {
    return null;
  }

  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    const hostname = value.trim().toLowerCase();
    return hostname.length > 0 ? hostname : null;
  }
}
