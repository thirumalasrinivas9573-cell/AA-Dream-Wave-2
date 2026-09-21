import type { Metadata } from "next";
import { Suspense } from "react";

import { AuthCard } from "@/components/auth/auth-card";
import { GuestOnly } from "@/components/auth/auth-guards";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { Spinner } from "@/components/common/spinner";

export const metadata: Metadata = {
  title: "Forgot password",
  description: "Reset your Dream Wave password",
};

export default function ForgotPasswordPage() {
  return (
    <Suspense
      fallback={
        <AuthCard title="Forgot password" description="Loading…">
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        </AuthCard>
      }
    >
      <GuestOnly>
        <AuthCard
          title="Forgot password"
          description="Enter your email and we’ll send a verification code."
        >
          <ForgotPasswordForm />
        </AuthCard>
      </GuestOnly>
    </Suspense>
  );
}
