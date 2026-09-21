"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { type ReactNode, useEffect } from "react";

import { Spinner } from "@/components/common/spinner";
import { useAuth } from "@/components/providers/auth-provider";
import { AUTH_ROUTES } from "@/constants/auth";
import { getPostAuthDestination } from "@/lib/auth/post-auth";

type RequireAuthProps = {
  children: ReactNode;
};

function safeNextPath(pathname: string, search: string): string {
  const combined = `${pathname}${search}`;
  if (combined.startsWith("/") && !combined.startsWith("//")) {
    return combined;
  }
  return "/dashboard";
}

export function RequireAuth({ children }: RequireAuthProps) {
  const { user, isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (loading) return;

    if (!isAuthenticated) {
      const search = searchParams.toString();
      const next = safeNextPath(pathname, search ? `?${search}` : "");
      router.replace(
        `${AUTH_ROUTES.login}?next=${encodeURIComponent(next)}`,
      );
      return;
    }

    if (user && user.emailVerified === false) {
      const params = new URLSearchParams({
        email: user.email,
        purpose: "verify",
      });
      router.replace(`${AUTH_ROUTES.verifyEmail}?${params.toString()}`);
    }
  }, [isAuthenticated, loading, pathname, router, searchParams, user]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner label="Checking session" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (user?.emailVerified === false) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner label="Opening email verification" />
      </div>
    );
  }

  return children;
}

type GuestOnlyProps = {
  children: ReactNode;
};

export function GuestOnly({ children }: GuestOnlyProps) {
  const { user, isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!loading && isAuthenticated && user) {
      const next = searchParams.get("next");
      router.replace(getPostAuthDestination(user, next));
    }
  }, [isAuthenticated, loading, router, searchParams, user]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner label="Loading" />
      </div>
    );
  }

  if (isAuthenticated) {
    return null;
  }

  return children;
}
