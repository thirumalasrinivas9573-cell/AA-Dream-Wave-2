import type { Metadata } from "next";
import { Suspense } from "react";

import { AuthCard } from "@/components/auth/auth-card";
import { GuestOnly } from "@/components/auth/auth-guards";
import { RegisterForm } from "@/components/auth/register-form";
import { Spinner } from "@/components/common/spinner";

export const metadata: Metadata = {
  title: "Sign up",
  description: "Create your Dream Wave account",
};

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <AuthCard title="Create account" description="Loading…">
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        </AuthCard>
      }
    >
      <GuestOnly>
        <AuthCard
          title="Create your account"
          description="Start learning with Dream Wave in a few steps."
        >
          <RegisterForm />
        </AuthCard>
      </GuestOnly>
    </Suspense>
  );
}
