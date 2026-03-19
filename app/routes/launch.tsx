import { type ComponentType, type FormEvent, useEffect, useState } from "react";
import {
  Form,
  Link,
  data,
  redirect,
  useActionData,
  useFetcher,
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
  Plus,
  ExternalLink,
  Facebook,
} from "lucide-react";
import {
  API_ROUTES,
  type ApiBrandExtractRequest,
  type ApiProjectSubmissionCountsResponse,
  directorySubmissionCountsPath,
  isApiDirectoryVoteChoice,
} from "~/lib/api-contract";
import {
  listDirectoriesRequest,
  putDirectoryVoteRequest,
  deleteDirectoryVoteRequest,
} from "~/lib/directories-api.server";
import { ProjectSubmissionsTable } from "~/components/directories-table";
import { normalizeDomainInput } from "~/lib/domain-input";
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

type DirectorySubmissionStage = "not_submitted" | "in_progress" | "submitted";

type DirectoryWithStage = {
  id: string;
  name: string;
  domain: string;
  category?: string | null;
  is_free: boolean;
  is_dofollow: boolean;
  submission_stage: DirectorySubmissionStage;
};

type LoaderData = {
  isAuthenticated: true;
  projects: Project[];
  selectedProjectId: string | null;
  projectsError: string | null;
  brandProfile: BrandProfile | null;
  creators: Creator[];
  projectDetailError: string | null;
  directories: DirectoryWithStage[];
  directoriesTotal: number;
  submissionCounts: ApiProjectSubmissionCountsResponse | null;
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
  | "submission_stage_update"
  | "directory_vote";

type LaunchActionData = {
  intent: LaunchActionIntent;
  feedback: ActionFeedback;
  extract?: {
    projectId: string;
    domain: string;
  };
  extractDraftDomain?: string;
  creatorDraft?: CreatorDraft;
};

const STAPLE_SOCIAL_CONFIGS: StapleSocialConfig[] = [

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
  "mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8";
const STUDIO_KICKER_CLASS =
  "text-[0.8rem] font-bold uppercase tracking-[0.05em] text-muted-foreground";
const MUTED_TEXT_CLASS = "text-muted-foreground";
const AUTH_ERROR_CLASS =
  "m-0 rounded-lg border-2 border-foreground border-l-4 border-l-destructive bg-destructive/12 p-3 text-sm font-semibold text-destructive";
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

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Project Dashboard | Donkey Directories Dashboard" },
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

  const meData = authCheck.responseData;
  const emailVerified =
    typeof meData === "object" &&
    meData !== null &&
    "email_verified" in meData &&
    (meData as Record<string, unknown>).email_verified === true;

  if (!emailVerified) {
    return redirect("/verify-email", {
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
  let directories: DirectoryWithStage[] = [];
  let directoriesTotal = 0;
  let submissionCounts: ApiProjectSubmissionCountsResponse | null = null;

  if (selectedProjectId) {
    const [brandProfileResult, creatorsResult, directoriesResult, submissionCountsResult] = await Promise.all([
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
      listDirectoriesRequest({
        session,
        apiBaseUrl,
        query: { project_id: selectedProjectId, page_size: 100 },
      }),
      sendAuthenticatedRequest({
        session,
        apiBaseUrl,
        path: directorySubmissionCountsPath(selectedProjectId),
        method: "GET",
      }),
    ]);

    latestSetCookie = pickSetCookie(latestSetCookie, brandProfileResult.setCookie);
    latestSetCookie = pickSetCookie(latestSetCookie, creatorsResult.setCookie);
    latestSetCookie = pickSetCookie(latestSetCookie, directoriesResult.setCookie);

    brandProfile = brandProfileResult.response.ok
      ? asBrandProfile(brandProfileResult.responseData)
      : null;

    creators = creatorsResult.response.ok
      ? asCreatorArray(creatorsResult.responseData)
      : [];

    if (directoriesResult.response.ok && isRecord(directoriesResult.responseData)) {
      const payload = directoriesResult.responseData as Record<string, unknown>;
      if (Array.isArray(payload.directories)) {
        directories = payload.directories as DirectoryWithStage[];
      }
      if (typeof payload.total === "number") {
        directoriesTotal = payload.total;
      }
    }

    if (submissionCountsResult.response.ok && isRecord(submissionCountsResult.responseData)) {
      const payload = submissionCountsResult.responseData as Record<string, unknown>;
      if (
        typeof payload.total_directories === "number" &&
        typeof payload.submitted_directories === "number" &&
        typeof payload.skipped_directories === "number" &&
        typeof payload.completed_directories === "number"
      ) {
        submissionCounts = payload as ApiProjectSubmissionCountsResponse;
      }
    }

    latestSetCookie = pickSetCookie(latestSetCookie, submissionCountsResult.setCookie);

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
      directories,
      directoriesTotal,
      submissionCounts,
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

  if (intent === "directory_vote") {
    return runDirectoryVoteAction({
      session,
      apiBaseUrl,
      directoryId: toOptionalString(formData.get("directory_id")) ?? "",
      vote: toOptionalString(formData.get("vote")),
    });
  }

  // submission_stage_update
  return runSubmissionStageUpdateAction({
    session,
    apiBaseUrl,
    projectId: toOptionalString(formData.get("project_id")) ?? "",
    directoryId: toOptionalString(formData.get("directory_id")) ?? "",
    submissionStage: toOptionalString(formData.get("submission_stage")) ?? "",
  });
}

export default function LaunchPage() {
  const { projects, selectedProjectId, projectsError, directories, directoriesTotal, submissionCounts } =
    useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const navIntent = toOptionalString(navigation.formData?.get("intent")) ?? "";
  const isBusy = navigation.state !== "idle";
  const isExtracting = isBusy && navIntent === "project_extract";
  const isCreatingCreator = isBusy && navIntent === "creator_create_quick";

  const extractActionSuccess =
    actionData?.intent === "project_extract" &&
    actionData.feedback.kind === "success" &&
    actionData.extract
      ? actionData.extract
      : null;

  const creatorDraft =
    actionData?.intent === "creator_create_quick" ? actionData.creatorDraft : undefined;

  const creatorWasCreated = searchParams.get("creator") === "created";

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(projects.length === 0);
  const [dialogStep, setDialogStep] = useState<1 | 2>(1);
  const [dialogProjectId, setDialogProjectId] = useState<string | null>(null);
  const [creatorFullName, setCreatorFullName] = useState("");
  const [creatorBio, setCreatorBio] = useState("");
  const [creatorSocialValues, setCreatorSocialValues] = useState<StapleSocialValues>(
    createEmptyStapleSocialValues(),
  );

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

  function openNewProjectDialog() {
    setDialogStep(1);
    setDialogProjectId(null);
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
        <section className="mt-6 grid gap-5 pb-10">
          <div>
            <p className={STUDIO_KICKER_CLASS}>Launch workspace</p>
            <h1 className="m-0 text-[1.4rem] leading-[1.1] font-extrabold sm:text-[1.75rem]">
              {projects.length === 0 ? "Create your first project" : "Your projects"}
            </h1>
          </div>

          {projectsError ? <p className={AUTH_ERROR_CLASS}>{projectsError}</p> : null}

          {/* Project cards */}
          <div className="rounded-lg border-2 border-foreground bg-card shadow-[var(--shadow-md)] overflow-hidden">
          <div className="grid grid-cols-1 gap-4 p-4 lg:grid-cols-[repeat(auto-fill,minmax(260px,1fr))]">
            {projects.map((project) => {
              const isActive = project.id === selectedProjectId;
              const submittedCount = isActive
                ? (submissionCounts?.submitted_directories ?? directories.filter((d) => d.submission_stage === "submitted").length)
                : null;
              const skippedCount = isActive
                ? (submissionCounts?.skipped_directories ?? directories.filter((d) => d.submission_stage === "in_progress").length)
                : null;
              const notSubmittedCount = isActive
                ? (submissionCounts != null
                    ? submissionCounts.total_directories - submissionCounts.completed_directories
                    : directories.filter((d) => d.submission_stage === "not_submitted").length)
                : null;
              return (
                <Link
                  key={project.id}
                  to={buildLaunchProjectHref(project.id)}
                  className={cn(
                    "flex flex-col gap-3 rounded-lg border-2 border-foreground p-5 text-inherit no-underline shadow-[var(--shadow-md)] transition-[transform,box-shadow,background] duration-100 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_hsl(var(--foreground))] active:translate-x-px active:translate-y-px active:shadow-[var(--shadow-pressed)]",
                    isActive ? "bg-primary text-primary-foreground" : "bg-card",
                  )}
                >
                  <strong className="m-0 text-base leading-[1.2] font-extrabold">{project.name}</strong>
                  <p className={cn("m-0 font-['IBM_Plex_Mono',monospace] text-[0.8rem]", isActive ? "text-primary-foreground/70" : "text-muted-foreground")}>
                    {project.domain}
                  </p>
                  {isActive && submittedCount !== null ? (
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.7rem]">
                      <span className="flex items-center gap-1 whitespace-nowrap text-primary-foreground/80">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                        {submittedCount} submitted
                      </span>
                      <span className="flex items-center gap-1 whitespace-nowrap text-primary-foreground/80">
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                        {skippedCount} skipped
                      </span>
                      <span className="flex items-center gap-1 whitespace-nowrap text-primary-foreground/60">
                        <span className="h-1.5 w-1.5 rounded-full bg-primary-foreground/30" />
                        {notSubmittedCount} pending
                      </span>
                    </div>
                  ) : null}
                  <div className="mt-auto flex items-center justify-end text-xs">
                    <small className={isActive ? "text-primary-foreground/70" : "text-muted-foreground"}>Updated {formatDate(project.updated_at)}</small>
                  </div>
                </Link>
              );
            })}

            <button
              type="button"
              className="flex min-h-[120px] cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-foreground bg-transparent p-5 text-center text-muted-foreground transition-[background,color,transform] duration-100 hover:-translate-x-px hover:-translate-y-px hover:bg-secondary hover:text-foreground"
              onClick={openNewProjectDialog}
            >
              <Plus className="mb-1.5 h-8 w-8" />
              <strong>New project</strong>
              <small>Start from a domain URL</small>
            </button>
          </div>
          </div>

          {/* Submissions table or skeleton */}
          {selectedProject ? (
            <ProjectSubmissionsTable
              projectId={selectedProject.id}
              directories={directories}
              directoriesTotal={directoriesTotal}
              submissionCounts={submissionCounts}
            />
          ) : (
            <SkeletonSubmissionsTable />
          )}
        </section>
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
            {props.step === 1 ? "Add your domain" : "Add creator (optional)"}
          </DialogTitle>
          <DialogDescription>
            {props.step === 1
              ? "Add your domain so you can track where you've submitted your product across directories."
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
                {props.isExtracting ? "Loading..." : "Start submitting!"}
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
            className="grid grid-cols-1 items-center gap-2 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]"
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

// ─── Skeleton Submissions Table ──────────────────────────────────────────────

function SkeletonSubmissionsTable() {
  const ROWS = 6;
  return (
    <div className="relative">
      <div className="rounded-lg border-2 border-foreground overflow-hidden shadow-[4px_4px_0_hsl(var(--foreground))] opacity-30 pointer-events-none select-none" aria-hidden="true">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b-2 border-foreground bg-secondary">
                <th className="px-4 py-2.5 text-left text-[0.7rem] font-bold uppercase tracking-[0.05em] text-muted-foreground">Directory</th>
                <th className="px-4 py-2.5 text-left text-[0.7rem] font-bold uppercase tracking-[0.05em] text-muted-foreground hidden sm:table-cell">Domain</th>
                <th className="px-4 py-2.5 text-left text-[0.7rem] font-bold uppercase tracking-[0.05em] text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: ROWS }).map((_, i) => (
                <tr key={i} className={cn("border-b border-foreground/10 bg-card", i === ROWS - 1 && "border-b-0")}>
                  <td className="px-4 py-3"><div className="h-4 w-32 animate-pulse rounded bg-foreground/15" /></td>
                  <td className="px-4 py-3 hidden sm:table-cell"><div className="h-3.5 w-24 animate-pulse rounded bg-foreground/15" /></td>
                  <td className="px-4 py-3"><div className="h-7 w-28 animate-pulse rounded-lg bg-foreground/15" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center px-4">
        <p className="m-0 text-base font-extrabold">Add your app to start tracking its submissions</p>
        <p className="m-0 text-sm text-muted-foreground max-w-xs">Create a project from your domain URL and we will populate the directory list for you.</p>
      </div>
    </div>
  );
}

// ─── Directory Submissions Section ───────────────────────────────────────────

const STAGE_LABELS: Record<DirectorySubmissionStage, string> = {
  not_submitted: "Not submitted",
  in_progress: "In progress",
  submitted: "Submitted",
};


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

async function runSubmissionStageUpdateAction(options: {
  session: SessionType;
  apiBaseUrl: string;
  projectId: string;
  directoryId: string;
  submissionStage: string;
}) {
  const validStages: DirectorySubmissionStage[] = ["not_submitted", "in_progress", "submitted"];

  if (!validStages.includes(options.submissionStage as DirectorySubmissionStage)) {
    return data<LaunchActionData>(
      { intent: "submission_stage_update", feedback: { kind: "error", message: "Invalid submission stage." } },
      { status: 400 },
    );
  }

  const path = `/api/v1/directories/projects/${encodeURIComponent(options.projectId)}/directories/${encodeURIComponent(options.directoryId)}/submission-stage`;

  const result = await sendAuthenticatedRequest({
    session: options.session,
    apiBaseUrl: options.apiBaseUrl,
    path,
    method: "PUT",
    body: { submission_stage: options.submissionStage },
  });

  const headers = buildSetCookieHeaders(result.setCookie);

  if (result.response.status === 401) {
    return redirect("/login", { headers });
  }

  if (!result.response.ok) {
    return data<LaunchActionData>(
      {
        intent: "submission_stage_update",
        feedback: {
          kind: "error",
          message: parseApiErrorMessage(
            result.responseData,
            `Failed to update submission stage (HTTP ${result.response.status}).`,
          ),
        },
      },
      { status: result.response.status, headers },
    );
  }

  return data<LaunchActionData>(
    { intent: "submission_stage_update", feedback: { kind: "success", message: "Updated." } },
    { headers },
  );
}

function isLaunchActionIntent(value: string | undefined): value is LaunchActionIntent {
  return (
    value === "project_extract" ||
    value === "creator_create_quick" ||
    value === "submission_stage_update" ||
    value === "directory_vote"
  );
}

async function runDirectoryVoteAction(options: {
  session: SessionType;
  apiBaseUrl: string;
  directoryId: string;
  vote: string | undefined;
}) {
  const { session, apiBaseUrl, directoryId, vote } = options;

  if (!directoryId) {
    return data<LaunchActionData>(
      { intent: "directory_vote", feedback: { kind: "error", message: "Missing directory ID." } },
      { status: 400 },
    );
  }

  const result = isApiDirectoryVoteChoice(vote)
    ? await putDirectoryVoteRequest({ session, apiBaseUrl, directoryId, vote })
    : await deleteDirectoryVoteRequest({ session, apiBaseUrl, directoryId });

  const headers = result.setCookie ? { "Set-Cookie": result.setCookie } : undefined;

  if (!result.response.ok && result.response.status !== 404) {
    return data<LaunchActionData>(
      {
        intent: "directory_vote",
        feedback: {
          kind: "error",
          message: parseApiErrorMessage(result.responseData, `Failed to save vote (HTTP ${result.response.status}).`),
        },
      },
      { status: result.response.status, headers },
    );
  }

  return data<LaunchActionData>(
    { intent: "directory_vote", feedback: { kind: "success", message: "Vote saved." } },
    { headers },
  );
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
  return `/dashboard?project=${encodeURIComponent(projectId)}`;
}

function pickSelectedProjectId(projects: Project[], requestedProjectId?: string): string | null {
  if (requestedProjectId && projects.some((project) => project.id === requestedProjectId)) {
    return requestedProjectId;
  }

  return projects[0]?.id ?? null;
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
