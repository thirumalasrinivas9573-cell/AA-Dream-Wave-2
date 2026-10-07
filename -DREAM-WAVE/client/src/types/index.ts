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
  completed?: boolean;
  completedAt?: string;
  createdAt: string;
  workflowEnabled?: boolean;
  progressionStage?: ProgressionStage;
  stageStatus?: string;
  stagesSummary?: StagesSummary;
  certificateId?: string | null;
  progress?: number;
  actualMinutes?: number;
  estimatedMinutes?: number;
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

// ── Task Progression Types ──────────────────────────────────────────────────
export type StageState = 'locked' | 'current' | 'ready_for_verification' | 'completed' | 'failed' | 'generating';
export type ProgressionStage = 'learning' | 'exam' | 'certification' | 'completed';

export interface LearningRequirement {
  key: string;
  met: boolean;
  detail: string;
  actual?: number;
  required?: number;
  total?: number;
  completed?: number;
}

export interface LearningStage {
  state: StageState;
  verified: boolean;
  verifiedAt: string | null;
  requirements: LearningRequirement[];
  focus: {
    minutes: number;
    requiredMinutes: number;
  };
}

export interface ExamQuestion {
  questionId: string;
  question: string;
  options: string[];
}

export interface ExamData {
  examId: string;
  startedAt: string;
  expiresAt: string;
  serverNow?: string;
  remainingSeconds: number;
  timeLimitMinutes: number;
  questionCount: number;
  questions: ExamQuestion[];
}

export interface ExamQuestionResult {
  questionId: string;
  isCorrect: boolean;
  explanation?: string;
}

export interface ExamSubmitResult {
  score: number;
  passed: boolean;
  minimumPassingPercentage: number;
  attemptNumber: number;
  correctCount: number;
  totalCount: number;
  nextStage: string;
  questionResults: ExamQuestionResult[];
}

export interface ExamSubmitBody {
  answers: { questionId: string; selectedIndex: number }[];
}

export interface ExamLastAttempt {
  attemptNumber: number;
  score: number;
  passed: boolean;
  evaluatedAt: string;
}

export interface ExamStage {
  state: StageState;
  locked: boolean;
  canUnlock: boolean;
  lockedReason?: string | null;
  lockedMessage?: string | null;
  attemptsCount: number;
  minimumPassingPercentage: number;
  questionCount: number;
  timeLimitMinutes: number;
  activeExam: ExamData | null;
  lastAttempt: ExamLastAttempt | null;
  retake?: {
    required: boolean;
    requirements: LearningRequirement[];
  };
}

export interface TaskCertificateInfo {
  credentialId: string;
  title: string;
  issuer: string;
  issuedAt: string;
  url?: string | null;
  verificationUrl?: string | null;
  skills?: string[];
  skill?: string;
  category?: string;
  verificationStatus?: string;
  documentUrl?: string | null;
  linkedToResume?: boolean;
  linkedResumeId?: string | null;
  linkedResumeIds?: string[];
}

export interface CertificationStage {
  state: StageState;
  certificate: TaskCertificateInfo | null;
  recoverableError: {
    code: string;
    message: string;
  } | null;
}

export interface StagesSummary {
  learning: StageState;
  exam: StageState;
  certification: StageState;
}

export interface TaskProgression {
  taskId: string;
  workflowEnabled: boolean;
  completed: boolean;
  progressionStage: ProgressionStage;
  stageStatus: string;
  serverNow?: string;
  links?: {
    goalId?: string | null;
    roadmapId?: string | null;
  };
  stages: {
    learning: LearningStage;
    exam: ExamStage;
    certification: CertificationStage;
  };
  stagesSummary?: StagesSummary;
}

export interface VerifyLearningResponse {
  success: boolean;
  verified: boolean;
  requirements?: LearningRequirement[];
  progression: TaskProgression;
}

export interface ExamStartResponse {
  success: boolean;
  exam: ExamData;
  progression: TaskProgression;
}

export interface ExamSubmitResponse {
  success: boolean;
  result: ExamSubmitResult;
  progression: TaskProgression;
}

export interface CertificateRetryResponse {
  success: boolean;
  progression: TaskProgression;
}

