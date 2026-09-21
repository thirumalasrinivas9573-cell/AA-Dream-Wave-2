const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api";

async function ccFetch<T>(
  path: string,
  token: string,
  options: RequestInit = {},
): Promise<T> {
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
  if (!res.ok) {
    throw new Error(data.message || `Request failed (${res.status})`);
  }
  return data as T;
}

export interface CareerAction {
  type: string;
  action: string;
  why: string;
  expectedBenefit?: string;
  relatedGoal?: string | null;
  priority: string;
  href?: string;
  category?: string;
}

export interface CommandCenterHeader {
  greeting: string;
  careerGoal: string;
  targetRole: string;
  careerState: string;
  nextBestAction: CareerAction | null;
}

export interface FunnelStage {
  stage: string;
  status: string;
  nextAction: string | null;
}

export interface CommandCenter {
  generatedAt: string;
  header: CommandCenterHeader;
  whatChanged: { changes: Array<{ type: string; fact: string; impact: string }>; hasChanges: boolean };
  whatMatters: { priorities: Array<{ label: string; detail: string; kind: string }> };
  nextAction: { primary: CareerAction | null; actions: CareerAction[] };
  today: { tasks: Array<{ label: string; why: string; href?: string; priority?: string }> };
  careerSnapshot: {
    goal: string;
    targetRole: string;
    skills: Array<{ skill: string }>;
    skillGaps: Array<{ skill: string }>;
  };
  careerFunnel: FunnelStage[];
  careerProgress: { timeline: Array<{ event: string; description: string; at: string }> };
  emptyStates: { noGoal: boolean; noProjects: boolean; noApplications: boolean; noInterviews: boolean };
  execution?: {
    todaysPlan?: { topPriority?: { title: string; why: string }; items?: Array<{ title: string; why: string; priority?: string }> } | null;
    currentMilestone?: { title: string; status: string } | null;
    blockers?: Array<{ blocker: string; recommendedAction: string }>;
    focusModeHref?: string;
  };
  disclaimer: string;
}

export interface CopilotResponse {
  answer: string;
  facts: Array<{ text: string; source: string }>;
  recommendations: Array<{ text: string; why: string; category: string; href?: string }>;
  actions: Array<{ action: string; why: string; href?: string; dismissible: boolean }>;
}

export const careerCommandCenterApi = {
  dashboard: (token: string) =>
    ccFetch<{ commandCenter: CommandCenter }>("/career/command-center/dashboard", token),

  today: (token: string) =>
    ccFetch<{ today: { greeting: string; tasks: Array<{ label: string; why: string; href?: string }> } }>(
      "/career/command-center/today",
      token,
    ),

  copilot: (token: string, question: string) =>
    ccFetch<CopilotResponse>("/career/command-center/copilot", token, {
      method: "POST",
      body: JSON.stringify({ question }),
    }),

  report: (token: string) =>
    ccFetch<{ report: unknown }>("/career/command-center/report", token),

  scenario: (token: string, targetRole: string, label?: string) =>
    ccFetch<{ scenarioId: string; simulation: unknown }>("/career/command-center/scenario", token, {
      method: "POST",
      body: JSON.stringify({ targetRole, label }),
    }),
};
