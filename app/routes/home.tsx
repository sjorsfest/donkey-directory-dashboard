import { Form, Link, data, redirect, useLoaderData, useNavigation } from "react-router";

import type { Route } from "./+types/home";
import { Button } from "@/shared/ui/button";
import { API_ROUTES } from "~/lib/api-contract";
import { sendAuthenticatedRequest } from "~/lib/authenticated-api.server";
import { getServerApiBaseUrl } from "~/lib/api-base-url.server";
import { destroySession, getSession } from "~/lib/session.server";

type LoaderData = {
  isAuthenticated: boolean;
};

type ActionFeedback = {
  kind: "error";
  message: string;
};

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Donkey Directory Dashboard" },
    {
      name: "description",
      content: "Donkey Directory dashboard home placeholder.",
    },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const session = await getSession(request.headers.get("Cookie"));
  const hasSessionTokens =
    Boolean(toOptionalString(session.get("accessToken"))) ||
    Boolean(toOptionalString(session.get("refreshToken")));

  if (!hasSessionTokens) {
    return data<LoaderData>({ isAuthenticated: false });
  }

  const authResult = await sendAuthenticatedRequest({
    session,
    apiBaseUrl: getServerApiBaseUrl(),
    path: API_ROUTES.auth.me,
    method: "GET",
  });

  return data<LoaderData>(
    {
      isAuthenticated: authResult.response.status === 200,
    },
    {
      headers: authResult.setCookie
        ? {
            "Set-Cookie": authResult.setCookie,
          }
        : undefined,
    },
  );
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const intent = toOptionalString(formData.get("intent"));

  if (intent !== "logout") {
    return data(
      {
        feedback: {
          kind: "error",
          message: "Unsupported action intent.",
        } satisfies ActionFeedback,
      },
      { status: 400 },
    );
  }

  const session = await getSession(request.headers.get("Cookie"));

  return redirect("/", {
    headers: {
      "Set-Cookie": await destroySession(session),
    },
  });
}

export default function HomePage() {
  const { isAuthenticated } = useLoaderData<typeof loader>();
  const navigation = useNavigation();
  const navIntent = toOptionalString(navigation.formData?.get("intent"));
  const isLoggingOut = navigation.state !== "idle" && navIntent === "logout";

  return (
    <main className="studio-page">
      <header className="studio-topbar-wrap">
        <div className="studio-shell">
          <nav className="studio-topbar studio-panel">
            <Link className="studio-brand" to="/">
              <span className="studio-brand-mark">D</span>
              <span>
                <strong>Donkey Directory</strong>
              </span>
            </Link>

            <div className="studio-topbar-links">
              {isAuthenticated ? <Link to="/launch">Launch now</Link> : null}
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
                <Link className="dashboard-nav-link-button" to="/launch">
                  Launch now
                </Link>
                <Button type="submit" variant="destructive" name="intent" value="logout">
                  {isLoggingOut ? "Logging out..." : "Logout"}
                </Button>
              </Form>
            )}
          </nav>
        </div>
      </header>

      <section className="studio-hero">
        <div className="studio-shell">
          <div className="studio-hero-copy">
            <p className="studio-kicker">Home placeholder</p>
            <h1>This page is intentionally minimal for now.</h1>
            <p className="studio-lead">
              {isAuthenticated
                ? "Use Launch now to manage projects, creators, and extension setup."
                : "Sign in to access your launch workspace."}
            </p>
          </div>
        </div>
      </section>

      <section className="studio-shell business-main-grid">
        <section className="studio-panel business-route-panel">
          <div className="studio-empty-state">
            <strong>Placeholder ready.</strong>
            <p>
              {isAuthenticated
                ? "All project setup and extension connection now live in Launch now."
                : "Login to continue to the launch workspace."}
            </p>
            <div className="dashboard-nav-auth-actions">
              {isAuthenticated ? (
                <Link className="dashboard-nav-link-button" to="/launch">
                  Open launch workspace
                </Link>
              ) : (
                <>
                  <Link className="dashboard-nav-link-button" to="/login">
                    Login
                  </Link>
                  <Link className="dashboard-nav-link-button secondary" to="/signup">
                    Sign up
                  </Link>
                </>
              )}
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}

function toOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}
