export function getServerApiBaseUrl(): string {
  const value = process.env.API_BASE_URL ?? process.env.VITE_API_BASE_URL;
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error("Missing API_BASE_URL environment variable.");
  }

  return value.trim().replace(/\/+$/, "");
}
