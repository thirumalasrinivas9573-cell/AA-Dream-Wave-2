import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  BookOpen,
  Briefcase,
  Building2,
  Compass,
  LineChart,
  MessageSquareText,
  Sparkles,
  Target,
  Workflow,
} from "lucide-react";

export type LandingFeature = {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
};

export type LandingAiCapability = {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
};

export type LandingStat = {
  id: string;
  label: string;
  value: number;
  suffix?: string;
  prefix?: string;
};

/**
 * Marketing landing content — presentation data only.
 */
export const LANDING_FEATURES: LandingFeature[] = [
  {
    id: "adaptive-paths",
    title: "Adaptive learning paths",
    description:
      "Personalized roadmaps that adjust to goals, pace, and demonstrated skill — not one-size-fits-all curricula.",
    icon: Compass,
  },
  {
    id: "ai-mentor",
    title: "AI mentor guidance",
    description:
      "On-demand coaching that clarifies concepts, reviews progress, and keeps learners focused on the next best step.",
    icon: MessageSquareText,
  },
  {
    id: "skill-clarity",
    title: "Skill clarity",
    description:
      "Transparent progress signals so students, teachers, and institutions share the same view of mastery.",
    icon: Target,
  },
  {
    id: "institution-ready",
    title: "Institution ready",
    description:
      "Structured experiences for classrooms and cohorts with consistent quality across programs and campuses.",
    icon: Building2,
  },
  {
    id: "career-aligned",
    title: "Career-aligned outcomes",
    description:
      "Learning connected to real roles and pathways — so effort translates into opportunity, not just completion.",
    icon: Briefcase,
  },
  {
    id: "insightful-ops",
    title: "Operational insight",
    description:
      "Lightweight analytics that surface engagement, completion, and support needs without drowning teams in noise.",
    icon: LineChart,
  },
];

export const LANDING_AI_CAPABILITIES: LandingAiCapability[] = [
  {
    id: "mentor",
    title: "AI Mentor",
    description: "Guided conversations that explain, challenge, and reinforce.",
    icon: Sparkles,
  },
  {
    id: "assistant",
    title: "AI Learning Assistant",
    description: "Contextual help inside lessons, tasks, and practice flows.",
    icon: BookOpen,
  },
  {
    id: "career",
    title: "AI Career Guidance",
    description: "Role-aware recommendations tied to skills and goals.",
    icon: Workflow,
  },
  {
    id: "analytics",
    title: "AI Analytics",
    description: "Signals that help educators and leaders act earlier.",
    icon: BarChart3,
  },
];

export const LANDING_STATS: LandingStat[] = [
  { id: "students", label: "Students", value: 25000, suffix: "+" },
  { id: "courses", label: "Courses", value: 480, suffix: "+" },
  { id: "institutions", label: "Institutions", value: 120, suffix: "+" },
  { id: "businesses", label: "Businesses", value: 85, suffix: "+" },
  { id: "ai-sessions", label: "AI Sessions", value: 1_000_000, suffix: "+" },
];

export type LandingTestimonial = {
  id: string;
  name: string;
  role: string;
  organization: string;
  quote: string;
  rating: number;
  initials: string;
};

export const LANDING_TESTIMONIALS: LandingTestimonial[] = [
  {
    id: "maya",
    name: "Maya Chen",
    role: "Learning Designer",
    organization: "Northbridge University",
    quote:
      "Dream Wave gave our cohort a shared language for progress. Mentorship feels intentional, not noisy.",
    rating: 5,
    initials: "MC",
  },
  {
    id: "jordan",
    name: "Jordan Blake",
    role: "Director of Talent",
    organization: "Helix Systems",
    quote:
      "We finally connected upskilling to role outcomes. The experience is calm, clear, and enterprise-ready.",
    rating: 5,
    initials: "JB",
  },
  {
    id: "amira",
    name: "Amira Hassan",
    role: "Student",
    organization: "Independent learner",
    quote:
      "I always know the next step. The AI guidance is focused — it helps me move, not overwhelm me.",
    rating: 4,
    initials: "AH",
  },
];

export type LandingOverview = {
  id: string;
  title: string;
  description: string;
  points: string[];
  href: string;
  icon: LucideIcon;
};

export const LANDING_OVERVIEWS: LandingOverview[] = [
  {
    id: "students",
    title: "Student platform",
    description:
      "Goals, roadmaps, mentor chat, and tasks in one focused workspace.",
    points: ["Adaptive goals", "AI mentor modes", "Progress clarity"],
    href: "#ai-showcase",
    icon: Target,
  },
  {
    id: "institutions",
    title: "Institution overview",
    description:
      "Operate departments, faculty, and cohorts with shared visibility.",
    points: ["Campus structure", "Faculty tools", "Outcome reporting"],
    href: "#institutions",
    icon: Building2,
  },
  {
    id: "companies",
    title: "Company overview",
    description:
      "Connect learning programs to role readiness and team outcomes.",
    points: ["Skill gaps", "Role pathways", "Team upskilling"],
    href: "#companies",
    icon: Briefcase,
  },
  {
    id: "books",
    title: "Books & knowledge",
    description:
      "Libraries, reader tools, and AI reading assistance in one place.",
    points: ["Scoped libraries", "Reader progress", "AI summaries"],
    href: "#books",
    icon: BookOpen,
  },
  {
    id: "animation",
    title: "Educational animation",
    description:
      "Interactive lessons with custom players, quizzes, and 3D scenes.",
    points: ["Chapter timelines", "Practice quizzes", "Watch progress"],
    href: "#animation",
    icon: Sparkles,
  },
];

export type LandingPricingPlan = {
  id: string;
  name: string;
  price: string;
  period: string;
  description: string;
  featured?: boolean;
  features: string[];
  cta: string;
};

export const LANDING_PRICING: LandingPricingPlan[] = [
  {
    id: "starter",
    name: "Starter",
    price: "Free",
    period: "forever",
    description: "For individual learners exploring Dream Wave.",
    features: [
      "AI mentor (limited)",
      "Goals & tasks",
      "Books library access",
      "Core animation lessons",
    ],
    cta: "Start free",
  },
  {
    id: "pro",
    name: "Pro",
    price: "$24",
    period: "per month",
    description: "For serious students who want full AI depth.",
    featured: true,
    features: [
      "Unlimited mentor & AI studio",
      "Career + resume assistants",
      "Full animation studio",
      "Priority support",
    ],
    cta: "Go Pro",
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "Custom",
    period: "annual",
    description: "For institutions and companies at scale.",
    features: [
      "Institution & company workspaces",
      "Admin analytics",
      "SSO-ready architecture",
      "Dedicated success partner",
    ],
    cta: "Talk to sales",
  },
];

export type LandingFaq = {
  id: string;
  question: string;
  answer: string;
};

export const LANDING_FAQS: LandingFaq[] = [
  {
    id: "who",
    question: "Who is Dream Wave for?",
    answer:
      "Students, educators, institutions, and companies who want AI-assisted learning with clear progress and enterprise-grade structure.",
  },
  {
    id: "ai",
    question: "How does the AI mentor work?",
    answer:
      "The mentor provides guided conversations across career, learning, and motivation modes. Responses are goal-aware and stored in your conversation history.",
  },
  {
    id: "institutions",
    question: "Can institutions manage cohorts?",
    answer:
      "Yes. The institution workspace covers departments, faculty, students, classes, and reporting with a consistent operational shell.",
  },
  {
    id: "offline",
    question: "What happens if I go offline?",
    answer:
      "The app shows an offline banner. Cached UI remains available; actions that need the API resume when your connection returns.",
  },
  {
    id: "pricing",
    question: "Can I change plans later?",
    answer:
      "Yes. Start on Starter and upgrade to Pro or Enterprise when your team or learning depth grows.",
  },
];
