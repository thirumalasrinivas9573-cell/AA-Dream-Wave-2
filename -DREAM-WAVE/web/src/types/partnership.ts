/** Partnership domain types — LASYA V2 Prompt 1 */

export const RELATIONSHIP_TYPES = [
  "Recruitment Partner",
  "Internship Partner",
  "Industry Partner",
  "Training Partner",
  "Research Partner",
  "Innovation Partner",
  "Technology Partner",
  "Placement Partner",
  "Academic Partner",
  "Mentorship Partner",
] as const;

export type RelationshipType = (typeof RELATIONSHIP_TYPES)[number];

export const PARTNERSHIP_STATUSES = [
  "invited",
  "pending",
  "active",
  "paused",
  "declined",
  "expired",
  "terminated",
] as const;

export type PartnershipStatus = (typeof PARTNERSHIP_STATUSES)[number];

export const REQUEST_STATUSES = [
  "pending",
  "accepted",
  "declined",
  "info_requested",
  "expired",
  "cancelled",
] as const;

export type RequestStatus = (typeof REQUEST_STATUSES)[number];

export const DOCUMENT_TYPES = [
  "MoU",
  "Agreement",
  "NDA",
  "Training Agreement",
  "Recruitment Agreement",
  "Internship Agreement",
  "Research Agreement",
] as const;

export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export type PartnershipContact = {
  name?: string;
  email?: string;
  phone?: string;
  title?: string;
};

export type OrgSummary = {
  _id: string;
  name: string;
  logoUrl?: string;
  verified?: boolean;
  city?: string;
  country?: string;
  location?: string;
  industry?: string;
  type?: string;
  departments?: string[];
  programs?: string[];
  activeJobsCount?: number;
  activeInternshipsCount?: number;
};

export type Partnership = {
  id: string;
  _id?: string;
  institutionId: string | OrgSummary;
  companyId: string | OrgSummary;
  institution?: OrgSummary;
  company?: OrgSummary;
  status: PartnershipStatus;
  relationshipType: RelationshipType;
  initiatedBy: "institution" | "company";
  requestStatus: RequestStatus;
  subject?: string;
  message?: string;
  proposedCollaboration?: string;
  contactPerson?: PartnershipContact;
  startDate?: string | null;
  expectedDuration?: string;
  objectives?: string;
  description?: string;
  responseMessage?: string;
  sharingScopes?: SharingScope[];
  requestedScopes?: SharingScope[];
  createdAt: string;
  updatedAt: string;
};

export type SharingScope =
  | "events"
  | "opportunities"
  | "recruitment"
  | "placement"
  | "projects"
  | "skills"
  | "programs"
  | "research"
  | "analytics"
  | "community";

export type SharedJob = {
  _id: string;
  title: string;
  department?: string;
  location?: string;
  workMode?: string;
  status: string;
  deadline?: string | null;
};

export type SharedInternship = {
  _id: string;
  title: string;
  department?: string;
  location?: string;
  duration?: string;
  status: string;
  deadline?: string | null;
};

export type SharedDrive = {
  _id: string;
  title: string;
  type?: string;
  status: string;
  startDate?: string | null;
  endDate?: string | null;
};

export type SharedEvent = {
  id: string;
  source: string;
  title: string;
  type?: string;
  status: string;
  startDate?: string | null;
  endDate?: string | null;
};

export type PartnershipWorkspace = {
  partnership: Partnership;
  sharingScopes: SharingScope[];
  requestedScopes: SharingScope[];
  availableScopes: SharingScope[];
  shared: {
    jobs: SharedJob[];
    internships: SharedInternship[];
    drives: SharedDrive[];
    events: SharedEvent[];
    projects: unknown[];
    research: unknown[];
  };
  analytics: Record<string, number> | null;
  recentActivity: PartnershipActivity[];
  scopeAccess: Record<SharingScope, boolean>;
};

export type CollaborationDashboard = {
  activePartners: Array<{
    id: string;
    status: string;
    relationshipType: string;
    sharingScopes: SharingScope[];
    institution?: OrgSummary;
    company?: OrgSummary;
    updatedAt: string;
  }>;
  pendingIncoming: Partnership[];
  pendingOutgoing: Partnership[];
  recentActivity: PartnershipActivity[];
  counts: {
    active: number;
    pendingIncoming: number;
    pendingOutgoing: number;
  };
};

export type PartnershipStats = {
  totalIndustryPartners?: number;
  activePartners?: number;
  recruitmentPartners?: number;
  internshipPartners?: number;
  researchPartners?: number;
  pendingInvitations?: number;
  partnerInstitutions?: number;
  pendingRequests?: number;
  recruitmentInstitutions?: number;
  internshipInstitutions?: number;
  recentlyConnected?: number;
};

export type PartnershipActivity = {
  _id: string;
  type: string;
  title: string;
  description?: string;
  actorRole?: string;
  createdAt: string;
};

export type PartnershipDocument = {
  _id: string;
  name: string;
  type: DocumentType;
  uploadedByRole: "institution" | "company";
  fileUrl?: string;
  fileName?: string;
  expiryDate?: string | null;
  status: string;
  createdAt: string;
};

export type DiscoverableCompany = OrgSummary & {
  about?: string;
  website?: string;
};

export type DiscoverableInstitution = OrgSummary & {
  description?: string;
  website?: string;
};

export type CreatePartnershipRequestPayload = {
  companyId?: string;
  institutionId?: string;
  relationshipType: RelationshipType;
  subject?: string;
  message?: string;
  proposedCollaboration?: string;
  contactPerson?: PartnershipContact;
  startDate?: string;
  expectedDuration?: string;
  requestedScopes?: SharingScope[];
};

export type PartnershipRespondAction = "accept" | "decline" | "info_requested";

export type PlatformNotification = {
  _id: string;
  type: string;
  title: string;
  body?: string;
  read: boolean;
  partnershipId?: string;
  createdAt: string;
};

export type Paginated<T> = {
  items: T[];
  total: number;
  page: number;
  limit: number;
  pageCount: number;
};
