export type InstitutionHealthState = "HEALTHY" | "ACTIVE" | "NEEDS_ATTENTION" | "INSUFFICIENT_DATA";

export type CampusCommandCenter = {
  generatedAt: string;
  institution: {
    name: string;
    type?: string;
    location?: string;
    departments: string[];
    programs: string[];
  };
  health: {
    state: InstitutionHealthState;
    indicators: string[];
    explanation: string;
  };
  campusOverview: {
    students: number;
    activeStudents: number;
    departments: number;
    programs: number;
    openOpportunities: number;
    activeCompanies: number;
    researchProjects: number | null;
    events: number;
    hasData: boolean;
  };
  studentIntelligence: {
    total: number;
    active: number;
    withProfiles: number;
    placementEligible: number;
    placementReady: number;
    placed: number;
    inPipeline: number;
    byDepartment: Record<string, number>;
    disclaimer: string;
  };
  readiness: {
    READY: number;
    NEAR_READY: number;
    DEVELOPING: number;
    INSUFFICIENT_DATA: number;
  };
  skillIntelligence: {
    topSkills: Array<{ skill: string; count: number }>;
    industryDemand: Array<{ skill: string; count: number; state: string }>;
    gaps: Array<{ skill: string; state: string; required: number }>;
    available: Array<{ skill: string; state: string }>;
    sourceNote: string;
    hasData: boolean;
  };
  curriculumAlignment: {
    level: string;
    explanation: string;
    overlap: Array<{ skill: string; count: number }>;
    gaps: Array<{ skill: string; count: number }>;
    ratio?: number;
  };
  placementCommandCenter: {
    overview: {
      eligible: number;
      applications: number;
      shortlisted: number;
      interviews: number;
      selections: number;
      offers: number;
      offersAccepted: number;
      placed: number;
    };
    pipeline: Record<string, number>;
    outcomes: {
      placed: number;
      selected: number;
      pending: number;
      offersPending: number;
      note: string;
    };
    analytics: {
      placementPercentage: number;
      byDepartment: Record<string, number>;
      byCompany: Record<string, number>;
      hasData: boolean;
    };
  };
  companyIntelligence: {
    activePartnerships: number;
    totalPartnerships: number;
    companiesWithApplications: number;
    engagement: { active: number; note: string };
  };
  opportunityIntelligence: {
    open: number;
    closingSoon: number;
    upcomingDrives: number;
    closingItems: Array<{ id: string; title: string; deadline?: string }>;
    talentMatching: { strongMatches: number; note: string };
  };
  departmentIntelligence: Array<{
    name: string;
    studentCount: number;
    placedCount: number;
    placementEligible: number;
    avgCgpa: number | null;
  }>;
  programIntelligence: {
    programs: Array<{ name: string; studentCount: number; placedCount: number }>;
    hasData: boolean;
    incompleteCoverage?: boolean;
  };
  researchIntelligence: {
    totalProjects: number | null;
    activeProjects: number | null;
    publications: number | null;
    hasData: boolean;
    note: string;
  };
  partnershipIntelligence: {
    active: number;
    total: number;
    hasData: boolean;
  };
  alerts: Array<{
    id: string;
    priority: string;
    category: string;
    title: string;
    detail: string;
    actionRoute: string;
  }>;
  recommendations: {
    training: Array<{ type: string; skill?: string; recommendation: string; advisory: boolean }>;
    placement: Array<{ title: string; detail: string }>;
    studentSuccess: Array<{ category: string; message: string; language: string }>;
  };
  dailyBrief: {
    todaysDrives: number;
    applicationsClosing: number;
    interviewsToday: number;
    pendingActions: number;
    topSkillGap: string | null;
  };
  dataLimitations: string[];
  integrations: Record<string, string>;
  disclaimer: string;
};

export type WeeklyCampusReport = {
  title: string;
  generatedAt: string;
  dataPeriod: string;
  institution: string;
  keyMetrics: Record<string, number>;
  insights: string[];
  recommendations: Array<{ recommendation: string }>;
  dataLimitations: string[];
  focus: string[];
};
