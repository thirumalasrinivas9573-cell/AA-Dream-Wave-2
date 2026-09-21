import type { Metadata } from "next";
import { Suspense } from "react";

import { AuthCard } from "@/components/auth/auth-card";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { Spinner } from "@/components/common/spinner";

export const metadata: Metadata = {
  title: "Reset password",
  description: "Choose a new Dream Wave password",
};

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <AuthCard title="Reset password" description="Loading…">
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        </AuthCard>
      }
    >
      <AuthCard
        title="Reset password"
        description="Choose a strong new password for your account."
      >
        <ResetPasswordForm />
      </AuthCard>
    </Suspense>
  );
}
