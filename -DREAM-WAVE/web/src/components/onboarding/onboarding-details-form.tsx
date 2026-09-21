"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

import { AuthAlert } from "@/components/auth/auth-alert";
import { FormField } from "@/components/forms";
import {
  clearDraftRole,
  getDraftRole,
} from "@/components/onboarding/role-selection-form";
import { useAuth } from "@/components/providers/auth-provider";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getRoleLabel } from "@/constants/roles";
import { ROUTES } from "@/constants/routes";
import {
  onboardingDetailsSchema,
  type OnboardingDetailsValues,
} from "@/lib/onboarding/schemas";
import { cn } from "@/lib/utils";
import type { AuthFormStatus } from "@/types/auth";

/**
 * Step 2 — role-specific details, then persist onboarding.
 */
export function OnboardingDetailsForm() {
  const router = useRouter();
  const { completeOnboarding } = useAuth();
  const role = getDraftRole();
  const [status, setStatus] = useState<AuthFormStatus>("idle");
  const [message, setMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<OnboardingDetailsValues>({
    resolver: zodResolver(onboardingDetailsSchema),
    defaultValues: {
      organizationName: "",
      learningGoal: "",
    },
  });

  useEffect(() => {
    if (!role) {
      router.replace(ROUTES.onboarding);
    }
  }, [role, router]);

  const loading = status === "loading" || isSubmitting;
  const showOrg = role === "institution" || role === "company" || role === "admin";
  const showGoal = role === "student";

  const onSubmit = handleSubmit(async (values) => {
    if (!role) return;

    setStatus("loading");
    setMessage(null);

    try {
      const payload: {
        role: NonNullable<typeof role>;
        organizationName?: string;
        learningGoal?: string;
      } = { role };

      if (values.organizationName?.trim()) {
        payload.organizationName = values.organizationName.trim();
      }
      if (values.learningGoal?.trim()) {
        payload.learningGoal = values.learningGoal.trim();
      }

      await completeOnboarding(payload);
      clearDraftRole();
      setStatus("success");
      setMessage("Workspace ready. Redirecting…");
      router.replace(ROUTES.dashboard);
    } catch (error) {
      setStatus("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to finish onboarding right now.",
      );
    }
  });

  if (!role) {
    return null;
  }

  return (
    <div className="mx-auto w-full max-w-lg space-y-6">
      <div className="space-y-2">
        <p className="text-muted-foreground text-sm">Step 2 of 2</p>
        <h1 className="text-3xl font-semibold tracking-tight">
          Set up your {getRoleLabel(role).toLowerCase()} profile
        </h1>
        <p className="text-muted-foreground text-sm text-pretty">
          A few details help Dream Wave personalize your first dashboard.
        </p>
      </div>

      {status === "error" && message ? (
        <AuthAlert
          variant="error"
          title="Onboarding failed"
          description={message}
        />
      ) : null}
      {status === "success" && message ? (
        <AuthAlert
          variant="success"
          title="All set"
          description={message}
        />
      ) : null}

      <form className="space-y-4" onSubmit={onSubmit} noValidate>
        {showOrg ? (
          <FormField
            id="org-name"
            label="Organization name"
            error={errors.organizationName?.message}
            hint="School, university, or company name."
          >
            <Input
              id="org-name"
              autoComplete="organization"
              placeholder="Acme University"
              disabled={loading}
              className="h-10"
              {...register("organizationName")}
            />
          </FormField>
        ) : null}

        {showGoal ? (
          <FormField
            id="learning-goal"
            label="Primary learning goal"
            error={errors.learningGoal?.message}
            hint="Optional — you can refine this later."
          >
            <Input
              id="learning-goal"
              placeholder="Become a full-stack engineer"
              disabled={loading}
              className="h-10"
              {...register("learningGoal")}
            />
          </FormField>
        ) : null}

        {!showOrg && !showGoal ? (
          <p className="text-muted-foreground text-sm">
            No extra details required for this role. Continue to open your
            workspace.
          </p>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <Link
            href={ROUTES.onboarding}
            className={cn(
              buttonVariants({ variant: "ghost" }),
              "h-10 px-0 sm:px-3",
            )}
          >
            Back
          </Link>
          <Button type="submit" className="h-10 min-w-36" disabled={loading}>
            {loading ? "Saving…" : "Finish setup"}
          </Button>
        </div>
      </form>
    </div>
  );
}
