import { data, useLoaderData } from "react-router";
import { Link } from "react-router";

import type { Route } from "./+types/about";
import { API_ROUTES } from "~/lib/api-contract";
import { sendAuthenticatedRequest } from "~/lib/authenticated-api.server";
import { getServerApiBaseUrl } from "~/lib/api-base-url.server";
import { getSession } from "~/lib/session.server";

type LoaderData = {
  isAuthenticated: boolean;
};

function toOptionalString(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim().length > 0) return value.trim();
  return undefined;
}

export async function loader({ request }: Route.LoaderArgs) {
  const apiBaseUrl = getServerApiBaseUrl();
  const session = await getSession(request.headers.get("Cookie"));
  const hasSessionTokens =
    Boolean(toOptionalString(session.get("accessToken"))) ||
    Boolean(toOptionalString(session.get("refreshToken")));

  if (!hasSessionTokens) {
    return data<LoaderData>({ isAuthenticated: false });
  }

  const authResult = await sendAuthenticatedRequest({
    session,
    apiBaseUrl,
    path: API_ROUTES.auth.me,
    method: "GET",
  });

  return data<LoaderData>(
    { isAuthenticated: authResult.response.status === 200 },
    {
      headers: authResult.setCookie
        ? { "Set-Cookie": authResult.setCookie }
        : undefined,
    },
  );
}

export function meta({}: Route.MetaArgs) {
  return [
    { title: "About | Donkey Directories" },
    {
      name: "description",
      content:
        "The story behind Donkey Directories.",
    },
  ];
}

export default function AboutPage() {
  return (
    <div className="mx-auto w-full max-w-[680px] px-4 py-10 sm:px-6 sm:py-10 lg:px-8">

      {/* Single card */}
      <div className="rounded-xl border-2 border-foreground bg-card shadow-[var(--shadow-md)]">

        {/* Header strip */}
        <div className="flex items-center gap-3 border-b-2 border-foreground px-6 py-4 sm:px-8">
          <img
            src="/static/donkey-64.webp"
            srcSet="/static/donkey-64.webp 64w, /static/donkey-128.webp 128w"
            sizes="28px"
            width={28}
            height={28}
            alt=""
            aria-hidden="true"
            className="h-7 w-7 object-contain"
          />
          <h1 className="m-0 font-heading text-xl font-bold">Yes, I got frustrated by the app submission process</h1>
        </div>

        {/* Body */}
        <div className="space-y-5 px-6 py-7 text-sm leading-relaxed text-foreground sm:px-8 sm:py-8 sm:text-base">
          <p>
            When I launched my first product, I quickly learned that getting it in front of people
            means submitting it to a long list of launch directories. ProductHunt, BetaList, Uneed,
            and hundreds more. <strong>Fine in theory. Painful in practice.</strong>
          </p>

          <p>
            Every site had its own form. Every form wanted the same fields. Product name, tagline,
            description, logo, website URL, social links. I ended up{" "}
            <strong>copy-pasting the same information over and over</strong>, losing track of where
            I had already submitted and where I still needed to go. There was{" "}
            <strong>no good overview of which directories even existed</strong>, let alone which
            ones were worth the effort. 😤
          </p>

          {/* Inline pull quote */}
          <p className="rounded-lg border-2 border-foreground bg-[#C3F73A] px-4 py-3 font-heading text-lg font-bold text-foreground shadow-[var(--shadow-sm)]">
            So I built Donkey Directories to fix that.
          </p>

          <p>
            It gives you a browsable list of <strong>250+ launch directories</strong> with the
            details that actually matter: category, pricing, whether you get a dofollow link,
            domain authority. You can filter and find the ones worth submitting to, then{" "}
            <strong>track each one from not started to submitted</strong> so you always know where
            you stand.
          </p>

          <p>
            The Chrome extension handles the tedious part. Store your brand details once, then{" "}
            <strong>fill any directory form with a single click</strong>. No more hunting through
            your notes for the right tagline or resizing your logo for the fifth time. 🙌
          </p>

          <p>
            I hope it saves you the same headache it saved me. If you have questions, run into
            something broken, or just want to share how your launch went, come say hi on X.
          </p>

          <a
            href="https://x.com/sjorsfestt"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border-2 border-foreground bg-[#C3F73A] px-4 py-2 text-sm font-bold text-foreground shadow-[var(--shadow-btn)] transition-all active:translate-x-[2px] active:translate-y-[2px] active:shadow-[var(--shadow-pressed)] hover:bg-[#b8ec2e]"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.747l7.73-8.835L1.254 2.25H8.08l4.261 5.633 5.903-5.633Zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            @sjorsfestt
          </a>
        </div>
      </div>

    </div>
  );
}
