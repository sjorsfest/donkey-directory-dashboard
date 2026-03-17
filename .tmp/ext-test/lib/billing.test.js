"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = __importDefault(require("node:test"));
const billing_1 = require("./billing");
(0, node_test_1.default)("renders default pack prices in EUR including lifetime at €50", () => {
    const packs = (0, billing_1.normalizeAvailablePacks)([]);
    const credits30 = packs.find((pack) => pack.pack_code === "credits_30");
    const credits100 = packs.find((pack) => pack.pack_code === "credits_100");
    const lifetime = packs.find((pack) => pack.pack_code === "lifetime");
    strict_1.default.ok(credits30);
    strict_1.default.ok(credits100);
    strict_1.default.ok(lifetime);
    strict_1.default.equal((0, billing_1.formatPackPriceEUR)(credits30), "€5");
    strict_1.default.equal((0, billing_1.formatPackPriceEUR)(credits100), "€10");
    strict_1.default.equal((0, billing_1.formatPackPriceEUR)(lifetime), "€50");
});
(0, node_test_1.default)("uses backend EUR cents when present", () => {
    const packs = (0, billing_1.normalizeAvailablePacks)([
        {
            pack_code: "credits_30",
            credits: 30,
            price_eur_cents: 650,
        },
    ]);
    const credits30 = packs.find((pack) => pack.pack_code === "credits_30");
    strict_1.default.ok(credits30);
    strict_1.default.equal((0, billing_1.formatPackPriceEUR)(credits30), "€6.50");
});
