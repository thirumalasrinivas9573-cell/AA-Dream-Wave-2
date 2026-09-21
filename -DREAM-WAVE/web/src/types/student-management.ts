export type ManagedStudentStatus =
  | "active"
  | "inactive"
  | "graduated"
  | "suspended";

export type PlacementStatus =
  | "not-started"
  | "preparing"
  | "placement-ready"
  | "interviewing"
  | "placed";

export type ScholarshipStatus = "none" | "applied" | "approved";
export type StudentDocumentStatus = "verified" | "pending" | "missing";

export type StudentDocument = {
  id: string;
  name:
    | "10th Certificate"
    | "12th Certificate"
    | "Transfer Certificate"
    | "Migration Certificate"
    | "Community Certificate"
    | "Income Certificate"
    | "Identity Proof"
    | "Passport Photo"
    | "Student ID Card";
  status: StudentDocumentStatus;
  fileName?: string;
};

export type StudentProject = {
  id: string;
  title: string;
  role: string;
  technologies: string[];
  status: "completed" | "in-progress";
};

export type StudentCertificate = {
  id: string;
  title: string;
  category:
    | "academic"
    | "competition"
    | "workshop"
    | "internship"
    | "sports"
    | "research";
  issuer: string;
  issuedAt: string;
};

export type ManagedStudent = {
  id: string;
  rollNumber: string;
  photoInitials: string;
  fullName: string;
  department: string;
  course: string;
  branch: string;
  semester: string;
  section: string;
  academicYear: string;
  admissionYear: string;
  batch: string;
  admissionDate: string;
  email: string;
  phone: string;
  status: ManagedStudentStatus;
  gender: "female" | "male" | "non-binary" | "prefer-not-to-say";
  dateOfBirth: string;
  bloodGroup: string;
  nationality: string;
  address: string;
  city: string;
  state: string;
  country: string;
  emergencyContact: string;
  guardian: {
    fatherName: string;
    motherName: string;
    guardianName: string;
    occupation: string;
    email: string;
    phone: string;
    address: string;
  };
  creditsEarned: number;
  currentSubjects: string[];
  cgpa: number;
  backlogs: number;
  expectedGraduation: string;
  academicAdvisor: string;
  attendance: number;
  performance: number[];
  technicalSkills: string[];
  softSkills: string[];
  programmingLanguages: string[];
  languagesKnown: string[];
  projects: StudentProject[];
  internships: string[];
  certifications: StudentCertificate[];
  researchPapers: string[];
  achievements: string[];
  documents: StudentDocument[];
  placement: {
    status: PlacementStatus;
    resumeUploaded: boolean;
    resumeScore: number;
    internshipsCompleted: number;
    jobsApplied: number;
    interviewProgress: string;
    offerStatus: string;
    readiness: number;
    careerScore: number;
  };
  scholarshipStatus: ScholarshipStatus;
  notes: Array<{
    id: string;
    text: string;
    type?: string;
    author: string;
    createdAt: string;
  }>;
  adminTags?: string[];
};

export type StudentManagementFilters = {
  department: string;
  course: string;
  semester: string;
  section: string;
  academicYear: string;
  admissionYear: string;
  gender: string;
  status: string;
  placementStatus: string;
  scholarshipStatus: string;
};

export type StudentSortField =
  | "id"
  | "rollNumber"
  | "fullName"
  | "department"
  | "course"
  | "semester"
  | "status";
