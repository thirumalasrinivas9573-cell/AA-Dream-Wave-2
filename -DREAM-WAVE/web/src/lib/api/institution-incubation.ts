import { apiRequest } from "@/lib/api/client";
import type {
  CollaborationItem,
  FundingRecord,
  IncubationStats,
  InnovationEvent,
  InvestorProfile,
  MentorProfile,
  MentorshipSession,
  StartupProfile,
} from "@/types/incubation-management";

function opts(token: string) {
  return { token };
}

function qs(params?: Record<string, string | number | undefined>) {
  const search = new URLSearchParams();
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== "" && v !== "all") search.set(k, String(v));
    }
  }
  const q = search.toString();
  return q ? `?${q}` : "";
}

export const institutionIncubationApi = {
  getMeta: (token: string) =>
    apiRequest<{ success: boolean }>("/institution/incubation/meta", opts(token)),

  getStats: (token: string) =>
    apiRequest<{ success: boolean; stats: IncubationStats }>(
      "/institution/incubation/stats",
      opts(token),
    ),

  getWorkspace: (token: string) =>
    apiRequest<{ success: boolean; workspace: { stats: IncubationStats; recentStartups: StartupProfile[] } }>(
      "/institution/incubation/workspace",
      opts(token),
    ),

  listStartups: (token: string, params?: Record<string, string | undefined>) =>
    apiRequest<{ success: boolean; startups: StartupProfile[] }>(
      `/institution/incubation/startups${qs(params)}`,
      opts(token),
    ),

  createStartup: (token: string, body: Record<string, unknown>) =>
    apiRequest<{ success: boolean; startup: StartupProfile }>(
      "/institution/incubation/startups",
      { method: "POST", body, token },
    ),

  updateStartup: (token: string, id: string, body: Record<string, unknown>) =>
    apiRequest<{ success: boolean; startup: StartupProfile }>(
      `/institution/incubation/startups/${id}`,
      { method: "PATCH", body, token },
    ),

  advanceIncubation: (token: string, startupId: string, stage: string) =>
    apiRequest(
      `/institution/incubation/startups/${startupId}/incubation/advance`,
      { method: "POST", body: { stage }, token },
    ),

  assignMentor: (token: string, startupId: string, mentorId: string) =>
    apiRequest(
      `/institution/incubation/startups/${startupId}/mentors`,
      { method: "POST", body: { mentorId }, token },
    ),

  listMentors: (token: string, params?: Record<string, string | undefined>) =>
    apiRequest<{ success: boolean; mentors: MentorProfile[] }>(
      `/institution/incubation/mentors${qs(params)}`,
      opts(token),
    ),

  createMentor: (token: string, body: Record<string, unknown>) =>
    apiRequest<{ success: boolean; mentor: MentorProfile }>(
      "/institution/incubation/mentors",
      { method: "POST", body, token },
    ),

  listSessions: (token: string, params?: Record<string, string | undefined>) =>
    apiRequest<{ success: boolean; sessions: MentorshipSession[] }>(
      `/institution/incubation/sessions${qs(params)}`,
      opts(token),
    ),

  createSession: (token: string, body: Record<string, unknown>) =>
    apiRequest<{ success: boolean; session: MentorshipSession }>(
      "/institution/incubation/sessions",
      { method: "POST", body, token },
    ),

  completeSession: (token: string, id: string, body: Record<string, unknown>) =>
    apiRequest(
      `/institution/incubation/sessions/${id}/complete`,
      { method: "POST", body, token },
    ),

  listFunding: (token: string, params?: Record<string, string | undefined>) =>
    apiRequest<{ success: boolean; funding: FundingRecord[] }>(
      `/institution/incubation/funding${qs(params)}`,
      opts(token),
    ),

  createFunding: (token: string, body: Record<string, unknown>) =>
    apiRequest<{ success: boolean; funding: FundingRecord }>(
      "/institution/incubation/funding",
      { method: "POST", body, token },
    ),

  listInvestors: (token: string, params?: Record<string, string | undefined>) =>
    apiRequest<{ success: boolean; investors: InvestorProfile[] }>(
      `/institution/incubation/investors${qs(params)}`,
      opts(token),
    ),

  createInvestor: (token: string, body: Record<string, unknown>) =>
    apiRequest<{ success: boolean; investor: InvestorProfile }>(
      "/institution/incubation/investors",
      { method: "POST", body, token },
    ),

  listEvents: (token: string, params?: Record<string, string | undefined>) =>
    apiRequest<{ success: boolean; events: InnovationEvent[] }>(
      `/institution/incubation/events${qs(params)}`,
      opts(token),
    ),

  createEvent: (token: string, body: Record<string, unknown>) =>
    apiRequest<{ success: boolean; event: InnovationEvent }>(
      "/institution/incubation/events",
      { method: "POST", body, token },
    ),

  publishEvent: (token: string, id: string) =>
    apiRequest(`/institution/incubation/events/${id}/publish`, { method: "POST", token }),

  registerForEvent: (token: string, id: string) =>
    apiRequest(`/institution/incubation/events/${id}/register`, { method: "POST", token }),

  listCollaboration: (token: string, params?: Record<string, string | undefined>) =>
    apiRequest<{ success: boolean; items: CollaborationItem[] }>(
      `/institution/incubation/collaboration${qs(params)}`,
      opts(token),
    ),

  createCollaboration: (token: string, body: Record<string, unknown>) =>
    apiRequest(
      "/institution/incubation/collaboration",
      { method: "POST", body, token },
    ),
};
