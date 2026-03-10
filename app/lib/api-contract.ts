import type { components, operations, paths } from "~/types/api.generated";

export type ApiPath = keyof paths;

export const API_ROUTES = {
  auth: {
    register: "/api/v1/auth/register",
    login: "/api/v1/auth/login",
    refresh: "/api/v1/auth/refresh",
    me: "/api/v1/auth/me",
  },
  brand: {
    extract: "/api/v1/brand/extract",
  },
} as const satisfies {
  auth: {
    register: ApiPath;
    login: ApiPath;
    refresh: ApiPath;
    me: ApiPath;
  };
  brand: {
    extract: ApiPath;
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
