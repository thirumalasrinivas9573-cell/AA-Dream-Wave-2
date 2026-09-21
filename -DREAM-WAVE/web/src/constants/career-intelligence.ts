import { AI_ROUTES } from "@/constants/ai-platform";
import type { CareerIntelligenceState } from "@/types/career-intelligence";

export const CAREER_INTEL_ROUTES = {
  root: AI_ROUTES.career,
  commandCenter: AI_ROUTES.careerCommandCenter,
  today: AI_ROUTES.careerToday,
  copilot: AI_ROUTES.careerCopilot,
  intelligence: AI_ROUTES.careerIntelligence,
  jobs: AI_ROUTES.careerJobs,
  interview: AI_ROUTES.careerInterview,
  readiness: AI_ROUTES.careerReadiness,
  analytics: AI_ROUTES.careerAnalytics,
  resume: AI_ROUTES.resume,
  roadmap: AI_ROUTES.roadmap,
} as const;

export const CAREER_NAV = [
  { label: "Overview", href: CAREER_INTEL_ROUTES.root },
  { label: "Command Center", href: CAREER_INTEL_ROUTES.commandCenter },
  { label: "Today", href: CAREER_INTEL_ROUTES.today },
  { label: "Career Copilot", href: CAREER_INTEL_ROUTES.copilot },
  { label: "Placement Intel", href: CAREER_INTEL_ROUTES.intelligence },
  { label: "Jobs", href: CAREER_INTEL_ROUTES.jobs },
  { label: "Readiness", href: CAREER_INTEL_ROUTES.readiness },
  { label: "Interview", href: CAREER_INTEL_ROUTES.interview },
  { label: "Resume", href: CAREER_INTEL_ROUTES.resume },
  { label: "Analytics", href: CAREER_INTEL_ROUTES.analytics },
] as const;

export const CAREER_TARGET_SKILLS: Record<string, string[]> = {
  "software engineer": [
    "JavaScript",
    "TypeScript",
    "React",
    "Node.js",
    "SQL",
    "System Design",
    "Git",
    "Testing",
  ],
  "data analyst": [
    "SQL",
    "Python",
    "Excel",
    "Statistics",
    "Tableau",
    "Data Storytelling",
    "ETL",
  ],
  "product manager": [
    "User Research",
    "Roadmapping",
    "Analytics",
    "Stakeholder Management",
    "Writing",
    "Prioritization",
  ],
  default: [
    "Communication",
    "Problem Solving",
    "Domain Knowledge",
    "Tools Proficiency",
    "Portfolio Projects",
  ],
};

export const INTERVIEW_PROMPTS = {
  technical:
    "Ask me one technical interview question for my target role, then wait for my answer.",
  hr: "Ask me one HR behavioral interview question using the STAR method framing.",
  coding:
    "Give me one coding interview prompt with constraints. Do not reveal the solution yet.",
} as const;

const now = Date.now();

export const SEED_CAREER_INTELLIGENCE: CareerIntelligenceState = {
  readinessScore: 68,
  interviewReadiness: 54,
  placementReadiness: 61,
  growthSeries: [32, 38, 44, 49, 55, 61, 68],
  goals: [
    {
      id: "cg-1",
      label: "Complete portfolio project",
      done: false,
      due: "This month",
    },
    {
      id: "cg-2",
      label: "Practice 3 mock interviews",
      done: false,
      due: "This week",
    },
    {
      id: "cg-3",
      label: "Improve resume score above 80",
      done: false,
    },
  ],
  milestones: [
    {
      id: "cm-1",
      title: "Foundation skills",
      detail: "Core stack fluency",
      progress: 80,
      done: false,
    },
    {
      id: "cm-2",
      title: "Portfolio proof",
      detail: "Ship 1–2 public projects",
      progress: 45,
      done: false,
    },
    {
      id: "cm-3",
      title: "Interview readiness",
      detail: "Mock drills + feedback loops",
      progress: 35,
      done: false,
    },
    {
      id: "cm-4",
      title: "Placement applications",
      detail: "Apply to matched roles",
      progress: 20,
      done: false,
    },
  ],
  jobs: [
    {
      id: "cj-1",
      title: "Frontend Engineer Intern",
      company: "Nova Labs",
      location: "Remote",
      type: "internship",
      matchScore: 86,
      eligibility: "eligible",
      skills: ["React", "TypeScript", "Git"],
      status: "recommended",
      salary: "Stipend",
    },
    {
      id: "cj-2",
      title: "Junior Software Engineer",
      company: "BrightPath",
      location: "Bengaluru",
      type: "full-time",
      matchScore: 78,
      eligibility: "eligible",
      skills: ["JavaScript", "Node.js", "SQL"],
      status: "recommended",
      salary: "6–9 LPA",
    },
    {
      id: "cj-3",
      title: "Data Analyst Intern",
      company: "InsightWorks",
      location: "Hyderabad",
      type: "internship",
      matchScore: 64,
      eligibility: "stretch",
      skills: ["SQL", "Python", "Excel"],
      status: "recommended",
      salary: "Stipend",
    },
    {
      id: "cj-4",
      title: "Associate Product Manager",
      company: "CampusCloud",
      location: "Pune",
      type: "full-time",
      matchScore: 58,
      eligibility: "stretch",
      skills: ["Analytics", "Writing", "Roadmapping"],
      status: "saved",
      salary: "8–11 LPA",
    },
  ],
  interviews: [
    {
      id: "iv-1",
      mode: "hr",
      question: "Tell me about a time you overcame a learning setback.",
      answer: "I rebuilt my study system after missing a deadline…",
      feedback: "Strong ownership signal. Add a clearer outcome metric.",
      score: 74,
      createdAt: new Date(now - 172800000).toISOString(),
    },
  ],
  resumeVersions: [
    {
      id: "rv-1",
      label: "Baseline draft",
      score: 62,
      summary: "Initial resume generated from profile skills.",
      suggestions: [
        "Quantify project impact with metrics",
        "Add a role-targeted summary",
        "Tighten skills to the top 8 keywords",
      ],
      preview:
        "Aspiring software engineer with projects in React and TypeScript. Seeking internship opportunities.",
      createdAt: new Date(now - 604800000).toISOString(),
    },
  ],
};

export function resolveCareerTargetSkills(targetRole?: string): string[] {
  const key = (targetRole || "").trim().toLowerCase();
  for (const [role, skills] of Object.entries(CAREER_TARGET_SKILLS)) {
    if (role !== "default" && key.includes(role)) return skills;
  }
  return CAREER_TARGET_SKILLS.default ?? [];
}
