import { ROUTES as BASE } from "@/constants/routes";
import type {
  FavoriteCollection,
  KnowledgeGraphEdge,
  KnowledgeGraphNode,
  KnowledgeTopic,
} from "@/types/knowledge";

export const KNOWLEDGE_ROUTES = {
  root: BASE.books,
  search: "/books/search",
  explorer: "/books/explorer",
  favorites: "/books/favorites",
  history: "/books/history",
  library: (scope: string) => `/books/library/${scope}`,
  detail: (id: string) => `/books/${id}`,
  read: (id: string) => `/books/${id}/read`,
} as const;

export const KNOWLEDGE_NAV = [
  { label: "Home", href: KNOWLEDGE_ROUTES.root },
  { label: "Discover", href: KNOWLEDGE_ROUTES.search },
  { label: "Explorer", href: KNOWLEDGE_ROUTES.explorer },
  { label: "Favorites", href: KNOWLEDGE_ROUTES.favorites },
  { label: "History", href: KNOWLEDGE_ROUTES.history },
] as const;

export const LIBRARY_SCOPES = [
  {
    id: "personal",
    title: "Personal library",
    description: "Books saved for your private learning path.",
  },
  {
    id: "institution",
    title: "Institution library",
    description: "Curriculum-aligned titles shared with learners.",
  },
  {
    id: "company",
    title: "Company library",
    description: "Upskilling titles for teams and roles.",
  },
  {
    id: "public",
    title: "Public library",
    description: "Open catalog available across Dream Wave.",
  },
] as const;

export const AI_SEARCH_SUGGESTIONS = [
  "habits for students",
  "deep focus techniques",
  "growth mindset classroom",
  "startup product loops",
  "career capital skills",
  "behavioral finance basics",
] as const;

export const AI_RECOMMENDED_TOPICS: KnowledgeTopic[] = [
  {
    id: "topic-habits",
    title: "Habit systems",
    description: "Build identity-based routines that compound.",
    relatedBookIds: ["atomic-habits", "grit", "art-of-learning"],
    nextTopicIds: ["topic-focus", "topic-mindset"],
  },
  {
    id: "topic-focus",
    title: "Deep focus",
    description: "Protect attention for rare and valuable work.",
    relatedBookIds: ["deep-work", "so-good", "atomic-habits"],
    nextTopicIds: ["topic-career", "topic-learning"],
  },
  {
    id: "topic-mindset",
    title: "Learning mindset",
    description: "Treat ability as developable through practice.",
    relatedBookIds: ["mindset", "grit", "art-of-learning"],
    nextTopicIds: ["topic-learning", "topic-habits"],
  },
  {
    id: "topic-career",
    title: "Career craft",
    description: "Earn rare skills before chasing passion narratives.",
    relatedBookIds: ["so-good", "deep-work", "zero-to-one"],
    nextTopicIds: ["topic-startups", "topic-focus"],
  },
  {
    id: "topic-startups",
    title: "Startup building",
    description: "Validate ideas and create unique value.",
    relatedBookIds: ["lean-startup", "zero-to-one", "psychology-of-money"],
    nextTopicIds: ["topic-career", "topic-money"],
  },
  {
    id: "topic-money",
    title: "Money behavior",
    description: "Make durable financial decisions under uncertainty.",
    relatedBookIds: ["psychology-of-money", "sapiens"],
    nextTopicIds: ["topic-startups"],
  },
  {
    id: "topic-learning",
    title: "Deliberate practice",
    description: "Accelerate mastery with fundamentals and recovery.",
    relatedBookIds: ["art-of-learning", "mindset", "grit"],
    nextTopicIds: ["topic-mindset", "topic-habits"],
  },
];

export const KNOWLEDGE_GRAPH_NODES: KnowledgeGraphNode[] = [
  { id: "n-habits", label: "Habits", kind: "topic" },
  { id: "n-identity", label: "Identity change", kind: "concept" },
  { id: "n-focus", label: "Deep work", kind: "topic" },
  { id: "n-attention", label: "Attention residue", kind: "concept" },
  { id: "n-mindset", label: "Growth mindset", kind: "topic" },
  { id: "n-grit", label: "Grit", kind: "concept" },
  { id: "n-career", label: "Career capital", kind: "topic" },
  { id: "n-mvp", label: "Validated learning", kind: "concept" },
  { id: "n-atomic", label: "Atomic Habits", kind: "book", bookId: "atomic-habits" },
  { id: "n-deep", label: "Deep Work", kind: "book", bookId: "deep-work" },
  { id: "n-dweck", label: "Mindset", kind: "book", bookId: "mindset" },
  { id: "n-so-good", label: "So Good…", kind: "book", bookId: "so-good" },
  { id: "n-lean", label: "Lean Startup", kind: "book", bookId: "lean-startup" },
];

export const KNOWLEDGE_GRAPH_EDGES: KnowledgeGraphEdge[] = [
  { from: "n-habits", to: "n-identity", relation: "builds" },
  { from: "n-habits", to: "n-atomic", relation: "covered in" },
  { from: "n-focus", to: "n-attention", relation: "explains" },
  { from: "n-focus", to: "n-deep", relation: "covered in" },
  { from: "n-mindset", to: "n-grit", relation: "supports" },
  { from: "n-mindset", to: "n-dweck", relation: "covered in" },
  { from: "n-career", to: "n-so-good", relation: "covered in" },
  { from: "n-career", to: "n-focus", relation: "requires" },
  { from: "n-mvp", to: "n-lean", relation: "covered in" },
  { from: "n-habits", to: "n-focus", relation: "enables" },
  { from: "n-grit", to: "n-career", relation: "sustains" },
];

export const DEFAULT_COLLECTIONS: FavoriteCollection[] = [
  {
    id: "col-focus",
    title: "Focus stack",
    description: "Protect attention and deepen craft.",
    bookIds: ["deep-work", "atomic-habits", "so-good"],
  },
  {
    id: "col-learning",
    title: "Learning science",
    description: "Mindset, grit, and deliberate practice.",
    bookIds: ["mindset", "grit", "art-of-learning"],
  },
  {
    id: "col-builders",
    title: "Builder library",
    description: "Startup and product thinking.",
    bookIds: ["lean-startup", "zero-to-one", "psychology-of-money"],
  },
];
