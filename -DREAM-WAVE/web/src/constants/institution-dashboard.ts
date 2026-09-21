import { INSTITUTION_ROUTES } from "@/constants/institution";

export const INSTITUTION_DASHBOARD_METRICS = {
  admissions: 286,
  placementRate: 92,
  internships: 174,
  upcomingEvents: 8,
  announcements: 12,
  activeRecruiters: 46,
} as const;

export const INSTITUTION_QUICK_ACTIONS = [
  {
    label: "Add Admission",
    description: "Start a new applicant record",
    href: INSTITUTION_ROUTES.admissions,
  },
  {
    label: "Publish Announcement",
    description: "Share an institution-wide update",
    href: INSTITUTION_ROUTES.announcements,
  },
  {
    label: "Create Event",
    description: "Schedule a campus activity",
    href: INSTITUTION_ROUTES.events,
  },
  {
    label: "Add Department",
    description: "Create an academic unit",
    href: INSTITUTION_ROUTES.departments,
  },
  {
    label: "Add Course",
    description: "Configure a new program",
    href: INSTITUTION_ROUTES.courses,
  },
  {
    label: "Generate Report",
    description: "Prepare an operational report",
    href: INSTITUTION_ROUTES.reports,
  },
  {
    label: "View Placements",
    description: "Review placement outcomes",
    href: INSTITUTION_ROUTES.placements,
  },
] as const;

export const INSTITUTION_ANALYTICS = {
  admissions: {
    labels: ["Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
    values: [148, 176, 204, 223, 251, 286],
  },
  students: {
    labels: ["2021", "2022", "2023", "2024", "2025", "2026"],
    values: [1890, 2070, 2260, 2410, 2580, 2740],
  },
  placements: {
    labels: ["Placed", "Interviewing", "Preparing"],
    values: [92, 6, 2],
  },
  departments: {
    labels: ["CSE", "Business", "Design", "Sciences", "Humanities"],
    values: [34, 24, 16, 14, 12],
  },
  courses: {
    labels: ["Computer Science", "Digital Leadership", "UX Design", "Data Science"],
    values: [94, 78, 68, 84],
  },
  faculty: {
    labels: ["Professors", "Associate", "Assistant", "Visiting"],
    values: [18, 31, 39, 12],
  },
} as const;

export const INSTITUTION_RECENT_ACTIVITY = [
  {
    id: "activity-admission",
    type: "Recent admission",
    title: "Aarav Sharma accepted",
    detail: "B.Tech Computer Science · 4 minutes ago",
  },
  {
    id: "activity-faculty",
    type: "Faculty joined",
    title: "Dr. Nisha Menon onboarded",
    detail: "Department of Design Studies · 38 minutes ago",
  },
  {
    id: "activity-course",
    type: "Course update",
    title: "Data Structures syllabus revised",
    detail: "Semester 3 · 2 hours ago",
  },
  {
    id: "activity-event",
    type: "Event created",
    title: "Industry Connect 2026",
    detail: "Main auditorium · 5 hours ago",
  },
  {
    id: "activity-announcement",
    type: "Announcement published",
    title: "Mid-semester examination schedule",
    detail: "All departments · Yesterday",
  },
] as const;

export const INSTITUTION_NOTICE_GROUPS = [
  {
    title: "Pinned announcements",
    items: ["Accreditation review preparation", "Academic council meeting minutes"],
  },
  {
    title: "Upcoming events",
    items: ["Annual technology symposium · 24 Jul", "Alumni networking evening · 29 Jul"],
  },
  {
    title: "Exam notices",
    items: ["Semester examination forms close 21 Jul"],
  },
  {
    title: "Holiday notices",
    items: ["Campus closed for regional holiday · 17 Aug"],
  },
  {
    title: "Institution alerts",
    items: ["3 faculty profiles require verification"],
  },
] as const;
