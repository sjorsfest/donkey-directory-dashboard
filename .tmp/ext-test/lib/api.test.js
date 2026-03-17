"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const node_test_1 = __importDefault(require("node:test"));
const api_1 = require("./api");
function makeResponse({ status, body }) {
    return new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
    });
}
function installChromeMock() {
    const tabsCreateCalls = [];
    globalThis.chrome = {
        storage: {
            local: {
                get: async (keys) => {
                    if (Array.isArray(keys)) {
                        return { accessToken: "test-access", refreshToken: null };
                    }
                    if (keys === "userEmail") {
                        return { userEmail: "user@example.com" };
                    }
                    return {};
                },
                set: async () => { },
                remove: async () => { },
            },
        },
        tabs: {
            create: async (options) => {
                tabsCreateCalls.push(options);
                return { id: 123 };
            },
        },
    };
    return { tabsCreateCalls };
}
function queueFetchResponses(responses) {
    const fetchCalls = [];
    let index = 0;
    globalThis.fetch = (async (input, init) => {
        fetchCalls.push({ url: String(input), init });
        const next = responses[index];
        index += 1;
        if (!next) {
            throw new Error(`Unexpected fetch call #${index} (${String(input)}).`);
        }
        return next;
    });
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
(0, node_test_1.default)("fillForm requires directory_id", async () => {
    installChromeMock();
    let fetchCalled = false;
    globalThis.fetch = (async () => {
        fetchCalled = true;
        return makeResponse({ status: 200, body: {} });
    });
    await strict_1.default.rejects((0, api_1.fillForm)({
        ...REQUEST_BASE,
        directory_id: "",
    }), /directory_id is required/);
    strict_1.default.equal(fetchCalled, false);
});
(0, node_test_1.default)("fillForm sends directory_id and parses billing fields", async () => {
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
    const result = await (0, api_1.fillForm)({
        ...REQUEST_BASE,
        directory_id: "directory_123",
    });
    strict_1.default.equal(result.charged_now, true);
    strict_1.default.equal(result.already_charged_for_pair, false);
    strict_1.default.equal(result.credits_remaining, 29);
    strict_1.default.equal(result.lifetime_unlimited, false);
    const requestBody = JSON.parse(String(fetchCalls[0]?.init?.body || "{}"));
    strict_1.default.equal(requestBody.directory_id, "directory_123");
});
(0, node_test_1.default)("fillForm surfaces typed insufficient-credits error on 402", async () => {
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
    await strict_1.default.rejects((0, api_1.fillForm)({ ...REQUEST_BASE, directory_id: "directory_123" }), (error) => {
        strict_1.default.equal((0, api_1.isInsufficientCreditsError)(error), true);
        if (!(0, api_1.isInsufficientCreditsError)(error)) {
            return false;
        }
        strict_1.default.equal(error.message, "You need credits to fill this form.");
        strict_1.default.equal(error.creditBalance, 0);
        strict_1.default.equal(error.lifetimeUnlimited, false);
        strict_1.default.equal(error.availablePacks.length, 3);
        return true;
    });
});
(0, node_test_1.default)("openCheckoutForPack creates session and opens checkout URL in a new tab", async () => {
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
    const session = await (0, api_1.openCheckoutForPack)("lifetime");
    strict_1.default.equal(session.session_id, "cs_test_123");
    strict_1.default.equal(tabsCreateCalls.length, 1);
    strict_1.default.equal(tabsCreateCalls[0]?.url, "https://checkout.stripe.com/session/abc");
    const requestBody = JSON.parse(String(fetchCalls[0]?.init?.body || "{}"));
    strict_1.default.equal(requestBody.pack_code, "lifetime");
});
(0, node_test_1.default)("resolveDirectoryIdForHostname caches backend lookup", async () => {
    installChromeMock();
    (0, api_1.__clearDirectoryIdCacheForTests)();
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
    const first = await (0, api_1.resolveDirectoryIdForHostname)("blog.example.com");
    const second = await (0, api_1.resolveDirectoryIdForHostname)("blog.example.com");
    strict_1.default.equal(first, "directory_777");
    strict_1.default.equal(second, "directory_777");
    strict_1.default.equal(fetchCalls.length, 1);
});
