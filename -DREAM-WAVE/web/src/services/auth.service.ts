import type {
  CompleteOnboardingPayload,
  ForgotPasswordPayload,
  LoginPayload,
  RegisterPayload,
  ResendOtpPayload,
  ResetPasswordPayload,
  VerifyOtpPayload,
} from "@/lib/api/auth";
import { authApi } from "@/lib/api/auth";

/**
 * Auth service — thin domain wrapper over API client.
 */
export const authService = {
  login: (payload: LoginPayload) => authApi.login(payload),
  register: (payload: RegisterPayload) => authApi.register(payload),
  me: (token: string) => authApi.me(token),
  forgotPassword: (payload: ForgotPasswordPayload) =>
    authApi.forgotPassword(payload),
  verifyOtp: (payload: VerifyOtpPayload) => authApi.verifyOtp(payload),
  resendOtp: (payload: ResendOtpPayload) => authApi.resendOtp(payload),
  resetPassword: (payload: ResetPasswordPayload) =>
    authApi.resetPassword(payload),
  completeOnboarding: (payload: CompleteOnboardingPayload, token: string) =>
    authApi.completeOnboarding(payload, token),
};
