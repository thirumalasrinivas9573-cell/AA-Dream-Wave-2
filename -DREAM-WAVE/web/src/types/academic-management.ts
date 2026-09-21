export type AcademicStatus = "active" | "inactive" | "draft";

export type ProgramLevel =
  | "undergraduate"
  | "postgraduate"
  | "diploma"
  | "certificate"
  | "integrated"
  | "bootcamp"
  | "training";

export type AcademicDepartment = {
  id: string;
  name: string;
  code: string;
  logoInitials: string;
  description: string;
  hod: string;
  vision: string;
  mission: string;
  facultyCount: number;
  studentCount: number;
  status: AcademicStatus;
};

export type AcademicProgram = {
  id: string;
  name: string;
  level: ProgramLevel;
  duration: string;
  credits: number;
  eligibility: string;
  departmentId: string;
  status: AcademicStatus;
};

export type AcademicCourse = {
  id: string;
  name: string;
  code: string;
  departmentId: string;
  semester: string;
  credits: number;
  theoryHours: number;
  practicalHours: number;
  facultyAssigned: string;
  prerequisites: string;
  status: AcademicStatus;
};

export type AcademicSubject = {
  id: string;
  name: string;
  code: string;
  semester: string;
  credits: number;
  faculty: string;
  labRequired: boolean;
  elective: boolean;
  description: string;
};

export type AcademicSemester = {
  id: string;
  number: number;
  academicYear: string;
  duration: string;
  startDate: string;
  endDate: string;
  subjectsIncluded: number;
  credits: number;
  status: AcademicStatus;
};

export type CurriculumComponent = {
  id: string;
  semester: string;
  subject: string;
  type: "core" | "elective" | "lab" | "project" | "internship";
  credits: number;
};

export type AcademicCalendarEvent = {
  id: string;
  title: string;
  type:
    | "semester-start"
    | "semester-end"
    | "examination"
    | "internal-exam"
    | "assignment"
    | "workshop"
    | "holiday"
    | "event";
  date: string;
  academicYear: string;
};

export type AcademicState = {
  departments: AcademicDepartment[];
  programs: AcademicProgram[];
  courses: AcademicCourse[];
  subjects: AcademicSubject[];
  semesters: AcademicSemester[];
  curriculum: CurriculumComponent[];
  calendar: AcademicCalendarEvent[];
};

export type AcademicEntityKind =
  | "departments"
  | "programs"
  | "courses"
  | "subjects"
  | "semesters";
