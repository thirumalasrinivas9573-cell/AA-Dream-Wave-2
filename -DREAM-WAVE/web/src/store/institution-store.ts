"use client";

import { EMPTY_INSTITUTION_STATE } from "@/constants/institution-empty-state";
import { INSTITUTION_SEED } from "@/constants/institution-seed";
import { STORAGE_KEYS } from "@/constants/storage";
import { isInstitutionDemoDataEnabled } from "@/lib/institution-data-mode";
import { createAppStore } from "@/store";
import type {
  Branch,
  ClassSection,
  Course,
  Department,
  InstitutionNotification,
  InstitutionProfile,
  InstitutionSettings,
  InstitutionState,
  InstitutionStudent,
  Member,
  Subject,
  Teacher,
} from "@/types/institution";
import {
  getJsonStorageItem,
  setJsonStorageItem,
} from "@/utils/storage";

function createId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function loadState(): InstitutionState {
  const stored = getJsonStorageItem<InstitutionState>(
    STORAGE_KEYS.institutionData,
  );
  if (stored?.profile?.name) {
    return stored;
  }
  return structuredClone(
    isInstitutionDemoDataEnabled() ? INSTITUTION_SEED : EMPTY_INSTITUTION_STATE,
  );
}

function persist(state: InstitutionState) {
  setJsonStorageItem(STORAGE_KEYS.institutionData, state);
}

type InstitutionStore = InstitutionState & {
  hydrated: boolean;
  hydrate: () => void;
  updateProfile: (profile: Partial<InstitutionProfile>) => void;
  updateSettings: (settings: Partial<InstitutionSettings>) => void;
  upsertDepartment: (item: Omit<Department, "id"> & { id?: string }) => void;
  removeDepartment: (id: string) => void;
  upsertBranch: (item: Omit<Branch, "id"> & { id?: string }) => void;
  removeBranch: (id: string) => void;
  upsertCourse: (item: Omit<Course, "id"> & { id?: string }) => void;
  removeCourse: (id: string) => void;
  upsertSubject: (item: Omit<Subject, "id"> & { id?: string }) => void;
  removeSubject: (id: string) => void;
  upsertTeacher: (item: Omit<Teacher, "id"> & { id?: string }) => void;
  removeTeacher: (id: string) => void;
  upsertStudent: (
    item: Omit<InstitutionStudent, "id"> & { id?: string },
  ) => void;
  removeStudent: (id: string) => void;
  upsertClass: (item: Omit<ClassSection, "id"> & { id?: string }) => void;
  removeClass: (id: string) => void;
  upsertMember: (item: Omit<Member, "id"> & { id?: string }) => void;
  removeMember: (id: string) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  addNotification: (
    item: Omit<InstitutionNotification, "id" | "createdAt" | "read">,
  ) => void;
};

function withPersist(
  get: () => InstitutionStore,
  patch: Partial<InstitutionState>,
) {
  const next = { ...get(), ...patch };
  persist({
    profile: next.profile,
    settings: next.settings,
    departments: next.departments,
    branches: next.branches,
    courses: next.courses,
    subjects: next.subjects,
    teachers: next.teachers,
    students: next.students,
    classes: next.classes,
    members: next.members,
    notifications: next.notifications,
  });
  return patch;
}

export const useInstitutionStore = createAppStore<InstitutionStore>(
  (set, get) => ({
    ...structuredClone(
      isInstitutionDemoDataEnabled() ? INSTITUTION_SEED : EMPTY_INSTITUTION_STATE,
    ),
    hydrated: false,
    hydrate: () => {
      const data = loadState();
      set({ ...data, hydrated: true });
    },
    updateProfile: (profile) => {
      set((state) => {
        const nextProfile = { ...state.profile, ...profile };
        return withPersist(get, { profile: nextProfile });
      });
    },
    updateSettings: (settings) => {
      set((state) => {
        const nextSettings = { ...state.settings, ...settings };
        return withPersist(get, { settings: nextSettings });
      });
    },
    upsertDepartment: (item) => {
      set((state) => {
        const departments = item.id
          ? state.departments.map((row) =>
              row.id === item.id ? { ...row, ...item, id: item.id } : row,
            )
          : [
              ...state.departments,
              {
                ...item,
                id: createId("dept"),
              } as Department,
            ];
        return withPersist(get, { departments });
      });
    },
    removeDepartment: (id) => {
      set((state) =>
        withPersist(get, {
          departments: state.departments.filter((row) => row.id !== id),
        }),
      );
    },
    upsertBranch: (item) => {
      set((state) => {
        const branches = item.id
          ? state.branches.map((row) =>
              row.id === item.id ? { ...row, ...item, id: item.id } : row,
            )
          : [...state.branches, { ...item, id: createId("br") } as Branch];
        return withPersist(get, { branches });
      });
    },
    removeBranch: (id) => {
      set((state) =>
        withPersist(get, {
          branches: state.branches.filter((row) => row.id !== id),
        }),
      );
    },
    upsertCourse: (item) => {
      set((state) => {
        const courses = item.id
          ? state.courses.map((row) =>
              row.id === item.id ? { ...row, ...item, id: item.id } : row,
            )
          : [...state.courses, { ...item, id: createId("crs") } as Course];
        return withPersist(get, { courses });
      });
    },
    removeCourse: (id) => {
      set((state) =>
        withPersist(get, {
          courses: state.courses.filter((row) => row.id !== id),
        }),
      );
    },
    upsertSubject: (item) => {
      set((state) => {
        const subjects = item.id
          ? state.subjects.map((row) =>
              row.id === item.id ? { ...row, ...item, id: item.id } : row,
            )
          : [...state.subjects, { ...item, id: createId("sub") } as Subject];
        return withPersist(get, { subjects });
      });
    },
    removeSubject: (id) => {
      set((state) =>
        withPersist(get, {
          subjects: state.subjects.filter((row) => row.id !== id),
        }),
      );
    },
    upsertTeacher: (item) => {
      set((state) => {
        const teachers = item.id
          ? state.teachers.map((row) =>
              row.id === item.id ? { ...row, ...item, id: item.id } : row,
            )
          : [...state.teachers, { ...item, id: createId("tch") } as Teacher];
        return withPersist(get, { teachers });
      });
    },
    removeTeacher: (id) => {
      set((state) =>
        withPersist(get, {
          teachers: state.teachers.filter((row) => row.id !== id),
        }),
      );
    },
    upsertStudent: (item) => {
      set((state) => {
        const students = item.id
          ? state.students.map((row) =>
              row.id === item.id ? { ...row, ...item, id: item.id } : row,
            )
          : [
              ...state.students,
              { ...item, id: createId("stu") } as InstitutionStudent,
            ];
        return withPersist(get, { students });
      });
    },
    removeStudent: (id) => {
      set((state) =>
        withPersist(get, {
          students: state.students.filter((row) => row.id !== id),
        }),
      );
    },
    upsertClass: (item) => {
      set((state) => {
        const classes = item.id
          ? state.classes.map((row) =>
              row.id === item.id ? { ...row, ...item, id: item.id } : row,
            )
          : [
              ...state.classes,
              { ...item, id: createId("cls") } as ClassSection,
            ];
        return withPersist(get, { classes });
      });
    },
    removeClass: (id) => {
      set((state) =>
        withPersist(get, {
          classes: state.classes.filter((row) => row.id !== id),
        }),
      );
    },
    upsertMember: (item) => {
      set((state) => {
        const members = item.id
          ? state.members.map((row) =>
              row.id === item.id ? { ...row, ...item, id: item.id } : row,
            )
          : [...state.members, { ...item, id: createId("mem") } as Member];
        return withPersist(get, { members });
      });
    },
    removeMember: (id) => {
      set((state) =>
        withPersist(get, {
          members: state.members.filter((row) => row.id !== id),
        }),
      );
    },
    markNotificationRead: (id) => {
      set((state) =>
        withPersist(get, {
          notifications: state.notifications.map((row) =>
            row.id === id ? { ...row, read: true } : row,
          ),
        }),
      );
    },
    markAllNotificationsRead: () => {
      set((state) =>
        withPersist(get, {
          notifications: state.notifications.map((row) => ({
            ...row,
            read: true,
          })),
        }),
      );
    },
    addNotification: (item) => {
      set((state) =>
        withPersist(get, {
          notifications: [
            {
              ...item,
              id: createId("ntf"),
              createdAt: new Date().toISOString(),
              read: false,
            },
            ...state.notifications,
          ],
        }),
      );
    },
  }),
);
