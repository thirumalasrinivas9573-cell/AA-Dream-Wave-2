import api from './api';
import type {
  AiMode,
  Book,
  Conversation,
  DashboardStats,
  DocItem,
  Goal,
  Habit,
  NotificationItem,
  PlannerEvent,
  Post,
  Report,
  Roadmap,
  Skill,
  StudyPlan,
  Task,
  User,
} from '../types';

export const authApi = {
  signup: (body: { name: string; email: string; password: string; inviteToken?: string }) =>
    api.post<{ success: boolean; token: string; data: { user: User } }>('/auth/signup', body),
  login: (body: {
    email: string;
    password: string;
    portal?: 'student' | 'institution' | 'company';
  }) =>
    api.post<{
      success: boolean;
      token: string;
      data: {
        user: User;
        portal?: string;
        organization?: {
          id: string;
          name: string;
          slug: string;
          type: string;
          plan: string;
        } | null;
        membership?: { role: string } | null;
      };
    }>('/auth/login', body),
  me: () => api.get<{ success: boolean; data: { user: User } }>('/auth/me'),
  logout: () => api.post('/auth/logout'),
  forgotPassword: (email: string) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token: string, password: string) =>
    api.put<{ success: boolean; token: string; data: { user: User } }>(
      `/auth/reset-password/${token}`,
      { password }
    ),
  verifyEmail: (token: string) => api.get(`/auth/verify-email/${token}`),
  resendVerification: () => api.post('/auth/resend-verification'),
  sendOtp: () => api.post<{ success: boolean; message: string }>('/auth/otp/send'),
  verifyOtp: (code: string) =>
    api.post<{ success: boolean; message: string; data: { user: User } }>('/auth/otp/verify', {
      code,
    }),
  sessions: () =>
    api.get<{
      success: boolean;
      data: {
        sessions: { id: string; userAgent?: string; createdAt?: string; expiresAt?: string }[];
      };
    }>('/auth/sessions'),
  revokeSession: (id: string) => api.delete(`/auth/sessions/${id}`),
  updateProfile: (form: FormData) =>
    api.put('/auth/profile', form, { headers: { 'Content-Type': 'multipart/form-data' } }),
  changePassword: (body: { currentPassword: string; newPassword: string }) =>
    api.put('/auth/change-password', body),
  updatePreferences: (body: Record<string, unknown>) => api.put('/auth/preferences', body),
};

export const dashboardApi = {
  stats: () => api.get<{ success: boolean; data: { stats: DashboardStats } }>('/dashboard/stats'),
  progress: () =>
    api.get<{
      success: boolean;
      data: {
        progress: {
          overall: number;
          goals: { active: number; completed: number; avgProgress: number };
          tasks: {
            done: number;
            todo: number;
            overdue: number;
            completedThisWeek: number;
            weeklyActivity: { date: string; count: number }[];
          };
          learning: {
            skills: number;
            avgMastery: number;
            studyPlans: number;
            learningStreak: number;
            certificates: number;
          };
          roadmaps: {
            id: string;
            title: string;
            career?: string;
            progress: number;
            status?: string;
          }[];
          books: {
            reading: number;
            done: number;
            avgProgress: number;
            librarySize: number;
          };
          habitsActive: number;
          reports: number;
          streak: number;
          level: number;
          credits: number;
        };
      };
    }>('/dashboard/progress'),
  suggestions: () =>
    api.get<{ success: boolean; data: { suggestions: string[] } }>('/dashboard/suggestions'),
  notifications: () =>
    api.get<{ success: boolean; data: { notifications: NotificationItem[]; unread: number } }>(
      '/dashboard/notifications'
    ),
  markRead: (id: string) => api.patch(`/dashboard/notifications/${id}/read`),
  markAllRead: () => api.patch('/dashboard/notifications/read-all'),
  removeNotification: (id: string) => api.delete(`/dashboard/notifications/${id}`),
  clearRead: () => api.delete('/dashboard/notifications/read'),
};

export const goalsApi = {
  list: (params?: Record<string, string | number>) =>
    api.get<{ success: boolean; data: { goals: Goal[] } }>('/goals', { params }),
  create: (body: Partial<Goal>) => api.post('/goals', body),
  update: (id: string, body: Partial<Goal>) => api.put(`/goals/${id}`, body),
  remove: (id: string) => api.delete(`/goals/${id}`),
  toggleMilestone: (id: string, milestoneId: string) =>
    api.patch(`/goals/${id}/milestones/${milestoneId}`),
  updateProgress: (id: string, progress: number) => api.patch(`/goals/${id}/progress`, { progress }),
};

export const tasksApi = {
  list: (params?: Record<string, string>) =>
    api.get<{ success: boolean; data: { tasks: Task[] } }>('/tasks', { params }),
  create: (body: Partial<Task>) => api.post('/tasks', body),
  update: (id: string, body: Partial<Task>) => api.put(`/tasks/${id}`, body),
  remove: (id: string) => api.delete(`/tasks/${id}`),
  toggle: (id: string) => api.patch(`/tasks/${id}/toggle`),
};

export const roadmapApi = {
  list: () => api.get<{ success: boolean; data: { roadmaps: Roadmap[] } }>('/roadmap'),
  generate: (body: { career: string; level?: string }) =>
    api.post<{ success: boolean; data: { roadmap: Roadmap } }>('/roadmap/generate', body),
  generateAdaptive: (body: { career: string; level?: string }) =>
    api.post('/roadmap/generate-adaptive', body),
  adapt: (id: string) => api.post(`/roadmap/${id}/adapt`),
  milestones: (id: string) => api.get(`/roadmap/${id}/milestones`),
  togglePhase: (id: string, phaseId: string) => api.patch(`/roadmap/${id}/phases/${phaseId}`),
  updateSkill: (id: string, skillId: string, body: { progress?: number; level?: string }) =>
    api.patch(`/roadmap/${id}/skills/${skillId}`, body),
  remove: (id: string) => api.delete(`/roadmap/${id}`),
};

export const mentorApi = {
  list: (params?: Record<string, string>) =>
    api.get<{ success: boolean; data: { conversations: Conversation[] } }>('/mentor', { params }),
  create: (body?: { title?: string; mode?: string }) =>
    api.post<{ success: boolean; data: { conversation: Conversation } }>('/mentor', body || {}),
  get: (id: string) =>
    api.get<{ success: boolean; data: { conversation: Conversation } }>(`/mentor/${id}`),
  rename: (id: string, body: { title: string; pinned?: boolean }) =>
    api.patch(`/mentor/${id}`, body),
  send: (id: string, form: FormData) =>
    api.post<{ success: boolean; data: { conversation: Conversation; reply: string } }>(
      `/mentor/${id}/messages`,
      form,
      { headers: { 'Content-Type': 'multipart/form-data' } }
    ),
  exportUrl: (id: string) => `/api/mentor/${id}/export`,
  remove: (id: string) => api.delete(`/mentor/${id}`),
};

export const aiApi = {
  modes: () => api.get<{ success: boolean; data: { modes: AiMode[] } }>('/ai/modes'),
  models: () => api.get('/ai/models'),
  credits: () => api.get('/ai/credits'),
  usage: (params?: Record<string, string | number>) => api.get('/ai/usage', { params }),
  prompts: {
    list: (params?: Record<string, string>) => api.get('/ai/prompts', { params }),
    create: (body: { name: string; body: string; mode?: string; description?: string; isFavorite?: boolean }) =>
      api.post('/ai/prompts', body),
    update: (
      id: string,
      body: Partial<{ name: string; body: string; mode: string; description: string; isFavorite: boolean }>
    ) => api.put(`/ai/prompts/${id}`, body),
    remove: (id: string) => api.delete(`/ai/prompts/${id}`),
  },
  run: (body: {
    mode: string;
    message: string;
    conversationId?: string;
    context?: string;
    model?: string;
    promptId?: string;
  }) => api.post<{ success: boolean; data: { reply: string; conversation: Conversation } }>('/ai/run', body),
  quick: (body: { mode: string; prompt: string; context?: string; model?: string }) =>
    api.post<{ success: boolean; data: { reply: string; mode: string } }>('/ai/quick', body),
  stream: (body: {
    mode: string;
    message: string;
    conversationId?: string;
    context?: string;
    model?: string;
  }) => api.post('/ai/stream', body),
  assistant: (
    name: string,
    body: { message: string; conversationId?: string; context?: string; model?: string }
  ) => api.post(`/ai/assistants/${name}`, body),
};

export const documentsApi = {
  list: (params?: Record<string, string | number>) =>
    api.get<{ success: boolean; data: { documents: DocItem[] } }>('/documents', { params }),
  upload: (form: FormData) =>
    api.post<{ success: boolean; data: { document: DocItem } }>('/documents/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  get: (id: string) => api.get(`/documents/${id}`),
  analyze: (id: string, body: { action: string; question?: string }) =>
    api.post<{ success: boolean; data: { result: string; document: DocItem } }>(
      `/documents/${id}/analyze`,
      body
    ),
  quiz: (id: string) => api.post(`/documents/${id}/quiz`),
  remove: (id: string) => api.delete(`/documents/${id}`),
};

export const researchApi = {
  categories: () => api.get('/research/categories'),
  search: (params: Record<string, string | undefined>) => api.get('/research/search', { params }),
  analytics: (params?: { projectId?: string }) => api.get('/research/analytics', { params }),
  listProjects: (params?: Record<string, string | number | undefined>) =>
    api.get('/research/projects', { params }),
  createProject: (body: Record<string, unknown>) => api.post('/research/projects', body),
  getProject: (id: string) => api.get(`/research/projects/${id}`),
  updateProject: (id: string, body: Record<string, unknown>) =>
    api.patch(`/research/projects/${id}`, body),
  archiveProject: (id: string) => api.post(`/research/projects/${id}/archive`),
  deleteProject: (id: string) => api.delete(`/research/projects/${id}`),
  history: (id: string) => api.get(`/research/projects/${id}/history`),
  uploadDocument: (projectId: string, form: FormData) =>
    api.post(`/research/projects/${projectId}/documents`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  listDocuments: (projectId: string) => api.get(`/research/projects/${projectId}/documents`),
  knowledge: (docId: string) => api.get(`/research/documents/${docId}/knowledge`),
  processDocument: (docId: string) => api.post(`/research/documents/${docId}/process`),
  readingProgress: (docId: string, body: { percent?: number; lastPosition?: number }) =>
    api.patch(`/research/documents/${docId}/reading-progress`, body),
  aiSummary: (docId: string, body?: Record<string, unknown>) =>
    api.post(`/research/documents/${docId}/ai/summary`, body || {}),
  aiExplain: (docId: string, body?: Record<string, unknown>) =>
    api.post(`/research/documents/${docId}/ai/explain`, body || {}),
  aiSimplify: (docId: string, body?: Record<string, unknown>) =>
    api.post(`/research/documents/${docId}/ai/simplify`, body || {}),
  aiExpand: (docId: string, body?: Record<string, unknown>) =>
    api.post(`/research/documents/${docId}/ai/expand`, body || {}),
  aiQuestions: (docId: string, body?: Record<string, unknown>) =>
    api.post(`/research/documents/${docId}/ai/questions`, body || {}),
  aiFlashcards: (docId: string, body?: Record<string, unknown>) =>
    api.post(`/research/documents/${docId}/ai/flashcards`, body || {}),
  aiCitations: (docId: string, body?: Record<string, unknown>) =>
    api.post(`/research/documents/${docId}/ai/citations`, body || {}),
  aiSuggestions: (projectId: string) => api.post(`/research/projects/${projectId}/ai/suggestions`),
  notes: (projectId: string) => api.get(`/research/projects/${projectId}/notes`),
  createNote: (projectId: string, body: Record<string, unknown>) =>
    api.post(`/research/projects/${projectId}/notes`, body),
  highlights: (projectId: string, params?: Record<string, string | number>) =>
    api.get(`/research/projects/${projectId}/highlights`, { params }),
  createHighlight: (projectId: string, body: Record<string, unknown>) =>
    api.post(`/research/projects/${projectId}/highlights`, body),
  bookmarks: (projectId: string) => api.get(`/research/projects/${projectId}/bookmarks`),
  createBookmark: (projectId: string, body: Record<string, unknown>) =>
    api.post(`/research/projects/${projectId}/bookmarks`, body),
  collections: (projectId: string) => api.get(`/research/projects/${projectId}/collections`),
  createCollection: (projectId: string, body: Record<string, unknown>) =>
    api.post(`/research/projects/${projectId}/collections`, body),
  tags: (projectId: string) => api.get(`/research/projects/${projectId}/tags`),
  folders: (projectId: string) => api.get(`/research/projects/${projectId}/folders`),
};

export const habitsApi = {
  list: (params?: Record<string, string | number>) =>
    api.get<{ success: boolean; data: { habits: Habit[] } }>('/habits', { params }),
  create: (body: Partial<Habit>) => api.post('/habits', body),
  update: (id: string, body: Partial<Habit>) => api.put(`/habits/${id}`, body),
  toggle: (id: string) => api.patch(`/habits/${id}/toggle`),
  remove: (id: string) => api.delete(`/habits/${id}`),
};

export const learningApi = {
  dashboard: () =>
    api.get<{
      success: boolean;
      data: {
        skills: Skill[];
        plans: StudyPlan[];
        gaps: Skill[];
        recommendations: string[];
        certificates: { title: string; skill: string; credentialId?: string }[];
        learningStreak: number;
      };
    }>('/learning/dashboard'),
  skills: (params?: Record<string, string | number>) =>
    api.get<{ success: boolean; data: { skills: Skill[] } }>('/learning/skills', { params }),
  upsertSkill: (body: Partial<Skill> & { name: string }) => api.post('/learning/skills', body),
  profile: () => api.get('/learning/profile'),
  assess: (body: {
    answers?: string[];
    selfRatings?: { name: string; mastery: number }[];
  }) => api.post('/learning/profile/assess', body),
  recommendations: () => api.get('/learning/recommendations'),
  analytics: () => api.get('/learning/analytics'),
  explain: (body: { topic: string; detail?: string }) => api.post('/learning/content/explain', body),
  summary: (body: { topic: string; detail?: string }) => api.post('/learning/content/summary', body),
  questions: (body: { topic: string; count?: number }) =>
    api.post('/learning/content/questions', body),
  assignment: (body: { topic: string; level?: string }) =>
    api.post('/learning/content/assignment', body),
  createStudyPlan: (body: { topic: string; days?: number }) =>
    api.post<{ success: boolean; data: { plan: StudyPlan } }>('/learning/study-plans', body),
  createHorizonPlan: (body: { topic: string; horizon: 'daily' | 'weekly' | 'monthly' }) =>
    api.post('/learning/study-plans/horizon', body),
  adjustPlan: (id: string) => api.post(`/learning/study-plans/${id}/adjust`),
  toggleDay: (id: string, dayId: string) => api.patch(`/learning/study-plans/${id}/days/${dayId}`),
  quizzes: (params?: Record<string, string | number>) =>
    api.get('/learning/quizzes', { params }),
  createQuiz: (body: { topic: string; context?: string }) =>
    api.post<{
      success: boolean;
      data: {
        quiz: {
          _id: string;
          questions: { question: string; options: string[]; answer: string; explanation?: string }[];
        };
      };
    }>('/learning/quizzes', body),
  submitQuiz: (id: string, answers: string[]) =>
    api.post<{ success: boolean; data: { score: number; total: number } }>(
      `/learning/quizzes/${id}/submit`,
      { answers }
    ),
};

export const plannerApi = {
  overview: () =>
    api.get<{
      success: boolean;
      data: { daily: PlannerEvent[]; weekly: PlannerEvent[]; monthly: PlannerEvent[] };
    }>('/planner/overview'),
  events: (params?: Record<string, string>) =>
    api.get<{ success: boolean; data: { events: PlannerEvent[] } }>('/planner/events', { params }),
  create: (body: Partial<PlannerEvent>) => api.post('/planner/events', body),
  update: (id: string, body: Partial<PlannerEvent>) => api.put(`/planner/events/${id}`, body),
  remove: (id: string) => api.delete(`/planner/events/${id}`),
  generateDaily: () =>
    api.post<{ success: boolean; data: { plan: string } }>('/planner/generate-daily'),
};

export const resumeApi = {
  get: () =>
    api.get<{
      success: boolean;
      data: {
        resume: {
          title: string;
          headline: string;
          summary: string;
          skills: string[];
          aiSuggestions?: string;
        };
      };
    }>('/resume'),
  update: (body: Record<string, unknown>) => api.put('/resume', body),
  improve: (body?: { targetRole?: string }) =>
    api.post<{
      success: boolean;
      data: {
        resume: {
          title: string;
          headline: string;
          summary: string;
          skills: string[];
          aiSuggestions?: string;
        };
        suggestions: string;
      };
    }>('/resume/improve', body || {}),
};

export const careerApi = {
  catalog: () => api.get('/career/catalog'),
  profile: () => api.get('/career/profile'),
  updateProfile: (body: Record<string, unknown>) => api.patch('/career/profile', body),
  skillGap: (params?: { role?: string }) => api.get('/career/skill-gap', { params }),
  recommendations: () => api.get('/career/recommendations'),
  salary: (params?: { role?: string; level?: string }) => api.get('/career/salary', { params }),
  roadmaps: (params?: { kind?: string }) => api.get('/career/roadmaps', { params }),
  generateRoadmap: (body: Record<string, unknown>) => api.post('/career/roadmaps/generate', body),
  matchJobs: (params?: { limit?: number; type?: string }) => api.get('/career/jobs/match', { params }),
  matchInternships: (params?: { limit?: number }) =>
    api.get('/career/internships/match', { params }),
  matchCompanies: () => api.get('/career/companies/match'),
  eligibility: () => api.get('/career/eligibility'),
  resumeJobMatch: (jobId: string) => api.get(`/career/jobs/${jobId}/resume-match`),
  interviewQuestions: (body?: Record<string, unknown>) =>
    api.post('/career/interview/questions', body || {}),
  interviewSessions: () => api.get('/career/interview/sessions'),
  createInterview: (body?: Record<string, unknown>) =>
    api.post('/career/interview/sessions', body || {}),
  getInterview: (id: string) => api.get(`/career/interview/sessions/${id}`),
  answerInterview: (id: string, questionId: string, body: { answer: string }) =>
    api.post(`/career/interview/sessions/${id}/questions/${questionId}/answer`, body),
  completeInterview: (id: string) => api.post(`/career/interview/sessions/${id}/complete`),
  analyzeResume: (body?: Record<string, unknown>) => api.post('/career/resume/analyze', body || {}),
  optimizeResume: (body?: Record<string, unknown>) =>
    api.post('/career/resume/optimize', body || {}),
  recommendCertifications: (params?: { role?: string }) =>
    api.get('/career/certifications/recommend', { params }),
  addCertification: (body: Record<string, unknown>) => api.post('/career/certifications', body),
  updateCertification: (certId: string, body: Record<string, unknown>) =>
    api.patch(`/career/certifications/${certId}`, body),
  completeCertification: (certId: string, body?: Record<string, unknown>) =>
    api.post(`/career/certifications/${certId}/complete`, body || {}),
  learningRecommendations: () => api.get('/career/learning/recommendations'),
  analytics: () => api.get('/career/analytics'),
};

export const collabApi = {
  search: (params?: Record<string, string>) => api.get('/collab/search', { params }),
  analytics: () => api.get('/collab/analytics'),
  listCommunities: (params?: Record<string, string | number>) =>
    api.get('/collab/communities', { params }),
  createCommunity: (body: Record<string, unknown>) => api.post('/collab/communities', body),
  getCommunity: (id: string) => api.get(`/collab/communities/${id}`),
  joinCommunity: (id: string) => api.post(`/collab/communities/${id}/join`),
  leaveCommunity: (id: string) => api.post(`/collab/communities/${id}/leave`),
  listDiscussions: (id: string, params?: Record<string, string | number>) =>
    api.get(`/collab/communities/${id}/discussions`, { params }),
  createDiscussion: (id: string, body: Record<string, unknown>) =>
    api.post(`/collab/communities/${id}/discussions`, body),
  getDiscussion: (discussionId: string) => api.get(`/collab/discussions/${discussionId}`),
  reply: (discussionId: string, body: Record<string, unknown>) =>
    api.post(`/collab/discussions/${discussionId}/replies`, body),
  react: (discussionId: string, body?: { emoji?: string }) =>
    api.post(`/collab/discussions/${discussionId}/react`, body || {}),
  pin: (discussionId: string) => api.post(`/collab/discussions/${discussionId}/pin`),
  bookmark: (discussionId: string) => api.post(`/collab/discussions/${discussionId}/bookmark`),
  summarizeDiscussion: (discussionId: string) =>
    api.post(`/collab/discussions/${discussionId}/ai/summary`),
  topicSuggestions: (communityId: string) =>
    api.post(`/collab/communities/${communityId}/ai/topics`),
  listTeams: () => api.get('/collab/teams'),
  createTeam: (body: Record<string, unknown>) => api.post('/collab/teams', body),
  getTeam: (teamId: string) => api.get(`/collab/teams/${teamId}`),
  listProjects: () => api.get('/collab/projects'),
  createProject: (body: Record<string, unknown>) => api.post('/collab/projects', body),
  getProject: (projectId: string) => api.get(`/collab/projects/${projectId}`),
  listConversations: () => api.get('/collab/conversations'),
  createConversation: (body: Record<string, unknown>) => api.post('/collab/conversations', body),
  listMessages: (conversationId: string) =>
    api.get(`/collab/conversations/${conversationId}/messages`),
  sendMessage: (conversationId: string, form: FormData | Record<string, unknown>) =>
    api.post(`/collab/conversations/${conversationId}/messages`, form),
  listMentors: (params?: Record<string, string | number>) => api.get('/collab/mentors', { params }),
  upsertMentorProfile: (body: Record<string, unknown>) => api.put('/collab/mentors/me', body),
  bookMentor: (body: Record<string, unknown>) => api.post('/collab/mentors/book', body),
  listBookings: () => api.get('/collab/mentors/bookings'),
  recommendMentors: () => api.get('/collab/ai/mentors'),
  recommendTeams: () => api.get('/collab/ai/teams'),
};

export const graphApi = {
  rebuild: () => api.post('/graph/rebuild'),
  nodes: (params?: Record<string, string | number>) => api.get('/graph/nodes', { params }),
  createNode: (body: Record<string, unknown>) => api.post('/graph/nodes', body),
  getNode: (key: string) => api.get(`/graph/nodes/${encodeURIComponent(key)}`),
  neighbors: (key: string, params?: Record<string, string | number>) =>
    api.get(`/graph/nodes/${encodeURIComponent(key)}/neighbors`, { params }),
  traverse: (key: string, params?: Record<string, string | number>) =>
    api.get(`/graph/nodes/${encodeURIComponent(key)}/traverse`, { params }),
  dependencies: (key: string) =>
    api.get(`/graph/nodes/${encodeURIComponent(key)}/dependencies`),
  edges: (params?: Record<string, string>) => api.get('/graph/edges', { params }),
  createEdge: (body: Record<string, unknown>) => api.post('/graph/edges', body),
  recommendations: (params?: { limit?: number }) => api.get('/graph/recommendations', { params }),
  feed: (params?: { limit?: number }) => api.get('/graph/feed', { params }),
  history: () => api.get('/graph/history'),
  intelligence: () => api.get('/graph/intelligence'),
  related: (params: { q?: string; limit?: number }) => api.get('/graph/related', { params }),
  search: (params: { q: string; limit?: number }) => api.get('/graph/search', { params }),
  suggestions: (params?: { q?: string }) => api.get('/graph/suggestions', { params }),
  feedback: (body: Record<string, unknown>) => api.post('/graph/feedback', body),
  analytics: () => api.get('/graph/analytics'),
};

export const adaptiveApi = {
  profile: () => api.get('/adaptive/profile'),
  updateProfile: (body: Record<string, unknown>) => api.patch('/adaptive/profile', body),
  refresh: () => api.post('/adaptive/refresh'),
  path: () => api.get('/adaptive/path'),
  dailyGoal: () => api.get('/adaptive/daily-goal'),
  weeklyPlan: () => api.get('/adaptive/weekly-plan'),
  progress: (params?: Record<string, string>) => api.get('/adaptive/progress', { params }),
  upsertProgress: (body: Record<string, unknown>) => api.post('/adaptive/progress', body),
  completeProgress: (body: Record<string, unknown>) => api.post('/adaptive/progress/complete', body),
  achievements: () => api.get('/adaptive/achievements'),
  animations: (params?: Record<string, string | number>) =>
    api.get('/adaptive/animations', { params }),
  mapAnimation: (mediaId: string, body: Record<string, unknown>) =>
    api.post(`/adaptive/animations/${mediaId}/map`, body),
  animationProgress: (mediaId: string) => api.get(`/adaptive/animations/${mediaId}/progress`),
  recommendations: () => api.get('/adaptive/recommendations'),
  quiz: (body?: Record<string, unknown>) => api.post('/adaptive/quiz', body || {}),
  analytics: () => api.get('/adaptive/analytics'),
};

export const productivityApi = {
  workspace: () => api.get('/productivity/workspace'),
  dashboard: () => api.get('/productivity/dashboard'),
  updateWorkspace: (body: Record<string, unknown>) => api.patch('/productivity/workspace', body),
  updateWidgets: (widgets: Record<string, unknown>[]) =>
    api.put('/productivity/workspace/widgets', { widgets }),
  resetWidgets: () => api.post('/productivity/workspace/widgets/reset'),
  prioritizeTasks: () => api.post('/productivity/tasks/prioritize'),
  smartSchedule: (body?: { date?: string }) =>
    api.post('/productivity/tasks/smart-schedule', body || {}),
  processRecurring: () => api.post('/productivity/tasks/process-recurring'),
  taskProgress: (id: string, body: { progress?: number; loggedMinutes?: number }) =>
    api.patch(`/productivity/tasks/${id}/progress`, body),
  taskDependencies: (id: string, dependsOn: string[]) =>
    api.patch(`/productivity/tasks/${id}/dependencies`, { dependsOn }),
  goalAnalytics: () => api.get('/productivity/goals/analytics'),
  goalCategories: () => api.get('/productivity/goals/categories'),
  calendar: (params?: Record<string, string>) => api.get('/productivity/calendar', { params }),
  studyCalendar: (params?: Record<string, string>) =>
    api.get('/productivity/calendar/study', { params }),
  assignmentCalendar: (params?: Record<string, string>) =>
    api.get('/productivity/calendar/assignments', { params }),
  interviewCalendar: (params?: Record<string, string>) =>
    api.get('/productivity/calendar/interviews', { params }),
  createReminderEvent: (body: Record<string, unknown>) =>
    api.post('/productivity/reminders/events', body),
  processReminders: () => api.post('/productivity/reminders/process'),
  notes: (params?: Record<string, string | number>) => api.get('/productivity/notes', { params }),
  createNote: (body: Record<string, unknown>) => api.post('/productivity/notes', body),
  getNote: (id: string) => api.get(`/productivity/notes/${id}`),
  updateNote: (id: string, body: Record<string, unknown>) =>
    api.put(`/productivity/notes/${id}`, body),
  removeNote: (id: string) => api.delete(`/productivity/notes/${id}`),
  summarizeNote: (id: string) => api.post(`/productivity/notes/${id}/summarize`),
  focusSessions: (params?: Record<string, string>) => api.get('/productivity/focus', { params }),
  activeFocus: () => api.get('/productivity/focus/active'),
  focusStats: (params?: Record<string, string>) => api.get('/productivity/focus/stats', { params }),
  startFocus: (body?: Record<string, unknown>) => api.post('/productivity/focus/start', body || {}),
  pauseFocus: (id: string) => api.post(`/productivity/focus/${id}/pause`),
  resumeFocus: (id: string) => api.post(`/productivity/focus/${id}/resume`),
  completeFocus: (id: string, body?: Record<string, unknown>) =>
    api.post(`/productivity/focus/${id}/complete`, body || {}),
  abandonFocus: (id: string) => api.post(`/productivity/focus/${id}/abandon`),
  analytics: (params?: Record<string, string>) => api.get('/productivity/analytics', { params }),
  aiDailyPlan: () => api.post('/productivity/ai/daily-plan'),
  aiWeeklyPlan: () => api.post('/productivity/ai/weekly-plan'),
  aiSchedule: () => api.post('/productivity/ai/schedule'),
  aiGoals: () => api.post('/productivity/ai/goals'),
  aiTimeOptimize: () => api.post('/productivity/ai/time-optimize'),
};

export const personalizationApi = {
  profile: () => api.get('/personalization/profile'),
  refresh: () => api.post('/personalization/refresh'),
  updatePrivacy: (body: Record<string, unknown>) => api.patch('/personalization/privacy', body),
  updatePreferences: (body: Record<string, unknown>) =>
    api.patch('/personalization/preferences', body),
  dashboard: () => api.get('/personalization/dashboard'),
  surfaces: () => api.get('/personalization/surfaces'),
  nextBest: () => api.get('/personalization/next-best'),
  recommendations: (params?: Record<string, string | number>) =>
    api.get('/personalization/recommendations', { params }),
  progress: () => api.get('/personalization/progress'),
  sync: () => api.post('/personalization/sync'),
  mentorContext: () => api.get('/personalization/mentor-context'),
  events: (params?: Record<string, string | number>) =>
    api.get('/personalization/events', { params }),
  ingestEvent: (body: Record<string, unknown>) => api.post('/personalization/events', body),
  analytics: () => api.get('/personalization/analytics'),
};

export const mediaApi = {
  list: (params?: Record<string, string | number>) => api.get('/media', { params }),
  meta: () => api.get('/media/meta'),
  continueWatching: () => api.get('/media/continue'),
  recent: () => api.get('/media/recent'),
  favorites: () => api.get('/media/favorites'),
  history: (params?: Record<string, string | number>) => api.get('/media/history', { params }),
  analyticsMe: () => api.get('/media/analytics/me'),
  analyticsOrg: () => api.get('/media/analytics/org'),
  recommend: (body?: { focus?: string }) => api.post('/media/recommend', body || {}),
  get: (id: string) => api.get(`/media/${id}`),
  upload: (form: FormData) =>
    api.post('/media', form, { headers: { 'Content-Type': 'multipart/form-data' } }),
  update: (id: string, body: Record<string, unknown> | FormData) =>
    api.put(`/media/${id}`, body, {
      headers: body instanceof FormData ? { 'Content-Type': 'multipart/form-data' } : undefined,
    }),
  remove: (id: string) => api.delete(`/media/${id}`),
  publish: (id: string) => api.post(`/media/${id}/publish`),
  archive: (id: string) => api.post(`/media/${id}/archive`),
  addVersion: (id: string, form: FormData) =>
    api.post(`/media/${id}/versions`, form, { headers: { 'Content-Type': 'multipart/form-data' } }),
  progress: (id: string, body: Record<string, unknown>) => api.post(`/media/${id}/progress`, body),
  complete: (id: string, body?: Record<string, unknown>) => api.post(`/media/${id}/complete`, body || {}),
  favorite: (id: string) => api.post(`/media/${id}/favorite`),
  related: (id: string) => api.get(`/media/${id}/related`),
  streamUrl: (id: string) => `/api/media/${id}/stream`,
  downloadUrl: (id: string) => `/api/media/${id}/download`,
};

export const booksApi = {
  list: (params?: Record<string, string>) =>
    api.get<{ success: boolean; data: { books: Book[] } }>('/books', { params }),
  search: (params?: Record<string, string>) => api.get('/books/search', { params }),
  categories: () =>
    api.get<{ success: boolean; data: { categories: string[] } }>('/books/categories'),
  subjects: () => api.get('/books/subjects'),
  authors: () => api.get('/books/authors'),
  library: () => api.get('/books/library'),
  libraryByScope: (scope: 'public' | 'personal' | 'institution' | 'company') =>
    api.get(`/books/library/${scope}`),
  favorites: () => api.get('/books/favorites'),
  recent: () => api.get('/books/recent'),
  get: (id: string) => api.get<{ success: boolean; data: { book: Book } }>(`/books/${id}`),
  create: (body: Record<string, unknown>) => api.post('/books', body),
  upload: (form: FormData) =>
    api.post('/books/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } }),
  update: (id: string, body: Record<string, unknown>) => api.put(`/books/${id}`, body),
  remove: (id: string) => api.delete(`/books/${id}`),
  recommend: (body?: { focus?: string }) =>
    api.post<{ success: boolean; data: { recommendations: string; focus: string } }>(
      '/books/recommend',
      body || {}
    ),
  bookmark: (id: string) => api.post(`/books/${id}/bookmark`),
  favorite: (id: string) => api.post(`/books/${id}/favorite`),
  progress: (id: string, body: { readingProgress?: number; status?: string; currentChapter?: number }) =>
    api.patch(`/books/${id}/progress`, body),
  chapters: (id: string) => api.get(`/books/${id}/chapters`),
  chapter: (id: string, chapterId: string) => api.get(`/books/${id}/chapters/${chapterId}`),
  explain: (id: string, body?: { question?: string; chapterId?: string }) =>
    api.post(`/books/${id}/ai/explain`, body || {}),
  quiz: (id: string, body?: { chapterId?: string }) => api.post(`/books/${id}/ai/quiz`, body || {}),
  flashcards: (id: string, body?: { chapterId?: string }) =>
    api.post(`/books/${id}/ai/flashcards`, body || {}),
};

export const reportsApi = {
  list: (params?: Record<string, string | number>) =>
    api.get<{ success: boolean; data: { reports: Report[] } }>('/reports', { params }),
  generate: (body?: { title?: string; career?: string }) =>
    api.post<{ success: boolean; data: { report: Report } }>('/reports/generate', body || {}),
  analytics: () => api.get('/reports/analytics'),
  get: (id: string) => api.get<{ success: boolean; data: { report: Report } }>(`/reports/${id}`),
  remove: (id: string) => api.delete(`/reports/${id}`),
  pdfUrl: (id: string) => `/api/reports/${id}/pdf`,
};

export const communityApi = {
  list: (params?: Record<string, string | number>) =>
    api.get<{ success: boolean; data: { posts: Post[] } }>('/community', { params }),
  create: (form: FormData) =>
    api.post('/community', form, { headers: { 'Content-Type': 'multipart/form-data' } }),
  like: (id: string) => api.post(`/community/${id}/like`),
  comment: (id: string, text: string) => api.post(`/community/${id}/comments`, { text }),
  remove: (id: string) => api.delete(`/community/${id}`),
};

export const settingsApi = {
  get: () => api.get('/settings'),
  update: (body: Record<string, unknown>) => api.put('/settings', body),
  deleteAccount: (password: string) => api.delete('/settings/account', { data: { password } }),
  contact: (body: { name: string; email: string; message: string }) =>
    api.post('/settings/contact', body),
};

export const billingApi = {
  plan: () =>
    api.get<{
      success: boolean;
      data: {
        entitlements: {
          planId: string;
          label: string;
          credits: number;
          monthlyCredits: number;
          maxUploadMb: number;
          features: Record<string, boolean>;
          aiCallsRemaining: number;
        };
        catalog: {
          id: string;
          label: string;
          monthlyCredits: number;
          maxUploadMb: number;
          features: Record<string, boolean>;
        }[];
        stripe: { configured: boolean; checkoutEnabled: boolean; note: string };
      };
    }>('/billing/plan'),
  checkout: (plan: 'pro' | 'team') =>
    api.post<{ success: boolean; data: { url: string; id: string } }>('/billing/checkout', { plan }),
  portal: () => api.post<{ success: boolean; data: { url: string } }>('/billing/portal'),
};

export const orgsApi = {
  me: () =>
    api.get<{
      success: boolean;
      data: {
        organization: {
          id: string;
          name: string;
          slug: string;
          type?: string;
          plan: string;
        } | null;
        membership: { role: string } | null;
      };
    }>('/orgs/me'),
  create: (body: {
    name: string;
    type?: 'institution' | 'company' | 'team';
    institutionKind?: 'school' | 'college' | 'university' | 'other';
  }) =>
    api.post<{
      success: boolean;
      data: {
        organization: {
          id: string;
          name: string;
          slug: string;
          type?: string;
          institutionKind?: string;
          plan: string;
        };
        membership: { role: string; memberKind?: string };
      };
    }>('/orgs', body),
  updateMemberRole: (orgId: string, membershipId: string, role: 'admin' | 'member') =>
    api.patch<{
      success: boolean;
      data: {
        membership: {
          id: string;
          role: string;
          user: { id: string; name: string; email: string } | null;
        };
      };
    }>(`/orgs/${orgId}/members/${membershipId}`, { role }),
  removeMember: (orgId: string, membershipId: string) =>
    api.delete<{ success: boolean; message: string }>(`/orgs/${orgId}/members/${membershipId}`),
  members: (orgId: string, params?: Record<string, string>) =>
    api.get<{
      success: boolean;
      data: {
        members: {
          id: string;
          role: string;
          memberKind?: string;
          title?: string;
          createdAt?: string;
          user: { id: string; name: string; email: string; aaid?: string; plan?: string } | null;
        }[];
      };
    }>(`/orgs/${orgId}/members`, { params }),
  invites: (orgId: string) =>
    api.get<{
      success: boolean;
      data: {
        invites: {
          id: string;
          email: string;
          role: string;
          memberKind?: string;
          status: string;
          expiresAt: string;
          createdAt?: string;
        }[];
      };
    }>(`/orgs/${orgId}/invites`),
  revokeInvite: (orgId: string, inviteId: string) =>
    api.delete<{ success: boolean; message: string }>(`/orgs/${orgId}/invites/${inviteId}`),
  previewInvite: (token: string) =>
    api.get<{
      success: boolean;
      data: {
        email: string;
        role: string;
        expiresAt: string;
        organization: { id: string; name: string; slug: string };
      };
    }>(`/orgs/invite/${token}`),
  addMember: (
    orgId: string,
    body: { email: string; role?: 'admin' | 'member'; memberKind?: 'staff' | 'teacher' | 'student' }
  ) =>
    api.post<{
      success: boolean;
      data: {
        status: 'joined' | 'pending_invite';
        membership?: {
          id: string;
          role: string;
          memberKind?: string;
          user: { id: string; name: string; email: string };
        };
        invite?: {
          id: string;
          email: string;
          role: string;
          status: string;
          expiresAt: string;
        };
      };
    }>(`/orgs/${orgId}/members`, body),
  overview: (orgId: string) =>
    api.get<{
      success: boolean;
      data: {
        organization: {
          id: string;
          name: string;
          slug: string;
          plan: string;
          institutionKind?: string;
          owner?: string;
          createdAt?: string;
        } | null;
        membershipCounts: {
          total: number;
          owners: number;
          admins: number;
          members: number;
          teachers?: number;
          students?: number;
        };
        pendingInvites: number;
        totals: {
          goalsTotal: number;
          goalsCompleted: number;
          tasksTotal: number;
          tasksDone: number;
          documents: number;
          habitsActive: number;
          skills: number;
          studyPlans: number;
          roadmaps: number;
          chats: number;
          creditsRemaining: number;
        };
        memberActivity: {
          membershipId: string;
          role: string;
          memberKind?: string;
          user: {
            id: string;
            name: string;
            email: string;
            plan?: string;
            credits: number;
          } | null;
          goals: number;
          tasks: number;
          joinedAt?: string;
        }[];
        viewerRole: string | null;
      };
    }>(`/orgs/${orgId}/overview`),
  profile: (orgId: string) => api.get(`/orgs/${orgId}/profile`),
  updateProfile: (orgId: string, body: Record<string, unknown>) =>
    api.patch(`/orgs/${orgId}/profile`, body),
  updateSettings: (orgId: string, body: Record<string, unknown>) =>
    api.patch(`/orgs/${orgId}/settings`, body),
  dashboard: (orgId: string) => api.get(`/orgs/${orgId}/dashboard`),
  analytics: (orgId: string) => api.get(`/orgs/${orgId}/analytics`),
  teachers: (orgId: string) => api.get(`/orgs/${orgId}/teachers`),
  students: (orgId: string) => api.get(`/orgs/${orgId}/students`),
  updateMemberProfile: (orgId: string, membershipId: string, body: Record<string, unknown>) =>
    api.patch(`/orgs/${orgId}/members/${membershipId}/profile`, body),
  branches: (orgId: string) => api.get(`/orgs/${orgId}/branches`),
  createBranch: (orgId: string, body: Record<string, unknown>) =>
    api.post(`/orgs/${orgId}/branches`, body),
  departments: (orgId: string) => api.get(`/orgs/${orgId}/departments`),
  createDepartment: (orgId: string, body: Record<string, unknown>) =>
    api.post(`/orgs/${orgId}/departments`, body),
  academicYears: (orgId: string) => api.get(`/orgs/${orgId}/academic-years`),
  createAcademicYear: (orgId: string, body: Record<string, unknown>) =>
    api.post(`/orgs/${orgId}/academic-years`, body),
  semesters: (orgId: string, params?: Record<string, string>) =>
    api.get(`/orgs/${orgId}/semesters`, { params }),
  createSemester: (orgId: string, body: Record<string, unknown>) =>
    api.post(`/orgs/${orgId}/semesters`, body),
  courses: (orgId: string) => api.get(`/orgs/${orgId}/courses`),
  createCourse: (orgId: string, body: Record<string, unknown>) =>
    api.post(`/orgs/${orgId}/courses`, body),
  subjects: (orgId: string) => api.get(`/orgs/${orgId}/subjects`),
  createSubject: (orgId: string, body: Record<string, unknown>) =>
    api.post(`/orgs/${orgId}/subjects`, body),
  classes: (orgId: string) => api.get(`/orgs/${orgId}/classes`),
  createClass: (orgId: string, body: Record<string, unknown>) =>
    api.post(`/orgs/${orgId}/classes`, body),
  timetable: (orgId: string, params?: Record<string, string>) =>
    api.get(`/orgs/${orgId}/timetable`, { params }),
  createTimetable: (orgId: string, body: Record<string, unknown>) =>
    api.post(`/orgs/${orgId}/timetable`, body),
  attendance: (orgId: string, params?: Record<string, string>) =>
    api.get(`/orgs/${orgId}/attendance`, { params }),
  markAttendance: (orgId: string, body: Record<string, unknown>) =>
    api.post(`/orgs/${orgId}/attendance`, body),
  attendanceSummary: (orgId: string, params?: Record<string, string>) =>
    api.get(`/orgs/${orgId}/attendance/summary`, { params }),
  notifications: (orgId: string) => api.get(`/orgs/${orgId}/notifications`),
  createNotification: (orgId: string, body: Record<string, unknown>) =>
    api.post(`/orgs/${orgId}/notifications`, body),
  aiAssist: (orgId: string, body: { message: string; mode?: string }) =>
    api.post(`/orgs/${orgId}/ai`, body),
  generateReport: (orgId: string, body?: { title?: string; focus?: string }) =>
    api.post(`/orgs/${orgId}/reports/generate`, body || {}),
};

export const companyApi = {
  profile: (orgId: string) => api.get(`/orgs/${orgId}/company/profile`),
  updateProfile: (orgId: string, body: Record<string, unknown>) =>
    api.patch(`/orgs/${orgId}/company/profile`, body),
  requestVerification: (orgId: string, body?: { notes?: string }) =>
    api.post(`/orgs/${orgId}/company/verification`, body || {}),
  dashboard: (orgId: string) => api.get(`/orgs/${orgId}/company/dashboard`),
  analytics: (orgId: string) => api.get(`/orgs/${orgId}/company/analytics`),
  talent: (orgId: string, params?: Record<string, string>) =>
    api.get(`/orgs/${orgId}/company/talent`, { params }),
  messages: (orgId: string, params?: Record<string, string>) =>
    api.get(`/orgs/${orgId}/company/messages`, { params }),
  sendMessage: (orgId: string, body: Record<string, unknown>) =>
    api.post(`/orgs/${orgId}/company/messages`, body),
  auditLogs: (orgId: string, params?: Record<string, string>) =>
    api.get(`/orgs/${orgId}/company/audit-logs`, { params }),
  jobs: (orgId: string, params?: Record<string, string>) =>
    api.get(`/orgs/${orgId}/jobs`, { params }),
  createJob: (orgId: string, body: Record<string, unknown>) =>
    api.post(`/orgs/${orgId}/jobs`, body),
  publishJob: (orgId: string, jobId: string) =>
    api.post(`/orgs/${orgId}/jobs/${jobId}/publish`),
  archiveJob: (orgId: string, jobId: string) =>
    api.post(`/orgs/${orgId}/jobs/${jobId}/archive`),
  applications: (orgId: string, params?: Record<string, string>) =>
    api.get(`/orgs/${orgId}/applications`, { params }),
  updateApplicationStatus: (orgId: string, applicationId: string, body: Record<string, unknown>) =>
    api.patch(`/orgs/${orgId}/applications/${applicationId}/status`, body),
  scheduleInterview: (orgId: string, applicationId: string, body: Record<string, unknown>) =>
    api.post(`/orgs/${orgId}/applications/${applicationId}/interview`, body),
};

export const careersApi = {
  list: (params?: Record<string, string>) => api.get('/jobs', { params }),
  categories: () => api.get('/jobs/categories'),
  get: (jobId: string) => api.get(`/jobs/${jobId}`),
  apply: (jobId: string, body?: { coverLetter?: string }) =>
    api.post(`/jobs/${jobId}/apply`, body || {}),
  myApplications: () => api.get('/jobs/my-applications'),
  withdraw: (applicationId: string) =>
    api.post(`/jobs/applications/${applicationId}/withdraw`),
};

export const adminApi = {
  dashboard: () => api.get('/admin/dashboard'),
  users: (q?: string) => api.get('/admin/users', { params: { q } }),
  updateUser: (id: string, body: { role?: string; plan?: string }) =>
    api.patch(`/admin/users/${id}`, body),
  deleteUser: (id: string) => api.delete(`/admin/users/${id}`),
  reports: () => api.get('/admin/reports'),
  verifyCompany: (orgId: string, body: { status: string; notes?: string }) =>
    api.patch(`/admin/orgs/${orgId}/verification`, body),
};

export const opsApi = {
  health: () => api.get('/ops/health'),
  ai: (params?: Record<string, string | number>) => api.get('/ops/ai', { params }),
  performance: () => api.get('/ops/performance'),
  security: (params?: Record<string, string | number>) => api.get('/ops/security', { params }),
  trends: (params?: Record<string, string | number>) => api.get('/ops/trends', { params }),
  jobs: () => api.get('/ops/jobs'),
  runJobs: () => api.post('/ops/jobs/run'),
  auditLogs: (params?: Record<string, string | number>) => api.get('/ops/audit-logs', { params }),
  aggregate: (body?: { period?: string }) => api.post('/ops/aggregate', body || {}),
  readiness: () => api.get('/ops/readiness'),
};

export const searchApi = {
  search: (params: { q: string; types?: string; limit?: number }) =>
    api.get('/search', { params }),
};
