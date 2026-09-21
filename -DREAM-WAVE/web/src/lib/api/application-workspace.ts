const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api";

async function awFetch<T>(path: string, token: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || `Request failed (${res.status})`);
  return data as T;
}

export interface ApplicationWorkspaceSummary {
  workspaceId: string;
  status: string;
  health: string;
  opportunityTitle: string;
  organization: string;
  matchState: string;
  deadline?: string;
  nextAction?: string;
}

export interface ApplicationWorkspaceFull {
  workspace: ApplicationWorkspaceSummary;
  opportunity: Record<string, unknown>;
  match: { state: string; whyItMatches?: string[]; whatIsMissing?: string[] };
  readiness: { state: string; safeToApply: boolean };
  candidateProfile: {
    targetRole: string;
    skills: string[];
    projects: Array<{ title: string; projectId?: string }>;
    completeness: { level: string; missing: string[] };
    consistency: { consistent: boolean; flags: string[] };
  };
  checklist: Array<{ item: string; required: boolean; status: string; category: string }>;
  documents: Array<{ documentId: string; type: string; label: string; content?: string; versionStatus: string }>;
  selectedProjects: Array<{ title: string; reason: string }>;
  interviewPreparation: { topics: string[]; practicePath: string };
  timeline: Array<{ event: string; description: string; at: string }>;
  health: string;
  deadline: { daysRemaining: number | null; state: string };
  disclaimer: string;
}

export const applicationWorkspaceApi = {
  dashboard: (token: string) =>
    awFetch<{ dashboard: { activeApplications: ApplicationWorkspaceSummary[]; coachPrompt: string } }>(
      "/applications/workspace/dashboard",
      token,
    ),

  profile: (token: string) =>
    awFetch<{ profile: Record<string, unknown> }>("/applications/workspace/profile", token),

  start: (token: string, source: string, sourceId: string) =>
    awFetch<ApplicationWorkspaceFull>("/applications/workspace/start", token, {
      method: "POST",
      body: JSON.stringify({ source, sourceId }),
    }),

  get: (token: string, workspaceId: string) =>
    awFetch<ApplicationWorkspaceFull>(`/applications/workspace/${workspaceId}`, token),

  byOpportunity: (token: string, source: string, sourceId: string) =>
    awFetch<ApplicationWorkspaceFull>(`/applications/workspace/opportunity/${source}/${sourceId}`, token),

  preview: (token: string, workspaceId: string) =>
    awFetch<{ preview: Record<string, unknown>; finalReview: Record<string, unknown> }>(
      `/applications/workspace/${workspaceId}/preview`,
      token,
    ),

  submit: (token: string, workspaceId: string, confirmed = true) =>
    awFetch<{ submitted: boolean; submissionStatus: string }>(
      `/applications/workspace/${workspaceId}/submit`,
      token,
      { method: "POST", body: JSON.stringify({ confirmed }) },
    ),

  coverLetter: (token: string, workspaceId: string) =>
    awFetch<{ draft: string }>(`/applications/workspace/${workspaceId}/cover-letter`, token, {
      method: "POST",
    }),

  coach: (token: string, question: string, workspaceId?: string) =>
    awFetch<{ answer: string }>("/applications/workspace/coach", token, {
      method: "POST",
      body: JSON.stringify({ question, workspaceId }),
    }),
};
