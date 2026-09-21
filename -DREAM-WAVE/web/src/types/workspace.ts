export type WorkspaceTaskStatus = "todo" | "doing" | "done";

export type WorkspaceTaskPriority = "High" | "Medium" | "Low";

export type WorkspaceTask = {
  id: string;
  title: string;
  category: string;
  priority: WorkspaceTaskPriority;
  status: WorkspaceTaskStatus;
  dueDate?: string;
  createdAt: string;
  aiSuggested?: boolean;
};

export type WorkspaceGoalHorizon = "short" | "long";

export type WorkspaceGoal = {
  id: string;
  title: string;
  description: string;
  horizon: WorkspaceGoalHorizon;
  progress: number;
  category: string;
  targetDate?: string;
  aiRecommended?: boolean;
};

export type WorkspaceNote = {
  id: string;
  title: string;
  body: string;
  tags: string[];
  category: string;
  updatedAt: string;
  aiSummary?: string;
};

export type CalendarEventKind =
  | "study"
  | "interview"
  | "assignment"
  | "reminder"
  | "focus";

export type WorkspaceCalendarEvent = {
  id: string;
  title: string;
  kind: CalendarEventKind;
  date: string;
  startTime?: string;
  endTime?: string;
  notes?: string;
};

export type FocusSession = {
  id: string;
  mode: "focus" | "break";
  minutes: number;
  completedAt: string;
};

export type WorkspaceInsight = {
  id: string;
  title: string;
  detail: string;
  tone: "positive" | "neutral" | "action";
};

export type WorkspaceUserState = {
  tasks: WorkspaceTask[];
  goals: WorkspaceGoal[];
  notes: WorkspaceNote[];
  events: WorkspaceCalendarEvent[];
  sessions: FocusSession[];
  focusMinutesToday: number;
  productivityScore: number;
  dailyInsights: WorkspaceInsight[];
  weeklyInsights: WorkspaceInsight[];
  pomodoroLength: number;
  breakLength: number;
};
