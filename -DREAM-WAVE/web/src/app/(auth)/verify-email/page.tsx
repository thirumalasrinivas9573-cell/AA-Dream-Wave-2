import type { Metadata } from "next";
import { Suspense } from "react";

import { AuthCard } from "@/components/auth/auth-card";
import { VerifyEmailPanel } from "@/components/auth/verify-email-panel";
import { Spinner } from "@/components/common/spinner";

export const metadata: Metadata = {
  title: "Verify code",
  description: "Confirm your Dream Wave verification code",
};

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <AuthCard title="Verify your email" description="Loading…">
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        </AuthCard>
      }
    >
      <AuthCard
        title="Enter verification code"
        description="One more step to secure your Dream Wave account."
      >
        <VerifyEmailPanel />
      </AuthCard>
    </Suspense>
  );
}
