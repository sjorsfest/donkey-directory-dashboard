import { useEffect, useState } from "react";
import { Form, data, redirect, useActionData, useNavigation } from "react-router";

import type { Route } from "./+types/extensions";
import { Button } from "@/shared/ui/button";
import { CheckCircle2, Chrome, Zap, Puzzle } from "lucide-react";
import {
  API_ROUTES,
  isCreateExtensionConnectCodeResponse,
  type CreateExtensionConnectCodeRequest,
} from "~/lib/api-contract";
import {
  parseApiErrorMessage,
  sendAuthenticatedRequest,
} from "~/lib/authenticated-api.server";
import { getServerApiBaseUrl } from "~/lib/api-base-url.server";
import { getSession } from "~/lib/session.server";

type ActionFeedback = { kind: "success" | "error"; message: string };

type ConnectCode = {
  code: string;
  expiresAt: string;
  expiresInSeconds: number;
  generatedAt: string;
};

type ExtensionsActionData = {
  intent: "extension_connect_generate";
  feedback: ActionFeedback;
  connectCode?: ConnectCode;
};

const PANEL_CLASS =
  "rounded-lg border-2 border-foreground bg-card p-5 shadow-[var(--shadow-md)]";
const ERROR_CLASS =
  "m-0 rounded-lg border-2 border-foreground border-l-4 border-l-destructive bg-destructive/12 p-3 text-sm font-semibold text-destructive";
const MUTED_TEXT_CLASS = "text-muted-foreground";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Extensions | Donkey Directories Dashboard" },
    { name: "description", content: "Manage your connected browser extensions." },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const session = await getSession(request.headers.get("Cookie"));
  const hasTokens =
    Boolean(toOptionalString(session.get("accessToken"))) ||
    Boolean(toOptionalString(session.get("refreshToken")));

  if (!hasTokens) return redirect("/login");

  const authCheck = await sendAuthenticatedRequest({
    session,
    apiBaseUrl: getServerApiBaseUrl(),
    path: API_ROUTES.auth.me,
    method: "GET",
  });

  if (authCheck.response.status !== 200) {
    return redirect("/login", {
      headers: authCheck.setCookie ? { "Set-Cookie": authCheck.setCookie } : undefined,
    });
  }

  return data(
    {},
    authCheck.setCookie ? { headers: { "Set-Cookie": authCheck.setCookie } } : undefined,
  );
}

export async function action({ request }: Route.ActionArgs) {
  const session = await getSession(request.headers.get("Cookie"));
  const apiBaseUrl = getServerApiBaseUrl();

  const payload: CreateExtensionConnectCodeRequest = { client: "chrome_extension" };

  const result = await sendAuthenticatedRequest({
    session,
    apiBaseUrl,
    path: API_ROUTES.auth.extensionConnectCodes,
    method: "POST",
    body: payload,
  });

  const setCookieHeaders = result.setCookie
    ? { "Set-Cookie": result.setCookie }
    : undefined;

  if (result.response.status === 401) {
    return redirect("/login", { headers: setCookieHeaders });
  }

  if (!result.response.ok || !isCreateExtensionConnectCodeResponse(result.responseData)) {
    return data<ExtensionsActionData>(
      {
        intent: "extension_connect_generate",
        feedback: {
          kind: "error",
          message: parseApiErrorMessage(
            result.responseData,
            `Could not generate code (HTTP ${result.response.status}).`,
          ),
        },
      },
      { status: result.response.ok ? 502 : result.response.status, headers: setCookieHeaders },
    );
  }

  return data<ExtensionsActionData>(
    {
      intent: "extension_connect_generate",
      feedback: { kind: "success", message: "One-time code generated." },
      connectCode: {
        code: result.responseData.code,
        expiresAt: result.responseData.expires_at,
        expiresInSeconds: result.responseData.expires_in_seconds,
        generatedAt: new Date().toISOString(),
      },
    },
    { headers: setCookieHeaders },
  );
}

export default function ExtensionsPage() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isGenerating = navigation.state !== "idle";

  const generatedCode =
    actionData?.intent === "extension_connect_generate" &&
    actionData.feedback.kind === "success" &&
    actionData.connectCode
      ? actionData.connectCode
      : null;

  const [secondsLeft, setSecondsLeft] = useState(0);
  const [copyStatus, setCopyStatus] = useState<null | "copied" | "failed">(null);

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
      setSecondsLeft(Math.max(0, Math.ceil((expiresAtMs - Date.now()) / 1000)));
    };

    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [generatedCode?.expiresAt]);

  async function copyCode() {
    if (!generatedCode?.code) return;
    try {
      await navigator.clipboard.writeText(generatedCode.code);
      setCopyStatus("copied");
    } catch {
      setCopyStatus("failed");
    }
  }

  return (
    <div className="mx-auto w-[min(1200px,calc(100vw-2rem))] max-[960px]:w-[min(1200px,calc(100vw-1rem))] py-8 space-y-6">
      <div>
        <p className="text-[0.8rem] font-bold uppercase tracking-[0.05em] text-muted-foreground">
          Integrations
        </p>
        <h1 className="m-0 text-[1.4rem] leading-[1.1] font-extrabold sm:text-[1.75rem]">
          Extensions
        </h1>
      </div>

      {/* Chrome Extension card */}
      <div className={PANEL_CLASS}>
        <div className="h-[3px] -mx-5 -mt-5 mb-5 rounded-t-lg bg-primary" />

        <div className="flex flex-col gap-6 sm:flex-row sm:gap-10">
          {/* Left: info */}
          <div className="flex flex-1 flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-foreground bg-foreground px-3 py-1 text-xs font-bold text-background">
                <Chrome className="h-3 w-3" />
                Chrome Extension
              </span>
            </div>
            <h2 className="m-0 text-xl font-extrabold leading-tight">
              Fill directory listings in one click
            </h2>
            <p className="m-0 text-sm leading-relaxed text-muted-foreground">
              The extension auto-fills your brand and creator details into directory submission
              forms — no more copy-pasting the same info over and over.
            </p>
            <ul className="m-0 grid list-none gap-1.5 p-0">
              {[
                "Auto-fills brand name, bio, socials & tags",
                "Works across hundreds of directory sites",
                "Always in sync with your dashboard",
              ].map((text) => (
                <li key={text} className="flex items-center gap-2 text-sm font-semibold">
                  <span className="h-2 w-2 shrink-0 rounded-full border-2 border-foreground bg-primary" />
                  {text}
                </li>
              ))}
            </ul>
            <div className="mt-2">
              <a
                href="https://chromewebstore.google.com/detail/donkey-directories/blphoelcahjoemkagpmeabpedloiepnm"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border-2 border-foreground bg-primary px-4 py-2 text-sm font-bold text-primary-foreground no-underline shadow-[var(--shadow-btn)] transition-all hover:-translate-x-px hover:-translate-y-px hover:shadow-[var(--shadow-md)] active:translate-x-px active:translate-y-px active:shadow-[var(--shadow-pressed)]"
              >
                <Chrome className="h-4 w-4" />
                Install the Extension
              </a>
            </div>
          </div>

          {/* Right: link account */}
          <div className="flex flex-col justify-start gap-3 sm:w-[220px] sm:shrink-0">
            <div>
              <p className="m-0 text-[0.7rem] font-bold uppercase tracking-widest text-muted-foreground mb-1">
                Link your account
              </p>
              <p className="m-0 text-xs text-muted-foreground">
                Generate a one-time code and paste it into the extension popup to connect it to
                your account.
              </p>
            </div>

            <Form method="post" className="flex flex-col gap-2">
              <Button type="submit" disabled={isGenerating}>
                <Zap className="mr-1.5 h-4 w-4" />
                {isGenerating ? "Generating..." : "Generate one-time code"}
              </Button>

              {actionData?.intent === "extension_connect_generate" &&
              actionData.feedback.kind === "error" ? (
                <p className={ERROR_CLASS} style={{ margin: 0 }}>
                  {actionData.feedback.message}
                </p>
              ) : null}
            </Form>

            {generatedCode ? (
              <div className="grid gap-3 rounded-md border-2 border-foreground bg-secondary p-3.5">
                <p className="m-0 font-['IBM_Plex_Mono',monospace] text-xl font-bold tracking-[0.06em] sm:text-[1.6rem]">
                  {generatedCode.code}
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <small className={MUTED_TEXT_CLASS}>
                    Expires in {secondsLeft}s{secondsLeft === 0 ? " — expired" : ""}
                  </small>
                  <Button
                    type="button"
                    variant={copyStatus === "copied" ? "outline" : "default"}
                    onClick={copyCode}
                    disabled={secondsLeft === 0}
                  >
                    {copyStatus === "copied" ? (
                      <>
                        <CheckCircle2
                          style={{ width: "1rem", height: "1rem", marginRight: "0.375rem" }}
                        />
                        Copied!
                      </>
                    ) : (
                      "Copy code"
                    )}
                  </Button>
                </div>
                {copyStatus === "failed" ? (
                  <p className={ERROR_CLASS} style={{ margin: 0 }}>
                    Clipboard failed. Copy the code manually.
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* Empty state for connected extensions — no list API yet */}
      <div className={PANEL_CLASS}>
        <div className="flex items-center gap-2 mb-3">
          <Puzzle className="h-4 w-4 text-muted-foreground" />
          <p className="m-0 text-[0.75rem] font-bold uppercase tracking-[0.05em] text-muted-foreground">
            Connected extensions
          </p>
        </div>
        <div className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-foreground/20 px-4 py-8 text-center text-muted-foreground">
          <p className="m-0 text-sm">
            Generate a one-time code above and paste it into the extension popup to link it to
            your account.
          </p>
        </div>
      </div>
    </div>
  );
}

function toOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}
