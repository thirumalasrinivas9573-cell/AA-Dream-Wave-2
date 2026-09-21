import { apiRequest } from "@/lib/api/client";
import type {
  ApplicationStage,
  Internship,
  Interview,
  Job,
  Offer,
  PlacementApplication,
  PlacementDrive,
  PlacementState,
  Recruiter,
} from "@/types/placement-management";

export type PlacementStats = {
  companies: number;
  drives: number;
  internships: number;
  jobs: number;
  applications: number;
  interviews: number;
  offers: number;
  placed: number;
  activePartnerships: number;
};

export type PlacementDashboardWidgets = {
  activeOpportunities: number;
  upcomingDrives: Array<{ id: string; title: string; companyId?: string; driveDate?: string; status: string; venue?: string }>;
  applicationsReceived: number;
  studentsShortlisted: number;
  offersReleased: number;
  placementPercentage: number;
  highestPackage: number;
  averagePackage: number;
  recentActivity: Array<{ id: string; type: string; title: string; at: string }>;
};

export type PlacementAnalytics = {
  totalOpportunities: number;
  activeOpportunities: number;
  campusDrives: number;
  applicationsSubmitted: number;
  studentsEligible: number;
  studentsSelected: number;
  studentsPlaced: number;
  placementPercentage: number;
  highestPackage: number;
  averagePackage: number;
  offersReleased: number;
  offersAccepted: number;
  internshipListings: number;
  byDepartment: Record<string, number>;
  byDepartmentPlaced: Record<string, number>;
  byBatch: Record<string, number>;
  byCompany: Record<string, number>;
  byApplicationStage: Record<string, number>;
  byOfferStatus: Record<string, number>;
  hasData: boolean;
};

export type PlacementReportPreview = {
  type: string;
  header: string[];
  rows: Array<Array<string | number>>;
  total: number;
  page: number;
  limit: number;
  pageCount: number;
};

export type EligibilityResult = {
  studentId: string;
  studentName?: string;
  fullName?: string;
  rollNumber?: string;
  department?: string;
  cgpa?: number;
  status: string;
  eligible: boolean;
  reasons: string[];
  conditions: string[];
};

const STAGE_FROM_API: Record<string, ApplicationStage> = {
  screening: "applied",
  under_review: "applied",
  assessment_passed: "assessment",
  final_interview: "hr-round",
  offer_released: "selected",
  offer_accepted: "offer-accepted",
  offer_declined: "offer-declined",
  hired: "offer-accepted",
  withdrawn: "rejected",
};

function toDateStr(value: unknown): string {
  if (!value) return "";
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? String(value) : d.toISOString().slice(0, 10);
}

function mapDriveStatus(status: unknown): PlacementDrive["status"] {
  const s = String(status || "ongoing");
  if (s === "open") return "registration_open";
  const allowed: PlacementDrive["status"][] = [
    "draft", "published", "registration_open", "registration_closed",
    "upcoming", "ongoing", "completed", "closed", "cancelled", "archived",
  ];
  return allowed.includes(s as PlacementDrive["status"]) ? (s as PlacementDrive["status"]) : "ongoing";
}

function opts(token: string) {
  return { token };
}

function mapDrive(o: Record<string, unknown>): PlacementDrive {
  return {
    id: String(o.id),
    name: String(o.name || o.title),
    companyId: String(o.companyId || ""),
    date: toDateStr(o.date ?? o.driveDate),
    venue: String(o.venue || o.location || ""),
    mode: (o.mode as PlacementDrive["mode"]) || (o.workMode as PlacementDrive["mode"]) || "offline",
    eligibleDepartments: (o.eligibleDepartments as string[]) || (o.eligibilityRules as { departments?: string[] })?.departments || [],
    eligiblePrograms: (o.eligiblePrograms as string[]) || (o.eligibilityRules as { programs?: string[] })?.programs || [],
    minCgpa: Number(o.minCgpa ?? (o.eligibilityRules as { minCgpa?: number })?.minCgpa ?? 0),
    maxBacklogs: Number(o.maxBacklogs ?? (o.eligibilityRules as { maxBacklogs?: number })?.maxBacklogs ?? 0),
    skillsRequired: (o.skillsRequired as string[]) || (o.requiredSkills as string[]) || [],
    registrationDeadline: toDateStr(o.registrationDeadline ?? o.deadline),
    expectedHiringCount: Number(o.expectedHiringCount ?? o.openPositions ?? 0),
    onlinePlatform: String(o.onlinePlatform || ""),
    workflowStages: (o.workflowStages as PlacementDrive["workflowStages"]) || [],
    currentWorkflowStage: String(o.currentWorkflowStage || ""),
    documentsRequired: (o.documentsRequired as string[]) || [],
    status: mapDriveStatus(o.status),
  };
}

function mapInternship(o: Record<string, unknown>): Internship {
  return {
    id: String(o.id),
    title: String(o.title),
    companyId: String(o.companyId),
    duration: String(o.duration || ""),
    location: String(o.location || ""),
    workMode: (o.workMode as Internship["workMode"]) || "hybrid",
    stipend: Number(o.stipend ?? 0),
    eligibility: String(o.eligibility || o.description || ""),
    requiredSkills: (o.requiredSkills as string[]) || [],
    deadline: toDateStr(o.deadline),
    openPositions: Number(o.openPositions ?? 1),
    status: o.status === "closed" ? "closed" : "open",
  };
}

function mapJob(o: Record<string, unknown>): Job {
  return {
    id: String(o.id),
    title: String(o.title),
    companyId: String(o.companyId),
    salary: Number(o.salary ?? 0),
    location: String(o.location || ""),
    experience: String(o.experience || ""),
    eligibility: String(o.eligibility || o.description || ""),
    jobType: (o.jobType as Job["jobType"]) || (o.employmentType as Job["jobType"]) || "full-time",
    deadline: toDateStr(o.deadline),
    selectionProcess: (o.selectionProcess as string[]) || [],
    status: o.status === "closed" ? "closed" : "open",
  };
}

function mapApplication(o: Record<string, unknown>): PlacementApplication {
  const rawStage = String(o.stage || "applied");
  const stage = STAGE_FROM_API[rawStage] || (rawStage as ApplicationStage);
  return {
    id: String(o.id),
    studentName: String(o.studentName),
    companyId: String(o.companyId),
    role: String(o.role),
    type: (o.type as PlacementApplication["type"]) || "drive",
    department: String(o.department || ""),
    cgpa: Number(o.cgpa ?? 0),
    graduationYear: String(o.graduationYear || ""),
    stage,
    appliedDate: toDateStr(o.appliedDate),
  };
}

function mapInterview(o: Record<string, unknown>): Interview {
  return {
    id: String(o.id),
    studentName: String(o.studentName),
    companyId: String(o.companyId),
    role: String(o.role),
    date: toDateStr(o.date),
    time: String(o.time || ""),
    panel: String(o.panel || ""),
    meetingLink: String(o.meetingLink || ""),
    venue: String(o.venue || ""),
    status: (o.status as Interview["status"]) || "scheduled",
    feedback: String(o.feedback || ""),
  };
}

function mapOffer(o: Record<string, unknown>): Offer {
  return {
    id: String(o.id),
    studentName: String(o.studentName),
    companyId: String(o.companyId),
    role: String(o.role),
    department: String(o.department || ""),
    salary: Number(o.salary ?? o.packageAmount ?? 0),
    joiningDate: toDateStr(o.joiningDate),
    location: String(o.location || ""),
    status: (o.status as Offer["status"]) || "released",
    expiryDate: toDateStr(o.expiryDate),
  };
}

function mapRecruiter(o: Record<string, unknown>): Recruiter {
  return {
    id: String(o.id),
    logoInitials: String(o.logoInitials || ""),
    name: String(o.name),
    industry: String(o.industry || ""),
    hrContact: String(o.hrContact || ""),
    email: String(o.email || ""),
    phone: String(o.phone || ""),
    location: String(o.location || ""),
    website: String(o.website || ""),
    about: String(o.about || ""),
    hiringDepartments: (o.hiringDepartments as string[]) || [],
    requiredSkills: (o.requiredSkills as string[]) || [],
    hiringProcess: (o.hiringProcess as string[]) || [],
    pastPlacements: Number(o.pastPlacements ?? 0),
    internshipsCount: Number(o.internshipsCount ?? 0),
    jobsCount: Number(o.jobsCount ?? 0),
    driveStatus: (o.driveStatus as Recruiter["driveStatus"]) || "ongoing",
    status: o.status === "inactive" ? "inactive" : "active",
  };
}

export const institutionPlacementsApi = {
  getMeta: (token: string) =>
    apiRequest<{ success: boolean }>("/institution/placements/meta", opts(token)),

  getStats: (token: string) =>
    apiRequest<{ success: boolean; stats: PlacementStats }>(
      "/institution/placements/stats",
      opts(token),
    ),

  getWorkspace: (token: string) =>
    apiRequest<{ success: boolean; workspace: PlacementState & { stats: PlacementStats } }>(
      "/institution/placements/workspace",
      opts(token),
    ),

  listCompanies: (token: string, params?: Record<string, string>) => {
    const qs = params ? `?${new URLSearchParams(params)}` : "";
    return apiRequest<{ success: boolean; companies: Recruiter[] }>(
      `/institution/placements/companies${qs}`,
      opts(token),
    );
  },

  listOpportunities: (token: string, params?: Record<string, string | number | undefined>) => {
    const qs = new URLSearchParams();
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== "") qs.set(k, String(v));
      }
    }
    const q = qs.toString();
    return apiRequest<{ success: boolean; opportunities: unknown[]; pagination: { total: number } }>(
      `/institution/placements/opportunities${q ? `?${q}` : ""}`,
      opts(token),
    );
  },

  createOpportunity: (token: string, body: Record<string, unknown>) =>
    apiRequest("/institution/placements/opportunities", {
      method: "POST",
      body,
      token,
    }),

  updateOpportunity: (token: string, id: string, body: Record<string, unknown>) =>
    apiRequest(`/institution/placements/opportunities/${id}`, {
      method: "PATCH",
      body,
      token,
    }),

  listApplications: (token: string, params?: Record<string, string | undefined>) => {
    const qs = new URLSearchParams();
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== "") qs.set(k, v);
      }
    }
    const q = qs.toString();
    return apiRequest<{ success: boolean; applications: unknown[] }>(
      `/institution/placements/applications${q ? `?${q}` : ""}`,
      opts(token),
    );
  },

  submitApplication: (token: string, body: Record<string, unknown>) =>
    apiRequest("/institution/placements/applications", {
      method: "POST",
      body,
      token,
    }),

  reviewApplication: (token: string, id: string, body: Record<string, unknown>) =>
    apiRequest(`/institution/placements/applications/${id}/review`, {
      method: "PATCH",
      body,
      token,
    }),

  getEligibility: (token: string, opportunityId: string, studentId: string) =>
    apiRequest<{ success: boolean; eligibility: EligibilityResult }>(
      `/institution/placements/opportunities/${opportunityId}/eligibility/${studentId}`,
      opts(token),
    ),

  listEligibility: (token: string, opportunityId: string, params?: Record<string, string | undefined>) => {
    const qs = new URLSearchParams();
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== "") qs.set(k, v);
      }
    }
    const q = qs.toString();
    return apiRequest<{ success: boolean; eligibility: EligibilityResult[] }>(
      `/institution/placements/opportunities/${opportunityId}/eligibility${q ? `?${q}` : ""}`,
      opts(token),
    );
  },

  listPools: (token: string) =>
    apiRequest<{ success: boolean; pools: Array<{ id: string; name: string; type: string }> }>(
      "/institution/placements/pools",
      opts(token),
    ),

  getDashboard: (token: string) =>
    apiRequest<{ success: boolean; widgets: PlacementDashboardWidgets }>(
      "/institution/placements/dashboard",
      opts(token),
    ),

  transitionDrive: (token: string, driveId: string, action: string) =>
    apiRequest(`/institution/placements/drives/${driveId}/action`, {
      method: "POST",
      body: { action },
      token,
    }),

  generateShortlist: (token: string, driveId: string, body?: Record<string, unknown>) =>
    apiRequest(`/institution/placements/drives/${driveId}/shortlist/generate`, {
      method: "POST",
      body: body || {},
      token,
    }),

  publishShortlist: (token: string, driveId: string) =>
    apiRequest(`/institution/placements/drives/${driveId}/shortlist/publish`, {
      method: "POST",
      token,
    }),

  createInterview: (token: string, body: Record<string, unknown>) =>
    apiRequest("/institution/placements/interviews", { method: "POST", body, token }),

  createOffer: (token: string, body: Record<string, unknown>) =>
    apiRequest("/institution/placements/offers", { method: "POST", body, token }),

  updateOffer: (token: string, id: string, body: Record<string, unknown>) =>
    apiRequest(`/institution/placements/offers/${id}`, { method: "PATCH", body, token }),

  sendNotification: (token: string, body: Record<string, unknown>) =>
    apiRequest("/institution/placements/notifications", { method: "POST", body, token }),

  getCompanyEngagement: (token: string, companyId: string) =>
    apiRequest<{ success: boolean; engagement: Record<string, unknown> }>(
      `/institution/placements/companies/${companyId}/engagement`,
      opts(token),
    ),

  getAnalytics: (token: string, params?: Record<string, string | undefined>) => {
    const qs = new URLSearchParams();
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v) qs.set(k, v);
      }
    }
    const q = qs.toString();
    return apiRequest<{ success: boolean; analytics: PlacementAnalytics }>(
      `/institution/placements/analytics${q ? `?${q}` : ""}`,
      opts(token),
    );
  },

  getReportTypes: (token: string) =>
    apiRequest<{ success: boolean; reportTypes: string[] }>(
      "/institution/placements/reports/types",
      opts(token),
    ),

  previewReport: (
    token: string,
    type: string,
    params?: Record<string, string | number | undefined>,
  ) => {
    const qs = new URLSearchParams();
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== "") qs.set(k, String(v));
      }
    }
    const q = qs.toString();
    return apiRequest<{ success: boolean; report: PlacementReportPreview }>(
      `/institution/placements/reports/${type}${q ? `?${q}` : ""}`,
      opts(token),
    );
  },

  exportReport: (
    token: string,
    type: string,
    format: "csv" | "xlsx" | "pdf" = "csv",
    params?: Record<string, string | undefined>,
  ) => {
    const qs = new URLSearchParams({ format });
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v) qs.set(k, v);
      }
    }
    return apiRequest<{
      success: boolean;
      export: { filename: string; content: string; mimeType: string };
    }>(`/institution/placements/reports/${type}/export?${qs.toString()}`, opts(token));
  },

  mapWorkspace(raw: PlacementState): PlacementState {
    return {
      recruiters: (raw.recruiters || []).map((r) => mapRecruiter(r as unknown as Record<string, unknown>)),
      drives: (raw.drives || []).map((d) => mapDrive(d as unknown as Record<string, unknown>)),
      internships: (raw.internships || []).map((i) => mapInternship(i as unknown as Record<string, unknown>)),
      jobs: (raw.jobs || []).map((j) => mapJob(j as unknown as Record<string, unknown>)),
      applications: (raw.applications || []).map((a) => mapApplication(a as unknown as Record<string, unknown>)),
      interviews: (raw.interviews || []).map((i) => mapInterview(i as unknown as Record<string, unknown>)),
      offers: (raw.offers || []).map((o) => mapOffer(o as unknown as Record<string, unknown>)),
    };
  },
};
