"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";

import { AuthAlert } from "@/components/auth/auth-alert";
import { FormField } from "@/components/forms";
import { useAuth } from "@/components/providers/auth-provider";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AUTH_ROUTES } from "@/constants/auth";
import { storePasswordResetChallenge } from "@/lib/auth/password-reset-challenge";
import { getPostAuthDestination } from "@/lib/auth/post-auth";
import { otpSchema, type OtpValues } from "@/lib/auth/schemas";
import { toUserSafeMessage } from "@/lib/errors";
import { cn } from "@/lib/utils";
import { authService } from "@/services/auth.service";
import type { AuthFormStatus, OtpPurpose } from "@/types/auth";

/**
 * OTP verification UI for email verification and password-reset unlock.
 */
export function VerifyEmailPanel() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setSession } = useAuth();

  const email = searchParams.get("email")?.trim() ?? "";
  const purposeParam = searchParams.get("purpose");
  const purpose: OtpPurpose =
    purposeParam === "reset" ? "reset" : "verify";
  const devOtpHint = searchParams.get("devOtp");

  const [status, setStatus] = useState<AuthFormStatus>("idle");
  const [message, setMessage] = useState<string | null>(null);
  const [resendStatus, setResendStatus] = useState<AuthFormStatus>("idle");
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<OtpValues>({
    resolver: zodResolver(otpSchema),
    defaultValues: { otp: "" },
  });

  const titleCopy = useMemo(() => {
    if (purpose === "reset") {
      return "Enter the 6-digit code we sent to reset your password.";
    }
    return "Enter the 6-digit code we sent to verify your email.";
  }, [purpose]);

  const loading = status === "loading" || isSubmitting;
  const missingEmail = !email;

  const onSubmit = handleSubmit(async (values) => {
    if (missingEmail) {
      setStatus("error");
      setMessage("Email is missing. Restart from signup or forgot password.");
      return;
    }

    setStatus("loading");
    setMessage(null);

    try {
      const data = await authService.verifyOtp({
        email,
        otp: values.otp,
        purpose,
      });

      if (purpose === "reset") {
        setStatus("success");
        setMessage("Code verified. Choose a new password.");
        storePasswordResetChallenge(email, values.otp);
        const params = new URLSearchParams({ email });
        router.replace(`${AUTH_ROUTES.resetPassword}?${params.toString()}`);
        return;
      }

      if (data.token && data.user) {
        setSession(data.token, data.user, true);
      }

      setStatus("success");
      setMessage(data.message || "Email verified successfully.");
      router.replace(
        getPostAuthDestination(data.user ?? { onboardingCompleted: false }),
      );
    } catch (error) {
      setStatus("error");
      setMessage(toUserSafeMessage(error));
    }
  });

  const onResend = async () => {
    if (missingEmail) {
      setResendStatus("error");
      setResendMessage("Email is missing. Restart the flow.");
      return;
    }

    setResendStatus("loading");
    setResendMessage(null);

    try {
      const data = await authService.resendOtp({ email, purpose });
      setResendStatus("success");
      const hint = data.devOtp ? ` Development code: ${data.devOtp}.` : "";
      setResendMessage(`${data.message}${hint}`);
    } catch (error) {
      setResendStatus("error");
      setResendMessage(toUserSafeMessage(error));
    }
  };

  return (
    <div className="space-y-5">
      <div
        className="border-border bg-muted/30 flex min-h-28 items-center justify-center rounded-2xl border border-dashed px-4"
        aria-hidden="true"
      >
        <p className="text-muted-foreground text-center text-sm text-pretty">
          {titleCopy}
          {email ? (
            <>
              {" "}
              <span className="text-foreground font-medium">{email}</span>
            </>
          ) : null}
        </p>
      </div>

      {devOtpHint ? (
        <AuthAlert
          variant="success"
          title="Development code"
          description={`Use ${devOtpHint} while email delivery is unavailable.`}
        />
      ) : null}

      {missingEmail ? (
        <AuthAlert
          variant="error"
          title="Missing email"
          description="Open this page from signup or forgot password so we know which account to verify."
        />
      ) : null}

      {status === "error" && message ? (
        <AuthAlert
          variant="error"
          title="Verification failed"
          description={message}
        />
      ) : null}
      {status === "success" && message ? (
        <AuthAlert
          variant="success"
          title="Verified"
          description={message}
        />
      ) : null}
      {resendStatus === "success" && resendMessage ? (
        <AuthAlert
          variant="success"
          title="Code sent"
          description={resendMessage}
        />
      ) : null}
      {resendStatus === "error" && resendMessage ? (
        <AuthAlert
          variant="error"
          title="Resend failed"
          description={resendMessage}
        />
      ) : null}

      <form className="space-y-4" onSubmit={onSubmit} noValidate>
        <FormField
          id="otp-code"
          label="Verification code"
          error={errors.otp?.message}
          required
        >
          <Input
            id="otp-code"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="123456"
            maxLength={6}
            required
            aria-required="true"
            aria-invalid={Boolean(errors.otp) || undefined}
            aria-describedby={errors.otp ? "otp-code-error" : undefined}
            disabled={loading || missingEmail}
            className="h-10 tracking-[0.35em]"
            {...register("otp")}
          />
        </FormField>

        <Button
          type="submit"
          className="h-10 w-full"
          disabled={loading || missingEmail}
        >
          {loading ? "Verifying…" : "Verify code"}
        </Button>
      </form>

      <Button
        type="button"
        variant="outline"
        className="h-10 w-full"
        disabled={resendStatus === "loading" || missingEmail}
        onClick={() => void onResend()}
      >
        {resendStatus === "loading" ? "Sending…" : "Resend code"}
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
    </div>
  );
}
