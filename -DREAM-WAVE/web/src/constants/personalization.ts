import { KNOWLEDGE_ROUTES } from "@/constants/knowledge";
import { LEARN_ROUTES } from "@/constants/learn";
import { ROUTES } from "@/constants/routes";
import { WORKSPACE_ROUTES } from "@/constants/workspace";
import type {
  AccentColor,
  DashboardWidgetConfig,
  DashboardWidgetId,
  PersonalizationState,
  SmartNotification,
} from "@/types/personalization";

export const ACCENT_OPTIONS: Array<{
  id: AccentColor;
  label: string;
  css: string;
}> = [
  { id: "zinc", label: "Zinc", css: "oklch(0.45 0.02 260)" },
  { id: "blue", label: "Blue", css: "oklch(0.55 0.14 250)" },
  { id: "teal", label: "Teal", css: "oklch(0.55 0.1 185)" },
  { id: "rose", label: "Rose", css: "oklch(0.58 0.16 15)" },
  { id: "amber", label: "Amber", css: "oklch(0.7 0.14 75)" },
  { id: "violet", label: "Violet", css: "oklch(0.55 0.16 300)" },
];

export const DEFAULT_WIDGETS: DashboardWidgetConfig[] = [
  {
    id: "welcome",
    label: "Personalized welcome",
    description: "Greeting, AI daily and weekly summaries.",
    visible: true,
  },
  {
    id: "progress-stats",
    label: "Progress stats",
    description: "Learning, career, reading, animation, goals, productivity.",
    visible: true,
  },
  {
    id: "ai-summaries",
    label: "AI summaries",
    description: "Daily and weekly AI narrative cards.",
    visible: true,
  },
  {
    id: "recommendations",
    label: "AI recommendations",
    description: "Lessons, books, videos, projects, certifications, careers.",
    visible: true,
  },
  {
    id: "learning-insights",
    label: "Learning insights",
    description: "Heatmap, weekly/monthly analytics, study suggestions.",
    visible: true,
  },
  {
    id: "career-insights",
    label: "Career insights",
    description: "Readiness, skill gaps, placement, resume, interview.",
    visible: true,
  },
  {
    id: "productivity-insights",
    label: "Productivity insights",
    description: "Focus score, time usage, streaks, goals.",
    visible: true,
  },
  {
    id: "continue-learning",
    label: "Continue learning",
    description: "Resume books and animations.",
    visible: true,
  },
  {
    id: "notifications",
    label: "Notification center",
    description: "Smart alerts and reminders.",
    visible: true,
  },
  {
    id: "activity",
    label: "Activity timeline",
    description: "Recent cross-module activity.",
    visible: true,
  },
  {
    id: "quick-actions",
    label: "Quick actions",
    description: "Favorite shortcuts.",
    visible: true,
  },
];

export const DEFAULT_WIDGET_ORDER: DashboardWidgetId[] =
  DEFAULT_WIDGETS.map((item) => item.id);

export const DEFAULT_QUICK_ACTIONS = [
  { label: "Workspace", href: ROUTES.workspace },
  { label: "Focus", href: WORKSPACE_ROUTES.focus },
  { label: "Learn", href: LEARN_ROUTES.root },
  { label: "Library", href: KNOWLEDGE_ROUTES.root },
  { label: "Career", href: "/ai/career" },
  { label: "Mentor", href: ROUTES.mentor },
] as const;

const now = Date.now();

export const SEED_SMART_NOTIFICATIONS: SmartNotification[] = [
  {
    id: "sn-1",
    kind: "suggestion",
    title: "AI suggestion",
    body: "Protect a 25-minute deep-work block before noon.",
    href: WORKSPACE_ROUTES.focus,
    createdAt: new Date(now - 20 * 60000).toISOString(),
    read: false,
  },
  {
    id: "sn-2",
    kind: "learning",
    title: "Learning reminder",
    body: "Continue your Adaptive Learning lesson where you left off.",
    href: LEARN_ROUTES.root,
    createdAt: new Date(now - 90 * 60000).toISOString(),
    read: false,
  },
  {
    id: "sn-3",
    kind: "assignment",
    title: "Assignment reminder",
    body: "Research outline is due in 3 days.",
    href: ROUTES.research,
    createdAt: new Date(now - 3 * 3600000).toISOString(),
    read: true,
  },
  {
    id: "sn-4",
    kind: "career",
    title: "Career alert",
    body: "Interview readiness improved — schedule a mock interview.",
    href: "/ai/career/interview",
    createdAt: new Date(now - 5 * 3600000).toISOString(),
    read: false,
  },
];

export const SEED_PERSONALIZATION: PersonalizationState = {
  widgetOrder: [...DEFAULT_WIDGET_ORDER],
  widgets: structuredClone(DEFAULT_WIDGETS),
  accent: "teal",
  favoriteSections: ["recommendations", "career-insights", "productivity-insights"],
  quickActions: DEFAULT_QUICK_ACTIONS.map((item) => ({ ...item })),
  notifications: structuredClone(SEED_SMART_NOTIFICATIONS),
  denserLayout: false,
};

export const CERTIFICATION_RECS = [
  {
    title: "AWS Cloud Practitioner",
    detail: "Foundational cloud credential for product/engineering roles.",
    href: "/ai/career",
  },
  {
    title: "Google UX Design",
    detail: "Strengthen portfolio storytelling and interaction craft.",
    href: ROUTES.learn,
  },
] as const;

export const CAREER_PATH_RECS = [
  {
    title: "Full-stack engineer",
    detail: "Combine systems thinking with shipping velocity.",
    href: "/ai/career",
  },
  {
    title: "Product analyst",
    detail: "Pair learning analytics with decision frameworks.",
    href: ROUTES.roadmap,
  },
] as const;

export const PROJECT_RECS = [
  {
    title: "Adaptive study tracker",
    detail: "Ship a personal analytics project tied to your goals.",
    href: "/community/projects",
  },
  {
    title: "Interview story library",
    detail: "Build a STAR story vault from your notes.",
    href: WORKSPACE_ROUTES.notes,
  },
] as const;
