export interface User {
  id: string;
  name: string;
  email: string;
  aaid: string;
  role: 'user' | 'admin';
  profileImage?: string;
  bio?: string;
  level: number;
  credits: number;
  streak: number;
  learningStreak?: number;
  plan: 'free' | 'pro' | 'team';
  organizationId?: string | null;
  targetCareer?: string;
  isEmailVerified?: boolean;
  certificates?: { title: string; skill: string; issuedAt?: string; credentialId?: string }[];
  preferences?: {
    theme: 'light' | 'dark' | 'system';
    language: string;
    notifications: boolean;
    emailUpdates: boolean;
    focusMinutes?: number;
  };
  createdAt?: string;
}

export interface Milestone {
  _id?: string;
  title: string;
  completed: boolean;
  dueDate?: string;
}

export interface Goal {
  _id: string;
  title: string;
  description?: string;
  category?: string;
  status: 'active' | 'completed' | 'paused';
  progress: number;
  targetDate?: string;
  priority: 'low' | 'medium' | 'high';
  milestones: Milestone[];
  createdAt: string;
}

export interface Task {
  _id: string;
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high';
  status: 'todo' | 'in_progress' | 'done';
  dueDate?: string;
  goal?: string;
  completedAt?: string;
  createdAt: string;
}

export interface Roadmap {
  _id: string;
  title: string;
  career: string;
  description?: string;
  skills: { _id?: string; name: string; level: string; progress: number }[];
  timeline: {
    _id?: string;
    phase: number;
    title: string;
    duration: string;
    topics: string[];
    completed: boolean;
  }[];
  progress: number;
  status: string;
}

export interface Book {
  _id: string;
  title: string;
  author: string;
  category: string;
  description: string;
  coverUrl?: string;
  pages: number;
  userMeta?: {
    bookmarked: boolean;
    readingProgress: number;
    status: string;
  } | null;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  attachments?: { url: string; type: string; name: string }[];
  createdAt?: string;
}

export interface Conversation {
  _id: string;
  title: string;
  mode?: string;
  pinned?: boolean;
  messages?: ChatMessage[];
  preview?: string;
  messageCount?: number;
  updatedAt: string;
}

export interface Post {
  _id: string;
  content: string;
  image?: string;
  likes: string[];
  comments: { _id?: string; user: { _id: string; name: string; profileImage?: string }; text: string; createdAt: string }[];
  user: { _id: string; name: string; profileImage?: string; aaid?: string };
  createdAt: string;
}

export interface Report {
  _id: string;
  title: string;
  type: string;
  career?: string;
  sections: { title: string; content: string }[];
  data?: Record<string, unknown>;
  createdAt: string;
}

export interface NotificationItem {
  _id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  link?: string;
  createdAt: string;
}

export interface DashboardStats {
  goalsActive: number;
  goalsCompleted: number;
  goalsTotal: number;
  tasksDone: number;
  tasksTodo: number;
  tasksOverdue: number;
  tasksTotal: number;
  avgGoalProgress: number;
  roadmapProgress: number;
  roadmapsTotal: number;
  reports: number;
  topGoal?: string;
  tasksCompletedThisWeek: number;
  weeklyActivity: { date: string; count: number }[];
  streak: number;
  level: number;
  credits: number;
  name?: string;
  skillsCount?: number;
  avgSkillMastery?: number;
  habitsActive?: number;
  studyPlans?: number;
  documents?: number;
  learningStreak?: number;
}

export interface AiMode {
  id: string;
  label: string;
  description: string;
}

export interface DocItem {
  _id: string;
  title: string;
  fileUrl: string;
  fileType: string;
  summary?: string;
  notes?: string;
  keyPoints?: string[];
  status: string;
  createdAt: string;
}

export interface Habit {
  _id: string;
  title: string;
  description?: string;
  frequency: string;
  streak: number;
  bestStreak: number;
  completions: { date: string; completed: boolean }[];
}

export interface Skill {
  _id: string;
  name: string;
  category: string;
  level: string;
  mastery: number;
  targetMastery: number;
}

export interface StudyPlan {
  _id: string;
  title: string;
  topic: string;
  progress: number;
  schedule: { _id?: string; day: number; focus: string; tasks: string[]; completed: boolean }[];
}

export interface PlannerEvent {
  _id: string;
  title: string;
  description?: string;
  type: string;
  start: string;
  end?: string;
  priority: string;
  completed: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  token?: string;
}
