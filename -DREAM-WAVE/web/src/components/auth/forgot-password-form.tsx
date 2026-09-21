"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { AuthAlert } from "@/components/auth/auth-alert";
import { FormField } from "@/components/forms";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AUTH_ROUTES } from "@/constants/auth";
import {
  forgotPasswordSchema,
  type ForgotPasswordValues,
} from "@/lib/auth/schemas";
import { toUserSafeMessage } from "@/lib/errors";
import { cn } from "@/lib/utils";
import { authService } from "@/services/auth.service";
import type { AuthFormStatus } from "@/types/auth";

/**
 * Forgot password — requests a 6-digit OTP from the API.
 */
export function ForgotPasswordForm() {
  const router = useRouter();
  const [status, setStatus] = useState<AuthFormStatus>("idle");
  const [message, setMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const loading = status === "loading" || isSubmitting;

  const onSubmit = handleSubmit(async (values) => {
    setStatus("loading");
    setMessage(null);

    try {
      const data = await authService.forgotPassword({ email: values.email });
      setStatus("success");

      const hint = data.devOtp
        ? ` Development code: ${data.devOtp}.`
        : "";

      setMessage(`${data.message}${hint}`);

      const params = new URLSearchParams({
        email: values.email,
        purpose: "reset",
      });
      if (data.devOtp) params.set("devOtp", data.devOtp);

      router.push(`${AUTH_ROUTES.verifyEmail}?${params.toString()}`);
    } catch (error) {
      setStatus("error");
      setMessage(toUserSafeMessage(error));
    }
  });

  return (
    <form className="space-y-4" onSubmit={onSubmit} noValidate>
      {status === "error" && message ? (
        <AuthAlert
          variant="error"
          title="Request failed"
          description={message}
        />
      ) : null}
      {status === "success" && message ? (
        <AuthAlert
          variant="success"
          title="Check your inbox"
          description={message}
        />
      ) : null}

      <FormField
        id="forgot-email"
        label="Email"
        error={errors.email?.message}
        required
      >
        <Input
          id="forgot-email"
          type="email"
          autoComplete="email"
          placeholder="you@organization.com"
          required
          aria-required="true"
          aria-invalid={Boolean(errors.email) || undefined}
          aria-describedby={errors.email ? "forgot-email-error" : undefined}
          disabled={loading}
          className="h-10"
          {...register("email")}
        />
      </FormField>

      <Button type="submit" className="h-10 w-full" disabled={loading}>
        {loading ? "Sending…" : "Send verification code"}
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
