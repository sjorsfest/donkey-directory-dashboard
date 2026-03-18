import { useEffect, useRef, useState } from "react";
import { getCredits, openCheckoutForPack, voteDirectory, getLogoUploadUrl, updateAdminDirectory, deleteAdminDirectory, updateSubmissionStage, fetchRandomDirectory } from "../lib/api";
import { getTargetTab } from "../lib/tab-utils";
import { formatPackPriceEUR, getPackCredits, getPackLabel, getPackPriceEurCents } from "../lib/billing";
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
  isAdmin: boolean;
  projects: Project[];
  selectedProjectId: string | null;
  setSelectedProjectId: (id: string) => void;
  projectsLoading: boolean;
  projectsError: string | null;
  onSessionExpired: () => void;
  onStageUpdated?: () => void;
  allCompleted?: boolean;
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
  skipped: {
    label: "Skipped",
    className: "bg-destructive/15 text-destructive border-destructive/40",
  },
} as const;

function PencilIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="10"
      height="10"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
    </svg>
  );
}

export function DirectoryView({
  directory,
  isAdmin,
  projects,
  selectedProjectId,
  setSelectedProjectId,
  projectsLoading,
  projectsError,
  onSessionExpired,
  onStageUpdated,
  allCompleted = false,
}: DirectoryViewProps) {
  const [localDir, setLocalDir] = useState<DirectoryDetails>(directory);
  const [editing, setEditing] = useState<"name" | "logo" | "dr" | "cost" | "dofollow" | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleted, setDeleted] = useState(false);
  const logoFileInputRef = useRef<HTMLInputElement>(null);

  const [voteState, setVoteState] = useState<VoteDisplayState>({
    myVote: directory.my_vote,
    thumbsUpCount: directory.thumbs_up_count,
    thumbsDownCount: directory.thumbs_down_count,
    isSubmitting: false,
    error: null,
  });

  const [stageUpdating, setStageUpdating] = useState<"submitted" | "skipped" | null>(null);
  const [stageError, setStageError] = useState<string | null>(null);
  const [isNavigatingNext, setIsNavigatingNext] = useState(false);

  const { steps, results, paywall, error: fillError, isRunning, run, refreshPaywall, reset } =
    useFillFlow(onSessionExpired);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [checkoutLoadingPack, setCheckoutLoadingPack] = useState<BillingPackCode | null>(null);
  const [isRefreshingCredits, setIsRefreshingCredits] = useState(false);
  const [creditsInfo, setCreditsInfo] = useState<{ balance: number; unlimited: boolean } | null>(null);
  const canFill = !!selectedProjectId && !isRunning && !projectsLoading;

  useEffect(() => {
    getCredits(onSessionExpired)
      .then((wallet) =>
        setCreditsInfo({ balance: wallet.credit_balance, unlimited: wallet.lifetime_unlimited })
      )
      .catch(() => {/* silently ignore — not critical */});
  }, [onSessionExpired]);

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

  async function navigateCurrentTabTo(url: string) {
    const tab = await getTargetTab();
    if (tab?.id !== undefined) {
      await chrome.tabs.update(tab.id, { url });
    }
  }

  async function handleNextRandom() {
    if (!selectedProjectId) return;
    setIsNavigatingNext(true);
    try {
      const next = await fetchRandomDirectory(allCompleted ? null : selectedProjectId, onSessionExpired);
      if (next) {
        await navigateCurrentTabTo(next.redirect_url);
      }
    } catch {
      // silently ignore — non-critical navigation
    } finally {
      setIsNavigatingNext(false);
    }
  }

  async function handleStageUpdate(stage: "submitted" | "skipped") {
    if (!selectedProjectId) return;
    setStageError(null);
    setStageUpdating(stage);
    try {
      await updateSubmissionStage(selectedProjectId, localDir.id, stage, onSessionExpired);
      setLocalDir((prev) => ({ ...prev, submission_stage: stage }));
      onStageUpdated?.();
      const next = await fetchRandomDirectory(allCompleted ? null : selectedProjectId, onSessionExpired);
      if (next) {
        await navigateCurrentTabTo(next.redirect_url);
      }
    } catch (err) {
      setStageError(err instanceof Error ? err.message : "Failed to update status.");
    } finally {
      setStageUpdating(null);
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

  async function handleDelete() {
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deleteAdminDirectory(localDir.id, onSessionExpired);
      setDeleted(true);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Failed to delete directory.");
      setIsDeleting(false);
    }
  }

  function startEdit(field: typeof editing) {
    setEditError(null);
    setEditing(field);
    if (field === "name") setEditValue(localDir.name);
    if (field === "dr") setEditValue(localDir.domain_authority != null ? String(localDir.domain_authority) : "");
  }

  function cancelEdit() {
    setEditing(null);
    setEditError(null);
  }

  async function saveField(fields: Parameters<typeof updateAdminDirectory>[1]) {
    setIsSaving(true);
    setEditError(null);
    try {
      const updated = await updateAdminDirectory(localDir.id, fields, onSessionExpired);
      setLocalDir(updated);
      setEditing(null);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleLogoFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsSaving(true);
    setEditError(null);

    try {
      const { upload_url, object_key } = await getLogoUploadUrl(
        localDir.id,
        file.name,
        file.type,
        onSessionExpired
      );

      const putRes = await fetch(upload_url, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!putRes.ok) throw new Error("Failed to upload logo.");

      await saveField({ logo_object_key: object_key, logo_content_type: file.type });
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Failed to upload logo.");
      setIsSaving(false);
    }

    // Reset file input
    if (logoFileInputRef.current) logoFileInputRef.current.value = "";
  }

  const stageConfig = SUBMISSION_STAGE_CONFIG[localDir.submission_stage];
  const fallbackLetter = localDir.name.charAt(0).toUpperCase();

  if (deleted) {
    return (
      <Card className="border-2 border-foreground shadow-[var(--shadow-md)]">
        <CardContent className="py-6 text-center space-y-1">
          <p className="text-sm font-bold">Directory deleted</p>
          <p className="text-xs text-muted-foreground">{localDir.name} has been removed.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2.5">
      {/* Directory info card */}
      <Card className="border-2 border-foreground shadow-[var(--shadow-md)] overflow-hidden">
        <CardContent className="p-0">
          {/* Header section */}
          <div className="px-4 pt-4 pb-3">
            <div className="flex items-start gap-3">
              {/* Logo / avatar */}
              <div className="group relative shrink-0">
                {localDir.logo_url ? (
                  <img
                    src={localDir.logo_url}
                    alt={localDir.name}
                    className="h-10 w-10 rounded-lg border-2 border-foreground object-contain bg-white shadow-[var(--shadow-sm)]"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                      (e.currentTarget.nextElementSibling as HTMLElement | null)?.removeAttribute("style");
                    }}
                  />
                ) : (
                  <span
                    className={`inline-grid h-10 w-10 place-items-center rounded-lg border-2 border-foreground bg-card text-sm font-extrabold text-foreground shadow-[var(--shadow-sm)] ${localDir.logo_url ? "hidden" : ""}`}
                    aria-hidden="true"
                  >
                    {fallbackLetter}
                  </span>
                )}
                {isAdmin && (
                  <>
                    <button
                      type="button"
                      onClick={() => logoFileInputRef.current?.click()}
                      disabled={isSaving}
                      className="absolute -bottom-1 -right-1 hidden group-hover:flex h-4 w-4 items-center justify-center rounded-full border border-foreground bg-card text-foreground shadow-sm hover:bg-accent disabled:opacity-50"
                      title="Edit logo"
                    >
                      <PencilIcon />
                    </button>
                    <input
                      ref={logoFileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleLogoFileChange}
                    />
                  </>
                )}
              </div>

              {/* Name + domain */}
              <div className="min-w-0 flex-1 pt-0.5">
                {isAdmin && editing === "name" ? (
                  <div className="flex items-center gap-1">
                    <input
                      autoFocus
                      type="text"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="min-w-0 flex-1 rounded border-2 border-foreground px-1.5 py-0.5 text-sm font-bold leading-snug focus:outline-none"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveField({ name: editValue.trim() });
                        if (e.key === "Escape") cancelEdit();
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => saveField({ name: editValue.trim() })}
                      disabled={isSaving}
                      className="shrink-0 rounded border border-foreground bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground disabled:opacity-50"
                    >
                      {isSaving ? "…" : "Save"}
                    </button>
                    <button
                      type="button"
                      onClick={cancelEdit}
                      className="shrink-0 rounded border border-foreground/30 px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <div className="group flex items-center gap-1">
                    <h2 className="truncate text-sm font-bold leading-snug">{localDir.name}</h2>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => startEdit("name")}
                        className="hidden group-hover:flex h-4 w-4 shrink-0 items-center justify-center rounded border border-foreground/20 bg-card text-muted-foreground hover:border-foreground hover:text-foreground"
                        title="Edit name"
                      >
                        <PencilIcon />
                      </button>
                    )}
                  </div>
                )}
                <p className="font-mono text-[11px] text-muted-foreground mt-0.5">{localDir.domain}</p>
              </div>

              {/* Submission stage pill — top right */}
              <span
                className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-bold tracking-wide ${stageConfig.className}`}
              >
                {stageConfig.label}
              </span>
            </div>

            {/* Description */}
            {localDir.description && (
              <TruncatedDescription text={localDir.description} />
            )}
          </div>

          {/* Metrics strip */}
          <div className="flex items-stretch border-t-2 border-foreground/10 divide-x-2 divide-foreground/10">

            {/* DR */}
            <div className="group flex flex-col items-center justify-center px-3 py-2 flex-1 min-w-0 relative">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">DR</span>
              {isAdmin && editing === "dr" ? (
                <div className="flex flex-col items-center gap-1 w-full">
                  <input
                    autoFocus
                    type="number"
                    min={0}
                    max={100}
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="w-14 rounded border-2 border-foreground px-1 py-0.5 text-center text-xs font-bold focus:outline-none"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        const val = editValue === "" ? null : Math.min(100, Math.max(0, Number(editValue)));
                        saveField({ domain_authority: val });
                      }
                      if (e.key === "Escape") cancelEdit();
                    }}
                  />
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        const val = editValue === "" ? null : Math.min(100, Math.max(0, Number(editValue)));
                        saveField({ domain_authority: val });
                      }}
                      disabled={isSaving}
                      className="rounded border border-foreground bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground disabled:opacity-50"
                    >
                      {isSaving ? "…" : "Save"}
                    </button>
                    <button type="button" onClick={cancelEdit} className="rounded border border-foreground/30 px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground">✕</button>
                  </div>
                </div>
              ) : (
                <>
                  {localDir.domain_authority != null ? (
                    <div className="relative flex items-center justify-center w-9 h-9">
                      <svg className="w-9 h-9 -rotate-90" viewBox="0 0 36 36">
                        <circle cx="18" cy="18" r="15" fill="none" stroke="currentColor" strokeWidth="3" className="text-foreground/10" />
                        <circle
                          cx="18" cy="18" r="15" fill="none"
                          stroke="currentColor" strokeWidth="3"
                          strokeDasharray={`${(localDir.domain_authority / 100) * 94.25} 94.25`}
                          strokeLinecap="round"
                          className="text-primary"
                        />
                      </svg>
                      <span className="absolute text-[10px] font-bold text-foreground leading-none">{localDir.domain_authority}</span>
                    </div>
                  ) : (
                    <span className="text-sm font-bold text-foreground">N/A</span>
                  )}
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => startEdit("dr")}
                      className="absolute top-1 right-1 hidden group-hover:flex h-4 w-4 items-center justify-center rounded border border-foreground/20 bg-card text-muted-foreground hover:border-foreground hover:text-foreground"
                      title="Edit DR"
                    >
                      <PencilIcon />
                    </button>
                  )}
                </>
              )}
            </div>

            {/* Cost */}
            <div className="group flex flex-col items-center justify-center px-3 py-2 flex-1 min-w-0 relative">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Cost</span>
              {isAdmin && editing === "cost" ? (
                <div className="flex flex-col items-center gap-1 mt-0.5">
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => saveField({ is_free: true })}
                      disabled={isSaving}
                      className={`rounded border-2 px-2 py-0.5 text-[10px] font-bold disabled:opacity-50 ${localDir.is_free ? "border-foreground bg-primary text-primary-foreground" : "border-foreground/30 text-muted-foreground"}`}
                    >
                      Free
                    </button>
                    <button
                      type="button"
                      onClick={() => saveField({ is_free: false })}
                      disabled={isSaving}
                      className={`rounded border-2 px-2 py-0.5 text-[10px] font-bold disabled:opacity-50 ${!localDir.is_free ? "border-foreground bg-primary text-primary-foreground" : "border-foreground/30 text-muted-foreground"}`}
                    >
                      Paid
                    </button>
                  </div>
                  <button type="button" onClick={cancelEdit} className="text-[10px] text-muted-foreground underline">cancel</button>
                </div>
              ) : (
                <>
                  <span className="text-sm font-bold text-foreground">{localDir.is_free ? "Free" : "Paid"}</span>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => startEdit("cost")}
                      className="absolute top-1 right-1 hidden group-hover:flex h-4 w-4 items-center justify-center rounded border border-foreground/20 bg-card text-muted-foreground hover:border-foreground hover:text-foreground"
                      title="Edit cost"
                    >
                      <PencilIcon />
                    </button>
                  )}
                </>
              )}
            </div>

            {/* Dofollow */}
            <div className="group flex flex-col items-center justify-center px-3 py-2 flex-1 min-w-0 relative">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Dofollow</span>
              {isAdmin && editing === "dofollow" ? (
                <div className="flex flex-col items-center gap-1 mt-0.5">
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => saveField({ is_dofollow: true })}
                      disabled={isSaving}
                      className={`rounded border-2 px-2 py-0.5 text-[10px] font-bold disabled:opacity-50 ${localDir.is_dofollow ? "border-foreground bg-primary text-primary-foreground" : "border-foreground/30 text-muted-foreground"}`}
                    >
                      Yes
                    </button>
                    <button
                      type="button"
                      onClick={() => saveField({ is_dofollow: false })}
                      disabled={isSaving}
                      className={`rounded border-2 px-2 py-0.5 text-[10px] font-bold disabled:opacity-50 ${!localDir.is_dofollow ? "border-foreground bg-primary text-primary-foreground" : "border-foreground/30 text-muted-foreground"}`}
                    >
                      No
                    </button>
                  </div>
                  <button type="button" onClick={cancelEdit} className="text-[10px] text-muted-foreground underline">cancel</button>
                </div>
              ) : (
                <>
                  <span className="text-sm font-bold text-foreground">{localDir.is_dofollow ? "Yes" : "No"}</span>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => startEdit("dofollow")}
                      className="absolute top-1 right-1 hidden group-hover:flex h-4 w-4 items-center justify-center rounded border border-foreground/20 bg-card text-muted-foreground hover:border-foreground hover:text-foreground"
                      title="Edit dofollow"
                    >
                      <PencilIcon />
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Edit error */}
          {editError && (
            <div className="px-4 pb-2">
              <Alert variant="destructive">
                <AlertDescription className="text-xs">{editError}</AlertDescription>
              </Alert>
            </div>
          )}

          {/* Voting row */}
          <div className="flex items-center justify-between gap-2 border-t-2 border-foreground/10 px-4 py-2.5">
            <span className="text-[11px] font-semibold text-muted-foreground">Directory's Community rating</span>
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
              {isAdmin && (
                deleteConfirm ? (
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] font-semibold text-destructive">Delete?</span>
                    <button
                      type="button"
                      onClick={handleDelete}
                      disabled={isDeleting}
                      className="rounded border border-destructive bg-destructive/10 px-1.5 py-0.5 text-[10px] font-bold text-destructive hover:bg-destructive/20 disabled:opacity-50"
                    >
                      {isDeleting ? "…" : "Yes"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteConfirm(false)}
                      className="rounded border border-foreground/30 px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground"
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setDeleteConfirm(true)}
                    className="ml-1 inline-flex h-6 w-6 items-center justify-center rounded border border-foreground/20 text-muted-foreground hover:border-destructive hover:text-destructive"
                    title="Delete directory"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                      <path d="M10 11v6M14 11v6" />
                      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                    </svg>
                  </button>
                )
              )}
            </div>
          </div>

          {deleteError && (
            <div className="px-4 pb-2">
              <Alert variant="destructive">
                <AlertDescription className="text-xs">{deleteError}</AlertDescription>
              </Alert>
            </div>
          )}

          {voteState.error && (
            <div className="px-4 pb-3">
              <Alert variant="destructive">
                <AlertDescription className="text-xs">{voteState.error}</AlertDescription>
              </Alert>
            </div>
          )}

          {/* Submission stage actions */}
          {selectedProjectId && (
            <div className="flex items-center justify-between gap-2 border-t-2 border-foreground/10 px-4 py-2.5">
              <span className="text-[11px] font-semibold text-muted-foreground">
                {localDir.submission_stage === "submitted" || localDir.submission_stage === "skipped" ? "Change status?" : "Did you submit?"}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={stageUpdating !== null || localDir.submission_stage === "submitted"}
                  onClick={() => handleStageUpdate("submitted")}
                  className={`rounded border px-2.5 py-1 text-[11px] font-bold transition-all active:translate-y-px disabled:opacity-50 ${
                    localDir.submission_stage === "submitted"
                      ? "border-foreground bg-accent text-accent-foreground ring-2 ring-foreground ring-offset-1 cursor-default"
                      : "border-foreground bg-accent text-accent-foreground hover:brightness-95"
                  }`}
                >
                  {stageUpdating === "submitted" ? "Saving…" : "Submitted"}
                </button>
                <button
                  type="button"
                  disabled={stageUpdating !== null || localDir.submission_stage === "skipped"}
                  onClick={() => handleStageUpdate("skipped")}
                  className={`rounded border px-2.5 py-1 text-[11px] font-semibold transition-colors active:translate-y-px disabled:opacity-50 ${
                    localDir.submission_stage === "skipped"
                      ? "border-destructive/40 bg-destructive/10 text-destructive ring-2 ring-destructive/40 ring-offset-1 cursor-default"
                      : "border-foreground/20 bg-card text-muted-foreground hover:bg-destructive/10 hover:border-destructive/40 hover:text-destructive"
                  }`}
                >
                  {stageUpdating === "skipped" ? "Saving…" : "Skip"}
                </button>
                <span className="text-foreground/20 select-none">|</span>
                <button
                  type="button"
                  disabled={stageUpdating !== null || isNavigatingNext}
                  onClick={handleNextRandom}
                  className="flex items-center gap-1 px-1 py-1 text-[11px] font-semibold text-muted-foreground/70 hover:text-foreground transition-colors disabled:opacity-50"
                  title="Go to another directory without changing status"
                >
                  {isNavigatingNext ? "Opening…" : "Try another"}
                  {!isNavigatingNext && (
                    <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          )}

          {stageError && (
            <div className="px-4 pb-2">
              <Alert variant="destructive">
                <AlertDescription className="text-xs">{stageError}</AlertDescription>
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
                  {p.domain}
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
  const defaultPack =
    availablePacks.find((p) => p.pack_code === "credits_100") ?? availablePacks[0] ?? null;
  const [selectedPackCode, setSelectedPackCode] = useState<BillingPackCode | null>(
    defaultPack?.pack_code ?? null
  );

  const selectedPack = availablePacks.find((p) => p.pack_code === selectedPackCode) ?? null;
  const isLoading = selectedPack ? checkoutLoadingPack === selectedPack.pack_code : false;

  return (
    <div className="rounded-xl border-2 border-foreground/20 bg-card p-3 shadow-[3px_3px_0_0_rgba(0,0,0,0.12)]">
      {/* Header */}
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-bold text-foreground">Top up your credits</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{message}</p>
        </div>
        {lifetimeUnlimited ? (
          <Badge variant="accent" className="shrink-0">Lifetime active</Badge>
        ) : (
          <Badge variant="outline" className="shrink-0 border-destructive/50 text-destructive">
            {creditBalance} left
          </Badge>
        )}
      </div>

      {/* Pack selector — 3 columns */}
      <div className="mb-3 grid grid-cols-3 gap-1.5">
        {availablePacks.map((pack) => {
          const credits = getPackCredits(pack);
          const priceText = formatPackPriceEUR(pack);
          const isSelected = selectedPackCode === pack.pack_code;
          const isBestValue = pack.pack_code === "credits_100";

          const priceEurCents = getPackPriceEurCents(pack);
          const valueLabel =
            credits !== null
              ? `€${(priceEurCents / credits / 100).toFixed(2)}/cr`
              : "one-time";

          return (
            <button
              key={pack.pack_code}
              type="button"
              onClick={() => setSelectedPackCode(pack.pack_code)}
              className={`relative flex flex-col rounded-lg border-2 p-2 text-left transition-all focus:outline-none ${
                isSelected
                  ? "border-primary bg-primary-100 shadow-[2px_2px_0_0_rgba(0,0,0,0.15)]"
                  : "border-foreground/15 bg-background hover:border-foreground/30"
              }`}
            >
              {isBestValue && (
                <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-primary-600 bg-primary-500 px-1.5 text-[9px] font-bold uppercase tracking-wide text-foreground">
                  Best value
                </span>
              )}
              <span className="text-base font-black leading-none text-foreground">{priceText}</span>
              <span className="mt-1 text-[11px] font-semibold text-foreground">
                {credits === null ? "Lifetime" : `${credits} credits`}
              </span>
              <span className="mt-0.5 text-[10px] text-muted-foreground">{valueLabel}</span>
            </button>
          );
        })}
      </div>

      {/* Single CTA */}
      <Button
        className="h-9 w-full text-sm font-bold"
        disabled={!selectedPack || checkoutLoadingPack !== null}
        onClick={() => selectedPack && onCheckout(selectedPack.pack_code)}
      >
        {isLoading
          ? "Opening checkout..."
          : selectedPack
            ? `Buy ${getPackLabel(selectedPack)} — ${formatPackPriceEUR(selectedPack)}`
            : "Select a pack"}
      </Button>

      {/* Refresh link */}
      <button
        type="button"
        className="mt-2 w-full text-center text-[11px] text-muted-foreground underline underline-offset-2 hover:text-foreground disabled:opacity-50"
        disabled={isRefreshingCredits}
        onClick={onRefreshCredits}
      >
        {isRefreshingCredits ? "Refreshing..." : "Refresh credit balance"}
      </button>
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
