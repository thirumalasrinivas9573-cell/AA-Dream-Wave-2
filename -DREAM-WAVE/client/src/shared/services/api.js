import axios from 'axios'

// ── Base URL ──────────────────────────────────────────────────────────────────
// Local dev  → Vite proxy forwards /api → http://127.0.0.1:5001  (no CORS issues)
// Production → set VITE_API_URL in Vercel (or Netlify) project env
//              e.g. https://dream-wave-api.onrender.com/api
const BASE_URL = import.meta.env.VITE_API_URL || '/api'
const SESSION_HINT_KEY = 'dw_has_session'

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 90000,            // 90s — AI roadmap calls can take time
  withCredentials: true,     // HttpOnly refresh cookie
})

// ── Attach JWT to every request ───────────────────────────────────────────────
api.interceptors.request.use(
  config => {
    const token = localStorage.getItem('token')
    if (token) config.headers.Authorization = `Bearer ${token}`
    return config
  },
  err => Promise.reject(err)
)

let refreshing = null

function normalizeApiError(err) {
  if (!err.response) {
    err.isNetworkError = true
    err.userMessage = err.code === 'ECONNABORTED'
      ? 'The request timed out. Please try again.'
      : 'Network error. Check your connection and try again.'
    return err
  }
  const data = err.response.data
  if (data && typeof data === 'object') {
    err.userMessage = data.message || err.userMessage
    err.apiCode = data.code
  }
  return err
}

api.interceptors.response.use(
  res => res,
  async err => {
    const original = err.config
    if (err.response?.status === 401 && !original._retry) {
      const url = String(original?.url || '')
      const isRefresh = /\/auth\/refresh/.test(url)
      const isAuthProbe = /\/auth\/(me|refresh|logout)/.test(url)

      // Refresh endpoint itself failed — clear session, do not recurse
      if (isRefresh) {
        localStorage.removeItem('token')
        localStorage.removeItem(SESSION_HINT_KEY)
        window.dispatchEvent(new CustomEvent('dw:session-expired'))
        return Promise.reject(err)
      }

      original._retry = true
      try {
        refreshing = refreshing || api.post('/auth/refresh', {})
        const { data } = await refreshing
        refreshing = null
        if (data.token) {
          localStorage.setItem('token', data.token)
          localStorage.setItem(SESSION_HINT_KEY, '1')
        }
        original.headers = original.headers || {}
        original.headers.Authorization = `Bearer ${data.token}`
        return api(original)
      } catch {
        refreshing = null
        localStorage.removeItem('token')
        localStorage.removeItem(SESSION_HINT_KEY)
        if (!isAuthProbe) window.dispatchEvent(new CustomEvent('dw:session-expired'))
        return Promise.reject(err)
      }
    }
    return Promise.reject(normalizeApiError(err))
  }
)

export default api

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authApi = {
  login:      (data) => api.post('/auth/login', data),
  signup:     (data) => api.post('/auth/signup', data),
  register:   (data) => api.post('/auth/signup', data),
  me:         ()     => api.get('/auth/me'),
  onboarding: (data) => api.post('/auth/onboarding', data),
  forgotPassword: (data) => api.post('/auth/forgot-password', data),
  verifyOtp:      (data) => api.post('/auth/verify-otp', data),
  verifyEmail:    (data) => api.post('/auth/verify-email', data),
  resetPassword:  (data) => api.post('/auth/reset-password', data),
  resendOtp:      (data) => api.post('/auth/resend-otp', data),
  resendVerification: (data) => api.post('/auth/resend-verification', data),
  changeEmail:    (data) => api.post('/auth/change-email', data),
  sendPhoneOtp:   (data) => api.post('/auth/send-phone-otp', data),
  verifyPhoneOtp: (data) => api.post('/auth/verify-phone-otp', data),
  portalInit:        (data) => api.post('/auth/portal/init', data),
  portalSendPhone:   (data) => api.post('/auth/portal/send-phone', data),
  portalVerifyPhone: (data) => api.post('/auth/portal/verify-phone', data),
  portalComplete:    (data) => api.post('/auth/portal/complete', data),
  portalResendPhone: (data) => api.post('/auth/portal/resend-phone', data),
  verifyLoginEmailOtp: (data) => api.post('/auth/verify-login-email-otp', data),
  refresh: (data) => api.post('/auth/refresh', data || {}),
  logout: (data) => api.post('/auth/logout', data || {}),
  logoutAll: () => api.post('/auth/logout-all'),
  listSessions: () => api.get('/auth/sessions'),
  revokeSession: (id) => api.delete(`/auth/sessions/${id}`),
  revokeAllSessions: () => api.delete('/auth/sessions'),
  loginHistory: () => api.get('/auth/login-history'),
  profile: () => api.get('/auth/profile'),
}

const crud = (base) => ({
  list: (params) => api.get(base, { params }),
  create: (data) => api.post(base, data),
  update: (id, data) => api.put(`${base}/${id}`, data),
  delete: (id) => api.delete(`${base}/${id}`),
})

export const institutionApi = {
  bootstrap: (data) => api.post('/institution/bootstrap', data),
  getMine: () => api.get('/institution/me'),
  updateMine: (data) => api.put('/institution/me', data),
  dashboard: () => api.get('/institution/dashboard'),
  analytics: () => api.get('/institution/analytics'),
  reports: () => api.get('/institution/reports'),
  inquiries: () => api.get('/institution/inquiries'),
  publicList: (params) => api.get('/institution/public', { params }),
  publicFilters: () => api.get('/institution/public/filters'),
  publicCompare: (ids) => api.get('/institution/public/compare', { params: { ids: Array.isArray(ids) ? ids.join(',') : ids } }),
  publicProfile: (slug) => api.get(`/institution/public/${slug}`),
  publicInsights: (slug) => api.get(`/institution/public/${slug}/insights`),
  publicTrack: (slug, type) => api.post(`/institution/public/${slug}/track`, { type }),
  publicContact: (slug, data) => api.post(`/institution/public/${slug}/contact`, data),
  departments: crud('/institution/departments'),
  courses: { ...crud('/institution/courses'), insights: (id) => api.get(`/institution/courses/${id}/insights`) },
  faculty: crud('/institution/faculty'),
  students: crud('/institution/students'),
  placements: crud('/institution/placements'),
  events: crud('/institution/events'),
  promotions: crud('/institution/promotions'),
  gallery: { list: (p) => api.get('/institution/gallery', { params: p }), create: (d) => api.post('/institution/gallery', d), delete: (id) => api.delete(`/institution/gallery/${id}`) },
  admissions: {
    ...crud('/institution/admissions'),
    updateInbound: (id, d) => api.put(`/institution/applications/${id}`, d),
  },
  certificates: {
    list: (p) => api.get('/institution/certificates', { params: p }),
    create: (d) => api.post('/institution/certificates', d),
    delete: (id) => api.delete(`/institution/certificates/${id}`),
  },
  scholarships: crud('/institution/scholarships'),
  research: crud('/institution/research'),
}

export const companyApi = {
  bootstrap: (data) => api.post('/company/bootstrap', data),
  getMine: () => api.get('/company/me'),
  updateMine: (data) => api.put('/company/me', data),
  dashboard: () => api.get('/company/dashboard'),
  analytics: () => api.get('/company/analytics'),
  reports: () => api.get('/company/reports'),
  followers: () => api.get('/company/followers'),
  publicList: (params) => api.get('/company/public', { params }),
  publicFilters: () => api.get('/company/public/filters'),
  publicCompare: (ids) => api.get('/company/public/compare', { params: { ids: Array.isArray(ids) ? ids.join(',') : ids } }),
  publicProfile: (slug) => api.get(`/company/public/${slug}`),
  publicInsights: (slug) => api.get(`/company/public/${slug}/insights`),
  publicTrack: (slug, type, targetId) => api.post(`/company/public/${slug}/track`, { type, targetId }),
  publicContact: (slug, data) => api.post(`/company/public/${slug}/contact`, data),
  publicJob: (jobId) => api.get(`/company/public/jobs/${jobId}`),
  publicInternship: (id) => api.get(`/company/public/internships/${id}`),
  departments: crud('/company/departments'),
  jobs: crud('/company/jobs'),
  internships: crud('/company/internships'),
  employees: crud('/company/employees'),
  projects: crud('/company/projects'),
  training: crud('/company/training'),
  events: crud('/company/events'),
  promotions: crud('/company/promotions'),
  gallery: { list: (p) => api.get('/company/gallery', { params: p }), create: (d) => api.post('/company/gallery', d), delete: (id) => api.delete(`/company/gallery/${id}`) },
  certificates: { list: (p) => api.get('/company/certificates', { params: p }), create: (d) => api.post('/company/certificates', d) },
  applications: { list: (p) => api.get('/company/applications', { params: p }), update: (id, d) => api.put(`/company/applications/${id}`, d) },
  interviews: crud('/company/interviews'),
}

export const discoveryApi = {
  home: () => api.get('/discovery/home'),
  feed: (params) => api.get('/discovery/feed', { params }),
  featured: () => api.get('/discovery/featured'),
  promotion: (id) => api.get(`/discovery/promotions/${id}`),
  recommendations: () => api.get('/discovery/recommendations'),
}

export const searchApi = {
  global: (q, params = {}) => api.get('/search', { params: { q, ...params } }),
  filters: () => api.get('/search/filters'),
  unified: (q, params = {}) => api.get('/search/unified', { params: { q, ...params } }),
  clearHistory: () => api.delete('/search/history'),
}

export const notificationApi = {
  list: (params) => api.get('/notifications', { params }),
  markRead: (id) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.patch('/notifications/read-all'),
  archive: (id) => api.patch(`/notifications/${id}/archive`),
  restore: (id) => api.patch(`/notifications/${id}/restore`),
  pin: (id, pinned = true) => api.patch(`/notifications/${id}/pin`, { pinned }),
  priority: (id, priority) => api.patch(`/notifications/${id}/priority`, { priority }),
  delete: (id) => api.delete(`/notifications/${id}`),
  create: (data) => api.post('/notifications', data),
}

export const dashboardApi = {
  student: () => api.get('/dashboard/student'),
}

export const intelligenceApi = {
  home: () => api.get('/intelligence/home'),
  insights: () => api.get('/intelligence/insights'),
  recommendations: (types = []) => api.get('/intelligence/recommendations', {
    params: types.length ? { types: types.join(',') } : {},
  }),
  nextAction: () => api.get('/intelligence/next-action'),
  decisions: (params = {}) => api.get('/intelligence/decisions', { params }),
  contextSummary: () => api.get('/intelligence/context-summary'),
  graphSummary: () => api.get('/intelligence/graph/summary'),
  dismissRecommendation: (fingerprint) => api.post(`/intelligence/recommendations/${fingerprint}/dismiss`),
  feedbackRecommendation: (fingerprint, feedback) => api.post(`/intelligence/recommendations/${fingerprint}/feedback`, { feedback }),
  profile: () => api.get('/intelligence/profile'),
  updateProfile: (data) => api.put('/intelligence/profile', data),
  memory: () => api.get('/intelligence/memory'),
  learningDashboard: () => api.get('/intelligence/learning-dashboard'),
  learning: (params) => api.get('/intelligence/learning', { params }),
  learningSkillGaps: (params) => api.get('/intelligence/learning/skill-gaps', { params }),
  learningNextAction: (params) => api.get('/intelligence/learning/next-action', { params }),
  learningAdaptive: (params) => api.get('/intelligence/learning/adaptive', { params }),
  learningProgressReview: (params) => api.get('/intelligence/learning/progress-review', { params }),
  learningResources: (params) => api.get('/intelligence/learning/resources', { params }),
  learningPlanSuggestion: (data) => api.post('/intelligence/learning/plan-suggestion', data || {}),
  dailyLife: () => api.get('/intelligence/daily-life'),
  dailyLifeNextAction: () => api.get('/intelligence/daily-life/next-action'),
  dailyLifePlan: () => api.get('/intelligence/daily-life/plan'),
  dailyLifeGaps: () => api.get('/intelligence/daily-life/gaps'),
  dailyLifeRisks: () => api.get('/intelligence/daily-life/risks'),
  dailyLifeBreakdown: (data) => api.post('/intelligence/daily-life/breakdown', data || {}),
  dailyLifeProposeAction: (data) => api.post('/intelligence/daily-life/actions/propose', data || {}),
  dailyLifeConfirmAction: (data) => api.post('/intelligence/daily-life/actions/confirm', data || {}),
  brainAsk: (data) => api.post('/intelligence/brain/ask', data || {}),
  brainContext: (params) => api.get('/intelligence/brain/context', { params }),
  brainSummary: () => api.get('/intelligence/brain/summary'),
  brainWeekly: () => api.get('/intelligence/brain/weekly'),
  brainSearch: (params) => api.get('/intelligence/brain/search', { params }),
  personal: (params) => api.get('/intelligence/personal', { params }),
  personalPlan: (data) => api.post('/intelligence/personal/plan', data || {}),
  personalHealth: () => api.get('/intelligence/personal/health'),
  personalProactive: () => api.get('/intelligence/personal/proactive'),
  personalControls: () => api.get('/intelligence/personal/controls'),
  updatePersonalControls: (data) => api.put('/intelligence/personal/controls', data || {}),
  knowledgeCenter: () => api.get('/intelligence/knowledge'),
  knowledgeSearch: (params) => api.get('/intelligence/knowledge/search', { params }),
  knowledgeAsk: (data) => api.post('/intelligence/knowledge/ask', data || {}),
  knowledgeMap: () => api.get('/intelligence/knowledge/map'),
  knowledgeProjectMap: (projectId) => api.get(`/intelligence/knowledge/project/${projectId}`),
  knowledgeGoalMap: (goalId) => api.get(`/intelligence/knowledge/goal/${goalId}`),
  knowledgeExplain: (edgeId) => api.get(`/intelligence/knowledge/edge/${edgeId}`),
  knowledgeSync: () => api.post('/intelligence/knowledge/sync'),
  knowledgeProcessSource: (sourceId, data) => api.post(`/intelligence/knowledge/sources/${sourceId}/process`, data || {}),
  // Continuous Intelligence + Command Center (V4 P8)
  commandCenter: () => api.get('/intelligence/command-center'),
  command: (data) => api.post('/intelligence/command', data || {}),
  commandHistory: (params) => api.get('/intelligence/command/history', { params }),
  continuousInsights: () => api.get('/intelligence/continuous/insights'),
  continuousProgress: () => api.get('/intelligence/continuous/progress'),
  continuousDaily: () => api.get('/intelligence/continuous/daily'),
  continuousWeekly: () => api.get('/intelligence/continuous/weekly'),
  continuousContext: (params) => api.get('/intelligence/continuous/context', { params }),
  continuousDecide: (data) => api.post('/intelligence/continuous/decide', data || {}),
  continuousEvent: (data) => api.post('/intelligence/continuous/events', data || {}),
  continuousEvents: (params) => api.get('/intelligence/continuous/events', { params }),
  decisionGet: (id) => api.get(`/intelligence/continuous/decisions/${id}`),
  decisionOverride: (id, data) => api.post(`/intelligence/continuous/decisions/${id}/override`, data || {}),
  decisionFeedback: (id, data) => api.post(`/intelligence/continuous/decisions/${id}/feedback`, data || {}),
}

export const agentApi = {
  tools: (params) => api.get('/agent/tools', { params }),
  run: (data) => api.post('/agent/run', data || {}),
  confirm: (data) => api.post('/agent/confirm', data || {}),
  cancel: (executionId) => api.post(`/agent/cancel/${executionId}`),
  executions: (params) => api.get('/agent/executions', { params }),
  execution: (id) => api.get(`/agent/executions/${id}`),
  securityProbe: (data) => api.post('/agent/security/probe', data || {}),
  specialists: () => api.get('/agent/specialists'),
  planSpecialists: (data) => api.post('/agent/specialists/plan', data || {}),
  runNetwork: (data) => api.post('/agent/network/run', data || {}),
  cancelNetwork: (executionId) => api.post(`/agent/network/cancel/${executionId}`),
  networkMetrics: () => api.get('/agent/network/metrics'),
  workflowTemplates: () => api.get('/agent/workflows/templates'),
  workflows: (params) => api.get('/agent/workflows', { params }),
  createWorkflow: (data) => api.post('/agent/workflows', data || {}),
  getWorkflow: (id) => api.get(`/agent/workflows/${id}`),
  approveWorkflow: (id, data) => api.post(`/agent/workflows/${id}/approve`, data || {}),
  rejectWorkflow: (id, data) => api.post(`/agent/workflows/${id}/reject`, data || {}),
  pauseWorkflow: (id) => api.post(`/agent/workflows/${id}/pause`),
  resumeWorkflow: (id) => api.post(`/agent/workflows/${id}/resume`),
  cancelWorkflow: (id) => api.post(`/agent/workflows/${id}/cancel`),
  editWorkflow: (id, data) => api.post(`/agent/workflows/${id}/edit`, data || {}),
}

export const memoryApi = {
  meta: () => api.get('/memory/meta'),
  list: (params) => api.get('/memory', { params }),
  get: (id) => api.get(`/memory/${id}`),
  create: (data) => api.post('/memory', data || {}),
  update: (id, data) => api.patch(`/memory/${id}`, data || {}),
  archive: (id) => api.post(`/memory/${id}/archive`),
  remove: (id, data) => api.delete(`/memory/${id}`, { data: data || { confirm: true } }),
  bulkRemove: (data) => api.post('/memory/bulk-delete', data || {}),
  relevant: (data) => api.post('/memory/relevant', data || {}),
  review: () => api.get('/memory/review'),
  forget: (data) => api.post('/memory/forget', data || {}),
  utterance: (data) => api.post('/memory/utterance', data || {}),
  exportMine: () => api.get('/memory/export'),
  center: () => api.get('/memory/center'),
  getSettings: () => api.get('/memory/settings'),
  updateSettings: (data) => api.patch('/memory/settings', data || {}),
  confirm: (id, data) => api.post(`/memory/${id}/confirm`, data || {}),
  propose: (data) => api.post('/memory/propose', data || {}),
  conflicts: (data) => api.post('/memory/conflicts', data || {}),
  adaptiveMentor: () => api.get('/memory/adaptive-mentor'),
}

export const contentReportApi = {
  create: (data) => api.post('/content-reports', data),
  mine: () => api.get('/content-reports/mine'),
}

export const libraryApi = {
  home: (params) => api.get('/library/home', { params }),
  list: (params) => api.get('/library/books', { params }),
  search: (q) => api.get('/library/search', { params: { q } }),
  filters: () => api.get('/library/filters'),
  categories: () => api.get('/library/categories'),
  get: (id) => api.get(`/library/books/${id}`),
  pdf: (id) => api.get(`/library/books/${id}/pdf`, { responseType: 'blob' }),
  progress: (id) => api.get(`/library/books/${id}/progress`),
  saveProgress: (id, data) => api.put(`/library/books/${id}/progress`, data),
  annotations: (id, params) => api.get(`/library/books/${id}/annotations`, { params }),
  createAnnotation: (id, data) => api.post(`/library/books/${id}/annotations`, data),
  updateAnnotation: (id, annotationId, data) => api.put(`/library/books/${id}/annotations/${annotationId}`, data),
  deleteAnnotation: (id, annotationId) => api.delete(`/library/books/${id}/annotations/${annotationId}`),
  recordSession: (id, data) => api.post(`/library/books/${id}/sessions`, data),
  dashboard: () => api.get('/library/dashboard'),
  favorite: (id) => api.post(`/library/books/${id}/favorite`),
  download: (id) => api.post(`/library/books/${id}/download`),
  continueReading: () => api.get('/library/continue'),
  history: () => api.get('/library/history'),
  saved: () => api.get('/library/saved'),
  summary: (id) => api.get(`/library/books/${id}/summary`),
  ai: (id, mode, focus) => api.get(`/library/books/${id}/ai`, { params: { mode, focus } }),
  recommendations: () => api.get('/library/recommendations'),
  collections: (params) => api.get('/library/collections', { params }),
  collection: (id) => api.get(`/library/collections/${id}`),
  createCollection: (data) => api.post('/library/collections', data),
  updateCollection: (id, data) => api.put(`/library/collections/${id}`, data),
  orgBooks: () => api.get('/library/org/books'),
  orgCollections: () => api.get('/library/org/collections'),
  createBook: (data) => api.post('/library/books', data),
  updateBook: (id, data) => api.put(`/library/books/${id}`, data),
  myLibrary: () => api.get('/library/my'),
  enrichedHome: () => api.get('/library/home/enriched'),
  resourceSearch: (params) => api.get('/library/resources/search', { params }),
  naturalSearch: (query) => api.post('/library/search/natural', { query }),
  goalResources: (goalId, params) => api.get(`/library/goals/${goalId}/resources`, { params }),
  roadmapResources: (roadmapId, params) => api.get(`/library/roadmaps/${roadmapId}/resources`, { params }),
  linkGoalResource: (goalId, data) => api.post(`/library/goals/${goalId}/link`, data),
  linkRoadmapResource: (roadmapId, data) => api.post(`/library/roadmaps/${roadmapId}/link`, data),
  indexDocument: (id, pages) => api.post(`/library/books/${id}/index`, { pages }),
  documentStatus: (id) => api.get(`/library/books/${id}/processing`),
  readingAssistant: (id, data) => api.post(`/library/books/${id}/reading-assistant`, data),
  practiceQuestions: (id, data) => api.post(`/library/books/${id}/practice-questions`, data),
  revisionCards: (id, data) => api.post(`/library/books/${id}/revision-cards`, data),
  scheduleReading: (data) => api.post('/library/reading/schedule', data),
  uploadDocument: (formData) => api.post('/library/uploads', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
}

export const interactionApi = {
  follow: (data) => api.post('/interaction/follow', data),
  bookmark: (data) => api.post('/interaction/bookmark', data),
  applyJob: (id, data) => api.post(`/interaction/jobs/${id}/apply`, data),
  applyInternship: (id, data) => api.post(`/interaction/internships/${id}/apply`, data),
  createReview: (data) => api.post('/interaction/reviews', data),
  reportReview: (id) => api.post(`/interaction/reviews/${id}/report`),
  getReviews: (params) => api.get('/interaction/reviews', { params }),
  myFollows: () => api.get('/interaction/follows'),
  myBookmarks: () => api.get('/interaction/bookmarks'),
  myApplications: () => api.get('/interaction/applications'),
  status: (params) => api.get('/interaction/status', { params }),
  applyAdmission: (id, data) => api.post(`/interaction/institutions/${id}/apply`, data),
}

export const researchApi = {
  overview: () => api.get('/research/overview'),
  projects: () => api.get('/research/projects'),
  createProject: (data) => api.post('/research/projects', data),
  project: (id) => api.get(`/research/projects/${id}`),
  updateProject: (id, data) => api.put(`/research/projects/${id}`, data),
  deleteProject: (id) => api.delete(`/research/projects/${id}`),
  addSource: (id, data) => api.post(`/research/projects/${id}/sources`, data),
  addNote: (id, data) => api.post(`/research/projects/${id}/notes`, data),
  addClaim: (id, data) => api.post(`/research/projects/${id}/claims`, data),
  acceptSuggestedClaim: (id, data) => api.post(`/research/projects/${id}/claims/accept-suggested`, data),
  proposePlan: (id) => api.post(`/research/projects/${id}/plan/propose`),
  applyPlan: (id, data) => api.post(`/research/projects/${id}/plan/apply`, data),
  chat: (id, data) => api.post(`/research/projects/${id}/chat`, data),
  synthesize: (id) => api.post(`/research/projects/${id}/synthesize`),
  intelligence: (id) => api.get(`/research/projects/${id}/intelligence`),
  knowledgeMap: (id) => api.get(`/research/projects/${id}/knowledge-map`),
  compareSources: (id, data) => api.post(`/research/projects/${id}/compare-sources`, data),
  refineQuestion: (id) => api.post(`/research/projects/${id}/refine-question`),
  summarizeSource: (id, sourceId) => api.post(`/research/projects/${id}/sources/${sourceId}/summarize`),
}

export const researchWorkspaceApi = {
  list: (params) => api.get('/research/workspace', { params }),
  create: (data) => api.post('/research/workspace', data),
  get: (id) => api.get(`/research/workspace/${id}`),
  update: (id, data) => api.patch(`/research/workspace/${id}`, data),
  dashboard: (id) => api.get(`/research/workspace/${id}/dashboard`),
  addSource: (id, data) => api.post(`/research/workspace/${id}/sources`, data),
  removeSource: (id, sourceRefId) => api.delete(`/research/workspace/${id}/sources/${sourceRefId}`),
  collectSources: (id, data) => api.post(`/research/workspace/${id}/sources/collect`, data),
  extractEvidence: (id) => api.post(`/research/workspace/${id}/evidence/extract`),
  synthesize: (id) => api.post(`/research/workspace/${id}/synthesize`),
  generateReport: (id, data) => api.post(`/research/workspace/${id}/reports`, data || {}),
  reviewReport: (id, reportId) => api.post(`/research/workspace/${id}/reports/${reportId}/review`),
  approveReport: (id, reportId) => api.post(`/research/workspace/${id}/reports/${reportId}/approve`),
  exportReport: (id, reportId) => api.get(`/research/workspace/${id}/reports/${reportId}/export`, { responseType: 'blob' }),
  addNote: (id, data) => api.post(`/research/workspace/${id}/notes`, data),
  chat: (id, data) => api.post(`/research/workspace/${id}/chat`, data),
}

export const academicsApi = {
  overview: () => api.get('/academics/overview'),
  updateProfile: (data) => api.put('/academics/profile', data),
  addPeriod: (data) => api.post('/academics/periods', data),
  subjects: () => api.get('/academics/subjects'),
  createSubject: (data) => api.post('/academics/subjects', data),
  subject: (id) => api.get(`/academics/subjects/${id}`),
  updateSubject: (id, data) => api.put(`/academics/subjects/${id}`, data),
  applySyllabus: (id, data) => api.put(`/academics/subjects/${id}/syllabus`, data),
  proposeSyllabus: (id, data) => api.post(`/academics/subjects/${id}/syllabus/propose`, data),
  updateTopicStatus: (id, data) => api.patch(`/academics/subjects/${id}/topics/status`, data),
  notes: (params) => api.get('/academics/notes', { params }),
  createNote: (data) => api.post('/academics/notes', data),
  assignments: (params) => api.get('/academics/assignments', { params }),
  createAssignment: (data) => api.post('/academics/assignments', data),
  exams: (params) => api.get('/academics/exams', { params }),
  createExam: (data) => api.post('/academics/exams', data),
  examPrep: (id) => api.get(`/academics/exams/${id}/prep`),
  uploadQuestionPaper: (subjectId, data) => api.post(`/academics/subjects/${subjectId}/question-papers`, data),
  analyzePapers: (subjectId) => api.get(`/academics/subjects/${subjectId}/question-papers/analysis`),
  revisionQueue: (params) => api.get('/academics/revision', { params }),
  recordPractice: (conceptId, data) => api.post(`/academics/concepts/${conceptId}/practice`, data),
  rapidRevision: (params) => api.get('/academics/revision/rapid', { params }),
  dailyStudyPlan: (params) => api.get('/academics/study-plan/daily', { params }),
  proposeStudyPlan: (data) => api.post('/academics/study-plan/propose', data),
  confirmStudyPlan: (data) => api.post('/academics/study-plan/confirm', data),
  nextAction: () => api.get('/academics/next-action'),
}

export const careerApi = {
  dashboard: () => api.get('/career/dashboard'),
  profile: () => api.get('/career/profile'),
  updateProfile: (data) => api.put('/career/profile', data),
  readiness: () => api.get('/career/readiness'),
  notifications: () => api.get('/career/notifications'),
  opportunities: (params) => api.get('/career/opportunities', { params }),
  filters: () => api.get('/career/opportunity-filters'),
  apply: (type, id, data) => api.post(`/career/opportunities/${type}/${id}/apply`, data),
  applications: () => api.get('/career/applications'),
  withdraw: (id) => api.post(`/career/applications/${id}/withdraw`),
  resumes: () => api.get('/career/resumes'),
  resume: (id) => api.get(`/career/resumes/${id}`),
  createResume: (data) => api.post('/career/resumes', data),
  updateResume: (id, data) => api.put(`/career/resumes/${id}`, data),
  deleteResume: (id) => api.delete(`/career/resumes/${id}`),
  analyzeResume: (id, data) => api.post(`/career/resumes/${id}/analyze`, data),
  downloadResume: (id) => api.get(`/career/resumes/${id}/pdf`, { responseType: 'blob' }),
}

export const adminApi = {
  overview: () => api.get('/admin/overview'),
  analytics: () => api.get('/admin/analytics'),
  logs: () => api.get('/admin/logs'),
  users: (params) => api.get('/admin/users', { params }),
  institutions: (params) => api.get('/admin/institutions', { params }),
  approveInstitution: (id) => api.patch(`/admin/institutions/${id}/approve`),
  suspendInstitution: (id) => api.patch(`/admin/institutions/${id}/suspend`),
  companies: (params) => api.get('/admin/companies', { params }),
  approveCompany: (id) => api.patch(`/admin/companies/${id}/approve`),
  suspendCompany: (id) => api.patch(`/admin/companies/${id}/suspend`),
  promotions: (params) => api.get('/admin/promotions', { params }),
  approvePromotion: (id) => api.patch(`/admin/promotions/${id}/approve`),
  rejectPromotion: (id) => api.patch(`/admin/promotions/${id}/reject`),
  reviews: (params) => api.get('/admin/reviews', { params }),
  moderateReview: (id, data) => api.patch(`/admin/reviews/${id}`, data),
  suspendUser: (id, data) => api.patch(`/admin/users/${id}/suspend`, data || { suspended: true }),
  updateUserAccess: (id, data) => api.patch(`/admin/users/${id}/access`, data),
  books: () => api.get('/admin/books'),
  archiveBook: (id) => api.patch(`/admin/books/${id}/archive`),
  jobs: () => api.get('/admin/jobs'),
  closeJob: (id) => api.patch(`/admin/jobs/${id}/close`),
  internships: () => api.get('/admin/internships'),
  courses: () => api.get('/admin/courses'),
  events: () => api.get('/admin/events'),
  scholarships: () => api.get('/admin/scholarships'),
  reports: (params) => api.get('/admin/reports', { params }),
  resolveReport: (id, data) => api.patch(`/admin/reports/${id}`, data),
  careerReports: () => api.get('/admin/career-reports'),
  broadcast: (data) => api.post('/admin/notifications/broadcast', data),
}


// ── Goals ─────────────────────────────────────────────────────────────────────
export const goalApi = {
  getAll:       (params)   => api.get('/goals', { params }),
  get:          (id)       => api.get(`/goals/${id}`),
  analytics:    ()         => api.get('/goals/analytics'),
  create:       (data)     => api.post('/goals', data),
  update:       (id, data) => api.put(`/goals/${id}`, data),
  delete:       (id)       => api.delete(`/goals/${id}`),
  addProgress:  (id, data) => api.post(`/goals/${id}/progress`, data),
  addMilestone: (id, data) => api.post(`/goals/${id}/milestones`, data),
  updateMilestone: (id, milestoneId, data) => api.patch(`/goals/${id}/milestones/${milestoneId}`, data),
  deleteMilestone: (id, milestoneId) => api.delete(`/goals/${id}/milestones/${milestoneId}`),
  addNote:      (id, data) => api.post(`/goals/${id}/notes`, data),
  generatePlan: (id)       => api.post(`/goals/${id}/ai-plan`),
}

export const goalIntelligenceApi = {
  suggest: (data) => api.post('/goals/intelligence/suggest', data),
  clarify: (data) => api.post('/goals/intelligence/clarify', data),
  save: (data) => api.post('/goals/intelligence/save', data),
  weeklyReview: () => api.get('/goals/intelligence/weekly-review'),
  conflicts: () => api.get('/goals/intelligence/conflicts'),
  progress: (goalId) => api.get(`/goals/intelligence/${goalId}/progress`),
  syncProgress: (goalId) => api.post(`/goals/intelligence/${goalId}/progress/sync`),
  nextAction: (goalId) => api.get(`/goals/intelligence/${goalId}/next-action`),
  review: (goalId) => api.get(`/goals/intelligence/${goalId}/review`),
  adaptPreview: (goalId) => api.get(`/goals/intelligence/${goalId}/adapt-roadmap`),
  applyAdaptation: (goalId, data) => api.post(`/goals/intelligence/${goalId}/adapt-roadmap/apply`, data),
  suggestTasks: (goalId, data) => api.post(`/goals/intelligence/${goalId}/suggest-tasks`, data),
  acceptTasks: (goalId, data) => api.post(`/goals/intelligence/${goalId}/accept-tasks`, data),
  validateRoadmap: (data) => api.post('/goals/intelligence/validate-roadmap', data),
}

// ── Tasks ─────────────────────────────────────────────────────────────────────
export const taskApi = {
  getAll:   (params)   => api.get('/tasks', { params }),
  get:      (id)       => api.get(`/tasks/${id}`),
  analytics: ()        => api.get('/tasks/analytics'),
  create:   (data)     => api.post('/tasks', data),
  update:   (id, data) => api.put(`/tasks/${id}`, data),
  duplicate: (id)      => api.post(`/tasks/${id}/duplicate`),
  startFocus: (id)     => api.post(`/tasks/${id}/focus/start`),
  stopFocus: (id)      => api.post(`/tasks/${id}/focus/stop`),
  delete:   (id)       => api.delete(`/tasks/${id}`),
  generate: (data)     => api.post('/tasks/generate-from-roadmap', data),
}

// ── Study Planner & Focus ─────────────────────────────────────────────────────
export const plannerApi = {
  getToday: (params) => api.get('/planner/today', { params }),
  getWeek: (params) => api.get('/planner/week', { params }),
  getPreferences: () => api.get('/planner/preferences'),
  updatePreferences: (data) => api.put('/planner/preferences', data),
  listSchedule: (params) => api.get('/planner/schedule', { params }),
  createSchedule: (data) => api.post('/planner/schedule', data),
  updateSchedule: (id, data) => api.put(`/planner/schedule/${id}`, data),
  deleteSchedule: (id) => api.delete(`/planner/schedule/${id}`),
  completeSchedule: (id, data) => api.post(`/planner/schedule/${id}/complete`, data),
  skipSchedule: (id) => api.post(`/planner/schedule/${id}/skip`),
  suggestDaily: (data) => api.post('/planner/plan/daily/suggest', data),
  suggestWeekly: (data) => api.post('/planner/plan/weekly/suggest', data),
  applyPlan: (data) => api.post('/planner/plan/apply', data),
  suggestBreakdown: (taskId) => api.get(`/planner/tasks/${taskId}/breakdown`),
  getMetrics: () => api.get('/planner/metrics'),
  getDailySummary: (params) => api.get('/planner/summary/daily', { params }),
  getOverdue: () => api.get('/planner/overdue'),
  getActiveFocus: () => api.get('/planner/focus/active'),
  getFocusHistory: (params) => api.get('/planner/focus/history', { params }),
  startFocus: (data) => api.post('/planner/focus/start', data),
  pauseFocus: (id) => api.post(`/planner/focus/${id}/pause`),
  resumeFocus: (id) => api.post(`/planner/focus/${id}/resume`),
  completeFocus: (id, data) => api.post(`/planner/focus/${id}/complete`, data),
  cancelFocus: (id) => api.post(`/planner/focus/${id}/cancel`),
}

// ── Roadmap ───────────────────────────────────────────────────────────────────
export const roadmapApi = {
  getAll:   ()       => api.get('/roadmap'),
  get:      (goalId) => api.get(`/roadmap/${goalId}`),
  initialize: (goalId) => api.post('/roadmap/initialize', { goalId }),
  updateArchitecture: (goalId, data) => api.put(`/roadmap/${goalId}/architecture`, data),
  updateStep: (goalId, data) => api.put(`/roadmap/${goalId}/task`, data),
  generate: (data)   => api.post('/roadmap/generate', data),
}

// ── Reports ───────────────────────────────────────────────────────────────────
export const reportApi = {
  getAll:   ()     => api.get('/report'),
  generate: (data) => api.post('/report/generate', data),
  download: (id)   => api.get(`/report/${id}/pdf`, { responseType: 'blob' }),
}

export const mentorApi = {
  chat: (payload, config = {}) => api.post('/mentor/chat', payload, config),
  history: (params = {}) => api.get('/mentor/history', { params }),
  clear: (params = {}) => api.delete('/mentor/history', { params }),
  conversations: () => api.get('/mentor/conversations'),
  createConversation: (data) => api.post('/mentor/conversations', data),
  getConversation: (id) => api.get(`/mentor/conversations/${id}`),
  updateConversation: (id, data) => api.patch(`/mentor/conversations/${id}`, data),
  deleteConversation: (id) => api.delete(`/mentor/conversations/${id}`),
  searchConversations: (q) => api.get('/mentor/conversations/search', { params: { q } }),
  contextPreview: (params) => api.get('/mentor/context-preview', { params }),
  removeSavedMemory: (index) => api.delete(`/mentor/memory/saved/${index}`),
}

// ── Profile ───────────────────────────────────────────────────────────────────
export const profileApi = {
  get:         ()     => api.get('/profile'),
  update:      (data) => api.put('/profile', data),
  privacy:     (data) => api.put('/profile/privacy', data),
  preferences: (data) => api.put('/profile/preferences', data),
  portfolio:   (data) => api.put('/profile/portfolio', data),
  reorderProjects: (data) => api.put('/profile/projects/reorder', data),
  completeness: () => api.get('/profile/completeness'),
  previewPublic: () => api.get('/profile/preview/public'),
  share:       () => api.get('/profile/share'),
  summary:     ()     => api.get('/profile/summary'),
  graph:       ()     => api.get('/profile/knowledge-graph'),
  public:      (username) => api.get(`/profile/public/${username}`),
  addItem:     (section, data) => api.post(`/profile/${section}`, data),
  updateItem:  (section, id, data) => api.put(`/profile/${section}/${id}`, data),
  deleteItem:  (section, id) => api.delete(`/profile/${section}/${id}`),
  improveHeadline: (data) => api.post('/profile/ai/improve-headline', data),
  improveAbout: (data) => api.post('/profile/ai/improve-about', data),
  improveProject: (data) => api.post('/profile/ai/improve-project', data),
  portfolioSuggestions: () => api.post('/profile/ai/portfolio-suggestions'),
  upload:      (file, purpose) => {
    const form = new FormData()
    form.append('file', file)
    form.append('purpose', purpose)
    return api.post('/profile/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } })
  },
  asset:       (url) => api.get(String(url).replace(/^\/api/, ''), { responseType: 'blob' }),
}

// ── Community ─────────────────────────────────────────────────────────────────
export const communityApi = {
  getPosts: (params) => api.get('/community', { params }),
  getFeed: (params) => api.get('/community/feed', { params }),
  getPost: (id) => api.get(`/community/posts/${id}`),
  createPost: (data) => api.post('/community', data),
  updatePost: (id, data) => api.put(`/community/posts/${id}`, data),
  deletePost: (id) => api.delete(`/community/posts/${id}`),
  likePost: (id) => api.put(`/community/${id}/like`),
  bookmarkPost: (id) => api.post(`/community/posts/${id}/bookmark`),
  getComments: (id) => api.get(`/community/posts/${id}/comments`),
  addComment: (id, data) => api.post(`/community/posts/${id}/comments`, data),
  updateComment: (postId, commentId, data) => api.put(`/community/posts/${postId}/comments/${commentId}`, data),
  deleteComment: (postId, commentId) => api.delete(`/community/posts/${postId}/comments/${commentId}`),
  markHelpfulComment: (postId, commentId) => api.post(`/community/posts/${postId}/comments/${commentId}/helpful`),
  createTaskFromPost: (id, data) => api.post(`/community/posts/${id}/create-task`, data),
  getTrending: (params) => api.get('/community/trending', { params }),
  getProjects: (params) => api.get('/community/projects', { params }),
  getProject: (id) => api.get(`/community/projects/${id}`),
  publishProjectPost: (projectId, data) => api.post(`/community/projects/${projectId}/publish`, data),
  listGroups: (params) => api.get('/community/groups', { params }),
  createGroup: (data) => api.post('/community/groups', data),
  getGroup: (id) => api.get(`/community/groups/${id}`),
  joinGroup: (id) => api.post(`/community/groups/${id}/join`),
  leaveGroup: (id) => api.post(`/community/groups/${id}/leave`),
  listCollaborations: (params) => api.get('/community/collaborations', { params }),
  createCollaboration: (data) => api.post('/community/collaborations', data),
  updateCollaborationStatus: (id, data) => api.patch(`/community/collaborations/${id}/status`, data),
  discoverStudents: (params) => api.get('/community/students/discover', { params }),
  followStudent: (userId) => api.post(`/community/students/${userId}/follow`),
  blockStudent: (userId) => api.post(`/community/students/${userId}/block`),
  getFollowStats: (userId) => api.get(`/community/students/${userId}/follow-stats`),
  getCreatorStats: () => api.get('/community/creator/stats'),
  improvePostDraft: (data) => api.post('/community/ai/improve-post', data),
  suggestTags: (data) => api.post('/community/ai/suggest-tags', data),
  suggestProjectSummary: (data) => api.post('/community/ai/project-summary', data),
  reportContent: (data) => api.post('/community/report', data),
  uploadMedia: (file) => {
    const form = new FormData()
    form.append('file', file)
    return api.post('/community/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } })
  },
}

// ── Books ─────────────────────────────────────────────────────────────────────
export const booksApi = {
  getAll:    ()     => api.get('/books'),
  recommend: (data) => api.post('/books/recommend', data),
}

// ── Daily ─────────────────────────────────────────────────────────────────────
export const dailyApi = {
  get:     ()     => api.get('/daily'),
  getPost: (data) => api.post('/daily', data),
}
export const lessonApi = {
  generate:     (data) => api.post('/lesson/generate', data),
  videoScript:  (data) => api.post('/lesson/video-script', data),
  suggestions:  ()     => api.get('/lesson/suggestions'),
}
