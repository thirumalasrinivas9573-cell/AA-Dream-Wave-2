import { apiRequest } from "@/lib/api/client";
import type { RoadmapDocument, RoadmapResponse } from "@/types/student";

export type GenerateRoadmapPayload = {
  goalId: string;
  goalTitle: string;
  category?: string;
};

export const roadmapApi = {
  get: (goalId: string, token: string) =>
    apiRequest<RoadmapResponse>(`/roadmap/${goalId}`, {
      method: "GET",
      token,
    }),

  generate: (payload: GenerateRoadmapPayload, token: string) =>
    apiRequest<RoadmapResponse>("/roadmap/generate", {
      method: "POST",
      body: payload,
      token,
    }),
};

export type { RoadmapDocument };
