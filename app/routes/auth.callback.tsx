import { Link, data, redirect, useLoaderData } from "react-router";
import type { Route } from "./+types/auth.callback";
import { getServerApiBaseUrl } from "~/lib/api-base-url.server";
import { type ApiToken, isApiToken } from "~/lib/api-contract";
import { commitSession, getSession } from "~/lib/session.server";

type CallbackProvider = "google" | "x";

type CallbackLoaderData = {
  isError: boolean;
  message: string;
};

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Social Login Callback | Donkey Directory Dashboard" },
    {
      name: "description",
      content: "Processes OAuth callback and stores returned tokens.",
    },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const session = await getSession(request.headers.get("Cookie"));
  const existingAccessToken = session.get("accessToken");

  if (typeof existingAccessToken === "string" && existingAccessToken.length > 0) {
    return redirect("/");
  }

  const currentUrl = new URL(request.url);
  const error = parseQueryError(currentUrl.searchParams);
  if (error) {
    return data<CallbackLoaderData>({ isError: true, message: error }, { status: 400 });
  }

  const tokensFromQuery = extractTokensFromSearch(currentUrl.searchParams);
  if (tokensFromQuery) {
    session.set("accessToken", tokensFromQuery.accessToken);
    session.set("refreshToken", tokensFromQuery.refreshToken);

    return redirect("/", {
      headers: {
        "Set-Cookie": await commitSession(session),
      },
    });
  }

  const provider = parseProvider(currentUrl.searchParams.get("provider"));
  const code = currentUrl.searchParams.get("code");

  if (provider && code) {
    const exchangeResult = await exchangeOAuthCode({
      apiBaseUrl: getServerApiBaseUrl(),
      provider,
      code,
      state: currentUrl.searchParams.get("state"),
      appOrigin: currentUrl.origin,
    });

    if (exchangeResult.tokens) {
      session.set("accessToken", exchangeResult.tokens.access_token);
      session.set("refreshToken", exchangeResult.tokens.refresh_token);

      return redirect("/", {
        headers: {
          "Set-Cookie": await commitSession(session),
        },
      });
    }

    return data<CallbackLoaderData>(
      {
        isError: true,
        message: exchangeResult.error,
      },
      {
        status: exchangeResult.status,
      },
    );
  }

  return data<CallbackLoaderData>(
    {
      isError: true,
      message:
        "No auth tokens were found in query params. Configure OAuth to return a code to /auth/callback or tokens in query params.",
    },
    { status: 400 },
  );
}

export default function AuthCallbackPage() {
  const loaderData = useLoaderData<typeof loader>();

  return (
    <main className="auth-page-shell">
      <section className="auth-card shiny-card">
        <p className="auth-kicker">Directory access</p>
        <h1>Social Login</h1>
        <p className={loaderData.isError ? "auth-error" : "dashboard-muted"}>
          {loaderData.message}
        </p>
        <div className="auth-links">
          <Link className="dashboard-nav-link" to="/login">
            Back to login
          </Link>
          <Link className="dashboard-nav-link" to="/">
            Back to home
          </Link>
        </div>
      </section>
    </main>
  );
}

async function exchangeOAuthCode(options: {
  apiBaseUrl: string;
  provider: CallbackProvider;
  code: string;
  state: string | null;
  appOrigin: string;
}): Promise<{ tokens: ApiToken | null; error: string; status: number }> {
  const callbackPath =
    options.provider === "google"
      ? "/auth/oauth/google/callback"
      : "/auth/oauth/twitter/callback";

  const candidatePaths = [callbackPath, `/api/v1${callbackPath}`];
  const redirectUri = new URL("/auth/callback", options.appOrigin);
  redirectUri.searchParams.set("provider", options.provider);

  let lastStatus = 502;
  let lastError = "OAuth code exchange failed.";

  for (const path of candidatePaths) {
    const postAttempt = await attemptExchange({
      url: new URL(path, options.apiBaseUrl),
      body: {
        code: options.code,
        redirect_uri: redirectUri.toString(),
        state: options.state,
      },
      method: "POST",
    });

    if (postAttempt.tokens) {
      return { tokens: postAttempt.tokens, error: "", status: 200 };
    }

    lastStatus = postAttempt.status;
    lastError = postAttempt.error;

    const getUrl = new URL(path, options.apiBaseUrl);
    getUrl.searchParams.set("code", options.code);
    getUrl.searchParams.set("redirect_uri", redirectUri.toString());
    if (options.state) {
      getUrl.searchParams.set("state", options.state);
    }

    const getAttempt = await attemptExchange({
      url: getUrl,
      method: "GET",
    });

    if (getAttempt.tokens) {
      return { tokens: getAttempt.tokens, error: "", status: 200 };
    }

    lastStatus = getAttempt.status;
    lastError = getAttempt.error;
  }

  return {
    tokens: null,
    error:
      `${lastError} OAuth provider returned a code, but no token response was accepted by the backend callback endpoint.`,
    status: normalizeHttpStatus(lastStatus),
  };
}

async function attemptExchange(options: {
  url: URL;
  method: "GET" | "POST";
  body?: Record<string, unknown>;
}): Promise<{ tokens: ApiToken | null; error: string; status: number }> {
  try {
    const response = await fetch(options.url.toString(), {
      method: options.method,
      redirect: "manual",
      headers: {
        Accept: "application/json",
        ...(options.method === "POST" ? { "Content-Type": "application/json" } : {}),
      },
      body: options.method === "POST" ? JSON.stringify(options.body ?? {}) : undefined,
    });

    const redirectLocation = response.headers.get("Location");
    if (redirectLocation) {
      try {
        const redirectUrl = new URL(redirectLocation, options.url);
        const tokensFromQuery = extractTokensFromSearch(redirectUrl.searchParams);
        if (tokensFromQuery) {
          return {
            tokens: {
              access_token: tokensFromQuery.accessToken,
              refresh_token: tokensFromQuery.refreshToken,
              token_type: "bearer",
            },
            error: "",
            status: 200,
          };
        }

        const tokensFromHash = extractTokensFromHash(redirectUrl.hash);
        if (tokensFromHash) {
          return {
            tokens: {
              access_token: tokensFromHash.accessToken,
              refresh_token: tokensFromHash.refreshToken,
              token_type: "bearer",
            },
            error: "",
            status: 200,
          };
        }

        const redirectError = parseQueryError(redirectUrl.searchParams);
        if (redirectError) {
          return {
            tokens: null,
            error: redirectError,
            status: normalizeHttpStatus(response.status),
          };
        }
      } catch {
        // Ignore invalid redirect URLs and continue parsing response body.
      }
    }

    const payload = parseMaybeJson(await response.text());

    if (isApiToken(payload)) {
      return {
        tokens: payload,
        error: "",
        status: response.status,
      };
    }

    return {
      tokens: null,
      error: parseApiErrorMessage(payload, "OAuth callback did not return tokens."),
      status: response.status,
    };
  } catch (caughtError) {
    const message = caughtError instanceof Error ? caughtError.message : "OAuth exchange request failed.";
    return {
      tokens: null,
      error: message,
      status: 502,
    };
  }
}

function extractTokensFromSearch(
  searchParams: URLSearchParams,
): { accessToken: string; refreshToken: string } | null {
  const accessToken =
    searchParams.get("access_token") ??
    searchParams.get("accessToken") ??
    searchParams.get("token");
  const refreshToken =
    searchParams.get("refresh_token") ??
    searchParams.get("refreshToken");

  if (!accessToken || !refreshToken) {
    return null;
  }

  return {
    accessToken,
    refreshToken,
  };
}

function extractTokensFromHash(hash: string): { accessToken: string; refreshToken: string } | null {
  if (!hash || hash === "#") {
    return null;
  }

  const hashParams = new URLSearchParams(hash.replace(/^#/, ""));
  return extractTokensFromSearch(hashParams);
}

function parseProvider(value: string | null): CallbackProvider | null {
  if (value === "google") {
    return "google";
  }

  if (value === "x" || value === "twitter") {
    return "x";
  }

  return null;
}

function parseQueryError(searchParams: URLSearchParams): string | null {
  const message =
    searchParams.get("error_description") ??
    searchParams.get("detail") ??
    searchParams.get("message") ??
    searchParams.get("error");

  if (!message) {
    return null;
  }

  return message === "access_denied" ? "Access was denied. Please try again." : message;
}

function parseApiErrorMessage(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== "object") {
    return fallback;
  }

  const record = payload as Record<string, unknown>;
  const message = record.message ?? record.error ?? record.detail;
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

function normalizeHttpStatus(status: number): number {
  return status >= 400 && status <= 599 ? status : 500;
}
