/** Institution Intelligence Command Center — Prompt 10 */

export type InstitutionSignal = {
  category: string;
  severity: "info" | "attention" | "high";
  title: string;
  trigger: string;
  supportingRecords: string;
  timePeriod: string;
  suggestedAction: string;
  actionType: string;
  domain?: string;
  detail?: string;
};

/** @deprecated Use InstitutionSignal */
export type HealthSignal = InstitutionSignal;

export type ExecutiveAction = {
  priority: "high" | "medium" | "low";
  domain: string;
  title: string;
  rationale: string;
  actionType: string;
  route: string;
  source: "signal" | "rule";
};

/** @deprecated Use ExecutiveAction */
export type ExecutiveRecommendation = ExecutiveAction;

export type ExecutiveInsight = {
  category: string;
  title: string;
  whatHappened: string;
  whyItMatters: string;
  supportingData: string;
  suggestedActions: string[];
  actionType: string;
  timePeriod: string;
};

export type ComparisonMetric = {
  label: string;
  current: number;
  previous: number;
  absoluteChange: number;
  percentageChange: number;
};

export type IndustryIntelligence = {
  activeIndustryPartners: number;
  companyCollaborations: number;
  recruitmentPartners: number;
  internshipPartners: number;
  researchPartners: number;
  pendingPartnerInvitations: number;
  campusRecruitmentDrives: number;
  internshipOpportunities: number;
  hiringOrganizations: number;
  openJobs: number;
  applicationsSubmitted: number;
  studentsPlaced: number;
  applicationToPlacementRate: number;
  offerAcceptanceRate: number;
  byDepartment: Record<string, number>;
  byCompany: Record<string, number>;
  byApplicationStage: Record<string, number>;
  industryEngagementTrend: {
    recentApplications: number;
    activeOpportunities: number;
    activePartnerships: number;
  };
  hasData: boolean;
};

export type QualityIntelligence = {
  accreditationReadiness: number;
  qualityEvidenceCoverage: number;
  certificateCoverage: number;
  profileCompleteness: number;
  pendingQualityActions: number;
  missingStudentDocuments: number;
  pendingVerifications: number;
  incompleteProfiles: number;
  partnershipDocuments: number;
  activePartnershipDocuments: number;
  expiringPartnershipDocuments: number;
  expiredPartnershipDocuments: number;
  departmentCompliance: Record<string, number>;
  continuousImprovementActivities: number;
  hasData: boolean;
};

export type ResearchIntelligence = {
  activeResearchProjects: number;
  totalResearchProjects: number;
  completedProjects: number;
  publications: number;
  researchCollaborations: number;
  innovationIdeas: number;
  pendingIdeas: number;
  startupIncubation: number;
  activeStartups: number;
  fundingActivities: number;
  fundingRecords: number;
  mentorParticipation: number;
  mentorSessions: number;
  startupProgress: Record<string, number>;
  researchDomains: Record<string, number>;
  facultyParticipation: number;
  studentParticipation: number;
  eventParticipation: number;
  hasData: boolean;
};

export type OutcomeIntelligence = {
  studentSuccess: Record<string, number | string>;
  placementOutcomes: Record<string, number>;
  internshipCompletion: Record<string, number>;
  researchOutput: Record<string, number>;
  startupGrowth: Record<string, number>;
  industryParticipation: Record<string, number>;
  alumniEngagement: Record<string, number>;
  hasData: boolean;
};

export type CopilotInsight = {
  type: string;
  title: string;
  points: string[];
};

export type CommandCenterExecutive = {
  healthScore: number;
  totalStudents: number;
  activeStudents: number;
  placedStudents: number;
  placementEligible: number;
  placementRate: number;
  avgCgpa: number;
  avgAttendance: number;
  activePartnerships: number;
  totalAlumni: number;
  verifiedAlumni: number;
  totalResearchProjects: number;
  totalPublications: number;
  startupRegistrations: number;
  activeStartups: number;
  totalFundingAmount: number;
  eventRegistrations: number;
};

export type CommandCenterFilterOptions = {
  departments: string[];
  academicYears: string[];
  semesters: string[];
  batches: string[];
};

export type CommandCenterOverview = {
  generatedAt: string;
  filters: Record<string, string | undefined>;
  timeFilter: {
    period?: string;
    periodLabel: string;
    academicYear?: string;
    semester?: string;
    dateFrom?: string;
    dateTo?: string;
  };
  filterOptions: CommandCenterFilterOptions;
  executive: CommandCenterExecutive;
  industryIntelligence: IndustryIntelligence;
  researchIntelligence: ResearchIntelligence;
  qualityIntelligence: QualityIntelligence;
  outcomeIntelligence: OutcomeIntelligence;
  comparisons: ComparisonMetric[];
  modules: {
    students: import("@/lib/api/institution-analytics").InstitutionAnalytics;
    placement: import("@/lib/api/institution-placements").PlacementAnalytics;
    research: import("@/types/research-management").InnovationAnalytics;
    researchStats: Record<string, unknown>;
    alumni: import("@/types/alumni-management").AlumniAnalytics;
    engagement: import("@/types/alumni-management").EngagementAnalytics;
    incubation: Record<string, unknown>;
    industry: IndustryIntelligence;
  };
  signals: InstitutionSignal[];
  healthSignals: InstitutionSignal[];
  executiveInsights: ExecutiveInsight[];
  actions: ExecutiveAction[];
  recommendations: ExecutiveAction[];
  copilotInsights: CopilotInsight[];
  moduleAvailability: Record<string, boolean>;
  hasData: boolean;
};

export const TIME_PERIOD_OPTIONS = [
  { value: "all", label: "All time" },
  { value: "last30days", label: "Last 30 days" },
  { value: "last90days", label: "Last 90 days" },
  { value: "currentAcademicYear", label: "Current academic year" },
  { value: "currentSemester", label: "Current semester" },
  { value: "custom", label: "Custom range" },
] as const;

export type StrategicKPI = {
  id: string;
  category: string;
  label: string;
  value: number;
  unit: string;
  previousValue?: number;
  absoluteChange?: number;
  percentageChange?: number;
};

export type DepartmentPerformance = {
  enrolled: number;
  placed: number;
  applications: number;
  placementRate: number;
};

export type ExecutiveAnalytics = {
  generatedAt: string;
  timeFilter: CommandCenterOverview["timeFilter"];
  filterOptions: CommandCenterFilterOptions;
  overallInstitutionalPerformance: Record<string, number>;
  academicPerformance: Record<string, unknown>;
  studentSuccessMetrics: Record<string, number | string>;
  facultyPerformance: Record<string, number>;
  placementStatistics: Record<string, unknown>;
  internshipStatistics: Record<string, number>;
  industryEngagement: IndustryIntelligence;
  researchProductivity: Record<string, number>;
  innovationPerformance: Record<string, number>;
  startupGrowth: Record<string, number>;
  alumniEngagement: Record<string, number>;
  institutionalHealthScore: number;
  departmentWisePerformance: Record<string, DepartmentPerformance>;
  strategicKPIs: StrategicKPI[];
  qualityIntelligence: QualityIntelligence;
  comparisons: ComparisonMetric[];
  signals: InstitutionSignal[];
  hasData: boolean;
};

export type ExecutiveReportPreview = {
  type: string;
  header: string[];
  rows: string[][];
  total: number;
  page: number;
  limit: number;
  pageCount: number;
};

export type ExecutiveAuditEntry = {
  _id: string;
  action: string;
  actorName?: string;
  description?: string;
  createdAt?: string;
};
