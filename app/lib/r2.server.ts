import { randomUUID } from "node:crypto"
import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3"

type R2Config = {
  accountId: string
  accessKeyId: string
  secretAccessKey: string
  bucketName: string
  publicUrl: string
}

const IMAGE_CONTENT_TYPES = new Set([
  "image/avif",
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/svg+xml",
  "image/webp",
])

let cachedConfig: R2Config | null = null
let cachedClient: S3Client | null = null

function getRequiredEnv(name: string) {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required R2 environment variable: ${name}`)
  }
  return value
}

function getR2Config() {
  if (cachedConfig) return cachedConfig

  cachedConfig = {
    accountId: getRequiredEnv("R2_ACCOUNT_ID"),
    accessKeyId: getRequiredEnv("R2_ACCESS_KEY_ID"),
    secretAccessKey: getRequiredEnv("R2_SECRET_ACCESS_KEY"),
    bucketName: getRequiredEnv("R2_BUCKET_NAME"),
    publicUrl: getRequiredEnv("R2_PUBLIC_URL").replace(/\/+$/, ""),
  }

  return cachedConfig
}

function getR2Client() {
  if (cachedClient) return cachedClient

  const config = getR2Config()
  cachedClient = new S3Client({
    region: "auto",
    endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  })

  return cachedClient
}

function getExtensionFromContentType(contentType: string) {
  switch (contentType) {
    case "image/jpeg":
      return "jpg"
    case "image/png":
      return "png"
    case "image/svg+xml":
      return "svg"
    case "image/webp":
      return "webp"
    case "image/avif":
      return "avif"
    case "image/gif":
      return "gif"
    default:
      return null
  }
}

function assertAllowedImageType(contentType: string) {
  if (!IMAGE_CONTENT_TYPES.has(contentType)) {
    throw new Error(
      `Invalid image type: ${contentType}. Allowed: ${Array.from(IMAGE_CONTENT_TYPES).join(", ")}`,
    )
  }
}

function sanitizePrefix(prefix: string) {
  return prefix.replace(/^\/+|\/+$/g, "")
}

function buildKey(prefix: string, extension: string) {
  const cleanPrefix = sanitizePrefix(prefix)
  const base = `${Date.now()}-${randomUUID()}.${extension}`
  return cleanPrefix ? `${cleanPrefix}/${base}` : base
}

export function getImagePublicUrl(key: string) {
  return `${getR2Config().publicUrl}/${key}`
}

export async function uploadImageToR2({
  body,
  contentType,
  keyPrefix = "images",
  cacheControl = "public, max-age=31536000, immutable",
}: {
  body: Buffer | Uint8Array
  contentType: string
  keyPrefix?: string
  cacheControl?: string
}) {
  assertAllowedImageType(contentType)

  const extension = getExtensionFromContentType(contentType)
  if (!extension) {
    throw new Error(`Could not determine extension for content type: ${contentType}`)
  }

  const key = buildKey(keyPrefix, extension)
  const config = getR2Config()

  const command = new PutObjectCommand({
    Bucket: config.bucketName,
    Key: key,
    Body: body,
    ContentType: contentType,
    CacheControl: cacheControl,
  })

  await getR2Client().send(command)

  return {
    key,
    publicUrl: getImagePublicUrl(key),
  }
}

export async function deleteFromR2(key: string) {
  const config = getR2Config()
  const command = new DeleteObjectCommand({
    Bucket: config.bucketName,
    Key: key,
  })

  await getR2Client().send(command)
}
