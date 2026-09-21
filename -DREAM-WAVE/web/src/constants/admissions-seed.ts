import type {
  AdmissionApplication,
  AdmissionDocument,
  AdmissionStatus,
  AdmissionTimelineEvent,
} from "@/types/admissions";

const DOCUMENT_NAMES: AdmissionDocument["name"][] = [
  "10th Memo",
  "12th Memo",
  "Degree Certificate",
  "Transfer Certificate",
  "Migration Certificate",
  "Community Certificate",
  "Income Certificate",
  "Passport Photo",
  "Identity Proof",
];

const TIMELINE_LABELS = [
  "Application Submitted",
  "Documents Uploaded",
  "Documents Verified",
  "Interview Scheduled",
  "Interview Completed",
  "Admission Approved",
  "Fee Confirmation",
  "Enrollment Completed",
] as const;

const STATUS_PROGRESS: Record<AdmissionStatus, number> = {
  pending: 1,
  "document-verification": 2,
  "interview-scheduled": 4,
  "under-review": 5,
  approved: 6,
  rejected: 5,
  "waiting-list": 5,
  enrolled: 8,
};

type ApplicantSeed = {
  id: string;
  fullName: string;
  gender: AdmissionApplication["gender"];
  email: string;
  phone: string;
  city: string;
  state: string;
  department: string;
  course: string;
  qualification: string;
  applicationDate: string;
  status: AdmissionStatus;
  assignedOfficer: string;
};

const APPLICANTS: ApplicantSeed[] = [
  {
    id: "ADM-2026-1048",
    fullName: "Aarav Sharma",
    gender: "male",
    email: "aarav.sharma@example.com",
    phone: "+91 98765 42101",
    city: "Hyderabad",
    state: "Telangana",
    department: "Computer Science",
    course: "B.Tech Computer Science",
    qualification: "12th",
    applicationDate: "2026-07-17",
    status: "document-verification",
    assignedOfficer: "Priya Menon",
  },
  {
    id: "ADM-2026-1047",
    fullName: "Meera Iyer",
    gender: "female",
    email: "meera.iyer@example.com",
    phone: "+91 98765 42102",
    city: "Chennai",
    state: "Tamil Nadu",
    department: "Design Studies",
    course: "UX Design Diploma",
    qualification: "degree",
    applicationDate: "2026-07-17",
    status: "interview-scheduled",
    assignedOfficer: "Rohan Desai",
  },
  {
    id: "ADM-2026-1046",
    fullName: "Kabir Singh",
    gender: "male",
    email: "kabir.singh@example.com",
    phone: "+91 98765 42103",
    city: "Pune",
    state: "Maharashtra",
    department: "Business Administration",
    course: "MBA Digital Leadership",
    qualification: "degree",
    applicationDate: "2026-07-16",
    status: "under-review",
    assignedOfficer: "Priya Menon",
  },
  {
    id: "ADM-2026-1045",
    fullName: "Ananya Reddy",
    gender: "female",
    email: "ananya.reddy@example.com",
    phone: "+91 98765 42104",
    city: "Vijayawada",
    state: "Andhra Pradesh",
    department: "Computer Science",
    course: "B.Tech Computer Science",
    qualification: "12th",
    applicationDate: "2026-07-15",
    status: "approved",
    assignedOfficer: "Sameer Khan",
  },
  {
    id: "ADM-2026-1044",
    fullName: "Dev Patel",
    gender: "male",
    email: "dev.patel@example.com",
    phone: "+91 98765 42105",
    city: "Ahmedabad",
    state: "Gujarat",
    department: "Computer Science",
    course: "Data Science Certificate",
    qualification: "diploma",
    applicationDate: "2026-07-14",
    status: "waiting-list",
    assignedOfficer: "Rohan Desai",
  },
  {
    id: "ADM-2026-1043",
    fullName: "Zoya Khan",
    gender: "female",
    email: "zoya.khan@example.com",
    phone: "+91 98765 42106",
    city: "Bengaluru",
    state: "Karnataka",
    department: "Design Studies",
    course: "UX Design Diploma",
    qualification: "12th",
    applicationDate: "2026-07-12",
    status: "enrolled",
    assignedOfficer: "Priya Menon",
  },
  {
    id: "ADM-2026-1042",
    fullName: "Ishaan Verma",
    gender: "male",
    email: "ishaan.verma@example.com",
    phone: "+91 98765 42107",
    city: "Delhi",
    state: "Delhi",
    department: "Business Administration",
    course: "MBA Digital Leadership",
    qualification: "degree",
    applicationDate: "2026-07-10",
    status: "rejected",
    assignedOfficer: "Sameer Khan",
  },
  {
    id: "ADM-2026-1041",
    fullName: "Nandini Rao",
    gender: "female",
    email: "nandini.rao@example.com",
    phone: "+91 98765 42108",
    city: "Mysuru",
    state: "Karnataka",
    department: "Computer Science",
    course: "B.Tech Computer Science",
    qualification: "12th",
    applicationDate: "2026-07-08",
    status: "pending",
    assignedOfficer: "Rohan Desai",
  },
  {
    id: "ADM-2026-1040",
    fullName: "Arjun Nair",
    gender: "male",
    email: "arjun.nair@example.com",
    phone: "+91 98765 42109",
    city: "Kochi",
    state: "Kerala",
    department: "Computer Science",
    course: "Data Science Certificate",
    qualification: "degree",
    applicationDate: "2026-07-06",
    status: "approved",
    assignedOfficer: "Priya Menon",
  },
  {
    id: "ADM-2026-1039",
    fullName: "Sara Thomas",
    gender: "female",
    email: "sara.thomas@example.com",
    phone: "+91 98765 42110",
    city: "Kochi",
    state: "Kerala",
    department: "Design Studies",
    course: "UX Design Diploma",
    qualification: "diploma",
    applicationDate: "2026-07-03",
    status: "under-review",
    assignedOfficer: "Sameer Khan",
  },
  {
    id: "ADM-2026-1038",
    fullName: "Rohan Gupta",
    gender: "male",
    email: "rohan.gupta@example.com",
    phone: "+91 98765 42111",
    city: "Jaipur",
    state: "Rajasthan",
    department: "Business Administration",
    course: "MBA Digital Leadership",
    qualification: "degree",
    applicationDate: "2026-06-28",
    status: "enrolled",
    assignedOfficer: "Rohan Desai",
  },
  {
    id: "ADM-2026-1037",
    fullName: "Diya Bose",
    gender: "female",
    email: "diya.bose@example.com",
    phone: "+91 98765 42112",
    city: "Kolkata",
    state: "West Bengal",
    department: "Computer Science",
    course: "B.Tech Computer Science",
    qualification: "12th",
    applicationDate: "2026-06-24",
    status: "approved",
    assignedOfficer: "Priya Menon",
  },
  {
    id: "ADM-2026-1036",
    fullName: "Vikram Joshi",
    gender: "male",
    email: "vikram.joshi@example.com",
    phone: "+91 98765 42113",
    city: "Nagpur",
    state: "Maharashtra",
    department: "Computer Science",
    course: "Data Science Certificate",
    qualification: "degree",
    applicationDate: "2026-06-18",
    status: "document-verification",
    assignedOfficer: "Sameer Khan",
  },
  {
    id: "ADM-2026-1035",
    fullName: "Aisha Ali",
    gender: "female",
    email: "aisha.ali@example.com",
    phone: "+91 98765 42114",
    city: "Lucknow",
    state: "Uttar Pradesh",
    department: "Design Studies",
    course: "UX Design Diploma",
    qualification: "12th",
    applicationDate: "2026-06-12",
    status: "interview-scheduled",
    assignedOfficer: "Rohan Desai",
  },
  {
    id: "ADM-2026-1034",
    fullName: "Neel Kulkarni",
    gender: "male",
    email: "neel.kulkarni@example.com",
    phone: "+91 98765 42115",
    city: "Pune",
    state: "Maharashtra",
    department: "Business Administration",
    course: "MBA Digital Leadership",
    qualification: "degree",
    applicationDate: "2026-06-05",
    status: "rejected",
    assignedOfficer: "Priya Menon",
  },
  {
    id: "ADM-2026-1033",
    fullName: "Tara Kapoor",
    gender: "female",
    email: "tara.kapoor@example.com",
    phone: "+91 98765 42116",
    city: "Chandigarh",
    state: "Punjab",
    department: "Computer Science",
    course: "B.Tech Computer Science",
    qualification: "12th",
    applicationDate: "2026-05-29",
    status: "enrolled",
    assignedOfficer: "Sameer Khan",
  },
];

function createDocuments(progress: number): AdmissionDocument[] {
  return DOCUMENT_NAMES.map((name, index) => {
    const uploaded = index < Math.min(progress + 2, DOCUMENT_NAMES.length);
    const verified = uploaded && index < Math.max(progress, 1);
    return {
      id: `document-${index + 1}`,
      name,
      status: verified ? "verified" : uploaded ? "pending" : "missing",
      ...(uploaded
        ? {
            fileName: `${name.toLowerCase().replaceAll(" ", "-")}.pdf`,
            uploadedAt: "2026-07-15",
          }
        : {}),
    };
  });
}

function createTimeline(
  applicationId: string,
  progress: number,
): AdmissionTimelineEvent[] {
  return TIMELINE_LABELS.map((label, index) => ({
    id: `${applicationId}-timeline-${index + 1}`,
    label,
    completed: index < progress,
    ...(index < progress ? { date: `2026-07-${String(index + 10).padStart(2, "0")}` } : {}),
    ...(label === "Admission Approved" && progress < 6
      ? { detail: "Awaiting committee decision" }
      : {}),
  }));
}

export const ADMISSIONS_SEED: AdmissionApplication[] = APPLICANTS.map(
  (applicant, index) => {
    const progress = STATUS_PROGRESS[applicant.status];
    const initials = applicant.fullName
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

    return {
      ...applicant,
      photoInitials: initials,
      dateOfBirth: `200${index % 6}-0${(index % 8) + 1}-15`,
      address: `${24 + index}, Academic Avenue`,
      country: "India",
      nationality: "Indian",
      admissionYear: "2026",
      academicHistory: [
        {
          level: "10th",
          institution: "Regional Public School",
          board: "CBSE",
          year: "2022",
          score: "91%",
          specialization: "General",
        },
        {
          level: applicant.qualification === "degree" ? "degree" : "12th",
          institution: "National Senior College",
          board: applicant.qualification === "degree" ? "Autonomous" : "CBSE",
          year: "2026",
          score: applicant.qualification === "degree" ? "8.4 CGPA" : "89%",
          specialization:
            applicant.department === "Computer Science"
              ? "Mathematics and Computer Science"
              : "Commerce and Humanities",
        },
        {
          level: "entrance-exam",
          institution: "National Entrance Board",
          board: "Institution Entrance Test",
          year: "2026",
          score: `${82 + (index % 12)} percentile`,
          specialization: applicant.course,
        },
      ],
      guardian: {
        fatherName: `Mr. ${applicant.fullName.split(" ").at(-1) ?? "Parent"}`,
        motherName: `Mrs. ${applicant.fullName.split(" ").at(-1) ?? "Parent"}`,
        guardianName: "Primary guardian",
        occupation: index % 2 ? "Business" : "Professional",
        phone: `+91 90000 ${String(11000 + index)}`,
        email: `guardian.${index + 1}@example.com`,
      },
      documents: createDocuments(progress),
      interview: {
        status:
          applicant.status === "interview-scheduled"
            ? "scheduled"
            : progress >= 5
              ? "completed"
              : "not-scheduled",
        ...(applicant.status === "interview-scheduled"
          ? {
              date: "2026-07-22",
              time: "10:30",
              mode: "online" as const,
              meetingLink: "https://meet.example.edu/admission-panel",
            }
          : {}),
        panel: ["Dr. Meera Rao", "Prof. Arjun Nair"],
        remarks: progress >= 5 ? "Candidate demonstrated strong program fit." : "",
      },
      timeline: createTimeline(applicant.id, progress),
      remarks: [
        {
          id: `${applicant.id}-remark-1`,
          author: applicant.assignedOfficer,
          text: "Application reviewed and routed to the assigned academic team.",
          createdAt: `${applicant.applicationDate}T10:30:00.000Z`,
        },
      ],
    };
  },
);
