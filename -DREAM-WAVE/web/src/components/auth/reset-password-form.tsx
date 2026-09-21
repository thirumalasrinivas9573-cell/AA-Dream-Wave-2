"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";

import { AuthAlert } from "@/components/auth/auth-alert";
import {
  FormField,
  PasswordInput,
  PasswordStrengthMeter,
} from "@/components/forms";
import { Button, buttonVariants } from "@/components/ui/button";
import { AUTH_ROUTES } from "@/constants/auth";
import {
  clearPasswordResetChallenge,
  readPasswordResetChallenge,
} from "@/lib/auth/password-reset-challenge";
import {
  resetPasswordSchema,
  type ResetPasswordValues,
} from "@/lib/auth/schemas";
import { toUserSafeMessage } from "@/lib/errors";
import { cn } from "@/lib/utils";
import { authService } from "@/services/auth.service";
import type { AuthFormStatus } from "@/types/auth";

/**
 * Reset password with email + OTP from the verification step.
 */
export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailFromQuery = searchParams.get("email")?.trim() ?? "";

  const challenge = useMemo(() => readPasswordResetChallenge(), []);
  const email = challenge?.email || emailFromQuery;
  const otp = challenge?.otp ?? "";

  const [status, setStatus] = useState<AuthFormStatus>("idle");
  const [message, setMessage] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  const password = useWatch({ control, name: "password" }) ?? "";
  const loading = status === "loading" || isSubmitting;
  const missingContext = !email || !otp;

  const onSubmit = handleSubmit(async (values) => {
    if (missingContext) {
      setStatus("error");
      setMessage("Reset link is incomplete. Request a new verification code.");
      return;
    }

    setStatus("loading");
    setMessage(null);

    try {
      const data = await authService.resetPassword({
        email,
        otp,
        password: values.password,
      });
      clearPasswordResetChallenge();
      setStatus("success");
      setMessage(data.message);
      window.setTimeout(() => {
        router.replace(AUTH_ROUTES.login);
      }, 1200);
    } catch (error) {
      setStatus("error");
      setMessage(toUserSafeMessage(error));
    }
  });

  return (
    <form className="space-y-4" onSubmit={onSubmit} noValidate>
      {missingContext ? (
        <AuthAlert
          variant="error"
          title="Invalid reset session"
          description="Start again from Forgot password to receive a new code."
        />
      ) : null}

      {status === "error" && message ? (
        <AuthAlert
          variant="error"
          title="Reset failed"
          description={message}
        />
      ) : null}
      {status === "success" && message ? (
        <AuthAlert
          variant="success"
          title="Password updated"
          description={message}
        />
      ) : null}

      <FormField
        id="reset-password"
        label="New password"
        error={errors.password?.message}
        required
      >
        <PasswordInput
          id="reset-password"
          autoComplete="new-password"
          placeholder="Create a new password"
          required
          aria-required="true"
          invalid={Boolean(errors.password)}
          aria-describedby={
            errors.password ? "reset-password-error" : undefined
          }
          disabled={loading || status === "success" || missingContext}
          {...register("password")}
        />
        <PasswordStrengthMeter password={password} className="mt-2" />
      </FormField>

      <FormField
        id="reset-confirm"
        label="Confirm password"
        error={errors.confirmPassword?.message}
        required
      >
        <PasswordInput
          id="reset-confirm"
          autoComplete="new-password"
          placeholder="Confirm new password"
          required
          aria-required="true"
          invalid={Boolean(errors.confirmPassword)}
          aria-describedby={
            errors.confirmPassword ? "reset-confirm-error" : undefined
          }
          disabled={loading || status === "success" || missingContext}
          {...register("confirmPassword")}
        />
      </FormField>

      <Button
        type="submit"
        className="h-10 w-full"
        disabled={loading || status === "success" || missingContext}
      >
        {loading ? "Updating…" : "Update password"}
      </Button>

      <p className="text-center text-sm">
        <Link
          href={AUTH_ROUTES.login}
          className={cn(
            buttonVariants({ variant: "link" }),
            "h-auto px-0 text-sm",
          )}
        >
          Back to login
        </Link>
      </p>
    </form>
  );
}
