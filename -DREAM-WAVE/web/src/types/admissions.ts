export type AdmissionStatus =
  | "pending"
  | "document-verification"
  | "interview-scheduled"
  | "under-review"
  | "approved"
  | "rejected"
  | "waiting-list"
  | "enrolled";

export type DocumentStatus = "verified" | "pending" | "missing";
export type InterviewMode = "online" | "offline";
export type InterviewStatus =
  | "not-scheduled"
  | "scheduled"
  | "completed"
  | "cancelled";

export type AcademicRecord = {
  level: "10th" | "12th" | "diploma" | "degree" | "entrance-exam";
  institution: string;
  board: string;
  year: string;
  score: string;
  specialization: string;
};

export type AdmissionDocument = {
  id: string;
  name:
    | "10th Memo"
    | "12th Memo"
    | "Degree Certificate"
    | "Transfer Certificate"
    | "Migration Certificate"
    | "Community Certificate"
    | "Income Certificate"
    | "Passport Photo"
    | "Identity Proof";
  status: DocumentStatus;
  fileName?: string;
  uploadedAt?: string;
};

export type AdmissionTimelineEvent = {
  id: string;
  label: string;
  date?: string;
  completed: boolean;
  detail?: string;
};

export type AdmissionInterview = {
  status: InterviewStatus;
  date?: string;
  time?: string;
  mode?: InterviewMode;
  panel: string[];
  meetingLink?: string;
  location?: string;
  remarks: string;
};

export type AdmissionRemark = {
  id: string;
  author: string;
  text: string;
  createdAt: string;
};

export type AdmissionApplication = {
  id: string;
  photoInitials: string;
  fullName: string;
  gender: "female" | "male" | "non-binary" | "prefer-not-to-say";
  dateOfBirth: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  country: string;
  nationality: string;
  department: string;
  course: string;
  qualification: string;
  applicationDate: string;
  admissionYear: string;
  status: AdmissionStatus;
  assignedOfficer: string;
  academicHistory: AcademicRecord[];
  guardian: {
    fatherName: string;
    motherName: string;
    guardianName: string;
    occupation: string;
    phone: string;
    email: string;
  };
  documents: AdmissionDocument[];
  interview: AdmissionInterview;
  timeline: AdmissionTimelineEvent[];
  remarks: AdmissionRemark[];
};

export type AdmissionsFilters = {
  department: string;
  course: string;
  status: string;
  qualification: string;
  applicationDate: string;
  state: string;
  city: string;
  admissionYear: string;
};

export type AdmissionSortField =
  | "id"
  | "fullName"
  | "applicationDate"
  | "department"
  | "course"
  | "status";

export type AdmissionNotificationTemplate =
  | "application-received"
  | "document-required"
  | "interview-invitation"
  | "application-approved"
  | "application-rejected"
  | "enrollment-confirmation";
