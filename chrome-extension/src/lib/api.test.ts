import assert from "node:assert/strict";
import test from "node:test";

import {
  __clearDirectoryIdCacheForTests,
  fillForm,
  isInsufficientCreditsError,
  openCheckoutForPack,
  resolveDirectoryIdForHostname,
} from "./api";

interface MockResponse {
  status: number;
  body: unknown;
}

function makeResponse({ status, body }: MockResponse): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function installChromeMock() {
  const tabsCreateCalls: Array<{ url?: string }> = [];

  (globalThis as any).chrome = {
    storage: {
      local: {
        get: async (keys: string | string[]) => {
          if (Array.isArray(keys)) {
            return { accessToken: "test-access", refreshToken: null };
          }

          if (keys === "userEmail") {
            return { userEmail: "user@example.com" };
          }

          return {};
        },
        set: async () => {},
        remove: async () => {},
      },
    },
    tabs: {
      create: async (options: { url?: string }) => {
        tabsCreateCalls.push(options);
        return { id: 123 };
      },
    },
  };

  return { tabsCreateCalls };
}

function queueFetchResponses(responses: Response[]) {
  const fetchCalls: Array<{ url: string; init?: RequestInit }> = [];
  let index = 0;

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    fetchCalls.push({ url: String(input), init });

    const next = responses[index];
    index += 1;

    if (!next) {
      throw new Error(`Unexpected fetch call #${index} (${String(input)}).`);
    }

    return next;
  }) as typeof fetch;

  return fetchCalls;
}

const REQUEST_BASE = {
  project_id: "project_1",
  page_url: "https://directory.example.com/submit",
  page_title: "Submit Site",
  fields: [
    {
      field_id: "website",
      type: "text",
      tag: "input",
      label: "Website",
      placeholder: null,
      required: true,
      max_length: null,
      options: null,
      pattern: null,
    },
  ],
};

test("fillForm requires directory_id", async () => {
  installChromeMock();

  let fetchCalled = false;
  globalThis.fetch = (async () => {
    fetchCalled = true;
    return makeResponse({ status: 200, body: {} });
  }) as typeof fetch;

  await assert.rejects(
    fillForm({
      ...REQUEST_BASE,
      directory_id: "",
    }),
    /directory_id is required/
  );

  assert.equal(fetchCalled, false);
});

test("fillForm sends directory_id and parses billing fields", async () => {
  installChromeMock();

  const fetchCalls = queueFetchResponses([
    makeResponse({
      status: 200,
      body: {
        filled_fields: [{ field_id: "website", value: "https://acme.com" }],
        charged_now: true,
        already_charged_for_pair: false,
        credits_remaining: 29,
        lifetime_unlimited: false,
      },
    }),
  ]);

  const result = await fillForm({
    ...REQUEST_BASE,
    directory_id: "directory_123",
  });

  assert.equal(result.charged_now, true);
  assert.equal(result.already_charged_for_pair, false);
  assert.equal(result.credits_remaining, 29);
  assert.equal(result.lifetime_unlimited, false);

  const requestBody = JSON.parse(String(fetchCalls[0]?.init?.body || "{}"));
  assert.equal(requestBody.directory_id, "directory_123");
});

test("fillForm surfaces typed insufficient-credits error on 402", async () => {
  installChromeMock();

  queueFetchResponses([
    makeResponse({
      status: 402,
      body: {
        error: "insufficient_credits",
        message: "You need credits to fill this form.",
        credit_balance: 0,
        lifetime_unlimited: false,
        available_packs: [
          { pack_code: "credits_30", credits: 30, price_eur_cents: 500 },
          { pack_code: "credits_100", credits: 100, price_eur_cents: 1000 },
          { pack_code: "lifetime", credits: null, price_eur_cents: 5000 },
        ],
      },
    }),
  ]);

  await assert.rejects(fillForm({ ...REQUEST_BASE, directory_id: "directory_123" }), (error) => {
    assert.equal(isInsufficientCreditsError(error), true);

    if (!isInsufficientCreditsError(error)) {
      return false;
    }

    assert.equal(error.message, "You need credits to fill this form.");
    assert.equal(error.creditBalance, 0);
    assert.equal(error.lifetimeUnlimited, false);
    assert.equal(error.availablePacks.length, 3);
    return true;
  });
});

test("openCheckoutForPack creates session and opens checkout URL in a new tab", async () => {
  const { tabsCreateCalls } = installChromeMock();
  const fetchCalls = queueFetchResponses([
    makeResponse({
      status: 200,
      body: {
        checkout_url: "https://checkout.stripe.com/session/abc",
        session_id: "cs_test_123",
        expires_at: "2026-03-16T12:00:00Z",
      },
    }),
  ]);

  const session = await openCheckoutForPack("lifetime");

  assert.equal(session.session_id, "cs_test_123");
  assert.equal(tabsCreateCalls.length, 1);
  assert.equal(tabsCreateCalls[0]?.url, "https://checkout.stripe.com/session/abc");

  const requestBody = JSON.parse(String(fetchCalls[0]?.init?.body || "{}"));
  assert.equal(requestBody.pack_code, "lifetime");
});

test("resolveDirectoryIdForHostname caches backend lookup", async () => {
  installChromeMock();
  __clearDirectoryIdCacheForTests();

  const fetchCalls = queueFetchResponses([
    makeResponse({
      status: 200,
      body: {
        id: "directory_777",
        name: "Example Directory",
        domain: "example.com",
        description: null,
        domain_authority: null,
        quality_score: null,
        is_free: true,
        is_dofollow: true,
        submission_stage: "not_submitted",
        thumbs_up_count: 0,
        thumbs_down_count: 0,
        total_votes: 0,
        my_vote: null,
        submission_url: null,
        logo_url: null,
      },
    }),
  ]);

  const first = await resolveDirectoryIdForHostname("blog.example.com");
  const second = await resolveDirectoryIdForHostname("blog.example.com");

  assert.equal(first, "directory_777");
  assert.equal(second, "directory_777");
  assert.equal(fetchCalls.length, 1);
});
