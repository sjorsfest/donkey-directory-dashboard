import type { components } from "~/types/api.generated";

export const DEFAULT_CREATOR_IMAGE_MAX_BYTES = 5_000_000;

export type CreatorImageUploadUrlRequest =
  components["schemas"]["CreatorImageUploadUrlRequest"];
export type CreatorImageUploadUrlResponse =
  components["schemas"]["CreatorImageUploadUrlResponse"];
export type CreatorImageCompleteRequest =
  components["schemas"]["CreatorImageCompleteRequest"];

export type CreatorImageUploadFlowStep =
  | "upload_url"
  | "binary_upload"
  | "complete";

export type CreatorImageUploadFlowStepStatus =
  | "loading"
  | "success"
  | "error";

export class CreatorProfileImageUploadFlowError extends Error {
  code:
    | "invalid_file_type"
    | "file_too_large"
    | "upload_failed"
    | "complete_failed"
    | "unexpected_error";

  constructor(
    code: CreatorProfileImageUploadFlowError["code"],
    message: string,
  ) {
    super(message);
    this.name = "CreatorProfileImageUploadFlowError";
    this.code = code;
  }
}

export function validateCreatorProfileImageFile(
  file: File,
  maxBytes = DEFAULT_CREATOR_IMAGE_MAX_BYTES,
): string | null {
  if (!file.type || !file.type.toLowerCase().startsWith("image/")) {
    return "Please select an image file.";
  }

  if (file.size > maxBytes) {
    return `Image must be ${formatBytes(maxBytes)} or smaller.`;
  }

  return null;
}

export async function runCreatorProfileImageUploadFlow(options: {
  file: File;
  createUploadUrl: (
    payload: CreatorImageUploadUrlRequest,
  ) => Promise<CreatorImageUploadUrlResponse>;
  uploadBinary: (payload: {
    uploadUrl: string;
    contentType: string;
    file: File;
  }) => Promise<void>;
  completeUpload: (payload: CreatorImageCompleteRequest) => Promise<void>;
  onStepStatusChange?: (
    step: CreatorImageUploadFlowStep,
    status: CreatorImageUploadFlowStepStatus,
  ) => void;
}) {
  const fallbackValidationError = validateCreatorProfileImageFile(options.file);
  if (fallbackValidationError) {
    throw new CreatorProfileImageUploadFlowError(
      options.file.type?.startsWith("image/") ? "file_too_large" : "invalid_file_type",
      fallbackValidationError,
    );
  }

  options.onStepStatusChange?.("upload_url", "loading");
  let uploadUrlResponse: CreatorImageUploadUrlResponse;

  try {
    uploadUrlResponse = await options.createUploadUrl({
      file_name: options.file.name || "profile-image",
      content_type: options.file.type || "application/octet-stream",
    });
    options.onStepStatusChange?.("upload_url", "success");
  } catch (error) {
    options.onStepStatusChange?.("upload_url", "error");
    throw asFlowError(
      error,
      "upload_failed",
      "Could not request an upload URL for the image.",
    );
  }

  const serverMaxBytes = normalizeMaxBytes(uploadUrlResponse.max_bytes);
  const activeMaxBytes = serverMaxBytes ?? DEFAULT_CREATOR_IMAGE_MAX_BYTES;
  const serverValidationError = validateCreatorProfileImageFile(
    options.file,
    activeMaxBytes,
  );

  if (serverValidationError) {
    options.onStepStatusChange?.("binary_upload", "error");
    throw new CreatorProfileImageUploadFlowError(
      "file_too_large",
      serverValidationError,
    );
  }

  options.onStepStatusChange?.("binary_upload", "loading");
  try {
    await options.uploadBinary({
      uploadUrl: uploadUrlResponse.upload_url,
      contentType: options.file.type || "application/octet-stream",
      file: options.file,
    });
    options.onStepStatusChange?.("binary_upload", "success");
  } catch (error) {
    options.onStepStatusChange?.("binary_upload", "error");
    throw asFlowError(
      error,
      "upload_failed",
      "Image upload failed before completion.",
    );
  }

  options.onStepStatusChange?.("complete", "loading");
  try {
    await options.completeUpload({
      object_key: uploadUrlResponse.object_key,
    });
    options.onStepStatusChange?.("complete", "success");
  } catch (error) {
    options.onStepStatusChange?.("complete", "error");
    throw asFlowError(
      error,
      "complete_failed",
      "Image uploaded but could not be finalized.",
    );
  }

  return {
    objectKey: uploadUrlResponse.object_key,
    maxBytes: activeMaxBytes,
  };
}

function asFlowError(
  error: unknown,
  fallbackCode: CreatorProfileImageUploadFlowError["code"],
  fallbackMessage: string,
): CreatorProfileImageUploadFlowError {
  if (error instanceof CreatorProfileImageUploadFlowError) {
    return error;
  }

  if (error instanceof Error) {
    return new CreatorProfileImageUploadFlowError(
      fallbackCode,
      error.message || fallbackMessage,
    );
  }

  return new CreatorProfileImageUploadFlowError(fallbackCode, fallbackMessage);
}

function normalizeMaxBytes(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return null;
  }

  return Math.floor(value);
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) {
    const kb = Math.round(bytes / 1024);
    return `${kb} KB`;
  }

  const mb = bytes / (1024 * 1024);
  const rounded = Number.isInteger(mb) ? mb.toFixed(0) : mb.toFixed(1);
  return `${rounded} MB`;
}
