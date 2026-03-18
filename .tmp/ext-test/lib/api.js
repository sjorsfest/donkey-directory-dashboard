"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InsufficientCreditsError = exports.CONNECT_EXTENSION_URL = exports.WEB_APP_ORIGIN = void 0;
exports.isInsufficientCreditsError = isInsufficientCreditsError;
exports.fetchWithAuth = fetchWithAuth;
exports.parseErrorMessage = parseErrorMessage;
exports.login = login;
exports.connectWithCode = connectWithCode;
exports.fetchUserInfo = fetchUserInfo;
exports.loadProjects = loadProjects;
exports.getCredits = getCredits;
exports.createCheckoutSession = createCheckoutSession;
exports.openCheckoutForPack = openCheckoutForPack;
exports.fillForm = fillForm;
exports.findDirectoryByHostname = findDirectoryByHostname;
exports.voteDirectory = voteDirectory;
exports.fetchDirectoryByDomain = fetchDirectoryByDomain;
exports.resolveDirectoryIdForHostname = resolveDirectoryIdForHostname;
exports.__clearDirectoryIdCacheForTests = __clearDirectoryIdCacheForTests;
exports.fetchRandomDirectory = fetchRandomDirectory;
const storage_1 = require("./storage");
const billing_1 = require("./billing");
const API_BASE_URL = "http://127.0.0.1:8000";
exports.WEB_APP_ORIGIN = "http://localhost:5173";
exports.CONNECT_EXTENSION_URL = `${exports.WEB_APP_ORIGIN}/connect-extension`;
const API_ROUTES = {
    login: "/api/v1/auth/login",
    refresh: "/api/v1/auth/refresh",
    me: "/api/v1/auth/me",
    exchangeConnectCode: "/api/v1/auth/extension/connect-codes/exchange",
    projects: "/api/v1/brand/projects",
    fillForm: "/api/v1/brand/fill-form",
    billingCredits: "/api/v1/billing/credits",
    billingCheckoutSession: "/api/v1/billing/checkout-session",
    billingSubmissions: "/api/v1/billing/submissions",
    directories: "/api/v1/directories/",
    directoriesByDomain: "/api/v1/directories/by-domain",
    directoriesRandom: "/api/v1/directories/random",
};
const COMMON_SECOND_LEVEL_TLDS = new Set([
    "ac",
    "co",
    "com",
    "edu",
    "gov",
    "net",
    "org",
]);
const directoryIdByHostnameCache = new Map();
function isBillingPackCode(value) {
    return value === "credits_30" || value === "credits_100" || value === "lifetime";
}
function isBillingPack(value) {
    if (!isRecord(value)) {
        return false;
    }
    if (!isBillingPackCode(value.pack_code)) {
        return false;
    }
    return value.credits === null || typeof value.credits === "number";
}
function asBillingPacks(value) {
    if (!Array.isArray(value)) {
        return (0, billing_1.normalizeAvailablePacks)([]);
    }
    return (0, billing_1.normalizeAvailablePacks)(value.filter(isBillingPack));
}
class InsufficientCreditsError extends Error {
    code = "insufficient_credits";
    creditBalance;
    lifetimeUnlimited;
    availablePacks;
    constructor(payload) {
        super(payload.message || "Insufficient credits.");
        this.name = "InsufficientCreditsError";
        this.creditBalance = payload.credit_balance;
        this.lifetimeUnlimited = payload.lifetime_unlimited;
        this.availablePacks = payload.available_packs;
    }
}
exports.InsufficientCreditsError = InsufficientCreditsError;
function isInsufficientCreditsError(error) {
    return error instanceof InsufficientCreditsError;
}
async function apiFetch(path, options = {}) {
    const url = `${API_BASE_URL}${path}`;
    return fetch(url, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...options.headers,
        },
    });
}
async function tryRefreshTokens(refreshToken) {
    try {
        const res = await apiFetch(API_ROUTES.refresh, {
            method: "POST",
            body: JSON.stringify({ refresh_token: refreshToken }),
        });
        if (!res.ok)
            return false;
        const data = await res.json();
        if (data.access_token && data.refresh_token) {
            await (0, storage_1.setTokens)(data.access_token, data.refresh_token);
            return true;
        }
        return false;
    }
    catch {
        return false;
    }
}
async function fetchWithAuth(path, options = {}, onSessionExpired) {
    const { accessToken, refreshToken } = await (0, storage_1.getTokens)();
    if (!accessToken)
        throw new Error("Not authenticated");
    const res = await apiFetch(path, {
        ...options,
        headers: { ...options.headers, Authorization: `Bearer ${accessToken}` },
    });
    if (res.status === 401 && refreshToken) {
        const refreshed = await tryRefreshTokens(refreshToken);
        if (refreshed) {
            const { accessToken: newToken } = await (0, storage_1.getTokens)();
            return apiFetch(path, {
                ...options,
                headers: {
                    ...options.headers,
                    Authorization: `Bearer ${newToken}`,
                },
            });
        }
        await (0, storage_1.clearTokens)();
        onSessionExpired?.();
        throw new Error("Session expired. Please log in again.");
    }
    return res;
}
async function parseErrorMessage(res, fallback) {
    try {
        const data = await res.json();
        return data.message || data.error || data.detail || fallback;
    }
    catch {
        return fallback;
    }
}
async function login(email, password) {
    const res = await apiFetch(API_ROUTES.login, {
        method: "POST",
        body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
        const msg = await parseErrorMessage(res, "Invalid email or password.");
        throw new Error(msg);
    }
    const data = await res.json();
    if (!data.access_token || !data.refresh_token) {
        throw new Error("Unexpected response format.");
    }
    await (0, storage_1.setTokens)(data.access_token, data.refresh_token);
    await (0, storage_1.setUserEmail)(email);
}
async function connectWithCode(code) {
    const normalizedCode = code.trim().toUpperCase();
    if (!normalizedCode) {
        throw new Error("Enter a one-time code.");
    }
    const res = await apiFetch(API_ROUTES.exchangeConnectCode, {
        method: "POST",
        body: JSON.stringify({
            client: "chrome_extension",
            code: normalizedCode,
        }),
    });
    if (!res.ok) {
        const msg = await parseErrorMessage(res, "Invalid or expired code. Generate a new one and try again.");
        throw new Error(msg);
    }
    const data = await res.json();
    if (!data.access_token || !data.refresh_token) {
        throw new Error("Unexpected response format.");
    }
    await (0, storage_1.setTokens)(data.access_token, data.refresh_token);
    let email = typeof data.user?.email === "string" && data.user.email.length > 0
        ? data.user.email
        : null;
    if (!email) {
        const user = await fetchUserInfo();
        email = user?.email ?? "Connected user";
    }
    await (0, storage_1.setUserEmail)(email);
    return email;
}
async function fetchUserInfo(onSessionExpired) {
    const res = await fetchWithAuth(API_ROUTES.me, {}, onSessionExpired);
    if (!res.ok)
        return null;
    return res.json();
}
async function loadProjects(onSessionExpired) {
    const res = await fetchWithAuth(API_ROUTES.projects, {}, onSessionExpired);
    if (!res.ok) {
        throw new Error("Failed to load projects.");
    }
    return res.json();
}
function asCreditsWalletResponse(value) {
    if (!isRecord(value)) {
        return null;
    }
    if (typeof value.credit_balance !== "number" ||
        typeof value.lifetime_unlimited !== "boolean") {
        return null;
    }
    return {
        credit_balance: value.credit_balance,
        lifetime_unlimited: value.lifetime_unlimited,
        available_packs: asBillingPacks(value.available_packs),
    };
}
function toInsufficientCreditsPayload(value) {
    const wallet = asCreditsWalletResponse(value);
    const message = isRecord(value) && typeof value.message === "string"
        ? value.message
        : "Insufficient credits. Purchase a billing pack to continue.";
    if (!wallet) {
        return {
            error: "insufficient_credits",
            message,
            credit_balance: 0,
            lifetime_unlimited: false,
            available_packs: (0, billing_1.normalizeAvailablePacks)([]),
        };
    }
    return {
        error: "insufficient_credits",
        message,
        credit_balance: wallet.credit_balance,
        lifetime_unlimited: wallet.lifetime_unlimited,
        available_packs: wallet.available_packs,
    };
}
function isFillFormResponse(value) {
    if (!isRecord(value) || !Array.isArray(value.filled_fields)) {
        return false;
    }
    return (typeof value.charged_now === "boolean" &&
        typeof value.already_charged_for_pair === "boolean" &&
        (value.credits_remaining === null || typeof value.credits_remaining === "number") &&
        typeof value.lifetime_unlimited === "boolean");
}
async function getCredits(onSessionExpired) {
    const res = await fetchWithAuth(API_ROUTES.billingCredits, {}, onSessionExpired);
    if (!res.ok) {
        const msg = await parseErrorMessage(res, "Failed to load credit balance.");
        throw new Error(msg);
    }
    const payload = await res.json();
    const parsed = asCreditsWalletResponse(payload);
    if (!parsed) {
        throw new Error("Unexpected billing wallet response format.");
    }
    return parsed;
}
async function createCheckoutSession(packCode, onSessionExpired) {
    const res = await fetchWithAuth(API_ROUTES.billingCheckoutSession, {
        method: "POST",
        body: JSON.stringify({ pack_code: packCode }),
    }, onSessionExpired);
    if (!res.ok) {
        const msg = await parseErrorMessage(res, "Failed to create checkout session.");
        throw new Error(msg);
    }
    const payload = await res.json();
    if (!isRecord(payload) ||
        typeof payload.checkout_url !== "string" ||
        typeof payload.session_id !== "string" ||
        typeof payload.expires_at !== "string") {
        throw new Error("Unexpected checkout session response format.");
    }
    return {
        checkout_url: payload.checkout_url,
        session_id: payload.session_id,
        expires_at: payload.expires_at,
    };
}
async function openCheckoutForPack(packCode, onSessionExpired) {
    const session = await createCheckoutSession(packCode, onSessionExpired);
    await chrome.tabs.create({ url: session.checkout_url });
    return session;
}
async function fillForm(request, onSessionExpired) {
    if (!request.directory_id || request.directory_id.trim().length === 0) {
        throw new Error("directory_id is required for fill-form requests.");
    }
    const res = await fetchWithAuth(API_ROUTES.fillForm, {
        method: "POST",
        body: JSON.stringify(request),
    }, onSessionExpired);
    if (res.status === 402) {
        let payload = null;
        try {
            payload = await res.json();
        }
        catch {
            payload = null;
        }
        throw new InsufficientCreditsError(toInsufficientCreditsPayload(payload));
    }
    if (!res.ok) {
        const msg = await parseErrorMessage(res, "Backend failed to generate fill values.");
        throw new Error(msg);
    }
    const payload = await res.json();
    if (!isFillFormResponse(payload)) {
        throw new Error("Unexpected fill-form response format.");
    }
    return payload;
}
async function findDirectoryByHostname(hostname, onSessionExpired) {
    const normalizedHost = normalizeDomain(hostname);
    if (!normalizedHost) {
        return null;
    }
    const candidates = buildDomainCandidates(normalizedHost);
    for (const candidate of candidates) {
        const directories = await listDirectoriesByDomain(candidate, onSessionExpired);
        const exactMatch = directories.find((directory) => isDomainMatch(normalizedHost, directory.domain));
        if (exactMatch) {
            return {
                id: exactMatch.id,
                name: exactMatch.name,
                domain: normalizeDomain(exactMatch.domain),
            };
        }
    }
    return null;
}
async function voteDirectory(directoryId, vote, onSessionExpired) {
    const votePath = `${API_ROUTES.directories}${encodeURIComponent(directoryId)}/vote`;
    const res = await fetchWithAuth(votePath, {
        method: "PUT",
        body: JSON.stringify({ vote }),
    }, onSessionExpired);
    if (!res.ok) {
        const msg = await parseErrorMessage(res, "Failed to submit vote.");
        throw new Error(msg);
    }
}
async function listDirectoriesByDomain(domain, onSessionExpired) {
    const params = new URLSearchParams({
        domain,
        page: "1",
        page_size: "25",
    });
    const res = await fetchWithAuth(`${API_ROUTES.directories}?${params.toString()}`, {}, onSessionExpired);
    if (!res.ok) {
        const msg = await parseErrorMessage(res, `Failed to find directory for domain ${domain}.`);
        throw new Error(msg);
    }
    const payload = await res.json();
    return asDirectoryRecords(payload);
}
function buildDomainCandidates(hostname) {
    const normalized = normalizeDomain(hostname);
    if (!normalized) {
        return [];
    }
    const labels = normalized.split(".").filter(Boolean);
    const candidates = new Set([normalized]);
    if (labels.length >= 3) {
        candidates.add(labels.slice(-2).join("."));
    }
    if (labels.length >= 3 &&
        COMMON_SECOND_LEVEL_TLDS.has(labels[labels.length - 2])) {
        candidates.add(labels.slice(-3).join("."));
    }
    return Array.from(candidates).filter((candidate) => candidate.length > 0);
}
function normalizeDomain(value) {
    const trimmed = value.trim().toLowerCase();
    if (!trimmed) {
        return "";
    }
    const withoutProtocol = trimmed.replace(/^[a-z][a-z0-9+.-]*:\/\//, "");
    const withoutPath = withoutProtocol.split("/")[0] || "";
    const withoutPort = withoutPath.split(":")[0] || "";
    return withoutPort.startsWith("www.") ? withoutPort.slice(4) : withoutPort;
}
function isDomainMatch(hostname, directoryDomain) {
    const normalizedHost = normalizeDomain(hostname);
    const normalizedDirectory = normalizeDomain(directoryDomain);
    if (!normalizedHost || !normalizedDirectory) {
        return false;
    }
    return (normalizedHost === normalizedDirectory ||
        normalizedHost.endsWith(`.${normalizedDirectory}`));
}
function rememberDirectoryIdForHostnames(hostnames, directoryId) {
    for (const hostname of hostnames) {
        const normalized = normalizeDomain(hostname);
        if (!normalized) {
            continue;
        }
        directoryIdByHostnameCache.set(normalized, directoryId);
    }
}
function asDirectoryRecords(value) {
    if (!isRecord(value) || !Array.isArray(value.directories)) {
        return [];
    }
    return value.directories.filter(isDirectoryRecord);
}
function isDirectoryRecord(value) {
    if (!isRecord(value)) {
        return false;
    }
    return (typeof value.id === "string" &&
        typeof value.name === "string" &&
        typeof value.domain === "string");
}
function isRecord(value) {
    return typeof value === "object" && value !== null;
}
function isDirectoryDetails(value) {
    if (!isRecord(value))
        return false;
    return (typeof value.id === "string" &&
        typeof value.name === "string" &&
        typeof value.domain === "string" &&
        typeof value.is_free === "boolean" &&
        typeof value.is_dofollow === "boolean" &&
        typeof value.submission_stage === "string" &&
        typeof value.thumbs_up_count === "number" &&
        typeof value.thumbs_down_count === "number" &&
        typeof value.total_votes === "number");
}
async function fetchDirectoryByDomain(hostname, projectId, onSessionExpired) {
    const normalizedHost = normalizeDomain(hostname);
    if (!normalizedHost)
        return null;
    const candidates = buildDomainCandidates(normalizedHost);
    for (const candidate of candidates) {
        const params = new URLSearchParams({ domain: candidate });
        if (projectId)
            params.set("project_id", projectId);
        const res = await fetchWithAuth(`${API_ROUTES.directoriesByDomain}?${params.toString()}`, {}, onSessionExpired);
        if (res.status === 404)
            continue;
        if (!res.ok) {
            const msg = await parseErrorMessage(res, `Failed to load directory for ${candidate}.`);
            throw new Error(msg);
        }
        const data = await res.json();
        if (isDirectoryDetails(data)) {
            const canonicalDomain = normalizeDomain(data.domain);
            rememberDirectoryIdForHostnames([normalizedHost, candidate, canonicalDomain, ...candidates, ...buildDomainCandidates(canonicalDomain)], data.id);
            return data;
        }
    }
    return null;
}
async function resolveDirectoryIdForHostname(hostname, onSessionExpired) {
    const normalizedHost = normalizeDomain(hostname);
    if (!normalizedHost) {
        return null;
    }
    const candidates = buildDomainCandidates(normalizedHost);
    for (const candidate of candidates) {
        const cached = directoryIdByHostnameCache.get(candidate);
        if (cached) {
            rememberDirectoryIdForHostnames([normalizedHost, ...candidates], cached);
            return cached;
        }
    }
    const directory = await fetchDirectoryByDomain(normalizedHost, null, onSessionExpired);
    if (!directory) {
        return null;
    }
    return directory.id;
}
function __clearDirectoryIdCacheForTests() {
    directoryIdByHostnameCache.clear();
}
async function fetchRandomDirectory(projectId, onSessionExpired) {
    try {
        const params = new URLSearchParams();
        if (projectId) {
            params.set("project_id", projectId);
        }
        const path = params.toString()
            ? `${API_ROUTES.directoriesRandom}?${params.toString()}`
            : API_ROUTES.directoriesRandom;
        const res = await fetchWithAuth(path, {}, onSessionExpired);
        if (!res.ok)
            return null;
        const data = await res.json();
        if (isRecord(data) &&
            typeof data.domain === "string" &&
            typeof data.redirect_url === "string") {
            return { domain: data.domain, redirect_url: data.redirect_url };
        }
        return null;
    }
    catch {
        return null;
    }
}
