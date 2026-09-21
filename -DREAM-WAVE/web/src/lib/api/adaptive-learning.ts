import { apiRequest } from "@/lib/api/client";

function opts(token: string) {
  return { token };
}

export interface SkillProgress {
  skill: string;
  state: string;
  evidenceCount: number;
  progressPct: number;
  nextStep: string;
}

export interface SkillGap {
  skill: string;
  priority: string;
  status: string;
  what: string;
  why: string;
  whereRequired: string;
  learnNext: string;
}

export interface LearningDashboard {
  currentGoal: string;
  targetRole: string;
  skillProgress: SkillProgress[];
  gaps: SkillGap[];
  strengths: Array<{ skill: string; state: string; evidenceCount: number }>;
  today: string[];
  next: string[];
  plan: { id: string; title: string; status: string; version: number; itemCount: number } | null;
  weakAreas: Array<{ skill: string; topic: string; attemptCount?: number }>;
  revisionQueue: Array<{ skill: string; topic: string; reason: string }>;
  studyCoachPrompt: string;
}

export interface StudySession {
  _id: string;
  objective: string;
  skillName: string;
  topic: string;
  teachingMode: string;
  status: string;
  resourceTitle?: string;
}

export interface LearningPlan {
  _id: string;
  title: string;
  goal: string;
  targetRole: string;
  status: string;
  version: number;
  items: Array<{
    _id?: string;
    order: number;
    skillName: string;
    topic: string;
    objective: string;
    practiceType: string;
    priority: string;
    completed: boolean;
    reason: string;
  }>;
  todayFocus: string[];
  nextFocus: string[];
}

export const adaptiveLearningApi = {
  dashboard: (token: string) =>
    apiRequest<{ success: boolean; dashboard: LearningDashboard }>(
      "/learning/dashboard",
      opts(token),
    ),

  skillGaps: (token: string, targetRole?: string) =>
    apiRequest<{ success: boolean; analysis: { gaps: SkillGap[]; strengths: unknown[]; targetRole: string } }>(
      `/learning/gaps${targetRole ? `?targetRole=${encodeURIComponent(targetRole)}` : ""}`,
      opts(token),
    ),

  roadmap: (token: string) =>
    apiRequest<{ success: boolean; roadmap: Record<string, unknown> }>(
      "/learning/roadmap",
      opts(token),
    ),

  generatePlan: (token: string, body: { targetRole?: string; goal?: string; availableMinutesPerDay?: number; deadline?: string }) =>
    apiRequest<{ success: boolean; plan: LearningPlan }>(
      "/learning/plan",
      { ...opts(token), method: "POST", body },
    ),

  resources: (token: string, skill?: string) =>
    apiRequest<{ success: boolean; resources: Array<{ title: string; type: string; href: string; explanation: string }> }>(
      `/learning/resources${skill ? `?skill=${encodeURIComponent(skill)}` : ""}`,
      opts(token),
    ),

  mastery: (token: string, skillName: string) =>
    apiRequest<{ success: boolean; mastery: SkillProgress; transparency: { status: string; evidence: string; remains: string; improve: string }; evidences: unknown[] }>(
      `/learning/mastery/${encodeURIComponent(skillName)}`,
      opts(token),
    ),

  startSession: (token: string, body: { skillName: string; topic?: string; objective?: string; teachingMode?: string }) =>
    apiRequest<{ success: boolean; session: StudySession }>(
      "/learning/sessions",
      { ...opts(token), method: "POST", body },
    ),

  updateSession: (token: string, id: string, body: { status?: string; teachingMode?: string }) =>
    apiRequest<{ success: boolean; session: StudySession }>(
      `/learning/sessions/${id}`,
      { ...opts(token), method: "PATCH", body },
    ),

  practice: (token: string, body: { skillName: string; topic?: string; count?: number }) =>
    apiRequest<{ success: boolean; questions: Array<{ questionId: string; questionText: string }> }>(
      "/learning/practice",
      { ...opts(token), method: "POST", body },
    ),

  submitAssessment: (token: string, body: { skillName: string; topic?: string; answers: Array<{ questionId: string; userAnswer: string }>; sessionId?: string }) =>
    apiRequest<{ success: boolean; score: number; passed: boolean; nextStep: string }>(
      "/learning/assessment/submit",
      { ...opts(token), method: "POST", body },
    ),

  coachChat: (token: string, body: { question: string; sessionId?: string; teachingMode?: string; resourceContext?: string }) =>
    apiRequest<{ success: boolean; answer: string; contentType: string; teachingMode: string }>(
      "/learning/coach/chat",
      { ...opts(token), method: "POST", body },
    ),

  updateProfile: (token: string, body: { targetRole?: string; currentGoal?: string }) =>
    apiRequest<{ success: boolean; profile: Record<string, unknown> }>(
      "/learning/profile",
      { ...opts(token), method: "PATCH", body },
    ),
};
