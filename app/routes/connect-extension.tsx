import { useEffect, useState } from "react";
import {
  Form,
  Link,
  data,
  redirect,
  useActionData,
  useNavigation,
} from "react-router";
import type { Route } from "./+types/connect-extension";
import { getServerApiBaseUrl } from "~/lib/api-base-url.server";
import {
  API_ROUTES,
  type CreateExtensionConnectCodeRequest,
  isCreateExtensionConnectCodeResponse,
} from "~/lib/api-contract";
import {
  parseApiErrorMessage,
  sendAuthenticatedRequest,
} from "~/lib/authenticated-api.server";
import { getSession } from "~/lib/session.server";
import { Alert, AlertDescription } from "@/shared/ui/alert";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { Separator } from "@/shared/ui/separator";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Connect Extension | Donkey Directory Dashboard" },
    {
      name: "description",
      content:
        "Generate a one-time code to connect your logged-in dashboard session to the Chrome extension.",
    },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const session = await getSession(request.headers.get("Cookie"));
  const hasSessionTokens =
    Boolean(toOptionalString(session.get("accessToken"))) ||
    Boolean(toOptionalString(session.get("refreshToken")));

  if (!hasSessionTokens) {
    return redirect("/login");
  }

  const apiBaseUrl = getServerApiBaseUrl();
  const authCheck = await sendAuthenticatedRequest({
    session,
    apiBaseUrl,
    path: API_ROUTES.auth.me,
    method: "GET",
  });
  const headers = authCheck.setCookie
    ? { "Set-Cookie": authCheck.setCookie }
    : undefined;

  if (authCheck.response.status !== 200) {
    return redirect("/login", { headers });
  }

  return data(null, { headers });
}

export async function action({ request }: Route.ActionArgs) {
  const session = await getSession(request.headers.get("Cookie"));
  const apiBaseUrl = getServerApiBaseUrl();
  const payload: CreateExtensionConnectCodeRequest = {
    client: "chrome_extension",
  };

  const result = await sendAuthenticatedRequest({
    session,
    apiBaseUrl,
    path: API_ROUTES.auth.extensionConnectCodes,
    method: "POST",
    body: payload,
  });
  const headers = result.setCookie
    ? { "Set-Cookie": result.setCookie }
    : undefined;

  if (result.response.status === 401) {
    return redirect("/login", { headers });
  }

  if (!result.response.ok) {
    return data(
      {
        error: parseApiErrorMessage(
          result.responseData,
          "Failed to generate connect code."
        ),
      },
      {
        status: result.response.status,
        headers,
      }
    );
  }

  if (!isCreateExtensionConnectCodeResponse(result.responseData)) {
    return data(
      {
        error: "Unexpected response format while generating connect code.",
      },
      {
        status: 500,
        headers,
      }
    );
  }

  return data(
    {
      code: result.responseData.code,
      expiresAt: result.responseData.expires_at,
      expiresInSeconds: result.responseData.expires_in_seconds,
      generatedAt: new Date().toISOString(),
    },
    {
      headers,
    }
  );
}

export default function ConnectExtensionPage() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [copyStatus, setCopyStatus] = useState<null | "copied" | "failed">(null);

  const isGenerating = navigation.state !== "idle";
  const generatedCode = actionData && "code" in actionData ? actionData : null;
  const errorMessage = actionData && "error" in actionData ? actionData.error : null;

  useEffect(() => {
    setCopyStatus(null);
  }, [generatedCode?.code]);

  useEffect(() => {
    if (!generatedCode?.expiresAt) {
      setSecondsLeft(0);
      return;
    }

    const expiresAtMs = Date.parse(generatedCode.expiresAt);
    const tick = () => {
      const remaining = Math.max(
        0,
        Math.ceil((expiresAtMs - Date.now()) / 1000)
      );
      setSecondsLeft(remaining);
    };

    tick();
    const intervalId = window.setInterval(tick, 250);
    return () => {
      window.clearInterval(intervalId);
    };
  }, [generatedCode?.expiresAt]);

  async function copyCode() {
    if (!generatedCode?.code) {
      return;
    }

    try {
      await navigator.clipboard.writeText(generatedCode.code);
      setCopyStatus("copied");
    } catch {
      setCopyStatus("failed");
    }
  }

  return (
    <main className="min-h-screen grid place-items-center p-6 bg-muted/30">
      <Card className="w-full max-w-xl">
        <CardHeader className="space-y-2">
          <p className="text-sm text-muted-foreground">Extension setup</p>
          <CardTitle>Connect Chrome Extension</CardTitle>
          <CardDescription>
            Generate a one-time code, then paste it into the extension popup.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <ol className="list-decimal pl-5 space-y-1 text-sm text-muted-foreground">
            <li>Open your extension popup.</li>
            <li>
              Choose <strong>Connect with code</strong>.
            </li>
            <li>Paste the code before it expires.</li>
          </ol>

          <Form method="post">
            <Button type="submit" disabled={isGenerating} className="w-full">
              {isGenerating ? "Generating..." : "Generate one-time code"}
            </Button>
          </Form>

          {errorMessage ? (
            <Alert variant="destructive">
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          ) : null}

          {generatedCode ? (
            <Card>
              <CardContent className="pt-6 space-y-4">
                <p className="font-mono text-3xl font-bold tracking-widest">{generatedCode.code}</p>
                <div className="flex items-center gap-2">
                  <Badge variant={secondsLeft === 0 ? "destructive" : "secondary"}>
                    Expires in {secondsLeft}s{secondsLeft === 0 ? " (expired)" : ""}
                  </Badge>
                </div>
                <Button type="button" variant="outline" onClick={copyCode} disabled={secondsLeft === 0}>
                  Copy code
                </Button>
                {copyStatus === "copied" ? (
                  <Alert>
                    <AlertDescription>Code copied to clipboard.</AlertDescription>
                  </Alert>
                ) : null}
                {copyStatus === "failed" ? (
                  <Alert variant="destructive">
                    <AlertDescription>Clipboard failed. Copy the code manually.</AlertDescription>
                  </Alert>
                ) : null}
              </CardContent>
            </Card>
          ) : null}

          <Separator />

          <Button asChild variant="link" className="px-0">
            <Link to="/">Back to home</Link>
          </Button>
        </CardContent>
      </Card>
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
