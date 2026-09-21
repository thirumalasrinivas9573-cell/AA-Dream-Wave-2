"use client";

import { STORAGE_KEYS } from "@/constants/storage";
import { STUDENT_MANAGEMENT_SEED } from "@/constants/student-management-seed";
import {
  institutionStudentsApi,
  mapDirectoryToManaged,
  type FilterOptions,
  type StudentStats,
} from "@/lib/api/institution-students";
import { isInstitutionDemoDataEnabled } from "@/lib/institution-data-mode";
import { createAppStore } from "@/store";
import type {
  ManagedStudent,
  ManagedStudentStatus,
} from "@/types/student-management";
import { getJsonStorageItem, setJsonStorageItem } from "@/utils/storage";

type StudentImportRow = Pick<
  ManagedStudent,
  | "fullName"
  | "email"
  | "phone"
  | "department"
  | "course"
  | "semester"
  | "section"
  | "gender"
>;

type StudentManagementStore = {
  students: ManagedStudent[];
  hydrated: boolean;
  apiEnabled: boolean;
  loading: boolean;
  error: string | null;
  stats: StudentStats | null;
  filterOptions: FilterOptions | null;
  pagination: { page: number; pageCount: number; total: number };
  hydrate: () => void;
  fetchStudents: (
    token: string,
    filters?: Record<string, string | number | undefined>,
    signal?: AbortSignal,
  ) => Promise<void>;
  fetchStudent: (token: string, id: string) => Promise<ManagedStudent | null>;
  fetchOverview: (token: string) => Promise<void>;
  updateStudent: (id: string, patch: Partial<ManagedStudent>, token?: string) => Promise<void>;
  transferStudent: (
    id: string,
    department: string,
    course: string,
    section: string,
    token?: string,
  ) => Promise<void>;
  promoteSemester: (id: string, token?: string) => Promise<void>;
  updateStatus: (id: string, status: ManagedStudentStatus, token?: string) => Promise<void>;
  addNote: (id: string, text: string, author: string, token?: string, noteType?: string) => Promise<void>;
  importStudents: (rows: StudentImportRow[], token?: string) => Promise<number>;
  verifySkill: (id: string, skill: string, token?: string) => Promise<void>;
};

function persist(students: ManagedStudent[]) {
  setJsonStorageItem(STORAGE_KEYS.institutionStudents, students);
}

export const useStudentManagementStore = createAppStore<StudentManagementStore>(
  (set, get) => ({
    students: isInstitutionDemoDataEnabled() ? STUDENT_MANAGEMENT_SEED : [],
    hydrated: false,
    apiEnabled: false,
    loading: false,
    error: null,
    stats: null,
    filterOptions: null,
    pagination: { page: 1, pageCount: 1, total: 0 },

    hydrate: () => {
      if (get().hydrated) return;
      const stored = getJsonStorageItem<ManagedStudent[]>(
        STORAGE_KEYS.institutionStudents,
      );
      set({
        students:
          Array.isArray(stored) && stored.length
            ? stored
            : isInstitutionDemoDataEnabled()
              ? STUDENT_MANAGEMENT_SEED
              : [],
        hydrated: true,
        apiEnabled: false,
      });
    },

    fetchOverview: async (token) => {
      set({ loading: true, error: null, apiEnabled: true });
      try {
        const [statsRes, filtersRes] = await Promise.all([
          institutionStudentsApi.getStats(token),
          institutionStudentsApi.getFilterOptions(token),
        ]);
        set({
          stats: statsRes.stats,
          filterOptions: filtersRes.options,
          loading: false,
        });
      } catch (err) {
        set({
          loading: false,
          error: err instanceof Error ? err.message : "Failed to load student data",
        });
      }
    },

    fetchStudents: async (token, filters, signal) => {
      set({ loading: true, error: null, apiEnabled: true });
      try {
        const res = await institutionStudentsApi.listStudents(token, filters, signal);
        set({
          students: res.students.map(mapDirectoryToManaged),
          pagination: res.pagination,
          loading: false,
        });
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
        set({
          loading: false,
          error: err instanceof Error ? err.message : "Failed to load students",
        });
      }
    },

    fetchStudent: async (token, id) => {
      try {
        set({ apiEnabled: true });
        const res = await institutionStudentsApi.getStudent(token, id);
        const student = res.student;
        set((state) => ({
          students: state.students.some((s) => s.id === id)
            ? state.students.map((s) => (s.id === id ? student : s))
            : [...state.students, student],
        }));
        return student;
      } catch {
        return null;
      }
    },

    updateStudent: async (id, patch, token) => {
      if (token && get().apiEnabled) {
        const res = await institutionStudentsApi.updateStudent(token, id, patch);
        set((state) => ({
          students: state.students.map((s) => (s.id === id ? res.student : s)),
        }));
        return;
      }
      const students = get().students.map((s) =>
        s.id === id ? { ...s, ...patch } : s,
      );
      persist(students);
      set({ students });
    },

    transferStudent: async (id, department, course, section, token) => {
      await get().updateStudent(
        id,
        { department, course, branch: department, section },
        token,
      );
    },

    promoteSemester: async (id, token) => {
      if (token && get().apiEnabled) {
        const res = await institutionStudentsApi.promoteSemester(token, id);
        set((state) => ({
          students: state.students.map((s) => (s.id === id ? res.student : s)),
        }));
        return;
      }
      const students = get().students.map((student) => {
        if (student.id !== id) return student;
        const current = Number(student.semester.match(/\d+/)?.[0] ?? 1);
        const next = Math.min(8, current + 1);
        return {
          ...student,
          semester: `Semester ${next}`,
          status:
            next === 8 && current === 8
              ? ("graduated" as const)
              : student.status,
        };
      });
      persist(students);
      set({ students });
    },

    updateStatus: async (id, status, token) => {
      await get().updateStudent(id, { status }, token);
    },

    addNote: async (id, text, author, token, noteType = "internal") => {
      if (token && get().apiEnabled) {
        await institutionStudentsApi.addNote(token, id, text, noteType);
        await get().fetchStudent(token, id);
        return;
      }
      const students = get().students.map((student) =>
        student.id === id
          ? {
              ...student,
              notes: [
                {
                  id: `note-${Date.now().toString(36)}`,
                  text,
                  author,
                  createdAt: new Date().toISOString(),
                },
                ...student.notes,
              ],
            }
          : student,
      );
      persist(students);
      set({ students });
    },

    importStudents: async (rows, token) => {
      if (token && get().apiEnabled) {
        const res = (await institutionStudentsApi.importStudents(token, rows)) as {
          results: Array<{ error?: string }>;
        };
        const created = res.results.filter((r) => !r.error).length;
        await get().fetchStudents(token, { page: 1, limit: 20 });
        return created;
      }
      const created = rows.map((row, index) => ({
        ...STUDENT_MANAGEMENT_SEED[0],
        id: `STU-IMP-${Date.now()}-${index}`,
        rollNumber: `IMP-${index + 1}`,
        fullName: row.fullName,
        email: row.email,
        phone: row.phone,
        department: row.department,
        course: row.course,
        semester: row.semester,
        section: row.section,
        gender: row.gender,
        photoInitials: row.fullName
          .split(" ")
          .map((p) => p[0])
          .join("")
          .slice(0, 2)
          .toUpperCase(),
      })) as ManagedStudent[];
      const students = [...get().students, ...created];
      persist(students);
      set({ students });
      return created.length;
    },

    verifySkill: async (id, skill, token) => {
      if (!token || !get().apiEnabled) return;
      const res = await institutionStudentsApi.verifySkill(token, id, skill);
      set((state) => ({
        students: state.students.map((s) => (s.id === id ? res.student : s)),
      }));
    },
  }),
);
