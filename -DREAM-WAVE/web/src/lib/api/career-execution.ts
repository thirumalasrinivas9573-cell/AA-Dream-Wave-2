const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api";

async function exFetch<T>(
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

export interface PlanItem {
  taskId?: string;
  title: string;
  type?: string;
  priority: string;
  why: string;
  whyNow?: string;
  supports?: string;
  estimatedEffort?: string;
  proposed?: boolean;
  completed?: boolean;
}

export interface DailyPlan {
  planDate?: string;
  goal?: { id: string; title: string; targetRole?: string };
  targetRole?: string;
  topPriority?: PlanItem | null;
  highPriority?: PlanItem[];
  optional?: PlanItem[];
  items?: PlanItem[];
  blockers?: Array<{ type: string; blocker: string; whyItMatters: string; recommendedAction: string }>;
  focusBlocks?: Array<{ start: string; end: string; label: string }>;
  focusModeHref?: string;
  empty?: boolean;
  message?: string;
  disclaimer?: string;
}

export interface ExecutionDashboard {
  goal?: { id: string; title: string; progress?: number };
  targetRole?: string;
  strategy?: Array<{ action: string; why: string; evidence: string; expectedBenefit: string }>;
  milestones?: Array<{ key: string; title: string; status: string; type: string }>;
  currentMilestone?: { title: string; status: string } | null;
  executionPlan?: { id: string; version: number; status: string; riskLevel: string };
  daily?: DailyPlan;
  blockers?: DailyPlan["blockers"];
  progress?: { explanation: string; progressPercent: number };
  recovery?: unknown;
  empty?: boolean;
  disclaimer?: string;
}

export const careerExecutionApi = {
  dashboard: (token: string) =>
    exFetch<{ dashboard: ExecutionDashboard }>("/career/execution/dashboard", token),

  daily: (token: string, regenerate?: boolean) =>
    exFetch<{ daily: DailyPlan }>(
      `/career/execution/daily${regenerate ? "?regenerate=true" : ""}`,
      token,
    ),

  weekly: (token: string) =>
    exFetch<{ weekly: unknown }>("/career/execution/weekly", token),

  generatePlan: (token: string, goalId: string) =>
    exFetch<{ plan: { _id: string; status: string } }>("/career/execution/plan/generate", token, {
      method: "POST",
      body: JSON.stringify({ goalId }),
    }),

  acceptPlan: (token: string, planId: string) =>
    exFetch<{ plan: unknown }>(`/career/execution/plan/${planId}/accept`, token, {
      method: "POST",
    }),

  completeTask: (token: string, taskId: string) =>
    exFetch<{ task: { completed: boolean } }>(`/career/execution/tasks/${taskId}/complete`, token, {
      method: "POST",
    }),

  skipTask: (token: string, taskId: string) =>
    exFetch<unknown>(`/career/execution/tasks/${taskId}/skip`, token, { method: "POST" }),

  splitTask: (token: string, taskId: string) =>
    exFetch<{ subtasks: unknown[] }>(`/career/execution/tasks/${taskId}/split`, token, {
      method: "POST",
    }),

  copilot: (token: string, question: string) =>
    exFetch<{ answer: string; facts: unknown[]; recommendations: unknown[] }>(
      "/career/execution/copilot",
      token,
      { method: "POST", body: JSON.stringify({ question }) },
    ),

  replan: (token: string, reason?: string) =>
    exFetch<unknown>("/career/execution/replan", token, {
      method: "POST",
      body: JSON.stringify({ reason }),
    }),
};
