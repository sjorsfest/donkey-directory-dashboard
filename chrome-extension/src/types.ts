export interface ScannedField {
  field_id: string;
  type: string;
  tag: string;
  label: string;
  placeholder: string | null;
  required: boolean;
  max_length: number | null;
  options: { value: string; text: string }[] | null;
  pattern: string | null;
}

export interface FilledField {
  field_id: string;
  value: string | string[] | number | boolean | null;
}

export interface FillFormRequest {
  project_id: string;
  directory_id: string;
  page_url: string;
  page_title: string;
  fields: ScannedField[];
}

export interface FillResult {
  filled: number;
  skipped: number;
  outcomes: Record<string, "filled" | "not_filled">;
}

export interface FillFormResponse {
  filled_fields: FilledField[];
  charged_now: boolean;
  already_charged_for_pair: boolean;
  credits_remaining: number | null;
  lifetime_unlimited: boolean;
}

export type StepState = "active" | "done" | "error";

export interface StepInfo {
  text: string;
  state: StepState;
}

export interface Project {
  id: string;
  name: string;
  domain: string;
}

export type DirectoryVoteChoice = "up" | "down";

export interface DirectoryVoteTarget {
  id: string;
  name: string;
  domain: string;
}

export interface DirectoryDetails {
  id: string;
  name: string;
  domain: string;
  description: string | null;
  domain_authority: number | null;
  quality_score: number | null;
  is_free: boolean;
  is_dofollow: boolean;
  submission_stage: "not_submitted" | "in_progress" | "submitted" | "skipped";
  thumbs_up_count: number;
  thumbs_down_count: number;
  total_votes: number;
  my_vote: "up" | "down" | null;
  submission_url: string | null;
  logo_url: string | null;
}

export interface DirectoryRandomResponse {
  domain: string;
  redirect_url: string;
}

export type BillingPackCode = "credits_30" | "credits_100" | "lifetime";

export interface BillingPack {
  pack_code: BillingPackCode;
  credits: number | null;
  price_eur_cents?: number | null;
  price_eur?: number | null;
  label?: string | null;
}

export interface CreditsWalletResponse {
  credit_balance: number;
  lifetime_unlimited: boolean;
  available_packs: BillingPack[];
}

export interface CheckoutSessionResponse {
  checkout_url: string;
  session_id: string;
  expires_at: string;
}

export interface InsufficientCreditsPayload extends CreditsWalletResponse {
  error: "insufficient_credits";
  message: string;
}

export interface AdminDirectoryUpdate {
  name?: string;
  description?: string;
  is_free?: boolean;
  is_dofollow?: boolean;
  domain_authority?: number | null;
  logo_object_key?: string;
  logo_content_type?: string;
  logo_source_url?: string;
}

export interface LogoUploadUrlResponse {
  upload_url: string;
  object_key: string;
  public_url: string;
  max_bytes: number;
}
