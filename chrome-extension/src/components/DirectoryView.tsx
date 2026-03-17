import { useEffect, useRef, useState } from "react";
import { getCredits, openCheckoutForPack, voteDirectory } from "../lib/api";
import { formatPackPriceEUR, getPackCredits, getPackLabel } from "../lib/billing";
import { useFillFlow } from "../hooks/useFillFlow";
import { StatusSteps } from "./StatusSteps";
import { ResultsPanel } from "./ResultsPanel";
import { Alert, AlertDescription } from "@/shared/ui/alert";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import type {
  BillingPack,
  BillingPackCode,
  DirectoryDetails,
  DirectoryVoteChoice,
  Project,
} from "../types";

interface DirectoryViewProps {
  directory: DirectoryDetails;
  projects: Project[];
  selectedProjectId: string | null;
  setSelectedProjectId: (id: string) => void;
  projectsLoading: boolean;
  projectsError: string | null;
  onSessionExpired: () => void;
}

interface VoteDisplayState {
  myVote: "up" | "down" | null;
  thumbsUpCount: number;
  thumbsDownCount: number;
  isSubmitting: boolean;
  error: string | null;
}

const SUBMISSION_STAGE_CONFIG = {
  not_submitted: {
    label: "Not submitted",
    className: "bg-secondary text-muted-foreground border-foreground/20",
  },
  in_progress: {
    label: "In progress",
    className: "bg-amber-50 text-amber-700 border-amber-300",
  },
  submitted: {
    label: "Submitted",
    className: "bg-accent text-accent-foreground border-foreground",
  },
} as const;

export function DirectoryView({
  directory,
  projects,
  selectedProjectId,
  setSelectedProjectId,
  projectsLoading,
  projectsError,
  onSessionExpired,
}: DirectoryViewProps) {
  const [voteState, setVoteState] = useState<VoteDisplayState>({
    myVote: directory.my_vote,
    thumbsUpCount: directory.thumbs_up_count,
    thumbsDownCount: directory.thumbs_down_count,
    isSubmitting: false,
    error: null,
  });

  const { steps, results, paywall, error: fillError, isRunning, run, refreshPaywall, reset } =
    useFillFlow(onSessionExpired);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [checkoutLoadingPack, setCheckoutLoadingPack] = useState<BillingPackCode | null>(null);
  const [isRefreshingCredits, setIsRefreshingCredits] = useState(false);
  const [creditsInfo, setCreditsInfo] = useState<{ balance: number; unlimited: boolean } | null>(null);
  const canFill = !!selectedProjectId && !isRunning && !projectsLoading;

  // Fetch credit balance on mount
  useEffect(() => {
    getCredits(onSessionExpired)
      .then((wallet) =>
        setCreditsInfo({ balance: wallet.credit_balance, unlimited: wallet.lifetime_unlimited })
      )
      .catch(() => {/* silently ignore — not critical */});
  }, [onSessionExpired]);

  // Keep credit balance in sync after a successful fill
  useEffect(() => {
    if (results?.creditsRemaining !== null && results?.creditsRemaining !== undefined) {
      setCreditsInfo((prev) => ({
        balance: results.creditsRemaining!,
        unlimited: prev?.unlimited ?? results.lifetimeUnlimited,
      }));
    }
  }, [results]);

  function handleFill() {
    reset();
    setCheckoutError(null);
    run(selectedProjectId!);
  }

  async function handleCheckout(packCode: BillingPackCode) {
    setCheckoutError(null);
    setCheckoutLoadingPack(packCode);

    try {
      await openCheckoutForPack(packCode, onSessionExpired);
    } catch (err) {
      setCheckoutError(
        err instanceof Error ? err.message : "Could not start checkout. Try again."
      );
    } finally {
      setCheckoutLoadingPack(null);
    }
  }

  async function handleRefreshCredits() {
    setCheckoutError(null);
    setIsRefreshingCredits(true);
    try {
      await refreshPaywall();
    } catch (err) {
      setCheckoutError(
        err instanceof Error ? err.message : "Could not refresh credit balance."
      );
    } finally {
      setIsRefreshingCredits(false);
    }
  }

  async function handleVote(choice: DirectoryVoteChoice) {
    if (voteState.myVote === choice || voteState.isSubmitting) return;

    const snapshot = { ...voteState };
    const next: VoteDisplayState = { ...voteState, isSubmitting: true, error: null };

    if (voteState.myVote === null) {
      next[choice === "up" ? "thumbsUpCount" : "thumbsDownCount"]++;
      next.myVote = choice;
    } else {
      next[voteState.myVote === "up" ? "thumbsUpCount" : "thumbsDownCount"]--;
      next[choice === "up" ? "thumbsUpCount" : "thumbsDownCount"]++;
      next.myVote = choice;
    }

    setVoteState(next);

    try {
      await voteDirectory(directory.id, choice, onSessionExpired);
      setVoteState((prev) => ({ ...prev, isSubmitting: false }));
    } catch (err) {
      setVoteState({
        ...snapshot,
        isSubmitting: false,
        error: err instanceof Error ? err.message : "Failed to submit vote.",
      });
    }
  }

  const stageConfig = SUBMISSION_STAGE_CONFIG[directory.submission_stage];
  const fallbackLetter = directory.name.charAt(0).toUpperCase();

  return (
    <div className="space-y-2.5">
      {/* Directory info card */}
      <Card className="border-2 border-foreground shadow-[var(--shadow-md)] overflow-hidden">
        <CardContent className="p-0">
          {/* Header section */}
          <div className="px-4 pt-4 pb-3">
            <div className="flex items-start gap-3">
              {/* Logo / avatar */}
              <div className="relative shrink-0">
                {directory.logo_url ? (
                  <img
                    src={directory.logo_url}
                    alt={directory.name}
                    className="h-10 w-10 rounded-lg border-2 border-foreground object-contain bg-white shadow-[var(--shadow-sm)]"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                      (e.currentTarget.nextElementSibling as HTMLElement | null)?.removeAttribute("style");
                    }}
                  />
                ) : 
                <span
                  className={`inline-grid h-10 w-10 place-items-center rounded-lg border-2 border-foreground bg-card text-sm font-extrabold text-foreground shadow-[var(--shadow-sm)] ${directory.logo_url ? "hidden" : ""}`}
                  aria-hidden="true"
                >
                  {fallbackLetter}
                </span>
                }
              </div>

              {/* Name + domain */}
              <div className="min-w-0 flex-1 pt-0.5">
                <h2 className="truncate text-sm font-bold leading-snug">{directory.name}</h2>
                <p className="font-mono text-[11px] text-muted-foreground mt-0.5">{directory.domain}</p>
              </div>

              {/* Submission stage pill — top right */}
              <span
                className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-bold tracking-wide ${stageConfig.className}`}
              >
                {stageConfig.label}
              </span>
            </div>

            {/* Description */}
            {directory.description && (
              <TruncatedDescription text={directory.description} />
            )}
          </div>

          {/* Metrics strip */}
          <div className="flex items-center gap-0 border-t-2 border-foreground/10 divide-x-2 divide-foreground/10">
            {directory.domain_authority !== null && (
              <div className="flex flex-col items-center px-3 py-2 min-w-0">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">DA</span>
                <span className="text-sm font-bold text-foreground">{directory.domain_authority}</span>
              </div>
            )}
            <div className="flex flex-col items-center px-3 py-2 min-w-0">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Cost</span>
              <span className="text-sm font-bold text-foreground">{directory.is_free ? "Free" : "Paid"}</span>
            </div>
            <div className="flex flex-col items-center px-3 py-2 min-w-0">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Link</span>
              <span className="text-sm font-bold text-foreground">{directory.is_dofollow ? "Do" : "No"}</span>
            </div>
          </div>

          {/* Voting row */}
          <div className="flex items-center justify-between gap-2 border-t-2 border-foreground/10 px-4 py-2.5">
            <span className="text-[11px] font-semibold text-muted-foreground">Community rating</span>
            <div className="flex items-center gap-1.5">
              <VoteButton
                emoji="👍"
                count={voteState.thumbsUpCount}
                active={voteState.myVote === "up"}
                activeClass="bg-primary text-primary-foreground border-foreground"
                disabled={voteState.isSubmitting || voteState.myVote === "up"}
                onClick={() => handleVote("up")}
              />
              <VoteButton
                emoji="👎"
                count={voteState.thumbsDownCount}
                active={voteState.myVote === "down"}
                activeClass="bg-destructive/15 text-destructive border-destructive"
                disabled={voteState.isSubmitting || voteState.myVote === "down"}
                onClick={() => handleVote("down")}
              />
            </div>
          </div>

          {voteState.error && (
            <div className="px-4 pb-3">
              <Alert variant="destructive">
                <AlertDescription className="text-xs">{voteState.error}</AlertDescription>
              </Alert>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Fill Forms card */}
      <Card className="border-2 border-foreground shadow-[var(--shadow-md)]">
        <CardContent className="px-4 pt-4 pb-4 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-bold text-foreground">Fill submission form</p>
            {creditsInfo && (
              creditsInfo.unlimited ? (
                <Badge variant="outline">Lifetime unlimited</Badge>
              ) : (
                <Badge variant="outline">{creditsInfo.balance} credits remaining</Badge>
              )
            )}
          </div>
          <Select
            value={selectedProjectId || undefined}
            onValueChange={setSelectedProjectId}
            disabled={projectsLoading || projects.length === 0}
          >
            <SelectTrigger>
              <SelectValue
                placeholder={
                  projectsLoading ? "Loading projects..." : projectsError || "No projects found"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name} ({p.domain})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button disabled={!canFill} onClick={handleFill} className="w-full">
            {isRunning ? "Filling..." : "Fill Forms"}
          </Button>

          {paywall ? (
            <BillingPaywall
              message={paywall.message}
              creditBalance={paywall.creditBalance}
              lifetimeUnlimited={paywall.lifetimeUnlimited}
              availablePacks={paywall.availablePacks}
              checkoutLoadingPack={checkoutLoadingPack}
              isRefreshingCredits={isRefreshingCredits}
              onCheckout={handleCheckout}
              onRefreshCredits={handleRefreshCredits}
            />
          ) : (
            fillError && (
              <Alert variant="destructive">
                <AlertDescription className="text-xs">{fillError}</AlertDescription>
              </Alert>
            )
          )}

          {checkoutError && (
            <Alert variant="destructive">
              <AlertDescription className="text-xs">{checkoutError}</AlertDescription>
            </Alert>
          )}

          {!results ? (
            <StatusSteps steps={steps} />
          ) : (
            <ResultsPanel
              fields={results.fields}
              fieldLabels={results.fieldLabels}
              filled={results.filled}
              skipped={results.skipped}
              outcomes={results.outcomes}
              chargedNow={results.chargedNow}
              alreadyChargedForPair={results.alreadyChargedForPair}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

interface BillingPaywallProps {
  message: string;
  creditBalance: number;
  lifetimeUnlimited: boolean;
  availablePacks: BillingPack[];
  checkoutLoadingPack: BillingPackCode | null;
  isRefreshingCredits: boolean;
  onCheckout: (packCode: BillingPackCode) => void;
  onRefreshCredits: () => void;
}

function BillingPaywall({
  message,
  creditBalance,
  lifetimeUnlimited,
  availablePacks,
  checkoutLoadingPack,
  isRefreshingCredits,
  onCheckout,
  onRefreshCredits,
}: BillingPaywallProps) {
  return (
    <div className="space-y-2 rounded-xl border-2 border-destructive/40 bg-destructive/5 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-bold text-foreground">Insufficient credits</p>
        {lifetimeUnlimited ? (
          <Badge variant="accent">Lifetime active</Badge>
        ) : (
          <Badge variant="outline">{creditBalance} credits left</Badge>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        {message}
      </p>
      <p className="text-xs text-muted-foreground">
        Pricing: 30 credits €5, 100 credits €10, lifetime unlimited €50.
      </p>

      <div className="space-y-2">
        {availablePacks.map((pack) => {
          const credits = getPackCredits(pack);
          const priceText = formatPackPriceEUR(pack);
          const label = getPackLabel(pack);
          const isLoading = checkoutLoadingPack === pack.pack_code;

          return (
            <div
              key={pack.pack_code}
              className="rounded-lg border-2 border-foreground/10 bg-card px-2.5 py-2"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-foreground">{label}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {credits === null ? "Unlimited forever" : `${credits} credits`}
                  </p>
                </div>
                <div className="text-xs font-bold text-foreground">{priceText}</div>
              </div>

              <Button
                size="sm"
                className="mt-2 h-8 w-full text-xs"
                disabled={isLoading || checkoutLoadingPack !== null}
                onClick={() => onCheckout(pack.pack_code)}
              >
                {isLoading ? "Opening checkout..." : `Buy for ${priceText}`}
              </Button>
            </div>
          );
        })}
      </div>

      <Button
        type="button"
        size="sm"
        variant="outline"
        className="h-8 w-full text-xs"
        disabled={isRefreshingCredits}
        onClick={onRefreshCredits}
      >
        {isRefreshingCredits ? "Refreshing credits..." : "Refresh credit balance"}
      </Button>
    </div>
  );
}

function TruncatedDescription({ text }: { text: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [isTruncated, setIsTruncated] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (el) {
      setIsTruncated(el.scrollHeight > el.clientHeight);
    }
  }, [text]);

  return (
    <div className="group relative mt-3">
      <p
        ref={ref}
        className={`line-clamp-2 text-xs leading-relaxed text-muted-foreground ${isTruncated ? "cursor-help" : ""}`}
      >
        {text}
      </p>
      {isTruncated && (
        <div className="pointer-events-none absolute left-0 top-full z-50 mt-1.5 hidden w-full rounded-xl border-2 border-foreground bg-card p-3 text-xs leading-relaxed text-foreground shadow-[var(--shadow-md)] group-hover:block">
          {text}
        </div>
      )}
    </div>
  );
}

interface VoteButtonProps {
  emoji: string;
  count: number;
  active: boolean;
  activeClass: string;
  disabled: boolean;
  onClick: () => void;
}

function VoteButton({ emoji, count, active, activeClass, disabled, onClick }: VoteButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold transition-all hover:scale-105 disabled:cursor-not-allowed disabled:opacity-50 ${
        active
          ? `border-2 ${activeClass}`
          : "border-foreground/20 bg-secondary text-muted-foreground hover:border-foreground/40"
      }`}
    >
      <span>{emoji}</span>
      <span>{count}</span>
    </button>
  );
}
