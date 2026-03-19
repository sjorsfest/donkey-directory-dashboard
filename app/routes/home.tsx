import { data, useLoaderData } from "react-router";

import type { Route } from "./+types/home";
import { API_ROUTES, isApiDirectoryCountResponse } from "~/lib/api-contract";
import { sendAuthenticatedRequest } from "~/lib/authenticated-api.server";
import { getServerApiBaseUrl } from "~/lib/api-base-url.server";
import { getSession } from "~/lib/session.server";
import { HomeHero } from "~/components/home-hero";
import { MockDirectoriesTable, DIRECTORIES } from "~/components/mock-table";
import { HowItWorks } from "~/components/how-it-works";
import { PricingSection } from "~/components/pricing-section";
import { FAQSection } from "~/components/faq-section";
import { FinalCtaSection } from "~/components/final-cta-section";
import { MAIN_ORIGIN } from "@/shared/lib/main-domain";

type LoaderData = {
  isAuthenticated: boolean;
  directoryCount: number | null;
};

const SEO_TITLE = "Donkey Directories Dashboard";
const SEO_DESCRIPTION =
  "Discover 250+ launch directories, autofill submissions in one click, and track every listing from one dashboard.";
const OG_IMAGE_URL = "https://www.donkey.directory/og/og-image.png?v=3";
const OG_IMAGE_ALT = "Donkey Directories — discover 250+ launch directories and track every listing in one place";

export function meta({}: Route.MetaArgs) {
  const canonicalUrl = `${MAIN_ORIGIN}/`;

  return [
    { title: SEO_TITLE },
    {
      name: "description",
      content: SEO_DESCRIPTION,
    },
    { name: "robots", content: "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" },
    { name: "googlebot", content: "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" },
    {
      name: "keywords",
      content:
        "donkey directories, startup directories, product launch directories, submit startup, directory submission tool, launch marketing",
    },
    { tagName: "link", rel: "canonical", href: canonicalUrl },
    { property: "og:type", content: "website" },
    { property: "og:site_name", content: "Donkey Directories" },
    { property: "og:title", content: SEO_TITLE },
    { property: "og:description", content: SEO_DESCRIPTION },
    { property: "og:url", content: canonicalUrl },
    { property: "og:locale", content: "en_US" },
    { property: "og:image", content: OG_IMAGE_URL },
    { property: "og:image:secure_url", content: OG_IMAGE_URL },
    { property: "og:image:width", content: "908" },
    { property: "og:image:height", content: "477" },
    { property: "og:image:alt", content: OG_IMAGE_ALT },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: SEO_TITLE },
    { name: "twitter:description", content: SEO_DESCRIPTION },
    { name: "twitter:image", content: OG_IMAGE_URL },
    { name: "twitter:image:src", content: OG_IMAGE_URL },
    { name: "twitter:image:alt", content: OG_IMAGE_ALT },
    {
      "script:ld+json": {
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "WebSite",
            name: "Donkey Directories",
            url: MAIN_ORIGIN,
            description: SEO_DESCRIPTION,
          },
          {
            "@type": "SoftwareApplication",
            name: "Donkey Directories Dashboard",
            applicationCategory: "BusinessApplication",
            operatingSystem: "Web",
            url: MAIN_ORIGIN,
            offers: {
              "@type": "Offer",
              price: "0",
              priceCurrency: "EUR",
            },
          },
        ],
      },
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

  const meData = authResult.responseData;
  const emailVerified =
    authResult.response.status === 200 &&
    typeof meData === "object" &&
    meData !== null &&
    "email_verified" in meData &&
    (meData as Record<string, unknown>).email_verified === true;

  return data<LoaderData>(
    {
      isAuthenticated: emailVerified,
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
    <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">
      <HomeHero
        isAuthenticated={isAuthenticated}
        directoryCount={directoryCount}
        localDirectoryCount={250}
      />
      <MockDirectoriesTable
        isAuthenticated={isAuthenticated}
        directoryCount={directoryCount}
      />
      <HowItWorks />
      <PricingSection isAuthenticated={isAuthenticated} />
      <FAQSection />
      <FinalCtaSection isAuthenticated={isAuthenticated} />
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
