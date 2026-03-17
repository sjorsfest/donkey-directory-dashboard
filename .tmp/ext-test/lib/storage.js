"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTokens = getTokens;
exports.setTokens = setTokens;
exports.clearTokens = clearTokens;
exports.getUserEmail = getUserEmail;
exports.setUserEmail = setUserEmail;
async function getTokens() {
    const data = await chrome.storage.local.get(["accessToken", "refreshToken"]);
    return {
        accessToken: data.accessToken ?? null,
        refreshToken: data.refreshToken ?? null,
    };
}
async function setTokens(accessToken, refreshToken) {
    await chrome.storage.local.set({ accessToken, refreshToken });
}
async function clearTokens() {
    await chrome.storage.local.remove([
        "accessToken",
        "refreshToken",
        "userEmail",
    ]);
}
async function getUserEmail() {
    const data = await chrome.storage.local.get("userEmail");
    return data.userEmail ?? null;
}
async function setUserEmail(email) {
    await chrome.storage.local.set({ userEmail: email });
}
