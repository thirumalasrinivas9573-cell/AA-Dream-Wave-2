"use client";

import { usePathname } from "next/navigation";
import { type ReactNode, Suspense } from "react";

import { RequireAuth } from "@/components/auth/auth-guards";
import { Spinner } from "@/components/common/spinner";
import {
  OnboardingGate,
  PlatformShell,
} from "@/components/platform/platform-shell";
import { ROUTES } from "@/constants/routes";

type PlatformLayoutProps = {
  children: ReactNode;
};

function PlatformLayoutInner({ children }: PlatformLayoutProps) {
  const pathname = usePathname();
  const onOnboarding =
    pathname === ROUTES.onboarding ||
    pathname.startsWith(`${ROUTES.onboarding}/`);
  const onInstitution =
    pathname === ROUTES.institution ||
    pathname.startsWith(`${ROUTES.institution}/`);

  return (
    <RequireAuth>
      <OnboardingGate>
        {onInstitution ? (
          children
        ) : (
          <PlatformShell minimal={onOnboarding}>{children}</PlatformShell>
        )}
      </OnboardingGate>
    </RequireAuth>
  );
}

/**
 * Authenticated platform layout with onboarding gate and role shell.
 */
export default function PlatformLayout({ children }: PlatformLayoutProps) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center">
          <Spinner label="Loading workspace" />
        </div>
      }
    >
      <PlatformLayoutInner>{children}</PlatformLayoutInner>
    </Suspense>
  );
}
