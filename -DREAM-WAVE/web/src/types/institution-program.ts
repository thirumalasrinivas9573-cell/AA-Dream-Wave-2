export const PROGRAM_TYPES = [
  "INDUSTRY_WORKSHOP",
  "SKILL_PROGRAM",
  "MENTORSHIP",
  "INDUSTRY_PROJECT",
  "CAMPUS_HIRING",
  "INTERNSHIP_PROGRAM",
  "PRE_PLACEMENT",
  "GUEST_SESSION",
  "RESEARCH_PROGRAM",
  "COMPANY_CHALLENGE",
  "BOOTCAMP",
] as const;

export type ProgramType = (typeof PROGRAM_TYPES)[number];

export const PROGRAM_STATUSES = [
  "draft",
  "planned",
  "registration_open",
  "active",
  "paused",
  "completed",
  "cancelled",
] as const;

export type ProgramStatus = (typeof PROGRAM_STATUSES)[number];

export const PARTICIPANT_STATUSES = [
  "registered",
  "approved",
  "active",
  "completed",
  "dropped",
  "rejected",
] as const;

export type ParticipantStatus = (typeof PARTICIPANT_STATUSES)[number];

export type EligibilityRules = {
  departments?: string[];
  programs?: string[];
  batches?: string[];
  semesters?: string[];
  minCgpa?: number | null;
  maxBacklogs?: number | null;
  graduationYear?: string;
  requiredSkills?: string[];
  requiredCertifications?: string[];
};

export type ProgramMilestone = {
  _id?: string;
  key: string;
  title: string;
  order: number;
  status: "pending" | "active" | "completed";
  dueDate?: string | null;
  linkedEntityType?: string | null;
  linkedEntityId?: string;
  completedAt?: string | null;
};

export type LinkedEntity = {
  _id?: string;
  entityType: string;
  entityId: string;
  label?: string;
  order?: number;
};

export type InstitutionProgram = {
  id: string;
  _id?: string;
  institutionId?: string;
  companyId?: string;
  partnershipId?: string | null;
  ownerRole: "institution" | "company";
  title: string;
  slug?: string;
  description?: string;
  objectives?: string;
  programType: ProgramType;
  status: ProgramStatus;
  startDate?: string | null;
  endDate?: string | null;
  registrationOpensAt?: string | null;
  registrationClosesAt?: string | null;
  capacity?: number | null;
  eligibilityRules?: EligibilityRules;
  cohortIds?: string[];
  academicProgramKeys?: string[];
  skills?: string[];
  linkedEntities?: LinkedEntity[];
  milestones?: ProgramMilestone[];
  location?: string;
  visibility?: string;
  createdAt: string;
  updatedAt: string;
};

export type ProgramParticipant = {
  _id: string;
  programId: string;
  studentUserId: string;
  institutionStudentId?: string;
  status: ParticipantStatus;
  eligibilitySnapshot?: Record<string, unknown>;
  registeredAt: string;
  approvedAt?: string | null;
  completedAt?: string | null;
  reviewMessage?: string;
};

export type ProgramActivity = {
  _id: string;
  type: string;
  title: string;
  description?: string;
  actorRole?: string;
  createdAt: string;
};

export type ProgramDashboard = {
  program: InstitutionProgram;
  participants: ProgramParticipant[];
  participantCounts: Record<string, number>;
  registrationCount: number;
  capacity: { total: number; used: number; full: boolean } | null;
  linkedEntities: LinkedEntity[];
  milestones: ProgramMilestone[];
  recentActivity: ProgramActivity[];
  analytics: Record<string, number>;
};

export type CreateProgramPayload = {
  title: string;
  description?: string;
  objectives?: string;
  programType: ProgramType;
  partnershipId?: string;
  companyId?: string;
  startDate?: string;
  endDate?: string;
  registrationOpensAt?: string;
  registrationClosesAt?: string;
  capacity?: number;
  eligibilityRules?: EligibilityRules;
  skills?: string[];
  location?: string;
};

export type DiscoverableProgram = InstitutionProgram & {
  eligibility?: { status: string; eligible: boolean; reasons?: string[] };
  participantStatus?: ParticipantStatus | null;
};
