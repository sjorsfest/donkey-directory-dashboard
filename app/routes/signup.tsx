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
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";

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
    <main className="min-h-screen grid place-items-center p-6">
      <Card className="w-full max-w-xl">
        <CardHeader className="space-y-2">
          <p className="text-sm text-muted-foreground">Directory access</p>
          <CardTitle>Sign Up</CardTitle>
          <CardDescription>Create your account to start using the dashboard.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {actionData?.error ? (
            <Alert variant="destructive">
              <AlertDescription>{actionData.error}</AlertDescription>
            </Alert>
          ) : null}

          <Form method="post" className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="signup-email">Email</Label>
              <Input id="signup-email" type="email" name="email" autoComplete="email" required />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="signup-password">Password</Label>
              <Input
                id="signup-password"
                type="password"
                name="password"
                autoComplete="new-password"
                required
              />
            </div>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating account..." : "Create account"}
            </Button>
          </Form>

          <div className="flex flex-wrap gap-2">
            <Button asChild variant="link" className="px-0">
              <Link to="/login">Already have an account? Login</Link>
            </Button>
            <Button asChild variant="link" className="px-0">
              <Link to="/">Back to home</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
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
