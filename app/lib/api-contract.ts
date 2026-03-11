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
