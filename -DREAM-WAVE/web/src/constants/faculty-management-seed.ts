import type {
  FacultyEmploymentType,
  FacultyStatus,
  ManagedFaculty,
} from "@/types/faculty-management";

type FacultySeed = {
  id: string;
  fullName: string;
  designation: string;
  staffCategory: ManagedFaculty["staffCategory"];
  department: string;
  qualification: string;
  specialization: string;
  experience: number;
  employmentType: FacultyEmploymentType;
  joiningDate: string;
  status: FacultyStatus;
};

const FACULTY: FacultySeed[] = [
  { id: "FAC-2018-001", fullName: "Dr. Meera Rao", designation: "Professor & HOD", staffCategory: "teaching", department: "Computer Science", qualification: "Ph.D.", specialization: "Artificial Intelligence", experience: 18, employmentType: "full-time", joiningDate: "2018-06-12", status: "active" },
  { id: "FAC-2020-014", fullName: "Prof. Arjun Nair", designation: "Associate Professor", staffCategory: "teaching", department: "Business Administration", qualification: "Ph.D.", specialization: "Digital Leadership", experience: 14, employmentType: "full-time", joiningDate: "2020-07-03", status: "active" },
  { id: "FAC-2021-027", fullName: "Ananya Iyer", designation: "Assistant Professor", staffCategory: "teaching", department: "Design Studies", qualification: "M.Des", specialization: "Interaction Design", experience: 9, employmentType: "full-time", joiningDate: "2021-06-21", status: "active" },
  { id: "FAC-2017-004", fullName: "Dr. Sanjay Kulkarni", designation: "Principal", staffCategory: "teaching", department: "Administration", qualification: "Ph.D.", specialization: "Higher Education", experience: 24, employmentType: "full-time", joiningDate: "2017-04-10", status: "active" },
  { id: "FAC-2022-038", fullName: "Karan Deshmukh", designation: "Assistant Professor", staffCategory: "teaching", department: "Computer Science", qualification: "M.Tech", specialization: "Cloud Computing", experience: 8, employmentType: "full-time", joiningDate: "2022-08-01", status: "active" },
  { id: "FAC-2023-052", fullName: "Sana Qureshi", designation: "Lab Faculty", staffCategory: "teaching", department: "Computer Science", qualification: "M.Sc.", specialization: "Data Science", experience: 6, employmentType: "contract", joiningDate: "2023-01-16", status: "on-leave" },
  { id: "FAC-2019-011", fullName: "Dr. Neha Kapoor", designation: "Professor", staffCategory: "teaching", department: "Business Administration", qualification: "Ph.D.", specialization: "Organizational Behaviour", experience: 17, employmentType: "full-time", joiningDate: "2019-06-10", status: "active" },
  { id: "FAC-2024-071", fullName: "Rohit Bose", designation: "Guest Faculty", staffCategory: "teaching", department: "Design Studies", qualification: "M.Des", specialization: "Service Design", experience: 11, employmentType: "guest", joiningDate: "2024-07-08", status: "active" },
  { id: "FAC-2016-002", fullName: "Lakshmi Menon", designation: "Academic Coordinator", staffCategory: "non-teaching", department: "Academic Affairs", qualification: "MBA", specialization: "Academic Operations", experience: 16, employmentType: "full-time", joiningDate: "2016-05-23", status: "active" },
  { id: "FAC-2025-084", fullName: "Aditya Verma", designation: "Training Staff", staffCategory: "non-teaching", department: "Training & Placement", qualification: "MBA", specialization: "Learning and Development", experience: 7, employmentType: "contract", joiningDate: "2025-02-03", status: "active" },
  { id: "FAC-2026-093", fullName: "Dr. Priya Shah", designation: "Associate Professor", staffCategory: "teaching", department: "Computer Science", qualification: "Ph.D.", specialization: "Cybersecurity", experience: 12, employmentType: "full-time", joiningDate: "2026-01-12", status: "active" },
  { id: "FAC-2015-007", fullName: "Rajesh Kumar", designation: "Administrative Staff", staffCategory: "non-teaching", department: "Administration", qualification: "M.Com", specialization: "Finance Operations", experience: 19, employmentType: "full-time", joiningDate: "2015-08-17", status: "inactive" },
  { id: "FAC-2026-097", fullName: "Fatima Ali", designation: "Assistant Professor", staffCategory: "teaching", department: "Business Administration", qualification: "MBA", specialization: "Marketing Analytics", experience: 5, employmentType: "part-time", joiningDate: "2026-06-02", status: "active" },
  { id: "FAC-2020-019", fullName: "Dr. Vivek Reddy", designation: "Associate Professor", staffCategory: "teaching", department: "Computer Science", qualification: "Ph.D.", specialization: "Distributed Systems", experience: 15, employmentType: "full-time", joiningDate: "2020-06-15", status: "on-leave" },
];

const DOCUMENTS: ManagedFaculty["documents"][number]["name"][] = [
  "Resume",
  "Qualification Certificates",
  "Experience Certificates",
  "Identity Proof",
  "Joining Letter",
  "Promotion Orders",
  "Training Certificates",
];

export const FACULTY_MANAGEMENT_SEED: ManagedFaculty[] = FACULTY.map(
  (faculty, index) => {
    const initials = faculty.fullName
      .replace("Dr. ", "")
      .replace("Prof. ", "")
      .split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
    const subjectNames =
      faculty.department === "Computer Science"
        ? ["Data Structures", "Cloud Architecture"]
        : faculty.department === "Business Administration"
          ? ["Digital Strategy", "Organizational Behaviour"]
          : ["Design Thinking", "Interaction Design"];

    return {
      ...faculty,
      photoInitials: initials,
      highestQualification: faculty.qualification,
      university: index % 2 ? "University of Hyderabad" : "Indian Institute of Technology",
      totalExperience: faculty.experience,
      teachingExperience:
        faculty.staffCategory === "teaching"
          ? Math.max(1, faculty.experience - 2)
          : 0,
      industryExperience:
        faculty.staffCategory === "teaching" ? 2 + (index % 5) : faculty.experience,
      email: `${faculty.fullName
        .replace("Dr. ", "")
        .replace("Prof. ", "")
        .toLowerCase()
        .replaceAll(" ", ".")}@dreamwave.academy`,
      phone: `+91 90010 ${String(12000 + index)}`,
      officeLocation: `Academic Block ${String.fromCharCode(65 + (index % 4))}-${201 + index}`,
      professionalCertifications: [
        "Outcome Based Education",
        "Digital Teaching Practice",
      ],
      researchAreas: [
        faculty.specialization,
        "Higher Education Innovation",
      ],
      subjects:
        faculty.staffCategory === "teaching"
          ? subjectNames.map((name, subjectIndex) => ({
              id: `${faculty.id}-subject-${subjectIndex + 1}`,
              name,
              semester: `Semester ${3 + subjectIndex * 2}`,
              department: faculty.department,
              academicYear: "2026-27",
              classAllocation: `Section ${subjectIndex ? "B" : "A"}`,
              laboratoryAllocation:
                faculty.department === "Computer Science"
                  ? `Lab ${subjectIndex + 2}`
                  : "Not applicable",
            }))
          : [],
      mentoringStudents: faculty.staffCategory === "teaching" ? 12 + index : 0,
      researchPapers:
        faculty.staffCategory === "teaching"
          ? [
              "Adaptive Learning Systems in Higher Education",
              "Enterprise Skills and Graduate Outcomes",
            ].slice(0, 1 + (index % 2))
          : [],
      journals: faculty.staffCategory === "teaching" ? ["Journal of Applied Learning"] : [],
      conferences:
        faculty.staffCategory === "teaching"
          ? ["International Conference on Education Technology"]
          : [],
      patents: index % 5 === 0 ? ["Adaptive assessment workflow"] : [],
      booksPublished: index % 4 === 0 ? ["Modern Academic Practice"] : [],
      fundedProjects: [
        {
          id: `${faculty.id}-funded-1`,
          title: "AI-enabled Academic Quality",
          role: index % 2 ? "Co-investigator" : "Principal investigator",
          funding: "Institution Research Grant",
          status: "active",
        },
      ],
      researchCollaborations: ["Industry Academic Research Council"],
      projects: [
        {
          id: `${faculty.id}-project-1`,
          title: "Curriculum Modernization Initiative",
          role: "Faculty lead",
          funding: "Internal",
          status: "active",
        },
      ],
      publications: [
        {
          id: `${faculty.id}-publication-1`,
          title: "Applied Learning in Enterprise Programs",
          type: index % 3 === 0 ? "conference" : "journal",
          publisher: "Academic Press",
          year: "2025",
        },
      ],
      achievements: [
        index % 3 === 0 ? "Best Faculty Award" : "Teaching Excellence Recognition",
        "Workshop facilitator",
        "Industry guest lecturer",
      ],
      certificates: [
        "Academic Leadership Workshop",
        "Industry Certification",
      ],
      documents: DOCUMENTS.map((name, documentIndex) => ({
        id: `${faculty.id}-document-${documentIndex + 1}`,
        name,
        status:
          documentIndex < 5
            ? "verified"
            : documentIndex === 5
              ? "pending"
              : "missing",
        ...(documentIndex < 6
          ? { fileName: `${name.toLowerCase().replaceAll(" ", "-")}.pdf` }
          : {}),
      })),
      workload: {
        weeklyTeachingHours: faculty.staffCategory === "teaching" ? 12 + (index % 8) : 0,
        assignedSubjects:
          faculty.staffCategory === "teaching" ? subjectNames.length : 0,
        mentoringStudents:
          faculty.staffCategory === "teaching" ? 12 + index : 0,
        committeeResponsibilities: ["Academic Quality Committee"],
        administrativeDuties:
          faculty.designation.includes("HOD") ||
          faculty.designation === "Principal"
            ? ["Department planning", "Faculty review"]
            : ["Assessment coordination"],
        labResponsibilities:
          faculty.department === "Computer Science"
            ? ["Computing laboratory supervision"]
            : [],
      },
      attendance: 86 + (index % 12),
      performance: [
        76 + (index % 12),
        80 + (index % 10),
        84 + (index % 8),
        87 + (index % 9),
      ],
      notes: [
        {
          id: `${faculty.id}-note-1`,
          text: "Faculty record reviewed for the current academic year.",
          author: "Academic Office",
          createdAt: "2026-07-10T09:30:00.000Z",
        },
      ],
    };
  },
);
