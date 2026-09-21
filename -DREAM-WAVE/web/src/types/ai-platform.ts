export type AiAgentType = "mentor" | "productivity" | "research" | "career";

export type AiChatSession =
  | "mentor"
  | "teacher"
  | "career"
  | "books"
  | "resume"
  | string;

export type AiChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
  createdAt?: string;
};

export type AiChatResponse = {
  success: boolean;
  reply: string;
};

export type AiHistoryResponse = {
  success: boolean;
  messages: AiChatMessage[];
};

export type AiAgentResponse = {
  success: boolean;
  reply: string;
  agentName: string;
  agentType: AiAgentType;
};

export type AiRoadmapPhase = {
  title: string;
  duration: string;
  description: string;
  steps: string[];
};

export type AiRoadmapResponse = {
  success: boolean;
  phases: AiRoadmapPhase[];
};

export type AiBookSuggestion = {
  title: string;
  author: string;
  reason: string;
  category: string;
  level?: string;
};

export type AiBooksResponse = {
  success: boolean;
  books: AiBookSuggestion[];
};

export type AiResumePayload = {
  name: string;
  email?: string;
  phone?: string;
  summary?: string;
  skills: string | string[];
  experience: string;
  education?: string;
  targetRole?: string;
};

export type AiResumeResult = {
  headline?: string;
  summary?: string;
  skills?: string[];
  experience?: Array<{
    title: string;
    company: string;
    duration: string;
    bullets: string[];
  }>;
  education?: Array<{
    degree: string;
    institution: string;
    year: string;
  }>;
  tips?: string[];
  raw?: string;
};

export type AiResumeResponse = {
  success: boolean;
  resume: AiResumeResult;
};

export type AiDashboardStats = {
  goals: number;
  tasks: number;
  taskDone: number;
  aiChats: number;
};

export type AiProgress = {
  consistencyScore?: number;
  focusScore?: number;
  dailyStreak?: number;
  lastActivity?: string;
};

export type AiUserProfile = {
  tone?: string;
  interests?: string[];
  currentRole?: string;
  targetRole?: string;
  skills?: string[];
  notifications?: boolean;
};

export type AiPromptRecord = {
  id: string;
  text: string;
  tool: string;
  createdAt: string;
  favorite?: boolean;
};

export type AiRoadmapProgress = {
  goal: string;
  level: string;
  completedSteps: string[];
  phases: AiRoadmapPhase[];
  updatedAt: string;
};

export type AiDailyGoal = {
  id: string;
  label: string;
  done: boolean;
};

export type AiConversationBookmark = {
  id: string;
  tool: string;
  title: string;
  preview: string;
  createdAt: string;
};

export type AiStudyProgress = {
  quizzesCompleted: number;
  flashcardsReviewed: number;
  lessonsStarted: number;
  lastSubject?: string;
  lastActivityAt?: string;
};

export type AiPlatformUserState = {
  favorites: AiPromptRecord[];
  promptHistory: AiPromptRecord[];
  recentSearches: string[];
  roadmapProgress: AiRoadmapProgress | null;
  notifications: string[];
  dailyGoals: AiDailyGoal[];
  conversationBookmarks: AiConversationBookmark[];
  studyProgress: AiStudyProgress;
};
