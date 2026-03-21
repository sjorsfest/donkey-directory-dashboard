const DEFAULT_MAIN_DOMAIN = "donkey.directory";

function normalizeDomain(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const candidate = /^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  try {
    const url = new URL(candidate);
    return url.hostname.toLowerCase();
  } catch {
    return null;
  }
}

const configuredMainDomain = normalizeDomain(import.meta.env.VITE_MAIN_DOMAIN);

export const MAIN_DOMAIN = configuredMainDomain ?? DEFAULT_MAIN_DOMAIN;
export const MAIN_ORIGIN = `https://www.${MAIN_DOMAIN}`;
