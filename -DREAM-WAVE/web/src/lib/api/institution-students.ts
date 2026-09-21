import { apiRequest } from "@/lib/api/client";
import type { ManagedStudent } from "@/types/student-management";

export type DirectoryStudent = {
  id: string;
  studentId: string;
  rollNumber: string;
  photoInitials: string;
  fullName: string;
  department: string;
  course: string;
  batch: string;
  semester: string;
  section: string;
  academicYear: string;
  status: string;
  email: string;
  placementStatus: string;
  sharedSkills: string[];
  sharedProjectsSummary: string[];
  profileStatus: string;
  createdAt: string;
  updatedAt: string;
};

export type StudentStats = {
  total: number;
  active: number;
  inactive: number;
  graduated: number;
  suspended: number;
  departments: number;
  placementReady: number;
  placementEligible?: number;
  placedStudents?: number;
  pendingVerifications?: number;
  byStatus: Record<string, number>;
  byDepartment: Record<string, number>;
  recentlyAdded?: Array<{
    id: string;
    fullName: string;
    rollNumber: string;
    department: string;
    createdAt: string;
  }>;
  recentActivity?: ActivityItem[];
};

export type ActivityItem = {
  id: string;
  action: string;
  type: string;
  title: string;
  detail: string;
  studentId: string | null;
  actorName?: string;
  createdAt: string;
};

export type FilterOptions = {
  departments: string[];
  courses: string[];
  semesters: string[];
  sections: string[];
  batches: string[];
  academicYears: string[];
  admissionYears: string[];
};

type Pagination = {
  total: number;
  page: number;
  limit: number;
  pageCount: number;
};

function opts(token: string, signal?: AbortSignal) {
  return signal ? { token, signal } : { token };
}

export const institutionStudentsApi = {
  getMeta: (token: string) =>
    apiRequest<{ success: boolean }>("/institution/students/meta", opts(token)),

  getStats: (token: string) =>
    apiRequest<{ success: boolean; stats: StudentStats }>(
      "/institution/students/stats",
      opts(token),
    ),

  getActivity: (token: string, params?: Record<string, string | number | undefined>) => {
    const qs = new URLSearchParams();
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== "") qs.set(k, String(v));
      }
    }
    const q = qs.toString();
    return apiRequest<{
      success: boolean;
      activity: { items: ActivityItem[]; total: number; page: number; limit: number; pageCount: number };
    }>(`/institution/students/activity${q ? `?${q}` : ""}`, opts(token));
  },

  getFilterOptions: (token: string) =>
    apiRequest<{ success: boolean; options: FilterOptions }>(
      "/institution/students/filters",
      opts(token),
    ),

  listStudents: (
    token: string,
    params?: Record<string, string | number | undefined>,
    signal?: AbortSignal,
  ) => {
    const qs = new URLSearchParams();
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== "") qs.set(k, String(v));
      }
    }
    const q = qs.toString();
    return apiRequest<{
      success: boolean;
      students: DirectoryStudent[];
      pagination: Pagination;
    }>(`/institution/students${q ? `?${q}` : ""}`, opts(token, signal));
  },

  getStudent: (token: string, id: string) =>
    apiRequest<{ success: boolean; student: ManagedStudent }>(
      `/institution/students/${id}`,
      opts(token),
    ),

  createStudent: (token: string, body: Record<string, unknown>) =>
    apiRequest<{ success: boolean; student: ManagedStudent }>(
      "/institution/students",
      { method: "POST", body, token },
    ),

  updateStudent: (token: string, id: string, body: Partial<ManagedStudent>) =>
    apiRequest<{ success: boolean; student: ManagedStudent }>(
      `/institution/students/${id}`,
      { method: "PATCH", body, token },
    ),

  addNote: (token: string, id: string, content: string, type?: string) =>
    apiRequest(`/institution/students/${id}/notes`, {
      method: "POST",
      body: { content, type },
      token,
    }),

  verifySkill: (token: string, id: string, skill: string) =>
    apiRequest<{ success: boolean; student: ManagedStudent }>(
      `/institution/students/${id}/verify-skill`,
      { method: "POST", body: { skill }, token },
    ),

  importStudents: (token: string, rows: Record<string, unknown>[]) =>
    apiRequest("/institution/students/import", {
      method: "POST",
      body: { rows },
      token,
    }),

  promoteSemester: (token: string, id: string) =>
    apiRequest<{ success: boolean; student: ManagedStudent }>(
      `/institution/students/${id}/promote`,
      { method: "POST", token },
    ),

  discoverTalent: (token: string, params?: Record<string, string | number | undefined>) => {
    const qs = new URLSearchParams();
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== "") qs.set(k, String(v));
      }
    }
    const q = qs.toString();
    return apiRequest<{
      success: boolean;
      students: Array<DirectoryStudent & { matchReasons?: string[] }>;
      pagination: Pagination;
    }>(`/institution/students/talent/discover${q ? `?${q}` : ""}`, opts(token));
  },

  smartSearch: (token: string, query: string, page = 1) =>
    apiRequest<{
      success: boolean;
      parsedFilters: Record<string, unknown>;
      parseReasons: string[];
      students: Array<DirectoryStudent & { matchReasons?: string[] }>;
      pagination: Pagination;
    }>("/institution/students/talent/smart-search", {
      method: "POST",
      body: { query, page, limit: 20 },
      token,
    }),

  previewImport: (token: string, rows: Record<string, unknown>[], mode: string) =>
    apiRequest<{ success: boolean; preview: ImportPreview }>(
      "/institution/students/import/preview",
      { method: "POST", body: { rows, mode }, token },
    ),

  confirmImport: (token: string, rows: Record<string, unknown>[], mode: string) =>
    apiRequest("/institution/students/import/confirm", {
      method: "POST",
      body: { rows, mode },
      token,
    }),

  bulkAction: (
    token: string,
    body: { action: string; studentIds: string[]; payload?: Record<string, unknown> },
  ) =>
    apiRequest("/institution/students/bulk", { method: "POST", body, token }),

  listCohorts: (token: string) =>
    apiRequest<{ success: boolean; cohorts: InstitutionCohort[] }>(
      "/institution/students/cohorts",
      opts(token),
    ),

  createCohort: (token: string, body: Record<string, unknown>) =>
    apiRequest("/institution/students/cohorts", { method: "POST", body, token }),

  listSavedFilters: (token: string) =>
    apiRequest<{ success: boolean; filters: SavedFilter[] }>(
      "/institution/students/saved-filters",
      opts(token),
    ),

  createSavedFilter: (token: string, body: Record<string, unknown>) =>
    apiRequest("/institution/students/saved-filters", { method: "POST", body, token }),

  getPlacementSummary: (token: string, id: string) =>
    apiRequest<{ success: boolean; summary: PlacementSummary }>(
      `/institution/students/${id}/placement-summary`,
      opts(token),
    ),

  verifyAchievement: (token: string, id: string, index: number) =>
    apiRequest(`/institution/students/${id}/achievements/${index}/verify`, {
      method: "POST",
      token,
    }),

  verifyCertificate: (token: string, id: string, index: number) =>
    apiRequest(`/institution/students/${id}/certificates/${index}/verify`, {
      method: "POST",
      token,
    }),

  updatePlacement: (token: string, id: string, body: Record<string, unknown>) =>
    apiRequest(`/institution/students/${id}/placement`, {
      method: "PATCH",
      body,
      token,
    }),

  getAuditLog: (token: string, id: string) =>
    apiRequest<{ success: boolean; audit: AuditEntry[] }>(
      `/institution/students/${id}/audit`,
      opts(token),
    ),
};

export type ImportPreview = {
  mode: string;
  summary: { total: number; valid: number; invalid: number; duplicates: number; warnings: number };
  validRows: Record<string, unknown>[];
  invalidRows: Array<{ rowIndex: number; errors: string[] }>;
  duplicates: Array<{ rowIndex: number; fullName: string; studentId: string }>;
  warnings: Array<{ rowIndex: number; message: string }>;
};

export type InstitutionCohort = {
  _id: string;
  name: string;
  description: string;
  type: "static" | "dynamic";
  studentIds: string[];
  filterConfig: Record<string, unknown>;
};

export type SavedFilter = {
  _id: string;
  name: string;
  description: string;
  filterConfig: Record<string, unknown>;
};

export type PlacementSummary = {
  resumeUploaded: boolean;
  projectsShared: number;
  certificatesShared: number;
  placementLifecycle: string;
  placementStatusSource: string;
  authorizedApplications: number;
  interviewReadiness: string;
  sharedSkillsCount: number;
  verifiedSkillsCount: number;
};

export type AuditEntry = {
  _id: string;
  action: string;
  description: string;
  previousState?: string;
  newState?: string;
  createdAt: string;
};

/** Map API directory row to ManagedStudent for existing table components */
export function mapDirectoryToManaged(d: DirectoryStudent): ManagedStudent {
  return {
    id: d.id,
    rollNumber: d.rollNumber,
    photoInitials: d.photoInitials,
    fullName: d.fullName,
    department: d.department,
    course: d.course,
    branch: d.department,
    semester: d.semester,
    section: d.section,
    academicYear: d.academicYear,
    admissionYear: "",
    batch: d.batch,
    admissionDate: "",
    email: d.email,
    phone: "",
    status: d.status as ManagedStudent["status"],
    gender: "prefer-not-to-say",
    dateOfBirth: "",
    bloodGroup: "",
    nationality: "",
    address: "",
    city: "",
    state: "",
    country: "",
    emergencyContact: "",
    guardian: {
      fatherName: "",
      motherName: "",
      guardianName: "",
      occupation: "",
      email: "",
      phone: "",
      address: "",
    },
    creditsEarned: 0,
    currentSubjects: [],
    cgpa: 0,
    backlogs: 0,
    expectedGraduation: "",
    academicAdvisor: "",
    attendance: 0,
    performance: [],
    technicalSkills: d.sharedSkills,
    softSkills: [],
    programmingLanguages: [],
    languagesKnown: [],
    projects: d.sharedProjectsSummary.map((title, i) => ({
      id: `p-${i}`,
      title,
      role: "",
      technologies: [],
      status: "in-progress" as const,
    })),
    internships: [],
    certifications: [],
    researchPapers: [],
    achievements: [],
    documents: [],
    placement: {
      status: d.placementStatus as ManagedStudent["placement"]["status"],
      resumeUploaded: false,
      resumeScore: 0,
      internshipsCompleted: 0,
      jobsApplied: 0,
      interviewProgress: "",
      offerStatus: "",
      readiness: 0,
      careerScore: 0,
    },
    scholarshipStatus: "none",
    notes: [],
  };
}
