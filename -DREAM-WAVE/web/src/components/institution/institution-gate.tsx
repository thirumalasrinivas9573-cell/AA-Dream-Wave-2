"use client";

import { useRouter } from "next/navigation";
import { type ReactNode,useEffect } from "react";

import { Spinner } from "@/components/common/spinner";
import { useAuth } from "@/components/providers/auth-provider";
import { ROUTES } from "@/constants/routes";

type InstitutionGateProps = {
  children: ReactNode;
};

/**
 * Restricts institution routes to institution-role users.
 */
export function InstitutionGate({ children }: InstitutionGateProps) {
  const { user, loading, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading || !isAuthenticated) return;
    if (user?.role !== "institution") {
      router.replace(ROUTES.dashboard);
    }
  }, [isAuthenticated, loading, router, user?.role]);

  if (loading || !isAuthenticated) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner label="Checking access" />
      </div>
    );
  }

  if (user?.role !== "institution") {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner label="Redirecting" />
      </div>
    );
  }

  return children;
}
