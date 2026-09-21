import { apiRequest } from "@/lib/api/client";
import type { GeneratedLesson, LessonSuggestion } from "@/types/learn";

export type GenerateLessonPayload = {
  topic: string;
  category?: string;
  difficulty?: string;
  context?: string;
};

export const lessonApi = {
  suggestions: (token: string) =>
    apiRequest<{ success: boolean; suggestions: LessonSuggestion[] }>(
      "/lesson/suggestions",
      {
        method: "GET",
        token,
      },
    ),

  generate: (payload: GenerateLessonPayload, token: string) =>
    apiRequest<{ success: boolean; lesson: GeneratedLesson; cached?: boolean }>(
      "/lesson/generate",
      {
        method: "POST",
        body: payload,
        token,
      },
    ),

  videoScript: (
    payload: { topic: string; category?: string; difficulty?: string },
    token: string,
  ) =>
    apiRequest<{ success: boolean; script: unknown }>("/lesson/video-script", {
      method: "POST",
      body: payload,
      token,
    }),
};
