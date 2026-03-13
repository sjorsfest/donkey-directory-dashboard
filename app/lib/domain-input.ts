type DomainInputResult =
  | {
      ok: true;
      domain: string;
      normalizedUrl: string;
    }
  | {
      ok: false;
      error: string;
    };

const DOMAIN_LABEL_REGEX = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i;

export function normalizeDomainInput(rawValue: string): DomainInputResult {
  const trimmed = rawValue.trim();

  if (!trimmed) {
    return {
      ok: false,
      error: "Domain URL is required.",
    };
  }

  const withProtocol = /^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(trimmed)
    ? trimmed
    : `http://${trimmed}`;

  let parsed: URL;
  try {
    parsed = new URL(withProtocol);
  } catch {
    return {
      ok: false,
      error: "Enter a valid domain URL (for example example.com or https://example.com).",
    };
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return {
      ok: false,
      error: "Only http:// and https:// URLs are supported.",
    };
  }

  const normalizedDomain = parsed.hostname.toLowerCase().replace(/^www\./, "").replace(/\.$/, "");

  if (!isValidDomainHostname(normalizedDomain)) {
    return {
      ok: false,
      error: "Enter a valid domain (for example example.com).",
    };
  }

  return {
    ok: true,
    domain: normalizedDomain,
    normalizedUrl: `${parsed.protocol}//${normalizedDomain}`,
  };
}

function isValidDomainHostname(hostname: string): boolean {
  if (!hostname || hostname.length > 253 || !hostname.includes(".")) {
    return false;
  }

  const labels = hostname.split(".");
  if (labels.length < 2) {
    return false;
  }

  if (!labels.every((label) => DOMAIN_LABEL_REGEX.test(label))) {
    return false;
  }

  const tld = labels[labels.length - 1];
  if (!/[a-z]/i.test(tld)) {
    return false;
  }

  return true;
}
