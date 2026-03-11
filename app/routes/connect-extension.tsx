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
    <main className="auth-page-shell">
      <section className="auth-card shiny-card">
        <p className="auth-kicker">Extension setup</p>
        <h1>Connect Chrome Extension</h1>
        <p className="dashboard-muted">
          Generate a one-time code, then paste it into the extension popup.
        </p>

        <ol className="connect-steps">
          <li>Open your extension popup.</li>
          <li>Choose <strong>Connect with code</strong>.</li>
          <li>Paste the code before it expires.</li>
        </ol>

        <Form method="post" className="auth-form">
          <button type="submit" disabled={isGenerating}>
            {isGenerating ? "Generating..." : "Generate one-time code"}
          </button>
        </Form>

        {errorMessage ? <p className="auth-error">{errorMessage}</p> : null}

        {generatedCode ? (
          <div className="connect-code-card">
            <p className="connect-code-value">{generatedCode.code}</p>
            <p className="connect-code-meta">
              Expires in {secondsLeft}s
              {secondsLeft === 0 ? " (expired)" : ""}
            </p>
            <div className="connect-code-actions">
              <button
                type="button"
                className="ghost"
                onClick={copyCode}
                disabled={secondsLeft === 0}
              >
                Copy code
              </button>
            </div>
            {copyStatus === "copied" ? (
              <p className="auth-success">Code copied to clipboard.</p>
            ) : null}
            {copyStatus === "failed" ? (
              <p className="auth-error">
                Clipboard failed. Copy the code manually.
              </p>
            ) : null}
          </div>
        ) : null}

        <div className="auth-links">
          <Link className="dashboard-nav-link" to="/">
            Back to home
          </Link>
        </div>
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
