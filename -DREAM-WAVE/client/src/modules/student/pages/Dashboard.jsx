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
  { to: '/student/mentor', icon: '✦', label: 'Ask AI' },
  { to: '/student/tasks', icon: '✓', label: 'Add Task' },
  { to: '/student/focus', icon: '◎', label: 'Start Focus' },
  { to: '/student/goals', icon: '🎯', label: 'Open Goal' },
  { to: '/student/roadmap', icon: '🗺️', label: 'Continue Roadmap' },
  { to: '/student/books', icon: '📖', label: 'Open Library' },
  { to: '/student/career', icon: '🚀', label: 'Explore Career' },
  { to: '/student/community', icon: '💬', label: 'Create Post' },
]

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const isValidDate = (value) => value && !Number.isNaN(new Date(value).getTime())
const dateKey = (value) => isValidDate(value) ? new Date(value).toISOString().slice(0, 10) : ''
const average = (values) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0

function initials(name) {
  return String(name || 'Student').split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase()
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

  const loadDashboard = useCallback(async (force = false) => {
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
  }, [hydrateNotifications])

  useEffect(() => {
    loadDashboard()
  }, [loadDashboard])

  useEffect(() => {
    intelligenceService.insights()
      .then((response) => setAiInsights(response.data?.items || []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    mentorService.conversations()
      .then((response) => setMentorResume((response.conversations || [])[0] || null))
      .catch(() => {})
  }, [])

  useEffect(() => {
    goalIntelligenceService.weeklyReview()
      .then((response) => setGoalIntel((current) => ({ ...current, weekly: response.data })))
      .catch(() => {})
  }, [])

  useEffect(() => {
    const primary = data.goals.find((goal) => !goal.completed && !['archived', 'paused'].includes(goal.status))
    if (!primary?._id) {
      setGoalIntel((current) => ({ ...current, nextAction: null, primaryGoal: null }))
      return
    }
    goalIntelligenceService.nextAction(primary._id)
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
  const certificates = useMemo(() => identityProfile.credentials || user?.certificates || [], [identityProfile.credentials, user?.certificates])
  const completedGoals = useMemo(() => data.goals.filter((goal) => goal.completed), [data.goals])
  const activeGoals = useMemo(() => data.goals.filter((goal) => !goal.completed), [data.goals])
  const activeTasks = useMemo(() => data.tasks.filter((task) => task.status !== 'archived'), [data.tasks])
  const completedTasks = useMemo(() => activeTasks.filter((task) => task.completed || task.status === 'completed'), [activeTasks])
  const pendingTasks = useMemo(() => activeTasks.filter((task) => !task.completed && !['completed', 'paused'].includes(task.status)), [activeTasks])
  const roadmaps = data.roadmaps
  const jobApplications = useMemo(
    () => data.applications.filter((item) => String(item.targetType || item.type).toLowerCase() === 'job'),
    [data.applications],
  )
  const internshipApplications = useMemo(
    () => data.applications.filter((item) => String(item.targetType || item.type).toLowerCase() === 'internship'),
    [data.applications],
  )

  const stats = [
    { label: 'Goals', value: data.goals.length, icon: '🎯', to: '/student/goals', tone: 'purple' },
    { label: 'Tasks', value: activeTasks.length, icon: '✓', to: '/student/tasks', tone: 'green' },
    { label: 'Books', value: data.stats.books ?? data.books.length, icon: '📚', to: '/student/books', tone: 'blue' },
    { label: 'Roadmaps', value: roadmaps.length, icon: '🗺️', to: '/student/roadmap', tone: 'purple' },
    { label: 'Certificates', value: data.stats.certificates ?? certificates.length, icon: '🏅', to: '/student/certificates', tone: 'amber' },
    { label: 'Internships', value: data.stats.internshipsAvailable ?? internshipApplications.length, icon: '💼', to: '/student/career/internships', tone: 'green' },
    { label: 'Jobs', value: data.stats.jobsAvailable ?? jobApplications.length, icon: '🚀', to: '/student/career/jobs', tone: 'blue' },
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
      await plannerService.applyPlan(planPreview.items.filter((item) => item.selected !== false), 'selected')
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
      setCommandCenter((current) => current ? {
        ...current,
        nextBestAction: current.nextBestAction?.fingerprint === fingerprint ? null : current.nextBestAction,
        intelligenceRecommendations: (current.intelligenceRecommendations || []).filter((item) => item.fingerprint !== fingerprint),
      } : current)
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

  const deadlines = useMemo(() => data.goals
    .filter((goal) => !goal.completed && isValidDate(goal.deadline) && new Date(goal.deadline) >= new Date())
    .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
    .slice(0, 5), [data.goals])

  const calendarItems = useMemo(() => [
    ...data.goals.filter((goal) => isValidDate(goal.deadline)).map((goal) => ({
      id: `goal-${goal._id}`,
      title: goal.title,
      dateKey: dateKey(goal.deadline),
      kind: 'deadline',
      tone: 'amber',
    })),
    ...data.tasks.filter((task) => isValidDate(task.dueDate)).map((task) => ({
      id: `task-${task._id}`,
      title: task.title,
      dateKey: dateKey(task.dueDate),
      kind: 'task',
      tone: 'green',
    })),
    ...data.events.filter((event) => isValidDate(event.startDate)).map((event) => ({
      id: `event-${event._id}`,
      title: event.title,
      dateKey: dateKey(event.startDate),
      kind: event.type || 'event',
      tone: 'blue',
    })),
  ], [data.events, data.goals, data.tasks])

  const recentActivity = useMemo(() => {
    if (serverActivity.length) {
      return serverActivity.map((item) => ({
        id: item.id,
        title: item.title,
        meta: item.meta,
        icon: item.icon,
        tone: item.tone,
        to: item.url,
      }))
    }
    const rows = [
      ...data.books.map((item) => {
        const book = getBook(item)
        return {
          id: `book-${item._id}`,
          title: book?.title || 'Book',
          meta: `Recently read · ${Math.round(item.percent || 0)}% complete`,
          timestamp: item.lastReadAt || item.updatedAt,
          icon: '📖',
          tone: 'blue',
          to: book?._id ? `/library/books/${book._id}` : '/student/books',
        }
      }),
      ...completedGoals.map((goal) => ({
        id: `goal-${goal._id}`,
        title: goal.title,
        meta: 'Goal completed',
        timestamp: goal.updatedAt,
        icon: '🎯',
        tone: 'green',
        to: '/student/goals',
      })),
      ...certificates.map((certificate, index) => ({
        id: `certificate-${certificate._id || index}`,
        title: certificate.title,
        meta: 'Certificate earned',
        timestamp: certificate.issuedAt,
        icon: '🏅',
        tone: 'amber',
        to: '/student/certificates',
      })),
      ...completedTasks.map((task) => ({
        id: `task-${task._id}`,
        title: task.title,
        meta: 'Task completed',
        timestamp: task.completedAt || task.updatedAt,
        icon: '✓',
        tone: 'green',
        to: '/student/tasks',
      })),
      ...roadmaps.map((roadmap) => ({
        id: `roadmap-${roadmap._id}`,
        title: roadmap.goalId?.title || 'Learning Roadmap',
        meta: 'Roadmap updated',
        timestamp: roadmap.updatedAt,
        icon: '🗺️',
        tone: 'purple',
        to: '/student/roadmap',
      })),
      ...data.applications.map((application) => ({
        id: `application-${application._id}`,
        title: application.opportunity?.title || `${application.targetType || 'Opportunity'} application`,
        meta: application.status || 'Submitted',
        timestamp: application.updatedAt || application.createdAt,
        icon: '💼',
        tone: 'blue',
        to: '/student/career/applications',
      })),
    ]
    return rows
      .sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0))
      .slice(0, 8)
  }, [certificates, completedGoals, completedTasks, data.applications, data.books, roadmaps, serverActivity])

  const fallbackInsightItems = useMemo(() => [
    {
      key: 'recommended-skill',
      icon: '⚡',
      label: 'Recommended Skill',
      value: identityProfile.skills?.[0]?.name || '',
      detail: identityProfile.skills?.length ? 'Based on your current skills profile.' : '',
      to: '/student/learn',
    },
    {
      key: 'recommended-course',
      icon: '🎓',
      label: 'Recommended Course',
      value: data.courses[0]?.title || data.courses[0]?.name,
      detail: data.courses[0]?.category,
      to: '/student/career',
      tone: 'blue',
    },
    {
      key: 'recommended-book',
      icon: '📚',
      label: 'Recommended Book',
      value: data.featuredBooks[0]?.title,
      detail: data.featuredBooks[0]?.author,
      to: '/library',
      tone: 'green',
    },
    {
      key: 'career-suggestion',
      icon: '🧭',
      label: 'Career Suggestion',
      to: '/student/career/internships',
    },
    {
      key: 'internship-suggestion',
      icon: '💼',
      label: 'Internship Suggestion',
      value: data.internships[0]?.title,
      detail: data.internships[0]?.companyId?.name,
      to: '/student/career/jobs',
      tone: 'green',
    },
    {
      key: 'opportunity-alert',
      icon: '🔔',
      label: 'Opportunity Alert',
      value: data.jobs[0]?.title,
      detail: data.jobs[0]?.companyId?.name,
      to: '/discover',
      tone: 'amber',
    },
  ], [data.courses, data.featuredBooks, data.internships, data.jobs, identityProfile.skills])

  const insightItems = aiInsights.length ? aiInsights : fallbackInsightItems

  const weekActivity = useMemo(() => {
    const today = new Date()
    return Array.from({ length: 7 }, (_, offset) => {
      const date = new Date(today)
      date.setDate(today.getDate() - (6 - offset))
      const key = date.toISOString().slice(0, 10)
      const count = completedTasks.filter((task) => dateKey(task.completedAt) === key).length
      return { label: DAY_LABELS[date.getDay()], count }
    })
  }, [completedTasks])
  const maxWeekCount = Math.max(...weekActivity.map((item) => item.count), 1)
  const goalProgress = data.stats.goalProgress ?? average(activeGoals.map((goal) => Number(goal.progress) || 0))
  const taskProgress = data.stats.taskProgress ?? (activeTasks.length ? completedTasks.length / activeTasks.length * 100 : 0)
  const readingProgress = data.stats.readingProgress ?? average(data.books.map((item) => Number(item.percent) || 0))
  const learningProgress = data.stats.learningProgress ?? average([goalProgress, taskProgress, readingProgress].filter((value) => value > 0))

  return (
    <StudentLayout>
      <div className="student-dashboard">
        <header className="dw-dashboard-topbar">
          <div className="dw-dashboard-topbar__heading">
            <h1>My Workspace</h1>
            <p>Your learning journey, opportunities and progress in one place.</p>
          </div>
          <button type="button" className="dw-dashboard-search" onClick={() => setSearchOpen(true)} aria-label="Open global dashboard search">
            <span aria-hidden="true">⌕</span>
            <span>Search your workspace</span>
            <kbd>⌘ K</kbd>
          </button>
        </header>

        {error && <ErrorState title="Some information may be delayed" message={error} onRetry={loadDashboard} />}

        <AlertBanner alerts={commandCenter?.alerts || []} />

        {commandCenter?.isNewUser && commandCenter.onboarding?.length > 0 && (
          <DashboardPanel title="Get started" icon="✨">
            <nav className="dw-onboarding-actions" aria-label="Onboarding actions">
              {commandCenter.onboarding.map((action) => (
                <Link key={action.label} to={action.url}><span aria-hidden="true">{action.icon}</span>{action.label}</Link>
              ))}
            </nav>
          </DashboardPanel>
        )}

        <section className="dw-command-center" aria-label="Daily command center">
          <div className="dw-command-grid">
            <DashboardPanel title="Daily Brief" icon="✦">
              <DailyBriefCard brief={commandCenter?.dailyBrief} loading={loading} onPlanDay={handlePlanDay} />
            </DashboardPanel>
            <DashboardPanel title="Today's Priorities" icon="⚡" action={<Link to="/student/tasks">All tasks</Link>}>
              <PriorityList items={commandCenter?.priorities || []} loading={loading} />
            </DashboardPanel>
            {commandCenter?.nextBestAction && (
              <DashboardPanel title="Next Best Action" icon="🎯" className="dw-panel--accent">
                <NextBestActionCard
                  action={commandCenter.nextBestAction}
                  loading={loading}
                  onDismiss={handleDismissRecommendation}
                />
              </DashboardPanel>
            )}
          </div>
          {(commandCenter?.intelligenceRecommendations?.length > 0) && (
            <DashboardPanel title="Intelligent Suggestions" icon="💡" action={<Link to="/student/intelligence">Intelligence home</Link>}>
              <IntelligenceRecommendations
                items={commandCenter.intelligenceRecommendations}
                loading={loading}
                onDismiss={handleDismissRecommendation}
              />
            </DashboardPanel>
          )}
          <WidgetSummary
            goal={commandCenter?.activeGoal}
            roadmap={commandCenter?.roadmap}
            reading={commandCenter?.continueReading}
            career={commandCenter?.career}
            focus={commandCenter?.focus}
            academics={commandCenter?.academics}
          />
        </section>

        <section className="dw-welcome" aria-labelledby="dashboard-welcome-title">
          <div className="dw-welcome__main">
            <div className="dw-welcome__identity">
              <div className="dw-avatar">
                {identityProfile.profilePhoto || profile.profileImage ? <img src={identityProfile.profilePhoto || profile.profileImage} alt={`${identityProfile.displayName || profile.name || 'Student'} profile`} /> : initials(identityProfile.displayName || profile.name)}
              </div>
              <div>
                <p>{getGreeting()}</p>
                <h2 id="dashboard-welcome-title">{identityProfile.displayName || profile.name || 'Student'}</h2>
                <p>{profile.streak || 0} day learning streak · Keep your momentum going</p>
              </div>
            </div>
            <div className="dw-welcome__level" aria-label={`Level ${profile.level || 1}, ${profile.credits || 0} experience points`}>
              <div><span>Level {profile.level || 1}</span><strong>{profile.credits || 0} XP</strong></div>
              <div className="dw-xp-track"><span style={{ width: `${(profile.credits || 0) % 100}%` }} /></div>
              <small>{100 - ((profile.credits || 0) % 100)} XP to next level</small>
            </div>
          </div>
          <div className="dw-profile-facts">
            <span>Semester <strong>{academic.semester || 'Not set'}</strong></span>
            <span>Department <strong>{academic.department || 'Not set'}</strong></span>
            <span>Institution <strong>{academic.institution || 'Not set'}</strong></span>
            <Link to="/student/profile">Update profile</Link>
          </div>
        </section>

        <section className="dw-stat-grid" aria-label="Learning journey statistics">
          {stats.map((stat) => <DashboardStat {...stat} loading={loading} key={stat.label} />)}
        </section>

        <div className="dw-dashboard-grid">
          <main className="dw-main-workspace">
            <section className="dw-overview-grid" aria-label="Today's overview">
              <DashboardPanel title="Today's Plan" icon="☀️" action={<Link to="/student/planner">Open planner</Link>}>
                {loading ? <LoadingState label="Loading schedule…" rows={3} /> : (plannerToday?.items?.length || todaySchedule.length) ? (
                  <ul className="dw-schedule-list">
                    {(plannerToday?.items?.length ? plannerToday.items.slice(0, 4).map((item) => ({
                      id: item._id,
                      title: item.title,
                      meta: item.startTime ? `${item.startTime} · ${item.durationMinutes || 30} min` : `${item.durationMinutes || 30} min`,
                      icon: '▣',
                    })) : todaySchedule).map((item) => (
                      <li key={item.id}><span className="dw-list-icon">{item.icon}</span><span><strong>{item.title}</strong><small>{item.meta}</small></span><span>Today</span></li>
                    ))}
                  </ul>
                ) : <EmptyState title="Nothing planned today" message="Generate a study plan or schedule tasks in the planner." action={<Link to="/student/planner" className="btn btn-sm">Open planner</Link>} />}
                {plannerToday?.metrics && (
                  <p className="dw-study-summary">
                    {plannerToday.metrics.completed}/{plannerToday.metrics.planned} done · {plannerToday.metrics.focusMinutes || 0}m focus today
                  </p>
                )}
              </DashboardPanel>

              <DashboardPanel title="Upcoming Deadlines" icon="⏳" action={<Link to="/student/goals">View goals</Link>}>
                {loading ? <LoadingState label="Loading deadlines…" rows={3} /> : deadlines.length ? (
                  <ul className="dw-deadline-list">
                    {deadlines.map((goal) => (
                      <li key={goal._id}><span className="dw-list-icon">🎯</span><span><strong>{goal.title}</strong><small>{goal.progress || 0}% complete</small></span><small>{formatDashboardDate(goal.deadline)}</small></li>
                    ))}
                  </ul>
                ) : <EmptyState title="No upcoming deadlines" message="Goal deadlines will appear here." />}
              </DashboardPanel>

              <DashboardPanel title="Continue Learning" icon="📖" action={<Link to="/student/books">View library</Link>}>
                {loading ? <LoadingState label="Loading reading progress…" rows={3} /> : data.books.length ? (
                  <ul className="dw-schedule-list">
                    {data.books.slice(0, 4).map((item) => {
                      const book = getBook(item)
                      return (
                        <li key={item._id}>
                          <span className="dw-list-icon">📚</span>
                          <span><strong>{book?.title || 'Untitled book'}</strong><small>{Math.round(item.percent || 0)}% read</small></span>
                          <Link to={book?._id ? `/library/books/${book._id}` : '/student/books'}>Open</Link>
                        </li>
                      )
                    })}
                  </ul>
                ) : <EmptyState title="No active reading" message="Books you start will appear here." />}
              </DashboardPanel>

              <DashboardPanel title="Upcoming Events" icon="📅" action={<Link to="/discover">Discover</Link>}>
                {loading ? <LoadingState label="Loading events…" rows={3} /> : data.events.length ? (
                  <ul className="dw-event-list">
                    {data.events.slice(0, 4).map((event) => (
                      <li key={event._id}><span className="dw-list-icon">📅</span><span><strong>{event.title}</strong><small>{event.venue || event.type || 'Dream Wave event'}</small></span><small>{formatDashboardDate(event.startDate)}</small></li>
                    ))}
                  </ul>
                ) : <EmptyState title="No upcoming events" message="Published academic and career events will appear here." />}
              </DashboardPanel>
            </section>

            <DashboardPanel title="Recent Activity" icon="↻">
              <ActivityList items={recentActivity} loading={loading} emptyMessage="Your completed goals, tasks, books, roadmaps, certificates and applications will appear here." />
            </DashboardPanel>

            <section className="dw-productivity-grid" aria-label="Productivity overview">
              <DashboardPanel title="Weekly Study Activity" icon="▥">
                <div className="dw-week-chart" aria-label={`${completedTasks.length} completed study sessions`}>
                  {weekActivity.map((item) => (
                    <div key={item.label}>
                      <span style={{ height: `${Math.max(5, item.count / maxWeekCount * 100)}%` }} title={`${item.count} completed`} />
                      <small>{item.label}</small>
                    </div>
                  ))}
                </div>
                <p className="dw-study-summary">{weekActivity.reduce((sum, item) => sum + item.count, 0)} completed tasks · {data.reading.minutesWeek || 0} reading minutes · {data.reading.pagesReadWeek || 0} pages this week</p>
              </DashboardPanel>
              <DashboardPanel title="Learning Progress" icon="📈">
                <ProgressMeter label="Overall learning" value={learningProgress} detail="Combined active goal, task and reading progress" />
                <ProgressMeter label="Goal progress" value={goalProgress} tone="purple" />
                <ProgressMeter label="Reading progress" value={readingProgress} tone="blue" />
                <ProgressMeter label="Task completion" value={taskProgress} tone="green" />
              </DashboardPanel>
            </section>

            <DashboardPanel title="Quick Actions" icon="⚡">
              <nav className="dw-quick-actions" aria-label="Dashboard quick actions">
                {QUICK_ACTIONS.map((action) => <Link to={action.to} key={action.label}><span aria-hidden="true">{action.icon}</span>{action.label}</Link>)}
              </nav>
            </DashboardPanel>
          </main>

          <aside className="dw-insight-column" aria-label="Student insights">
            <DashboardPanel title="AI Insights" icon="✦" ariaLabel="AI insight integration widgets">
              <InsightGrid items={insightItems} />
            </DashboardPanel>

            {goalIntel.primaryGoal && (
              <DashboardPanel title="Next Best Action" icon="🎯" action={<Link to={`/student/goals?goalId=${goalIntel.primaryGoal._id}`}>Open goal</Link>}>
                {goalIntel.nextAction ? (
                  <div className="dw-next-action">
                    <strong>{goalIntel.nextAction.title}</strong>
                    <p>{goalIntel.nextAction.reason}</p>
                    {goalIntel.nextAction.url && <Link to={goalIntel.nextAction.url}>Take action</Link>}
                  </div>
                ) : <EmptyState title="No action queued" message="Create milestones or tasks to get a recommended next step." />}
              </DashboardPanel>
            )}

            {goalIntel.weekly && (
              <DashboardPanel title="Weekly Goal Review" icon="📊" action={<Link to="/student/goals">View goals</Link>}>
                <ul className="dw-schedule-list">
                  <li><span className="dw-list-icon">✓</span><span><strong>{goalIntel.weekly.tasksCompleted || 0} tasks completed</strong><small>This week</small></span></li>
                  <li><span className="dw-list-icon">◎</span><span><strong>{goalIntel.weekly.milestonesCompleted || 0} milestones completed</strong><small>This week</small></span></li>
                  <li><span className="dw-list-icon">🎯</span><span><strong>{goalIntel.weekly.goalsActive || 0} active goals</strong><small>Currently in progress</small></span></li>
                </ul>
              </DashboardPanel>
            )}

            {mentorResume && (
              <DashboardPanel title="AI Mentor" icon="🤖" action={<Link to="/student/mentor">Open</Link>}>
                <p style={{ marginTop: 0, color: 'var(--text-muted)' }}>Continue your latest mentor conversation.</p>
                <Link to="/student/mentor">{mentorResume.title || 'Continue conversation'} →</Link>
              </DashboardPanel>
            )}

            <DashboardPanel title="Calendar" icon="📅">
              <DashboardCalendar items={calendarItems} selectedDate={selectedDate} onSelectDate={setSelectedDate} />
            </DashboardPanel>

            <DashboardPanel title="Notification Center" icon="🔔" action={<Link to="/notifications">View all</Link>}>
              {groupedNotifications.length ? (
                <GroupedNotifications
                  groups={groupedNotifications}
                  loading={loading}
                  onMarkRead={(id) => markRead(id).catch(() => setError('The notification update failed. Please retry.'))}
                />
              ) : (
                <NotificationCenter
                  items={notifications}
                  unread={unread}
                  loading={loading}
                  onMarkRead={(id) => markRead(id).catch(() => setError('The notification update failed. Please retry.'))}
                  onPin={(id, pinned) => pinNotification(id, pinned).catch(() => setError('The notification update failed. Please retry.'))}
                />
              )}
            </DashboardPanel>
          </aside>
        </div>
      </div>

      <PlanMyDayDialog
        open={planOpen}
        preview={planPreview}
        loading={planLoading}
        error={planError}
        onClose={() => { setPlanOpen(false); setPlanPreview(null); setPlanError('') }}
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
