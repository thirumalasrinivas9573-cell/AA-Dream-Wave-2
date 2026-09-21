import type { AcademicState } from "@/types/academic-management";
import type { CampusState } from "@/types/campus-management";
import type { PlacementState } from "@/types/placement-management";
import type { InstitutionState } from "@/types/institution";

export const EMPTY_INSTITUTION_STATE: InstitutionState = {
  profile: {
    name: "",
    type: "college",
    code: "",
    email: "",
    phone: "",
    website: "",
    address: "",
    city: "",
    state: "",
    country: "",
    accreditation: "",
    establishedYear: "",
    description: "",
  },
  settings: {
    timezone: "Asia/Kolkata",
    academicYear: "2026-27",
    allowSelfEnrollment: false,
    notifyParents: true,
    defaultLanguage: "en",
  },
  departments: [],
  branches: [],
  courses: [],
  subjects: [],
  teachers: [],
  students: [],
  classes: [],
  members: [],
  notifications: [],
};

export const EMPTY_ACADEMIC_STATE: AcademicState = {
  departments: [],
  programs: [],
  courses: [],
  subjects: [],
  semesters: [],
  curriculum: [],
  calendar: [],
};

export const EMPTY_CAMPUS_STATE: CampusState = {
  announcements: [],
  events: [],
  clubs: [],
  albums: [],
  news: [],
};

export const EMPTY_PLACEMENT_STATE: PlacementState = {
  recruiters: [],
  drives: [],
  internships: [],
  jobs: [],
  applications: [],
  interviews: [],
  offers: [],
};
