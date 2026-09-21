import { STORAGE_KEYS } from "@/constants/storage";
import {
  getStorageItem,
  removeStorageItem,
  setStorageItem,
} from "@/utils/storage";

const SESSION_COOKIE = "dw_session";
const TOKEN_COOKIE = "dw_token";

function canUseDocument(): boolean {
  return typeof document !== "undefined";
}

function setCookie(name: string, value: string, maxAgeSeconds: number) {
  if (!canUseDocument()) return;
  const secure =
    typeof window !== "undefined" && window.location.protocol === "https:"
      ? "; Secure"
      : "";
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAgeSeconds}; SameSite=Lax${secure}`;
}

function clearCookie(name: string) {
  if (!canUseDocument()) return;
  document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax`;
}

export function getAuthToken(): string | null {
  return getStorageItem(STORAGE_KEYS.authToken);
}

export function persistAuthSession(token: string, remember: boolean) {
  setStorageItem(STORAGE_KEYS.authToken, token);
  setStorageItem(STORAGE_KEYS.authRemember, remember ? "1" : "0");

  const maxAge = remember ? 60 * 60 * 24 * 30 : 60 * 60 * 12;
  setCookie(SESSION_COOKIE, "1", maxAge);
  setCookie(TOKEN_COOKIE, token, maxAge);
}

export function clearAuthSession() {
  removeStorageItem(STORAGE_KEYS.authToken);
  removeStorageItem(STORAGE_KEYS.authRemember);
  clearCookie(SESSION_COOKIE);
  clearCookie(TOKEN_COOKIE);
}

export function hasSessionCookie(cookieHeader: string | null | undefined) {
  if (!cookieHeader) return false;
  const parts = cookieHeader.split(";").map((part) => part.trim());
  const sessionOk = parts.some((part) => {
    const [key, value] = part.split("=");
    return key === SESSION_COOKIE && value === "1";
  });
  if (!sessionOk) return false;

  // Require token cookie as well so stale dw_session alone cannot pass middleware.
  return parts.some((part) => {
    const [key, value] = part.split("=");
    return key === TOKEN_COOKIE && Boolean(value);
  });
}

export { SESSION_COOKIE, TOKEN_COOKIE };
