import { apiRequest } from "@/lib/api/client";
import type { AuthUser } from "@/types/auth";

type RawProfileUser = AuthUser & {
  _id?: string;
  bio?: string;
  goals?: unknown[];
  tasks?: unknown[];
};

export type ProfileResponse = {
  success: boolean;
  user: AuthUser & {
    bio?: string;
  };
};

export type ProfileUpdatePayload = {
  name?: string;
  bio?: string;
};

function normalizeProfileUser(raw: RawProfileUser): AuthUser & { bio?: string } {
  const id = String(raw.id ?? raw._id ?? "");
  return {
    id,
    name: raw.name,
    email: raw.email,
    ...(raw.aaid ? { aaid: raw.aaid } : {}),
    ...(typeof raw.level === "number" ? { level: raw.level } : {}),
    ...(typeof raw.credits === "number" ? { credits: raw.credits } : {}),
    ...(typeof raw.streak === "number" ? { streak: raw.streak } : {}),
    ...(typeof raw.emailVerified === "boolean"
      ? { emailVerified: raw.emailVerified }
      : {}),
    ...(raw.profileImage ? { profileImage: raw.profileImage } : {}),
    ...(raw.certificates ? { certificates: raw.certificates } : {}),
    ...(raw.role !== undefined ? { role: raw.role } : {}),
    ...(typeof raw.onboardingCompleted === "boolean"
      ? { onboardingCompleted: raw.onboardingCompleted }
      : {}),
    ...(raw.organizationName ? { organizationName: raw.organizationName } : {}),
    ...(raw.learningGoal ? { learningGoal: raw.learningGoal } : {}),
    ...(raw.bio ? { bio: raw.bio } : {}),
  };
}

export const profileApi = {
  get: async (token: string) => {
    const data = await apiRequest<{ success: boolean; user: RawProfileUser }>(
      "/profile",
      {
        method: "GET",
        token,
      },
    );
    return {
      success: data.success,
      user: normalizeProfileUser(data.user),
    } satisfies ProfileResponse;
  },

  update: async (payload: ProfileUpdatePayload, token: string) => {
    const data = await apiRequest<{ success: boolean; user: RawProfileUser }>(
      "/profile",
      {
        method: "PUT",
        body: payload,
        token,
      },
    );
    return {
      success: data.success,
      user: normalizeProfileUser(data.user),
    } satisfies ProfileResponse;
  },
};
