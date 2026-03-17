"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BILLING_PACK_DEFAULTS = void 0;
exports.formatEurCents = formatEurCents;
exports.getPackPriceEurCents = getPackPriceEurCents;
exports.formatPackPriceEUR = formatPackPriceEUR;
exports.getPackCredits = getPackCredits;
exports.getPackLabel = getPackLabel;
exports.normalizeAvailablePacks = normalizeAvailablePacks;
const BILLING_PACK_ORDER = ["credits_30", "credits_100", "lifetime"];
exports.BILLING_PACK_DEFAULTS = {
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
function isKnownPackCode(value) {
    return value === "credits_30" || value === "credits_100" || value === "lifetime";
}
function asPositiveNumber(value) {
    if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
        return null;
    }
    return value;
}
function formatEurCents(cents) {
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
function getPackPriceEurCents(pack) {
    const fromCents = asPositiveNumber(pack.price_eur_cents);
    if (fromCents !== null) {
        return Math.round(fromCents);
    }
    const fromEuroUnits = asPositiveNumber(pack.price_eur);
    if (fromEuroUnits !== null) {
        return Math.round(fromEuroUnits * 100);
    }
    return exports.BILLING_PACK_DEFAULTS[pack.pack_code].priceEurCents;
}
function formatPackPriceEUR(pack) {
    return formatEurCents(getPackPriceEurCents(pack));
}
function getPackCredits(pack) {
    if (pack.credits === null) {
        return null;
    }
    if (typeof pack.credits === "number" && Number.isFinite(pack.credits) && pack.credits > 0) {
        return pack.credits;
    }
    return exports.BILLING_PACK_DEFAULTS[pack.pack_code].credits;
}
function getPackLabel(pack) {
    const customLabel = typeof pack.label === "string" && pack.label.trim().length > 0
        ? pack.label.trim()
        : null;
    return customLabel || exports.BILLING_PACK_DEFAULTS[pack.pack_code].label;
}
function normalizeAvailablePacks(packs) {
    const normalized = new Map();
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
                credits: exports.BILLING_PACK_DEFAULTS[packCode].credits,
                price_eur_cents: exports.BILLING_PACK_DEFAULTS[packCode].priceEurCents,
                label: exports.BILLING_PACK_DEFAULTS[packCode].label,
            });
        }
    }
    return BILLING_PACK_ORDER.map((packCode) => {
        const pack = normalized.get(packCode);
        return {
            ...pack,
            credits: getPackCredits(pack),
        };
    });
}
