import { Form, Link, data, redirect, useActionData, useNavigation } from "react-router";
import type { Route } from "./+types/signup";
import { getServerApiBaseUrl } from "~/lib/api-base-url.server";
import {
  API_ROUTES,
  type ApiRegisterRequest,
  isApiToken,
} from "~/lib/api-contract";
import { commitSession, getSession } from "~/lib/session.server";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Sign Up | Donkey Directory Dashboard" },
    {
      name: "description",
      content: "Create a new Donkey Directory account.",
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
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "").trim();
  const session = await getSession(request.headers.get("Cookie"));

  if (!email || !password) {
    return data({ error: "Email and password are required." }, { status: 400 });
  }

  const payload: ApiRegisterRequest = { email, password };

  const apiBaseUrl = getServerApiBaseUrl();
  const registerResponse = await fetch(`${apiBaseUrl}${API_ROUTES.auth.register}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const registerPayload = parseMaybeJson(await registerResponse.text());
  if (!registerResponse.ok) {
    return data(
      { error: parseApiErrorMessage(registerPayload, "Unable to create account with these details.") },
      { status: registerResponse.status },
    );
  }

  if (!isApiToken(registerPayload)) {
    return data({ error: "Unexpected signup response format." }, { status: 500 });
  }

  session.set("accessToken", registerPayload.access_token);
  session.set("refreshToken", registerPayload.refresh_token);

  return redirect("/", {
    headers: {
      "Set-Cookie": await commitSession(session),
    },
  });
}

export default function SignupPage() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state !== "idle";

  return (
    <main className="auth-page-shell">
      <section className="auth-card shiny-card">
        <p className="auth-kicker">Directory access</p>
        <h1>Sign Up</h1>
        <p className="dashboard-muted">Create your account to start using the dashboard.</p>

        {actionData?.error ? <p className="auth-error">{actionData.error}</p> : null}

        <Form method="post" className="auth-form">
          <label>
            Email
            <input type="email" name="email" autoComplete="email" required />
          </label>
          <label>
            Password
            <input type="password" name="password" autoComplete="new-password" required />
          </label>
          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Creating account..." : "Create account"}
          </button>
        </Form>

        <div className="auth-links">
          <Link className="dashboard-nav-link" to="/login">
            Already have an account? Login
          </Link>
          <Link className="dashboard-nav-link" to="/">
            Back to home
          </Link>
        </div>
      </section>
    </main>
  );
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
