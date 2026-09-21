"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";

import { AuthAlert } from "@/components/auth/auth-alert";
import { FormField, PasswordInput } from "@/components/forms";
import { useAuth } from "@/components/providers/auth-provider";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { AUTH_ROUTES } from "@/constants/auth";
import { getPostAuthDestination } from "@/lib/auth/post-auth";
import { loginSchema, type LoginValues } from "@/lib/auth/schemas";
import { cn } from "@/lib/utils";
import type { AuthFormStatus } from "@/types/auth";

type PortalType = "student" | "institution" | "company";

const PORTALS: Array<{
  id: PortalType;
  title: string;
  badge: string;
  icon: string;
  desc: string;
}> = [
  {
    id: "student",
    title: "Student Portal",
    badge: "Learner",
    icon: "🎓",
    desc: "AI Mentor, Roadmap & Library",
  },
  {
    id: "institution",
    title: "College Portal",
    badge: "Campus",
    icon: "🏛️",
    desc: "Placements & Administration",
  },
  {
    id: "company",
    title: "Company Portal",
    badge: "Recruiter",
    icon: "🏢",
    desc: "Verified Talent & Hiring",
  },
];

/**
 * Multi-portal login form featuring 3 orange portal boxes on blue theme.
 */
export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const [selectedPortal, setSelectedPortal] = useState<PortalType>("student");
  const [status, setStatus] = useState<AuthFormStatus>("idle");
  const [message, setMessage] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      remember: true,
    },
  });

  const loading = status === "loading" || isSubmitting;

  const onSubmit = handleSubmit(async (values) => {
    setStatus("loading");
    setMessage(null);

    try {
      const user = await login(
        values.email,
        values.password,
        Boolean(values.remember),
      );
      setStatus("success");
      setMessage("Signed in successfully. Redirecting…");
      const next = searchParams.get("next");
      router.replace(getPostAuthDestination(user, next));
    } catch (error) {
      setStatus("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "We couldn’t sign you in. Check your details and try again.",
      );
    }
  });

  const activePortalData =
    PORTALS.find((p) => p.id === selectedPortal) || PORTALS[0];

  return (
    <div className="space-y-6">
      {/* 3 Orange Portal Selection Boxes */}
      <div className="grid grid-cols-3 gap-2">
        {PORTALS.map((portal) => {
          const isSelected = selectedPortal === portal.id;
          return (
            <button
              key={portal.id}
              type="button"
              onClick={() => setSelectedPortal(portal.id)}
              className={cn(
                "group relative flex flex-col items-center justify-between rounded-xl p-3 text-center transition-all",
                "border backdrop-blur-md",
                isSelected
                  ? "border-orange-500 bg-orange-500/15 shadow-[0_0_20px_rgba(249,115,22,0.35)] ring-1 ring-orange-500"
                  : "border-orange-500/30 bg-slate-900/60 hover:border-orange-500/60 hover:bg-orange-500/10",
              )}
            >
              <span className="text-xl">{portal.icon}</span>
              <span className="mt-1 text-xs font-bold text-orange-400">
                {portal.title}
              </span>
              <span className="text-[10px] text-slate-400">{portal.badge}</span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-500/40 bg-orange-500/10 px-3 py-1 text-xs font-semibold text-orange-300">
          <span>{activePortalData.icon}</span>
          <span>Signing into {activePortalData.title}</span>
        </span>
      </div>

      <form className="space-y-4" onSubmit={onSubmit} noValidate>
        {status === "error" && message ? (
          <AuthAlert
            variant="error"
            title="Sign-in failed"
            description={message}
          />
        ) : null}
        {status === "success" && message ? (
          <AuthAlert
            variant="success"
            title="Welcome back"
            description={message}
          />
        ) : null}

        <FormField
          id="login-email"
          label="Email"
          error={errors.email?.message}
          required
        >
          <Input
            id="login-email"
            type="email"
            autoComplete="email"
            placeholder="you@organization.com"
            required
            aria-required="true"
            aria-invalid={Boolean(errors.email) || undefined}
            aria-describedby={errors.email ? "login-email-error" : undefined}
            disabled={loading}
            className="h-10 border-orange-500/30 bg-slate-950/70 focus-visible:border-orange-500 focus-visible:ring-orange-500/30"
            {...register("email")}
          />
        </FormField>

        <FormField
          id="login-password"
          label="Password"
          error={errors.password?.message}
          required
        >
          <PasswordInput
            id="login-password"
            autoComplete="current-password"
            placeholder="Enter your password"
            required
            aria-required="true"
            invalid={Boolean(errors.password)}
            aria-describedby={
              errors.password ? "login-password-error" : undefined
            }
            disabled={loading}
            className="border-orange-500/30 bg-slate-950/70 focus-visible:border-orange-500 focus-visible:ring-orange-500/30"
            {...register("password")}
          />
        </FormField>

        <div className="flex items-center justify-between gap-3">
          <Controller
            name="remember"
            control={control}
            render={({ field }) => (
              <label className="flex items-center gap-2 text-sm text-slate-300">
                <Checkbox
                  checked={Boolean(field.value)}
                  onCheckedChange={(checked) => field.onChange(checked === true)}
                  disabled={loading}
                  className="data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500"
                />
                <span>Remember me</span>
              </label>
            )}
          />
          <Link
            href={AUTH_ROUTES.forgotPassword}
            className="text-orange-400 hover:text-orange-300 text-sm underline-offset-4 hover:underline focus-visible:outline-none"
          >
            Forgot password?
          </Link>
        </div>

        <Button
          type="submit"
          className="h-11 w-full bg-gradient-to-r from-orange-500 to-amber-600 font-bold text-white shadow-[0_4px_16px_rgba(249,115,22,0.4)] hover:from-orange-600 hover:to-amber-700"
          disabled={loading}
        >
          {loading ? (
            <>
              <span
                className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent"
                aria-hidden="true"
              />
              Signing in…
            </>
          ) : (
            `Sign in to ${activePortalData.title} →`
          )}
        </Button>

        <p className="text-muted-foreground text-center text-sm">
          Don&apos;t have an account?{" "}
          <Link
            href={AUTH_ROUTES.register}
            className={cn(
              buttonVariants({ variant: "link" }),
              "h-auto px-0 text-sm text-orange-400 hover:text-orange-300",
            )}
          >
            Sign up
          </Link>
        </p>
      </form>
    </div>
  );
}
