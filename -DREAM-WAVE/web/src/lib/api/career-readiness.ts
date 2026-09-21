const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api";

async function crFetch<T>(
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

export interface ReadinessDimension {
  score: number | null;
  explanation: string;
  insufficientData?: boolean;
  state?: string;
}

export interface ReadinessDashboard {
  targetRole: string;
  readiness: Record<string, ReadinessDimension | { state: string; explanation: string }>;
  topGaps: string[];
  gapDetails: Array<{
    skill: string;
    level: string;
    what: string;
    why: string;
    howToImprove: string;
  }>;
  strengths: Array<{ skill: string; level: string; evidence: string }>;
  nextActions: Array<{ order: number; action: string; reason: string }>;
  coachPrompt: string;
  disclaimer: string;
}

export interface InterviewQuestion {
  questionId: string;
  text: string;
  topic: string;
  skill?: string;
  source: string;
  sourceLabel: string;
}

export interface InterviewSession {
  _id: string;
  targetRole: string;
  mode: string;
  difficulty: string;
  status: string;
  questionCount: number;
  questions: InterviewQuestion[];
  answers: Array<{
    questionId: string;
    feedback: {
      strengths: string[];
      missing: string[];
      improve: string[];
      modelStructure: string;
    };
    scores: Record<string, number>;
    flags: string[];
    followUp: string;
  }>;
  report?: {
    summary: string;
    strengths: string[];
    weakAreas: string[];
    skillsToImprove: string[];
    recommendedPractice: string[];
    nextLevel: string;
  };
}

export interface AnswerEvaluation {
  strengths: string[];
  missing: string[];
  improve: string[];
  modelStructure: string;
  scores: Record<string, number>;
  flags: string[];
  followUp: string;
}

export const careerReadinessApi = {
  dashboard: (token: string, targetRole?: string) =>
    crFetch<{ dashboard: ReadinessDashboard }>(
      `/career/readiness/dashboard${targetRole ? `?targetRole=${encodeURIComponent(targetRole)}` : ""}`,
      token,
    ),

  startInterview: (
    token: string,
    body: {
      targetRole?: string;
      mode?: string;
      difficulty?: string;
      questionCount?: number;
      topics?: string[];
    },
  ) =>
    crFetch<{ session: InterviewSession; currentQuestion: InterviewQuestion }>(
      "/career/readiness/interview/start",
      token,
      { method: "POST", body: JSON.stringify(body) },
    ),

  submitAnswer: (
    token: string,
    sessionId: string,
    body: { questionId: string; answerText: string },
  ) =>
    crFetch<{
      evaluation: AnswerEvaluation;
      nextQuestion: InterviewQuestion | null;
      sessionComplete: boolean;
      report: InterviewSession["report"] | null;
      recommendations: Record<string, unknown[]> | null;
    }>(`/career/readiness/interview/${sessionId}/answer`, token, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  history: (token: string) =>
    crFetch<{ history: Array<{
      sessionId: string;
      targetRole: string;
      mode: string;
      difficulty: string;
      status: string;
      reportSummary?: string;
      createdAt: string;
      completedAt?: string;
    }> }>("/career/readiness/interview/history", token),

  coach: (token: string, question: string) =>
    crFetch<{ answer: string; disclaimer: string }>(
      "/career/readiness/coach",
      token,
      { method: "POST", body: JSON.stringify({ question }) },
    ),

  actionPlan: (token: string) =>
    crFetch<{ plan: Array<{ week: number; focus: string; actions: string[] }> }>(
      "/career/readiness/action-plan",
      token,
    ),

  report: (token: string) =>
    crFetch<{ report: Record<string, unknown> }>("/career/readiness/report", token),
};
