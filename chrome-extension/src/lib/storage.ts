interface StoredTokens {
  accessToken: string | null;
  refreshToken: string | null;
}

export async function getTokens(): Promise<StoredTokens> {
  const data = await chrome.storage.local.get(["accessToken", "refreshToken"]);
  return {
    accessToken: (data.accessToken as string) ?? null,
    refreshToken: (data.refreshToken as string) ?? null,
  };
}

export async function setTokens(
  accessToken: string,
  refreshToken: string
): Promise<void> {
  await chrome.storage.local.set({ accessToken, refreshToken });
}

export async function clearTokens(): Promise<void> {
  await chrome.storage.local.remove([
    "accessToken",
    "refreshToken",
    "userEmail",
  ]);
}

export async function getUserEmail(): Promise<string | null> {
  const data = await chrome.storage.local.get("userEmail");
  return (data.userEmail as string) ?? null;
}

export async function setUserEmail(email: string): Promise<void> {
  await chrome.storage.local.set({ userEmail: email });
}
