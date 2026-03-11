import type { AppApiPath, ApiRefreshRequest } from "~/lib/api-contract";
import { API_ROUTES, isApiToken } from "~/lib/api-contract";
import { commitSession, destroySession, getSession } from "~/lib/session.server";

export type SessionType = Awaited<ReturnType<typeof getSession>>;

export type AuthenticatedRequestResult = {
  response: Response;
  responseData: unknown;
  setCookie: string | null;
};

export async function sendAuthenticatedRequest(options: {
  session: SessionType;
  apiBaseUrl: string;
  path: AppApiPath | string;
  method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
}): Promise<AuthenticatedRequestResult> {
  const { session, apiBaseUrl, path, method, body } = options;

  let accessToken = toOptionalString(session.get("accessToken"));
  let refreshToken = toOptionalString(session.get("refreshToken"));
  let setCookie: string | null = null;

  if (!accessToken && refreshToken) {
    const refreshedTokens = await refreshTokens(apiBaseUrl, refreshToken);

    if (refreshedTokens) {
      accessToken = refreshedTokens.access_token;
      refreshToken = refreshedTokens.refresh_token;
      session.set("accessToken", refreshedTokens.access_token);
      session.set("refreshToken", refreshedTokens.refresh_token);
      setCookie = await commitSession(session);
    } else {
      setCookie = await destroySession(session);
      refreshToken = undefined;
    }
  }

  if (!accessToken) {
    return {
      response: new Response(
        JSON.stringify({ error: "No active session. Please log in first." }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      ),
      responseData: { error: "No active session. Please log in first." },
      setCookie,
    };
  }

  let response = await sendApiRequest({
    apiBaseUrl,
    path,
    method,
    body,
    accessToken,
  });

  if (response.status === 401 && refreshToken) {
    const refreshedTokens = await refreshTokens(apiBaseUrl, refreshToken);

    if (refreshedTokens) {
      accessToken = refreshedTokens.access_token;
      session.set("accessToken", refreshedTokens.access_token);
      session.set("refreshToken", refreshedTokens.refresh_token);
      setCookie = await commitSession(session);

      response = await sendApiRequest({
        apiBaseUrl,
        path,
        method,
        body,
        accessToken,
      });
    } else {
      setCookie = await destroySession(session);
    }
  }

  if (response.status === 401 && !setCookie) {
    setCookie = await destroySession(session);
  }

  const responseData = parseMaybeJson(await response.text());

  if (isApiToken(responseData)) {
    session.set("accessToken", responseData.access_token);
    session.set("refreshToken", responseData.refresh_token);
    setCookie = await commitSession(session);
  }

  return {
    response,
    responseData,
    setCookie,
  };
}

async function sendApiRequest(options: {
  apiBaseUrl: string;
  path: AppApiPath | string;
  method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  accessToken: string;
}) {
  return fetch(`${options.apiBaseUrl}${options.path}`, {
    method: options.method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${options.accessToken}`,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
}

async function refreshTokens(apiBaseUrl: string, refreshToken: string) {
  const payload: ApiRefreshRequest = { refresh_token: refreshToken };

  const refreshResponse = await fetch(`${apiBaseUrl}${API_ROUTES.auth.refresh}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!refreshResponse.ok) {
    return null;
  }

  const refreshPayload = parseMaybeJson(await refreshResponse.text());
  return isApiToken(refreshPayload) ? refreshPayload : null;
}

function toOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function parseApiErrorMessage(payload: unknown, fallback: string): string {
  if (!isRecord(payload)) {
    return fallback;
  }

  const message = payload.message ?? payload.error ?? payload.detail;
  return typeof message === "string" ? message : fallback;
}

function parseMaybeJson(value: string): unknown {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as unknown;
  } catch {
    return value;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
