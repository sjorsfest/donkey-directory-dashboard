import { type ComponentType, type FormEvent, useEffect, useState } from "react";
import {
  Form,
  Link,
  data,
  redirect,
  useActionData,
  useLoaderData,
  useNavigate,
  useNavigation,
  useSearchParams,
} from "react-router";

import type { Route } from "./+types/launch";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";
import { Badge } from "@/shared/ui/badge";
import { cn } from "@/shared/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/shared/ui/dialog";
import {
  Globe,
  Instagram,
  Linkedin,
  Music2,
  Twitter,
  Youtube,
  ArrowLeft,
  Plus,
  CheckCircle2,
  ExternalLink,
  User,
  Zap,
  Facebook,
} from "lucide-react";
import {
  API_ROUTES,
  isCreateExtensionConnectCodeResponse,
  type ApiBrandExtractRequest,
  type CreateExtensionConnectCodeRequest,
} from "~/lib/api-contract";
import {
  parseApiErrorMessage,
  sendAuthenticatedRequest,
  type SessionType,
} from "~/lib/authenticated-api.server";
import { getServerApiBaseUrl } from "~/lib/api-base-url.server";
import { getSession } from "~/lib/session.server";
import type { components } from "~/types/api.generated";

type Project = components["schemas"]["ProjectResponse"];
type CreatorCreateRequest = components["schemas"]["CreatorCreateRequest"];
type BrandProfile = components["schemas"]["BrandProfileResponse"];
type Creator = components["schemas"]["CreatorResponse"];

type LoaderData = {
  isAuthenticated: true;
  projects: Project[];
  selectedProjectId: string | null;
  projectsError: string | null;
  brandProfile: BrandProfile | null;
  creators: Creator[];
  projectDetailError: string | null;
};

type ActionFeedback = {
  kind: "success" | "error";
  message: string;
};

type SocialLinkInput = {
  label: string;
  url: string;
};

type StapleSocialKey =
  | "website"
  | "instagram"
  | "linkedin"
  | "x"
  | "youtube"
  | "tiktok";

type StapleSocialValues = Record<StapleSocialKey, string>;

type StapleSocialConfig = {
  key: StapleSocialKey;
  label: string;
  placeholder: string;
  Icon: ComponentType<{ className?: string }>;
};

type CreatorDraft = {
  projectId: string;
  fullName: string;
  bio: string;
  socialLinks: SocialLinkInput[];
};

type LaunchActionIntent =
  | "project_extract"
  | "creator_create_quick"
  | "extension_connect_generate";

type LaunchActionData = {
  intent: LaunchActionIntent;
  feedback: ActionFeedback;
  extract?: {
    projectId: string;
    domain: string;
  };
  extractDraftDomain?: string;
  creatorDraft?: CreatorDraft;
  connectCode?: {
    code: string;
    expiresAt: string;
    expiresInSeconds: number;
    generatedAt: string;
  };
};

type ConnectCode = NonNullable<LaunchActionData["connectCode"]>;

const STAPLE_SOCIAL_CONFIGS: StapleSocialConfig[] = [
  {
    key: "website",
    label: "Website",
    placeholder: "https://example.com",
    Icon: Globe,
  },
  {
    key: "instagram",
    label: "Instagram",
    placeholder: "https://instagram.com/yourhandle",
    Icon: Instagram,
  },
  {
    key: "linkedin",
    label: "LinkedIn",
    placeholder: "https://linkedin.com/in/yourprofile",
    Icon: Linkedin,
  },
  {
    key: "x",
    label: "X (Twitter)",
    placeholder: "https://x.com/yourhandle",
    Icon: Twitter,
  },
  {
    key: "youtube",
    label: "YouTube",
    placeholder: "https://youtube.com/@yourchannel",
    Icon: Youtube,
  },
  {
    key: "tiktok",
    label: "TikTok",
    placeholder: "https://tiktok.com/@yourhandle",
    Icon: Music2,
  },
];

const BRAND_SOCIAL_KEYS = [
  { key: "website" as const, label: "Website", Icon: Globe },
  { key: "instagram" as const, label: "Instagram", Icon: Instagram },
  { key: "linkedin" as const, label: "LinkedIn", Icon: Linkedin },
  { key: "twitter" as const, label: "X (Twitter)", Icon: Twitter },
  { key: "tiktok" as const, label: "TikTok", Icon: Music2 },
  { key: "facebook" as const, label: "Facebook", Icon: Facebook },
];

const STUDIO_SHELL_CLASS =
  "mx-auto w-[min(1200px,calc(100vw-2rem))] max-[960px]:w-[min(1200px,calc(100vw-1rem))]";
const STUDIO_PANEL_CLASS = "rounded-lg border-2 border-foreground bg-card p-5 shadow-[var(--shadow-md)]";
const STUDIO_PANEL_HEADING_CLASS = "mb-4 flex flex-wrap items-start justify-between gap-4";
const STUDIO_SECTION_LABEL_CLASS =
  "text-xs font-bold uppercase tracking-[0.05em] text-muted-foreground";
const STUDIO_KICKER_CLASS =
  "text-[0.8rem] font-bold uppercase tracking-[0.05em] text-muted-foreground";
const MUTED_TEXT_CLASS = "text-muted-foreground";
const AUTH_ERROR_CLASS =
  "m-0 rounded-lg border-2 border-foreground border-l-4 border-l-destructive bg-destructive/12 p-3 text-sm font-semibold text-destructive";
const AUTH_SUCCESS_CLASS =
  "m-0 rounded-lg border-2 border-foreground border-l-4 border-l-accent-foreground bg-accent/30 p-3 text-sm font-semibold";
const EMPTY_STATE_CLASS =
  "grid gap-2 rounded-lg border-2 border-foreground border-l-4 border-l-muted-foreground bg-card p-4";
const DASHBOARD_LINK_BUTTON_CLASS =
  "inline-flex items-center justify-center gap-2 rounded-lg border-2 border-foreground bg-primary px-4 py-2 text-sm font-bold text-primary-foreground no-underline shadow-[var(--shadow-btn)] transition-all hover:-translate-x-px hover:-translate-y-px hover:shadow-[var(--shadow-md)] active:translate-x-px active:translate-y-px active:shadow-[var(--shadow-pressed)]";
const DASHBOARD_LINK_BUTTON_SMALL_CLASS = `${DASHBOARD_LINK_BUTTON_CLASS} px-2.5 py-1 text-xs`;
const TAG_LIST_CLASS = "flex flex-wrap items-center gap-2";
const DETAIL_SECTION_CLASS = "grid gap-1.5";
const DETAIL_SECTION_LABEL_CLASS =
  "text-[0.7rem] font-bold uppercase tracking-[0.05em] text-muted-foreground";
const SOCIAL_ICON_LINK_CLASS =
  "inline-flex h-8 w-8 items-center justify-center rounded-sm border-2 border-foreground bg-card text-foreground no-underline transition-[background,color,transform] duration-100 hover:-translate-x-px hover:-translate-y-px hover:bg-primary hover:text-primary-foreground";
const FIELD_CLASS = "grid gap-1.5";
const FIELD_LABEL_CLASS = "text-[0.8rem] font-bold uppercase tracking-[0.03em]";
const STEP_SUCCESS_ICON_CLASS = "animate-[scale-in_0.2s_ease-out]";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Launch Workspace | Donkey Directories Dashboard" },
    {
      name: "description",
      content:
        "View projects, create a project from domain extraction, add quick creator details, and connect the extension.",
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
  let latestSetCookie: string | null = null;

  const authCheck = await sendAuthenticatedRequest({
    session,
    apiBaseUrl,
    path: API_ROUTES.auth.me,
    method: "GET",
  });

  latestSetCookie = pickSetCookie(latestSetCookie, authCheck.setCookie);

  if (authCheck.response.status !== 200) {
    return redirect("/login", {
      headers: latestSetCookie ? { "Set-Cookie": latestSetCookie } : undefined,
    });
  }

  const projectsResult = await sendAuthenticatedRequest({
    session,
    apiBaseUrl,
    path: API_ROUTES.brand.projects,
    method: "GET",
  });

  latestSetCookie = pickSetCookie(latestSetCookie, projectsResult.setCookie);

  const projects = projectsResult.response.ok
    ? asProjectArray(projectsResult.responseData)
    : [];

  const projectsError = projectsResult.response.ok
    ? null
    : parseApiErrorMessage(
        projectsResult.responseData,
        `Failed to load projects (HTTP ${projectsResult.response.status}).`,
      );

  const requestUrl = new URL(request.url);
  const requestedProjectId = toOptionalString(requestUrl.searchParams.get("project"));
  const selectedProjectId = pickSelectedProjectId(projects, requestedProjectId);

  let brandProfile: BrandProfile | null = null;
  let creators: Creator[] = [];
  let projectDetailError: string | null = null;

  if (selectedProjectId) {
    const [brandProfileResult, creatorsResult] = await Promise.all([
      sendAuthenticatedRequest({
        session,
        apiBaseUrl,
        path: brandProfilePath(selectedProjectId),
        method: "GET",
      }),
      sendAuthenticatedRequest({
        session,
        apiBaseUrl,
        path: projectCreatorsPath(selectedProjectId),
        method: "GET",
      }),
    ]);

    latestSetCookie = pickSetCookie(latestSetCookie, brandProfileResult.setCookie);
    latestSetCookie = pickSetCookie(latestSetCookie, creatorsResult.setCookie);

    brandProfile = brandProfileResult.response.ok
      ? asBrandProfile(brandProfileResult.responseData)
      : null;

    creators = creatorsResult.response.ok
      ? asCreatorArray(creatorsResult.responseData)
      : [];

    if (!brandProfileResult.response.ok || !creatorsResult.response.ok) {
      const errResult = !brandProfileResult.response.ok
        ? brandProfileResult
        : creatorsResult;
      projectDetailError = parseApiErrorMessage(
        errResult.responseData,
        "Could not load project details.",
      );
    }
  }

  return data<LoaderData>(
    {
      isAuthenticated: true,
      projects,
      selectedProjectId,
      projectsError,
      brandProfile,
      creators,
      projectDetailError,
    },
    {
      headers: latestSetCookie ? { "Set-Cookie": latestSetCookie } : undefined,
    },
  );
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const intent = toOptionalString(formData.get("intent"));

  if (!isLaunchActionIntent(intent)) {
    return data<LaunchActionData>(
      {
        intent: "project_extract",
        feedback: {
          kind: "error",
          message: "Unsupported action intent.",
        },
      },
      { status: 400 },
    );
  }

  const session = await getSession(request.headers.get("Cookie"));
  const apiBaseUrl = getServerApiBaseUrl();

  if (intent === "project_extract") {
    return runProjectExtractAction({
      session,
      apiBaseUrl,
      domainInput: toOptionalString(formData.get("domain_url")) ?? "",
    });
  }

  if (intent === "creator_create_quick") {
    return runQuickCreatorAction({
      session,
      apiBaseUrl,
      projectId: toOptionalString(formData.get("project_id")) ?? "",
      fullName: toOptionalString(formData.get("full_name")) ?? "",
      bio: toOptionalString(formData.get("bio")) ?? "",
      socialLinksRaw: formData.get("social_links_json"),
    });
  }

  return runExtensionConnectAction({ session, apiBaseUrl });
}

export default function LaunchPage() {
  const { projects, selectedProjectId, projectsError, brandProfile, creators, projectDetailError } =
    useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const navIntent = toOptionalString(navigation.formData?.get("intent")) ?? "";
  const isBusy = navigation.state !== "idle";
  const isExtracting = isBusy && navIntent === "project_extract";
  const isCreatingCreator = isBusy && navIntent === "creator_create_quick";
  const isGeneratingConnect = isBusy && navIntent === "extension_connect_generate";

  const extractActionSuccess =
    actionData?.intent === "project_extract" &&
    actionData.feedback.kind === "success" &&
    actionData.extract
      ? actionData.extract
      : null;

  const creatorDraft =
    actionData?.intent === "creator_create_quick" ? actionData.creatorDraft : undefined;

  const creatorWasCreated = searchParams.get("creator") === "created";

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [dialogStep, setDialogStep] = useState<1 | 2>(1);
  const [dialogProjectId, setDialogProjectId] = useState<string | null>(null);
  const [creatorFullName, setCreatorFullName] = useState("");
  const [creatorBio, setCreatorBio] = useState("");
  const [creatorSocialValues, setCreatorSocialValues] = useState<StapleSocialValues>(
    createEmptyStapleSocialValues(),
  );

  const generatedCode =
    actionData?.intent === "extension_connect_generate" &&
    actionData.feedback.kind === "success" &&
    actionData.connectCode
      ? actionData.connectCode
      : null;

  const [secondsLeft, setSecondsLeft] = useState(0);
  const [copyStatus, setCopyStatus] = useState<null | "copied" | "failed">(null);

  useEffect(() => {
    if (extractActionSuccess?.projectId) {
      setDialogProjectId(extractActionSuccess.projectId);
      setDialogStep(2);
      setCreatorFullName("");
      setCreatorBio("");
      setCreatorSocialValues(createEmptyStapleSocialValues());
    }
  }, [extractActionSuccess?.projectId]);

  useEffect(() => {
    if (creatorDraft?.projectId) {
      setDialogProjectId(creatorDraft.projectId);
      setDialogStep(2);
      setCreatorFullName(creatorDraft.fullName);
      setCreatorBio(creatorDraft.bio);
      setCreatorSocialValues(socialEntriesToStapleValues(creatorDraft.socialLinks));
    }
  }, [creatorDraft]);

  useEffect(() => {
    if (creatorWasCreated) {
      setIsCreateDialogOpen(false);
      setDialogStep(1);
      setDialogProjectId(null);
      setCreatorFullName("");
      setCreatorBio("");
      setCreatorSocialValues(createEmptyStapleSocialValues());
    }
  }, [creatorWasCreated]);

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
      const remaining = Math.max(0, Math.ceil((expiresAtMs - Date.now()) / 1000));
      setSecondsLeft(remaining);
    };

    tick();
    const intervalId = window.setInterval(tick, 250);

    return () => {
      window.clearInterval(intervalId);
    };
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

  function openNewProjectDialog() {
    setDialogStep(1);
    setDialogProjectId(null);
    setCreatorFullName("");
    setCreatorBio("");
    setCreatorSocialValues(createEmptyStapleSocialValues());
    setIsCreateDialogOpen(true);
  }

  function openAddCreatorDialog() {
    setDialogStep(2);
    setDialogProjectId(selectedProjectId);
    setCreatorFullName("");
    setCreatorBio("");
    setCreatorSocialValues(createEmptyStapleSocialValues());
    setIsCreateDialogOpen(true);
  }

  function handleSkipCreator() {
    setIsCreateDialogOpen(false);
    if (dialogProjectId) {
      navigate(buildLaunchProjectHref(dialogProjectId));
    }
  }

  const selectedProject = projects.find((p) => p.id === selectedProjectId) ?? null;

  return (
    <>
      <div className={STUDIO_SHELL_CLASS}>
        {selectedProject ? (
          <ProjectDetailView
            project={selectedProject}
            brandProfile={brandProfile}
            creators={creators}
            projectDetailError={projectDetailError}
            creatorWasCreated={creatorWasCreated}
            onAddCreator={openAddCreatorDialog}
          />
        ) : (
          <ProjectListView
            projects={projects}
            projectsError={projectsError}
            onNewProject={openNewProjectDialog}
          />
        )}

        <ConnectExtensionSection
          isGeneratingConnect={isGeneratingConnect}
          actionData={actionData}
          generatedCode={generatedCode}
          secondsLeft={secondsLeft}
          copyStatus={copyStatus}
          onCopy={copyCode}
        />
      </div>

      <CreateProjectDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        step={dialogStep}
        projectId={dialogProjectId}
        isExtracting={isExtracting}
        isCreatingCreator={isCreatingCreator}
        actionData={actionData}
        creatorFullName={creatorFullName}
        setCreatorFullName={setCreatorFullName}
        creatorBio={creatorBio}
        setCreatorBio={setCreatorBio}
        creatorSocialValues={creatorSocialValues}
        setCreatorSocialValues={setCreatorSocialValues}
        onSkipCreator={handleSkipCreator}
      />
    </>
  );
}

// ─── Project List View ───────────────────────────────────────────────────────

function ProjectListView(props: {
  projects: Project[];
  projectsError: string | null;
  onNewProject: () => void;
}) {
  return (
    <section className="mt-6 grid gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className={STUDIO_KICKER_CLASS}>Launch workspace</p>
          <h1 className="m-0 text-[1.75rem] leading-[1.1] font-extrabold">
            {props.projects.length === 0 ? "Create your first project" : "Your projects"}
          </h1>
        </div>
        <Button onClick={props.onNewProject}>
          <Plus className="mr-1 h-4 w-4" />
          New project
        </Button>
      </div>

      {props.projectsError ? <p className={AUTH_ERROR_CLASS}>{props.projectsError}</p> : null}

      <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4 max-[960px]:grid-cols-1">
        <button
          type="button"
          className="flex min-h-[120px] cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-foreground bg-transparent p-5 text-center text-muted-foreground transition-[background,color,transform] duration-100 hover:-translate-x-px hover:-translate-y-px hover:bg-secondary hover:text-foreground"
          onClick={props.onNewProject}
        >
          <Plus className="mb-1.5 h-8 w-8" />
          <strong>New project</strong>
          <small>Start from a domain URL</small>
        </button>

        {props.projects.map((project) => (
          <Link
            key={project.id}
            to={buildLaunchProjectHref(project.id)}
            className="flex flex-col gap-3 rounded-lg border-2 border-foreground bg-card p-5 text-inherit no-underline shadow-[var(--shadow-md)] transition-[transform,box-shadow] duration-100 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_hsl(var(--foreground))] active:translate-x-px active:translate-y-px active:shadow-[var(--shadow-pressed)]"
          >
            <strong className="m-0 text-base leading-[1.2] font-extrabold">{project.name}</strong>
            <p className="m-0 font-['IBM_Plex_Mono',monospace] text-[0.8rem] text-muted-foreground">
              {project.domain}
            </p>
            <div className="mt-auto flex items-center justify-between text-xs">
              <Badge variant="secondary">{project.status}</Badge>
              <small>Updated {formatDate(project.updated_at)}</small>
            </div>
          </Link>
        ))}
      </div>

      {props.projects.length === 0 ? (
        <p className="pb-2 text-center text-muted-foreground">
          No projects yet. Create one to get started.
        </p>
      ) : null}
    </section>
  );
}

// ─── Project Detail View ─────────────────────────────────────────────────────

function ProjectDetailView(props: {
  project: Project;
  brandProfile: BrandProfile | null;
  creators: Creator[];
  projectDetailError: string | null;
  creatorWasCreated: boolean;
  onAddCreator: () => void;
}) {
  return (
    <>
      <div className="mt-6 mb-5 grid gap-1.5">
        <Link
          to="/launch"
          className="inline-flex w-fit items-center gap-1.5 text-sm font-bold text-muted-foreground no-underline transition-colors duration-100 hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          All projects
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="m-0 text-[1.75rem] leading-[1.1] font-extrabold">
            {props.project.name}
          </h1>
          <Badge variant="secondary">{props.project.status}</Badge>
        </div>
        <p className="m-0 font-['IBM_Plex_Mono',monospace] text-[0.8rem] text-muted-foreground">
          {props.project.domain}
        </p>
        <small className={MUTED_TEXT_CLASS}>
          Updated {formatDate(props.project.updated_at)}
        </small>
      </div>

      {props.projectDetailError ? (
        <p className={AUTH_ERROR_CLASS}>{props.projectDetailError}</p>
      ) : null}

      {props.creatorWasCreated ? (
        <p className={`${AUTH_SUCCESS_CLASS} mb-4`}>
          <CheckCircle2
            className={STEP_SUCCESS_ICON_CLASS}
            style={{
              display: "inline",
              width: "1em",
              height: "1em",
              marginRight: "0.375rem",
              verticalAlign: "middle",
            }}
          />
          Creator added successfully.
        </p>
      ) : null}

      <div className="grid grid-cols-2 gap-5 max-[960px]:grid-cols-1">
        <section className={STUDIO_PANEL_CLASS}>
          <div className={STUDIO_PANEL_HEADING_CLASS}>
            <div>
              <p className={STUDIO_SECTION_LABEL_CLASS}>Brand</p>
              <h2>Brand profile</h2>
            </div>
          </div>

          {props.brandProfile ? (
            <BrandProfileSection profile={props.brandProfile} project={props.project} />
          ) : (
            <div className={EMPTY_STATE_CLASS}>
              <strong className="text-[0.9rem]">No brand profile yet.</strong>
              <p className="m-0">Brand data will appear here after extraction.</p>
            </div>
          )}
        </section>

        <section className={STUDIO_PANEL_CLASS}>
          <div className={STUDIO_PANEL_HEADING_CLASS}>
            <div>
              <p className={STUDIO_SECTION_LABEL_CLASS}>Creators</p>
              <h2>Team</h2>
            </div>
            <Button variant="outline" onClick={props.onAddCreator}>
              <Plus className="mr-1 h-4 w-4" />
              Add creator
            </Button>
          </div>

          <div className="grid gap-3">
            {props.creators.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-foreground/30 px-4 py-8 text-center text-muted-foreground">
                <User style={{ width: "2rem", height: "2rem", opacity: 0.4 }} />
                <strong>No creators yet.</strong>
                <p>Add a creator to associate with this project.</p>
                <Button variant="outline" onClick={props.onAddCreator}>
                  <Plus className="mr-1 h-4 w-4" />
                  Add first creator
                </Button>
              </div>
            ) : (
              props.creators.map((creator) => (
                <CreatorCard
                  key={creator.id}
                  creator={creator}
                  projectId={props.project.id}
                />
              ))
            )}
          </div>
        </section>
      </div>
    </>
  );
}

// ─── Brand Profile Section ───────────────────────────────────────────────────

function BrandProfileSection(props: { profile: BrandProfile; project: Project }) {
  const { profile } = props;
  const displayName = profile.company_name ?? props.project.name;

  const socialLinks = BRAND_SOCIAL_KEYS.filter(({ key }) => {
    const val = profile[key as keyof BrandProfile];
    return typeof val === "string" && val.length > 0;
  });

  return (
    <div className="grid gap-4">
      <div>
        <strong style={{ fontSize: "1.05rem" }}>{displayName}</strong>
        {profile.tagline ? (
          <p className="mt-1 text-sm italic text-muted-foreground">{profile.tagline}</p>
        ) : null}
        {typeof profile.extraction_confidence === "number" ? (
          <span className="mt-1 inline-flex items-center gap-1.5 rounded-sm border-2 border-foreground bg-secondary px-2 py-[0.2rem] font-['IBM_Plex_Mono',monospace] text-[0.7rem] font-bold">
            {Math.round(profile.extraction_confidence * 100)}% extraction confidence
          </span>
        ) : null}
      </div>

      {profile.email || profile.website || profile.phone ? (
        <div className={DETAIL_SECTION_CLASS}>
          <p className={DETAIL_SECTION_LABEL_CLASS}>Contact</p>
          <div className="grid gap-1">
            {profile.website ? (
              <a
                href={profile.website}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm"
              >
                <Globe className="h-3.5 w-3.5 shrink-0" />
                {profile.display_website ?? profile.website}
                <ExternalLink className="h-3 w-3 shrink-0 opacity-50" />
              </a>
            ) : null}
            {profile.email ? (
              <span className="text-sm text-muted-foreground">{profile.email}</span>
            ) : null}
            {profile.phone ? (
              <span className="text-sm text-muted-foreground">{profile.phone}</span>
            ) : null}
          </div>
        </div>
      ) : null}

      {socialLinks.length > 0 ? (
        <div className={DETAIL_SECTION_CLASS}>
          <p className={DETAIL_SECTION_LABEL_CLASS}>Social</p>
          <div className="flex flex-wrap gap-1.5">
            {socialLinks.map(({ key, label, Icon }) => {
              const url = profile[key as keyof BrandProfile] as string;
              return (
                <a
                  key={key}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={SOCIAL_ICON_LINK_CLASS}
                  title={label}
                >
                  <Icon style={{ width: "1rem", height: "1rem" }} />
                </a>
              );
            })}
          </div>
        </div>
      ) : null}

      {profile.business_tags && profile.business_tags.length > 0 ? (
        <div className={DETAIL_SECTION_CLASS}>
          <p className={DETAIL_SECTION_LABEL_CLASS}>Tags</p>
          <div className={TAG_LIST_CLASS}>
            {profile.business_tags.map((tag) => (
              <Badge key={tag} variant="accent">
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      ) : null}

      {profile.tone_attributes && profile.tone_attributes.length > 0 ? (
        <div className={DETAIL_SECTION_CLASS}>
          <p className={DETAIL_SECTION_LABEL_CLASS}>Tone</p>
          <div className={TAG_LIST_CLASS}>
            {profile.tone_attributes.map((tone) => (
              <Badge key={tone} variant="secondary">
                {tone}
              </Badge>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

// ─── Creator Card ─────────────────────────────────────────────────────────────

function CreatorCard(props: { creator: Creator; projectId: string }) {
  const { creator } = props;

  const socialLinks = [
    { key: "instagram", Icon: Instagram, url: creator.instagram },
    { key: "linkedin", Icon: Linkedin, url: creator.linkedin },
    { key: "twitter", Icon: Twitter, url: creator.twitter },
    { key: "youtube", Icon: Youtube, url: creator.youtube },
    { key: "tiktok", Icon: Music2, url: creator.tiktok },
    { key: "website", Icon: Globe, url: creator.website },
  ].filter((s): s is typeof s & { url: string } => typeof s.url === "string" && s.url.length > 0);

  return (
    <div className="grid gap-2 rounded-lg border-2 border-foreground bg-card p-4 transition-[transform,box-shadow] duration-100 hover:-translate-x-px hover:-translate-y-px hover:shadow-[var(--shadow-sm)]">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="m-0 text-[0.95rem] font-extrabold">{creator.full_name}</p>
          {creator.role ? <small className={MUTED_TEXT_CLASS}>{creator.role}</small> : null}
        </div>
        <Link
          to={`/creators?project=${encodeURIComponent(props.projectId)}`}
          className={DASHBOARD_LINK_BUTTON_SMALL_CLASS}
        >
          Edit
        </Link>
      </div>

      {creator.bio ? (
        <p className="m-0 overflow-hidden text-sm text-muted-foreground [display:-webkit-box] [-webkit-line-clamp:2] [-webkit-box-orient:vertical]">
          {creator.bio}
        </p>
      ) : null}

      {socialLinks.length > 0 ? (
        <div className="mt-0.5 flex flex-wrap gap-1.5">
          {socialLinks.map(({ key, Icon, url }) => (
            <a
              key={key}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className={SOCIAL_ICON_LINK_CLASS}
            >
              <Icon className="h-3.5 w-3.5" />
            </a>
          ))}
        </div>
      ) : null}

      {creator.expertise_tags && creator.expertise_tags.length > 0 ? (
        <div className={`${TAG_LIST_CLASS} mt-0.5`}>
          {creator.expertise_tags.map((tag) => (
            <Badge key={tag} variant="secondary" style={{ fontSize: "0.7rem" }}>
              {tag}
            </Badge>
          ))}
        </div>
      ) : null}
    </div>
  );
}

// ─── Connect Extension Section ───────────────────────────────────────────────

function ConnectExtensionSection(props: {
  isGeneratingConnect: boolean;
  actionData: LaunchActionData | undefined;
  generatedCode: ConnectCode | null;
  secondsLeft: number;
  copyStatus: null | "copied" | "failed";
  onCopy: () => void;
}) {
  return (
    <section className="mt-5 mb-6 overflow-hidden rounded-lg border-2 border-foreground bg-card shadow-[var(--shadow-md)]">
      {/* Thin lime-green top stripe — cohesive with the button colour */}
      <div className="h-[3px] bg-primary" />

      <div className="flex flex-col gap-6 p-5 sm:flex-row sm:gap-10">
        {/* Left: value proposition */}
        <div className="flex flex-1 flex-col gap-3">
          <p className="m-0 text-[0.7rem] font-bold tracking-widest text-muted-foreground uppercase">
            Chrome Extension
          </p>
          <h2 className="m-0 text-xl font-extrabold leading-tight">
            Fill directory listings in one click
          </h2>
          <p className="m-0 text-sm leading-relaxed text-muted-foreground">
            The extension auto-fills your brand and creator details into directory
            submission forms — no more copy-pasting the same info over and over.
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
        </div>

        {/* Right: action */}
        <div className="flex flex-col justify-center gap-3 sm:min-w-[200px]">
          <Form method="post" className="flex flex-col gap-2">
            <Input type="hidden" name="intent" value="extension_connect_generate" />
            <Button type="submit" disabled={props.isGeneratingConnect}>
              <Zap className="mr-1.5 h-4 w-4" />
              {props.isGeneratingConnect ? "Generating..." : "Generate one-time code"}
            </Button>
            <small className="text-xs text-muted-foreground">
              Paste the code into the extension popup to link your account.
            </small>
            {props.actionData?.intent === "extension_connect_generate" &&
            props.actionData.feedback.kind === "error" ? (
              <p className={AUTH_ERROR_CLASS} style={{ margin: 0 }}>
                {props.actionData.feedback.message}
              </p>
            ) : null}
          </Form>

          {props.generatedCode ? (
            <div className="grid gap-3 rounded-md border-2 border-foreground bg-secondary p-3.5">
              <p className="m-0 font-['IBM_Plex_Mono',monospace] text-[1.6rem] font-bold tracking-[0.06em]">
                {props.generatedCode.code}
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <small className={MUTED_TEXT_CLASS}>
                  Expires in {props.secondsLeft}s
                  {props.secondsLeft === 0 ? " — expired" : ""}
                </small>
                <Button
                  type="button"
                  variant={props.copyStatus === "copied" ? "outline" : "default"}
                  onClick={props.onCopy}
                  disabled={props.secondsLeft === 0}
                >
                  {props.copyStatus === "copied" ? (
                    <>
                      <CheckCircle2
                        className={STEP_SUCCESS_ICON_CLASS}
                        style={{ width: "1rem", height: "1rem", marginRight: "0.375rem" }}
                      />
                      Copied!
                    </>
                  ) : (
                    "Copy code"
                  )}
                </Button>
              </div>
              {props.copyStatus === "failed" ? (
                <p className={AUTH_ERROR_CLASS} style={{ margin: 0 }}>
                  Clipboard failed. Copy the code manually.
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

// ─── Create Project Dialog ────────────────────────────────────────────────────

function CreateProjectDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  step: 1 | 2;
  projectId: string | null;
  isExtracting: boolean;
  isCreatingCreator: boolean;
  actionData: LaunchActionData | undefined;
  creatorFullName: string;
  setCreatorFullName: (v: string) => void;
  creatorBio: string;
  setCreatorBio: (v: string) => void;
  creatorSocialValues: StapleSocialValues;
  setCreatorSocialValues: (v: StapleSocialValues) => void;
  onSkipCreator: () => void;
}) {
  const extractError =
    props.actionData?.intent === "project_extract" &&
    props.actionData.feedback.kind === "error"
      ? props.actionData.feedback.message
      : null;

  const creatorError =
    props.actionData?.intent === "creator_create_quick" &&
    props.actionData.feedback.kind === "error"
      ? props.actionData.feedback.message
      : null;

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <div className="mb-1 flex gap-1.5">
            <div
              className={cn(
                "h-2 w-2 rounded-full border-2 border-foreground bg-muted transition-colors duration-200",
                props.step > 1 ? "bg-accent" : "bg-primary",
              )}
            />
            <div
              className={cn(
                "h-2 w-2 rounded-full border-2 border-foreground bg-muted transition-colors duration-200",
                props.step >= 2 && "bg-primary",
              )}
            />
          </div>
          <DialogTitle>
            {props.step === 1 ? "Create new project" : "Add creator (optional)"}
          </DialogTitle>
          <DialogDescription>
            {props.step === 1
              ? "Enter a domain URL to extract brand details and create a project."
              : "Add a creator to associate with this project. You can skip this step."}
          </DialogDescription>
        </DialogHeader>

        {props.step === 1 ? (
          <Form method="post" className="grid gap-1.5">
            <Input type="hidden" name="intent" value="project_extract" />

            <label className={FIELD_CLASS}>
              <span className={FIELD_LABEL_CLASS}>Domain URL</span>
              <Input
                name="domain_url"
                placeholder="https://example.com"
                defaultValue={
                  props.actionData?.intent === "project_extract"
                    ? valueOrEmpty(props.actionData.extractDraftDomain)
                    : ""
                }
                required
              />
            </label>

            {extractError ? <p className={AUTH_ERROR_CLASS}>{extractError}</p> : null}

            <div className="col-span-full flex justify-end pt-2">
              <Button type="submit" disabled={props.isExtracting}>
                {props.isExtracting ? "Extracting..." : "Extract & create project"}
              </Button>
            </div>
          </Form>
        ) : (
          <Form
            method="post"
            className="grid gap-1.5"
            onSubmit={(event: FormEvent<HTMLFormElement>) => {
              if (!props.projectId) {
                event.preventDefault();
              }
            }}
          >
            <Input type="hidden" name="intent" value="creator_create_quick" />
            <Input type="hidden" name="project_id" value={props.projectId ?? ""} />

            <label className={FIELD_CLASS}>
              <span className={FIELD_LABEL_CLASS}>Full name</span>
              <Input
                name="full_name"
                value={props.creatorFullName}
                onChange={(event) => props.setCreatorFullName(event.target.value)}
                required
              />
            </label>

            <label className={FIELD_CLASS}>
              <span className={FIELD_LABEL_CLASS}>Bio</span>
              <Textarea
                name="bio"
                rows={3}
                value={props.creatorBio}
                onChange={(event) => props.setCreatorBio(event.target.value)}
              />
            </label>

            <QuickSocialLinksInput
              values={props.creatorSocialValues}
              onValueChange={(key, value) => {
                props.setCreatorSocialValues({
                  ...props.creatorSocialValues,
                  [key]: value,
                });
              }}
              hiddenFieldName="social_links_json"
            />

            {creatorError ? <p className={AUTH_ERROR_CLASS}>{creatorError}</p> : null}

            <div className="col-span-full flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={props.onSkipCreator}>
                Skip for now
              </Button>
              <Button type="submit" disabled={props.isCreatingCreator}>
                {props.isCreatingCreator ? "Saving..." : "Save creator"}
              </Button>
            </div>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Quick Social Links Input ─────────────────────────────────────────────────

function QuickSocialLinksInput(props: {
  values: StapleSocialValues;
  onValueChange: (key: StapleSocialKey, value: string) => void;
  hiddenFieldName: string;
}) {
  const serialized = JSON.stringify(stapleSocialValuesToEntries(props.values));

  return (
    <div className={FIELD_CLASS}>
      <span className={FIELD_LABEL_CLASS}>Social links (optional)</span>
      <small className={MUTED_TEXT_CLASS}>
        Add the links you have and leave the rest empty.
      </small>

      <div className="grid gap-1.5 rounded-lg border-2 border-foreground bg-card p-3">
        {STAPLE_SOCIAL_CONFIGS.map(({ key, label, placeholder, Icon }) => (
          <label
            key={key}
            className="grid grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] items-center gap-2 max-[960px]:grid-cols-1"
          >
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

      <Input type="hidden" name={props.hiddenFieldName} value={serialized} />
    </div>
  );
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function createEmptyStapleSocialValues(): StapleSocialValues {
  return {
    website: "",
    instagram: "",
    linkedin: "",
    x: "",
    youtube: "",
    tiktok: "",
  };
}

function stapleSocialValuesToEntries(values: StapleSocialValues): SocialLinkInput[] {
  return STAPLE_SOCIAL_CONFIGS.reduce<SocialLinkInput[]>((acc, config) => {
    const url = values[config.key].trim();

    if (!url) {
      return acc;
    }

    acc.push({
      label: config.label,
      url,
    });

    return acc;
  }, []);
}

function socialEntriesToStapleValues(entries: SocialLinkInput[]): StapleSocialValues {
  const values = createEmptyStapleSocialValues();

  for (const entry of entries) {
    const key = labelToStapleKey(entry.label);
    if (!key) {
      continue;
    }

    values[key] = entry.url;
  }

  return values;
}

function labelToStapleKey(label: string): StapleSocialKey | null {
  const normalized = label.trim().toLowerCase();

  switch (normalized) {
    case "website":
      return "website";
    case "instagram":
      return "instagram";
    case "linkedin":
      return "linkedin";
    case "x":
    case "x (twitter)":
    case "twitter":
      return "x";
    case "youtube":
      return "youtube";
    case "tiktok":
      return "tiktok";
    default:
      return null;
  }
}

async function runProjectExtractAction(options: {
  session: SessionType;
  apiBaseUrl: string;
  domainInput: string;
}) {
  const normalizedDomain = normalizeDomainInput(options.domainInput);

  if (!normalizedDomain.ok) {
    return data<LaunchActionData>(
      {
        intent: "project_extract",
        feedback: {
          kind: "error",
          message: normalizedDomain.error,
        },
        extractDraftDomain: options.domainInput,
      },
      { status: 400 },
    );
  }

  const payload: ApiBrandExtractRequest = {
    domain: normalizedDomain.domain,
  };

  const result = await sendAuthenticatedRequest({
    session: options.session,
    apiBaseUrl: options.apiBaseUrl,
    path: API_ROUTES.brand.extract,
    method: "POST",
    body: payload,
  });

  const headers = buildSetCookieHeaders(result.setCookie);

  if (result.response.status === 401) {
    return redirect("/login", { headers });
  }

  if (!result.response.ok) {
    return data<LaunchActionData>(
      {
        intent: "project_extract",
        feedback: {
          kind: "error",
          message: parseApiErrorMessage(
            result.responseData,
            `Could not extract project details (HTTP ${result.response.status}).`,
          ),
        },
        extractDraftDomain: options.domainInput,
      },
      {
        status: result.response.status,
        headers,
      },
    );
  }

  const profile = asBrandProfile(result.responseData);
  if (!profile) {
    return data<LaunchActionData>(
      {
        intent: "project_extract",
        feedback: {
          kind: "error",
          message: "Extraction succeeded but response payload is invalid.",
        },
        extractDraftDomain: options.domainInput,
      },
      {
        status: 502,
        headers,
      },
    );
  }

  return data<LaunchActionData>(
    {
      intent: "project_extract",
      feedback: {
        kind: "success",
        message: "Project extracted. Continue with creator setup.",
      },
      extract: {
        projectId: profile.project_id,
        domain: normalizedDomain.domain,
      },
      extractDraftDomain: normalizedDomain.domain,
    },
    { headers },
  );
}

async function runQuickCreatorAction(options: {
  session: SessionType;
  apiBaseUrl: string;
  projectId: string;
  fullName: string;
  bio: string;
  socialLinksRaw: FormDataEntryValue | null;
}) {
  const parsedSocialLinks = parseSocialLinksFromFormData(options.socialLinksRaw);

  const creatorDraft: CreatorDraft = {
    projectId: options.projectId,
    fullName: options.fullName,
    bio: options.bio,
    socialLinks: parsedSocialLinks.entries,
  };

  if (!options.projectId) {
    return data<LaunchActionData>(
      {
        intent: "creator_create_quick",
        feedback: {
          kind: "error",
          message: "Missing project ID for creator setup.",
        },
        creatorDraft,
      },
      { status: 400 },
    );
  }

  if (!options.fullName) {
    return data<LaunchActionData>(
      {
        intent: "creator_create_quick",
        feedback: {
          kind: "error",
          message: "Creator full name is required.",
        },
        creatorDraft,
      },
      { status: 400 },
    );
  }

  if (parsedSocialLinks.error) {
    return data<LaunchActionData>(
      {
        intent: "creator_create_quick",
        feedback: {
          kind: "error",
          message: parsedSocialLinks.error,
        },
        creatorDraft,
      },
      { status: 400 },
    );
  }

  const payload: CreatorCreateRequest = {
    full_name: options.fullName,
    bio: options.bio || null,
    social_links: parsedSocialLinks.entries.length > 0 ? parsedSocialLinks.entries : null,
  };

  const result = await sendAuthenticatedRequest({
    session: options.session,
    apiBaseUrl: options.apiBaseUrl,
    path: projectCreatorsPath(options.projectId),
    method: "POST",
    body: payload,
  });

  const headers = buildSetCookieHeaders(result.setCookie);

  if (result.response.status === 401) {
    return redirect("/login", { headers });
  }

  if (!result.response.ok) {
    return data<LaunchActionData>(
      {
        intent: "creator_create_quick",
        feedback: {
          kind: "error",
          message: parseApiErrorMessage(
            result.responseData,
            `Could not create creator (HTTP ${result.response.status}).`,
          ),
        },
        creatorDraft,
      },
      {
        status: result.response.status,
        headers,
      },
    );
  }

  return redirect(`${buildLaunchProjectHref(options.projectId)}&creator=created`, {
    headers,
  });
}

async function runExtensionConnectAction(options: {
  session: SessionType;
  apiBaseUrl: string;
}) {
  const payload: CreateExtensionConnectCodeRequest = {
    client: "chrome_extension",
  };

  const result = await sendAuthenticatedRequest({
    session: options.session,
    apiBaseUrl: options.apiBaseUrl,
    path: API_ROUTES.auth.extensionConnectCodes,
    method: "POST",
    body: payload,
  });

  const headers = buildSetCookieHeaders(result.setCookie);

  if (result.response.status === 401) {
    return redirect("/login", { headers });
  }

  if (!result.response.ok) {
    return data<LaunchActionData>(
      {
        intent: "extension_connect_generate",
        feedback: {
          kind: "error",
          message: parseApiErrorMessage(
            result.responseData,
            `Failed to generate one-time code (HTTP ${result.response.status}).`,
          ),
        },
      },
      {
        status: result.response.status,
        headers,
      },
    );
  }

  if (!isCreateExtensionConnectCodeResponse(result.responseData)) {
    return data<LaunchActionData>(
      {
        intent: "extension_connect_generate",
        feedback: {
          kind: "error",
          message: "Unexpected response format while generating one-time code.",
        },
      },
      {
        status: 502,
        headers,
      },
    );
  }

  return data<LaunchActionData>(
    {
      intent: "extension_connect_generate",
      feedback: {
        kind: "success",
        message: "One-time code generated.",
      },
      connectCode: {
        code: result.responseData.code,
        expiresAt: result.responseData.expires_at,
        expiresInSeconds: result.responseData.expires_in_seconds,
        generatedAt: new Date().toISOString(),
      },
    },
    { headers },
  );
}

function isLaunchActionIntent(value: string | undefined): value is LaunchActionIntent {
  return (
    value === "project_extract" ||
    value === "creator_create_quick" ||
    value === "extension_connect_generate"
  );
}

function normalizeDomainInput(
  rawValue: string,
): { ok: true; domain: string } | { ok: false; error: string } {
  const trimmed = rawValue.trim();

  if (!trimmed) {
    return {
      ok: false,
      error: "Domain URL is required.",
    };
  }

  const withProtocol = /^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  try {
    const parsed = new URL(withProtocol);
    const normalized = parsed.hostname.toLowerCase().replace(/^www\./, "");

    if (!normalized || !normalized.includes(".")) {
      return {
        ok: false,
        error: "Enter a valid domain URL (for example https://example.com).",
      };
    }

    return {
      ok: true,
      domain: normalized,
    };
  } catch {
    return {
      ok: false,
      error: "Enter a valid domain URL (for example https://example.com).",
    };
  }
}

function parseSocialLinksFromFormData(value: FormDataEntryValue | null): {
  entries: SocialLinkInput[];
  error: string | null;
} {
  if (typeof value !== "string" || value.trim().length === 0) {
    return {
      entries: [],
      error: null,
    };
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) {
      return {
        entries: [],
        error: "Social links payload is invalid.",
      };
    }

    const entries: SocialLinkInput[] = [];

    for (const item of parsed) {
      if (!isRecord(item)) {
        continue;
      }

      const label = toOptionalString(item.label) ?? "";
      const url = toOptionalString(item.url) ?? "";

      if (!label && !url) {
        continue;
      }

      if (url && !isValidHttpUrl(url)) {
        return {
          entries,
          error: "Each social link URL must include http:// or https://.",
        };
      }

      entries.push({ label, url });
    }

    return {
      entries,
      error: null,
    };
  } catch {
    return {
      entries: [],
      error: "Social links payload is invalid.",
    };
  }
}

function brandProfilePath(projectId: string): string {
  return `/api/v1/brand/projects/${encodeURIComponent(projectId)}/brand-profile`;
}

function projectCreatorsPath(projectId: string): string {
  return `/api/v1/brand/projects/${encodeURIComponent(projectId)}/creators`;
}

function buildLaunchProjectHref(projectId: string): string {
  return `/launch?project=${encodeURIComponent(projectId)}`;
}

function pickSelectedProjectId(projects: Project[], requestedProjectId?: string): string | null {
  if (requestedProjectId && projects.some((project) => project.id === requestedProjectId)) {
    return requestedProjectId;
  }

  return null;
}

function buildSetCookieHeaders(setCookie: string | null): HeadersInit | undefined {
  return setCookie
    ? {
        "Set-Cookie": setCookie,
      }
    : undefined;
}

function pickSetCookie(current: string | null, next: string | null): string | null {
  return next ?? current;
}

function asProjectArray(value: unknown): Project[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is Project => isRecord(item) && typeof item.id === "string");
}

function asCreatorArray(value: unknown): Creator[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (item): item is Creator => isRecord(item) && typeof item.id === "string",
  );
}

function asBrandProfile(value: unknown): BrandProfile | null {
  if (!isRecord(value) || typeof value.id !== "string" || typeof value.project_id !== "string") {
    return null;
  }

  return value as BrandProfile;
}

function isValidHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function toOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function valueOrEmpty(value: string | undefined): string {
  return value ?? "";
}

function formatDate(value: string): string {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return "recently";
  }

  return parsed.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
