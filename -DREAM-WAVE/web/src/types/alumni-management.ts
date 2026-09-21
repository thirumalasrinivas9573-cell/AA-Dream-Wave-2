/** Institution Alumni Network — LASYA V2 Prompt 8 */

export type AlumniProfile = {
  _id: string;
  fullName: string;
  email?: string;
  phone?: string;
  graduationYear?: string;
  department?: string;
  degree?: string;
  currentCompany?: string;
  currentRole?: string;
  industry?: string;
  skills?: string[];
  location?: { city?: string; state?: string; country?: string };
  professionalSummary?: string;
  contactPreference?: string;
  socialLinks?: Record<string, string>;
  verificationStatus?: string;
  profileVisibility?: string;
  isMentorAvailable?: boolean;
  status?: string;
  careerHistory?: Array<Record<string, unknown>>;
  education?: Array<Record<string, unknown>>;
  higherEducation?: Record<string, string>;
  certifications?: Array<Record<string, unknown>>;
  achievements?: string[];
  awards?: string[];
  publications?: Array<Record<string, unknown>>;
  portfolioLinks?: Array<Record<string, unknown>>;
  resumeUrl?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type AlumniGroup = {
  _id: string;
  name: string;
  description?: string;
  groupType?: string;
  chapterLocation?: string;
  interestTags?: string[];
  memberCount?: number;
  status?: string;
};

export type AlumniMentorship = {
  _id: string;
  alumniId: string | AlumniProfile;
  studentUserId?: string;
  studentName?: string;
  studentDepartment?: string;
  goals?: string[];
  status?: string;
  requestMessage?: string;
  matchedAt?: string;
  completedAt?: string;
  createdAt?: string;
};

export type AlumniMentorshipSession = {
  _id: string;
  mentorshipId?: string;
  alumniId?: string;
  scheduledDate?: string;
  durationMinutes?: number;
  status?: string;
  goals?: string[];
  notes?: string;
  feedback?: string;
};

export type AlumniCareerContribution = {
  _id: string;
  alumniId?: string | AlumniProfile;
  contributionType?: string;
  title: string;
  description?: string;
  company?: string;
  role?: string;
  location?: string;
  applicationUrl?: string;
  status?: string;
  participantCount?: number;
  createdAt?: string;
};

export type AlumniStats = {
  totalAlumni: number;
  verifiedAlumni: number;
  mentorAvailable: number;
  activeMentorships: number;
  completedMentorships: number;
  pendingMentorshipRequests: number;
  totalConnections: number;
  pendingConnections: number;
  activeGroups: number;
  careerContributions: number;
  openOpportunities: number;
  totalCareerParticipants: number;
  completedMentorshipSessions: number;
  byDepartment: Record<string, number>;
  byGraduationYear: Record<string, number>;
  byIndustry: Record<string, number>;
  hasData: boolean;
};

export type AlumniWorkspace = {
  stats: AlumniStats;
  recentAlumni: AlumniProfile[];
  pendingMentorships: AlumniMentorship[];
  recentContributions: AlumniCareerContribution[];
  activeGroups: AlumniGroup[];
};

export type Pagination = {
  total: number;
  page: number;
  limit: number;
  pageCount: number;
};

export const CONTRIBUTION_TYPE_LABELS: Record<string, string> = {
  job_referral: "Job Referral",
  internship_referral: "Internship Referral",
  career_guidance: "Career Guidance",
  resume_review: "Resume Review",
  mock_interview: "Mock Interview",
  industry_insight: "Industry Insight",
  skill_session: "Skill Development Session",
};

export const MENTORSHIP_STATUS_LABELS: Record<string, string> = {
  requested: "Requested",
  matched: "Matched",
  active: "Active",
  completed: "Completed",
  cancelled: "Cancelled",
  declined: "Declined",
};

export const VERIFICATION_LABELS: Record<string, string> = {
  pending: "Pending",
  verified: "Verified",
  rejected: "Rejected",
};

export type AlumniEvent = {
  _id: string;
  title: string;
  description?: string;
  eventType?: string;
  organizer?: string;
  venue?: string;
  mode?: string;
  onlinePlatform?: string;
  startDate?: string;
  endDate?: string;
  capacity?: number;
  status?: string;
  speakers?: Array<{ name: string; title?: string; organization?: string }>;
  agenda?: Array<{ time?: string; title: string; description?: string }>;
  registrations?: Array<{ _id?: string; registrantName: string; status?: string }>;
};

export type InstitutionalContribution = {
  _id: string;
  alumniId?: string;
  contributionType?: string;
  title: string;
  amount?: number;
  beneficiaries?: string;
  approvalStatus?: string;
  impactSummary?: string;
};

export type GroupPost = {
  _id: string;
  groupId?: string;
  postType?: string;
  title: string;
  body?: string;
  authorName?: string;
  comments?: Array<{ authorName?: string; body: string }>;
  createdAt?: string;
};

export type VolunteerRecord = {
  _id: string;
  alumniId?: string;
  volunteerRole?: string;
  title: string;
  eventTitle?: string;
  hoursContributed?: number;
  status?: string;
};

export type CareerApplication = {
  _id: string;
  contributionId?: string;
  applicantName?: string;
  status?: string;
  coverLetter?: string;
  createdAt?: string;
};

export type AlumniAuditEntry = {
  _id: string;
  action: string;
  actorName?: string;
  description?: string;
  createdAt?: string;
};

export type EngagementAnalytics = {
  activeAlumni: number;
  newRegistrations: number;
  mentorParticipation: number;
  activeMentorships: number;
  completedMentorships: number;
  eventsConducted: number;
  totalEventRegistrations: number;
  communityGrowth: number;
  discussionPosts: number;
  referralActivity: number;
  openReferrals: number;
  careerApplications: number;
  donationsReceived: number;
  institutionalContributions: number;
  volunteerParticipation: number;
  totalVolunteerHours: number;
  totalConnections: number;
  hasData: boolean;
};

export type AlumniAnalytics = {
  totalAlumni: number;
  verifiedAlumni: number;
  activeAlumni: number;
  alumniByGraduationYear: Record<string, number>;
  alumniByDepartment: Record<string, number>;
  alumniByIndustry: Record<string, number>;
  alumniByCountry: Record<string, number>;
  alumniByCompany: Record<string, number>;
  mentorshipParticipation: {
    mentorsAvailable: number;
    activeMentorships: number;
    completedMentorships: number;
    pendingRequests: number;
    completedSessions: number;
  };
  referralActivity: {
    totalReferrals: number;
    openReferrals: number;
    totalApplications: number;
    totalParticipants: number;
  };
  eventParticipation: {
    totalEvents: number;
    publishedEvents: number;
    totalRegistrations: number;
    attendedRegistrations: number;
  };
  donationsContributions: {
    totalRecords: number;
    approvedRecords: number;
    totalAmount: number;
    byType: Record<string, number>;
  };
  volunteerEngagement: {
    totalRecords: number;
    completedActivities: number;
    totalHours: number;
    byRole: Record<string, number>;
  };
  communityGroups: number;
  hasData: boolean;
};

export type AlumniReportPreview = {
  type: string;
  header: string[];
  rows: string[][];
  total: number;
  page: number;
  limit: number;
  pageCount: number;
};
