import type {
  ResearchCollection,
  ResearchDocument,
  ResearchNote,
  ResearchProject,
  ResearchWorkspacePrefs,
} from "@/types/research";

export const RESEARCH_ROUTES = {
  root: "/research",
  project: (id: string) => `/research/${id}`,
} as const;

export const RESEARCH_CATEGORIES = [
  "General",
  "Science",
  "Technology",
  "Business",
  "Humanities",
  "Health",
] as const;

export const RESEARCH_FOLDERS = [
  { id: "inbox", label: "Inbox", description: "Unsorted research captures" },
  { id: "active", label: "Active studies", description: "In-progress projects" },
  { id: "sources", label: "Sources", description: "Papers and documents" },
  { id: "insights", label: "Insights", description: "Summaries and takeaways" },
  { id: "archive", label: "Archive", description: "Completed research" },
] as const;

export const AI_WRITING_ACTIONS = [
  {
    id: "rewrite",
    label: "Rewrite",
    prompt: "Rewrite the following research draft to be clearer and more academic while preserving meaning:\n\n",
  },
  {
    id: "grammar",
    label: "Grammar",
    prompt: "Fix grammar, spelling, and punctuation in the following text. Return only the corrected text:\n\n",
  },
  {
    id: "expand",
    label: "Expand",
    prompt: "Expand the following research notes with more depth, examples, and transitions:\n\n",
  },
  {
    id: "simplify",
    label: "Simplify",
    prompt: "Simplify the following text for a student audience without losing key ideas:\n\n",
  },
  {
    id: "translate",
    label: "Translate",
    prompt: "Translate the following research text to clear English academic prose:\n\n",
  },
] as const;

export const AI_RESEARCH_TOOLS = [
  {
    id: "summary",
    label: "AI Summary",
    prompt: "Summarize this research topic and current draft into key findings, open questions, and next steps:\n\n",
  },
  {
    id: "explain",
    label: "Topic explanation",
    prompt: "Explain this research topic like a patient tutor with definitions and examples:\n\n",
  },
  {
    id: "questions",
    label: "Question generator",
    prompt: "Generate 8 thoughtful research questions from beginner to advanced on:\n\n",
  },
  {
    id: "flashcards",
    label: "AI Flashcards",
    prompt: "Create 6 research flashcards (front/back) covering the essentials of:\n\n",
  },
  {
    id: "mindmap",
    label: "Mind map outline",
    prompt: "Create a hierarchical mind-map outline (root > branches > leaves) for:\n\n",
  },
  {
    id: "concepts",
    label: "Concept explorer",
    prompt: "List core concepts, related concepts, and misconceptions for:\n\n",
  },
] as const;

export const DEFAULT_RESEARCH_PREFS: ResearchWorkspacePrefs = {
  leftWidth: 280,
  rightWidth: 320,
  showLeft: true,
  showRight: true,
  fullscreen: false,
  splitReading: true,
};

const now = Date.now();

export const SEED_COLLECTIONS: ResearchCollection[] = [
  {
    id: "col-focus",
    name: "Deep Work",
    description: "Attention and productivity research",
    color: "#0f766e",
  },
  {
    id: "col-ai",
    name: "Applied AI",
    description: "AI learning systems and tooling",
    color: "#1d4ed8",
  },
];

export const SEED_DOCUMENTS: ResearchDocument[] = [
  {
    id: "doc-habits",
    title: "Atomic Habits — Excerpt",
    source: "Knowledge library",
    pdfUrl: "https://mozilla.github.io/pdf.js/web/compressed.tracemonkey-pldi-09.pdf",
    content:
      "Habits are the compound interest of self-improvement. Small choices seem insignificant at the moment, yet they determine the difference between who you are and who you could be.\n\nThe aggregation of marginal gains means improving by 1% consistently. Over time those improvements compound into remarkable results.\n\nCue, craving, response, and reward form the habit loop. Design environments that make good cues obvious and bad cues invisible.",
    highlights: [
      {
        id: "hl-1",
        text: "Habits are the compound interest of self-improvement.",
        note: "Core thesis",
        createdAt: new Date(now - 86400000).toISOString(),
      },
    ],
    bookmarks: [
      {
        id: "bm-1",
        label: "Habit loop",
        page: 1,
        createdAt: new Date(now - 86000000).toISOString(),
      },
    ],
  },
];

export const SEED_NOTES: ResearchNote[] = [
  {
    id: "note-1",
    title: "Environment design",
    body: "Make the cue of a good habit obvious and the cue of a bad habit invisible.",
    tags: ["habits", "environment"],
    category: "Humanities",
    collectionId: "col-focus",
    createdAt: new Date(now - 172800000).toISOString(),
    updatedAt: new Date(now - 86000000).toISOString(),
  },
  {
    id: "note-2",
    title: "AI tutor loop",
    body: "Explain → quiz → feedback → spaced review is a reliable learning loop for research study sessions.",
    tags: ["ai", "learning"],
    category: "Technology",
    collectionId: "col-ai",
    createdAt: new Date(now - 259200000).toISOString(),
    updatedAt: new Date(now - 172800000).toISOString(),
  },
];

export const SEED_PROJECTS: ResearchProject[] = [
  {
    id: "proj-habits",
    title: "Habit systems for students",
    topic: "Behavioral design for learning consistency",
    status: "active",
    summary:
      "Investigating how cue design and identity-based habits improve study streak reliability.",
    content:
      "# Habit systems for students\n\n## Research question\nHow can environment design improve daily study consistency?\n\n## Working notes\n- Identity: “I am a consistent learner”\n- Make starting friction low (2-minute rule)\n- Track streaks visually\n\n## Next experiments\n1. Morning cue card on desk\n2. Phone in another room during first focus block\n",
    tags: ["habits", "students"],
    category: "Humanities",
    collectionId: "col-focus",
    progress: 42,
    documentId: "doc-habits",
    timeline: [
      {
        id: "tl-1",
        label: "Project created",
        at: new Date(now - 432000000).toISOString(),
        kind: "created",
      },
      {
        id: "tl-2",
        label: "Imported Atomic Habits excerpt",
        at: new Date(now - 259200000).toISOString(),
        kind: "milestone",
      },
      {
        id: "tl-3",
        label: "Drafted research question",
        at: new Date(now - 172800000).toISOString(),
        kind: "edited",
      },
    ],
    createdAt: new Date(now - 432000000).toISOString(),
    updatedAt: new Date(now - 3600000).toISOString(),
  },
  {
    id: "proj-ai-tutor",
    title: "AI tutoring effectiveness",
    topic: "Adaptive feedback in digital learning",
    status: "active",
    summary:
      "Comparing guided AI explanations versus static notes for concept retention.",
    content:
      "# AI tutoring effectiveness\n\n## Hypothesis\nInteractive AI explanations with retrieval practice outperform passive reading.\n\n## Evidence so far\n- Students prefer immediate clarification loops\n- Flashcards generated from notes increase review frequency\n",
    tags: ["ai", "education"],
    category: "Technology",
    collectionId: "col-ai",
    progress: 28,
    documentId: null,
    timeline: [
      {
        id: "tl-a1",
        label: "Project created",
        at: new Date(now - 345600000).toISOString(),
        kind: "created",
      },
      {
        id: "tl-a2",
        label: "Captured tutor-loop note",
        at: new Date(now - 172800000).toISOString(),
        kind: "note",
      },
    ],
    createdAt: new Date(now - 345600000).toISOString(),
    updatedAt: new Date(now - 7200000).toISOString(),
  },
  {
    id: "proj-archive",
    title: "Note-taking frameworks",
    topic: "Zettelkasten vs outlining",
    status: "archived",
    summary: "Completed comparison of personal knowledge methods.",
    content: "# Note-taking frameworks\n\nArchived findings on atomic notes and linking.\n",
    tags: ["notes", "pkm"],
    category: "General",
    collectionId: null,
    progress: 100,
    documentId: null,
    timeline: [
      {
        id: "tl-b1",
        label: "Archived project",
        at: new Date(now - 604800000).toISOString(),
        kind: "milestone",
      },
    ],
    createdAt: new Date(now - 1209600000).toISOString(),
    updatedAt: new Date(now - 604800000).toISOString(),
  },
];
