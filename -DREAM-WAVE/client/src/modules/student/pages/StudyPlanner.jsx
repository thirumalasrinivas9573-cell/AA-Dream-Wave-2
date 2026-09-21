import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button, ErrorState } from '@shared/components/ui'
import StudentLayout from '../layouts/StudentLayout'
import usePlanner from '../hooks/usePlanner'
import plannerService from '@shared/services/plannerService'
import { studentPath } from '../theme'
import {
  OverdueSection,
  PlanPreviewDialog,
  PlannerMetricsPanel,
  PreferencesPanel,
  RescheduleDialog,
  TodayPlanPanel,
  WeeklyPlannerGrid,
  formatMinutes,
} from '../components/planner/PlannerWorkspace'
import '../styles/planner.css'

export default function StudyPlanner() {
  const navigate = useNavigate()
  const {
    today,
    week,
    metrics,
    preferences,
    loading,
    error,
    setError,
    planPreview,
    setPlanPreview,
    generating,
    refresh,
    refreshToday,
    suggestDaily,
    suggestWeekly,
    applyPlan,
    updatePreferences,
  } = usePlanner()

  const [view, setView] = useState('today')
  const [applying, setApplying] = useState(false)
  const [savingPrefs, setSavingPrefs] = useState(false)
  const [rescheduleItem, setRescheduleItem] = useState(null)

  const handleApply = async (items, mode) => {
    setApplying(true)
    setError('')
    try {
      await applyPlan(items, mode)
      setPlanPreview(null)
    } catch (err) {
      setError(err.userMessage || 'Could not apply plan.')
    } finally {
      setApplying(false)
    }
  }

  const handleComplete = async (item, markTask = false) => {
    try {
      await plannerService.completeSchedule(item._id, markTask)
      await refreshToday()
    } catch (err) {
      setError(err.userMessage || 'Could not complete item.')
    }
  }

  const handleSkip = async (item) => {
    try {
      await plannerService.skipSchedule(item._id)
      await refreshToday()
    } catch (err) {
      setError(err.userMessage || 'Could not skip item.')
    }
  }

  const handleStartFocus = (item) => {
    const taskId = item.task?._id || item.taskId
    if (taskId) navigate(studentPath(`focus?task=${taskId}`))
  }

  const handleRescheduleSave = async (payload) => {
    if (!rescheduleItem) return
    try {
      await plannerService.reschedule(rescheduleItem._id, payload)
      setRescheduleItem(null)
      await refreshToday()
    } catch (err) {
      setError(err.userMessage || 'Could not reschedule.')
    }
  }

  const handleOverdue = async (action, task) => {
    const tomorrow = new Date()
    if (action === 'tomorrow') tomorrow.setDate(tomorrow.getDate() + 1)
    const dateKey = tomorrow.toISOString().slice(0, 10)
    try {
      await plannerService.createSchedule({
        taskId: task._id,
        title: task.title,
        scheduledDate: action === 'today' ? new Date().toISOString().slice(0, 10) : dateKey,
        durationMinutes: task.estimatedMinutes || 45,
        itemType: 'task',
      })
      await refreshToday()
    } catch (err) {
      setError(err.userMessage || 'Could not schedule overdue task.')
    }
  }

  const overload = today?.metrics?.overload

  return (
    <StudentLayout title="Study Planner">
      <div className="planner-page">
        <header className="planner-header">
          <div>
            <h1>Study Planner</h1>
            <p>Plan your day, track focus, and stay aligned with goals and roadmaps.</p>
          </div>
          <div className="planner-header__actions">
            <Button disabled={generating} onClick={() => suggestDaily({ availableMinutes: preferences?.availableTodayMinutes })}>
              {generating ? 'Planning…' : 'Plan my day'}
            </Button>
            <Button variant="secondary" disabled={generating} onClick={() => suggestWeekly()}>Plan my week</Button>
            <Link to={studentPath('focus')} className="btn btn-ghost">Focus mode</Link>
          </div>
        </header>

        {error && <ErrorState message={error} onRetry={refresh} />}

        <PlannerMetricsPanel metrics={metrics} />

        {overload && (
          <div className="planner-alert planner-alert--warn" role="alert">
            {overload.message}
            <span> You can move lower-priority work or reduce today&apos;s scope.</span>
          </div>
        )}

        <div className="planner-summary">
          <article>
            <span>Today&apos;s progress</span>
            <strong>{today?.metrics?.completed || 0} / {today?.metrics?.planned || 0}</strong>
          </article>
          <article>
            <span>Focus today</span>
            <strong>{formatMinutes(today?.metrics?.focusMinutes || 0)}</strong>
          </article>
          <article>
            <span>Available</span>
            <strong>{formatMinutes(today?.metrics?.availableMinutes || 0)}</strong>
          </article>
          <article>
            <span>Planned</span>
            <strong>{formatMinutes(today?.metrics?.plannedMinutes || 0)}</strong>
          </article>
        </div>

        <div className="planner-tabs">
          <button type="button" className={view === 'today' ? 'is-active' : ''} onClick={() => setView('today')}>Today</button>
          <button type="button" className={view === 'week' ? 'is-active' : ''} onClick={() => setView('week')}>Week</button>
          <button type="button" className={view === 'overdue' ? 'is-active' : ''} onClick={() => setView('overdue')}>Overdue</button>
          <button type="button" className={view === 'prefs' ? 'is-active' : ''} onClick={() => setView('prefs')}>Preferences</button>
        </div>

        {view === 'today' && (
          <section className="planner-panel">
            <h2>Today&apos;s plan</h2>
            <TodayPlanPanel
              today={today}
              loading={loading}
              error=""
              onRetry={refreshToday}
              onComplete={(item) => handleComplete(item)}
              onSkip={handleSkip}
              onStartFocus={handleStartFocus}
              onReschedule={setRescheduleItem}
            />
            {today?.upcoming?.length > 0 && (
              <>
                <h3>Recommended next</h3>
                <ul className="planner-recommendations">
                  {today.upcoming.slice(0, 5).map(({ task, explanation }) => (
                    <li key={task._id}>
                      <strong>{task.title}</strong>
                      <small>{explanation?.explanation}</small>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>
        )}

        {view === 'week' && (
          <section className="planner-panel">
            <h2>Weekly overview</h2>
            <WeeklyPlannerGrid week={week} onSelectDay={(date) => { setView('today'); refreshToday(date) }} />
          </section>
        )}

        {view === 'overdue' && (
          <section className="planner-panel">
            <h2>Overdue tasks</h2>
            <OverdueSection tasks={today?.overdue} onAction={handleOverdue} />
          </section>
        )}

        {view === 'prefs' && (
          <section className="planner-panel">
            <h2>Study preferences</h2>
            <PreferencesPanel
              preferences={preferences}
              saving={savingPrefs}
              onSave={async (data) => {
                setSavingPrefs(true)
                try {
                  await updatePreferences(data)
                } finally {
                  setSavingPrefs(false)
                }
              }}
            />
          </section>
        )}

        <PlanPreviewDialog
          preview={planPreview}
          open={Boolean(planPreview)}
          onClose={() => setPlanPreview(null)}
          onApply={handleApply}
          applying={applying}
        />

        <RescheduleDialog
          item={rescheduleItem}
          open={Boolean(rescheduleItem)}
          onClose={() => setRescheduleItem(null)}
          onSave={handleRescheduleSave}
        />
      </div>
    </StudentLayout>
  )
}
