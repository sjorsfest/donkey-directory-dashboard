import { useEffect, useState } from "react";
import { Form, Link, data, useActionData, useLoaderData, useNavigation } from "react-router";
import type { Route } from "./+types/home";
import { getServerApiBaseUrl } from "~/lib/api-base-url.server";
import {
  API_ROUTES,
  type ApiBrandExtractRequest,
  type ApiPath,
} from "~/lib/api-contract";
import {
  parseApiErrorMessage,
  sendAuthenticatedRequest,
  type SessionType,
} from "~/lib/authenticated-api.server";
import { destroySession, getSession } from "~/lib/session.server";

type LogEntry = {
  id: string;
  title: string;
  payload: unknown;
  isError: boolean;
  timestamp: string;
};

type SummaryItem = {
  label: string;
  value: string;
};

type HomeIntent = "brand_extract" | "profile" | "logout";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Donkey Directory Dashboard" },
    {
      name: "description",
      content: "Focused workspace for auth and brand extraction workflows.",
    },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const session = await getSession(request.headers.get("Cookie"));
  const hasSessionTokens =
    Boolean(toOptionalString(session.get("accessToken"))) ||
    Boolean(toOptionalString(session.get("refreshToken")));

  if (!hasSessionTokens) {
    return data({ isAuthenticated: false });
  }

  const apiBaseUrl = getServerApiBaseUrl();
  const authCheck = await sendAuthenticatedRequest({
    session,
    apiBaseUrl,
    path: API_ROUTES.auth.me,
    method: "GET",
  });

  return data(
    {
      isAuthenticated: authCheck.response.status === 200,
    },
    {
      headers: authCheck.setCookie ? { "Set-Cookie": authCheck.setCookie } : undefined,
    },
  );
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const intent = String(formData.get("intent") ?? "").trim();

  if (!isHomeIntent(intent)) {
    return data(
      {
        entry: createLogEntry(
          "Request Error",
          {
            ok: false,
            error: "Unsupported action intent.",
          },
          true,
        ),
      },
      { status: 400 },
    );
  }

  const session = await getSession(request.headers.get("Cookie"));

  if (intent === "logout") {
    return data(
      {
        entry: createLogEntry("Logged out", { ok: true }),
      },
      {
        headers: {
          "Set-Cookie": await destroySession(session),
        },
      },
    );
  }

  const apiBaseUrl = getServerApiBaseUrl();

  if (intent === "profile") {
    return runServerAction({
      title: "Get Current User",
      session,
      requestConfig: {
        apiBaseUrl,
        path: API_ROUTES.auth.me,
        method: "GET",
      },
    });
  }

  const domainInput = String(formData.get("domain") ?? "").trim();
  const domain = normalizeDomainInput(domainInput);
  if (!domain) {
    return data(
      {
        entry: createLogEntry(
          "Brand Extraction",
          {
            ok: false,
            error: "Domain is required.",
          },
          true,
        ),
      },
      { status: 400 },
    );
  }

  const additionalContextRaw = String(formData.get("additional_context") ?? "").trim();
  const additionalContext = additionalContextRaw.length > 0 ? additionalContextRaw : null;
  const payload: ApiBrandExtractRequest = {
    domain,
    additional_context: additionalContext,
  };

  console.info("[brand-extraction] start", {
    input: domainInput,
    domain,
    hasAdditionalContext: Boolean(additionalContext),
    startedAt: new Date().toISOString(),
  });

  return runServerAction({
    title: "Brand Extraction",
    session,
    requestConfig: {
      apiBaseUrl,
      path: API_ROUTES.brand.extract,
      method: "POST",
      body: payload,
    },
  });
}

export default function Home() {
  const { isAuthenticated } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const [logs, setLogs] = useState<LogEntry[]>([]);

  useEffect(() => {
    if (!actionData?.entry) {
      return;
    }

    setLogs((previous) => {
      if (previous.some((entry) => entry.id === actionData.entry.id)) {
        return previous;
      }

      return [actionData.entry, ...previous];
    });
  }, [actionData]);

  const isBusy = navigation.state !== "idle";
  const activeIntent = String(navigation.formData?.get("intent") ?? "");
  const activeAction = titleForIntent(activeIntent);

  const latestBrandRun = logs.find((entry) => entry.title === "Brand Extraction") ?? null;
  const successfulRuns = logs.filter(
    (entry) => entry.title === "Brand Extraction" && !entry.isError,
  ).length;
  const latestSummary = latestBrandRun ? summarizePayload(latestBrandRun.payload) : [];

  return (
    <main className="studio-page">
      <header className="studio-topbar-wrap">
        <div className="studio-shell">
          <nav className="studio-topbar studio-panel">
            <Link className="studio-brand" to="/">
              <span className="studio-brand-mark">D</span>
              <span>
                <strong>Donkey Directory</strong>
                <small>Brand extraction workspace</small>
              </span>
            </Link>

            <div className="studio-topbar-links">
              <a href="#brand-check">Run check</a>
              <a href="#results">Results</a>
            </div>

            {!isAuthenticated ? (
              <div className="dashboard-nav-auth-actions">
                <Link className="dashboard-nav-link-button secondary" to="/signup">
                  Sign up
                </Link>
                <Link className="dashboard-nav-link-button" to="/login">
                  Login
                </Link>
              </div>
            ) : (
              <Form method="post" className="dashboard-nav-user">
                <span className="studio-status-pill">Authenticated</span>
                <Link className="dashboard-nav-link-button secondary" to="/connect-extension">
                  Connect Extension
                </Link>
                <button
                  type="submit"
                  className="ghost"
                  name="intent"
                  value="profile"
                  disabled={isBusy}
                >
                  {activeAction === "Get Current User" ? "Loading..." : "Profile"}
                </button>
                <button
                  type="submit"
                  className="danger"
                  name="intent"
                  value="logout"
                  disabled={isBusy}
                >
                  {activeAction === "Logout" ? "Logging out..." : "Logout"}
                </button>
              </Form>
            )}
          </nav>
        </div>
      </header>

      <section className="studio-hero">
        <div className="studio-shell studio-hero-grid">
          <div className="studio-hero-copy">
            <p className="studio-kicker">Focused workflow</p>
            <h1>One clean place to run brand checks.</h1>
            <p className="studio-lead">
              The page now centers the only action that matters: submit a domain,
              add context when useful, and review the response without debug clutter.
            </p>
            <div className="studio-chip-row">
              <span>Protected API flow</span>
              <span>Readable output</span>
              <span>Mobile-friendly</span>
            </div>
          </div>
        </div>
      </section>

      <section className="studio-shell studio-main-grid">
        <section className="studio-panel studio-form-panel" id="brand-check">
          <div className="studio-panel-heading">
            <div>
              <p className="studio-section-label">Primary action</p>
              <h2>Brand Agent Check</h2>
            </div>
            <span className="studio-meta-note">Authenticated endpoint</span>
          </div>

          <p className="studio-muted-copy">
            Keep the input lightweight. Start with a domain, then add context only
            when you need sharper positioning or audience framing.
          </p>

          {!isAuthenticated ? (
            <div className="studio-inline-notice">
              <span>Login is required before the request can run.</span>
              <Link className="dashboard-nav-link-button secondary" to="/login">
                Sign in
              </Link>
            </div>
          ) : null}

          <Form method="post" className="studio-form">
            <input type="hidden" name="intent" value="brand_extract" />
            <div className="studio-form-grid">
              <label className="studio-field studio-field-domain">
                <span>Domain</span>
                <input
                  name="domain"
                  type="text"
                  placeholder="example.com"
                  required
                />
              </label>
              <label className="studio-field">
                <span>Additional Context</span>
                <textarea
                  name="additional_context"
                  rows={6}
                  placeholder="Focus on products, audience, differentiators, pricing, or category language..."
                />
              </label>
            </div>

            <div className="studio-form-footer">
              <p className="studio-form-hint">
                Requests are now handled by route actions, so auth and retries stay on
                the server.
              </p>
              <div className="dashboard-inline-actions">
                {logs.length > 0 ? (
                  <button
                    type="button"
                    className="ghost"
                    onClick={() => setLogs([])}
                    disabled={isBusy}
                  >
                    Clear history
                  </button>
                ) : null}
                <button type="submit" disabled={isBusy || !isAuthenticated}>
                  {activeAction === "Brand Extraction"
                    ? "Running check..."
                    : "Run brand extraction"}
                </button>
              </div>
            </div>
          </Form>
        </section>

        <section className="studio-panel studio-results-panel" id="results">
          <div className="studio-panel-heading">
            <div>
              <p className="studio-section-label">Results</p>
              <h2>Latest Output</h2>
            </div>
            {latestBrandRun ? (
              <span className={`studio-result-state${latestBrandRun.isError ? " error" : ""}`}>
                {latestBrandRun.isError ? "Needs attention" : "Captured"}
              </span>
            ) : null}
          </div>

          {!latestBrandRun ? (
            <div className="studio-empty-state">
              <strong>No brand extraction yet.</strong>
              <p>
                Run the form above and the latest response will appear here in a
                readable summary with the raw payload beside it.
              </p>
            </div>
          ) : (
            <div className="studio-results-grid">
              <article
                className={`studio-result-highlight${
                  latestBrandRun.isError ? " error" : ""
                }`}
              >
                <span className="studio-result-label">
                  {latestBrandRun.isError ? "Latest error" : "Latest success"}
                </span>
                <h3>{describeLog(latestBrandRun)}</h3>
                <p>{latestBrandRun.timestamp}</p>

                {latestSummary.length > 0 ? (
                  <div className="studio-summary-grid">
                    {latestSummary.map((item) => (
                      <div key={`${item.label}-${item.value}`} className="studio-summary-item">
                        <span>{item.label}</span>
                        <strong>{item.value}</strong>
                      </div>
                    ))}
                  </div>
                ) : null}
              </article>

              <article className="studio-result-json">
                <pre>{JSON.stringify(latestBrandRun.payload, null, 2)}</pre>
              </article>
            </div>
          )}
        </section>

        <section className="studio-panel studio-activity-panel">
          <div className="studio-panel-heading">
            <div>
              <p className="studio-section-label">History</p>
              <h2>Recent Activity</h2>
            </div>
            <span className="studio-meta-note">{successfulRuns} successful run(s)</span>
          </div>

          {logs.length === 0 ? (
            <p className="dashboard-muted">No requests yet.</p>
          ) : (
            <div className="studio-activity-list">
              {logs.slice(0, 6).map((log) => (
                <article
                  key={log.id}
                  className={`studio-activity-item${log.isError ? " error" : ""}`}
                >
                  <div>
                    <strong>{log.title}</strong>
                    <p>{describeLog(log)}</p>
                  </div>
                  <time>{log.timestamp}</time>
                </article>
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}

async function runServerAction(options: {
  title: string;
  session: SessionType;
  requestConfig: {
    apiBaseUrl: string;
    path: ApiPath;
    method: "GET" | "POST";
    body?: Record<string, unknown>;
  };
}) {
  try {
    const result = await sendAuthenticatedRequest({
      session: options.session,
      ...options.requestConfig,
    });

    const headers = result.setCookie ? { "Set-Cookie": result.setCookie } : undefined;

    if (!result.response.ok) {
      return data(
        {
          entry: createLogEntry(
            options.title,
            {
              ok: false,
              error: parseApiErrorMessage(
                result.responseData,
                `HTTP ${result.response.status}`,
              ),
              detail: result.responseData,
            },
            true,
          ),
        },
        {
          status: result.response.status,
          headers,
        },
      );
    }

    return data(
      {
        entry: createLogEntry(options.title, {
          ok: true,
          status: result.response.status,
          data: result.responseData,
        }),
      },
      {
        headers,
      },
    );
  } catch (caughtError) {
    const message = caughtError instanceof Error ? caughtError.message : "Unexpected server error.";
    return data(
      {
        entry: createLogEntry(
          options.title,
          {
            ok: false,
            error: message,
            detail: null,
          },
          true,
        ),
      },
      { status: 500 },
    );
  }
}

function createLogEntry(title: string, payload: unknown, isError = false): LogEntry {
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    title,
    payload,
    isError,
    timestamp: new Date().toLocaleString(),
  };
}

function isHomeIntent(value: string): value is HomeIntent {
  return value === "brand_extract" || value === "profile" || value === "logout";
}

function titleForIntent(intent: string): string | null {
  if (intent === "brand_extract") {
    return "Brand Extraction";
  }

  if (intent === "profile") {
    return "Get Current User";
  }

  if (intent === "logout") {
    return "Logout";
  }

  return null;
}

function toOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeDomainInput(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) {
    return "";
  }

  try {
    const url = new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`);
    const normalized = url.hostname.trim().toLowerCase();
    return normalized;
  } catch {
    return trimmed
      .replace(/^https?:\/\//i, "")
      .split("/")[0]
      .trim()
      .toLowerCase();
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function summarizePayload(payload: unknown): SummaryItem[] {
  if (!isRecord(payload)) {
    return [];
  }

  const items: SummaryItem[] = [];

  if (typeof payload.status === "number") {
    items.push({ label: "Status", value: String(payload.status) });
  }

  if (typeof payload.ok === "boolean") {
    items.push({ label: "Outcome", value: payload.ok ? "Success" : "Failed" });
  }

  const detailSource = isRecord(payload.data)
    ? payload.data
    : isRecord(payload.detail)
      ? payload.detail
      : null;

  if (!detailSource) {
    return items;
  }

  for (const [key, value] of Object.entries(detailSource)) {
    if (items.length >= 6) {
      break;
    }

    const formatted = formatSummaryValue(value);
    if (!formatted) {
      continue;
    }

    items.push({
      label: formatLabel(key),
      value: formatted,
    });
  }

  return items;
}

function formatSummaryValue(value: unknown): string | null {
  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value.length > 0 ? `${value.length} items` : null;
  }

  return null;
}

function formatLabel(value: string): string {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function describeLog(log: LogEntry): string {
  if (log.isError) {
    return "The request failed. Review the payload for the server response and error details.";
  }

  if (log.title === "Logged out") {
    return "The server session cookie was cleared for this browser.";
  }

  if (log.title === "Get Current User") {
    return "The active session was verified against the authenticated user endpoint.";
  }

  return "The latest response is stored below with a readable summary and full payload.";
}
