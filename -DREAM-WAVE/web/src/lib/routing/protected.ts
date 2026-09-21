/**
 * Protected-route helpers for middleware and layout guards.
 */

export const PROTECTED_ROUTE_PREFIXES = [
  "/dashboard",
  "/settings",
  "/onboarding",
  "/goals",
  "/tasks",
  "/mentor",
  "/roadmap",
  "/books",
  "/reports",
  "/ai",
  "/learn",
  "/institution",
  "/research",
  "/community",
  "/workspace",
] as const;

export type ProtectedRoutePrefix = (typeof PROTECTED_ROUTE_PREFIXES)[number];

/**
 * Returns true when a pathname is reserved for authenticated platform areas.
 */
export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}
