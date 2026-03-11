import assert from "node:assert/strict";
import test from "node:test";

import {
  CreatorProfileImageUploadFlowError,
  DEFAULT_CREATOR_IMAGE_MAX_BYTES,
  runCreatorProfileImageUploadFlow,
  validateCreatorProfileImageFile,
} from "./creator-profile-image-upload-flow.ts";

test("validateCreatorProfileImageFile rejects non-image files", () => {
  const file = new File([new Uint8Array(128)], "resume.pdf", {
    type: "application/pdf",
  });

  const result = validateCreatorProfileImageFile(file);
  assert.equal(result, "Please select an image file.");
});

test("validateCreatorProfileImageFile enforces default max size", () => {
  const file = new File(
    [new Uint8Array(DEFAULT_CREATOR_IMAGE_MAX_BYTES + 1)],
    "avatar.png",
    { type: "image/png" },
  );

  const result = validateCreatorProfileImageFile(file);
  assert.equal(result, "Image must be 4.8 MB or smaller.");
});

test("runCreatorProfileImageUploadFlow calls the upload sequence in order", async () => {
  const calls: string[] = [];
  const stepEvents: Array<string> = [];
  const file = new File([new Uint8Array(1024)], "avatar.png", {
    type: "image/png",
  });

  const result = await runCreatorProfileImageUploadFlow({
    file,
    createUploadUrl: async (payload) => {
      calls.push(`upload-url:${payload.file_name}:${payload.content_type}`);
      return {
        upload_url: "https://example.com/upload",
        object_key: "projects/a/creators/b/avatar.png",
        storage_location: "r2://bucket/projects/a/creators/b/avatar.png",
        expires_in_seconds: 3600,
        max_bytes: 5000000,
      };
    },
    uploadBinary: async ({ uploadUrl, contentType, file: payloadFile }) => {
      calls.push(`put:${uploadUrl}:${contentType}:${payloadFile.name}`);
    },
    completeUpload: async ({ object_key }) => {
      calls.push(`complete:${object_key}`);
    },
    onStepStatusChange: (step, status) => {
      stepEvents.push(`${step}:${status}`);
    },
  });

  assert.deepEqual(calls, [
    "upload-url:avatar.png:image/png",
    "put:https://example.com/upload:image/png:avatar.png",
    "complete:projects/a/creators/b/avatar.png",
  ]);
  assert.deepEqual(stepEvents, [
    "upload_url:loading",
    "upload_url:success",
    "binary_upload:loading",
    "binary_upload:success",
    "complete:loading",
    "complete:success",
  ]);
  assert.equal(result.objectKey, "projects/a/creators/b/avatar.png");
});

test("runCreatorProfileImageUploadFlow enforces server max_bytes", async () => {
  const file = new File([new Uint8Array(6_000)], "avatar.png", {
    type: "image/png",
  });

  await assert.rejects(
    async () =>
      runCreatorProfileImageUploadFlow({
        file,
        createUploadUrl: async () => ({
          upload_url: "https://example.com/upload",
          object_key: "projects/a/creators/b/avatar.png",
          storage_location: "r2://bucket/projects/a/creators/b/avatar.png",
          expires_in_seconds: 3600,
          max_bytes: 5_000,
        }),
        uploadBinary: async () => undefined,
        completeUpload: async () => undefined,
      }),
    (error) =>
      error instanceof CreatorProfileImageUploadFlowError &&
      error.code === "file_too_large" &&
      error.message.includes("Image must be"),
  );
});
