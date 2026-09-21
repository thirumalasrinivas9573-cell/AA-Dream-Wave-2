export const AI_ROUTES = {
  root: "/ai",
  mentor: "/mentor",
  teacher: "/ai/teacher",
  career: "/ai/career",
  careerIntelligence: "/ai/career/intelligence",
  careerJobs: "/ai/career/jobs",
  careerInterview: "/ai/career/interview",
  careerReadiness: "/ai/career/readiness",
  careerCommandCenter: "/ai/career/command-center",
  careerToday: "/ai/career/today",
  careerAnalytics: "/ai/career/analytics",
  careerCopilot: "/ai/career/copilot",
  orchestration: "/ai/orchestration",
  roadmap: "/ai/roadmap",
  resume: "/ai/resume",
  books: "/ai/books",
  history: "/ai/history",
  favorites: "/ai/favorites",
} as const;

export const AI_TOOLS = [
  {
    id: "mentor",
    title: "AI Mentor",
    description: "Personal guidance across career, learning, and motivation.",
    href: AI_ROUTES.mentor,
  },
  {
    id: "teacher",
    title: "AI Teacher",
    description: "Subject lessons with interactive explanations.",
    href: AI_ROUTES.teacher,
  },
  {
    id: "career",
    title: "Career Intelligence",
    description: "Readiness, jobs, interviews, resume scoring, and placement insights.",
    href: AI_ROUTES.career,
  },
  {
    id: "roadmap",
    title: "Roadmap Generator",
    description: "Build phased timelines with progress tracking.",
    href: AI_ROUTES.roadmap,
  },
  {
    id: "resume",
    title: "Resume Assistant",
    description: "Generate and analyze ATS-ready resumes.",
    href: AI_ROUTES.resume,
  },
  {
    id: "books",
    title: "Book Assistant",
    description: "Book chat, chapter help, and reading picks.",
    href: AI_ROUTES.books,
  },
  {
    id: "orchestration",
    title: "AI Orchestration",
    description: "Multi-agent coordination with plan preview, approval, and audit.",
    href: AI_ROUTES.orchestration,
  },
  {
    id: "research",
    title: "Research Workspace",
    description: "Smart editor, notes, documents, and AI research tools.",
    href: "/research",
  },
] as const;

export const TEACHER_SUBJECTS = [
  {
    id: "programming",
    label: "Programming",
    blurb: "Code concepts, patterns, and practice drills.",
  },
  {
    id: "math",
    label: "Mathematics",
    blurb: "Foundations through applied problem solving.",
  },
  {
    id: "science",
    label: "Science",
    blurb: "Physics, chemistry, and biology explained clearly.",
  },
  {
    id: "business",
    label: "Business",
    blurb: "Strategy, finance basics, and case thinking.",
  },
  {
    id: "design",
    label: "Design",
    blurb: "UX principles, visual hierarchy, and critique.",
  },
  {
    id: "communication",
    label: "Communication",
    blurb: "Writing, speaking, and stakeholder clarity.",
  },
] as const;

export const CAREER_PROMPTS = [
  "What career fits my skills and interests?",
  "Show me the skill gaps for my target role.",
  "How do I switch careers in 6 months?",
  "What projects should I build for my portfolio?",
] as const;

export const TEACHER_PROMPTS = [
  "Explain this like I’m new to the subject",
  "Give me a 20-minute practice plan",
  "Quiz me on the key ideas",
  "Show a real-world example",
] as const;

export const BOOK_ASSISTANT_PROMPTS = [
  "Summarize the core idea of this book",
  "Explain this chapter in simple terms",
  "What should I read next?",
  "Give me takeaways I can apply today",
] as const;

export const MENTOR_PROMPTS = [
  "I feel lost and don’t know what to do",
  "I keep procrastinating on my goals",
  "How do I stay consistent every day?",
  "What should I focus on right now?",
] as const;

export const STUDY_LESSON_CARDS = [
  {
    id: "summary",
    title: "Chapter summary",
    prompt: "Give me a clear chapter-style summary of today’s topic with key takeaways.",
  },
  {
    id: "quiz",
    title: "Quick quiz",
    prompt: "Quiz me with 5 multiple-choice questions. Wait for my answers before revealing solutions.",
  },
  {
    id: "flashcards",
    title: "Flash cards",
    prompt: "Create 6 flash cards (front/back) for the core concepts we covered.",
  },
  {
    id: "practice",
    title: "Practice questions",
    prompt: "Give me 4 practice questions with increasing difficulty and hints.",
  },
  {
    id: "assignment",
    title: "AI assignment",
    prompt: "Assign a short practical assignment I can finish in 45 minutes, with success criteria.",
  },
] as const;

export const CAREER_CERTIFICATIONS: Record<string, string[]> = {
  "software engineer": [
    "AWS Cloud Practitioner",
    "Meta Front-End Developer",
    "Google IT Automation with Python",
  ],
  "data analyst": [
    "Google Data Analytics",
    "IBM Data Analyst",
    "Microsoft Power BI Data Analyst",
  ],
  "product manager": [
    "Google Project Management",
    "Meta Product Management",
    "Pragmatic Institute PMC",
  ],
  default: [
    "LinkedIn Learning Career Essentials",
    "Google Career Certificates",
    "Coursera Professional Certificates",
  ],
};

export const DEFAULT_DAILY_GOALS = [
  { id: "goal-mentor", label: "Ask your AI mentor one focused question", done: false },
  { id: "goal-study", label: "Complete one AI lesson or quiz", done: false },
  { id: "goal-roadmap", label: "Finish one roadmap milestone step", done: false },
] as const;
