import { Form, Link, data, redirect, useActionData, useNavigation } from "react-router";
import type { Route } from "./+types/signup";
import { getServerApiBaseUrl } from "~/lib/api-base-url.server";
import {
  API_ROUTES,
  type ApiRegisterRequest,
  isApiToken,
} from "~/lib/api-contract";
import { commitSession, getSession } from "~/lib/session.server";
import { Alert, AlertDescription } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";

type SocialIntent = "oauth:google" | "oauth:x";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Sign Up | Donkey Directories Dashboard" },
    {
      name: "description",
      content: "Create a new Donkey Directories account.",
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
      ? "/api/v1/auth/oauth/google/start"
      : "/api/v1/auth/oauth/twitter/start";

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

  return redirect("/verify-email", {
    headers: {
      "Set-Cookie": await commitSession(session),
    },
  });
}

export default function SignupPage() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const activeIntent = String(navigation.formData?.get("intent") ?? "");
  const isBusy = navigation.state !== "idle";
  const isGoogleLoading = isBusy && activeIntent === "oauth:google";
  const isXLoading = isBusy && activeIntent === "oauth:x";

  return (
    <main className="min-h-screen grid place-items-center p-6">
      <Card className="w-full max-w-xl">
        <CardHeader className="space-y-2">
          <p className="text-sm text-muted-foreground">Directory access</p>
          <CardTitle>Sign Up</CardTitle>
          <CardDescription>Create your account or continue with Google or X.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {actionData?.error ? (
            <Alert variant="destructive">
              <AlertDescription>{actionData.error}</AlertDescription>
            </Alert>
          ) : null}

          <Form method="post" className="grid gap-3 sm:grid-cols-2">
            <Button
              type="submit"
              variant="outline"
              name="intent"
              value="oauth:google"
              disabled={isBusy}
              className="gap-2.5"
            >
              <GoogleIcon />
              {isGoogleLoading ? "Redirecting..." : "Continue with Google"}
            </Button>
            <Button
              type="submit"
              variant="outline"
              name="intent"
              value="oauth:x"
              disabled={isBusy}
              className="gap-2.5"
            >
              <XIcon />
              {isXLoading ? "Redirecting..." : "Continue with X"}
            </Button>
          </Form>

          {/* Email/password signup temporarily disabled due to bot abuse */}

          <div className="flex items-center justify-between pt-1">
            <p className="text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link to="/login" className="font-semibold text-foreground underline underline-offset-4 hover:text-primary">
                Login
              </Link>
            </p>
            <Link to="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              ← Back to home
            </Link>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
    </svg>
  );
}

function XIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.253 5.622 5.91-5.622Zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
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
