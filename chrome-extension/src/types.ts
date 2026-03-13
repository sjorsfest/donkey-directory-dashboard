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
  value: string | number | boolean | null;
}

export interface FillResult {
  filled: number;
  skipped: number;
}

export interface FillFormResponse {
  filled_fields: FilledField[];
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
