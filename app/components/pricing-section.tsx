import { Link } from "react-router";
import { Check, Zap, Infinity } from "lucide-react";
import { Icon } from "@iconify/react";
import { Button } from "@/shared/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/shared/ui/tooltip";

interface Props {
  isAuthenticated: boolean;
}

function ChromeBadge() {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="cursor-default">
            <Icon icon="logos:chrome" className="h-3.5 w-3.5 shrink-0" />
          </span>
        </TooltipTrigger>
        <TooltipContent>
          These credits power the extension. The rest of the app? Free, forever.
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function PricingSection({ isAuthenticated }: Props) {
  const paidCta = isAuthenticated ? "/topup" : "/login?next=/topup";

  return (
    <section className="rounded-2xl border-2 border-foreground bg-white shadow-[var(--shadow-md)] overflow-hidden">

      {/* Header */}
      <div className="px-5 py-6 border-b-2 border-foreground/10 sm:px-8 sm:py-7">
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1.5">
          Pricing
        </p>
        <h2 className="font-heading text-2xl font-bold leading-tight">
          Stop filling the same form 250+ times.
        </h2>
        <p className="mt-1.5 text-sm text-muted-foreground max-w-lg">
          Tracking is always free. Credits unlock the Chrome extension so it can submit your product in one click, with no copy-paste and no tab-switching.
        </p>
      </div>

      {/* Tier columns */}
      <div className="grid grid-cols-1 divide-y-2 divide-foreground/10 sm:grid-cols-3 sm:divide-y-0 sm:divide-x-2">

        {/* Free */}
        <div className="px-5 py-6 flex flex-col gap-5 sm:px-7 sm:py-7">
          <div>
            <p className="text-[0.68rem] font-bold uppercase tracking-widest text-muted-foreground mb-3">
              Free
            </p>
            <div className="flex items-baseline gap-1">
              <span className="font-heading text-4xl font-bold tracking-tight">€0</span>
              <span className="text-sm text-muted-foreground ml-1">forever</span>
            </div>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
              Everything you need to track your launch: no card, no catch.
            </p>
          </div>

          <ul className="flex flex-col gap-2.5 flex-1 text-sm text-foreground/70">
            {[
              "Browse & filter 250+ directories",
              "Full submission progress tracker",
              "5 free one-click form fills",
              "Vote to surface the best ones",
            ].map((f) => (
              <li key={f} className="flex items-start gap-2">
                <Check className="h-3.5 w-3.5 mt-[3px] shrink-0" strokeWidth={2.5} />
                {f}
              </li>
            ))}
          </ul>

          <Button
            asChild
            variant="outline"
            size="default"
            className="w-full shadow-[var(--shadow-btn)] active:shadow-[var(--shadow-pressed)] active:translate-x-[3px] active:translate-y-[3px] transition-all"
          >
            {isAuthenticated ? (
              <Link to="/dashboard">Go to dashboard →</Link>
            ) : (
              <Link to="/signup">Start for free →</Link>
            )}
          </Button>
        </div>

        {/* 100 credits (recommended) */}
        <div className="px-5 py-6 flex flex-col gap-5 sm:px-7 sm:py-7 relative">
          {/* Lime top accent */}
          <div className="absolute top-0 inset-x-0 h-[3px] bg-primary" />

          <div>
            <div className="flex items-center gap-2 mb-3">
              <ChromeBadge />
              <p className="text-[0.68rem] font-bold uppercase tracking-widest text-muted-foreground">
                Starter pack
              </p>
              <span className="inline-flex items-center gap-1 bg-primary text-foreground text-[0.58rem] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full">
                <Zap className="h-2.5 w-2.5" fill="currentColor" />
                Popular
              </span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="font-heading text-4xl font-bold tracking-tight">€10</span>
              <span className="text-sm text-muted-foreground ml-1">one-time</span>
            </div>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
              Submit to 100 directories with one click each. No subscription, ever.
            </p>
          </div>

          <ul className="flex flex-col gap-2.5 flex-1 text-sm text-foreground">
            {[
              "100 one-click form fills",
              "Just 10¢ per directory submission",
              "Credits never expire",
            ].map((f) => (
              <li key={f} className="flex items-start gap-2 font-medium">
                <Check className="h-3.5 w-3.5 mt-[3px] shrink-0" strokeWidth={2.5} />
                {f}
              </li>
            ))}
          </ul>

          <Button
            asChild
            size="default"
            className="w-full shadow-[var(--shadow-btn)] active:shadow-[var(--shadow-pressed)] active:translate-x-[3px] active:translate-y-[3px] transition-all font-bold"
          >
            <Link to={paidCta}>Get 100 credits →</Link>
          </Button>
        </div>

        {/* Lifetime */}
        <div className="px-5 py-6 flex flex-col gap-5 sm:px-7 sm:py-7">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <ChromeBadge />
              <p className="text-[0.68rem] font-bold uppercase tracking-widest text-muted-foreground">
                Lifetime
              </p>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="font-heading text-4xl font-bold tracking-tight">€69</span>
              <span className="text-sm text-muted-foreground ml-1">once</span>
            </div>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
              For founders serious about distribution. Pay once, launch everywhere, forever.
            </p>
          </div>

          <ul className="flex flex-col gap-2.5 flex-1 text-sm text-foreground/70">
            {[
              "Unlimited one-click submissions",
              "Every new directory, automatically",
              "All future product launches included",
            ].map((f) => (
              <li key={f} className="flex items-start gap-2">
                <Check className="h-3.5 w-3.5 mt-[3px] shrink-0" strokeWidth={2.5} />
                {f}
              </li>
            ))}
          </ul>

          <Button
            asChild
            variant="outline"
            size="default"
            className="w-full shadow-[var(--shadow-btn)] active:shadow-[var(--shadow-pressed)] active:translate-x-[3px] active:translate-y-[3px] transition-all"
          >
            <Link to={paidCta}>
              <Infinity className="mr-1.5 h-4 w-4" />
              Get lifetime access →
            </Link>
          </Button>
        </div>

      </div>

      {/* Bottom note */}
      <div className="px-5 py-4 border-t-2 border-foreground/10 bg-secondary/60 sm:px-8">
        <p className="text-xs text-muted-foreground">
          Secure payment via Stripe. No subscription, and all packs are one-time purchases.
        </p>
      </div>

    </section>
  );
}
