export type ReadinessState =
  | "READY"
  | "NEARLY_READY"
  | "PREPARING"
  | "NEEDS_ATTENTION"
  | "INSUFFICIENT_DATA";

export type MatchCategory =
  | "STRONG_MATCH"
  | "GOOD_MATCH"
  | "PARTIAL_MATCH"
  | "LOW_MATCH"
  | "INELIGIBLE"
  | "INSUFFICIENT_DATA";

export type SkillEvidenceEntry = {
  skill: string;
  evidenceLevel: string;
  sources: Array<{ type: string; title?: string | null }>;
};

export type TalentProfile = {
  hasInstitutionLink: boolean;
  note?: string;
  profile?: {
    name: string;
    department?: string;
    course?: string;
    batch?: string;
    cgpa?: number | null;
  };
  skills?: {
    verified: string[];
    shared: string[];
    programmingLanguages: string[];
  };
  evidenceGraph?: SkillEvidenceEntry[];
  evidenceSummary?: Record<string, number>;
  projects?: Array<{ title: string; technologies?: string[] }>;
  certifications?: Array<{ title: string }>;
  programParticipation?: number;
  careerGoal?: string;
};

export type ReadinessView = {
  state: ReadinessState;
  explanation: {
    what: string;
    why: string;
    strengths: string[];
    needsAttention: string[];
    source: string;
  };
};

export type OpportunityMatch = {
  id: string;
  source: string;
  title: string;
  matchCategory: MatchCategory;
  why: string[];
  evidence: string[];
  gaps: string[];
  nextStep?: string;
  href?: string;
};

export type PipelineItem = {
  applicationId: string;
  roleTitle?: string;
  stage?: string;
  companyName?: string;
  appliedAt?: string;
  assessment?: { status: string; score?: number | null };
  interview?: { status: string; scheduledAt?: string } | null;
  offer?: { status: string } | null;
};

export type CareerIntelligence = {
  generatedAt: string;
  talentProfile: TalentProfile;
  readiness: ReadinessView;
  skillGaps: {
    criticalGaps?: string[];
    explanation?: { what: string; why: string; source: string };
  };
  opportunities: {
    recommended: OpportunityMatch[];
    closingSoon?: unknown[];
    skillBuilding?: unknown[];
  };
  pipeline: {
    pipeline: PipelineItem[];
    totals: { applied: number; assessments: number; interviews: number; offers: number };
  };
  recommendations: {
    learning: Array<{ skill?: string; what: string; why: string; href?: string }>;
    projects: Array<{ skill?: string; what: string; why: string; href?: string }>;
    programs: Array<{ title: string; what: string; why: string; href?: string }>;
  };
  disclaimer?: string;
};

export type TalentAiInsight = {
  observation: string;
  what: string;
  why: string;
  evidence?: string[];
  gaps?: string[];
  nextStep?: string | null;
  source: string;
  limitation?: string;
  interpretation?: string;
};

export type CompanyTalentIntelligence = {
  scope: string;
  skillDemand: Array<{ skill: string; count?: number }>;
  recruitment: {
    totalApplications?: number;
    activeRecruitments?: number;
    funnel?: Record<string, number>;
  };
  talentPool: { count: number; candidates: unknown[] };
  openRoles: Array<{ id: string; title: string; requiredSkills: string[] }>;
  disclaimer?: string;
};

export type InstitutionPlacementIntelligence = {
  scope: string;
  placement: {
    hasData: boolean;
    applicationsSubmitted?: number;
    studentsPlaced?: number;
    activeOpportunities?: number;
  };
  industryDemand: Array<{ skill: string }>;
  skillGaps: Array<{ skill: string }>;
  talentPool: { total: number };
  readinessDistribution: Record<string, number>;
  disclaimer?: string;
};
