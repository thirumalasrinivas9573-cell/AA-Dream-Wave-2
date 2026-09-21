import { z } from "zod";

import { isPlatformRole } from "@/constants/roles";

export const onboardingRoleSchema = z.object({
  role: z.string().refine(isPlatformRole, "Select a platform role"),
});

export const onboardingDetailsSchema = z.object({
  organizationName: z.string().max(120, "Keep this under 120 characters").optional(),
  learningGoal: z.string().max(240, "Keep this under 240 characters").optional(),
});

export type OnboardingRoleValues = z.infer<typeof onboardingRoleSchema>;
export type OnboardingDetailsValues = z.infer<typeof onboardingDetailsSchema>;
