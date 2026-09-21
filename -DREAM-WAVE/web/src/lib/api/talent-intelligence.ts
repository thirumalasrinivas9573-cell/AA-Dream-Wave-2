import { apiRequest } from "@/lib/api/client";
import type {
  CareerIntelligence,
  CompanyTalentIntelligence,
  InstitutionPlacementIntelligence,
  ReadinessView,
  TalentAiInsight,
  TalentProfile,
} from "@/types/talent-intelligence";

const STUDENT = "/student/talent";
const COMPANY = "/company/talent";
const INSTITUTION = "/institution/talent-intelligence";

export const talentIntelligenceApi = {
  getCareerIntelligence: (token: string) =>
    apiRequest<{ success: boolean; intelligence: CareerIntelligence }>(`${STUDENT}/career`, { token }),

  getTalentProfile: (token: string) =>
    apiRequest<{ success: boolean; profile: TalentProfile }>(`${STUDENT}/profile`, { token }),

  getReadiness: (token: string) =>
    apiRequest<{ success: boolean; readiness: ReadinessView }>(`${STUDENT}/readiness`, { token }),

  getSkillGaps: (token: string, params?: Record<string, string | undefined>) => {
    const qs = new URLSearchParams();
    if (params) for (const [k, v] of Object.entries(params)) if (v) qs.set(k, v);
    const q = qs.toString();
    return apiRequest<{ success: boolean; gaps: Record<string, unknown> }>(
      `${STUDENT}/gaps${q ? `?${q}` : ""}`,
      { token },
    );
  },

  getPipeline: (token: string) =>
    apiRequest<{ success: boolean; pipeline: CareerIntelligence["pipeline"] }>(`${STUDENT}/pipeline`, { token }),

  getRecommendations: (token: string) =>
    apiRequest<{
      success: boolean;
      learning: { recommendations: CareerIntelligence["recommendations"]["learning"] };
      projects: { recommendations: CareerIntelligence["recommendations"]["projects"] };
      programs: { recommendations: CareerIntelligence["recommendations"]["programs"] };
    }>(`${STUDENT}/recommendations`, { token }),

  getAiIntents: (token: string) =>
    apiRequest<{ success: boolean; intents: string[]; multiAgentIntents: string[] }>(
      `${STUDENT}/ai/intents`,
      { token },
    ),

  getAiInsight: (token: string, intent: string, body?: Record<string, unknown>) =>
    apiRequest<{ success: boolean; insight: TalentAiInsight; source: string }>(
      `${STUDENT}/ai/insights`,
      { method: "POST", body: { intent, ...body }, token },
    ),

  runMultiAgent: (token: string, intent: string) =>
    apiRequest<{ success: boolean; synthesis: string; specialists: Record<string, { observation?: string }> }>(
      `${STUDENT}/ai/multi-agent`,
      { method: "POST", body: { intent }, token },
    ),

  getCompanyIntelligence: (token: string) =>
    apiRequest<{ success: boolean; intelligence: CompanyTalentIntelligence }>(
      `${COMPANY}/intelligence`,
      { token },
    ),

  getCompanyAiInsight: (token: string, intent: string) =>
    apiRequest<{ success: boolean; insight: TalentAiInsight }>(
      `${COMPANY}/ai/insights`,
      { method: "POST", body: { intent }, token },
    ),

  getInstitutionIntelligence: (token: string) =>
    apiRequest<{ success: boolean; intelligence: InstitutionPlacementIntelligence }>(
      `${INSTITUTION}/intelligence`,
      { token },
    ),

  getInstitutionAiInsight: (token: string, intent: string) =>
    apiRequest<{ success: boolean; insight: TalentAiInsight }>(
      `${INSTITUTION}/ai/insights`,
      { method: "POST", body: { intent }, token },
    ),
};
