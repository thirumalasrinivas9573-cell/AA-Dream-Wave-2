"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";

import { AuthAlert } from "@/components/auth/auth-alert";
import {
  FormField,
  PasswordInput,
  PasswordStrengthMeter,
} from "@/components/forms";
import { useAuth } from "@/components/providers/auth-provider";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { AUTH_ROUTES } from "@/constants/auth";
import { registerSchema, type RegisterValues } from "@/lib/auth/schemas";
import { cn } from "@/lib/utils";
import type { AuthFormStatus } from "@/types/auth";

/**
 * Production signup form wired to Dream Wave auth API.
 */
export function RegisterForm() {
  const router = useRouter();
  const { register: registerUser } = useAuth();
  const [status, setStatus] = useState<AuthFormStatus>("idle");
  const [message, setMessage] = useState<string | null>(null);

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
      acceptTerms: false,
    },
  });

  const password = useWatch({ control, name: "password" }) ?? "";
  const loading = status === "loading" || isSubmitting;

  const onSubmit = handleSubmit(async (values) => {
    setStatus("loading");
    setMessage(null);

    try {
      const result = await registerUser(
        values.fullName,
        values.email,
        values.password,
      );
      setStatus("success");

      if (result.requiresVerification) {
        const hint = result.devOtp
          ? ` Use code ${result.devOtp} to verify (development only).`
          : "";

        setMessage(`Account created. Check your email for a verification code.${hint}`);

        const params = new URLSearchParams({
          email: values.email,
          purpose: "verify",
        });
        if (result.devOtp) params.set("devOtp", result.devOtp);

        router.replace(`${AUTH_ROUTES.verifyEmail}?${params.toString()}`);
      } else {
        setMessage("Account created. Redirecting...");
        router.replace("/student/dashboard");
      }
    } catch (error) {
      setStatus("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "We couldn’t create your account. Try a different email.",
      );
    }
  });

  return (
    <form className="space-y-4" onSubmit={onSubmit} noValidate>
      {status === "error" && message ? (
        <AuthAlert
          variant="error"
          title="Registration failed"
          description={message}
        />
      ) : null}
      {status === "success" && message ? (
        <AuthAlert
          variant="success"
          title="Account ready"
          description={message}
        />
      ) : null}

      <FormField
        id="register-name"
        label="Full name"
        error={errors.fullName?.message}
        required
      >
        <Input
          id="register-name"
          autoComplete="name"
          placeholder="Alex Morgan"
          required
          aria-required="true"
          aria-invalid={Boolean(errors.fullName) || undefined}
          aria-describedby={
            errors.fullName ? "register-name-error" : undefined
          }
          disabled={loading}
          className="h-10"
          {...register("fullName")}
        />
      </FormField>

      <FormField
        id="register-email"
        label="Email"
        error={errors.email?.message}
        required
      >
        <Input
          id="register-email"
          type="email"
          autoComplete="email"
          placeholder="you@organization.com"
          required
          aria-required="true"
          aria-invalid={Boolean(errors.email) || undefined}
          aria-describedby={errors.email ? "register-email-error" : undefined}
          disabled={loading}
          className="h-10"
          {...register("email")}
        />
      </FormField>

      <FormField
        id="register-password"
        label="Password"
        error={errors.password?.message}
        hint="Use at least 8 characters with mixed case and a number."
        required
      >
        <PasswordInput
          id="register-password"
          autoComplete="new-password"
          placeholder="Create a password"
          required
          aria-required="true"
          invalid={Boolean(errors.password)}
          aria-describedby={
            errors.password
              ? "register-password-error"
              : "register-password-hint"
          }
          disabled={loading}
          {...register("password")}
        />
        <PasswordStrengthMeter password={password} className="mt-2" />
      </FormField>

      <FormField
        id="register-confirm"
        label="Confirm password"
        error={errors.confirmPassword?.message}
        required
      >
        <PasswordInput
          id="register-confirm"
          autoComplete="new-password"
          placeholder="Confirm your password"
          required
          aria-required="true"
          invalid={Boolean(errors.confirmPassword)}
          aria-describedby={
            errors.confirmPassword ? "register-confirm-error" : undefined
          }
          disabled={loading}
          {...register("confirmPassword")}
        />
      </FormField>

      <Controller
        name="acceptTerms"
        control={control}
        render={({ field }) => (
          <div className="space-y-1.5">
            <label className="flex items-start gap-2 text-sm">
              <Checkbox
                className="mt-0.5"
                checked={field.value}
                onCheckedChange={(checked) => field.onChange(checked === true)}
                disabled={loading}
                aria-required="true"
                aria-invalid={Boolean(errors.acceptTerms) || undefined}
                aria-describedby={
                  errors.acceptTerms ? "register-terms-error" : undefined
                }
              />
              <span className="text-muted-foreground">
                I agree to the{" "}
                <Link
                  href="/terms"
                  className="text-foreground underline-offset-4 hover:underline"
                >
                  Terms
                </Link>{" "}
                and{" "}
                <Link
                  href="/privacy"
                  className="text-foreground underline-offset-4 hover:underline"
                >
                  Privacy Policy
                </Link>
                .
              </span>
            </label>
            {errors.acceptTerms?.message ? (
              <p
                id="register-terms-error"
                role="alert"
                className="text-destructive text-xs"
              >
                {errors.acceptTerms.message}
              </p>
            ) : null}
          </div>
        )}
      />

      <Button type="submit" className="h-10 w-full" disabled={loading}>
        {loading ? "Creating account…" : "Create account"}
      </Button>

      <p className="text-muted-foreground text-center text-sm">
        Already have an account?{" "}
        <Link
          href={AUTH_ROUTES.login}
          className={cn(
            buttonVariants({ variant: "link" }),
            "h-auto px-0 text-sm",
          )}
        >
          Log in
        </Link>
      </p>
    </form>
  );
}
