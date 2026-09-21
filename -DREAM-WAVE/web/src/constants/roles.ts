export type PlatformRole =
  | "student"
  | "institution"
  | "company"
  | "admin";

export type RoleOption = {
  id: PlatformRole;
  title: string;
  description: string;
  highlights: readonly string[];
};

export const PLATFORM_ROLES: readonly RoleOption[] = [
  {
    id: "student",
    title: "Student",
    description: "Personal learning paths, AI mentor, and career readiness.",
    highlights: ["Goals & roadmaps", "AI Studio", "Mentor chat"],
  },
  {
    id: "institution",
    title: "Institution",
    description: "Manage cohorts, faculty tools, and learner outcomes.",
    highlights: ["Cohorts", "Progress analytics", "Faculty workspace"],
  },
  {
    id: "company",
    title: "Company",
    description: "Upskill teams and connect learning to role outcomes.",
    highlights: ["Team skills", "Assignments", "Talent insights"],
  },
  {
    id: "admin",
    title: "Administrator",
    description: "Operate the platform with oversight and reporting.",
    highlights: ["User oversight", "System health", "Reports"],
  },
] as const;

export function isPlatformRole(value: string): value is PlatformRole {
  return PLATFORM_ROLES.some((role) => role.id === value);
}

export function getRoleLabel(role: PlatformRole | null | undefined): string {
  if (!role) return "Account";
  return PLATFORM_ROLES.find((item) => item.id === role)?.title ?? "Account";
}
