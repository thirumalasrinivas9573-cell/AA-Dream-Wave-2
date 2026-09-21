import { apiRequest } from "@/lib/api/client";

export type EligibilityCheck = {
  category: string;
  label: string;
  status: "pass" | "fail" | "unknown" | "needs_review";
  detail?: string;
};

export type OpportunityRecommendation = {
  opportunityId?: string;
  recommendation: "recommended" | "review" | "not_recommended";
  signals: string[];
  eligibility: {
    result: "ELIGIBLE" | "NEEDS_REVIEW" | "NOT_ELIGIBLE";
    checks: EligibilityCheck[];
  };
  explainableScore?: {
    skillCoverage: number;
    eligibilityResult: string;
  };
};

export type StudentOpportunity = {
  id: string;
  sourceType: "campus_opportunity" | "job" | "internship";
  title: string;
  companyName: string;
  location?: string;
  opportunityType: string;
  requiredSkills: string[];
  deadline?: string;
  status: string;
  recommendation: OpportunityRecommendation;
};

export type StudentApplication = {
  id: string;
  roleTitle: string;
  companyId?: string;
  opportunityType: string;
  stage: string;
  canonicalStage: string;
  appliedAt?: string;
  updatedAt?: string;
  campusOpportunityId?: string | null;
  jobId?: string | null;
  internshipId?: string | null;
};

export const studentRecruitmentApi = {
  getDashboard: (token: string) =>
    apiRequest<{
      success: boolean;
      dashboard: {
        hasInstitutionLink: boolean;
        applications: number;
        interviews: number;
        offers: number;
        recommendedOpportunities: StudentOpportunity[];
        openOpportunities: number;
        byStage: Record<string, number>;
      };
    }>("/student/recruitment/dashboard", { token }),

  browseOpportunities: (token: string, params?: Record<string, string | undefined>) => {
    const search = new URLSearchParams();
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v) search.set(k, v);
      }
    }
    const q = search.toString();
    return apiRequest<{
      success: boolean;
      items: StudentOpportunity[];
      total: number;
      page: number;
      pageCount: number;
      hasInstitutionLink: boolean;
    }>(`/student/recruitment/opportunities/browse${q ? `?${q}` : ""}`, { token });
  },

  getEligibility: (token: string, sourceType: string, opportunityId: string) =>
    apiRequest<{ success: boolean; eligibility: Record<string, unknown> }>(
      `/student/recruitment/opportunities/${sourceType}/${opportunityId}/eligibility`,
      { token },
    ),

  apply: (token: string, sourceType: string, opportunityId: string, body?: Record<string, unknown>) =>
    apiRequest<{ success: boolean; application: StudentApplication }>(
      `/student/recruitment/opportunities/${sourceType}/${opportunityId}/apply`,
      { token, method: "POST", body },
    ),

  listApplications: (token: string, params?: Record<string, string | undefined>) => {
    const search = new URLSearchParams();
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v) search.set(k, v);
      }
    }
    const q = search.toString();
    return apiRequest<{
      success: boolean;
      applications: StudentApplication[];
      total: number;
      page: number;
      pageCount: number;
    }>(`/student/recruitment/applications${q ? `?${q}` : ""}`, { token });
  },

  withdraw: (token: string, applicationId: string) =>
    apiRequest<{ success: boolean; application: StudentApplication }>(
      `/student/recruitment/applications/${applicationId}/withdraw`,
      { token, method: "POST" },
    ),
};
