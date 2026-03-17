import assert from "node:assert/strict";
import test from "node:test";

import { formatPackPriceEUR, normalizeAvailablePacks } from "./billing";

test("renders default pack prices in EUR including lifetime at €50", () => {
  const packs = normalizeAvailablePacks([]);

  const credits30 = packs.find((pack) => pack.pack_code === "credits_30");
  const credits100 = packs.find((pack) => pack.pack_code === "credits_100");
  const lifetime = packs.find((pack) => pack.pack_code === "lifetime");

  assert.ok(credits30);
  assert.ok(credits100);
  assert.ok(lifetime);

  assert.equal(formatPackPriceEUR(credits30), "€5");
  assert.equal(formatPackPriceEUR(credits100), "€10");
  assert.equal(formatPackPriceEUR(lifetime), "€50");
});

test("uses backend EUR cents when present", () => {
  const packs = normalizeAvailablePacks([
    {
      pack_code: "credits_30",
      credits: 30,
      price_eur_cents: 650,
    },
  ]);

  const credits30 = packs.find((pack) => pack.pack_code === "credits_30");
  assert.ok(credits30);
  assert.equal(formatPackPriceEUR(credits30), "€6.50");
});
