/** Institution Incubation & Startup Ecosystem */

export const INCUBATION_STAGES = [
  "idea_evaluation",
  "pre_incubation",
  "incubation",
  "mentorship",
  "prototype_development",
  "product_validation",
  "investor_readiness",
  "graduation",
] as const;

export type StartupProfile = {
  _id: string;
  name: string;
  founders?: string[];
  coFounders?: string[];
  category?: string;
  industry?: string;
  stage?: string;
  description?: string;
  vision?: string;
  mission?: string;
  website?: string;
  contactEmail?: string;
  contactPhone?: string;
  teamMembers?: Array<{ name: string; role?: string; email?: string }>;
  status: string;
  createdAt?: string;
  updatedAt?: string;
};

export type IncubationRecord = {
  _id: string;
  startupId: string;
  currentStage: string;
  history?: Array<{ stage: string; action?: string; description?: string; at: string }>;
  assignedMentorIds?: string[];
};

export type MentorProfile = {
  _id: string;
  name: string;
  email?: string;
  mentorType: string;
  organization?: string;
  expertise?: string[];
  mentoringDomains?: string[];
  availability?: string;
  status: string;
  assignedStartupIds?: string[];
};

export type MentorshipSession = {
  _id: string;
  startupId: string;
  mentorId: string;
  sessionType?: string;
  scheduledDate: string;
  scheduledTime?: string;
  status: string;
  goals?: string[];
  meetingNotes?: string;
  feedback?: string;
};

export type FundingRecord = {
  _id: string;
  startupId?: string | null;
  fundingType: string;
  fundingSource: string;
  amount?: number;
  status: string;
  purpose?: string;
  fundingDate?: string | null;
};

export type InvestorProfile = {
  _id: string;
  name: string;
  investorType: string;
  organization?: string;
  email?: string;
  preferredSectors?: string[];
  preferredStages?: string[];
  status: string;
  connectedStartupIds?: string[];
};

export type InnovationEvent = {
  _id: string;
  title: string;
  description?: string;
  eventType: string;
  venue?: string;
  mode?: string;
  startDate: string;
  endDate?: string | null;
  status: string;
  registrations?: Array<{ _id?: string; registrantName: string; status: string }>;
};

export type CollaborationItem = {
  _id: string;
  collaborationType: string;
  title: string;
  content?: string;
  taskStatus?: string;
  authorName?: string;
  createdAt?: string;
};

export type IncubationStats = {
  totalStartups: number;
  activeStartups: number;
  graduatedStartups: number;
  totalMentors: number;
  totalSessions: number;
  totalFundingRecords: number;
  totalFundingAmount: number;
  totalInvestors: number;
  totalEvents: number;
  publishedEvents: number;
  byIncubationStage: Record<string, number>;
  byStartupCategory: Record<string, number>;
  hasData: boolean;
};

export const STAGE_LABELS: Record<string, string> = {
  idea_evaluation: "Idea Evaluation",
  pre_incubation: "Pre-Incubation",
  incubation: "Incubation",
  mentorship: "Mentorship",
  prototype_development: "Prototype Development",
  product_validation: "Product Validation",
  investor_readiness: "Investor Readiness",
  graduation: "Graduation",
};

export const MENTOR_TYPE_LABELS: Record<string, string> = {
  faculty: "Faculty",
  industry: "Industry",
  alumni: "Alumni",
  investor: "Investor",
  entrepreneur: "Entrepreneur",
  research_expert: "Research Expert",
};

export const FUNDING_TYPE_LABELS: Record<string, string> = {
  seed_funding: "Seed Funding",
  grant: "Grant",
  angel_investment: "Angel Investment",
  venture_capital: "Venture Capital",
  government_scheme: "Government Scheme",
  institutional_funding: "Institutional Funding",
  research_grant: "Research Grant",
};

export const EVENT_TYPE_LABELS: Record<string, string> = {
  hackathon: "Hackathon",
  innovation_challenge: "Innovation Challenge",
  startup_competition: "Startup Competition",
  demo_day: "Demo Day",
  pitch_event: "Pitch Event",
  workshop: "Workshop",
  seminar: "Seminar",
  research_conference: "Research Conference",
};
