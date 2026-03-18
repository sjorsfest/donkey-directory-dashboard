import { Form, data, redirect, useActionData, useLoaderData, useNavigation } from "react-router";
import type { Route } from "./+types/topup";
import {
  API_ROUTES,
  type ApiCreditPackOption,
  isApiCreditBalanceResponse,
  isApiCheckoutSessionCreateResponse,
} from "~/lib/api-contract";
import { parseApiErrorMessage, sendAuthenticatedRequest } from "~/lib/authenticated-api.server";
import { getServerApiBaseUrl } from "~/lib/api-base-url.server";
import { getSession } from "~/lib/session.server";
import { Button } from "@/shared/ui/button";
import { Alert, AlertDescription } from "@/shared/ui/alert";
import { Check, Infinity, Zap } from "lucide-react";
import { cn } from "@/shared/lib/utils";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Top up credits | Donkey Directories" },
    { name: "description", content: "Purchase credits or lifetime access." },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const session = await getSession(request.headers.get("Cookie"));
  const accessToken = session.get("accessToken");

  if (!accessToken) {
    return redirect("/login?next=/topup");
  }

  const apiBaseUrl = getServerApiBaseUrl();
  const result = await sendAuthenticatedRequest({
    session,
    apiBaseUrl,
    path: API_ROUTES.billing.credits,
    method: "GET",
  });

  if (result.response.status === 401) {
    return redirect("/login?next=/topup");
  }

  if (!isApiCreditBalanceResponse(result.responseData)) {
    return data(
      { creditBalance: 0, lifetimeUnlimited: false, availablePacks: [] as ApiCreditPackOption[] },
      { headers: result.setCookie ? { "Set-Cookie": result.setCookie } : undefined }
    );
  }

  return data(
    {
      creditBalance: result.responseData.credit_balance,
      lifetimeUnlimited: result.responseData.lifetime_unlimited,
      availablePacks: result.responseData.available_packs ?? [],
    },
    { headers: result.setCookie ? { "Set-Cookie": result.setCookie } : undefined }
  );
}

export async function action({ request }: Route.ActionArgs) {
  const session = await getSession(request.headers.get("Cookie"));
  const apiBaseUrl = getServerApiBaseUrl();
  const formData = await request.formData();
  const packCode = String(formData.get("pack_code") ?? "").trim();

  if (!packCode) {
    return data({ error: "No pack selected." }, { status: 400 });
  }

  const result = await sendAuthenticatedRequest({
    session,
    apiBaseUrl,
    path: API_ROUTES.billing.checkoutSession,
    method: "POST",
    body: { pack_code: packCode },
  });

  if (!result.response.ok) {
    return data(
      { error: parseApiErrorMessage(result.responseData, "Failed to create checkout session.") },
      { status: result.response.status }
    );
  }

  if (!isApiCheckoutSessionCreateResponse(result.responseData)) {
    return data({ error: "Unexpected response from billing service." }, { status: 500 });
  }

  return redirect(result.responseData.checkout_url);
}

export default function TopupPage() {
  const { creditBalance, lifetimeUnlimited, availablePacks } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const submittingPackCode = navigation.formData?.get("pack_code");
  const isBusy = navigation.state !== "idle";

  return (
    <main className="min-h-screen py-12 px-4">
      <div className="mx-auto w-[min(900px,100%)]">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-heading text-3xl font-bold">Top up credits</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Credits are used when the Chrome extension auto-fills a directory submission.
          </p>
        </div>

        {/* Balance */}
        <div className="mb-8 rounded-xl border-2 border-foreground bg-secondary px-6 py-4 shadow-[var(--shadow-sm)] inline-flex items-center gap-3">
          {lifetimeUnlimited ? (
            <>
              <Infinity className="h-5 w-5" />
              <span className="font-bold">Lifetime access — unlimited submissions</span>
            </>
          ) : (
            <>
              <Zap className="h-5 w-5" />
              <span>
                You have{" "}
                <span className="font-bold">{creditBalance} credit{creditBalance !== 1 ? "s" : ""}</span>{" "}
                remaining
              </span>
            </>
          )}
        </div>

        {actionData?.error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{actionData.error}</AlertDescription>
          </Alert>
        )}

        {/* Packs */}
        {availablePacks.length === 0 ? (
          <p className="text-muted-foreground text-sm">No packs available at the moment.</p>
        ) : (
          <div className="grid grid-cols-3 gap-5 max-[640px]:grid-cols-1">
            {availablePacks.map((pack) => (
              <PackCard
                key={pack.pack_code}
                pack={pack}
                isSubmitting={isBusy && submittingPackCode === pack.pack_code}
                disabled={isBusy}
              />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function PackCard({
  pack,
  isSubmitting,
  disabled,
}: {
  pack: ApiCreditPackOption;
  isSubmitting: boolean;
  disabled: boolean;
}) {
  const isPopular = pack.pack_code === "credits_100";
  const isLifetime = pack.lifetime_unlimited;

  const features = isLifetime
    ? ["Unlimited auto-fill submissions", "Never expires", "All future updates"]
    : [`${pack.credits} submission credits`, "Credits never expire", "Use at your own pace"];

  return (
    <div
      className={cn(
        "relative flex flex-col gap-5 rounded-xl border-2 border-foreground p-6 shadow-[var(--shadow-md)]",
        isPopular ? "bg-secondary" : "bg-background"
      )}
    >
      {isPopular && (
        <div className="absolute top-4 right-4">
          <span className="inline-flex items-center gap-1 text-[0.65rem] font-bold uppercase tracking-widest bg-primary text-foreground border-2 border-foreground px-2 py-0.5 shadow-[2px_2px_0_#1A1A1A]">
            <Zap className="h-3 w-3" />
            Popular
          </span>
        </div>
      )}

      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-2">
          {isLifetime ? "Lifetime" : `${pack.credits} credits`}
        </p>
        <div className="flex items-baseline gap-1">
          <span className="font-heading text-3xl font-bold">€{pack.amount_eur.toFixed(0)}</span>
          <span className="text-sm text-muted-foreground">one-time</span>
        </div>
      </div>

      <ul className="flex flex-col gap-2 flex-1">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm">
            <Check className="h-4 w-4 mt-0.5 shrink-0 text-foreground/60" />
            {f}
          </li>
        ))}
      </ul>

      <Form method="post">
        <input type="hidden" name="pack_code" value={pack.pack_code} />
        <Button
          type="submit"
          variant={isPopular ? "default" : "outline"}
          size="default"
          disabled={disabled}
          className="w-full shadow-[var(--shadow-btn)] active:shadow-[var(--shadow-pressed)] active:translate-x-[3px] active:translate-y-[3px] transition-all"
        >
          {isSubmitting ? "Redirecting to checkout..." : isLifetime ? "Get lifetime access" : `Buy ${pack.credits} credits`}
        </Button>
      </Form>
    </div>
  );
}
