import type {
  ManagedStudent,
  ManagedStudentStatus,
  PlacementStatus,
} from "@/types/student-management";

type StudentSeed = {
  id: string;
  rollNumber: string;
  fullName: string;
  gender: ManagedStudent["gender"];
  department: string;
  course: string;
  semester: string;
  section: string;
  city: string;
  state: string;
  status: ManagedStudentStatus;
  placementStatus: PlacementStatus;
};

const STUDENTS: StudentSeed[] = [
  {
    id: "STU-2024-001",
    rollNumber: "CSE24-001",
    fullName: "Riya Patel",
    gender: "female",
    department: "Computer Science",
    course: "B.Tech Computer Science",
    semester: "Semester 5",
    section: "A",
    city: "Hyderabad",
    state: "Telangana",
    status: "active",
    placementStatus: "placement-ready",
  },
  {
    id: "STU-2024-018",
    rollNumber: "BBA24-018",
    fullName: "Mohammed Farhan",
    gender: "male",
    department: "Business Administration",
    course: "BBA Digital Business",
    semester: "Semester 5",
    section: "B",
    city: "Hyderabad",
    state: "Telangana",
    status: "active",
    placementStatus: "preparing",
  },
  {
    id: "STU-2025-102",
    rollNumber: "DES25-102",
    fullName: "Emily Chen",
    gender: "female",
    department: "Design Studies",
    course: "UX Design Diploma",
    semester: "Semester 3",
    section: "A",
    city: "Bengaluru",
    state: "Karnataka",
    status: "active",
    placementStatus: "preparing",
  },
  {
    id: "STU-2023-047",
    rollNumber: "CSE23-047",
    fullName: "Aarav Sharma",
    gender: "male",
    department: "Computer Science",
    course: "B.Tech Computer Science",
    semester: "Semester 7",
    section: "A",
    city: "Pune",
    state: "Maharashtra",
    status: "active",
    placementStatus: "interviewing",
  },
  {
    id: "STU-2023-066",
    rollNumber: "BBA23-066",
    fullName: "Meera Iyer",
    gender: "female",
    department: "Business Administration",
    course: "BBA Digital Business",
    semester: "Semester 7",
    section: "A",
    city: "Chennai",
    state: "Tamil Nadu",
    status: "active",
    placementStatus: "placed",
  },
  {
    id: "STU-2022-021",
    rollNumber: "CSE22-021",
    fullName: "Kabir Singh",
    gender: "male",
    department: "Computer Science",
    course: "B.Tech Computer Science",
    semester: "Semester 8",
    section: "B",
    city: "Delhi",
    state: "Delhi",
    status: "graduated",
    placementStatus: "placed",
  },
  {
    id: "STU-2025-114",
    rollNumber: "DES25-114",
    fullName: "Ananya Reddy",
    gender: "female",
    department: "Design Studies",
    course: "UX Design Diploma",
    semester: "Semester 3",
    section: "B",
    city: "Vijayawada",
    state: "Andhra Pradesh",
    status: "active",
    placementStatus: "not-started",
  },
  {
    id: "STU-2026-007",
    rollNumber: "CSE26-007",
    fullName: "Dev Patel",
    gender: "male",
    department: "Computer Science",
    course: "Data Science Certificate",
    semester: "Semester 1",
    section: "A",
    city: "Ahmedabad",
    state: "Gujarat",
    status: "active",
    placementStatus: "not-started",
  },
  {
    id: "STU-2024-089",
    rollNumber: "DES24-089",
    fullName: "Zoya Khan",
    gender: "female",
    department: "Design Studies",
    course: "UX Design Diploma",
    semester: "Semester 5",
    section: "A",
    city: "Bengaluru",
    state: "Karnataka",
    status: "inactive",
    placementStatus: "preparing",
  },
  {
    id: "STU-2024-054",
    rollNumber: "BBA24-054",
    fullName: "Ishaan Verma",
    gender: "male",
    department: "Business Administration",
    course: "BBA Digital Business",
    semester: "Semester 5",
    section: "A",
    city: "Jaipur",
    state: "Rajasthan",
    status: "active",
    placementStatus: "placement-ready",
  },
  {
    id: "STU-2023-031",
    rollNumber: "CSE23-031",
    fullName: "Nandini Rao",
    gender: "female",
    department: "Computer Science",
    course: "B.Tech Computer Science",
    semester: "Semester 7",
    section: "B",
    city: "Mysuru",
    state: "Karnataka",
    status: "active",
    placementStatus: "interviewing",
  },
  {
    id: "STU-2026-012",
    rollNumber: "BBA26-012",
    fullName: "Arjun Nair",
    gender: "male",
    department: "Business Administration",
    course: "MBA Digital Leadership",
    semester: "Semester 1",
    section: "A",
    city: "Kochi",
    state: "Kerala",
    status: "active",
    placementStatus: "not-started",
  },
  {
    id: "STU-2025-076",
    rollNumber: "DES25-076",
    fullName: "Sara Thomas",
    gender: "female",
    department: "Design Studies",
    course: "UX Design Diploma",
    semester: "Semester 3",
    section: "A",
    city: "Kochi",
    state: "Kerala",
    status: "suspended",
    placementStatus: "not-started",
  },
  {
    id: "STU-2022-044",
    rollNumber: "BBA22-044",
    fullName: "Rohan Gupta",
    gender: "male",
    department: "Business Administration",
    course: "BBA Digital Business",
    semester: "Semester 8",
    section: "B",
    city: "Kolkata",
    state: "West Bengal",
    status: "graduated",
    placementStatus: "placed",
  },
  {
    id: "STU-2026-019",
    rollNumber: "CSE26-019",
    fullName: "Diya Bose",
    gender: "female",
    department: "Computer Science",
    course: "B.Tech Computer Science",
    semester: "Semester 1",
    section: "B",
    city: "Kolkata",
    state: "West Bengal",
    status: "active",
    placementStatus: "not-started",
  },
  {
    id: "STU-2024-097",
    rollNumber: "CSE24-097",
    fullName: "Vikram Joshi",
    gender: "male",
    department: "Computer Science",
    course: "Data Science Certificate",
    semester: "Semester 5",
    section: "B",
    city: "Nagpur",
    state: "Maharashtra",
    status: "inactive",
    placementStatus: "preparing",
  },
];

const DOCUMENT_NAMES: ManagedStudent["documents"][number]["name"][] = [
  "10th Certificate",
  "12th Certificate",
  "Transfer Certificate",
  "Migration Certificate",
  "Community Certificate",
  "Income Certificate",
  "Identity Proof",
  "Passport Photo",
  "Student ID Card",
];

export const STUDENT_MANAGEMENT_SEED: ManagedStudent[] = STUDENTS.map(
  (student, index) => {
    const admissionYear = student.id.split("-")[1] ?? "2024";
    const semesterNumber = Number(student.semester.match(/\d+/)?.[0] ?? 1);
    const readiness =
      student.placementStatus === "placed"
        ? 100
        : student.placementStatus === "interviewing"
          ? 84
          : student.placementStatus === "placement-ready"
            ? 76
            : student.placementStatus === "preparing"
              ? 58
              : 30;
    const surname = student.fullName.split(" ").at(-1) ?? "Guardian";
    const initials = student.fullName
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
    const bloodGroups = ["A+", "B+", "O+", "AB+"] as const;
    const advisors = ["Dr. Meera Rao", "Prof. Arjun Nair", "Ananya Iyer"] as const;

    return {
      ...student,
      photoInitials: initials,
      branch:
        student.department === "Computer Science"
          ? "Computer Science and Engineering"
          : student.department,
      academicYear: "2026-27",
      admissionYear,
      batch: `${admissionYear}-${Number(admissionYear) + 4}`,
      admissionDate: `${admissionYear}-08-01`,
      email: `${student.fullName.toLowerCase().replaceAll(" ", ".")}@student.dreamwave.academy`,
      phone: `+91 98760 ${String(12000 + index)}`,
      dateOfBirth: `200${index % 6}-0${(index % 8) + 1}-12`,
      bloodGroup: bloodGroups[index % 4]!,
      nationality: "Indian",
      address: `${18 + index}, University Road`,
      country: "India",
      emergencyContact: `+91 90000 ${String(22000 + index)}`,
      guardian: {
        fatherName: `Mr. ${surname}`,
        motherName: `Mrs. ${surname}`,
        guardianName: `Guardian of ${student.fullName}`,
        occupation: index % 2 ? "Business" : "Professional",
        email: `guardian.${index + 1}@example.com`,
        phone: `+91 90000 ${String(33000 + index)}`,
        address: `${18 + index}, University Road, ${student.city}`,
      },
      creditsEarned: Math.min(160, semesterNumber * 20 - (index % 6)),
      currentSubjects: [
        "Data Structures",
        "Applied Mathematics",
        "Professional Communication",
        "Design Thinking",
      ],
      cgpa: Number((7.1 + (index % 20) / 10).toFixed(1)),
      backlogs: index % 6 === 0 ? 2 : index % 4 === 0 ? 1 : 0,
      expectedGraduation: `${Number(admissionYear) + 4}-05-30`,
      academicAdvisor: advisors[index % 3]!,
      attendance: 72 + (index % 24),
      performance: [
        68 + (index % 12),
        72 + (index % 14),
        76 + (index % 16),
        80 + (index % 15),
      ],
      technicalSkills: ["Data analysis", "UI prototyping", "Problem solving"],
      softSkills: ["Communication", "Teamwork", "Leadership"],
      programmingLanguages: ["TypeScript", "Python", "SQL"].slice(
        0,
        1 + (index % 3),
      ),
      languagesKnown: ["English", "Hindi", index % 2 ? "Telugu" : "Tamil"],
      projects: [
        {
          id: `${student.id}-project-1`,
          title: "Campus Operations Portal",
          role: "Student developer",
          technologies: ["React", "TypeScript"],
          status: index % 3 === 0 ? "in-progress" : "completed",
        },
      ],
      internships: index % 3 ? ["Industry summer internship"] : [],
      certifications: [
        {
          id: `${student.id}-certificate-1`,
          title: "Enterprise Skills Foundation",
          category: index % 2 ? "workshop" : "academic",
          issuer: "Dream Wave Academy",
          issuedAt: "2026-04-12",
        },
      ],
      researchPapers:
        index % 5 === 0 ? ["Responsible AI in Higher Education"] : [],
      achievements: index % 4 === 0 ? ["Department merit recognition"] : [],
      documents: DOCUMENT_NAMES.map((name, documentIndex) => ({
        id: `${student.id}-document-${documentIndex + 1}`,
        name,
        status:
          documentIndex < 6
            ? "verified"
            : documentIndex < 8
              ? "pending"
              : "missing",
        ...(documentIndex < 8
          ? { fileName: `${name.toLowerCase().replaceAll(" ", "-")}.pdf` }
          : {}),
      })),
      placement: {
        status: student.placementStatus,
        resumeUploaded: readiness >= 50,
        resumeScore: Math.max(0, readiness - 4),
        internshipsCompleted: index % 3,
        jobsApplied: readiness >= 70 ? 4 + (index % 8) : 0,
        interviewProgress:
          student.placementStatus === "interviewing"
            ? "Technical round"
            : student.placementStatus === "placed"
              ? "Completed"
              : "Not started",
        offerStatus:
          student.placementStatus === "placed" ? "Offer accepted" : "No offer",
        readiness,
        careerScore: Math.min(100, readiness + 3),
      },
      scholarshipStatus:
        index % 5 === 0 ? "approved" : index % 4 === 0 ? "applied" : "none",
      notes: [
        {
          id: `${student.id}-note-1`,
          text: "Student record reviewed for the current academic term.",
          author: "Academic Office",
          createdAt: "2026-07-12T09:30:00.000Z",
        },
      ],
    };
  },
);
