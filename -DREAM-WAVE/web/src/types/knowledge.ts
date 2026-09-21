export type LibraryScope = "personal" | "institution" | "company" | "public";

export type BookDifficulty = "beginner" | "intermediate" | "advanced";

export type KnowledgeBook = {
  id: string;
  title: string;
  author: string;
  authorBio: string;
  category: string;
  subject: string;
  description: string;
  cover: string;
  rating: number;
  pages: number;
  language: string;
  difficulty: BookDifficulty;
  publishedYear: number;
  libraries: LibraryScope[];
  tags: string[];
  pdfUrl?: string;
  chapters: KnowledgeChapter[];
  relatedIds: string[];
  aiSummary: string;
  keyConcepts: string[];
  importantPoints: string[];
  learningPath: string[];
};

export type KnowledgeChapter = {
  id: string;
  title: string;
  pages: number;
  content: string;
  summary: string;
};

export type ReadingProgress = {
  bookId: string;
  chapterId: string;
  percent: number;
  lastReadAt: string;
  completed: boolean;
};

export type Bookmark = {
  id: string;
  bookId: string;
  chapterId: string;
  label: string;
  createdAt: string;
};

export type BookNote = {
  id: string;
  bookId: string;
  chapterId: string;
  text: string;
  createdAt: string;
};

export type Highlight = {
  id: string;
  bookId: string;
  chapterId: string;
  text: string;
  createdAt: string;
};

export type Flashcard = {
  id: string;
  bookId: string;
  front: string;
  back: string;
};

export type QuizQuestion = {
  id: string;
  bookId: string;
  question: string;
  options: string[];
  answerIndex: number;
};

export type KnowledgeTopic = {
  id: string;
  title: string;
  description: string;
  relatedBookIds: string[];
  nextTopicIds: string[];
};

export type KnowledgeGraphNode = {
  id: string;
  label: string;
  kind: "topic" | "concept" | "book";
  bookId?: string;
};

export type KnowledgeGraphEdge = {
  from: string;
  to: string;
  relation: string;
};

export type FavoriteCollection = {
  id: string;
  title: string;
  description: string;
  bookIds: string[];
};

export type KnowledgeUserState = {
  favorites: string[];
  recentSearches: string[];
  progress: ReadingProgress[];
  bookmarks: Bookmark[];
  notes: BookNote[];
  highlights: Highlight[];
  history: string[];
  collections: FavoriteCollection[];
};
