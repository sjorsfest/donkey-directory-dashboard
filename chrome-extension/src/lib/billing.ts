import type { BillingPack, BillingPackCode } from "../types";

const BILLING_PACK_ORDER: BillingPackCode[] = ["credits_30", "credits_100", "lifetime"];

export const BILLING_PACK_DEFAULTS: Record<
  BillingPackCode,
  { credits: number | null; priceEurCents: number; label: string }
> = {
  credits_30: {
    credits: 30,
    priceEurCents: 500,
    label: "30 credits",
  },
  credits_100: {
    credits: 100,
    priceEurCents: 1000,
    label: "100 credits",
  },
  lifetime: {
    credits: null,
    priceEurCents: 5000,
    label: "Lifetime unlimited",
  },
};

function isKnownPackCode(value: unknown): value is BillingPackCode {
  return value === "credits_30" || value === "credits_100" || value === "lifetime";
}

function asPositiveNumber(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return null;
  }

  return value;
}

export function formatEurCents(cents: number): string {
  if (!Number.isFinite(cents)) {
    return "€0";
  }

  const normalized = Math.round(cents);
  const wholeEuros = normalized / 100;
  if (normalized % 100 === 0) {
    return `€${wholeEuros.toFixed(0)}`;
  }

  return `€${wholeEuros.toFixed(2)}`;
}

export function getPackPriceEurCents(pack: BillingPack): number {
  const fromCents = asPositiveNumber(pack.price_eur_cents);
  if (fromCents !== null) {
    return Math.round(fromCents);
  }

  const fromEuroUnits = asPositiveNumber(pack.price_eur);
  if (fromEuroUnits !== null) {
    return Math.round(fromEuroUnits * 100);
  }

  return BILLING_PACK_DEFAULTS[pack.pack_code].priceEurCents;
}

export function formatPackPriceEUR(pack: BillingPack): string {
  return formatEurCents(getPackPriceEurCents(pack));
}

export function getPackCredits(pack: BillingPack): number | null {
  if (pack.credits === null) {
    return null;
  }

  if (typeof pack.credits === "number" && Number.isFinite(pack.credits) && pack.credits > 0) {
    return pack.credits;
  }

  return BILLING_PACK_DEFAULTS[pack.pack_code].credits;
}

export function getPackLabel(pack: BillingPack): string {
  const customLabel =
    typeof pack.label === "string" && pack.label.trim().length > 0
      ? pack.label.trim()
      : null;

  return customLabel || BILLING_PACK_DEFAULTS[pack.pack_code].label;
}

export function normalizeAvailablePacks(packs: BillingPack[] | null | undefined): BillingPack[] {
  const normalized = new Map<BillingPackCode, BillingPack>();

  for (const pack of packs || []) {
    if (!isKnownPackCode(pack?.pack_code)) {
      continue;
    }

    normalized.set(pack.pack_code, {
      ...pack,
      pack_code: pack.pack_code,
      credits: getPackCredits(pack),
    });
  }

  for (const packCode of BILLING_PACK_ORDER) {
    if (!normalized.has(packCode)) {
      normalized.set(packCode, {
        pack_code: packCode,
        credits: BILLING_PACK_DEFAULTS[packCode].credits,
        price_eur_cents: BILLING_PACK_DEFAULTS[packCode].priceEurCents,
        label: BILLING_PACK_DEFAULTS[packCode].label,
      });
    }
  }

  return BILLING_PACK_ORDER.map((packCode) => {
    const pack = normalized.get(packCode)!;
    return {
      ...pack,
      credits: getPackCredits(pack),
    };
  });
}
