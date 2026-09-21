import { ROUTES } from "@/constants/routes";
import type { AuthUser } from "@/types/auth";

/**
 * Destination after a successful auth action.
 */
export function getPostAuthDestination(
  user: Pick<AuthUser, "onboardingCompleted">,
  nextPath?: string | null,
): string {
  if (!user.onboardingCompleted) {
    return ROUTES.onboarding;
  }

  if (nextPath && nextPath.startsWith("/") && !nextPath.startsWith("//")) {
    if (
      nextPath === ROUTES.onboarding ||
      nextPath.startsWith(`${ROUTES.onboarding}/`)
    ) {
      return ROUTES.dashboard;
    }
    return nextPath;
  }

  return ROUTES.dashboard;
}

export function needsOnboarding(
  user: Pick<AuthUser, "onboardingCompleted" | "role"> | null,
): boolean {
  if (!user) return false;
  return !user.onboardingCompleted || !user.role;
}
