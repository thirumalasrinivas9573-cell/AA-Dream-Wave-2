export type LearnSubject =
  | "science"
  | "math"
  | "programming"
  | "design"
  | "business";

export type LearnTopic =
  | "fundamentals"
  | "systems"
  | "practice"
  | "advanced"
  | "career";

export type LearnChapter = {
  id: string;
  title: string;
  durationSec: number;
  startSec: number;
  summary: string;
  captionCues: Array<{ start: number; end: number; text: string }>;
};

export type LearnQuizQuestion = {
  id: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
};

export type LearnFlashcard = {
  id: string;
  front: string;
  back: string;
};

export type LearnDiagramNode = {
  id: string;
  label: string;
  x: number;
  y: number;
  detail: string;
};

export type LearnAnimation = {
  id: string;
  title: string;
  description: string;
  subject: LearnSubject;
  topic: LearnTopic;
  level: "Beginner" | "Intermediate" | "Advanced";
  durationSec: number;
  cover: string;
  videoSrc: string;
  poster?: string;
  resolutions: Array<{ label: string; src: string }>;
  chapters: LearnChapter[];
  quiz: LearnQuizQuestion[];
  flashcards: LearnFlashcard[];
  diagram: LearnDiagramNode[];
  relatedIds: string[];
  tags: string[];
};

export type WatchProgress = {
  animationId: string;
  positionSec: number;
  percent: number;
  completed: boolean;
  lastWatchedAt: string;
  chapterId?: string;
};

export type LearnNote = {
  id: string;
  animationId: string;
  chapterId?: string;
  text: string;
  createdAt: string;
};

export type LearnBookmark = {
  id: string;
  animationId: string;
  chapterId?: string;
  label: string;
  positionSec: number;
  createdAt: string;
};

export type LearnHighlight = {
  id: string;
  animationId: string;
  chapterId?: string;
  text: string;
  positionSec: number;
  createdAt: string;
};

export type LearnDailyGoal = {
  id: string;
  title: string;
  description: string;
  targetMinutes: number;
  completed: boolean;
};

export type LearnWeeklyPlanItem = {
  id: string;
  day: string;
  title: string;
  animationId?: string;
  focus: string;
  minutes: number;
};

export type LearnAchievement = {
  id: string;
  title: string;
  description: string;
  earned: boolean;
};

export type LearnUserState = {
  favorites: string[];
  history: string[];
  progress: WatchProgress[];
  notes: LearnNote[];
  bookmarks: LearnBookmark[];
  highlights: LearnHighlight[];
  completedQuizzes: string[];
  dailyGoals: LearnDailyGoal[];
  streakDays: number;
  lastActiveDate: string;
};

export type LessonSuggestion = {
  topic: string;
  category?: string;
  source?: string;
  reason?: string;
};

export type GeneratedLesson = {
  title: string;
  totalDuration?: string;
  difficulty?: string;
  keyTakeaways?: string[];
  scenes?: Array<{
    id?: number;
    title?: string;
    duration?: string;
    narration?: string;
    keyPoints?: string[];
  }>;
};
