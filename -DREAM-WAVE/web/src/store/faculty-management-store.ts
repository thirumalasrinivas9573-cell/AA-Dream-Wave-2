"use client";

import { FACULTY_MANAGEMENT_SEED } from "@/constants/faculty-management-seed";
import { STORAGE_KEYS } from "@/constants/storage";
import { isInstitutionDemoDataEnabled } from "@/lib/institution-data-mode";
import { createAppStore } from "@/store";
import type {
  FacultyStatus,
  ManagedFaculty,
} from "@/types/faculty-management";
import { getJsonStorageItem, setJsonStorageItem } from "@/utils/storage";

export type FacultyFormInput = Pick<
  ManagedFaculty,
  | "fullName"
  | "designation"
  | "staffCategory"
  | "department"
  | "highestQualification"
  | "specialization"
  | "totalExperience"
  | "email"
  | "phone"
  | "employmentType"
  | "joiningDate"
  | "officeLocation"
>;

type FacultyManagementStore = {
  faculty: ManagedFaculty[];
  hydrated: boolean;
  hydrate: () => void;
  addFaculty: (input: FacultyFormInput) => ManagedFaculty;
  updateFaculty: (id: string, patch: Partial<ManagedFaculty>) => void;
  transferDepartment: (id: string, department: string) => void;
  assignSubject: (id: string, subject: string, semester: string) => void;
  assignMentor: (id: string, students: number) => void;
  updateStatus: (id: string, status: FacultyStatus) => void;
  addNote: (id: string, text: string, author: string) => void;
};

function persist(faculty: ManagedFaculty[]) {
  setJsonStorageItem(STORAGE_KEYS.institutionFaculty, faculty);
}

export const useFacultyManagementStore =
  createAppStore<FacultyManagementStore>((set, get) => ({
    faculty: isInstitutionDemoDataEnabled() ? FACULTY_MANAGEMENT_SEED : [],
    hydrated: false,
    hydrate: () => {
      const stored = getJsonStorageItem<ManagedFaculty[]>(
        STORAGE_KEYS.institutionFaculty,
      );
      set({
        faculty:
          Array.isArray(stored) && stored.length
            ? stored
            : isInstitutionDemoDataEnabled()
              ? FACULTY_MANAGEMENT_SEED
              : [],
        hydrated: true,
      });
    },
    addFaculty: (input) => {
      const template = structuredClone(FACULTY_MANAGEMENT_SEED[0]!);
      const sequence = String(Date.now() % 10000).padStart(4, "0");
      const record: ManagedFaculty = {
        ...template,
        ...input,
        id: `FAC-${new Date().getFullYear()}-${sequence}`,
        photoInitials: input.fullName
          .split(" ")
          .map((part) => part[0])
          .join("")
          .slice(0, 2)
          .toUpperCase(),
        status: "active",
        teachingExperience:
          input.staffCategory === "teaching"
            ? Math.max(0, input.totalExperience - 2)
            : 0,
        industryExperience:
          input.staffCategory === "teaching" ? 2 : input.totalExperience,
        subjects: [],
        mentoringStudents: 0,
        researchPapers: [],
        journals: [],
        conferences: [],
        patents: [],
        booksPublished: [],
        fundedProjects: [],
        researchCollaborations: [],
        projects: [],
        publications: [],
        achievements: [],
        certificates: [],
        notes: [],
      };
      const faculty = [record, ...get().faculty];
      persist(faculty);
      set({ faculty });
      return record;
    },
    updateFaculty: (id, patch) => {
      const faculty = get().faculty.map((record) =>
        record.id === id ? { ...record, ...patch } : record,
      );
      persist(faculty);
      set({ faculty });
    },
    transferDepartment: (id, department) => {
      const faculty = get().faculty.map((record) =>
        record.id === id ? { ...record, department } : record,
      );
      persist(faculty);
      set({ faculty });
    },
    assignSubject: (id, subject, semester) => {
      const faculty = get().faculty.map((record) =>
        record.id === id
          ? {
              ...record,
              subjects: [
                ...record.subjects,
                {
                  id: `${id}-subject-${Date.now().toString(36)}`,
                  name: subject,
                  semester,
                  department: record.department,
                  academicYear: "2026-27",
                  classAllocation: "To be assigned",
                  laboratoryAllocation: "To be assigned",
                },
              ],
              workload: {
                ...record.workload,
                assignedSubjects: record.workload.assignedSubjects + 1,
              },
            }
          : record,
      );
      persist(faculty);
      set({ faculty });
    },
    assignMentor: (id, students) => {
      const faculty = get().faculty.map((record) =>
        record.id === id
          ? {
              ...record,
              mentoringStudents: students,
              workload: { ...record.workload, mentoringStudents: students },
            }
          : record,
      );
      persist(faculty);
      set({ faculty });
    },
    updateStatus: (id, status) => {
      const faculty = get().faculty.map((record) =>
        record.id === id ? { ...record, status } : record,
      );
      persist(faculty);
      set({ faculty });
    },
    addNote: (id, text, author) => {
      const faculty = get().faculty.map((record) =>
        record.id === id
          ? {
              ...record,
              notes: [
                {
                  id: `note-${Date.now().toString(36)}`,
                  text,
                  author,
                  createdAt: new Date().toISOString(),
                },
                ...record.notes,
              ],
            }
          : record,
      );
      persist(faculty);
      set({ faculty });
    },
  }));
