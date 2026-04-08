import { createHmac, timingSafeEqual } from "node:crypto"

/**
 * Verify webhook signature using HMAC SHA256
 *
 * @param payload - Raw request body as string
 * @param signature - Signature from X-Donkey-Signature header (format: "sha256={hex}")
 * @param timestamp - Timestamp from X-Donkey-Timestamp header
 * @param secret - Webhook signing secret from environment
 * @returns true if signature is valid
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  timestamp: string,
  secret: string
): boolean {
  try {
    const signatureHex = signature.startsWith("sha256=")
      ? signature.slice(7)
      : signature

    const message = `${timestamp}.${payload}`

    const hmac = createHmac("sha256", secret)
    hmac.update(message)
    const expectedSignature = hmac.digest("hex")

    const signatureBuffer = Buffer.from(signatureHex, "hex")
    const expectedBuffer = Buffer.from(expectedSignature, "hex")

    if (signatureBuffer.length !== expectedBuffer.length) {
      return false
    }

    return timingSafeEqual(signatureBuffer, expectedBuffer)
  } catch (error) {
    console.error("Webhook signature verification error:", error)
    return false
  }
}
