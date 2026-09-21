import { apiRequest } from "@/lib/api/client";
import type {
  AuthMeResponse,
  AuthMessageResponse,
  AuthSessionResponse,
  OtpPurpose,
} from "@/types/auth";

export type LoginPayload = {
  email: string;
  password: string;
};

export type RegisterPayload = {
  name: string;
  email: string;
  password: string;
};

export type ForgotPasswordPayload = {
  email: string;
};

export type VerifyOtpPayload = {
  email: string;
  otp: string;
  purpose: OtpPurpose;
};

export type ResendOtpPayload = {
  email: string;
  purpose: OtpPurpose;
};

export type ResetPasswordPayload = {
  email: string;
  otp: string;
  password: string;
};

export type CompleteOnboardingPayload = {
  role: "student" | "institution" | "company" | "admin";
  organizationName?: string;
  learningGoal?: string;
};

export const authApi = {
  login: (payload: LoginPayload) =>
    apiRequest<AuthSessionResponse>("/auth/login", {
      method: "POST",
      body: payload,
    }),

  register: (payload: RegisterPayload) =>
    apiRequest<AuthSessionResponse>("/auth/register", {
      method: "POST",
      body: payload,
    }),

  me: (token: string) =>
    apiRequest<AuthMeResponse>("/auth/me", {
      method: "GET",
      token,
    }),

  forgotPassword: (payload: ForgotPasswordPayload) =>
    apiRequest<AuthMessageResponse>("/auth/forgot-password", {
      method: "POST",
      body: payload,
    }),

  verifyOtp: (payload: VerifyOtpPayload) =>
    apiRequest<AuthMessageResponse>("/auth/verify-otp", {
      method: "POST",
      body: payload,
    }),

  resendOtp: (payload: ResendOtpPayload) =>
    apiRequest<AuthMessageResponse>("/auth/resend-otp", {
      method: "POST",
      body: payload,
    }),

  resetPassword: (payload: ResetPasswordPayload) =>
    apiRequest<AuthMessageResponse>("/auth/reset-password", {
      method: "POST",
      body: payload,
    }),

  completeOnboarding: (payload: CompleteOnboardingPayload, token: string) =>
    apiRequest<AuthMeResponse & { message?: string }>("/auth/onboarding", {
      method: "POST",
      body: payload,
      token,
    }),
};
