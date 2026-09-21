import { apiRequest } from "@/lib/api/client";
import type {
  CreateProgramPayload,
  InstitutionProgram,
  ProgramActivity,
  ProgramDashboard,
  ProgramParticipant,
  ProgramStatus,
  ProgramType,
} from "@/types/institution-program";

type Pagination = { total: number; page: number; limit: number; pageCount: number };

function orgPrefix(portal: "institution" | "company") {
  return portal === "company" ? "/company/programs" : "/institution/programs";
}

export const institutionProgramsApi = {
  getMeta: (token: string, portal: "institution" | "company" = "institution") =>
    apiRequest<{ success: boolean; programTypes: ProgramType[]; programStatuses: ProgramStatus[] }>(
      `${orgPrefix(portal)}/meta`,
      { token },
    ),

  list: (
    token: string,
    portal: "institution" | "company" = "institution",
    params?: Record<string, string | number | undefined>,
  ) => {
    const qs = new URLSearchParams();
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== "" && v !== "all") qs.set(k, String(v));
      }
    }
    const q = qs.toString();
    return apiRequest<{ success: boolean; programs: InstitutionProgram[]; pagination: Pagination }>(
      `${orgPrefix(portal)}${q ? `?${q}` : ""}`,
      { token },
    );
  },

  get: (token: string, id: string, portal: "institution" | "company" = "institution") =>
    apiRequest<{ success: boolean; program: InstitutionProgram }>(
      `${orgPrefix(portal)}/${id}`,
      { token },
    ),

  create: (token: string, payload: CreateProgramPayload, portal: "institution" | "company" = "institution") =>
    apiRequest<{ success: boolean; program: InstitutionProgram }>(
      orgPrefix(portal),
      { method: "POST", body: payload, token },
    ),

  update: (
    token: string,
    id: string,
    payload: Partial<CreateProgramPayload & { visibility: string }>,
    portal: "institution" | "company" = "institution",
  ) =>
    apiRequest<{ success: boolean; program: InstitutionProgram }>(
      `${orgPrefix(portal)}/${id}`,
      { method: "PATCH", body: payload, token },
    ),

  updateStatus: (token: string, id: string, status: ProgramStatus, portal: "institution" | "company" = "institution") =>
    apiRequest<{ success: boolean; program: InstitutionProgram }>(
      `${orgPrefix(portal)}/${id}/status`,
      { method: "POST", body: { status }, token },
    ),

  getDashboard: (token: string, id: string, portal: "institution" | "company" = "institution") =>
    apiRequest<{ success: boolean; dashboard: ProgramDashboard }>(
      `${orgPrefix(portal)}/${id}/dashboard`,
      { token },
    ),

  listParticipants: (token: string, id: string, portal: "institution" | "company" = "institution") =>
    apiRequest<{ success: boolean; participants: ProgramParticipant[] }>(
      `${orgPrefix(portal)}/${id}/participants`,
      { token },
    ),

  updateParticipant: (
    token: string,
    programId: string,
    participantId: string,
    status: string,
    reviewMessage?: string,
    portal: "institution" | "company" = "institution",
  ) =>
    apiRequest<{ success: boolean; participant: ProgramParticipant }>(
      `${orgPrefix(portal)}/${programId}/participants/${participantId}`,
      { method: "PATCH", body: { status, reviewMessage }, token },
    ),

  getActivity: (token: string, id: string, portal: "institution" | "company" = "institution") =>
    apiRequest<{ success: boolean; activity: ProgramActivity[] }>(
      `${orgPrefix(portal)}/${id}/activity`,
      { token },
    ),

  getAiInsights: (token: string, id: string, intent: string, portal: "institution" | "company" = "institution") =>
    apiRequest<{ success: boolean; insight: Record<string, unknown>; source: string }>(
      `${orgPrefix(portal)}/${id}/ai/insights`,
      { method: "POST", body: { intent }, token },
    ),
};

export const studentProgramsApi = {
  discover: (token: string, params?: Record<string, string | undefined>) => {
    const qs = new URLSearchParams();
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v) qs.set(k, v);
      }
    }
    const q = qs.toString();
    return apiRequest<{ success: boolean; programs: import("@/types/institution-program").DiscoverableProgram[] }>(
      `/student/programs/discover${q ? `?${q}` : ""}`,
      { token },
    );
  },

  myPrograms: (token: string) =>
    apiRequest<{
      success: boolean;
      programs: Array<{ participant: ProgramParticipant; program: InstitutionProgram | null }>;
    }>("/student/programs/my", { token }),

  get: (token: string, id: string) =>
    apiRequest<{ success: boolean; program: InstitutionProgram; participant: ProgramParticipant | null }>(
      `/student/programs/${id}`,
      { token },
    ),

  register: (token: string, id: string) =>
    apiRequest<{ success: boolean; participant: ProgramParticipant }>(
      `/student/programs/${id}/register`,
      { method: "POST", token },
    ),

  getDashboard: (token: string, id: string) =>
    apiRequest<{ success: boolean; dashboard: Record<string, unknown> }>(
      `/student/programs/${id}/dashboard`,
      { token },
    ),

  getAiInsights: (token: string, id: string, intent: string) =>
    apiRequest<{ success: boolean; insight: Record<string, unknown> }>(
      `/student/programs/${id}/ai/insights`,
      { method: "POST", body: { intent }, token },
    ),
};
