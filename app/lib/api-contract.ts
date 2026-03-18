import type { components, operations, paths } from "~/types/api.generated";

export type ApiPath = keyof paths;
export type ExtensionApiPath =
  | "/api/v1/auth/extension/connect-codes"
  | "/api/v1/auth/extension/connect-codes/exchange";
export type AppApiPath = ApiPath | ExtensionApiPath;

export const API_ROUTES = {
  auth: {
    register: "/api/v1/auth/register",
    login: "/api/v1/auth/login",
    refresh: "/api/v1/auth/refresh",
    me: "/api/v1/auth/me",
    extensionConnectCodes: "/api/v1/auth/extension/connect-codes",
    extensionConnectCodesExchange:
      "/api/v1/auth/extension/connect-codes/exchange",
  },
  brand: {
    extract: "/api/v1/brand/extract",
    projects: "/api/v1/brand/projects",
  },
  directories: {
    list: "/api/v1/directories/",
    count: "/api/v1/directories/count",
    statsSummary: "/api/v1/directories/stats/summary",
  },
  billing: {
    credits: "/api/v1/billing/credits",
    checkoutSession: "/api/v1/billing/checkout-session",
  },
} as const satisfies {
  auth: {
    register: ApiPath;
    login: ApiPath;
    refresh: ApiPath;
    me: ApiPath;
    extensionConnectCodes: ExtensionApiPath;
    extensionConnectCodesExchange: ExtensionApiPath;
  };
  brand: {
    extract: ApiPath;
    projects: ApiPath;
  };
  directories: {
    list: ApiPath;
    count: ApiPath;
    statsSummary: ApiPath;
  };
  billing: {
    credits: ApiPath;
    checkoutSession: ApiPath;
  };
};

export type ApiToken = components["schemas"]["Token"];
export type ApiUserResponse = components["schemas"]["UserResponse"];
export type ApiRegisterRequest =
  operations["register_api_v1_auth_register_post"]["requestBody"]["content"]["application/json"];
export type ApiLoginRequest =
  operations["login_api_v1_auth_login_post"]["requestBody"]["content"]["application/json"];
export type ApiRefreshRequest =
  operations["refresh_token_api_v1_auth_refresh_post"]["requestBody"]["content"]["application/json"];
export type ApiBrandExtractRequest =
  operations["extract_brand_profile_api_v1_brand_extract_post"]["requestBody"]["content"]["application/json"];
export type ApiDirectoryCountResponse =
  components["schemas"]["DirectoryCountResponse"];
export type ApiDirectoryVoteChoice = "up" | "down";

type ApiDirectoryVoteMetrics = {
  thumbs_up_count: number;
  thumbs_down_count: number;
  total_votes: number;
  thumbs_up_percentage: number;
};

export interface ApiDirectoryVoteRequest {
  vote: ApiDirectoryVoteChoice;
}

export type ApiDirectoryVoteSummaryResponse = ApiDirectoryVoteMetrics;

export interface ApiDirectoryUserVoteResponse {
  directory_id: string;
  my_vote: ApiDirectoryVoteChoice | null;
}

export type ApiDirectoryResponse = components["schemas"]["DirectoryResponse"] &
  ApiDirectoryVoteMetrics & {
    my_vote: ApiDirectoryVoteChoice | null;
  };

export type ApiDirectoryListItemResponse =
  components["schemas"]["DirectoryListItemResponse"];

export type ApiDirectoryListResponse =
  components["schemas"]["DirectoryListResponse"];

export interface CreateExtensionConnectCodeRequest {
  client: "chrome_extension";
}

export interface CreateExtensionConnectCodeResponse {
  code: string;
  expires_at: string;
  expires_in_seconds: number;
}

export interface ExchangeExtensionConnectCodeRequest {
  client: "chrome_extension";
  code: string;
}

export interface ExchangeExtensionConnectCodeResponse extends ApiToken {
  user?: {
    email?: string;
  };
}

export function isApiToken(value: unknown): value is ApiToken {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.access_token === "string" &&
    typeof value.refresh_token === "string" &&
    (typeof value.token_type === "string" || typeof value.token_type === "undefined")
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function isCreateExtensionConnectCodeResponse(
  value: unknown
): value is CreateExtensionConnectCodeResponse {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.code === "string" &&
    typeof value.expires_at === "string" &&
    typeof value.expires_in_seconds === "number"
  );
}

export function isExchangeExtensionConnectCodeResponse(
  value: unknown
): value is ExchangeExtensionConnectCodeResponse {
  if (!isApiToken(value)) {
    return false;
  }

  if (!("user" in value) || value.user == null) {
    return true;
  }

  if (!isRecord(value.user)) {
    return false;
  }

  if (!("email" in value.user)) {
    return true;
  }

  return typeof value.user.email === "string";
}

export function isApiDirectoryCountResponse(
  value: unknown
): value is ApiDirectoryCountResponse {
  if (!isRecord(value)) {
    return false;
  }

  return typeof value.total === "number";
}

export function directoryPath(directoryId: string): string {
  return `/api/v1/directories/${encodeURIComponent(directoryId)}`;
}

export function directoryVotePath(directoryId: string): string {
  return `${directoryPath(directoryId)}/vote`;
}

export function directorySubmissionCountsPath(projectId: string): string {
  return `/api/v1/directories/projects/${encodeURIComponent(projectId)}/submission-counts`;
}

export type ApiProjectSubmissionCountsResponse =
  components["schemas"]["ProjectDirectorySubmissionCountsResponse"];

export type ApiBillingPackCode = components["schemas"]["BillingPackCode"];
export type ApiCreditBalanceResponse = components["schemas"]["CreditBalanceResponse"];
export type ApiCreditPackOption = components["schemas"]["CreditPackOption"];
export type ApiCheckoutSessionCreateRequest = components["schemas"]["CheckoutSessionCreateRequest"];
export type ApiCheckoutSessionCreateResponse = components["schemas"]["CheckoutSessionCreateResponse"];

export function isApiCreditBalanceResponse(
  value: unknown
): value is ApiCreditBalanceResponse {
  if (!isRecord(value)) {
    return false;
  }
  return typeof value.credit_balance === "number" && typeof value.lifetime_unlimited === "boolean";
}

export function isApiCheckoutSessionCreateResponse(
  value: unknown
): value is ApiCheckoutSessionCreateResponse {
  if (!isRecord(value)) {
    return false;
  }
  return typeof value.checkout_url === "string" && typeof value.session_id === "string";
}

export function isApiDirectoryVoteChoice(
  value: unknown
): value is ApiDirectoryVoteChoice {
  return value === "up" || value === "down";
}

export function isApiDirectoryVoteSummaryResponse(
  value: unknown
): value is ApiDirectoryVoteSummaryResponse {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.thumbs_up_count === "number" &&
    typeof value.thumbs_down_count === "number" &&
    typeof value.total_votes === "number" &&
    typeof value.thumbs_up_percentage === "number"
  );
}

export function isApiDirectoryUserVoteResponse(
  value: unknown
): value is ApiDirectoryUserVoteResponse {
  if (!isRecord(value)) {
    return false;
  }

  if (typeof value.directory_id !== "string") {
    return false;
  }

  return value.my_vote === null || isApiDirectoryVoteChoice(value.my_vote);
}
