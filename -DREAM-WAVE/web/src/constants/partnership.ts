import { INSTITUTION_ROUTES } from "@/constants/institution";

export const COMPANY_ROUTES = {
  root: "/company",
  dashboard: "/company/dashboard",
  profile: "/company/profile",
  institutionNetwork: "/company/institution-network",
  collaborationHub: "/company/collaboration-hub",
  opportunityMarketplace: "/company/opportunity-marketplace",
  ecosystem: "/company/ecosystem",
  programs: "/company/programs",
  partnerships: "/company/partnerships",
  partnershipDetail: (id: string) => `/company/partnerships/${id}`,
  recruitment: "/company/recruitment",
  applications: "/company/recruitment/applications",
  pipeline: "/company/recruitment/pipeline",
  pipelineSettings: "/company/recruitment/pipeline/settings",
  jobs: "/company/recruitment/jobs",
  internships: "/company/recruitment/internships",
  applicants: "/company/recruitment/applicants",
  shortlist: "/company/recruitment/shortlist",
  interviews: "/company/recruitment/interviews",
  panels: "/company/recruitment/panels",
  team: "/company/recruitment/team",
  communication: "/company/recruitment/communication",
  talent: "/company/recruitment/talent",
  talentIntelligence: "/company/recruitment/talent-intelligence",
  matchTalent: "/company/recruitment/match-talent",
  analytics: "/company/recruitment/analytics",
  reports: "/company/recruitment/reports",
  applicationDetail: (id: string) => `/company/recruitment/applications/${id}`,
} as const;

export const RECRUITMENT_NAV = [
  { label: "Overview", href: COMPANY_ROUTES.recruitment },
  { label: "Jobs", href: COMPANY_ROUTES.jobs },
  { label: "Internships", href: COMPANY_ROUTES.internships },
  { label: "Applications", href: COMPANY_ROUTES.applications },
  { label: "Interviews", href: COMPANY_ROUTES.interviews },
  { label: "Panels", href: COMPANY_ROUTES.panels },
  { label: "Applicants", href: COMPANY_ROUTES.applicants },
  { label: "Talent", href: COMPANY_ROUTES.talent },
  { label: "Talent Intel", href: COMPANY_ROUTES.talentIntelligence },
  { label: "Match Talent", href: COMPANY_ROUTES.matchTalent },
  { label: "Shortlist", href: COMPANY_ROUTES.shortlist },
  { label: "Pipeline", href: COMPANY_ROUTES.pipeline },
  { label: "Team", href: COMPANY_ROUTES.team },
  { label: "Communication", href: COMPANY_ROUTES.communication },
  { label: "Analytics", href: COMPANY_ROUTES.analytics },
  { label: "Reports", href: COMPANY_ROUTES.reports },
] as const;

export const PARTNERSHIP_ROUTES = {
  institutionNetwork: "/institution/industry-network",
  institutionPartnership: (id: string) => `/institution/partnerships/${id}`,
  companyPartnership: (id: string) => `/company/partnerships/${id}`,
} as const;

export const COMPANY_NAV = [
  { label: "Dashboard", href: COMPANY_ROUTES.dashboard, primary: true },
  { label: "Recruitment", href: COMPANY_ROUTES.recruitment },
  { label: "Opportunity Marketplace", href: COMPANY_ROUTES.opportunityMarketplace },
  { label: "Institution Network", href: COMPANY_ROUTES.institutionNetwork },
  { label: "Collaboration Hub", href: COMPANY_ROUTES.collaborationHub },
  { label: "Ecosystem Intelligence", href: COMPANY_ROUTES.ecosystem },
  { label: "Company Profile", href: COMPANY_ROUTES.profile },
  { label: "Settings", href: "/settings" },
] as const;

export const PARTNERSHIP_STATUS_LABELS: Record<string, string> = {
  invited: "Invited",
  pending: "Pending",
  active: "Active",
  paused: "Paused",
  declined: "Declined",
  expired: "Expired",
  terminated: "Terminated",
};

export const INSTITUTION_INDUSTRY_NETWORK = INSTITUTION_ROUTES.industryNetwork;
