import { type ComponentType, type FormEvent, useEffect, useState } from "react";
import {
  Form,
  Link,
  data,
  redirect,
  useActionData,
  useLoaderData,
  useNavigation,
  useSearchParams,
} from "react-router";

import type { Route } from "./+types/launch";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";
import { Globe, Instagram, Linkedin, Music2, Twitter, Youtube } from "lucide-react";
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
import { destroySession, getSession } from "~/lib/session.server";
import type { components } from "~/types/api.generated";

type Project = components["schemas"]["ProjectResponse"];
type CreatorCreateRequest = components["schemas"]["CreatorCreateRequest"];
type BrandProfile = components["schemas"]["BrandProfileResponse"];

type LoaderData = {
  isAuthenticated: true;
  projects: Project[];
  selectedProjectId: string | null;
  projectsError: string | null;
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

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Launch Workspace | Donkey Directory Dashboard" },
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
      headers: latestSetCookie
        ? {
            "Set-Cookie": latestSetCookie,
          }
        : undefined,
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

  return data<LoaderData>(
    {
      isAuthenticated: true,
      projects,
      selectedProjectId,
      projectsError,
    },
    {
      headers: latestSetCookie
        ? {
            "Set-Cookie": latestSetCookie,
          }
        : undefined,
    },
  );
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const intent = toOptionalString(formData.get("intent"));

  if (intent === "logout") {
    const session = await getSession(request.headers.get("Cookie"));
    return redirect("/", {
      headers: {
        "Set-Cookie": await destroySession(session),
      },
    });
  }

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

  return runExtensionConnectAction({
    session,
    apiBaseUrl,
  });
}

export default function LaunchPage() {
  const { projects, selectedProjectId, projectsError } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const [searchParams] = useSearchParams();

  const navIntent = toOptionalString(navigation.formData?.get("intent")) ?? "";
  const isBusy = navigation.state !== "idle";
  const isExtracting = isBusy && navIntent === "project_extract";
  const isCreatingCreator = isBusy && navIntent === "creator_create_quick";
  const isGeneratingConnect = isBusy && navIntent === "extension_connect_generate";
  const isLoggingOut = isBusy && navIntent === "logout";

  const extractActionSuccess =
    actionData?.intent === "project_extract" &&
    actionData.feedback.kind === "success" &&
    actionData.extract
      ? actionData.extract
      : null;

  const creatorDraft =
    actionData?.intent === "creator_create_quick" ? actionData.creatorDraft : undefined;

  const creatorWasCreated = searchParams.get("creator") === "created";

  const [setupProjectId, setSetupProjectId] = useState<string | null>(null);
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
      setSetupProjectId(extractActionSuccess.projectId);
      setCreatorFullName("");
      setCreatorBio("");
      setCreatorSocialValues(createEmptyStapleSocialValues());
      return;
    }

    if (creatorDraft?.projectId) {
      setSetupProjectId(creatorDraft.projectId);
      setCreatorFullName(creatorDraft.fullName);
      setCreatorBio(creatorDraft.bio);
      setCreatorSocialValues(socialEntriesToStapleValues(creatorDraft.socialLinks));
    }
  }, [creatorDraft, extractActionSuccess?.projectId]);

  useEffect(() => {
    if (creatorWasCreated) {
      setSetupProjectId(null);
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
    <main className="studio-page">
      <header className="studio-topbar-wrap">
        <div className="studio-shell">
          <nav className="studio-topbar studio-panel">
            <Link className="studio-brand" to="/">
              <span className="studio-brand-mark">D</span>
              <span>
                <strong>Donkey Directory</strong>
              </span>
            </Link>

            <div className="studio-topbar-links">
              <Link to="/launch" className="active">
                Launch now
              </Link>
            </div>

            <Form method="post" className="dashboard-nav-user">
              <Button type="submit" variant="destructive" name="intent" value="logout">
                {isLoggingOut ? "Logging out..." : "Logout"}
              </Button>
            </Form>
          </nav>
        </div>
      </header>

      <section className="studio-hero">
        <div className="studio-shell">
          <div className="studio-hero-copy">
            <p className="studio-kicker">Launch workspace</p>
            <h1>Create projects faster and launch with clarity.</h1>
            <p className="studio-lead">
              Start with a domain URL, add creator details, and connect your extension from one place.
            </p>
          </div>
        </div>
      </section>

      <section className="studio-shell launch-grid">
        <section className="studio-panel business-project-panel">
          <div className="studio-panel-heading">
            <div>
              <p className="studio-section-label">Projects</p>
              <h2>Your projects</h2>
            </div>
          </div>

          {projectsError ? <p className="auth-error">{projectsError}</p> : null}

          {creatorWasCreated ? (
            <p className="auth-success">Creator added. Your project is ready for the next step.</p>
          ) : null}

          {projects.length === 0 ? (
            <div className="studio-empty-state">
              <strong>No projects yet.</strong>
              <p>Use step 1 to create your first project from a domain URL.</p>
            </div>
          ) : (
            <ul className="launch-project-list" aria-label="Projects">
              {projects.map((project) => {
                const isActive = project.id === selectedProjectId;

                return (
                  <li
                    key={project.id}
                    className={`launch-project-item${isActive ? " active" : ""}`}
                  >
                    <div className="launch-project-copy">
                      <strong>{project.name}</strong>
                      <small>{project.domain}</small>
                    </div>
                    <div className="launch-project-meta">
                      <span className="studio-meta-note">{project.status}</span>
                      <small>Updated {formatDate(project.updated_at)}</small>
                    </div>
                    {!isActive ? (
                      <Link
                        className="dashboard-nav-link-button secondary"
                        to={buildLaunchProjectHref(project.id)}
                      >
                        Select
                      </Link>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="studio-panel business-route-panel">
          <div className="studio-panel-heading">
            <div>
              <p className="studio-section-label">Create project</p>
              <h2>Two-step setup</h2>
            </div>
          </div>

          <div className="launch-wizard">
            <article
              className={`launch-wizard-step${
                extractActionSuccess ? " success" : ""
              }`}
            >
              <div className="launch-step-heading">
                <p className="studio-section-label">Step 1</p>
                <h3>Provide your domain URL</h3>
              </div>
              <p className="dashboard-muted">
                We normalize your URL and run extraction to prepare the project.
              </p>

              <Form method="post" className="launch-step-form">
                <Input type="hidden" name="intent" value="project_extract" />

                <label className="studio-field">
                  <span>Domain URL</span>
                  <Input
                    name="domain_url"
                    placeholder="https://example.com"
                    defaultValue={
                      actionData?.intent === "project_extract"
                        ? valueOrEmpty(actionData.extractDraftDomain)
                        : ""
                    }
                    required
                  />
                </label>

                <div className="business-form-actions">
                  <Button type="submit" disabled={isExtracting}>
                    {isExtracting ? "Extracting..." : "Extract project details"}
                  </Button>
                </div>
              </Form>

              {actionData?.intent === "project_extract" ? (
                <p
                  className={
                    actionData.feedback.kind === "success" ? "auth-success" : "auth-error"
                  }
                >
                  {actionData.feedback.message}
                </p>
              ) : null}
            </article>

            <article
              className={`launch-wizard-step${
                setupProjectId ? " active" : ""
              }`}
            >
              <div className="launch-step-heading">
                <p className="studio-section-label">Step 2</p>
                <h3>Add creator data</h3>
              </div>
              <p className="dashboard-muted">Name is required. Bio and social links are optional.</p>

              {!setupProjectId ? (
                <p className="dashboard-muted">Complete step 1 to unlock creator setup.</p>
              ) : (
                <Form
                  method="post"
                  className="launch-step-form"
                  onSubmit={(event: FormEvent<HTMLFormElement>) => {
                    if (!setupProjectId) {
                      event.preventDefault();
                    }
                  }}
                >
                  <Input type="hidden" name="intent" value="creator_create_quick" />
                  <Input type="hidden" name="project_id" value={setupProjectId} />

                  <label className="studio-field">
                    <span>Full name</span>
                    <Input
                      name="full_name"
                      value={creatorFullName}
                      onChange={(event) => setCreatorFullName(event.target.value)}
                      required
                    />
                  </label>

                  <label className="studio-field">
                    <span>Bio</span>
                    <Textarea
                      name="bio"
                      rows={4}
                      value={creatorBio}
                      onChange={(event) => setCreatorBio(event.target.value)}
                    />
                  </label>

                  <QuickSocialLinksInput
                    values={creatorSocialValues}
                    onValueChange={(key, value) => {
                      setCreatorSocialValues((previous) => ({
                        ...previous,
                        [key]: value,
                      }));
                    }}
                    hiddenFieldName="social_links_json"
                  />

                  <div className="business-form-actions">
                    <Button type="submit" disabled={isCreatingCreator}>
                      {isCreatingCreator ? "Creating creator..." : "Save creator"}
                    </Button>
                  </div>
                </Form>
              )}

              {actionData?.intent === "creator_create_quick" ? (
                <p
                  className={
                    actionData.feedback.kind === "success" ? "auth-success" : "auth-error"
                  }
                >
                  {actionData.feedback.message}
                </p>
              ) : null}
            </article>
          </div>
        </section>

        <section className="studio-panel business-route-panel launch-connect-panel">
          <div className="studio-panel-heading">
            <div>
              <p className="studio-section-label">Connect extension</p>
              <h2>One-time code</h2>
            </div>
          </div>

          <p className="dashboard-muted connect-steps">
            Generate a one-time code, then paste it into the Chrome extension popup.
          </p>

          <Form method="post" className="connect-code-actions">
            <Input type="hidden" name="intent" value="extension_connect_generate" />
            <Button type="submit" disabled={isGeneratingConnect}>
              {isGeneratingConnect ? "Generating..." : "Generate one-time code"}
            </Button>
          </Form>

          {actionData?.intent === "extension_connect_generate" ? (
            <p className={actionData.feedback.kind === "success" ? "auth-success" : "auth-error"}>
              {actionData.feedback.message}
            </p>
          ) : null}

          {generatedCode ? (
            <div className="connect-code-card">
              <p className="launch-code-value">{generatedCode.code}</p>
              <p className="connect-code-meta">
                Expires in {secondsLeft}s{secondsLeft === 0 ? " (expired)" : ""}
              </p>
              <Button type="button" variant="outline" onClick={copyCode} disabled={secondsLeft === 0}>
                Copy code
              </Button>
              {copyStatus === "copied" ? (
                <p className="auth-success">Code copied to clipboard.</p>
              ) : null}
              {copyStatus === "failed" ? (
                <p className="auth-error">Clipboard failed. Copy the code manually.</p>
              ) : null}
            </div>
          ) : null}
        </section>
      </section>
    </main>
  );
}

function QuickSocialLinksInput(props: {
  values: StapleSocialValues;
  onValueChange: (key: StapleSocialKey, value: string) => void;
  hiddenFieldName: string;
}) {
  const serialized = JSON.stringify(stapleSocialValuesToEntries(props.values));

  return (
    <div className="studio-field launch-social-field">
      <span>Social links (optional)</span>
      <small className="launch-social-help">
        Add the links you have and leave the rest empty.
      </small>

      <div className="launch-social-list">
        {STAPLE_SOCIAL_CONFIGS.map(({ key, label, placeholder, Icon }) => (
          <label key={key} className="launch-social-row">
            <span className="launch-social-platform">
              <Icon className="launch-social-icon" />
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
