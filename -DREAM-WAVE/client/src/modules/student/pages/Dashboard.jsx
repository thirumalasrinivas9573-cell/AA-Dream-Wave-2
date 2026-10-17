import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@shared/context/AuthContext'
import { usePlatformData } from '@shared/context/PlatformDataContext'
import dashboardService from '@shared/services/dashboardService'
import intelligenceService from '@shared/services/intelligenceService'
import goalIntelligenceService from '@shared/services/goalIntelligenceService'
import plannerService from '@shared/services/plannerService'
import mentorService from '@shared/services/mentorService'
import useUnifiedSearch from '@shared/hooks/useUnifiedSearch'
import { ErrorState, EmptyState, LoadingState } from '@shared/components/ui'
import StudentLayout from '../layouts/StudentLayout'
import {
  ActivityList,
  AlertBanner,
  DailyBriefCard,
  DashboardCalendar,
  DashboardPanel,
  DashboardSearch,
  DashboardStat,
  formatDashboardDate,
  GroupedNotifications,
  InsightGrid,
  IntelligenceRecommendations,
  NextBestActionCard,
  NotificationCenter,
  PlanMyDayDialog,
  PriorityList,
  ProgressMeter,
  WidgetSummary,
} from '../components/dashboard/DashboardWidgets'
import '../styles/dashboard.css'

const QUICK_ACTIONS = [
  { to: '/student/mentor', icon: 'psychology', label: 'Ask AI' },
  { to: '/student/tasks', icon: 'checklist', label: 'Add Task' },
  { to: '/student/focus', icon: 'center_focus_strong', label: 'Start Focus' },
  { to: '/student/goals', icon: 'flag', label: 'Open Goal' },
  { to: '/student/roadmap', icon: 'route', label: 'Continue Roadmap' },
  { to: '/student/books', icon: 'menu_book', label: 'Open Library' },
  { to: '/student/career', icon: 'work', label: 'Explore Career' },
  { to: '/student/community', icon: 'groups', label: 'Create Post' },
]

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const isValidDate = (value) => value && !Number.isNaN(new Date(value).getTime())
const dateKey = (value) => (isValidDate(value) ? new Date(value).toISOString().slice(0, 10) : '')
const average = (values) => (values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0)

function initials(name) {
  return String(name || 'Student')
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
}

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

function getBook(item) {
  return item?.bookId || item?.book || item
}

export default function Dashboard() {
  const { user } = useAuth()
  const { hydrateNotifications, notifications, unread, markRead, pinNotification } = usePlatformData()
  const [data, setData] = useState({
    goals: [],
    tasks: [],
    books: [],
    applications: [],
    roadmaps: [],
    events: [],
    courses: [],
    featuredBooks: [],
    reading: {},
    jobs: [],
    internships: [],
    profile: null,
    identityProfile: null,
    profileSummary: null,
    stats: {},
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [commandCenter, setCommandCenter] = useState(null)
  const [serverActivity, setServerActivity] = useState([])
  const [groupedNotifications, setGroupedNotifications] = useState([])
  const [planOpen, setPlanOpen] = useState(false)
  const [planPreview, setPlanPreview] = useState(null)
  const [planLoading, setPlanLoading] = useState(false)
  const [planError, setPlanError] = useState('')
  const [aiInsights, setAiInsights] = useState([])
  const [mentorResume, setMentorResume] = useState(null)
  const [goalIntel, setGoalIntel] = useState({ weekly: null, nextAction: null, primaryGoal: null })
  const [searchOpen, setSearchOpen] = useState(false)
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10))
  const search = useUnifiedSearch({ scope: 'all', enabled: searchOpen, debounceMs: 200 })

  const loadDashboard = useCallback(
    async (force = false) => {
      setLoading(true)
      setError('')
      try {
        const response = await dashboardService.student({ force })
        const payload = response.data || {}
        const discovery = payload.discovery || {}
        hydrateNotifications(payload.notifications)
        setCommandCenter(payload.commandCenter || null)
        setServerActivity(payload.activity || [])
        setGroupedNotifications(payload.notifications?.grouped || [])
        setData({
          goals: payload.goals || [],
          tasks: payload.tasks || [],
          roadmaps: payload.roadmaps || [],
          profile: payload.identity?.user || null,
          identityProfile: payload.identity?.profile || null,
          profileSummary: payload.stats || null,
          books: payload.books || [],
          reading: payload.reading || {},
          applications: payload.applications || [],
          events: discovery.events || [],
          courses: discovery.courses || [],
          featuredBooks: discovery.featuredBooks || [],
          jobs: discovery.jobs || [],
          internships: discovery.internships || [],
          stats: payload.stats || {},
        })
      } catch (requestError) {
        setError(requestError.userMessage || 'The dashboard could not connect to Dream Wave services.')
      } finally {
        setLoading(false)
      }
    },
    [hydrateNotifications]
  )

  useEffect(() => {
    loadDashboard()
  }, [loadDashboard])

  useEffect(() => {
    intelligenceService
      .insights()
      .then((response) => setAiInsights(response.data?.items || []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    mentorService
      .conversations()
      .then((response) => setMentorResume((response.conversations || [])[0] || null))
      .catch(() => {})
  }, [])

  useEffect(() => {
    goalIntelligenceService
      .weeklyReview()
      .then((response) => setGoalIntel((current) => ({ ...current, weekly: response.data })))
      .catch(() => {})
  }, [])

  useEffect(() => {
    const primary = data.goals.find((goal) => !goal.completed && !['archived', 'paused'].includes(goal.status))
    if (!primary?._id) {
      setGoalIntel((current) => ({ ...current, nextAction: null, primaryGoal: null }))
      return
    }
    goalIntelligenceService
      .nextAction(primary._id)
      .then((response) => setGoalIntel((current) => ({ ...current, nextAction: response.data, primaryGoal: primary })))
      .catch(() => setGoalIntel((current) => ({ ...current, nextAction: null, primaryGoal: primary })))
  }, [data.goals])

  useEffect(() => {
    const handleShortcut = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setSearchOpen(true)
      }
    }
    window.addEventListener('keydown', handleShortcut)
    return () => window.removeEventListener('keydown', handleShortcut)
  }, [])

  const profile = data.profile || user || {}
  const identityProfile = data.identityProfile || {}
  const academic = identityProfile.academic || {}
  const certificates = useMemo(
    () => identityProfile.credentials || user?.certificates || [],
    [identityProfile.credentials, user?.certificates]
  )
  const activeGoals = useMemo(() => data.goals.filter((goal) => !goal.completed), [data.goals])
  const completedGoals = useMemo(
    () => data.goals.filter((goal) => goal.completed || goal.status === 'completed'),
    [data.goals]
  )
  const activeTasks = useMemo(() => data.tasks.filter((task) => task.status !== 'archived'), [data.tasks])
  const completedTasks = useMemo(
    () => activeTasks.filter((task) => task.completed || task.status === 'completed'),
    [activeTasks]
  )
  const pendingTasks = useMemo(
    () => activeTasks.filter((task) => !task.completed && !['completed', 'paused'].includes(task.status)),
    [activeTasks]
  )
  const roadmaps = data.roadmaps
  const jobApplications = useMemo(
    () => data.applications.filter((item) => String(item.targetType || item.type).toLowerCase() === 'job'),
    [data.applications]
  )
  const internshipApplications = useMemo(
    () => data.applications.filter((item) => String(item.targetType || item.type).toLowerCase() === 'internship'),
    [data.applications]
  )

  const stats = [
    { label: 'Goals', value: data.goals.length, icon: 'flag', to: '/student/goals', tone: 'purple' },
    { label: 'Tasks', value: activeTasks.length, icon: 'checklist', to: '/student/tasks', tone: 'green' },
    { label: 'Books', value: data.stats.books ?? data.books.length, icon: 'menu_book', to: '/student/books', tone: 'blue' },
    { label: 'Roadmaps', value: roadmaps.length, icon: 'route', to: '/student/roadmap', tone: 'purple' },
    { label: 'Certificates', value: data.stats.certificates ?? certificates.length, icon: 'verified', to: '/student/certificates', tone: 'amber' },
    { label: 'Internships', value: data.stats.internshipsAvailable ?? internshipApplications.length, icon: 'badge', to: '/student/career/internships', tone: 'green' },
    { label: 'Jobs', value: data.stats.jobsAvailable ?? jobApplications.length, icon: 'work', to: '/student/career/jobs', tone: 'blue' },
  ]

  const plannerToday = commandCenter?.planner || null
  const todayKey = new Date().toISOString().slice(0, 10)

  const handlePlanDay = useCallback(async () => {
    setPlanOpen(true)
    setPlanLoading(true)
    setPlanError('')
    try {
      const preview = await plannerService.suggestDaily({})
      setPlanPreview(preview)
    } catch (requestError) {
      setPlanError(requestError.userMessage || 'Could not build a plan preview.')
      setPlanPreview(null)
    } finally {
      setPlanLoading(false)
    }
  }, [])

  const handleConfirmPlan = useCallback(async () => {
    if (!planPreview?.items?.length) return
    setPlanLoading(true)
    setPlanError('')
    try {
      await plannerService.applyPlan(
        planPreview.items.filter((item) => item.selected !== false),
        'selected'
      )
      setPlanOpen(false)
      setPlanPreview(null)
      await loadDashboard(true)
    } catch (requestError) {
      setPlanError(requestError.userMessage || 'Could not save your plan.')
    } finally {
      setPlanLoading(false)
    }
  }, [loadDashboard, planPreview])

  const handleDismissRecommendation = useCallback(async (fingerprint) => {
    if (!fingerprint) return
    try {
      await intelligenceService.dismissRecommendation(fingerprint)
      setCommandCenter((current) =>
        current
          ? {
              ...current,
              nextBestAction: current.nextBestAction?.fingerprint === fingerprint ? null : current.nextBestAction,
              intelligenceRecommendations: (current.intelligenceRecommendations || []).filter(
                (item) => item.fingerprint !== fingerprint
              ),
            }
          : current
      )
    } catch {
      // Non-blocking
    }
  }, [])

  const todaySchedule = useMemo(() => {
    const taskItems = pendingTasks
      .filter((task) => dateKey(task.dueDate) === todayKey)
      .slice(0, 4)
      .map((task) => ({ id: task._id, title: task.title, meta: task.type || 'Study task', icon: '✓' }))
    const eventItems = data.events
      .filter((event) => dateKey(event.startDate) === todayKey)
      .map((event) => ({ id: event._id, title: event.title, meta: event.type || 'Event', icon: '📅' }))
    return [...taskItems, ...eventItems].slice(0, 5)
  }, [data.events, pendingTasks, todayKey])

  const deadlines = useMemo(
    () =>
      data.goals
        .filter((goal) => !goal.completed && isValidDate(goal.deadline) && new Date(goal.deadline) >= new Date())
        .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
        .slice(0, 5),
    [data.goals]
  )

  const calendarItems = useMemo(
    () => [
      ...data.goals
        .filter((goal) => isValidDate(goal.deadline))
        .map((goal) => ({
          id: `goal-${goal._id}`,
          title: goal.title,
          dateKey: dateKey(goal.deadline),
          kind: 'deadline',
          tone: 'amber',
        })),
      ...data.tasks
        .filter((task) => isValidDate(task.dueDate))
        .map((task) => ({
          id: `task-${task._id}`,
          title: task.title,
          dateKey: dateKey(task.dueDate),
          kind: 'task',
          tone: 'green',
        })),
      ...data.events
        .filter((event) => isValidDate(event.startDate))
        .map((event) => ({
          id: `event-${event._id}`,
          title: event.title,
          dateKey: dateKey(event.startDate),
          kind: event.type || 'event',
          tone: 'blue',
        })),
    ],
    [data.events, data.goals, data.tasks]
  )

  const recentActivity = useMemo(() => {
    if (serverActivity.length) {
      return serverActivity.map((item) => ({
        id: item.id,
        title: item.title,
        type: item.type,
        kind: item.kind || item.type,
        timestamp: item.timestamp,
        meta: item.detail || item.meta,
      }))
    }
    const goalEvents = data.goals.map((goal) => ({
      id: `goal-${goal._id}`,
      title: goal.title,
      type: 'goal',
      kind: 'goal',
      timestamp: goal.updatedAt || goal.createdAt,
      meta: goal.completed ? 'Goal completed' : `${goal.progress || 0}% completed`,
    }))
    const taskEvents = completedTasks.map((task) => ({
      id: `task-${task._id}`,
      title: task.title,
      type: 'task',
      kind: 'task',
      timestamp: task.updatedAt || task.createdAt,
      meta: 'Task completed',
    }))
    return [...goalEvents, ...taskEvents]
      .filter((item) => isValidDate(item.timestamp))
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 6)
  }, [completedTasks, data.goals, serverActivity])

  const weekActivity = useMemo(() => {
    const counts = [0, 0, 0, 0, 0, 0, 0]
    const now = new Date()
    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - now.getDay())
    startOfWeek.setHours(0, 0, 0, 0)
    completedTasks.forEach((task) => {
      const taskDate = new Date(task.updatedAt || task.createdAt)
      if (taskDate >= startOfWeek) {
        counts[taskDate.getDay()] += 1
      }
    })
    return DAY_LABELS.map((label, index) => ({ label, count: counts[index] }))
  }, [completedTasks])

  const maxWeekCount = useMemo(() => Math.max(...weekActivity.map((item) => item.count), 1), [weekActivity])

  const learningProgress = useMemo(() => {
    const taskRatio = data.tasks.length ? completedTasks.length / data.tasks.length : 0
    const goalRatio = data.goals.length ? completedGoals.length / data.goals.length : 0
    const readingRatio = data.books.length ? Math.min(1, (data.reading.readCount || 0) / data.books.length) : 0
    return Math.round(average([taskRatio, goalRatio, readingRatio]) * 100)
  }, [completedGoals.length, completedTasks.length, data.books.length, data.goals.length, data.reading.readCount, data.tasks.length])

  const goalProgress = useMemo(() => {
    if (!data.goals.length) return 0
    return Math.round(average(data.goals.map((goal) => (goal.completed ? 100 : goal.progress || 0))))
  }, [data.goals])

  const taskProgress = useMemo(() => {
    if (!activeTasks.length) return 0
    return Math.round((completedTasks.length / activeTasks.length) * 100)
  }, [activeTasks.length, completedTasks.length])

  const readingProgress = useMemo(() => {
    if (!data.books.length) return 0
    return Math.round(average(data.books.map((book) => Math.min(100, Math.max(0, book.percent || 0)))))
  }, [data.books])

  const insightItems = useMemo(() => {
    if (aiInsights.length) {
      return aiInsights.map((insight) => ({
        id: insight._id || insight.id,
        title: insight.title,
        message: insight.message || insight.summary,
        kind: insight.type || 'insight',
        tone: insight.tone || 'purple',
        actionText: insight.actionText || 'Explore',
        url: insight.url || '/student/mentor',
      }))
    }
    return [
      {
        id: 'ins-1',
        title: 'Learning Velocity',
        message: `${completedTasks.length} tasks completed this week. High study momentum!`,
        kind: 'insight',
        tone: 'purple',
        actionText: 'View Tasks',
        url: '/student/tasks',
      },
    ]
  }, [aiInsights, completedTasks.length])

  return (
    <StudentLayout>
      <div className="flex flex-col gap-6 w-full">
        {error && <ErrorState message={error} onRetry={() => loadDashboard(true)} />}

        {/* Hero Welcome Banner */}
        <section className="relative overflow-hidden rounded-stitch bg-gradient-to-r from-brand-primary/15 via-brand-primary/5 to-surface border border-divider shadow-md p-6 md:p-8">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-brand-primary text-white font-bold text-xl flex items-center justify-center shadow-md shrink-0">
                {identityProfile.profilePhoto || profile.profileImage ? (
                  <img
                    src={identityProfile.profilePhoto || profile.profileImage}
                    alt="Student profile"
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  initials(identityProfile.displayName || profile.name)
                )}
              </div>
              <div>
                <span className="text-xs font-semibold text-brand-primary uppercase tracking-wider">
                  {getGreeting()}
                </span>
                <h1 className="text-2xl md:text-3xl font-heading font-bold text-content-heading tracking-tight">
                  {identityProfile.displayName || profile.name || 'Student'}
                </h1>
                <p className="text-xs text-content-muted mt-0.5">
                  {profile.streak || 0} day learning streak · Keep your momentum going
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handlePlanDay}
                className="h-10 px-5 rounded-xl bg-brand-primary text-white text-xs font-semibold hover:bg-brand-hover transition-all shadow-md shadow-brand-primary/25 flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">wb_sunny</span>
                <span>Plan My Day</span>
              </button>
            </div>
          </div>
        </section>

        {/* Dashboard Stat Grid */}
        <section className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {stats.map((stat) => (
            <Link
              key={stat.label}
              to={stat.to}
              className="p-4 rounded-stitch bg-surface border border-divider shadow-xs hover:border-brand-primary transition-all flex flex-col justify-between group"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-medium text-content-muted">{stat.label}</span>
                <span className="material-symbols-outlined text-[18px] text-brand-primary group-hover:scale-110 transition-transform">
                  {stat.icon}
                </span>
              </div>
              <div className="text-2xl font-heading font-bold text-content-heading mt-2">{stat.value}</div>
            </Link>
          ))}
        </section>

        {/* Main Dashboard Bento Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column (2/3) */}
          <div className="lg:col-span-2 space-y-6">
            <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <DashboardPanel title="Today's Plan" icon="wb_sunny" action={<Link to="/student/planner">Planner</Link>}>
                {loading ? (
                  <LoadingState label="Loading schedule…" rows={3} />
                ) : plannerToday?.items?.length || todaySchedule.length ? (
                  <ul className="space-y-2 text-xs">
                    {(plannerToday?.items?.length
                      ? plannerToday.items.slice(0, 4).map((item) => ({
                          id: item._id,
                          title: item.title,
                          meta: item.startTime ? `${item.startTime} · ${item.durationMinutes || 30} min` : `${item.durationMinutes || 30} min`,
                          icon: 'checklist',
                        }))
                      : todaySchedule
                    ).map((item) => (
                      <li key={item.id} className="p-3 rounded-xl bg-canvas border border-divider flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-[16px] text-brand-primary">{item.icon}</span>
                          <div>
                            <div className="font-semibold text-content-heading">{item.title}</div>
                            <div className="text-[10px] text-content-muted">{item.meta}</div>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold text-brand-primary">Today</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <EmptyState title="Nothing planned today" message="Generate a study plan or schedule tasks in the planner." />
                )}
              </DashboardPanel>

              <DashboardPanel title="Upcoming Deadlines" icon="flag" action={<Link to="/student/goals">View Goals</Link>}>
                {loading ? (
                  <LoadingState label="Loading deadlines…" rows={3} />
                ) : deadlines.length ? (
                  <ul className="space-y-2 text-xs">
                    {deadlines.map((goal) => (
                      <li key={goal._id} className="p-3 rounded-xl bg-canvas border border-divider flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-[16px] text-amber-500">flag</span>
                          <div>
                            <div className="font-semibold text-content-heading line-clamp-1">{goal.title}</div>
                            <div className="text-[10px] text-content-muted">{goal.progress || 0}% complete</div>
                          </div>
                        </div>
                        <span className="text-[10px] font-bold text-content-muted">{formatDashboardDate(goal.deadline)}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <EmptyState title="No upcoming deadlines" message="Goal deadlines will appear here." />
                )}
              </DashboardPanel>
            </section>

            <DashboardPanel title="Recent Activity" icon="history">
              <ActivityList items={recentActivity} loading={loading} />
            </DashboardPanel>

            <DashboardPanel title="Quick Actions" icon="bolt">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {QUICK_ACTIONS.map((action) => (
                  <Link
                    key={action.label}
                    to={action.to}
                    className="p-3 rounded-xl bg-canvas border border-divider hover:border-brand-primary transition-all flex items-center gap-2.5 text-xs font-semibold text-content-heading shadow-xs group"
                  >
                    <span className="material-symbols-outlined text-[18px] text-brand-primary group-hover:scale-110 transition-transform">
                      {action.icon}
                    </span>
                    <span className="truncate">{action.label}</span>
                  </Link>
                ))}
              </div>
            </DashboardPanel>
          </div>

          {/* Right Column (1/3 Sidebar) */}
          <div className="space-y-6">
            <DashboardPanel title="AI Insights" icon="auto_awesome">
              <InsightGrid items={insightItems} />
            </DashboardPanel>

            <DashboardPanel title="Calendar" icon="calendar_month">
              <DashboardCalendar items={calendarItems} selectedDate={selectedDate} onSelectDate={setSelectedDate} />
            </DashboardPanel>

            {mentorResume && (
              <DashboardPanel title="AI Mentor" icon="psychology" action={<Link to="/student/mentor">Open</Link>}>
                <p className="text-xs text-content-muted mb-2">Continue your latest mentor conversation.</p>
                <Link to="/student/mentor" className="text-xs font-bold text-brand-primary hover:underline">
                  {mentorResume.title || 'Continue conversation'} →
                </Link>
              </DashboardPanel>
            )}
          </div>
        </div>
      </div>

      <PlanMyDayDialog
        open={planOpen}
        preview={planPreview}
        loading={planLoading}
        error={planError}
        onClose={() => {
          setPlanOpen(false)
          setPlanPreview(null)
          setPlanError('')
        }}
        onConfirm={handleConfirmPlan}
      />

      <DashboardSearch
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        query={search.query}
        onQueryChange={search.setQuery}
        results={search.results}
        loading={search.loading}
        error={search.error}
        sourceErrors={search.sourceErrors}
      />
    </StudentLayout>
  )
}
