/** Canonical ATS types — LASYA V2 Prompt 3 */

export const APPLICATION_STAGES = [
  "applied",
  "screening",
  "under_review",
  "shortlisted",
  "assessment",
  "assessment_passed",
  "interview",
  "final_interview",
  "selected",
  "offer_released",
  "offer_accepted",
  "offer_declined",
  "hired",
  "rejected",
  "withdrawn",
] as const;

export type ApplicationStage = (typeof APPLICATION_STAGES)[number];

export type CandidateSnapshot = {
  name: string;
  email?: string;
  phone?: string;
  skills?: string[];
  education?: string[];
  experience?: string[];
  projects?: string[];
  certificates?: string[];
  portfolioUrl?: string;
};

export type RecruitmentApplication = {
  id: string;
  companyId: string;
  candidateUserId?: string | null;
  candidateSnapshot: CandidateSnapshot;
  opportunityType: "job" | "internship" | "drive";
  jobId?: string | null;
  internshipId?: string | null;
  driveId?: string | null;
  roleTitle: string;
  institutionId?: string | null;
  institutionName?: string;
  department?: string;
  graduationYear?: string;
  cgpa?: number | null;
  skillsSummary?: string;
  stage: ApplicationStage;
  priority: "low" | "normal" | "high";
  tags: string[];
  assignedRecruiterUserId?: string | null;
  applicationAnswers?: Array<{ question: string; answer: string; type?: string }>;
  resumeUrl?: string;
  resumeFileName?: string;
  ratings?: {
    technicalFit?: number | null;
    communication?: number | null;
    experienceFit?: number | null;
    roleFit?: number | null;
  };
  rejectionCandidateMessage?: string;
  createdAt: string;
  updatedAt: string;
};

export type ApplicationNote = {
  _id: string;
  type: string;
  content: string;
  authorUserId: string;
  createdAt: string;
};

export type ApplicationActivity = {
  _id: string;
  type: string;
  title: string;
  description?: string;
  previousState?: string | null;
  newState?: string | null;
  createdAt: string;
};

export type RecruitmentInterview = {
  _id: string;
  round: string;
  interviewType?: string;
  scheduledDate: string;
  scheduledTime?: string;
  mode: string;
  meetingLink?: string;
  venue?: string;
  status: string;
  attendance?: string;
  interviewers?: string[];
  feedback?: {
    recommendation?: string;
    strengths?: string;
    concerns?: string;
    privateNotes?: string;
    scores?: Record<string, number>;
  };
};

export type ApplicationAssessment = {
  _id: string;
  name: string;
  type: string;
  scheduledDate?: string;
  status: string;
  score?: number | null;
  result?: string;
};

export type RecruitmentOffer = {
  _id: string;
  roleTitle?: string;
  department?: string;
  salary?: number;
  location?: string;
  joiningDate?: string;
  expiryDate?: string;
  status: string;
};

export type AtsStats = {
  totalApplicants: number;
  newApplicants: number;
  underReview: number;
  shortlisted: number;
  assessments: number;
  interviews: number;
  selected: number;
  offersReleased: number;
  hired: number;
  rejected: number;
  withdrawn: number;
  interviewsToday: number;
  offersPending: number;
  hiredThisMonth: number;
  byStage: Record<string, number>;
};

export type RecruitmentFunnel = {
  applicants: number;
  reviewed: number;
  shortlisted: number;
  assessed: number;
  interviewed: number;
  selected: number;
  offered: number;
  hired: number;
};

export type RecruitmentJob = {
  id?: string;
  _id?: string;
  title: string;
  department?: string;
  location?: string;
  workMode?: string;
  status: string;
  openings?: number;
  experience?: string;
  salaryMin?: number;
  salaryMax?: number;
  requiredSkills?: string[];
  responsibilities?: string;
  qualifications?: string;
  hiringManager?: string;
  deadline?: string;
  jobType?: string;
};

export type RecruitmentInternship = {
  id?: string;
  _id?: string;
  title: string;
  department?: string;
  duration?: string;
  location?: string;
  workMode?: string;
  stipend?: number;
  status: string;
  openPositions?: number;
  requiredSkills?: string[];
  eligibility?: string;
  startDate?: string;
  endDate?: string;
  mentorName?: string;
  mentorEmail?: string;
  deadline?: string;
};

export type CompanyProfile = {
  id: string;
  name: string;
  industry?: string;
  email?: string;
  phone?: string;
  website?: string;
  logoUrl?: string;
  location?: string;
  headquarters?: string;
  description?: string;
  companySize?: string;
  hiringDepartments?: string[];
  hiringLocations?: Array<{ city?: string; country?: string; workMode?: string }>;
  hrContacts?: Array<{ name?: string; email?: string; phone?: string; role?: string }>;
  recruiterTeam?: Array<{ name?: string; email?: string; role?: string }>;
  careersPageUrl?: string;
  socialLinks?: { linkedin?: string; twitter?: string; github?: string };
  status?: string;
  verified?: boolean;
  activeJobsCount?: number;
  activeInternshipsCount?: number;
  pipelineStages?: PipelineStage[];
};

export type PipelineStage = {
  key: string;
  label: string;
  enabled: boolean;
  order: number;
};

export type ApplicantDirectoryEntry = {
  id: string;
  candidateUserId?: string | null;
  name: string;
  email: string;
  phone?: string;
  skills?: string[];
  applicationCount: number;
  latestStage: string;
  latestApplied: string;
  roles: string[];
  departments: string[];
  resumeUrl?: string;
};

export type InterviewPanel = {
  _id: string;
  name: string;
  department?: string;
  members: Array<{
    name: string;
    role?: string;
    department?: string;
    expertise?: string[];
    email?: string;
    availability?: string;
  }>;
};

export type RecruiterTeamMember = {
  userId?: string | null;
  name: string;
  email?: string;
  role: string;
};

export type TalentCandidate = {
  id: string;
  name?: string;
  email?: string;
  skills?: string[];
  education?: string[];
  experience?: string[];
  roleTitle?: string;
  stage?: string;
  resumeUrl?: string;
};

export type PartnerInstitution = {
  partnershipId: string;
  institutionId: string;
  institutionName: string;
  relationshipType?: string;
  status: string;
};

export type ApplicationDetail = {
  application: RecruitmentApplication;
  notes: ApplicationNote[];
  activity: ApplicationActivity[];
  assessments: ApplicationAssessment[];
  interviews: RecruitmentInterview[];
  offer: RecruitmentOffer | null;
};

export const LISTING_STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  published: "Published",
  open: "Published",
  closed: "Closed",
  paused: "Closed",
  archived: "Archived",
};

export const STAGE_LABELS: Record<string, string> = {
  applied: "Applied",
  screening: "Screening",
  under_review: "Under Review",
  shortlisted: "Shortlisted",
  assessment: "Assessment",
  assessment_passed: "Assessment Passed",
  interview: "Interview",
  final_interview: "Final Interview",
  selected: "Selected",
  offer_released: "Offer Released",
  offer_accepted: "Offer Accepted",
  offer_declined: "Offer Declined",
  hired: "Hired",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

export const KANBAN_COLUMNS: ApplicationStage[] = [
  "applied",
  "screening",
  "under_review",
  "shortlisted",
  "assessment",
  "interview",
  "final_interview",
  "selected",
  "offer_released",
  "hired",
  "rejected",
  "withdrawn",
];

export type RecruitmentAnalytics = {
  totalJobOpenings: number;
  activeRecruitments: number;
  totalApplications: number;
  applicationsByPosition: Record<string, number>;
  applicationsByDepartment: Record<string, number>;
  candidatePipelineDistribution: Record<string, number>;
  interviewSuccessRate: number;
  offerAcceptanceRate: number;
  hiringConversionRate: number;
  averageTimeToHireDays: number;
  recruitmentSourcePerformance: Record<string, { applications: number; hired: number }>;
  monthlyHiringTrends: Record<string, number>;
  hasData: boolean;
};

export type RecruitmentReportPreview = {
  type: string;
  header: string[];
  rows: Array<Array<string | number>>;
  total: number;
  page: number;
  limit: number;
  pageCount: number;
};
