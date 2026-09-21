import { STORAGE_KEYS } from "@/constants/storage";

type PasswordResetChallenge = {
  email: string;
  otp: string;
};

function canUseSessionStorage(): boolean {
  return typeof window !== "undefined" && typeof sessionStorage !== "undefined";
}

/**
 * Hold password-reset OTP in sessionStorage (not the URL).
 */
export function storePasswordResetChallenge(email: string, otp: string): void {
  if (!canUseSessionStorage()) return;
  const payload: PasswordResetChallenge = { email, otp };
  sessionStorage.setItem(
    STORAGE_KEYS.passwordResetChallenge,
    JSON.stringify(payload),
  );
}

export function readPasswordResetChallenge(): PasswordResetChallenge | null {
  if (!canUseSessionStorage()) return null;
  const raw = sessionStorage.getItem(STORAGE_KEYS.passwordResetChallenge);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as PasswordResetChallenge;
    if (
      typeof parsed?.email === "string" &&
      typeof parsed?.otp === "string" &&
      parsed.email &&
      parsed.otp
    ) {
      return parsed;
    }
  } catch {
    // Corrupt payload — clear and ignore.
  }
  clearPasswordResetChallenge();
  return null;
}

export function clearPasswordResetChallenge(): void {
  if (!canUseSessionStorage()) return;
  sessionStorage.removeItem(STORAGE_KEYS.passwordResetChallenge);
}
