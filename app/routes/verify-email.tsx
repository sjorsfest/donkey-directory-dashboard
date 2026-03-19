import { useEffect, useState } from "react";
import { Form, data, redirect, useActionData, useLoaderData, useNavigation, useRevalidator } from "react-router";
import type { Route } from "./+types/verify-email";
import { sendAuthenticatedRequest } from "~/lib/authenticated-api.server";
import { getServerApiBaseUrl } from "~/lib/api-base-url.server";
import { getSession } from "~/lib/session.server";
import { SupportWidget } from "~/components/SupportWidget";
import { Alert, AlertDescription } from "@/shared/ui/alert";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Verify your email | Donkey Directories Dashboard" },
    { name: "description", content: "Check your inbox and verify your email address." },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const session = await getSession(request.headers.get("Cookie"));
  const accessToken = session.get("accessToken");
  const refreshToken = session.get("refreshToken");
  const hasTokens =
    (typeof accessToken === "string" && accessToken.length > 0) ||
    (typeof refreshToken === "string" && refreshToken.length > 0);

  if (!hasTokens) {
    return redirect("/login");
  }

  const apiBaseUrl = getServerApiBaseUrl();
  const meResult = await sendAuthenticatedRequest({
    session,
    apiBaseUrl,
    path: "/api/v1/auth/me",
    method: "GET",
  });

  const meData = meResult.responseData;
  const emailVerified =
    meResult.response.status === 200 &&
    typeof meData === "object" &&
    meData !== null &&
    "email_verified" in meData &&
    (meData as Record<string, unknown>).email_verified === true;

  if (emailVerified) {
    return redirect("/", {
      headers: meResult.setCookie ? { "Set-Cookie": meResult.setCookie } : undefined,
    });
  }

  const email =
    meResult.response.status === 200 &&
    typeof meData === "object" &&
    meData !== null &&
    "email" in meData &&
    typeof (meData as Record<string, unknown>).email === "string"
      ? ((meData as Record<string, unknown>).email as string)
      : null;

  return data(
    { email },
    {
      headers: meResult.setCookie ? { "Set-Cookie": meResult.setCookie } : undefined,
    },
  );
}

export async function action({ request }: Route.ActionArgs) {
  const session = await getSession(request.headers.get("Cookie"));
  const apiBaseUrl = getServerApiBaseUrl();

  const resendResult = await sendAuthenticatedRequest({
    session,
    apiBaseUrl,
    path: "/api/v1/auth/verify-email/resend",
    method: "POST",
  });

  const headers: Record<string, string> = {};
  if (resendResult.setCookie) {
    headers["Set-Cookie"] = resendResult.setCookie;
  }

  if (!resendResult.response.ok) {
    return data(
      { success: false, error: "Failed to resend verification email. Please try again." },
      { status: resendResult.response.status, headers },
    );
  }

  return data({ success: true, error: null }, { headers });
}

const RESEND_COOLDOWN_SECONDS = 90;

export default function VerifyEmailPage() {
  const { email } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state !== "idle";

  const [secondsLeft, setSecondsLeft] = useState(RESEND_COOLDOWN_SECONDS);
  const revalidator = useRevalidator();

  // Poll every 5s — the loader will redirect to / once email_verified is true
  useEffect(() => {
    const id = setInterval(() => {
      if (revalidator.state === "idle") revalidator.revalidate();
    }, 5000);
    return () => clearInterval(id);
  }, [revalidator]);

  // Reset cooldown after a successful resend
  useEffect(() => {
    if (actionData?.success) {
      setSecondsLeft(RESEND_COOLDOWN_SECONDS);
    }
  }, [actionData]);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const id = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [secondsLeft]);

  const canResend = secondsLeft === 0 && !isSubmitting;

  return (
    <main className="min-h-screen grid place-items-center p-6">
      <Card className="w-full max-w-xl">
        <CardHeader className="space-y-2">
          <p className="text-sm text-muted-foreground">Almost there</p>
          <CardTitle>Check your inbox</CardTitle>
          <CardDescription>
            We sent a verification link to{" "}
            {email ? <strong>{email}</strong> : "your email address"}. Click the
            link to activate your account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {actionData?.success ? (
            <Alert>
              <AlertDescription>
                Verification email resent. Check your inbox (and spam folder).
              </AlertDescription>
            </Alert>
          ) : null}

          {actionData?.error ? (
            <Alert variant="destructive">
              <AlertDescription>{actionData.error}</AlertDescription>
            </Alert>
          ) : null}

          <p className="text-sm text-muted-foreground">
            Didn't receive it? Check your spam folder or request a new one.
          </p>

          <Form method="post">
            <Button type="submit" disabled={!canResend} className="w-full">
              {isSubmitting
                ? "Sending..."
                : secondsLeft > 0
                  ? `Resend in ${secondsLeft}s`
                  : "Resend verification email"}
            </Button>
          </Form>
        </CardContent>
      </Card>

      {email ? (
        <SupportWidget
          accountId="cmko8jp0i0000lo09ghgzcul5"
          email={email}
        />
      ) : null}
    </main>
  );
}
