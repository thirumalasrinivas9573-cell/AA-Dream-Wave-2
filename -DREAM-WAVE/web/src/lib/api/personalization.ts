import { apiRequest } from "@/lib/api/client";

function opts(token: string) {
  return { token };
}

export interface ContextSignal {
  key?: string;
  value?: string;
  source?: string;
  priority?: string;
  layer?: string;
}

export interface PersonalizationRecommendation {
  key?: string;
  title?: string;
  type?: string;
  nextStep?: string;
  href?: string;
  priority?: string;
  explanation?: string[];
  reason?: string;
}

export interface NextBestAction {
  id: string;
  title: string;
  reason: string;
  href: string;
  priority: string;
  source?: string;
  deadline?: string | null;
}

export interface PersonalizedHome {
  greeting: string;
  priority: NextBestAction | null;
  forYou: {
    opportunities: Array<{ title?: string; href?: string; explanation?: string[] }>;
    recommendations: PersonalizationRecommendation[];
  };
  roadmap: { next?: string; source?: string } | null;
  recentProgress: { state?: string; readiness?: string; source?: string } | null;
  copilotPrompt: string;
  transparency: { basedOn: string[] };
}

export interface PrivacyCenterData {
  dataUsed: Array<{ id: string; label: string; enabled: boolean; source: string }>;
  memoryCount: number;
  temporaryContextCount: number;
  feedbackCount: number;
  notificationPreferences: Record<string, unknown>;
  recommendationCategories: Record<string, boolean>;
  controls: Record<string, boolean>;
}

export const personalizationApi = {
  getContext: (token: string) =>
    apiRequest<{ success: boolean; context: Record<string, unknown> }>(
      "/personalization/context",
      opts(token),
    ),

  getHome: (token: string) =>
    apiRequest<{ success: boolean; home: PersonalizedHome }>(
      "/personalization/home",
      opts(token),
    ),

  getDashboard: (token: string) =>
    apiRequest<{ success: boolean; dashboard: Record<string, unknown> }>(
      "/personalization/dashboard",
      opts(token),
    ),

  getNextActions: (token: string) =>
    apiRequest<{ success: boolean; actions: NextBestAction[] }>(
      "/personalization/next-actions",
      opts(token),
    ),

  getPrivacyCenter: (token: string) =>
    apiRequest<{ success: boolean; privacy: PrivacyCenterData }>(
      "/personalization/privacy-center",
      opts(token),
    ),

  getPreferences: (token: string) =>
    apiRequest<{ success: boolean; preferences: Record<string, unknown> }>(
      "/personalization/preferences",
      opts(token),
    ),

  updatePreferences: (token: string, body: Record<string, unknown>) =>
    apiRequest<{ success: boolean; preferences: Record<string, unknown> }>(
      "/personalization/preferences",
      { ...opts(token), method: "PUT", body },
    ),

  setSessionContext: (token: string, body: Record<string, unknown>) =>
    apiRequest<{ success: boolean; sessionContext: Record<string, unknown> }>(
      "/personalization/session-context",
      { ...opts(token), method: "POST", body },
    ),

  recordFeedback: (
    token: string,
    body: { recommendationKey: string; recommendationType?: string; feedback: string },
  ) =>
    apiRequest<{ success: boolean; feedback: Record<string, unknown> }>(
      "/personalization/feedback",
      { ...opts(token), method: "POST", body },
    ),

  memoryConsent: (token: string, body: { action: string; text?: string; key?: string }) =>
    apiRequest<{ success: boolean; stored?: boolean; action?: string }>(
      "/personalization/memory-consent",
      { ...opts(token), method: "POST", body },
    ),
};
