/** Institution Research & Innovation — LASYA V2 Prompt 7 */

export const RESEARCH_PROJECT_STATUSES = [
  "proposed",
  "approved",
  "active",
  "on_hold",
  "completed",
  "archived",
] as const;

export const RESEARCH_OPPORTUNITY_TYPES = [
  "research_assistant",
  "innovation_challenge",
  "sponsored_project",
  "thesis_opportunity",
  "open_research_problem",
  "collaborative_program",
] as const;

export const IDEA_TYPES = [
  "startup_idea",
  "research_concept",
  "product_innovation",
  "social_impact",
  "technology_proposal",
] as const;

export type ResearchMember = {
  _id?: string;
  userId?: string | null;
  name: string;
  email?: string;
  memberType: "faculty" | "student" | "external" | "industry_expert";
  role?: string;
  responsibilities?: string;
  joinedAt?: string;
  contributions?: Array<{ date: string; description: string }>;
};

export type ResearchProjectHistory = {
  _id?: string;
  action: string;
  description?: string;
  actorName?: string;
  previousState?: string;
  newState?: string;
  at: string;
};

export type ResearchProject = {
  _id: string;
  id?: string;
  title: string;
  abstract?: string;
  researchArea?: string;
  category?: string;
  domain?: string;
  principalInvestigator?: {
    userId?: string | null;
    name?: string;
    email?: string;
    department?: string;
  };
  members?: ResearchMember[];
  objectives?: string[];
  timeline?: { startDate?: string | null; endDate?: string | null };
  budget?: number;
  fundingSource?: string;
  status: string;
  expectedOutcomes?: string[];
  outcomes?: Array<{ title: string; outcomeType: string; description?: string }>;
  tags?: string[];
  isConfidential?: boolean;
  history?: ResearchProjectHistory[];
  createdAt?: string;
  updatedAt?: string;
};

export type ResearchPublication = {
  _id: string;
  title: string;
  publicationType: string;
  authors?: string[];
  journalOrVenue?: string;
  year?: number | null;
  doi?: string;
  url?: string;
  abstract?: string;
  projectId?: string | null;
  createdAt?: string;
};

export type ResearchOpportunity = {
  _id: string;
  title: string;
  description?: string;
  opportunityType: string;
  researchArea?: string;
  domain?: string;
  department?: string;
  principalInvestigator?: { name?: string; email?: string };
  eligibility?: {
    departments?: string[];
    programs?: string[];
    minCgpa?: number | null;
    skills?: string[];
    notes?: string;
  };
  positions?: number;
  applicationDeadline?: string | null;
  status: string;
  publishedAt?: string | null;
  tags?: string[];
  createdAt?: string;
};

export type ResearchOpportunityApplication = {
  _id: string;
  opportunityId: string;
  applicantName: string;
  applicantEmail?: string;
  department?: string;
  coverLetter?: string;
  status: string;
  reviewNotes?: string;
  createdAt?: string;
};

export type InnovationIdea = {
  _id: string;
  title: string;
  ideaType: string;
  description?: string;
  problemStatement?: string;
  proposedSolution?: string;
  submitterName?: string;
  submitterRole?: string;
  tags?: string[];
  reviewStatus: string;
  reviewNotes?: string;
  attachments?: Array<{ name: string; url?: string }>;
  createdAt?: string;
};

export type ResearchStats = {
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  totalOpportunities: number;
  publishedOpportunities: number;
  totalApplications: number;
  totalIdeas: number;
  pendingIdeas: number;
  incubatingIdeas: number;
  totalPublications: number;
  byProjectStatus: Record<string, number>;
  byOpportunityType: Record<string, number>;
  byIdeaType: Record<string, number>;
  hasData: boolean;
};

export type ResearchWorkspace = {
  stats: ResearchStats;
  recentProjects: Array<{ _id: string; title: string; status: string; researchArea?: string; updatedAt?: string }>;
  recentIdeas: Array<{ _id: string; title: string; ideaType: string; reviewStatus: string; createdAt?: string }>;
  recentApplications: Array<{ id: string; applicantName: string; status: string; opportunityTitle: string; createdAt?: string }>;
};

export type Pagination = {
  total: number;
  page: number;
  limit: number;
  pageCount: number;
};

export const PROJECT_STATUS_LABELS: Record<string, string> = {
  proposed: "Proposed",
  approved: "Approved",
  active: "Active",
  on_hold: "On Hold",
  completed: "Completed",
  archived: "Archived",
};

export const OPPORTUNITY_TYPE_LABELS: Record<string, string> = {
  research_assistant: "Research Assistant",
  innovation_challenge: "Innovation Challenge",
  sponsored_project: "Sponsored Project",
  thesis_opportunity: "Thesis Opportunity",
  open_research_problem: "Open Research Problem",
  collaborative_program: "Collaborative Program",
};

export const IDEA_TYPE_LABELS: Record<string, string> = {
  startup_idea: "Startup Idea",
  research_concept: "Research Concept",
  product_innovation: "Product Innovation",
  social_impact: "Social Impact",
  technology_proposal: "Technology Proposal",
};

export const IDEA_STATUS_LABELS: Record<string, string> = {
  submitted: "Submitted",
  under_review: "Under Review",
  approved: "Approved",
  rejected: "Rejected",
  incubating: "Incubating",
  archived: "Archived",
};

export type InnovationAnalytics = {
  totalResearchProjects: number;
  activeProjects: number;
  completedProjects: number;
  totalPublications: number;
  researchDomains: Record<string, number>;
  facultyParticipation: number;
  studentParticipation: number;
  startupRegistrations: number;
  incubationProgress: Record<string, number>;
  fundingDistribution: Record<string, { count: number; amount: number }>;
  totalFundingAmount: number;
  innovationIdeasSubmitted: number;
  ideasByType: Record<string, number>;
  eventParticipation: number;
  totalEvents: number;
  publishedEvents: number;
  mentorEngagement: {
    activeMentors: number;
    totalSessions: number;
    completedSessions: number;
  };
  collaborationItems: number;
  hasData: boolean;
};

export type InnovationReportPreview = {
  type: string;
  header: string[];
  rows: Array<Array<string | number>>;
  total: number;
  page: number;
  limit: number;
  pageCount: number;
};
