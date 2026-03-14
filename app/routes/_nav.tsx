import { type FormEvent, useEffect, useState } from "react";
import {
  Form,
  Link,
  Outlet,
  data,
  redirect,
  useFetcher,
  useLoaderData,
  useMatch,
  useNavigate,
  useNavigation,
} from "react-router";

import type { Route } from "./+types/_nav";
import { Button } from "@/shared/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import { cn } from "@/shared/lib/utils";
import { API_ROUTES } from "~/lib/api-contract";
import { sendAuthenticatedRequest } from "~/lib/authenticated-api.server";
import { normalizeDomainInput } from "~/lib/domain-input";
import { getServerApiBaseUrl } from "~/lib/api-base-url.server";
import { destroySession, getSession } from "~/lib/session.server";
import { DashboardFooter } from "~/components/dashboard-footer";

type LaunchProjectExtractActionData = {
  intent: "project_extract";
  feedback: {
    kind: "success" | "error";
    message: string;
  };
  extract?: {
    projectId: string;
    domain: string;
  };
  extractDraftDomain?: string;
};

export async function loader({ request }: Route.LoaderArgs) {
  const session = await getSession(request.headers.get("Cookie"));
  const hasSessionTokens =
    Boolean(toOptionalString(session.get("accessToken"))) ||
    Boolean(toOptionalString(session.get("refreshToken")));

  if (!hasSessionTokens) {
    return data({ isAuthenticated: false });
  }

  const authResult = await sendAuthenticatedRequest({
    session,
    apiBaseUrl: getServerApiBaseUrl(),
    path: API_ROUTES.auth.me,
    method: "GET",
  });

  return data(
    { isAuthenticated: authResult.response.status === 200 },
    authResult.setCookie ? { headers: { "Set-Cookie": authResult.setCookie } } : undefined,
  );
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "logout") {
    const session = await getSession(request.headers.get("Cookie"));
    return redirect("/", {
      headers: { "Set-Cookie": await destroySession(session) },
    });
  }

  return data({ error: "Unsupported intent" }, { status: 400 });
}

export default function NavLayout() {
  const { isAuthenticated } = useLoaderData<typeof loader>();
  const navigation = useNavigation();
  const navigate = useNavigate();
  const launchNewFetcher = useFetcher<LaunchProjectExtractActionData>();
  const [isLaunchNewDialogOpen, setIsLaunchNewDialogOpen] = useState(false);
  const [launchDomainInput, setLaunchDomainInput] = useState("");
  const [launchNewError, setLaunchNewError] = useState<string | null>(null);
  const isLoggingOut =
    navigation.state !== "idle" && navigation.formData?.get("intent") === "logout";
  const isCreatingProject = launchNewFetcher.state !== "idle";
  const dashboardMatch = useMatch("/dashboard");
  const navLinkButtonBaseClass =
    "inline-flex items-center justify-center gap-2 rounded-lg border-2 border-foreground px-4 py-2 text-sm font-bold no-underline shadow-[var(--shadow-btn)] transition-all hover:-translate-x-px hover:-translate-y-px hover:shadow-[var(--shadow-md)] active:translate-x-px active:translate-y-px active:shadow-[var(--shadow-pressed)]";
  const navLinkButtonPrimaryClass = `${navLinkButtonBaseClass}`;
  const loginClasses = `bg-primary ${navLinkButtonPrimaryClass}`;
  const signupClasses = `bg-accent text-secondary-foreground ${navLinkButtonPrimaryClass}`;
  const launchNewClasses = `bg-primary ${navLinkButtonPrimaryClass}`;
  const dashboardClasses = cn(
    navLinkButtonBaseClass,
    "bg-secondary text-secondary-foreground",
    dashboardMatch && "underline underline-offset-4 decoration-2",
  );

  useEffect(() => {
    const result = launchNewFetcher.data;
    if (!result || result.intent !== "project_extract") {
      return;
    }

    if (result.feedback.kind === "success" && result.extract?.projectId) {
      setIsLaunchNewDialogOpen(false);
      setLaunchDomainInput("");
      setLaunchNewError(null);
      navigate(`/dashboard?project=${encodeURIComponent(result.extract.projectId)}`);
      return;
    }

    setLaunchNewError(result.feedback.message);
  }, [launchNewFetcher.data, navigate]);

  function handleOpenLaunchNewDialog() {
    setLaunchNewError(null);
    setIsLaunchNewDialogOpen(true);
  }

  function handleLaunchDialogOpenChange(nextOpen: boolean) {
    setIsLaunchNewDialogOpen(nextOpen);
    if (!nextOpen && launchNewFetcher.state === "idle") {
      setLaunchNewError(null);
    }
  }

  function handleLaunchNewSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isCreatingProject) {
      return;
    }

    const normalized = normalizeDomainInput(launchDomainInput);
    if (!normalized.ok) {
      setLaunchNewError(normalized.error);
      return;
    }

    setLaunchNewError(null);
    setLaunchDomainInput(normalized.normalizedUrl);

    const formData = new FormData(event.currentTarget);
    formData.set("domain_url", normalized.normalizedUrl);

    launchNewFetcher.submit(formData, {
      method: "post",
      action: "/dashboard",
    });
  }

  return (
    <main className="flex min-h-screen flex-col pt-4">
      <header className="sticky top-0 z-20 pt-3 pb-2 sm:pt-4 sm:pb-3">
        <div className="mx-auto w-[min(1200px,calc(100vw-2rem))] max-[960px]:w-[min(1200px,calc(100vw-1rem))]">
          <nav className="flex flex-wrap items-center justify-between gap-3 rounded-[1.25rem] border-2 border-foreground bg-card px-3 py-2.5 shadow-[var(--shadow-md)] sm:gap-4 sm:px-4 sm:py-3">
            <Link className="group inline-flex items-center gap-2 no-underline sm:gap-3" to="/">
              <img
                src="/static/donkey.png"
                alt="Donkey Directories"
                className="block h-9 w-9 object-contain transition-transform duration-300 group-hover:scale-110 sm:h-12 sm:w-12"
              />
              <span>
                <strong className="font-[Fredoka,_Nunito,_ui-sans-serif,_system-ui,_sans-serif] text-xl font-bold tracking-[-0.02em] text-primary [-webkit-text-stroke:3px_hsl(var(--foreground))] [paint-order:stroke_fill] sm:text-3xl">
                  Donkey Directories
                </strong>
              </span>
            </Link>

            {!isAuthenticated ? (
              <div className="flex flex-wrap items-center gap-3">
                <Link className={loginClasses} to="/login">
                  Login
                </Link>
                <Link className={`${signupClasses} max-sm:hidden`} to="/signup">
                  Sign up
                </Link>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  className={launchNewClasses}
                  onClick={handleOpenLaunchNewDialog}
                >
                  Launch New
                </button>

                <Link to="/dashboard" className={dashboardClasses}>
                  Dashboard
                </Link>

                <Form method="post">
                  <Button type="submit" variant="destructive" name="intent" value="logout">
                    {isLoggingOut ? "Logging out..." : "Logout"}
                  </Button>
                </Form>
              </div>
            )}
          </nav>
        </div>
      </header>

      <Dialog open={isLaunchNewDialogOpen} onOpenChange={handleLaunchDialogOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Launch new project</DialogTitle>
            <DialogDescription>
              Enter a domain URL and we will create the project, then send you to the dashboard.
            </DialogDescription>
          </DialogHeader>

          <launchNewFetcher.Form
            method="post"
            action="/dashboard"
            className="grid gap-2"
            onSubmit={handleLaunchNewSubmit}
          >
            <input type="hidden" name="intent" value="project_extract" />

            <label className="grid gap-1.5">
              <span className="text-[0.8rem] font-bold uppercase tracking-[0.03em]">Domain URL</span>
              <Input
                name="domain_url"
                type="text"
                inputMode="url"
                autoCapitalize="none"
                spellCheck={false}
                placeholder="example.com or https://example.com"
                value={launchDomainInput}
                onChange={(event) => {
                  setLaunchDomainInput(event.target.value);
                  if (launchNewError) {
                    setLaunchNewError(null);
                  }
                }}
                required
              />
            </label>

            {launchNewError ? (
              <p className="m-0 rounded-lg border-2 border-foreground border-l-4 border-l-destructive bg-destructive/12 p-3 text-sm font-semibold text-destructive">
                {launchNewError}
              </p>
            ) : null}

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsLaunchNewDialogOpen(false)}
                disabled={isCreatingProject}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isCreatingProject}>
                {isCreatingProject ? "Creating..." : "Create Project"}
              </Button>
            </div>
          </launchNewFetcher.Form>
        </DialogContent>
      </Dialog>

      <div className="flex-1 pb-10">
        <Outlet />
      </div>
      <DashboardFooter />
    </main>
  );
}

function toOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}
