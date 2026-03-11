import {
  getTokens,
  setTokens,
  clearTokens,
  setUserEmail,
} from "./storage";
import type { Project, FillFormResponse, ScannedField } from "../types";

const API_BASE_URL = "http://127.0.0.1:8000";
export const WEB_APP_ORIGIN = "http://localhost:5173";
export const CONNECT_EXTENSION_URL = `${WEB_APP_ORIGIN}/connect-extension`;

const API_ROUTES = {
  login: "/api/v1/auth/login",
  refresh: "/api/v1/auth/refresh",
  me: "/api/v1/auth/me",
  exchangeConnectCode: "/api/v1/auth/extension/connect-codes/exchange",
  projects: "/api/v1/brand/projects",
  fillForm: "/api/v1/brand/fill-form",
} as const;

async function apiFetch(path: string, options: RequestInit = {}) {
  const url = `${API_BASE_URL}${path}`;
  return fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
}

async function tryRefreshTokens(refreshToken: string): Promise<boolean> {
  try {
    const res = await apiFetch(API_ROUTES.refresh, {
      method: "POST",
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    if (data.access_token && data.refresh_token) {
      await setTokens(data.access_token, data.refresh_token);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export async function fetchWithAuth(
  path: string,
  options: RequestInit = {},
  onSessionExpired?: () => void
) {
  const { accessToken, refreshToken } = await getTokens();
  if (!accessToken) throw new Error("Not authenticated");

  const res = await apiFetch(path, {
    ...options,
    headers: { ...options.headers, Authorization: `Bearer ${accessToken}` },
  });

  if (res.status === 401 && refreshToken) {
    const refreshed = await tryRefreshTokens(refreshToken);
    if (refreshed) {
      const { accessToken: newToken } = await getTokens();
      return apiFetch(path, {
        ...options,
        headers: {
          ...options.headers,
          Authorization: `Bearer ${newToken}`,
        },
      });
    }
    await clearTokens();
    onSessionExpired?.();
    throw new Error("Session expired. Please log in again.");
  }

  return res;
}

export async function parseErrorMessage(
  res: Response,
  fallback: string
): Promise<string> {
  try {
    const data = await res.json();
    return data.message || data.error || data.detail || fallback;
  } catch {
    return fallback;
  }
}

export async function login(email: string, password: string): Promise<void> {
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

  await setTokens(data.access_token, data.refresh_token);
  await setUserEmail(email);
}

export async function connectWithCode(code: string): Promise<string> {
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
    const msg = await parseErrorMessage(
      res,
      "Invalid or expired code. Generate a new one and try again."
    );
    throw new Error(msg);
  }

  const data = await res.json();
  if (!data.access_token || !data.refresh_token) {
    throw new Error("Unexpected response format.");
  }

  await setTokens(data.access_token, data.refresh_token);

  let email =
    typeof data.user?.email === "string" && data.user.email.length > 0
      ? data.user.email
      : null;

  if (!email) {
    const user = await fetchUserInfo();
    email = user?.email ?? "Connected user";
  }

  await setUserEmail(email);
  return email;
}

export async function fetchUserInfo(
  onSessionExpired?: () => void
): Promise<{ email: string } | null> {
  const res = await fetchWithAuth(API_ROUTES.me, {}, onSessionExpired);
  if (!res.ok) return null;
  return res.json();
}

export async function loadProjects(
  onSessionExpired?: () => void
): Promise<Project[]> {
  const res = await fetchWithAuth(API_ROUTES.projects, {}, onSessionExpired);
  if (!res.ok) {
    throw new Error("Failed to load projects.");
  }
  return res.json();
}

export async function fillForm(
  projectId: string,
  pageUrl: string,
  pageTitle: string,
  fields: ScannedField[],
  onSessionExpired?: () => void
): Promise<FillFormResponse> {
  const res = await fetchWithAuth(
    API_ROUTES.fillForm,
    {
      method: "POST",
      body: JSON.stringify({
        project_id: projectId,
        page_url: pageUrl,
        page_title: pageTitle,
        fields,
      }),
    },
    onSessionExpired
  );

  if (!res.ok) {
    const msg = await parseErrorMessage(
      res,
      "Backend failed to generate fill values."
    );
    throw new Error(msg);
  }

  const data = await res.json();
  return data;
}
