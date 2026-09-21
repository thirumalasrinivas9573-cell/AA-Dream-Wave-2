import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button, Dialog, EmptyState, ErrorState, LoadingState } from '@shared/components/ui'
import { studentPath } from '../../theme'

function formatMinutes(mins) {
  if (!mins) return '0m'
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return h ? `${h}h ${m}m` : `${m}m`
}

function PriorityBadge({ priority }) {
  const cls = priority === 'High' ? 'planner-priority--high' : priority === 'Low' ? 'planner-priority--low' : ''
  return <span className={`planner-priority ${cls}`}>{priority || 'Medium'}</span>
}

function PlanItemRow({ item, onComplete, onSkip, onStartFocus, onReschedule }) {
  return (
    <article className={`planner-item ${item.status === 'completed' || item.isCompleted ? 'planner-item--done' : ''}`}>
      <div className="planner-item__time">
        {item.startTime && item.endTime ? `${item.startTime} – ${item.endTime}` : `${item.durationMinutes || 30} min`}
      </div>
      <div className="planner-item__body">
        <header>
          <h3>{item.title}</h3>
          <PriorityBadge priority={item.priority} />
        </header>
        {item.priorityReason && <p className="planner-item__reason">{item.priorityReason}</p>}
        <div className="planner-item__meta">
          {item.goal && <Link to={studentPath('goals')}>Goal: {item.goal.title}</Link>}
          {item.task?._id && <Link to={studentPath(`tasks?task=${item.task._id}`)}>Open task</Link>}
          <span>{item.durationMinutes} min</span>
          <span className={`planner-status planner-status--${item.status}`}>{item.status}</span>
        </div>
      </div>
      <div className="planner-item__actions">
        {item.task?._id && item.status !== 'completed' && !item.isCompleted && (
          <Button size="sm" onClick={() => onStartFocus(item)}>Start focus</Button>
        )}
        {item.status !== 'completed' && !item.isCompleted && (
          <>
            <Button size="sm" variant="ghost" onClick={() => onComplete(item)}>Complete</Button>
            <Button size="sm" variant="ghost" onClick={() => onSkip(item)}>Skip</Button>
            <Button size="sm" variant="ghost" onClick={() => onReschedule(item)}>Reschedule</Button>
          </>
        )}
      </div>
    </article>
  )
}

export function PlanPreviewDialog({ preview, open, onClose, onApply, applying }) {
  const [items, setItems] = useState([])

  useEffect(() => {
    if (preview?.items) setItems(preview.items.map((i) => ({ ...i, selected: i.selected !== false })))
  }, [preview])

  if (!preview) return null

  const toggle = (index) => {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, selected: !item.selected } : item)))
  }

  const selectedCount = items.filter((i) => i.selected).length

  return (
    <Dialog
      open={open}
      title={preview.scope === 'weekly' ? 'Weekly plan preview' : 'Daily plan preview'}
      description="Review and edit before applying. Nothing is saved until you confirm."
      onClose={onClose}
    >
      <div className="planner-preview">
        {preview.overload && (
          <div className="planner-alert planner-alert--warn" role="alert">
            {preview.overload.message}
          </div>
        )}
        {preview.aiSummary && <p className="planner-preview__summary">{preview.aiSummary}</p>}
        {preview.warnings?.length > 0 && (
          <ul className="planner-preview__warnings">
            {preview.warnings.map((w) => <li key={w}>{w}</li>)}
          </ul>
        )}
        <div className="planner-preview__list">
          {items.map((item, index) => (
            <label key={`${item.scheduledDate}-${item.title}-${index}`} className="planner-preview__row">
              <input type="checkbox" checked={item.selected} onChange={() => toggle(index)} />
              <span>
                <strong>{item.scheduledDate} {item.startTime ? `${item.startTime}–${item.endTime}` : ''}</strong>
                {' — '}{item.title}
                {item.priorityReason && <small>{item.priorityReason}</small>}
              </span>
            </label>
          ))}
        </div>
        <div className="planner-preview__actions">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button disabled={applying || !selectedCount} onClick={() => onApply(items.filter((i) => i.selected), 'selected')}>
            {applying ? 'Applying…' : `Apply selected (${selectedCount})`}
          </Button>
          <Button variant="secondary" disabled={applying} onClick={() => onApply(items, 'all')}>Accept all</Button>
        </div>
      </div>
    </Dialog>
  )
}

export function OverdueSection({ tasks, onAction }) {
  if (!tasks?.length) {
    return <EmptyState title="No overdue tasks" description="You're caught up on deadlines." />
  }
  return (
    <div className="planner-overdue">
      {tasks.map((task) => (
        <article key={task._id} className="planner-overdue__item">
          <div>
            <strong>{task.title}</strong>
            <small>Due {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '—'}</small>
          </div>
          <div className="planner-overdue__actions">
            <Button size="sm" onClick={() => onAction('today', task)}>Do today</Button>
            <Button size="sm" variant="ghost" onClick={() => onAction('tomorrow', task)}>Tomorrow</Button>
            <Link to={studentPath(`tasks?task=${task._id}`)} className="btn btn-ghost btn-sm">Open</Link>
          </div>
        </article>
      ))}
    </div>
  )
}

export function WeeklyPlannerGrid({ week, onSelectDay }) {
  if (!week?.days) return null
  return (
    <div className="planner-week">
      {week.days.map((day) => (
        <button
          key={day.date}
          type="button"
          className={`planner-week__day ${day.overload ? 'planner-week__day--overload' : ''}`}
          onClick={() => onSelectDay?.(day.date)}
        >
          <span className="planner-week__label">{day.label}</span>
          <strong>{new Date(day.date).getDate()}</strong>
          <small>{day.items.length} blocks</small>
          <small>{formatMinutes(day.plannedMinutes)} / {formatMinutes(day.availableMinutes)}</small>
          {day.deadlines?.length > 0 && <span className="planner-week__deadline">{day.deadlines.length} due</span>}
        </button>
      ))}
    </div>
  )
}

export function PlannerMetricsPanel({ metrics }) {
  if (!metrics) return null
  return (
    <div className="planner-metrics">
      <article><span>Focus this week</span><strong>{formatMinutes(metrics.totalFocusMinutes)}</strong></article>
      <article><span>Sessions</span><strong>{metrics.sessionsCompleted}</strong></article>
      <article><span>Tasks done</span><strong>{metrics.tasksCompletedThisWeek}</strong></article>
      <article><span>Plan rate</span><strong>{metrics.planCompletionRate}%</strong></article>
    </div>
  )
}

export function PreferencesPanel({ preferences, onSave, saving }) {
  const [form, setForm] = useState(preferences || {})

  useEffect(() => {
    if (preferences) setForm(preferences)
  }, [preferences])

  if (!preferences) return null
  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }))

  return (
    <form
      className="planner-prefs"
      onSubmit={(e) => {
        e.preventDefault()
        onSave(form)
      }}
    >
      <label>
        Available today (minutes)
        <input type="number" min="15" max="720" value={form.availableTodayMinutes || 180} onChange={(e) => set('availableTodayMinutes', Number(e.target.value))} />
      </label>
      <label>
        Session length (minutes)
        <input type="number" min="15" max="180" value={form.sessionLengthMinutes || 45} onChange={(e) => set('sessionLengthMinutes', Number(e.target.value))} />
      </label>
      <label>
        Preferred study time
        <select value={form.preferredStudyTime || 'flexible'} onChange={(e) => set('preferredStudyTime', e.target.value)}>
          <option value="morning">Morning</option>
          <option value="afternoon">Afternoon</option>
          <option value="evening">Evening</option>
          <option value="night">Night</option>
          <option value="flexible">Flexible</option>
        </select>
      </label>
      <label>
        Default timer
        <select value={form.defaultTimerMode || '45'} onChange={(e) => set('defaultTimerMode', e.target.value)}>
          <option value="25">25 min</option>
          <option value="45">45 min</option>
          <option value="60">60 min</option>
          <option value="custom">Custom</option>
        </select>
      </label>
      <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save preferences'}</Button>
    </form>
  )
}

export function TodayPlanPanel({
  today,
  loading,
  error,
  onRetry,
  onComplete,
  onSkip,
  onStartFocus,
  onReschedule,
}) {
  if (loading) return <LoadingState label="Loading today's plan…" />
  if (error) return <ErrorState message={error} onRetry={onRetry} />
  if (!today?.items?.length) {
    return (
      <EmptyState
        title="Nothing planned today"
        description="Generate a plan or schedule tasks manually."
      />
    )
  }
  return (
    <div className="planner-today-list">
      {today.items.map((item) => (
        <PlanItemRow
          key={item._id}
          item={item}
          onComplete={onComplete}
          onSkip={onSkip}
          onStartFocus={onStartFocus}
          onReschedule={onReschedule}
        />
      ))}
    </div>
  )
}

export function RescheduleDialog({ item, open, onClose, onSave }) {
  const [date, setDate] = useState(item?.scheduledDate || '')
  const [startTime, setStartTime] = useState(item?.startTime || '17:00')
  if (!item) return null
  return (
    <Dialog open={open} title="Reschedule" description={`Move "${item.title}" to a new slot.`} onClose={onClose}>
      <div className="planner-reschedule">
        <label>Date<input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
        <label>Start time<input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} /></label>
        <div className="planner-preview__actions">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSave({ scheduledDate: date, startTime })}>Save</Button>
        </div>
      </div>
    </Dialog>
  )
}

export { formatMinutes }
