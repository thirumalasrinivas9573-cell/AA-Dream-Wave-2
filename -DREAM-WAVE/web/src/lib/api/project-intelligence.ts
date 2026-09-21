import { apiRequest } from "@/lib/api/client";

function opts(token: string) {
  return { token };
}

export interface ProjectRecommendation {
  title: string;
  skill: string;
  objective: string;
  why: string;
  skillsDemonstrated: string[];
  expectedEvidence: string[];
  difficulty: string;
  priority?: string;
  disclaimer?: string;
}

export interface PortfolioProject {
  _id: string;
  title: string;
  description?: string;
  status: string;
  difficulty: string;
  skills: string[];
  technologies: string[];
  progress: number;
  health?: string;
  problemStatement?: string;
  objective?: string;
  milestones?: Array<{ milestoneId: string; title: string; status: string }>;
  evidence?: Array<{ type: string; strength: string; title: string }>;
  architecture?: Record<string, string>;
}

export interface ProjectDashboard {
  activeProject: {
    id: string;
    title: string;
    status: string;
    progress: number;
    health: string;
    currentMilestone?: string;
    skills: string[];
    evidence: string[];
  } | null;
  projects: Array<{ id: string; title: string; status: string; progress: number }>;
  recommendations: ProjectRecommendation[];
  careerGoal: string;
  coachPrompt: string;
  currentTasks: Array<{ id: string; title: string; completed: boolean }>;
}

export const projectIntelligenceApi = {
  dashboard: (token: string) =>
    apiRequest<{ success: boolean; dashboard: ProjectDashboard }>("/projects/dashboard", opts(token)),

  portfolio: (token: string) =>
    apiRequest<{ success: boolean; portfolio: Record<string, unknown> }>("/projects/portfolio", opts(token)),

  recommendations: (token: string, body?: { targetRole?: string; limit?: number }) =>
    apiRequest<{ success: boolean; recommendations: ProjectRecommendation[] }>(
      "/projects/recommendations",
      { ...opts(token), method: "POST", body: body ?? {} },
    ),

  templates: (token: string) =>
    apiRequest<{ success: boolean; templates: unknown[] }>("/projects/templates", opts(token)),

  build: (token: string, idea: string, options?: { difficulty?: string; scope?: string }) =>
    apiRequest<{ success: boolean; project: PortfolioProject }>(
      "/projects/build",
      { ...opts(token), method: "POST", body: { idea, ...options } },
    ),

  list: (token: string) =>
    apiRequest<{ success: boolean; items: PortfolioProject[] }>("/projects", opts(token)),

  get: (token: string, id: string) =>
    apiRequest<{ success: boolean; project: PortfolioProject }>(`/projects/${id}`, opts(token)),

  update: (token: string, id: string, body: Record<string, unknown>) =>
    apiRequest<{ success: boolean; project: PortfolioProject }>(
      `/projects/${id}`,
      { ...opts(token), method: "PATCH", body },
    ),

  addEvidence: (token: string, id: string, body: Record<string, unknown>) =>
    apiRequest<{ success: boolean; project: PortfolioProject }>(
      `/projects/${id}/evidence`,
      { ...opts(token), method: "POST", body },
    ),

  review: (token: string, id: string) =>
    apiRequest<{ success: boolean; review: Record<string, unknown> }>(
      `/projects/${id}/review`,
      { ...opts(token), method: "POST" },
    ),

  readme: (token: string, id: string) =>
    apiRequest<{ success: boolean; readme: string; aiGenerated: boolean }>(
      `/projects/${id}/readme`,
      { ...opts(token), method: "POST" },
    ),

  coachChat: (token: string, id: string, question: string) =>
    apiRequest<{ success: boolean; answer: string; disclaimer: string }>(
      `/projects/${id}/coach/chat`,
      { ...opts(token), method: "POST", body: { question } },
    ),

  multiAgentPlan: (token: string, careerGoal?: string) =>
    apiRequest<{ success: boolean; plan: Record<string, unknown> }>(
      "/projects/plan/multi-agent",
      { ...opts(token), method: "POST", body: careerGoal ? { careerGoal } : {} },
    ),
};
