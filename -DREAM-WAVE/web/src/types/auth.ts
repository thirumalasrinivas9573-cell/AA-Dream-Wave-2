/**
 * Auth domain types aligned with Dream Wave API responses.
 */

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  aaid?: string;
  level?: number;
  credits?: number;
  streak?: number;
  emailVerified?: boolean;
  profileImage?: string;
  certificates?: string[];
  role?: "student" | "institution" | "company" | "admin" | null;
  onboardingCompleted?: boolean;
  organizationName?: string;
  learningGoal?: string;
};

export type AuthSessionResponse = {
  success: boolean;
  token: string;
  user: AuthUser;
  requiresVerification?: boolean;
  message?: string;
  /** Present only in non-production API responses for local testing. */
  devOtp?: string;
};

export type AuthMeResponse = {
  success: boolean;
  user: AuthUser;
};

export type AuthMessageResponse = {
  success: boolean;
  message: string;
  devOtp?: string;
  resetAllowed?: boolean;
  email?: string;
  token?: string;
  user?: AuthUser;
};

export type OtpPurpose = "verify" | "reset";

export type AuthFormStatus = "idle" | "loading" | "success" | "error";
