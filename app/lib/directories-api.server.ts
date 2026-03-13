import type { operations } from "~/types/api.generated";
import {
  API_ROUTES,
  directoryPath,
  directoryVotePath,
  type ApiDirectoryVoteChoice,
  type ApiDirectoryVoteRequest,
} from "~/lib/api-contract";
import {
  sendAuthenticatedRequest,
  type AuthenticatedRequestResult,
  type SessionType,
} from "~/lib/authenticated-api.server";

export type ListDirectoriesQuery =
  operations["list_directories_api_v1_directories__get"]["parameters"]["query"];

export type GetDirectoryQuery =
  operations["get_directory_api_v1_directories__directory_id__get"]["parameters"]["query"];

export async function listDirectoriesRequest(options: {
  session: SessionType;
  apiBaseUrl: string;
  query?: ListDirectoriesQuery;
}): Promise<AuthenticatedRequestResult> {
  return sendAuthenticatedRequest({
    session: options.session,
    apiBaseUrl: options.apiBaseUrl,
    path: appendQueryParams(API_ROUTES.directories.list, options.query),
    method: "GET",
  });
}

export async function getDirectoryRequest(options: {
  session: SessionType;
  apiBaseUrl: string;
  directoryId: string;
  query?: GetDirectoryQuery;
}): Promise<AuthenticatedRequestResult> {
  return sendAuthenticatedRequest({
    session: options.session,
    apiBaseUrl: options.apiBaseUrl,
    path: appendQueryParams(directoryPath(options.directoryId), options.query),
    method: "GET",
  });
}

export async function putDirectoryVoteRequest(options: {
  session: SessionType;
  apiBaseUrl: string;
  directoryId: string;
  vote: ApiDirectoryVoteChoice;
}): Promise<AuthenticatedRequestResult> {
  const body: ApiDirectoryVoteRequest = { vote: options.vote };

  return sendAuthenticatedRequest({
    session: options.session,
    apiBaseUrl: options.apiBaseUrl,
    path: directoryVotePath(options.directoryId),
    method: "PUT",
    body,
  });
}

export async function deleteDirectoryVoteRequest(options: {
  session: SessionType;
  apiBaseUrl: string;
  directoryId: string;
}): Promise<AuthenticatedRequestResult> {
  return sendAuthenticatedRequest({
    session: options.session,
    apiBaseUrl: options.apiBaseUrl,
    path: directoryVotePath(options.directoryId),
    method: "DELETE",
  });
}

export async function getDirectoryVoteRequest(options: {
  session: SessionType;
  apiBaseUrl: string;
  directoryId: string;
}): Promise<AuthenticatedRequestResult> {
  return sendAuthenticatedRequest({
    session: options.session,
    apiBaseUrl: options.apiBaseUrl,
    path: directoryVotePath(options.directoryId),
    method: "GET",
  });
}

function appendQueryParams(
  path: string,
  query: Record<string, unknown> | undefined
): string {
  if (!query) {
    return path;
  }

  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    appendQueryValue(searchParams, key, value);
  }

  const queryString = searchParams.toString();
  return queryString.length > 0 ? `${path}?${queryString}` : path;
}

function appendQueryValue(
  searchParams: URLSearchParams,
  key: string,
  value: unknown
) {
  if (value === null || value === undefined) {
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      appendQueryValue(searchParams, key, item);
    }
    return;
  }

  if (typeof value === "string") {
    if (value.length > 0) {
      searchParams.append(key, value);
    }
    return;
  }

  if (typeof value === "number") {
    if (Number.isFinite(value)) {
      searchParams.append(key, String(value));
    }
    return;
  }

  if (typeof value === "boolean") {
    searchParams.append(key, value ? "true" : "false");
  }
}
