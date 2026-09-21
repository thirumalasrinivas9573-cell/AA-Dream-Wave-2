import type { LearnWeeklyPlanItem } from "@/types/learn";

export const LEARN_ROUTES = {
  root: "/learn",
  library: "/learn/library",
  favorites: "/learn/favorites",
  history: "/learn/history",
  analytics: "/learn/analytics",
  subject: (subject: string) => `/learn/library/${subject}`,
  detail: (id: string) => `/learn/${id}`,
  watch: (id: string) => `/learn/${id}/watch`,
} as const;

export const LEARN_NAV = [
  { label: "Home", href: LEARN_ROUTES.root },
  { label: "Library", href: LEARN_ROUTES.library },
  { label: "Favorites", href: LEARN_ROUTES.favorites },
  { label: "History", href: LEARN_ROUTES.history },
  { label: "Analytics", href: LEARN_ROUTES.analytics },
] as const;

export const LEARN_SUBJECTS = [
  { id: "science", label: "Science", description: "Physics, chemistry, and systems of nature." },
  { id: "math", label: "Mathematics", description: "Foundations through applied problem solving." },
  { id: "programming", label: "Programming", description: "Code concepts with visual explanations." },
  { id: "design", label: "Design", description: "Visual hierarchy, UX, and product craft." },
  { id: "business", label: "Business", description: "Strategy, markets, and decision frameworks." },
] as const;

export const LEARN_TOPICS = [
  { id: "fundamentals", label: "Fundamentals" },
  { id: "systems", label: "Systems" },
  { id: "practice", label: "Practice" },
  { id: "advanced", label: "Advanced" },
  { id: "career", label: "Career" },
] as const;

export const SAMPLE_VIDEO_HD =
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";
export const SAMPLE_VIDEO_SD =
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4";
export const SAMPLE_VIDEO_ALT =
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4";

export const LEARN_SUBTITLE_TRACKS = [
  { id: "en", label: "English", lang: "en" },
  { id: "hi", label: "Hindi (guide)", lang: "hi" },
  { id: "es", label: "Spanish (guide)", lang: "es" },
] as const;

export const DEFAULT_DAILY_GOALS = [
  {
    id: "goal-watch",
    title: "Watch 20 minutes",
    description: "Complete focused animation time today.",
    targetMinutes: 20,
    completed: false,
  },
  {
    id: "goal-quiz",
    title: "Finish one quiz",
    description: "Practice with an interactive quiz overlay.",
    targetMinutes: 10,
    completed: false,
  },
  {
    id: "goal-notes",
    title: "Capture 2 notes",
    description: "Save important takeaways while watching.",
    targetMinutes: 5,
    completed: false,
  },
] as const;

export const DEFAULT_WEEKLY_PLAN: LearnWeeklyPlanItem[] = [
  {
    id: "wp-mon",
    day: "Mon",
    title: "Atomic foundations",
    animationId: "atom-basics",
    focus: "Science fundamentals",
    minutes: 25,
  },
  {
    id: "wp-tue",
    day: "Tue",
    title: "Vector intuition",
    animationId: "math-vectors",
    focus: "Math practice",
    minutes: 20,
  },
  {
    id: "wp-wed",
    day: "Wed",
    title: "Looping systems",
    animationId: "algo-loops",
    focus: "Programming systems",
    minutes: 30,
  },
  {
    id: "wp-thu",
    day: "Thu",
    title: "State models",
    animationId: "react-state",
    focus: "Programming advanced",
    minutes: 25,
  },
  {
    id: "wp-fri",
    day: "Fri",
    title: "Visual hierarchy",
    animationId: "ux-hierarchy",
    focus: "Design craft",
    minutes: 20,
  },
  {
    id: "wp-sat",
    day: "Sat",
    title: "Market signals",
    animationId: "market-fit",
    focus: "Career / business",
    minutes: 25,
  },
  {
    id: "wp-sun",
    day: "Sun",
    title: "Review & quiz",
    focus: "Spaced repetition",
    minutes: 15,
  },
];

export const LEARN_PRACTICE_PROBLEMS: Record<
  string,
  Array<{ id: string; prompt: string; hint: string }>
> = {
  "atom-basics": [
    {
      id: "ab-p1",
      prompt: "Explain orbitals in one sentence using probability language.",
      hint: "Avoid planetary rings; think density clouds.",
    },
  ],
  "math-vectors": [
    {
      id: "mv-p1",
      prompt: "Add vectors (2,1) and (1,3). What is the result?",
      hint: "Add components independently.",
    },
  ],
  "algo-loops": [
    {
      id: "al-p1",
      prompt: "When would a while-loop be safer than a for-loop?",
      hint: "Unknown iteration count until a condition is met.",
    },
  ],
  "react-state": [
    {
      id: "rs-p1",
      prompt: "Name one bug caused by mutating state directly.",
      hint: "React may skip re-render because reference did not change.",
    },
  ],
  "ux-hierarchy": [
    {
      id: "ux-p1",
      prompt: "List two ways to elevate a primary CTA visually.",
      hint: "Size, contrast, whitespace, or position.",
    },
  ],
  "market-fit": [
    {
      id: "mf-p1",
      prompt: "What retention signal suggests early PMF?",
      hint: "Organic return usage without heavy prompts.",
    },
  ],
};

export const LEARN_RELATED_BOOKS: Record<string, string[]> = {
  "atom-basics": ["mindset", "art-of-learning"],
  "math-vectors": ["art-of-learning", "grit"],
  "algo-loops": ["deep-work", "so-good"],
  "react-state": ["deep-work", "lean-startup"],
  "ux-hierarchy": ["so-good", "atomic-habits"],
  "market-fit": ["lean-startup", "zero-to-one", "psychology-of-money"],
};

export const LEARN_RELATED_PROJECTS: Record<
  string,
  Array<{ id: string; title: string; href: string }>
> = {
  "atom-basics": [
    { id: "p-atom", title: "Build a Bohr vs cloud model comparison", href: "/research" },
  ],
  "math-vectors": [
    { id: "p-vec", title: "Simulate 2D vector addition visually", href: "/research" },
  ],
  "algo-loops": [
    { id: "p-loop", title: "Animate loop control-flow diagrams", href: "/community/projects" },
  ],
  "react-state": [
    { id: "p-state", title: "Refactor a component to immutable updates", href: "/community/projects" },
  ],
  "ux-hierarchy": [
    { id: "p-ux", title: "Redesign a landing hero hierarchy", href: "/community/projects" },
  ],
  "market-fit": [
    { id: "p-pmf", title: "Interview 5 users for retention signals", href: "/ai/career" },
  ],
};
