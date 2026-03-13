import { Form, Link, Outlet, data, redirect, useLoaderData, useMatch, useNavigation } from "react-router";

import type { Route } from "./+types/_nav";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/lib/utils";
import { API_ROUTES } from "~/lib/api-contract";
import { sendAuthenticatedRequest } from "~/lib/authenticated-api.server";
import { getServerApiBaseUrl } from "~/lib/api-base-url.server";
import { destroySession, getSession } from "~/lib/session.server";

export async function loader({ request }: Route.LoaderArgs) {
  const session = await getSession(request.headers.get("Cookie"));
  const hasSessionTokens =
    Boolean(toOptionalString(session.get("accessToken"))) ||
    Boolean(toOptionalString(session.get("refreshToken")));

  if (!hasSessionTokens) {
    return data({ isAuthenticated: false });
  }

  const authResult = await sendAuthenticatedRequest({
    session,
    apiBaseUrl: getServerApiBaseUrl(),
    path: API_ROUTES.auth.me,
    method: "GET",
  });

  return data(
    { isAuthenticated: authResult.response.status === 200 },
    authResult.setCookie ? { headers: { "Set-Cookie": authResult.setCookie } } : undefined,
  );
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "logout") {
    const session = await getSession(request.headers.get("Cookie"));
    return redirect("/", {
      headers: { "Set-Cookie": await destroySession(session) },
    });
  }

  return data({ error: "Unsupported intent" }, { status: 400 });
}

export default function NavLayout() {
  const { isAuthenticated } = useLoaderData<typeof loader>();
  const navigation = useNavigation();
  const isLoggingOut =
    navigation.state !== "idle" && navigation.formData?.get("intent") === "logout";
  const launchMatch = useMatch("/launch");
  const navLinkButtonBaseClass =
    "inline-flex items-center justify-center gap-2 rounded-lg border-2 border-foreground px-4 py-2 text-sm font-bold no-underline shadow-[var(--shadow-btn)] transition-all hover:-translate-x-px hover:-translate-y-px hover:shadow-[var(--shadow-md)] active:translate-x-px active:translate-y-px active:shadow-[var(--shadow-pressed)]";
  const navLinkButtonPrimaryClass = `${navLinkButtonBaseClass} bg-primary text-primary-foreground`;

  return (
    <main className="pt-4 pb-12">
      <header className="sticky top-0 z-20 pt-4 pb-3">
        <div className="mx-auto w-[min(1200px,calc(100vw-2rem))] max-[960px]:w-[min(1200px,calc(100vw-1rem))]">
          <nav className="flex flex-wrap items-center justify-between gap-4 rounded-[1.25rem] border-2 border-foreground bg-card px-4 py-3 shadow-[var(--shadow-md)]">
            <Link className="group inline-flex items-center gap-3 no-underline" to="/">
              <img
                src="/static/donkey.png"
                alt="Donkey Directories"
                className="block h-12 w-12 object-contain transition-transform duration-300 group-hover:scale-110"
              />
              <span>
                <strong className="font-[Fredoka,_Nunito,_ui-sans-serif,_system-ui,_sans-serif] text-3xl font-bold tracking-[-0.02em] text-primary [-webkit-text-stroke:3px_hsl(var(--foreground))] [paint-order:stroke_fill]">
                  Donkey Directories
                </strong>
              </span>
            </Link>

            {!isAuthenticated ? (
              <div className="flex flex-wrap items-center gap-3">
                <Link className={navLinkButtonPrimaryClass} to="/signup">
                  Sign up
                </Link>
                <Link className={navLinkButtonPrimaryClass} to="/login">
                  Login
                </Link>
              </div>
            ) : (
              <Form method="post" className="flex flex-wrap items-center gap-3">
                <Link
                  to="/launch"
                  className={cn(
                    navLinkButtonPrimaryClass,
                    launchMatch && "bg-[hsl(78_72%_42%)] text-[hsl(0_0%_10%)]",
                  )}
                >
                  Launch
                </Link>
                <Button type="submit" variant="destructive" name="intent" value="logout">
                  {isLoggingOut ? "Logging out..." : "Logout"}
                </Button>
              </Form>
            )}
          </nav>
        </div>
      </header>

      <Outlet />
    </main>
  );
}

function toOptionalString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}
