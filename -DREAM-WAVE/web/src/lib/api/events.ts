import { apiRequest } from "@/lib/api/client";

function opts(token: string) {
  return { token };
}

function qs(params?: Record<string, string | undefined>) {
  const search = new URLSearchParams();
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v) search.set(k, v);
    }
  }
  const q = search.toString();
  return q ? `?${q}` : "";
}

export type EventSource =
  | "campus_opportunity"
  | "innovation_event"
  | "alumni_event"
  | "research_opportunity";

export type UnifiedEvent = {
  id: string;
  source: EventSource;
  category: string;
  eventType: string;
  title: string;
  description: string;
  organizer: string;
  organizerType: string;
  startDate?: string;
  endDate?: string;
  registrationDeadline?: string;
  venue: string;
  city: string;
  country: string;
  mode: string;
  website: string;
  requiredSkills: string[];
  status: string;
  capacity: number | null;
  isHackathon: boolean;
  saved?: boolean;
  isRegistered?: boolean;
  registrationStatus?: string;
  registrationOpen?: boolean;
  registrationFull?: boolean;
  hackathonDetails?: {
    teamSizeMin?: number;
    teamSizeMax?: number;
    submissionDeadline?: string;
    problemStatements?: Array<{ title: string; description: string }>;
    themes?: string[];
    tracks?: string[];
    prizes?: Array<{ label: string; description: string }>;
    rules?: string;
  } | null;
};

export type EligibilityResult = {
  result: "ELIGIBLE" | "NOT_ELIGIBLE" | "NEEDS_REVIEW";
  checks: Array<{ category: string; label: string; status: string; detail?: string }>;
};

export type EventDetails = UnifiedEvent & {
  eligibility?: EligibilityResult;
  myTeam?: { id: string; name: string; role: string; memberCount?: number; status?: string } | null;
  registration?: { isRegistered: boolean; status: string };
};

export const eventsApi = {
  browse: (token: string, params?: Record<string, string | undefined>) =>
    apiRequest<{ success: boolean; items: UnifiedEvent[]; total: number; hasInstitutionLink: boolean }>(
      `/events/browse${qs(params)}`,
      opts(token),
    ),

  getDetails: (token: string, source: EventSource, id: string) =>
    apiRequest<{ success: boolean; event: EventDetails }>(
      `/events/${source}/${id}`,
      opts(token),
    ),

  getEligibility: (token: string, source: EventSource, id: string) =>
    apiRequest<{ success: boolean; eligibility: EligibilityResult }>(
      `/events/${source}/${id}/eligibility`,
      opts(token),
    ),

  register: (token: string, source: EventSource, id: string) =>
    apiRequest<{ success: boolean; registration: { isRegistered: boolean; status: string } }>(
      `/events/${source}/${id}/register`,
      { method: "POST", token },
    ),

  toggleSaved: (token: string, source: EventSource, id: string) =>
    apiRequest<{ success: boolean; saved: boolean }>(
      `/events/${source}/${id}/save`,
      { method: "POST", token },
    ),

  getMyEvents: (token: string) =>
    apiRequest<{
      success: boolean;
      dashboard: {
        upcoming: UnifiedEvent[];
        registered: UnifiedEvent[];
        past: UnifiedEvent[];
        saved: UnifiedEvent[];
        teamInvites: Array<{ teamId: string; teamName: string; source: string; sourceId: string }>;
        submissions: Array<{ id: string; title: string; status: string; source: string; sourceId: string }>;
      };
    }>("/events/my", opts(token)),

  createTeam: (token: string, source: EventSource, id: string, body: { name: string; track?: string; theme?: string }) =>
    apiRequest<{ success: boolean; team: { _id: string; name: string } }>(
      `/events/${source}/${id}/teams`,
      { method: "POST", token, body },
    ),

  getAiInsights: (token: string, intent: string, params?: Record<string, string | undefined>) =>
    apiRequest<{ success: boolean; insights: { insight: { observation: string; interpretation: string; limitation: string; evidence: Record<string, unknown> } } }>(
      "/events/ai/insights",
      { method: "POST", token, body: { intent, ...params } },
    ),
};

export const EVENT_CATEGORY_FILTERS = [
  { value: "", label: "All" },
  { value: "hackathon", label: "Hackathons" },
  { value: "workshop", label: "Workshops" },
  { value: "competition", label: "Competitions" },
  { value: "career_event", label: "Career events" },
  { value: "research_event", label: "Research" },
  { value: "webinar", label: "Webinars" },
] as const;
