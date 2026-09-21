export type GoalCategory =
  | "Education"
  | "Career"
  | "Personal"
  | "Health"
  | "Finance";

export type Goal = {
  _id: string;
  title: string;
  description?: string;
  category?: GoalCategory | string;
  deadline?: string;
  progress?: number;
  completed?: boolean;
  aiPlan?: string[] | Array<{ title?: string; step?: string }>;
  createdAt?: string;
};

export type GoalsResponse = {
  success: boolean;
  goals: Goal[];
};

export type GoalResponse = {
  success: boolean;
  goal: Goal;
  steps?: string[];
  message?: string;
};

export type TaskPriority = "High" | "Medium" | "Low";

export type Task = {
  _id: string;
  title: string;
  description?: string;
  priority?: TaskPriority | string;
  category?: string;
  completed?: boolean;
  type?: string;
  estimatedTime?: string;
  goalId?: string;
  day?: number;
  createdAt?: string;
};

export type TasksResponse = {
  success: boolean;
  tasks: Task[];
};

export type TaskResponse = {
  success: boolean;
  task: Task;
};

export type MentorMode = "general" | "hindu" | "christian" | "muslim";

export type MentorMessage = {
  role: "user" | "assistant";
  content: string;
  mode?: MentorMode;
};

export type MentorChatResponse = {
  success: boolean;
  reply: string;
  mode: MentorMode;
};

export type MentorHistoryResponse = {
  success: boolean;
  messages: MentorMessage[];
};

export type RoadmapSkill = {
  name: string;
  level?: string;
  priority?: string;
  order?: number;
  resources?: string;
};

export type RoadmapStep = {
  title?: string;
  description?: string;
  timeframe?: string;
  completed?: boolean;
};

export type RoadmapCareerPath = {
  title?: string;
  description?: string;
  avgSalary?: string;
  demand?: string;
};

export type RoadmapMilestone = {
  title?: string;
  timeframe?: string;
  description?: string;
};

export type RoadmapData = {
  currentStage?: string;
  overview?: string;
  careerPaths?: RoadmapCareerPath[];
  milestones?: RoadmapMilestone[];
  skills?: RoadmapSkill[];
  currentSkillFocus?: string;
  nextSteps?: RoadmapStep[];
  courses?: Array<{ title?: string; provider?: string; url?: string; level?: string }>;
  projects?: Array<{ title?: string; description?: string; difficulty?: string }>;
  salary?: string | { entry?: string; mid?: string; senior?: string; notes?: string };
  companies?: Array<{ name?: string; role?: string; notes?: string } | string>;
  tips?: string[] | Array<{ title?: string; detail?: string }>;
  [key: string]: unknown;
};

export type RoadmapDocument = {
  _id: string;
  goalId: string;
  data: RoadmapData;
};

export type RoadmapResponse = {
  success: boolean;
  roadmap: RoadmapDocument;
  fallback?: boolean;
  message?: string;
};

export type Book = {
  id?: string;
  title: string;
  author?: string;
  category?: string;
  rating?: number;
  cover?: string;
  desc?: string;
  thumbnail?: string;
};

export type BooksResponse = {
  success: boolean;
  books: Book[];
};

export type ReportSections = Record<string, string | undefined>;

export type ReportDocument = {
  _id: string;
  goal: string;
  report: ReportSections;
  createdAt?: string;
};

export type ReportsResponse = {
  success: boolean;
  reports: ReportDocument[];
};

export type ReportResponse = {
  success: boolean;
  report: ReportDocument;
  message?: string;
};
