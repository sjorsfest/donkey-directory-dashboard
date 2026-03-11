import { type FormEvent, useEffect, useMemo, useState } from "react";
import {
  Form,
  Link,
  data,
  redirect,
  useActionData,
  useLoaderData,
  useLocation,
  useNavigate,
  useNavigation,
  useRevalidator,
} from "react-router";

import type { Route } from "./+types/home";
import { getServerApiBaseUrl } from "~/lib/api-base-url.server";
import { API_ROUTES } from "~/lib/api-contract";
import {
  DEFAULT_CREATOR_IMAGE_MAX_BYTES,
  runCreatorProfileImageUploadFlow,
  validateCreatorProfileImageFile,
} from "~/lib/creator-profile-image-upload-flow";
import {
  parseApiErrorMessage,
  sendAuthenticatedRequest,
  type SessionType,
} from "~/lib/authenticated-api.server";
import { destroySession, getSession } from "~/lib/session.server";
import type { components } from "~/types/api.generated";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/shared/ui/alert-dialog";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";
import { Textarea } from "@/shared/ui/textarea";

type Project = components["schemas"]["ProjectResponse"];
type BrandProfile = components["schemas"]["BrandProfileResponse"];
type Creator = components["schemas"]["CreatorResponse"];
type CreatorCreateRequest = components["schemas"]["CreatorCreateRequest"];
type CreatorUpdateRequest = components["schemas"]["CreatorUpdateRequest"];
type CreatorImageUploadUrlRequest =
  components["schemas"]["CreatorImageUploadUrlRequest"];
type CreatorImageUploadUrlResponse =
  components["schemas"]["CreatorImageUploadUrlResponse"];
type CreatorImageCompleteRequest =
  components["schemas"]["CreatorImageCompleteRequest"];
type CreatorImageReadUrlResponse =
  components["schemas"]["CreatorImageReadUrlResponse"];
type BrandProfileUpdateRequest = {
  company_name?: string | null;
  tagline?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  zip_code?: string | null;
  phone?: string | null;
  mobile?: string | null;
  fax?: string | null;
  email?: string | null;
  website?: string | null;
  display_website?: string | null;
  blog?: string | null;
  twitter?: string | null;
  facebook?: string | null;
  instagram?: string | null;
  linkedin?: string | null;
  tiktok?: string | null;
  video?: string | null;
  instant_messenger?: string | null;
  business_tags?: string[] | null;
};

type HomeIntent =
  | "logout"
  | "brand_profile_save"
  | "creator_create"
  | "creator_update"
  | "creator_delete"
  | "creator_profile_image_upload_url"
  | "creator_profile_image_complete"
  | "creator_profile_image_read_url";

type LoaderErrors = {
  projects?: string;
  brandProfile?: string;
  creators?: string;
  editingCreator?: string;
};

type ActionFeedback = {
  kind: "success" | "error";
  message: string;
};

type CreatorMutationActionPayload = {
  feedback: ActionFeedback;
  creator?: Creator | null;
};

type CreatorImageUploadUrlActionPayload = {
  upload: CreatorImageUploadUrlResponse;
};

type CreatorImageReadUrlActionPayload = {
  image: CreatorImageReadUrlResponse;
};

type CreatorSubmitStep = "save_creator" | "upload_url" | "binary_upload" | "complete";
type CreatorSubmitStepState = "idle" | "loading" | "success" | "error";

type SocialLinkInput = {
  label: string;
  url: string;
};

type BrandStringField = Exclude<keyof BrandProfileUpdateRequest, "business_tags">;

const BRAND_FIELDS: Array<{
  name: BrandStringField;
  label: string;
  type?: "text" | "email" | "url";
  placeholder?: string;
}> = [
  { name: "company_name", label: "Company name" },
  { name: "tagline", label: "Tagline" },
  { name: "address", label: "Address" },
  { name: "city", label: "City" },
  { name: "country", label: "Country" },
  { name: "zip_code", label: "ZIP code" },
  { name: "phone", label: "Phone" },
  { name: "mobile", label: "Mobile" },
  { name: "fax", label: "Fax" },
  { name: "email", label: "Email", type: "email", placeholder: "team@example.com" },
  { name: "website", label: "Website", type: "url", placeholder: "https://example.com" },
  {
    name: "display_website",
    label: "Display website",
    type: "url",
    placeholder: "https://www.example.com",
  },
  { name: "blog", label: "Blog", type: "url", placeholder: "https://blog.example.com" },
  { name: "twitter", label: "Twitter", type: "url", placeholder: "https://x.com/example" },
  {
    name: "facebook",
    label: "Facebook",
    type: "url",
    placeholder: "https://facebook.com/example",
  },
  {
    name: "instagram",
    label: "Instagram",
    type: "url",
    placeholder: "https://instagram.com/example",
  },
  {
    name: "linkedin",
    label: "LinkedIn",
    type: "url",
    placeholder: "https://linkedin.com/company/example",
  },
  { name: "tiktok", label: "TikTok", type: "url", placeholder: "https://tiktok.com/@example" },
  { name: "video", label: "Video", type: "url", placeholder: "https://youtube.com/watch?v=..." },
  { name: "instant_messenger", label: "Instant messenger" },
];

const CREATOR_URL_FIELDS = [
  "website",
  "twitter",
  "facebook",
  "instagram",
  "linkedin",
  "tiktok",
  "youtube",
] as const;

const BRAND_URL_FIELDS = [
  "website",
  "display_website",
  "blog",
  "twitter",
  "facebook",
  "instagram",
  "linkedin",
  "tiktok",
  "video",
] as const;

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Donkey Directory Dashboard" },
    {
      name: "description",
      content: "Manage project business details and creators.",
    },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const session = await getSession(request.headers.get("Cookie"));
  const hasSessionTokens =
    Boolean(toOptionalString(session.get("accessToken"))) ||
    Boolean(toOptionalString(session.get("refreshToken")));

  if (!hasSessionTokens) {
    return data(emptyLoaderData(false));
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
    return data(emptyLoaderData(false), {
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

  const errors: LoaderErrors = {};
  const projects = projectsResult.response.ok
    ? asProjectArray(projectsResult.responseData)
    : [];

  if (!projectsResult.response.ok) {
    errors.projects = parseApiErrorMessage(
      projectsResult.responseData,
      `Failed to load projects (HTTP ${projectsResult.response.status}).`,
    );
  }

  const requestUrl = new URL(request.url);
  const requestedProjectId = toOptionalString(requestUrl.searchParams.get("project"));
  const editCreatorId = toOptionalString(requestUrl.searchParams.get("edit_creator"));
  const activeProjectId = pickActiveProjectId(projects, requestedProjectId);

  let brandProfile: BrandProfile | null = null;
  let creators: Creator[] = [];
  let editingCreator: Creator | null = null;

  if (activeProjectId) {
    const brandProfileResult = await sendAuthenticatedRequest({
      session,
      apiBaseUrl,
      path: projectBrandProfilePath(activeProjectId),
      method: "GET",
    });

    latestSetCookie = pickSetCookie(latestSetCookie, brandProfileResult.setCookie);

    if (brandProfileResult.response.ok) {
      brandProfile = asBrandProfile(brandProfileResult.responseData);
    } else if (brandProfileResult.response.status !== 404) {
      errors.brandProfile = parseApiErrorMessage(
        brandProfileResult.responseData,
        `Failed to load brand profile (HTTP ${brandProfileResult.response.status}).`,
      );
    }

    const creatorsResult = await sendAuthenticatedRequest({
      session,
      apiBaseUrl,
      path: projectCreatorsPath(activeProjectId),
      method: "GET",
    });

    latestSetCookie = pickSetCookie(latestSetCookie, creatorsResult.setCookie);

    if (creatorsResult.response.ok) {
      creators = asCreatorArray(creatorsResult.responseData);
    } else {
      errors.creators = parseApiErrorMessage(
        creatorsResult.responseData,
        `Failed to load creators (HTTP ${creatorsResult.response.status}).`,
      );
    }

    if (editCreatorId) {
      const editingCreatorResult = await sendAuthenticatedRequest({
        session,
        apiBaseUrl,
        path: projectCreatorPath(activeProjectId, editCreatorId),
        method: "GET",
      });

      latestSetCookie = pickSetCookie(latestSetCookie, editingCreatorResult.setCookie);

      if (editingCreatorResult.response.ok) {
        editingCreator = asCreator(editingCreatorResult.responseData);
      } else {
        errors.editingCreator = parseApiErrorMessage(
          editingCreatorResult.responseData,
          `Failed to load creator (HTTP ${editingCreatorResult.response.status}).`,
        );
      }
    }
  }

  return data(
    {
      isAuthenticated: true,
      projects,
      activeProjectId,
      brandProfile,
      creators,
      editingCreator,
      errors,
    },
    {
      headers: latestSetCookie ? { "Set-Cookie": latestSetCookie } : undefined,
    },
  );
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const intentValue = toOptionalString(formData.get("intent"));

  if (!intentValue || !isHomeIntent(intentValue)) {
    return data(
      {
        feedback: {
          kind: "error",
          message: "Unsupported action intent.",
        } satisfies ActionFeedback,
      },
      { status: 400 },
    );
  }

  const session = await getSession(request.headers.get("Cookie"));

  if (intentValue === "logout") {
    return redirect("/", {
      headers: {
        "Set-Cookie": await destroySession(session),
      },
    });
  }

  const projectId = toOptionalString(formData.get("project_id"));
  if (!projectId) {
    return data(
      {
        feedback: {
          kind: "error",
          message: "A project must be selected before saving.",
        } satisfies ActionFeedback,
      },
      { status: 400 },
    );
  }

  const apiBaseUrl = getServerApiBaseUrl();

  if (intentValue === "brand_profile_save") {
    const payload = buildBrandProfilePayload(formData);
    const validationError = validateBrandPayload(payload);

    if (validationError) {
      return data(
        {
          feedback: {
            kind: "error",
            message: validationError,
          } satisfies ActionFeedback,
        },
        { status: 400 },
      );
    }

    return runMutationAction({
      session,
      apiBaseUrl,
      path: projectBrandProfilePath(projectId),
      method: "PATCH",
      body: payload,
      successMessage: "Brand contact details saved.",
    });
  }

  if (intentValue === "creator_create") {
    const payload = buildCreatorPayload(formData);
    const validationError = validateCreatorPayload(payload);

    if (validationError) {
      return data(
        {
          feedback: {
            kind: "error",
            message: validationError,
          } satisfies ActionFeedback,
        },
        { status: 400 },
      );
    }

    return runCreatorMutationAction({
      session,
      apiBaseUrl,
      path: projectCreatorsPath(projectId),
      method: "POST",
      body: payload,
      successMessage: "Creator created.",
    });
  }

  if (intentValue === "creator_update") {
    const creatorId = toOptionalString(formData.get("creator_id"));
    if (!creatorId) {
      return data(
        {
          feedback: {
            kind: "error",
            message: "Missing creator ID for update.",
          } satisfies ActionFeedback,
        },
        { status: 400 },
      );
    }

    const payload: CreatorUpdateRequest = buildCreatorPayload(formData);
    const validationError = validateCreatorPayload(payload);

    if (validationError) {
      return data(
        {
          feedback: {
            kind: "error",
            message: validationError,
          } satisfies ActionFeedback,
        },
        { status: 400 },
      );
    }

    return runCreatorMutationAction({
      session,
      apiBaseUrl,
      path: projectCreatorPath(projectId, creatorId),
      method: "PATCH",
      body: payload,
      successMessage: "Creator updated.",
    });
  }

  if (intentValue === "creator_profile_image_upload_url") {
    const creatorId = toOptionalString(formData.get("creator_id"));
    if (!creatorId) {
      return data(
        {
          feedback: {
            kind: "error",
            message: "Missing creator ID for image upload URL.",
          } satisfies ActionFeedback,
        },
        { status: 400 },
      );
    }

    const payload: CreatorImageUploadUrlRequest = {
      file_name: toOptionalString(formData.get("file_name")) ?? "profile-image",
      content_type:
        toOptionalString(formData.get("content_type")) ?? "application/octet-stream",
    };

    if (!payload.content_type.toLowerCase().startsWith("image/")) {
      return data(
        {
          feedback: {
            kind: "error",
            message: "Only image uploads are supported.",
          } satisfies ActionFeedback,
        },
        { status: 400 },
      );
    }

    try {
      const result = await sendAuthenticatedRequest({
        session,
        apiBaseUrl,
        path: projectCreatorProfileImageUploadUrlPath(projectId, creatorId),
        method: "POST",
        body: payload,
      });

      const headers = result.setCookie ? { "Set-Cookie": result.setCookie } : undefined;

      if (!result.response.ok) {
        return data(
          {
            feedback: {
              kind: "error",
              message: parseApiErrorMessage(
                result.responseData,
                `Could not request upload URL (HTTP ${result.response.status}).`,
              ),
            } satisfies ActionFeedback,
          },
          {
            status: result.response.status,
            headers,
          },
        );
      }

      const upload = asCreatorImageUploadUrlResponse(result.responseData);
      if (!upload) {
        return data(
          {
            feedback: {
              kind: "error",
              message: "Upload URL response is invalid.",
            } satisfies ActionFeedback,
          },
          { status: 502, headers },
        );
      }

      return data(
        {
          upload,
          feedback: {
            kind: "success",
            message: "Upload URL created.",
          } satisfies ActionFeedback,
        },
        { headers },
      );
    } catch (caughtError) {
      const message =
        caughtError instanceof Error ? caughtError.message : "Unexpected server error.";

      return data(
        {
          feedback: {
            kind: "error",
            message,
          } satisfies ActionFeedback,
        },
        { status: 500 },
      );
    }
  }

  if (intentValue === "creator_profile_image_complete") {
    const creatorId = toOptionalString(formData.get("creator_id"));
    if (!creatorId) {
      return data(
        {
          feedback: {
            kind: "error",
            message: "Missing creator ID for image completion.",
          } satisfies ActionFeedback,
        },
        { status: 400 },
      );
    }

    const payload: CreatorImageCompleteRequest = {
      object_key: toOptionalString(formData.get("object_key")) ?? "",
    };

    if (!payload.object_key) {
      return data(
        {
          feedback: {
            kind: "error",
            message: "Missing object key for image completion.",
          } satisfies ActionFeedback,
        },
        { status: 400 },
      );
    }

    try {
      const result = await sendAuthenticatedRequest({
        session,
        apiBaseUrl,
        path: projectCreatorProfileImageCompletePath(projectId, creatorId),
        method: "POST",
        body: payload,
      });

      const headers = result.setCookie ? { "Set-Cookie": result.setCookie } : undefined;

      if (!result.response.ok) {
        return data(
          {
            feedback: {
              kind: "error",
              message: parseApiErrorMessage(
                result.responseData,
                `Could not finalize image upload (HTTP ${result.response.status}).`,
              ),
            } satisfies ActionFeedback,
          },
          {
            status: result.response.status,
            headers,
          },
        );
      }

      return data(
        {
          creator: asCreator(result.responseData),
          feedback: {
            kind: "success",
            message: "Creator image updated.",
          } satisfies ActionFeedback,
        },
        { headers },
      );
    } catch (caughtError) {
      const message =
        caughtError instanceof Error ? caughtError.message : "Unexpected server error.";

      return data(
        {
          feedback: {
            kind: "error",
            message,
          } satisfies ActionFeedback,
        },
        { status: 500 },
      );
    }
  }

  if (intentValue === "creator_profile_image_read_url") {
    const creatorId = toOptionalString(formData.get("creator_id"));
    if (!creatorId) {
      return data(
        {
          feedback: {
            kind: "error",
            message: "Missing creator ID for image read URL.",
          } satisfies ActionFeedback,
        },
        { status: 400 },
      );
    }

    try {
      const result = await sendAuthenticatedRequest({
        session,
        apiBaseUrl,
        path: projectCreatorProfileImageReadUrlPath(projectId, creatorId),
        method: "GET",
      });

      const headers = result.setCookie ? { "Set-Cookie": result.setCookie } : undefined;

      if (!result.response.ok) {
        return data(
          {
            feedback: {
              kind: "error",
              message: parseApiErrorMessage(
                result.responseData,
                `Could not load image URL (HTTP ${result.response.status}).`,
              ),
            } satisfies ActionFeedback,
          },
          {
            status: result.response.status,
            headers,
          },
        );
      }

      const image = asCreatorImageReadUrlResponse(result.responseData);
      if (!image) {
        return data(
          {
            feedback: {
              kind: "error",
              message: "Read URL response is invalid.",
            } satisfies ActionFeedback,
          },
          { status: 502, headers },
        );
      }

      return data(
        {
          image,
          feedback: {
            kind: "success",
            message: "Read URL created.",
          } satisfies ActionFeedback,
        },
        { headers },
      );
    } catch (caughtError) {
      const message =
        caughtError instanceof Error ? caughtError.message : "Unexpected server error.";

      return data(
        {
          feedback: {
            kind: "error",
            message,
          } satisfies ActionFeedback,
        },
        { status: 500 },
      );
    }
  }

  const creatorId = toOptionalString(formData.get("creator_id"));
  if (!creatorId) {
    return data(
      {
        feedback: {
          kind: "error",
          message: "Missing creator ID for delete.",
        } satisfies ActionFeedback,
      },
      { status: 400 },
    );
  }

  return runMutationAction({
    session,
    apiBaseUrl,
    path: projectCreatorPath(projectId, creatorId),
    method: "DELETE",
    successMessage: "Creator deleted.",
  });
}

export default function Home() {
  const {
    isAuthenticated,
    projects,
    activeProjectId,
    brandProfile,
    creators,
    editingCreator,
    errors,
  } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const location = useLocation();
  const navigate = useNavigate();

  const query = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const createCreatorOpen = query.get("create_creator") === "1";
  const editCreatorId = toOptionalString(query.get("edit_creator"));
  const routePath = location.pathname;
  const isBrandRoute = routePath === "/brand";
  const isCreatorsRoute = routePath === "/creators";
  const isOverviewRoute = !isBrandRoute && !isCreatorsRoute;
  const currentBasePath = isBrandRoute ? "/brand" : isCreatorsRoute ? "/creators" : "/";

  const selectedProject =
    projects.find((project) => project.id === activeProjectId) ?? null;

  const navIntent = toOptionalString(navigation.formData?.get("intent")) ?? "";
  const isBusy = navigation.state !== "idle";
  const isBrandSaving = navIntent === "brand_profile_save";
  const isCreatorCreating = navIntent === "creator_create";
  const isCreatorUpdating = navIntent === "creator_update";
  const isCreatorDeleting = navIntent === "creator_delete";

  const overviewHref = buildProjectHref(activeProjectId, undefined, "/");
  const brandHref = buildProjectHref(activeProjectId, undefined, "/brand");
  const creatorsHref = buildProjectHref(activeProjectId, undefined, "/creators");
  const baseProjectHref = buildProjectHref(activeProjectId, undefined, currentBasePath);
  const createCreatorHref = buildProjectHref(
    activeProjectId,
    { create_creator: "1" },
    "/creators",
  );
  const editCreatorHref = buildProjectHref(
    activeProjectId,
    editCreatorId ? { edit_creator: editCreatorId } : undefined,
    "/creators",
  );

  return (
    <main className="studio-page">
      <header className="studio-topbar-wrap">
        <div className="studio-shell">
          <nav className="studio-topbar studio-panel">
            <Link className="studio-brand" to="/">
              <span className="studio-brand-mark">D</span>
              <span>
                <strong>Donkey Directory</strong>
                <small>Business and creator manager</small>
              </span>
            </Link>

            <div className="studio-topbar-links">
              <Link to={overviewHref}>Overview</Link>
              <Link to={brandHref}>Business details</Link>
              <Link to={creatorsHref}>Creators</Link>
            </div>

            {!isAuthenticated ? (
              <div className="dashboard-nav-auth-actions">
                <Link className="dashboard-nav-link-button secondary" to="/signup">
                  Sign up
                </Link>
                <Link className="dashboard-nav-link-button" to="/login">
                  Login
                </Link>
              </div>
            ) : (
              <Form method="post" className="dashboard-nav-user">
                <span className="studio-status-pill">Authenticated</span>
                <Link className="dashboard-nav-link-button secondary" to="/connect-extension">
                  Connect Extension
                </Link>
                <Button type="submit" variant="destructive" name="intent" value="logout" disabled={isBusy}>
                  {isBusy && navIntent === "logout" ? "Logging out..." : "Logout"}
                </Button>
              </Form>
            )}
          </nav>
        </div>
      </header>

      <section className="studio-hero">
        <div className="studio-shell studio-hero-grid">
          <div className="studio-hero-copy">
            <p className="studio-kicker">
              {isOverviewRoute ? "Project workspace" : isBrandRoute ? "Business workspace" : "Creator workspace"}
            </p>
            <h1>
              {isOverviewRoute
                ? "Business details and creators in one place."
                : isBrandRoute
                  ? "Manage brand profile details."
                  : "Manage creator profiles."}
            </h1>
            <p className="studio-lead">
              {isOverviewRoute
                ? "Use separate routes for business and creators to keep each workflow focused."
                : isBrandRoute
                  ? "Update project-level business contact fields without the creator table in view."
                  : "Create, edit, and manage creator profiles in a dedicated route."}
            </p>
            <div className="studio-chip-row">
              <span>Project-scoped creators</span>
              <span>Validation for URLs and emails</span>
              <span>Clear API errors</span>
            </div>
          </div>
        </div>
      </section>

      <section className="studio-shell business-main-grid">
        <section className="studio-panel business-project-panel">
          <div className="studio-panel-heading">
            <div>
              <p className="studio-section-label">Project</p>
              <h2>Select Project</h2>
            </div>
            {selectedProject ? <span className="studio-meta-note">{selectedProject.domain}</span> : null}
          </div>

          {!isAuthenticated ? (
            <div className="studio-inline-notice">
              <span>Login is required to manage business and creators.</span>
              <Link className="dashboard-nav-link-button secondary" to="/login">
                Sign in
              </Link>
            </div>
          ) : null}

          {errors.projects ? <p className="auth-error">{errors.projects}</p> : null}

          {projects.length === 0 ? (
            <div className="studio-empty-state">
              <strong>No projects yet.</strong>
              <p>Create a project in the backend first, then reload this page to manage business and creators.</p>
            </div>
          ) : (
            <div className="business-project-picker">
              <label className="studio-field">
                <span>Active project</span>
                <Select
                  value={activeProjectId ?? projects[0]?.id ?? ""}
                  onValueChange={(projectId) => {
                    navigate(buildProjectHref(projectId, undefined, currentBasePath));
                  }}
                  disabled={isBusy}
                >
                  <SelectTrigger id="project-select">
                    <SelectValue placeholder="Select a project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name} ({project.domain})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
            </div>
          )}

          {actionData?.feedback ? (
            <p className={actionData.feedback.kind === "success" ? "auth-success" : "auth-error"}>
              {actionData.feedback.message}
            </p>
          ) : null}
        </section>

        {isOverviewRoute ? (
          <section className="studio-panel business-route-panel">
            <div className="studio-panel-heading">
              <div>
                <p className="studio-section-label">Workflows</p>
                <h2>Choose a focused route</h2>
              </div>
            </div>
            <div className="business-route-grid">
              <article className="business-route-card">
                <h3>Brand profile fields</h3>
                <p>Open the business details form without creator management in view.</p>
                <Link className="dashboard-nav-link-button" to={brandHref}>
                  Go to brand details
                </Link>
              </article>
              <article className="business-route-card">
                <h3>Creator creation fields</h3>
                <p>Open creator list and creation/edit forms on a dedicated route.</p>
                <Link className="dashboard-nav-link-button" to={creatorsHref}>
                  Go to creators
                </Link>
              </article>
            </div>
          </section>
        ) : null}

        {isBrandRoute ? (
          <section className="studio-panel business-brand-panel" id="brand-contact">
            <div className="studio-panel-heading">
              <div>
                <p className="studio-section-label">Business</p>
                <h2>Brand Contact Details</h2>
              </div>
              <span className="studio-meta-note">Project → BrandProfile (1:1)</span>
            </div>

            {!activeProjectId ? (
              <p className="dashboard-muted">Select a project to edit brand contact details.</p>
            ) : (
              <>
                {errors.brandProfile ? <p className="auth-error">{errors.brandProfile}</p> : null}
                <Form method="post" action={baseProjectHref} className="business-form-grid">
                  <Input type="hidden" name="intent" value="brand_profile_save" />
                  <Input type="hidden" name="project_id" value={activeProjectId} />

                  {BRAND_FIELDS.map((field) => (
                    <label key={field.name} className="studio-field">
                      <span>{field.label}</span>
                      <Input
                        name={field.name}
                        type={field.type ?? "text"}
                        defaultValue={valueOrEmpty(brandProfile?.[field.name])}
                        placeholder={field.placeholder}
                      />
                    </label>
                  ))}

                  <TagInput
                    label="Business tags"
                    inputLabel="Add tag"
                    name="business_tags_json"
                    initialTags={brandProfile?.business_tags ?? []}
                    placeholder="Type a tag and press Enter"
                  />

                  <div className="business-form-actions">
                    <Button type="submit" disabled={isBusy}>
                      {isBrandSaving ? "Saving..." : "Save brand details"}
                    </Button>
                  </div>
                </Form>
              </>
            )}
          </section>
        ) : null}

        {isCreatorsRoute ? (
          <section className="studio-panel business-creators-panel" id="creators">
            <div className="studio-panel-heading">
              <div>
                <p className="studio-section-label">Creators</p>
                <h2>Creator Profiles</h2>
              </div>
              <span className="studio-meta-note">Project → Creator (1:many)</span>
            </div>

            {!activeProjectId ? (
              <p className="dashboard-muted">Select a project to manage creators.</p>
            ) : (
              <>
                <div className="business-creator-toolbar">
                  <Link className="dashboard-nav-link-button" to={createCreatorHref}>
                    Create creator
                  </Link>
                </div>

                {errors.creators ? <p className="auth-error">{errors.creators}</p> : null}

                {creators.length === 0 ? (
                  <div className="studio-empty-state">
                    <strong>No creators added.</strong>
                    <p>Create a creator profile for this project to populate this list.</p>
                  </div>
                ) : (
                  <div className="business-table-wrap">
                    <Table className="business-table">
                      <TableHeader>
                        <TableRow>
                          <TableHead>Image</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Tags</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {creators.map((creator) => (
                          <TableRow key={creator.id}>
                            <TableCell>
                              <CreatorListImage
                                projectId={activeProjectId}
                                creator={creator}
                                actionUrl={baseProjectHref}
                              />
                            </TableCell>
                            <TableCell>{creator.full_name}</TableCell>
                            <TableCell>{valueOrDash(creator.role)}</TableCell>
                            <TableCell>{valueOrDash(creator.email)}</TableCell>
                            <TableCell>{(creator.expertise_tags ?? []).length}</TableCell>
                            <TableCell>
                              <div className="business-row-actions">
                                <Link
                                  className="dashboard-nav-link-button secondary"
                                  to={buildProjectHref(
                                    activeProjectId,
                                    { edit_creator: creator.id },
                                    "/creators",
                                  )}
                                >
                                  Edit
                                </Link>
                                <Form method="post" action={baseProjectHref} id={`delete-creator-${creator.id}`}>
                                  <Input type="hidden" name="intent" value="creator_delete" />
                                  <Input type="hidden" name="project_id" value={activeProjectId} />
                                  <Input type="hidden" name="creator_id" value={creator.id} />
                                </Form>

                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="destructive" disabled={isBusy}>
                                      {isCreatorDeleting ? "Deleting..." : "Delete"}
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete creator?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Delete creator "{creator.full_name}"? This cannot be undone.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction asChild>
                                        <Button
                                          type="submit"
                                          form={`delete-creator-${creator.id}`}
                                          variant="destructive"
                                          disabled={isBusy}
                                        >
                                          Confirm delete
                                        </Button>
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {createCreatorOpen ? (
                  <section className="business-editor-panel">
                    <div className="business-editor-heading">
                      <h3>Create creator</h3>
                      <Link className="dashboard-nav-link-button secondary" to={creatorsHref}>
                        Close
                      </Link>
                    </div>
                    <CreatorForm
                      mode="create"
                      creator={null}
                      projectId={activeProjectId}
                      formAction={createCreatorHref}
                      readUrlAction={baseProjectHref}
                      basePath="/creators"
                      isSubmitting={isCreatorCreating}
                    />
                  </section>
                ) : null}

                {editCreatorId ? (
                  <section className="business-editor-panel">
                    <div className="business-editor-heading">
                      <h3>Edit creator</h3>
                      <Link className="dashboard-nav-link-button secondary" to={creatorsHref}>
                        Close
                      </Link>
                    </div>

                    {errors.editingCreator ? (
                      <p className="auth-error">{errors.editingCreator}</p>
                    ) : editingCreator ? (
                      <CreatorForm
                        mode="edit"
                        creator={editingCreator}
                        projectId={activeProjectId}
                        formAction={editCreatorHref}
                        readUrlAction={baseProjectHref}
                        basePath="/creators"
                        isSubmitting={isCreatorUpdating}
                      />
                    ) : (
                      <p className="dashboard-muted">Loading creator...</p>
                    )}
                  </section>
                ) : null}
              </>
            )}
          </section>
        ) : null}
      </section>
    </main>
  );
}

function CreatorForm(props: {
  mode: "create" | "edit";
  creator: Creator | null;
  projectId: string;
  formAction: string;
  readUrlAction: string;
  basePath: string;
  isSubmitting: boolean;
}) {
  const intent = props.mode === "create" ? "creator_create" : "creator_update";
  const navigate = useNavigate();
  const revalidator = useRevalidator();
  const [socialLinksDraft, setSocialLinksDraft] = useState<SocialLinkInput[]>(
    normalizeSocialLinks(props.creator?.social_links ?? null),
  );
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [localImagePreviewUrl, setLocalImagePreviewUrl] = useState<string | null>(null);
  const [signedImagePreviewUrl, setSignedImagePreviewUrl] = useState<string | null>(null);
  const [imagePreviewError, setImagePreviewError] = useState<string | null>(null);
  const [isLoadingSignedPreview, setIsLoadingSignedPreview] = useState(false);
  const [isFlowSubmitting, setIsFlowSubmitting] = useState(false);
  const [formMessage, setFormMessage] = useState<ActionFeedback | null>(null);
  const [stepStates, setStepStates] = useState<Record<CreatorSubmitStep, CreatorSubmitStepState>>(
    createInitialCreatorSubmitStepStates(),
  );
  const socialLinksKey = JSON.stringify(props.creator?.social_links ?? []);
  const isSubmitting = props.isSubmitting || isFlowSubmitting;

  useEffect(() => {
    if (!selectedImageFile) {
      setLocalImagePreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(selectedImageFile);
    setLocalImagePreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [selectedImageFile]);

  useEffect(() => {
    setSocialLinksDraft(normalizeSocialLinks(props.creator?.social_links ?? null));
    setSelectedImageFile(null);
    setLocalImagePreviewUrl(null);
    setSignedImagePreviewUrl(null);
    setImagePreviewError(null);
    setIsLoadingSignedPreview(false);
    setFormMessage(null);
    setStepStates(createInitialCreatorSubmitStepStates());
  }, [props.creator?.id, props.mode, socialLinksKey]);

  useEffect(() => {
    if (!props.creator?.id || Boolean(localImagePreviewUrl)) {
      return;
    }

    if (!props.creator.profile_image_url) {
      setSignedImagePreviewUrl(null);
      setIsLoadingSignedPreview(false);
      setImagePreviewError(null);
      return;
    }

    let isCancelled = false;
    setImagePreviewError(null);
    setIsLoadingSignedPreview(true);

    void requestCreatorProfileImageReadUrl({
      actionUrl: props.readUrlAction,
      projectId: props.projectId,
      creatorId: props.creator.id,
    })
      .then((response) => {
        if (isCancelled) {
          return;
        }

        setSignedImagePreviewUrl(response.signed_read_url);
        setIsLoadingSignedPreview(false);
      })
      .catch((error) => {
        if (isCancelled) {
          return;
        }

        setSignedImagePreviewUrl(null);
        setIsLoadingSignedPreview(false);
        setImagePreviewError(
          error instanceof Error
            ? error.message
            : "Could not load profile image preview.",
        );
      });

    return () => {
      isCancelled = true;
    };
  }, [
    localImagePreviewUrl,
    props.creator?.id,
    props.creator?.profile_image_url,
    props.projectId,
    props.readUrlAction,
  ]);

  async function handleCreatorSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) {
      return;
    }

    setIsFlowSubmitting(true);
    setFormMessage(null);
    setStepStates(createInitialCreatorSubmitStepStates());

    const formElement = event.currentTarget;
    const formData = new FormData(formElement);

    try {
      setStepStates((previous) => ({
        ...previous,
        save_creator: "loading",
      }));

      const mutationResponse = await postActionFormData<CreatorMutationActionPayload>(
        props.formAction,
        formData,
      );

      if (mutationResponse.feedback.kind !== "success") {
        throw new Error(mutationResponse.feedback.message);
      }

      setStepStates((previous) => ({
        ...previous,
        save_creator: "success",
      }));

      const creatorId = mutationResponse.creator?.id ?? props.creator?.id ?? null;

      if (!creatorId) {
        throw new Error("Creator saved but no creator ID was returned.");
      }

      if (selectedImageFile) {
        await runCreatorProfileImageUploadFlow({
          file: selectedImageFile,
          createUploadUrl: (payload) =>
            requestCreatorProfileImageUploadUrl({
              actionUrl: props.formAction,
              projectId: props.projectId,
              creatorId,
              payload,
            }),
          uploadBinary: ({ uploadUrl, contentType, file }) =>
            uploadCreatorImageBinary({
              uploadUrl,
              contentType,
              file,
            }),
          completeUpload: (payload) =>
            requestCreatorProfileImageComplete({
              actionUrl: props.formAction,
              projectId: props.projectId,
              creatorId,
              payload,
            }),
          onStepStatusChange: (step, status) => {
            const mappedStep: Exclude<CreatorSubmitStep, "save_creator"> =
              step === "upload_url"
                ? "upload_url"
                : step === "binary_upload"
                  ? "binary_upload"
                  : "complete";

            setStepStates((previous) => ({
              ...previous,
              [mappedStep]: status,
            }));
          },
        });

        const readUrlResponse = await requestCreatorProfileImageReadUrl({
          actionUrl: props.readUrlAction,
          projectId: props.projectId,
          creatorId,
        });
        setSignedImagePreviewUrl(readUrlResponse.signed_read_url);
        setSelectedImageFile(null);
      }

      const successMessage =
        props.mode === "create"
          ? selectedImageFile
            ? "Creator created and image uploaded."
            : "Creator created."
          : selectedImageFile
            ? "Creator updated and image uploaded."
            : "Creator updated.";

      setFormMessage({
        kind: "success",
        message: successMessage,
      });

      if (props.mode === "create") {
        navigate(
          buildProjectHref(
            props.projectId,
            { edit_creator: creatorId },
            props.basePath,
          ),
        );
        return;
      }

      revalidator.revalidate();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not save creator.";
      setFormMessage({
        kind: "error",
        message,
      });
      setStepStates((previous) => {
        if (previous.save_creator === "loading") {
          return { ...previous, save_creator: "error" };
        }

        if (previous.upload_url === "loading") {
          return { ...previous, upload_url: "error" };
        }

        if (previous.binary_upload === "loading") {
          return { ...previous, binary_upload: "error" };
        }

        if (previous.complete === "loading") {
          return { ...previous, complete: "error" };
        }

        return previous;
      });
    } finally {
      setIsFlowSubmitting(false);
    }
  }

  const effectivePreviewUrl = localImagePreviewUrl ?? signedImagePreviewUrl;
  const visibleSteps: CreatorSubmitStep[] = selectedImageFile
    ? ["save_creator", "upload_url", "binary_upload", "complete"]
    : ["save_creator"];

  return (
    <Form
      method="post"
      action={props.formAction}
      className="business-creator-form"
      encType="multipart/form-data"
      onSubmit={handleCreatorSubmit}
    >
      <Input type="hidden" name="intent" value={intent} />
      <Input type="hidden" name="project_id" value={props.projectId} />
      {props.creator ? <Input type="hidden" name="creator_id" value={props.creator.id} /> : null}
      <Input
        type="hidden"
        name="profile_image_url"
        value={valueOrEmpty(props.creator?.profile_image_url)}
      />

      <div className="business-form-grid">
        <label className="studio-field">
          <span>Full name *</span>
          <Input name="full_name" required defaultValue={valueOrEmpty(props.creator?.full_name)} />
        </label>

        <label className="studio-field">
          <span>Role</span>
          <Input name="role" defaultValue={valueOrEmpty(props.creator?.role)} />
        </label>

        <label className="studio-field business-field-span-full">
          <span>Bio</span>
          <Textarea name="bio" rows={4} defaultValue={valueOrEmpty(props.creator?.bio)} />
        </label>

        <label className="studio-field">
          <span>Email</span>
          <Input
            name="email"
            type="email"
            defaultValue={valueOrEmpty(props.creator?.email)}
            placeholder="creator@example.com"
          />
        </label>

        <label className="studio-field">
          <span>Phone</span>
          <Input name="phone" defaultValue={valueOrEmpty(props.creator?.phone)} />
        </label>

        <label className="studio-field">
          <span>Website</span>
          <Input
            name="website"
            type="url"
            defaultValue={valueOrEmpty(props.creator?.website)}
            placeholder="https://example.com"
          />
        </label>

        <label className="studio-field business-field-span-full business-image-field">
          <span>Profile image</span>
          <Input
            type="file"
            accept="image/*"
            onChange={(event) => {
              const file = event.currentTarget.files?.[0] ?? null;
              if (!file) {
                setSelectedImageFile(null);
                setFormMessage(null);
                return;
              }

              const validationError = validateCreatorProfileImageFile(
                file,
                DEFAULT_CREATOR_IMAGE_MAX_BYTES,
              );
              if (validationError) {
                setFormMessage({
                  kind: "error",
                  message: validationError,
                });
                event.currentTarget.value = "";
                return;
              }

              setFormMessage(null);
              setImagePreviewError(null);
              setSelectedImageFile(file);
            }}
          />
          <small>
            Images only. Max {Math.floor(DEFAULT_CREATOR_IMAGE_MAX_BYTES / (1024 * 1024))} MB
            before requesting a signed upload URL.
          </small>

          <div className="business-image-preview-wrap">
            {effectivePreviewUrl ? (
              <img
                src={effectivePreviewUrl}
                alt={`Profile preview for ${props.creator?.full_name ?? "new creator"}`}
                className="business-image-preview"
              />
            ) : null}
            {!effectivePreviewUrl && isLoadingSignedPreview ? (
              <small>Loading image preview…</small>
            ) : null}
            {!effectivePreviewUrl && !isLoadingSignedPreview ? (
              <small>No image uploaded yet.</small>
            ) : null}
            {imagePreviewError ? (
              <small className="business-image-preview-error">{imagePreviewError}</small>
            ) : null}
          </div>
        </label>

        <label className="studio-field">
          <span>Twitter</span>
          <Input
            name="twitter"
            type="url"
            defaultValue={valueOrEmpty(props.creator?.twitter)}
            placeholder="https://x.com/handle"
          />
        </label>

        <label className="studio-field">
          <span>Facebook</span>
          <Input
            name="facebook"
            type="url"
            defaultValue={valueOrEmpty(props.creator?.facebook)}
            placeholder="https://facebook.com/profile"
          />
        </label>

        <label className="studio-field">
          <span>Instagram</span>
          <Input
            name="instagram"
            type="url"
            defaultValue={valueOrEmpty(props.creator?.instagram)}
            placeholder="https://instagram.com/handle"
          />
        </label>

        <label className="studio-field">
          <span>LinkedIn</span>
          <Input
            name="linkedin"
            type="url"
            defaultValue={valueOrEmpty(props.creator?.linkedin)}
            placeholder="https://linkedin.com/in/profile"
          />
        </label>

        <label className="studio-field">
          <span>TikTok</span>
          <Input
            name="tiktok"
            type="url"
            defaultValue={valueOrEmpty(props.creator?.tiktok)}
            placeholder="https://tiktok.com/@handle"
          />
        </label>

        <label className="studio-field">
          <span>YouTube</span>
          <Input
            name="youtube"
            type="url"
            defaultValue={valueOrEmpty(props.creator?.youtube)}
            placeholder="https://youtube.com/@channel"
          />
        </label>
      </div>

      <SocialLinksInput
        entries={socialLinksDraft}
        onChange={setSocialLinksDraft}
        hiddenFieldName="social_links_json"
      />

      <TagInput
        label="Expertise tags"
        inputLabel="Add expertise"
        name="expertise_tags_json"
        initialTags={props.creator?.expertise_tags ?? []}
        placeholder="Type a tag and press Enter"
      />

      <div className="business-form-actions">
        <Button type="submit" disabled={isSubmitting}>
          {props.mode === "create"
            ? isSubmitting
              ? "Creating..."
              : "Create creator"
            : isSubmitting
              ? "Saving..."
              : "Save creator"}
        </Button>
      </div>

      {formMessage ? (
        <p className={formMessage.kind === "success" ? "auth-success" : "auth-error"}>
          {formMessage.message}
        </p>
      ) : null}

      <ul className="business-step-list">
        {visibleSteps.map((step) => (
          <li key={step} className={`business-step-item ${stepStateClassName(stepStates[step])}`}>
            <span>{creatorSubmitStepLabel(step)}</span>
            <strong>{creatorSubmitStepStatusLabel(stepStates[step])}</strong>
          </li>
        ))}
      </ul>
    </Form>
  );
}

function CreatorListImage(props: {
  projectId: string;
  creator: Creator;
  actionUrl: string;
}) {
  const [signedReadUrl, setSignedReadUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (!props.creator.profile_image_url) {
      setSignedReadUrl(null);
      setIsLoading(false);
      setHasError(false);
      return;
    }

    let isCancelled = false;
    setIsLoading(true);
    setHasError(false);

    void requestCreatorProfileImageReadUrl({
      actionUrl: props.actionUrl,
      projectId: props.projectId,
      creatorId: props.creator.id,
    })
      .then((response) => {
        if (isCancelled) {
          return;
        }

        setSignedReadUrl(response.signed_read_url);
        setIsLoading(false);
      })
      .catch(() => {
        if (isCancelled) {
          return;
        }

        setSignedReadUrl(null);
        setIsLoading(false);
        setHasError(true);
      });

    return () => {
      isCancelled = true;
    };
  }, [
    props.actionUrl,
    props.creator.id,
    props.creator.profile_image_url,
    props.projectId,
  ]);

  if (!props.creator.profile_image_url) {
    return <span className="dashboard-muted">—</span>;
  }

  if (isLoading) {
    return <span className="dashboard-muted">Loading…</span>;
  }

  if (hasError || !signedReadUrl) {
    return <span className="dashboard-muted">Unavailable</span>;
  }

  return (
    <img
      className="business-table-avatar"
      src={signedReadUrl}
      alt={`${props.creator.full_name} profile`}
    />
  );
}

function TagInput(props: {
  label: string;
  inputLabel: string;
  name: string;
  initialTags: string[];
  placeholder?: string;
}) {
  const [tags, setTags] = useState<string[]>(sanitizeTags(props.initialTags));
  const [inputValue, setInputValue] = useState("");
  const initialTagsKey = props.initialTags.join("::");

  useEffect(() => {
    setTags(sanitizeTags(props.initialTags));
  }, [initialTagsKey]);

  function addTag(rawValue: string) {
    const value = rawValue.trim();
    if (!value) {
      return;
    }

    if (tags.some((tag) => tag.toLowerCase() === value.toLowerCase())) {
      setInputValue("");
      return;
    }

    setTags((previous) => [...previous, value]);
    setInputValue("");
  }

  function removeTag(tagToRemove: string) {
    setTags((previous) => previous.filter((tag) => tag !== tagToRemove));
  }

  return (
    <div className="studio-field business-tag-field business-field-span-full">
      <span>{props.label}</span>
      <div className="business-tag-surface">
        <div className="business-tag-list" role="list" aria-label={props.label}>
          {tags.map((tag) => (
            <Badge key={tag} className="business-tag-chip" variant="secondary" role="listitem">
              {tag}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeTag(tag)}
                aria-label={`Remove ${tag}`}
              >
                ×
              </Button>
            </Badge>
          ))}
          {tags.length === 0 ? <small>No tags yet.</small> : null}
        </div>

        <label className="business-tag-input">
          <span>{props.inputLabel}</span>
          <Input
            value={inputValue}
            placeholder={props.placeholder}
            onChange={(event) => setInputValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== "Enter" && event.key !== ",") {
                return;
              }

              event.preventDefault();
              addTag(inputValue);
            }}
            onBlur={() => addTag(inputValue)}
          />
        </label>
      </div>
      <Input type="hidden" name={props.name} value={JSON.stringify(tags)} />
    </div>
  );
}

function SocialLinksInput(props: {
  entries: SocialLinkInput[];
  onChange: (value: SocialLinkInput[]) => void;
  hiddenFieldName: string;
}) {
  const entries = props.entries;

  function updateEntry(index: number, field: keyof SocialLinkInput, value: string) {
    props.onChange(
      entries.map((entry, currentIndex) =>
        currentIndex === index ? { ...entry, [field]: value } : entry,
      ),
    );
  }

  function addEntry() {
    props.onChange([...entries, { label: "", url: "" }]);
  }

  function removeEntry(index: number) {
    props.onChange(entries.filter((_, currentIndex) => currentIndex !== index));
  }

  const serialized = JSON.stringify(
    entries
      .map((entry) => ({ label: entry.label.trim(), url: entry.url.trim() }))
      .filter((entry) => entry.label.length > 0 || entry.url.length > 0),
  );

  return (
    <div className="studio-field business-social-field">
      <span>Social links</span>
      <div className="business-social-list">
        {entries.length === 0 ? <small>No social links yet.</small> : null}

        {entries.map((entry, index) => (
          <div key={`${index}-${entry.label}`} className="business-social-row">
            <Input
              type="text"
              value={entry.label}
              placeholder="Platform or label"
              onChange={(event) => updateEntry(index, "label", event.target.value)}
            />
            <Input
              type="url"
              value={entry.url}
              placeholder="https://example.com/profile"
              onChange={(event) => updateEntry(index, "url", event.target.value)}
            />
            <Button type="button" variant="ghost" onClick={() => removeEntry(index)}>
              Remove
            </Button>
          </div>
        ))}

        <Button type="button" variant="ghost" onClick={addEntry}>
          Add social link
        </Button>
      </div>
      <Input type="hidden" name={props.hiddenFieldName} value={serialized} />
    </div>
  );
}

function createInitialCreatorSubmitStepStates(): Record<
  CreatorSubmitStep,
  CreatorSubmitStepState
> {
  return {
    save_creator: "idle",
    upload_url: "idle",
    binary_upload: "idle",
    complete: "idle",
  };
}

function creatorSubmitStepLabel(step: CreatorSubmitStep): string {
  switch (step) {
    case "save_creator":
      return "Save creator";
    case "upload_url":
      return "Request upload URL";
    case "binary_upload":
      return "Upload image";
    case "complete":
      return "Finalize image";
  }
}

function creatorSubmitStepStatusLabel(status: CreatorSubmitStepState): string {
  switch (status) {
    case "idle":
      return "Pending";
    case "loading":
      return "In progress";
    case "success":
      return "Done";
    case "error":
      return "Failed";
  }
}

function stepStateClassName(status: CreatorSubmitStepState): string {
  return status;
}

async function requestCreatorProfileImageUploadUrl(options: {
  actionUrl: string;
  projectId: string;
  creatorId: string;
  payload: CreatorImageUploadUrlRequest;
}): Promise<CreatorImageUploadUrlResponse> {
  const response = await postActionFormData<CreatorImageUploadUrlActionPayload>(
    options.actionUrl,
    toFormData({
      intent: "creator_profile_image_upload_url",
      project_id: options.projectId,
      creator_id: options.creatorId,
      file_name: options.payload.file_name,
      content_type: options.payload.content_type,
    }),
  );

  if (!response.upload) {
    throw new Error("Upload URL was not returned by the server.");
  }

  return response.upload;
}

async function requestCreatorProfileImageComplete(options: {
  actionUrl: string;
  projectId: string;
  creatorId: string;
  payload: CreatorImageCompleteRequest;
}): Promise<void> {
  await postActionFormData(
    options.actionUrl,
    toFormData({
      intent: "creator_profile_image_complete",
      project_id: options.projectId,
      creator_id: options.creatorId,
      object_key: options.payload.object_key,
    }),
  );
}

async function requestCreatorProfileImageReadUrl(options: {
  actionUrl: string;
  projectId: string;
  creatorId: string;
}): Promise<CreatorImageReadUrlResponse> {
  const response = await postActionFormData<CreatorImageReadUrlActionPayload>(
    options.actionUrl,
    toFormData({
      intent: "creator_profile_image_read_url",
      project_id: options.projectId,
      creator_id: options.creatorId,
    }),
  );

  if (!response.image) {
    throw new Error("Signed read URL was not returned by the server.");
  }

  return response.image;
}

async function uploadCreatorImageBinary(options: {
  uploadUrl: string;
  contentType: string;
  file: File;
}): Promise<void> {
  const response = await fetch(options.uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": options.contentType || "application/octet-stream",
    },
    body: options.file,
    credentials: "omit",
  });

  if (!response.ok) {
    throw new Error(`Image upload failed (HTTP ${response.status}).`);
  }
}

async function postActionFormData<T = unknown>(
  actionUrl: string,
  body: FormData,
): Promise<T> {
  const response = await fetch(actionUrl, {
    method: "POST",
    body,
  });

  const payload = parseMaybeJson(await response.text());
  if (!response.ok) {
    throw new Error(
      parseClientErrorMessage(payload, `Request failed (HTTP ${response.status}).`),
    );
  }

  return payload as T;
}

function toFormData(entries: Record<string, string>): FormData {
  const formData = new FormData();

  for (const [key, value] of Object.entries(entries)) {
    formData.set(key, value);
  }

  return formData;
}

function parseClientErrorMessage(payload: unknown, fallback: string): string {
  if (!isRecord(payload)) {
    return fallback;
  }

  if (isRecord(payload.feedback) && typeof payload.feedback.message === "string") {
    return payload.feedback.message;
  }

  if (typeof payload.message === "string") {
    return payload.message;
  }

  if (typeof payload.error === "string") {
    return payload.error;
  }

  return fallback;
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

async function runMutationAction(options: {
  session: SessionType;
  apiBaseUrl: string;
  path: string;
  method: "POST" | "PATCH" | "DELETE";
  body?: unknown;
  successMessage: string;
}) {
  try {
    const result = await sendAuthenticatedRequest({
      session: options.session,
      apiBaseUrl: options.apiBaseUrl,
      path: options.path,
      method: options.method,
      body: options.body,
    });

    const headers = result.setCookie ? { "Set-Cookie": result.setCookie } : undefined;

    if (!result.response.ok) {
      return data(
        {
          feedback: {
            kind: "error",
            message: parseApiErrorMessage(
              result.responseData,
              `Request failed (HTTP ${result.response.status}).`,
            ),
          } satisfies ActionFeedback,
        },
        {
          status: result.response.status,
          headers,
        },
      );
    }

    return data(
      {
        feedback: {
          kind: "success",
          message: options.successMessage,
        } satisfies ActionFeedback,
      },
      { headers },
    );
  } catch (caughtError) {
    const message = caughtError instanceof Error ? caughtError.message : "Unexpected server error.";

    return data(
      {
        feedback: {
          kind: "error",
          message,
        } satisfies ActionFeedback,
      },
      { status: 500 },
    );
  }
}

async function runCreatorMutationAction(options: {
  session: SessionType;
  apiBaseUrl: string;
  path: string;
  method: "POST" | "PATCH";
  body: CreatorCreateRequest | CreatorUpdateRequest;
  successMessage: string;
}) {
  try {
    const result = await sendAuthenticatedRequest({
      session: options.session,
      apiBaseUrl: options.apiBaseUrl,
      path: options.path,
      method: options.method,
      body: options.body,
    });

    const headers = result.setCookie ? { "Set-Cookie": result.setCookie } : undefined;

    if (!result.response.ok) {
      return data(
        {
          feedback: {
            kind: "error",
            message: parseApiErrorMessage(
              result.responseData,
              `Request failed (HTTP ${result.response.status}).`,
            ),
          } satisfies ActionFeedback,
        },
        {
          status: result.response.status,
          headers,
        },
      );
    }

    return data(
      {
        feedback: {
          kind: "success",
          message: options.successMessage,
        } satisfies ActionFeedback,
        creator: asCreator(result.responseData),
      } satisfies CreatorMutationActionPayload,
      { headers },
    );
  } catch (caughtError) {
    const message = caughtError instanceof Error ? caughtError.message : "Unexpected server error.";

    return data(
      {
        feedback: {
          kind: "error",
          message,
        } satisfies ActionFeedback,
      },
      { status: 500 },
    );
  }
}

function emptyLoaderData(isAuthenticated: boolean) {
  return {
    isAuthenticated,
    projects: [] as Project[],
    activeProjectId: null as string | null,
    brandProfile: null as BrandProfile | null,
    creators: [] as Creator[],
    editingCreator: null as Creator | null,
    errors: {} as LoaderErrors,
  };
}

function isHomeIntent(value: string): value is HomeIntent {
  return (
    value === "logout" ||
    value === "brand_profile_save" ||
    value === "creator_create" ||
    value === "creator_update" ||
    value === "creator_delete" ||
    value === "creator_profile_image_upload_url" ||
    value === "creator_profile_image_complete" ||
    value === "creator_profile_image_read_url"
  );
}

function projectBrandProfilePath(projectId: string): string {
  return `/api/v1/brand/projects/${encodeURIComponent(projectId)}/brand-profile`;
}

function projectCreatorsPath(projectId: string): string {
  return `/api/v1/brand/projects/${encodeURIComponent(projectId)}/creators`;
}

function projectCreatorPath(projectId: string, creatorId: string): string {
  return `${projectCreatorsPath(projectId)}/${encodeURIComponent(creatorId)}`;
}

function projectCreatorProfileImageUploadUrlPath(
  projectId: string,
  creatorId: string,
): string {
  return `${projectCreatorPath(projectId, creatorId)}/profile-image/upload-url`;
}

function projectCreatorProfileImageCompletePath(
  projectId: string,
  creatorId: string,
): string {
  return `${projectCreatorPath(projectId, creatorId)}/profile-image/complete`;
}

function projectCreatorProfileImageReadUrlPath(
  projectId: string,
  creatorId: string,
): string {
  return `${projectCreatorPath(projectId, creatorId)}/profile-image/read-url`;
}

function buildProjectHref(
  projectId: string | null,
  extras?: Record<string, string | undefined>,
  basePath = "/",
): string {
  const query = new URLSearchParams();

  if (projectId) {
    query.set("project", projectId);
  }

  for (const [key, value] of Object.entries(extras ?? {})) {
    if (!value) {
      continue;
    }

    query.set(key, value);
  }

  const serialized = query.toString();
  return serialized ? `${basePath}?${serialized}` : basePath;
}

function buildBrandProfilePayload(formData: FormData): BrandProfileUpdateRequest {
  return {
    company_name: readOptionalFormString(formData, "company_name"),
    tagline: readOptionalFormString(formData, "tagline"),
    address: readOptionalFormString(formData, "address"),
    city: readOptionalFormString(formData, "city"),
    country: readOptionalFormString(formData, "country"),
    zip_code: readOptionalFormString(formData, "zip_code"),
    phone: readOptionalFormString(formData, "phone"),
    mobile: readOptionalFormString(formData, "mobile"),
    fax: readOptionalFormString(formData, "fax"),
    email: readOptionalFormString(formData, "email"),
    website: readOptionalFormString(formData, "website"),
    display_website: readOptionalFormString(formData, "display_website"),
    blog: readOptionalFormString(formData, "blog"),
    twitter: readOptionalFormString(formData, "twitter"),
    facebook: readOptionalFormString(formData, "facebook"),
    instagram: readOptionalFormString(formData, "instagram"),
    linkedin: readOptionalFormString(formData, "linkedin"),
    tiktok: readOptionalFormString(formData, "tiktok"),
    video: readOptionalFormString(formData, "video"),
    instant_messenger: readOptionalFormString(formData, "instant_messenger"),
    business_tags: parseTagsFromFormData(formData.get("business_tags_json")),
  };
}

function buildCreatorPayload(formData: FormData): CreatorCreateRequest {
  return {
    full_name: readRequiredFormString(formData, "full_name"),
    role: readOptionalFormString(formData, "role"),
    bio: readOptionalFormString(formData, "bio"),
    email: readOptionalFormString(formData, "email"),
    phone: readOptionalFormString(formData, "phone"),
    website: readOptionalFormString(formData, "website"),
    profile_image_url: readOptionalFormString(formData, "profile_image_url"),
    twitter: readOptionalFormString(formData, "twitter"),
    facebook: readOptionalFormString(formData, "facebook"),
    instagram: readOptionalFormString(formData, "instagram"),
    linkedin: readOptionalFormString(formData, "linkedin"),
    tiktok: readOptionalFormString(formData, "tiktok"),
    youtube: readOptionalFormString(formData, "youtube"),
    social_links: parseSocialLinksFromFormData(formData.get("social_links_json")),
    expertise_tags: parseTagsFromFormData(formData.get("expertise_tags_json")),
  };
}

function parseTagsFromFormData(value: FormDataEntryValue | null): string[] | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (!Array.isArray(parsed)) {
      return null;
    }

    const tags = sanitizeTags(
      parsed.map((item) => (typeof item === "string" ? item : "")).filter(Boolean),
    );

    return tags.length > 0 ? tags : null;
  } catch {
    return null;
  }
}

function parseSocialLinksFromFormData(
  value: FormDataEntryValue | null,
): Array<{ label: string; url: string }> | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const parsed = JSON.parse(trimmed) as unknown;
    if (!Array.isArray(parsed)) {
      return null;
    }

    const entries = parsed.reduce<Array<{ label: string; url: string }>>((acc, item) => {
      if (!isRecord(item)) {
        return acc;
      }

      const label = toOptionalString(item.label);
      const url = toOptionalString(item.url);

      if (!label && !url) {
        return acc;
      }

      acc.push({
        label: label ?? "",
        url: url ?? "",
      });

      return acc;
    }, []);

    return entries.length > 0 ? entries : null;
  } catch {
    return null;
  }
}

function validateBrandPayload(payload: BrandProfileUpdateRequest): string | null {
  if (payload.email && !isValidEmail(payload.email)) {
    return "Brand email must be a valid email address.";
  }

  for (const field of BRAND_URL_FIELDS) {
    const value = payload[field];
    if (value && !isValidHttpUrl(value)) {
      return `${formatLabel(field)} must be a valid URL (include http:// or https://).`;
    }
  }

  return null;
}

function validateCreatorPayload(payload: CreatorCreateRequest | CreatorUpdateRequest): string | null {
  const fullName = toOptionalString(payload.full_name);
  if (!fullName) {
    return "Creator full name is required.";
  }

  if (payload.email && !isValidEmail(payload.email)) {
    return "Creator email must be a valid email address.";
  }

  for (const field of CREATOR_URL_FIELDS) {
    const value = payload[field];
    if (value && !isValidHttpUrl(value)) {
      return `${formatLabel(field)} must be a valid URL (include http:// or https://).`;
    }
  }

  if (Array.isArray(payload.social_links)) {
    for (const entry of payload.social_links) {
      if (!isRecord(entry)) {
        continue;
      }

      const url = toOptionalString(entry.url);
      if (url && !isValidHttpUrl(url)) {
        return "Each social link URL must be valid (include http:// or https://).";
      }
    }
  }

  return null;
}

function readRequiredFormString(formData: FormData, key: string): string {
  return toOptionalString(formData.get(key)) ?? "";
}

function readOptionalFormString(formData: FormData, key: string): string | null {
  return toOptionalString(formData.get(key)) ?? null;
}

function sanitizeTags(tags: string[]): string[] {
  const unique = new Set<string>();

  for (const tag of tags) {
    const value = tag.trim();
    if (!value) {
      continue;
    }

    unique.add(value);
  }

  return Array.from(unique);
}

function normalizeSocialLinks(value: Creator["social_links"]): SocialLinkInput[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => {
      if (!isRecord(entry)) {
        return null;
      }

      return {
        label: toOptionalString(entry.label) ?? "",
        url: toOptionalString(entry.url) ?? "",
      };
    })
    .filter((entry): entry is SocialLinkInput => entry !== null);
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function pickSetCookie(current: string | null, next: string | null): string | null {
  return next ?? current;
}

function pickActiveProjectId(projects: Project[], requestedProjectId?: string): string | null {
  if (requestedProjectId && projects.some((project) => project.id === requestedProjectId)) {
    return requestedProjectId;
  }

  return projects[0]?.id ?? null;
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

  return value.filter((item): item is Creator => isRecord(item) && typeof item.id === "string");
}

function asBrandProfile(value: unknown): BrandProfile | null {
  if (!isRecord(value) || typeof value.id !== "string") {
    return null;
  }

  return value as BrandProfile;
}

function asCreator(value: unknown): Creator | null {
  if (!isRecord(value) || typeof value.id !== "string") {
    return null;
  }

  return value as Creator;
}

function asCreatorImageUploadUrlResponse(
  value: unknown,
): CreatorImageUploadUrlResponse | null {
  if (!isRecord(value)) {
    return null;
  }

  if (
    typeof value.upload_url !== "string" ||
    typeof value.object_key !== "string" ||
    typeof value.storage_location !== "string" ||
    typeof value.expires_in_seconds !== "number" ||
    typeof value.max_bytes !== "number"
  ) {
    return null;
  }

  return value as CreatorImageUploadUrlResponse;
}

function asCreatorImageReadUrlResponse(value: unknown): CreatorImageReadUrlResponse | null {
  if (!isRecord(value)) {
    return null;
  }

  if (
    typeof value.signed_read_url !== "string" ||
    typeof value.object_key !== "string" ||
    typeof value.storage_location !== "string" ||
    typeof value.expires_in_seconds !== "number"
  ) {
    return null;
  }

  return value as CreatorImageReadUrlResponse;
}

function valueOrEmpty(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function valueOrDash(value: unknown): string {
  const parsed = toOptionalString(value);
  return parsed ?? "—";
}

function formatLabel(value: string): string {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function toOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
