import { STORAGE_KEYS } from "@/constants/storage";

const INSTITUTION_KEYS = [
  STORAGE_KEYS.institutionData,
  STORAGE_KEYS.institutionAdmissions,
  STORAGE_KEYS.institutionStudents,
  STORAGE_KEYS.institutionFaculty,
  STORAGE_KEYS.institutionAcademics,
  STORAGE_KEYS.institutionPlacements,
  STORAGE_KEYS.institutionCampus,
] as const;

/** Remove browser-cached institution demo datasets. */
export function clearInstitutionDemoCache(): void {
  if (typeof window === "undefined") return;
  for (const key of INSTITUTION_KEYS) {
    window.localStorage.removeItem(key);
  }
}
