import { data, useLoaderData } from "react-router";

import type { Route } from "./+types/home";
import { API_ROUTES, isApiDirectoryCountResponse } from "~/lib/api-contract";
import { sendAuthenticatedRequest } from "~/lib/authenticated-api.server";
import { getServerApiBaseUrl } from "~/lib/api-base-url.server";
import { getSession } from "~/lib/session.server";
import { HomeHero } from "~/components/home-hero";
import { MockDirectoriesTable, DIRECTORIES } from "~/components/directories-table";
import { HowItWorks } from "~/components/how-it-works";
import { PricingSection } from "~/components/pricing-section";

type LoaderData = {
  isAuthenticated: boolean;
  directoryCount: number | null;
};

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Donkey Directories Dashboard" },
    {
      name: "description",
      content: "Donkey Directories dashboard — browse all directories.",
    },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const apiBaseUrl = getServerApiBaseUrl();
  const session = await getSession(request.headers.get("Cookie"));
  const hasSessionTokens =
    Boolean(toOptionalString(session.get("accessToken"))) ||
    Boolean(toOptionalString(session.get("refreshToken")));
  const directoryCount = await fetchDirectoryCount(apiBaseUrl);

  if (!hasSessionTokens) {
    return data<LoaderData>({
      isAuthenticated: false,
      directoryCount,
    });
  }

  const authResult = await sendAuthenticatedRequest({
    session,
    apiBaseUrl,
    path: API_ROUTES.auth.me,
    method: "GET",
  });

  return data<LoaderData>(
    {
      isAuthenticated: authResult.response.status === 200,
      directoryCount,
    },
    {
      headers: authResult.setCookie
        ? {
            "Set-Cookie": authResult.setCookie,
          }
        : undefined,
    },
  );
}

export default function HomePage() {
  const { isAuthenticated, directoryCount } = useLoaderData<typeof loader>();

  return (
    <div className="mx-auto w-[min(1200px,calc(100vw-2rem))] max-[960px]:w-[min(1200px,calc(100vw-1rem))] py-8 space-y-8">
      <HomeHero
        isAuthenticated={isAuthenticated}
        directoryCount={directoryCount}
        localDirectoryCount={DIRECTORIES.length}
      />
      <MockDirectoriesTable
        isAuthenticated={isAuthenticated}
        directoryCount={directoryCount}
      />
      <HowItWorks />
      <PricingSection isAuthenticated={isAuthenticated} />
    </div>
  );
}

function toOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

async function fetchDirectoryCount(apiBaseUrl: string): Promise<number | null> {
  try {
    const response = await fetch(`${apiBaseUrl}${API_ROUTES.directories.count}`);

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as unknown;

    if (!isApiDirectoryCountResponse(payload)) {
      return null;
    }

    return payload.total;
  } catch {
    return null;
  }
}
