export type AlignmentLevel =
  | "STRONG_ALIGNMENT"
  | "GOOD_ALIGNMENT"
  | "PARTIAL_ALIGNMENT"
  | "NEEDS_ATTENTION";

export type EcosystemScope = "institution" | "company";

export type EcosystemOverviewMetrics = {
  activePartnerships: number;
  pendingPartnershipRequests: number;
  activePrograms: number;
  programsWithRegistrationOpen: number;
  upcomingEvents: number;
  openJobs: number;
  openInternships: number;
  applicationsSubmitted: number;
  studentsPlaced: number;
};

export type EcosystemOverview = {
  generatedAt: string;
  scope: EcosystemScope;
  overview: EcosystemOverviewMetrics;
  partnerships: {
    active: Array<{ id?: string; name?: string; status?: string }>;
    counts?: Record<string, number>;
  };
  programs: { total: number; active: number; registrationOpen: number };
  upcomingEvents: Array<{
    _id?: string;
    title: string;
    opportunityType?: string;
    startDate?: string;
    status?: string;
  }>;
  opportunities: {
    jobs?: Array<{ _id?: string; title: string; status?: string }>;
    internships?: Array<{ _id?: string; title: string; status?: string }>;
    drives?: Array<{ _id?: string; title: string; status?: string }>;
  };
  placement?: {
    hasData: boolean;
    applicationsSubmitted?: number;
    studentsPlaced?: number;
    activeOpportunities?: number;
  } | null;
  recruitment?: {
    hasData: boolean;
    totalApplications?: number;
    activeRecruitments?: number;
  } | null;
};

export type SkillAlignment = {
  alignmentLevel: AlignmentLevel;
  skills: {
    demand?: Array<{ skill: string; count?: number }>;
    supply?: Array<{ skill: string; count?: number }>;
    overlap?: Array<{ skill: string }>;
    gaps?: Array<{ skill: string }>;
  };
  programAlignment: {
    programCount: number;
    programSkills: string[];
    overlapWithIndustryDemand: string[];
    potentialCurriculumGaps: string[];
  };
  explanation: { what: string; why: string; source: string };
};

export type EcosystemRecommendation = {
  id: string;
  type: string;
  title: string;
  what: string;
  why: string;
  source: string;
  priority: "high" | "medium" | "low";
  href?: string;
};

export type EcosystemAiInsight = {
  observation: string;
  evidence?: Record<string, unknown>;
  interpretation?: string;
  limitation?: string;
  nextAction?: string | null;
  what: string;
  why: string;
  source: string;
};

export type EcosystemSearchResult = {
  kind: string;
  id: string;
  title: string;
  subtitle?: string;
  status?: string;
  href?: string;
};

export type StudentEcosystemSummary = {
  hasInstitutionLink: boolean;
  note?: string;
  institutionId?: string;
  discoverablePrograms?: number;
  enrolledPrograms?: number;
  opportunityMatches?: number;
  recommendations?: Array<{
    type: string;
    title: string;
    what: string;
    why: string;
    source: string;
    href?: string;
  }>;
};

export type MultiAgentEcosystemResult = {
  intent: string;
  synthesis: string;
  specialists?: Record<string, { observation?: string; source?: string }>;
  recommendations?: EcosystemRecommendation[];
  mode?: string;
  source?: string;
};
