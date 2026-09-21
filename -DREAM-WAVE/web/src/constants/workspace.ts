import type { WorkspaceUserState } from "@/types/workspace";

export const WORKSPACE_ROUTES = {
  root: "/workspace",
  tasks: "/workspace/tasks",
  goals: "/workspace/goals",
  notes: "/workspace/notes",
  calendar: "/workspace/calendar",
  focus: "/workspace/focus",
  insights: "/workspace/insights",
} as const;

export const WORKSPACE_NAV = [
  { label: "Home", href: WORKSPACE_ROUTES.root },
  { label: "Tasks", href: WORKSPACE_ROUTES.tasks },
  { label: "Goals", href: WORKSPACE_ROUTES.goals },
  { label: "Notes", href: WORKSPACE_ROUTES.notes },
  { label: "Calendar", href: WORKSPACE_ROUTES.calendar },
  { label: "Focus", href: WORKSPACE_ROUTES.focus },
  { label: "Insights", href: WORKSPACE_ROUTES.insights },
] as const;

export const TASK_CATEGORIES = [
  "General",
  "Study",
  "Career",
  "Project",
  "Health",
] as const;

export const NOTE_CATEGORIES = [
  "General",
  "Lecture",
  "Research",
  "Interview",
  "Reflection",
] as const;

const today = () => new Date().toISOString().slice(0, 10);
const isoDaysFromNow = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

export const SEED_WORKSPACE: WorkspaceUserState = {
  tasks: [
    {
      id: "wt-1",
      title: "Finish Adaptive Learning quiz",
      category: "Study",
      priority: "High",
      status: "doing",
      dueDate: today(),
      createdAt: new Date().toISOString(),
    },
    {
      id: "wt-2",
      title: "Update resume bullets",
      category: "Career",
      priority: "Medium",
      status: "todo",
      dueDate: isoDaysFromNow(2),
      createdAt: new Date().toISOString(),
      aiSuggested: true,
    },
    {
      id: "wt-3",
      title: "Read Atomic Habits chapter 2",
      category: "Study",
      priority: "Medium",
      status: "todo",
      dueDate: isoDaysFromNow(1),
      createdAt: new Date().toISOString(),
    },
    {
      id: "wt-4",
      title: "Submit research outline",
      category: "Project",
      priority: "High",
      status: "todo",
      dueDate: isoDaysFromNow(3),
      createdAt: new Date().toISOString(),
    },
    {
      id: "wt-5",
      title: "Stretch + water break",
      category: "Health",
      priority: "Low",
      status: "done",
      dueDate: today(),
      createdAt: new Date().toISOString(),
      aiSuggested: true,
    },
  ],
  goals: [
    {
      id: "wg-1",
      title: "Ship portfolio project",
      description: "Complete and publish one full-stack learning project.",
      horizon: "short",
      progress: 45,
      category: "Career",
      targetDate: isoDaysFromNow(21),
    },
    {
      id: "wg-2",
      title: "Reach interview readiness",
      description: "Build confidence across DSA, system design basics, and resume.",
      horizon: "long",
      progress: 28,
      category: "Career",
      targetDate: isoDaysFromNow(90),
      aiRecommended: true,
    },
    {
      id: "wg-3",
      title: "Daily deep-work habit",
      description: "Protect two focused study blocks every weekday.",
      horizon: "short",
      progress: 60,
      category: "Personal",
      targetDate: isoDaysFromNow(14),
      aiRecommended: true,
    },
  ],
  notes: [
    {
      id: "wn-1",
      title: "Deep work ritual",
      body: "## Plan\n- Phone in another room\n- 25-minute pomodoro\n- One outcome per block\n\n## Reflection\nStarting friction drops when the cue is visible.",
      tags: ["focus", "habits"],
      category: "Reflection",
      updatedAt: new Date().toISOString(),
      aiSummary:
        "Protect attention with a visible cue, short focus blocks, and a single outcome.",
    },
    {
      id: "wn-2",
      title: "Interview stories",
      body: "### STAR notes\n- Situation: campus hackathon\n- Task: ship MVP overnight\n- Action: scoped ruthlessly, paired on API\n- Result: demoed and ranked top 5",
      tags: ["career", "interview"],
      category: "Interview",
      updatedAt: new Date().toISOString(),
      aiSummary: "A concise STAR story about shipping an MVP under time pressure.",
    },
  ],
  events: [
    {
      id: "we-1",
      title: "Study block · Algorithms",
      kind: "study",
      date: today(),
      startTime: "09:00",
      endTime: "10:00",
    },
    {
      id: "we-2",
      title: "Mock interview",
      kind: "interview",
      date: isoDaysFromNow(2),
      startTime: "16:00",
      endTime: "17:00",
    },
    {
      id: "we-3",
      title: "Assignment · Research summary",
      kind: "assignment",
      date: isoDaysFromNow(3),
      startTime: "18:00",
      endTime: "19:30",
    },
    {
      id: "we-4",
      title: "Review flashcards",
      kind: "reminder",
      date: today(),
      startTime: "21:00",
    },
  ],
  sessions: [
    {
      id: "ws-1",
      mode: "focus",
      minutes: 25,
      completedAt: new Date(Date.now() - 3600000).toISOString(),
    },
  ],
  focusMinutesToday: 25,
  productivityScore: 72,
  dailyInsights: [
    {
      id: "di-1",
      title: "Strong morning focus",
      detail: "Your first focus block landed before noon — keep that cue.",
      tone: "positive",
    },
    {
      id: "di-2",
      title: "Two high-priority tasks remain",
      detail: "Finish the quiz and research outline before tomorrow.",
      tone: "action",
    },
  ],
  weeklyInsights: [
    {
      id: "wi-1",
      title: "Consistency rising",
      detail: "You completed more study tasks this week than last week.",
      tone: "positive",
    },
    {
      id: "wi-2",
      title: "Break suggestion",
      detail: "After 3 focus sessions, schedule a 15-minute walk.",
      tone: "neutral",
    },
  ],
  pomodoroLength: 25,
  breakLength: 5,
};

export const AI_TASK_SUGGESTIONS = [
  "Review yesterday’s notes for 10 minutes",
  "Prepare one interview STAR story",
  "Clear inbox to zero",
  "Plan tomorrow’s top 3 outcomes",
] as const;

export const AI_GOAL_RECOMMENDATIONS = [
  {
    title: "Weekly skill sprint",
    description: "Pick one skill and practice it in 5 short sessions.",
    horizon: "short" as const,
    category: "Education",
  },
  {
    title: "Career capital project",
    description: "Ship a public artifact that demonstrates rare skills.",
    horizon: "long" as const,
    category: "Career",
  },
] as const;

export const QUICK_ACTIONS = [
  { label: "New task", href: WORKSPACE_ROUTES.tasks },
  { label: "Add note", href: WORKSPACE_ROUTES.notes },
  { label: "Start focus", href: WORKSPACE_ROUTES.focus },
  { label: "Open calendar", href: WORKSPACE_ROUTES.calendar },
  { label: "Continue learning", href: "/learn" },
  { label: "Smart library", href: "/books" },
] as const;
