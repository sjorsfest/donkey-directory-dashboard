import { type ComponentType, type FormEvent, useEffect, useState } from "react";
import {
  Form,
  Link,
  Outlet,
  data,
  redirect,
  useFetcher,
  useLoaderData,
  useLocation,
  useMatch,
  useNavigate,
  useNavigation,
} from "react-router";

import type { Route } from "./+types/_nav";
import type { ApiUserResponse } from "~/lib/api-contract";
import { Button } from "@/shared/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";
import { cn } from "@/shared/lib/utils";
import { Instagram, Linkedin, Music2, Twitter, Youtube } from "lucide-react";
import { API_ROUTES } from "~/lib/api-contract";
import { sendAuthenticatedRequest } from "~/lib/authenticated-api.server";
import { normalizeDomainInput } from "~/lib/domain-input";
import { getServerApiBaseUrl } from "~/lib/api-base-url.server";
import { destroySession, getSession } from "~/lib/session.server";
import { DashboardFooter } from "~/components/dashboard-footer";
import { SupportWidget } from "~/components/SupportWidget";

type StapleSocialKey = "website" | "instagram" | "linkedin" | "x" | "youtube" | "tiktok";
type StapleSocialValues = Record<StapleSocialKey, string>;
type SocialLinkInput = { label: string; url: string };
type StapleSocialConfig = {
  key: StapleSocialKey;
  label: string;
  placeholder: string;
  Icon: ComponentType<{ className?: string }>;
};

const STAPLE_SOCIAL_CONFIGS: StapleSocialConfig[] = [
  { key: "instagram", label: "Instagram", placeholder: "https://instagram.com/yourhandle", Icon: Instagram },
  { key: "linkedin", label: "LinkedIn", placeholder: "https://linkedin.com/in/yourprofile", Icon: Linkedin },
  { key: "x", label: "X (Twitter)", placeholder: "https://x.com/yourhandle", Icon: Twitter },
  { key: "youtube", label: "YouTube", placeholder: "https://youtube.com/@yourchannel", Icon: Youtube },
  { key: "tiktok", label: "TikTok", placeholder: "https://tiktok.com/@yourhandle", Icon: Music2 },
];

function createEmptyStapleSocialValues(): StapleSocialValues {
  return { website: "", instagram: "", linkedin: "", x: "", youtube: "", tiktok: "" };
}

function stapleSocialValuesToEntries(values: StapleSocialValues): SocialLinkInput[] {
  return STAPLE_SOCIAL_CONFIGS.reduce<SocialLinkInput[]>((acc, config) => {
    const url = values[config.key].trim();
    if (url) acc.push({ label: config.label, url });
    return acc;
  }, []);
}

type LaunchProjectExtractActionData = {
  intent: "project_extract" | "creator_create_quick";
  feedback: {
    kind: "success" | "error";
    message: string;
  };
  extract?: {
    projectId: string;
    domain: string;
  };
  extractDraftDomain?: string;
  creatorDraft?: {
    projectId: string;
    fullName: string;
    bio: string;
    socialLinks: SocialLinkInput[];
  };
};

export async function loader({ request }: Route.LoaderArgs) {
  const session = await getSession(request.headers.get("Cookie"));
  const hasSessionTokens =
    Boolean(toOptionalString(session.get("accessToken"))) ||
    Boolean(toOptionalString(session.get("refreshToken")));

  if (!hasSessionTokens) {
    return data({ isAuthenticated: false, userEmail: null });
  }

  const authResult = await sendAuthenticatedRequest({
    session,
    apiBaseUrl: getServerApiBaseUrl(),
    path: API_ROUTES.auth.me,
    method: "GET",
  });

  const isAuthenticated = authResult.response.status === 200;
  const userEmail = isAuthenticated
    ? (authResult.responseData as ApiUserResponse).email
    : null;

  return data(
    { isAuthenticated, userEmail },
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

function deriveNameFromEmail(email: string): string {
  const local = email.split("@")[0];
  return local
    .split(/[._\-+]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default function NavLayout() {
  const { isAuthenticated, userEmail } = useLoaderData<typeof loader>();
  const location = useLocation();
  const navigation = useNavigation();
  const navigate = useNavigate();
  const launchNewFetcher = useFetcher<LaunchProjectExtractActionData>();
  const [isLaunchNewDialogOpen, setIsLaunchNewDialogOpen] = useState(false);
  const [launchDomainInput, setLaunchDomainInput] = useState("");
  const [launchNewError, setLaunchNewError] = useState<string | null>(null);
  const [launchDialogStep, setLaunchDialogStep] = useState<1 | 2>(1);
  const [launchDialogProjectId, setLaunchDialogProjectId] = useState<string | null>(null);
  const [creatorFullName, setCreatorFullName] = useState("");
  const [creatorBio, setCreatorBio] = useState("");
  const [creatorSocialValues, setCreatorSocialValues] = useState<StapleSocialValues>(createEmptyStapleSocialValues());
  const [creatorError, setCreatorError] = useState<string | null>(null);
  const isLoggingOut =
    navigation.state !== "idle" && navigation.formData?.get("intent") === "logout";
  const fetcherIntent = launchNewFetcher.formData?.get("intent");
  const isCreatingProject = launchNewFetcher.state !== "idle" && fetcherIntent === "project_extract";
  const isCreatingCreator = launchNewFetcher.state !== "idle" && fetcherIntent === "creator_create_quick";
  const dashboardMatch = useMatch("/dashboard");

  const navLinkButtonBaseClass =
    "inline-flex items-center justify-center gap-1.5 rounded-lg border-2 border-foreground px-2.5 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-bold no-underline shadow-[var(--shadow-btn)] transition-all hover:-translate-x-px hover:-translate-y-px hover:shadow-[var(--shadow-md)] active:translate-x-px active:translate-y-px active:shadow-[var(--shadow-pressed)]";
  const navLinkButtonPrimaryClass = `${navLinkButtonBaseClass}`;
  const loginClasses = `bg-primary ${navLinkButtonPrimaryClass}`;
  const signupClasses = `bg-accent-300 text-secondary-foreground ${navLinkButtonPrimaryClass}`;
  const launchNewClasses = `bg-primary ${navLinkButtonPrimaryClass}`;
  const dashboardClasses = cn(
    navLinkButtonBaseClass,
    "bg-secondary text-secondary-foreground",
    dashboardMatch && "underline underline-offset-4 decoration-2",
  );

  useEffect(() => {
    const result = launchNewFetcher.data;
    if (!result) return;

    if (result.intent === "project_extract") {
      if (result.feedback.kind === "success" && result.extract?.projectId) {
        setLaunchDialogProjectId(result.extract.projectId);
        setLaunchDialogStep(2);
        setLaunchNewError(null);
        setCreatorFullName("");
        setCreatorBio("");
        setCreatorSocialValues(createEmptyStapleSocialValues());
        setCreatorError(null);
        return;
      }
      setLaunchNewError(result.feedback.message);
    }

    if (result.intent === "creator_create_quick" && result.feedback.kind === "error") {
      setCreatorError(result.feedback.message);
      if (result.creatorDraft) {
        setCreatorFullName(result.creatorDraft.fullName);
        setCreatorBio(result.creatorDraft.bio);
      }
    }
  }, [launchNewFetcher.data]);

  function handleOpenLaunchNewDialog() {
    setLaunchNewError(null);
    setLaunchDialogStep(1);
    setLaunchDialogProjectId(null);
    setCreatorFullName("");
    setCreatorBio("");
    setCreatorSocialValues(createEmptyStapleSocialValues());
    setCreatorError(null);
    setIsLaunchNewDialogOpen(true);
  }

  function handleLaunchDialogOpenChange(nextOpen: boolean) {
    setIsLaunchNewDialogOpen(nextOpen);
    if (!nextOpen && launchNewFetcher.state === "idle") {
      setLaunchNewError(null);
      setCreatorError(null);
    }
  }

  function handleSkipCreator() {
    setIsLaunchNewDialogOpen(false);
    if (launchDialogProjectId) {
      navigate(`/dashboard?project=${encodeURIComponent(launchDialogProjectId)}`);
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
        <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8">
          <nav className="flex flex-wrap items-center justify-between gap-3 rounded-[1.25rem] border-2 border-foreground bg-card px-3 py-2.5 shadow-[var(--shadow-md)] sm:gap-4 sm:px-4 sm:py-3">
            <Link className="group inline-flex items-center gap-2 no-underline" to="/">
              <img
                src="/static/donkey.png"
                alt="Donkey Directories"
                className="block h-8 w-8 object-contain transition-transform duration-300 group-hover:scale-110 sm:h-10 sm:w-10"
              />
              <span className="hidden sm:inline">
                <strong className="select-none font-[Fredoka,_Nunito,_ui-sans-serif,_system-ui,_sans-serif] text-xl font-bold tracking-[-0.02em] text-primary [-webkit-text-stroke:3px_hsl(var(--foreground))] [paint-order:stroke_fill] lg:text-2xl">
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
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="hidden sm:block">
                  <button
                    type="button"
                    className={launchNewClasses}
                    onClick={handleOpenLaunchNewDialog}
                  >
                    Launch Project 🚀
                  </button>
                </div>

                <Link to="/dashboard" className={`${dashboardClasses} hidden sm:inline-flex`}>
                  Dashboard
                </Link>

                <Link to="/logout">
                  <Button type="button" variant="destructive" className="px-2.5 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm h-auto">
                    {isLoggingOut ? "Logging out..." : "Logout"}
                  </Button>
                </Link>
              </div>
            )}
          </nav>
        </div>
      </header>

      <Dialog open={isLaunchNewDialogOpen} onOpenChange={handleLaunchDialogOpenChange}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <div className="mb-1 flex gap-1.5">
              <div className={cn("h-2 w-2 rounded-full border-2 border-foreground transition-colors duration-200", launchDialogStep > 1 ? "bg-accent" : "bg-primary")} />
              <div className={cn("h-2 w-2 rounded-full border-2 border-foreground bg-muted transition-colors duration-200", launchDialogStep >= 2 && "bg-primary")} />
            </div>
            <DialogTitle>
              {launchDialogStep === 1 ? "Launch new project" : "Add creator (optional)"}
            </DialogTitle>
            <DialogDescription>
              {launchDialogStep === 1
                ? "Enter a domain URL and we will create the project, then send you to the dashboard."
                : "Add a creator to associate with this project. You can skip this step."}
            </DialogDescription>
          </DialogHeader>

          {launchDialogStep === 1 ? (
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
                    if (launchNewError) setLaunchNewError(null);
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
          ) : (
            <launchNewFetcher.Form method="post" action="/dashboard" className="grid gap-2">
              <input type="hidden" name="intent" value="creator_create_quick" />
              <input type="hidden" name="project_id" value={launchDialogProjectId ?? ""} />

              <label className="grid gap-1.5">
                <span className="text-[0.8rem] font-bold uppercase tracking-[0.03em]">Full name</span>
                <Input
                  name="full_name"
                  value={creatorFullName}
                  onChange={(event) => setCreatorFullName(event.target.value)}
                  required
                />
              </label>

              <label className="grid gap-1.5">
                <span className="text-[0.8rem] font-bold uppercase tracking-[0.03em]">Bio</span>
                <Textarea
                  name="bio"
                  rows={3}
                  value={creatorBio}
                  onChange={(event) => setCreatorBio(event.target.value)}
                />
              </label>

              <NavDialogSocialLinksInput
                values={creatorSocialValues}
                onValueChange={(key, value) => setCreatorSocialValues({ ...creatorSocialValues, [key]: value })}
              />

              {creatorError ? (
                <p className="m-0 rounded-lg border-2 border-foreground border-l-4 border-l-destructive bg-destructive/12 p-3 text-sm font-semibold text-destructive">
                  {creatorError}
                </p>
              ) : null}

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={handleSkipCreator} disabled={isCreatingCreator}>
                  Skip for now
                </Button>
                <Button type="submit" disabled={isCreatingCreator}>
                  {isCreatingCreator ? "Saving..." : "Save creator"}
                </Button>
              </div>
            </launchNewFetcher.Form>
          )}
        </DialogContent>
      </Dialog>

      {isAuthenticated && userEmail ? (
        <SupportWidget
          accountId="cmko8jp0i0000lo09ghgzcul5"
          email={userEmail}
          name={deriveNameFromEmail(userEmail)}
          metadata={{ page: location.pathname + location.search }}
        />
      ) : null}

      <div className="flex-1 pb-10">
        <Outlet />
      </div>
      <DashboardFooter />
    </main>
  );
}

function NavDialogSocialLinksInput(props: {
  values: StapleSocialValues;
  onValueChange: (key: StapleSocialKey, value: string) => void;
}) {
  const serialized = JSON.stringify(stapleSocialValuesToEntries(props.values));

  return (
    <div className="grid gap-1.5">
      <span className="text-[0.8rem] font-bold uppercase tracking-[0.03em]">Social links (optional)</span>
      <small className="text-muted-foreground">Add the links you have and leave the rest empty.</small>
      <div className="grid gap-1.5 rounded-lg border-2 border-foreground bg-card p-3">
        {STAPLE_SOCIAL_CONFIGS.map(({ key, label, placeholder, Icon }) => (
          <label key={key} className="grid grid-cols-1 items-center gap-2 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
            <span className="inline-flex items-center gap-2 text-[0.85rem] font-bold">
              <Icon className="h-4 w-4 text-muted-foreground" />
              {label}
            </span>
            <Input
              type="url"
              value={props.values[key]}
              placeholder={placeholder}
              onChange={(event) => props.onValueChange(key, event.target.value)}
            />
          </label>
        ))}
      </div>
      <input type="hidden" name="social_links_json" value={serialized} />
    </div>
  );
}

function toOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}
