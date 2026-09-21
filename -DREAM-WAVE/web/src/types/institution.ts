export type InstitutionEntityStatus = "active" | "inactive" | "pending";

export type InstitutionProfile = {
  name: string;
  type: "college" | "school" | "university" | "training";
  code: string;
  email: string;
  phone: string;
  website: string;
  address: string;
  city: string;
  state: string;
  country: string;
  accreditation: string;
  establishedYear: string;
  description: string;
};

export type Department = {
  id: string;
  name: string;
  code: string;
  head: string;
  status: InstitutionEntityStatus;
  facultyCount: number;
  studentCount: number;
};

export type Branch = {
  id: string;
  name: string;
  code: string;
  city: string;
  campus: string;
  status: InstitutionEntityStatus;
};

export type Course = {
  id: string;
  name: string;
  code: string;
  departmentId: string;
  duration: string;
  level: "certificate" | "diploma" | "undergraduate" | "postgraduate";
  status: InstitutionEntityStatus;
};

export type Subject = {
  id: string;
  name: string;
  code: string;
  courseId: string;
  credits: number;
  semester: string;
  status: InstitutionEntityStatus;
};

export type Teacher = {
  id: string;
  name: string;
  email: string;
  departmentId: string;
  designation: string;
  phone: string;
  status: InstitutionEntityStatus;
};

export type InstitutionStudent = {
  id: string;
  name: string;
  email: string;
  enrollmentId: string;
  courseId: string;
  year: string;
  status: InstitutionEntityStatus;
};

export type ClassSection = {
  id: string;
  name: string;
  courseId: string;
  teacherId: string;
  room: string;
  schedule: string;
  capacity: number;
  enrolled: number;
  status: InstitutionEntityStatus;
};

export type Member = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "coordinator" | "faculty" | "staff" | "viewer";
  departmentId: string;
  status: InstitutionEntityStatus;
};

export type InstitutionNotification = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
  category: "system" | "academic" | "admin";
};

export type InstitutionSettings = {
  timezone: string;
  academicYear: string;
  allowSelfEnrollment: boolean;
  notifyParents: boolean;
  defaultLanguage: string;
};

export type InstitutionState = {
  profile: InstitutionProfile;
  settings: InstitutionSettings;
  departments: Department[];
  branches: Branch[];
  courses: Course[];
  subjects: Subject[];
  teachers: Teacher[];
  students: InstitutionStudent[];
  classes: ClassSection[];
  members: Member[];
  notifications: InstitutionNotification[];
};
