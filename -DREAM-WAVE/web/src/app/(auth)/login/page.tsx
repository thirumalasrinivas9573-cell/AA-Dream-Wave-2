import type { Metadata } from "next";
import { Suspense } from "react";

import { AuthCard } from "@/components/auth/auth-card";
import { GuestOnly } from "@/components/auth/auth-guards";
import { LoginForm } from "@/components/auth/login-form";
import { Spinner } from "@/components/common/spinner";

export const metadata: Metadata = {
  title: "Log in",
  description: "Sign in to Dream Wave",
};

function LoginContent() {
  return (
    <GuestOnly>
      <AuthCard
        title="Welcome back"
        description="Sign in to continue your learning journey."
      >
        <LoginForm />
      </AuthCard>
    </GuestOnly>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <AuthCard title="Welcome back" description="Loading sign-in…">
          <div className="flex justify-center py-8">
            <Spinner label="Loading" />
          </div>
        </AuthCard>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
