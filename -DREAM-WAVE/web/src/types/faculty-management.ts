export type FacultyStatus = "active" | "inactive" | "on-leave";
export type FacultyEmploymentType =
  | "full-time"
  | "part-time"
  | "contract"
  | "guest";

export type FacultyDocument = {
  id: string;
  name:
    | "Resume"
    | "Qualification Certificates"
    | "Experience Certificates"
    | "Identity Proof"
    | "Joining Letter"
    | "Promotion Orders"
    | "Training Certificates";
  status: "verified" | "pending" | "missing";
  fileName?: string;
};

export type FacultyPublication = {
  id: string;
  title: string;
  type: "journal" | "conference" | "book" | "patent";
  publisher: string;
  year: string;
};

export type FacultyProject = {
  id: string;
  title: string;
  role: string;
  funding: string;
  status: "active" | "completed";
};

export type ManagedFaculty = {
  id: string;
  photoInitials: string;
  fullName: string;
  designation: string;
  staffCategory: "teaching" | "non-teaching";
  department: string;
  highestQualification: string;
  university: string;
  specialization: string;
  totalExperience: number;
  teachingExperience: number;
  industryExperience: number;
  email: string;
  phone: string;
  employmentType: FacultyEmploymentType;
  joiningDate: string;
  status: FacultyStatus;
  officeLocation: string;
  professionalCertifications: string[];
  researchAreas: string[];
  subjects: Array<{
    id: string;
    name: string;
    semester: string;
    department: string;
    academicYear: string;
    classAllocation: string;
    laboratoryAllocation: string;
  }>;
  mentoringStudents: number;
  researchPapers: string[];
  journals: string[];
  conferences: string[];
  patents: string[];
  booksPublished: string[];
  fundedProjects: FacultyProject[];
  researchCollaborations: string[];
  projects: FacultyProject[];
  publications: FacultyPublication[];
  achievements: string[];
  certificates: string[];
  documents: FacultyDocument[];
  workload: {
    weeklyTeachingHours: number;
    assignedSubjects: number;
    mentoringStudents: number;
    committeeResponsibilities: string[];
    administrativeDuties: string[];
    labResponsibilities: string[];
  };
  attendance: number;
  performance: number[];
  notes: Array<{
    id: string;
    text: string;
    author: string;
    createdAt: string;
  }>;
};

export type FacultyFilters = {
  department: string;
  designation: string;
  employmentType: string;
  qualification: string;
  experience: string;
  status: string;
  joiningYear: string;
  specialization: string;
};

export type FacultySortField =
  | "id"
  | "fullName"
  | "designation"
  | "department"
  | "highestQualification"
  | "totalExperience"
  | "joiningDate"
  | "status";
