"use client";

import { ACADEMIC_SEED } from "@/constants/academic-management-seed";
import { EMPTY_ACADEMIC_STATE } from "@/constants/institution-empty-state";
import { STORAGE_KEYS } from "@/constants/storage";
import { isInstitutionDemoDataEnabled } from "@/lib/institution-data-mode";
import { createAppStore } from "@/store";
import type {
  AcademicCalendarEvent,
  AcademicCourse,
  AcademicDepartment,
  AcademicProgram,
  AcademicSemester,
  AcademicState,
  AcademicSubject,
  CurriculumComponent,
} from "@/types/academic-management";
import { getJsonStorageItem, setJsonStorageItem } from "@/utils/storage";

type AcademicManagementStore = AcademicState & {
  hydrated: boolean;
  hydrate: () => void;
  upsertDepartment: (record: AcademicDepartment) => void;
  removeDepartment: (id: string) => void;
  upsertProgram: (record: AcademicProgram) => void;
  removeProgram: (id: string) => void;
  upsertCourse: (record: AcademicCourse) => void;
  removeCourse: (id: string) => void;
  upsertSubject: (record: AcademicSubject) => void;
  removeSubject: (id: string) => void;
  upsertSemester: (record: AcademicSemester) => void;
  removeSemester: (id: string) => void;
  upsertCurriculum: (record: CurriculumComponent) => void;
  removeCurriculum: (id: string) => void;
  addCalendarEvent: (record: AcademicCalendarEvent) => void;
  removeCalendarEvent: (id: string) => void;
};

function persist(state: AcademicState) {
  setJsonStorageItem(STORAGE_KEYS.institutionAcademics, state);
}

function snapshot(store: AcademicManagementStore): AcademicState {
  return {
    departments: store.departments,
    programs: store.programs,
    courses: store.courses,
    subjects: store.subjects,
    semesters: store.semesters,
    curriculum: store.curriculum,
    calendar: store.calendar,
  };
}

function upsertById<T extends { id: string }>(list: T[], record: T): T[] {
  const exists = list.some((item) => item.id === record.id);
  return exists
    ? list.map((item) => (item.id === record.id ? record : item))
    : [record, ...list];
}

export const useAcademicManagementStore =
  createAppStore<AcademicManagementStore>((set, get) => {
    const commit = (patch: Partial<AcademicState>) => {
      set(patch);
      persist(snapshot({ ...get(), ...patch } as AcademicManagementStore));
    };

    return {
      ...(isInstitutionDemoDataEnabled() ? ACADEMIC_SEED : EMPTY_ACADEMIC_STATE),
      hydrated: false,
      hydrate: () => {
        const stored = getJsonStorageItem<AcademicState>(
          STORAGE_KEYS.institutionAcademics,
        );
        set(
          stored && Array.isArray(stored.departments)
            ? { ...stored, hydrated: true }
            : {
                ...(isInstitutionDemoDataEnabled()
                  ? ACADEMIC_SEED
                  : EMPTY_ACADEMIC_STATE),
                hydrated: true,
              },
        );
      },
      upsertDepartment: (record) =>
        commit({ departments: upsertById(get().departments, record) }),
      removeDepartment: (id) =>
        commit({ departments: get().departments.filter((item) => item.id !== id) }),
      upsertProgram: (record) =>
        commit({ programs: upsertById(get().programs, record) }),
      removeProgram: (id) =>
        commit({ programs: get().programs.filter((item) => item.id !== id) }),
      upsertCourse: (record) =>
        commit({ courses: upsertById(get().courses, record) }),
      removeCourse: (id) =>
        commit({ courses: get().courses.filter((item) => item.id !== id) }),
      upsertSubject: (record) =>
        commit({ subjects: upsertById(get().subjects, record) }),
      removeSubject: (id) =>
        commit({ subjects: get().subjects.filter((item) => item.id !== id) }),
      upsertSemester: (record) =>
        commit({ semesters: upsertById(get().semesters, record) }),
      removeSemester: (id) =>
        commit({ semesters: get().semesters.filter((item) => item.id !== id) }),
      upsertCurriculum: (record) =>
        commit({ curriculum: upsertById(get().curriculum, record) }),
      removeCurriculum: (id) =>
        commit({ curriculum: get().curriculum.filter((item) => item.id !== id) }),
      addCalendarEvent: (record) =>
        commit({ calendar: upsertById(get().calendar, record) }),
      removeCalendarEvent: (id) =>
        commit({ calendar: get().calendar.filter((item) => item.id !== id) }),
    };
  });
