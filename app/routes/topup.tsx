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
    <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <div className="rounded-2xl border-2 border-foreground bg-white shadow-[var(--shadow-md)] overflow-hidden">

        {/* Header */}
        <div className="px-5 py-6 border-b-2 border-foreground/10 flex items-start justify-between gap-6 flex-wrap sm:px-8 sm:py-7">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1.5">
              Billing
            </p>
            <h1 className="font-heading text-2xl font-bold leading-tight">
              Top up credits
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              One credit = one auto-filled directory submission via the extension.
            </p>
          </div>

          {/* Balance pill */}
          <div className="shrink-0 self-center rounded-xl border-2 border-foreground bg-secondary px-5 py-3 shadow-[var(--shadow-sm)] flex items-center gap-2.5">
            {lifetimeUnlimited ? (
              <>
                <Infinity className="h-4 w-4 shrink-0" />
                <span className="text-sm font-bold">Lifetime — unlimited</span>
              </>
            ) : (
              <>
                <Zap className="h-4 w-4 shrink-0" />
                <span className="text-sm">
                  <span className="font-bold">{creditBalance}</span>{" "}
                  credit{creditBalance !== 1 ? "s" : ""} remaining
                </span>
              </>
            )}
          </div>
        </div>

        {actionData?.error && (
          <div className="px-5 pt-5 sm:px-8 sm:pt-6">
            <Alert variant="destructive">
              <AlertDescription>{actionData.error}</AlertDescription>
            </Alert>
          </div>
        )}

        {/* Packs */}
        {availablePacks.length === 0 ? (
          <div className="px-5 py-10 text-center sm:px-8 sm:py-12">
            <p className="text-muted-foreground text-sm">No packs available at the moment.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 divide-y-2 divide-foreground/10 sm:grid-cols-2 sm:divide-y-0 sm:divide-x-2">
            {availablePacks.filter((p) => p.pack_code !== "credits_30").map((pack) => (
              <PackCard
                key={pack.pack_code}
                pack={pack}
                isSubmitting={isBusy && submittingPackCode === pack.pack_code}
                disabled={isBusy}
              />
            ))}
          </div>
        )}

        {/* Footer note */}
        <div className="px-5 py-4 border-t-2 border-foreground/10 bg-secondary/60 sm:px-8">
          <p className="text-xs text-muted-foreground">
            Secure payment via Stripe. All packs are one-time purchases — no subscription, no hidden fees.
          </p>
        </div>

      </div>
    </div>
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

  const features: string[] = isLifetime
    ? [
        "Unlimited one-click submissions",
        "Every new directory, automatically",
        "All future product launches included",
      ]
    : [
        "100 one-click form fills",
        "Just 10¢ per directory submission",
        "Credits never expire",
      ];

  const label = isLifetime ? "Lifetime" : `${pack.credits} credits`;
  const ctaLabel = isSubmitting
    ? "Redirecting..."
    : isLifetime
    ? "Get lifetime access"
    : `Buy ${pack.credits} credits`;

  return (
    <div className="px-5 py-6 flex flex-col gap-5 relative sm:px-7 sm:py-7">
      {/* Lime top accent on popular */}
      {isPopular && (
        <div className="absolute top-0 inset-x-0 h-[3px] bg-primary" />
      )}

      <div>
        <div className="flex items-center gap-2 mb-3">
          <p className="text-[0.68rem] font-bold uppercase tracking-widest text-muted-foreground">
            {label}
          </p>
          {isPopular && (
            <span className="inline-flex items-center gap-1 bg-primary text-foreground text-[0.58rem] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
              <Zap className="h-2.5 w-2.5" fill="currentColor" />
              Popular
            </span>
          )}
        </div>
        <div className="flex items-baseline gap-1">
          <span className="font-heading text-4xl font-bold tracking-tight">
            €{pack.amount_eur.toFixed(0)}
          </span>
          <span className="text-sm text-muted-foreground ml-1">one-time</span>
        </div>
      </div>

      <ul className="flex flex-col gap-2.5 flex-1 text-sm">
        {features.map((f) => (
          <li
            key={f}
            className={`flex items-start gap-2 ${isPopular ? "font-medium text-foreground" : "text-foreground/70"}`}
          >
            <Check className="h-3.5 w-3.5 mt-[3px] shrink-0" strokeWidth={2.5} />
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
          className="w-full shadow-[var(--shadow-btn)] active:shadow-[var(--shadow-pressed)] active:translate-x-[3px] active:translate-y-[3px] transition-all font-semibold"
        >
          {ctaLabel}
        </Button>
      </Form>
    </div>
  );
}
