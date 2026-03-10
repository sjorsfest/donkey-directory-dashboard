import { Form, Link, data, redirect, useActionData, useNavigation } from "react-router";
import type { Route } from "./+types/login";
import { getServerApiBaseUrl } from "~/lib/api-base-url.server";
import { API_ROUTES, type ApiLoginRequest, isApiToken } from "~/lib/api-contract";
import { commitSession, getSession } from "~/lib/session.server";

type SocialIntent = "oauth:google" | "oauth:x";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Login | Donkey Directory Dashboard" },
    {
      name: "description",
      content: "Login page with password and social auth options.",
    },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const session = await getSession(request.headers.get("Cookie"));
  const accessToken = session.get("accessToken");

  if (typeof accessToken === "string" && accessToken.length > 0) {
    return redirect("/");
  }

  return null;
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const intent = String(formData.get("intent") ?? "").trim();
  const session = await getSession(request.headers.get("Cookie"));

  if (isSocialIntent(intent)) {
    const apiBaseUrl = getServerApiBaseUrl();
    const provider = intent === "oauth:google" ? "google" : "x";
    const startPath = provider === "google"
      ? "/auth/oauth/google/start"
      : "/auth/oauth/twitter/start";

    const startUrl = new URL(startPath, apiBaseUrl);
    const callbackUrl = new URL("/auth/callback", new URL(request.url).origin);
    callbackUrl.searchParams.set("provider", provider);
    startUrl.searchParams.set("redirect_uri", callbackUrl.toString());

    return redirect(startUrl.toString());
  }

  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "").trim();

  if (!email || !password) {
    return data({ error: "Email and password are required." }, { status: 400 });
  }

  const payload: ApiLoginRequest = { email, password };

  const apiBaseUrl = getServerApiBaseUrl();
  const loginResponse = await fetch(`${apiBaseUrl}${API_ROUTES.auth.login}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const loginPayload = parseMaybeJson(await loginResponse.text());
  if (!loginResponse.ok) {
    return data(
      { error: parseApiErrorMessage(loginPayload, "Invalid email or password.") },
      { status: loginResponse.status },
    );
  }

  if (!isApiToken(loginPayload)) {
    return data({ error: "Unexpected login response format." }, { status: 500 });
  }

  session.set("accessToken", loginPayload.access_token);
  session.set("refreshToken", loginPayload.refresh_token);

  return redirect("/", {
    headers: {
      "Set-Cookie": await commitSession(session),
    },
  });
}

export default function LoginPage() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const activeIntent = String(navigation.formData?.get("intent") ?? "");
  const isBusy = navigation.state !== "idle";
  const isGoogleLoading = isBusy && activeIntent === "oauth:google";
  const isXLoading = isBusy && activeIntent === "oauth:x";
  const isLoginLoading = isBusy && activeIntent !== "oauth:google" && activeIntent !== "oauth:x";

  return (
    <main className="auth-page-shell">
      <section className="auth-card shiny-card">
        <p className="auth-kicker">Directory access</p>
        <h1>Login</h1>
        <p className="dashboard-muted">
          Use email/password or continue with Google or X.
        </p>

        {actionData?.error ? <p className="auth-error">{actionData.error}</p> : null}

        <Form method="post" className="auth-social-row">
          <button
            type="submit"
            className="auth-social-btn"
            name="intent"
            value="oauth:google"
            disabled={isBusy}
          >
            {isGoogleLoading ? "Redirecting..." : "Continue with Google"}
          </button>
          <button
            type="submit"
            className="auth-social-btn"
            name="intent"
            value="oauth:x"
            disabled={isBusy}
          >
            {isXLoading ? "Redirecting..." : "Continue with X"}
          </button>
        </Form>

        <div className="auth-divider" />

        <Form method="post" className="auth-form">
          <label>
            Email
            <input type="email" name="email" autoComplete="email" required />
          </label>
          <label>
            Password
            <input type="password" name="password" autoComplete="current-password" required />
          </label>
          <button type="submit" disabled={isBusy}>
            {isLoginLoading ? "Logging in..." : "Login"}
          </button>
        </Form>

        <div className="auth-links">
          <Link className="dashboard-nav-link" to="/signup">
            Need an account? Sign up
          </Link>
          <Link className="dashboard-nav-link" to="/">
            Back to home
          </Link>
        </div>
      </section>
    </main>
  );
}

function isSocialIntent(value: string): value is SocialIntent {
  return value === "oauth:google" || value === "oauth:x";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseApiErrorMessage(payload: unknown, fallback: string): string {
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
