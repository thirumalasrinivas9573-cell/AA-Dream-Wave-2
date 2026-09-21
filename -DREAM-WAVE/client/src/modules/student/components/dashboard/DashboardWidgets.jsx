import { memo, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Dialog, EmptyState, LoadingState } from '@shared/components/ui'
import UnifiedSearchResults from '@shared/components/platform/UnifiedSearchResults'
import '@shared/components/platform/platform.css'

const DATE_FORMAT = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' })
const TIME_FORMAT = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' })

export function formatDashboardDate(value, withTime = false) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return withTime ? `${DATE_FORMAT.format(date)} · ${TIME_FORMAT.format(date)}` : DATE_FORMAT.format(date)
}

export const DashboardPanel = memo(function DashboardPanel({
  title,
  icon,
  action,
  children,
  className = '',
  ariaLabel,
}) {
  return (
    <section className={`dw-panel ${className}`.trim()} aria-label={ariaLabel || title}>
      <header className="dw-panel__header">
        <div className="dw-panel__title">
          {icon && <span aria-hidden="true">{icon}</span>}
          <h2>{title}</h2>
        </div>
        {action}
      </header>
      <div className="dw-panel__body">{children}</div>
    </section>
  )
})

export const DashboardStat = memo(function DashboardStat({ label, value, icon, to, tone = 'purple', loading }) {
  return (
    <Link className={`dw-stat dw-stat--${tone}`} to={to} aria-label={`${label}: ${loading ? 'loading' : value}`}>
      <span className="dw-stat__icon" aria-hidden="true">{icon}</span>
      <span>
        <strong>{loading ? '—' : value}</strong>
        <small>{label}</small>
      </span>
      <span className="dw-stat__arrow" aria-hidden="true">→</span>
    </Link>
  )
})

export const ProgressMeter = memo(function ProgressMeter({ label, value, detail, tone = 'purple' }) {
  const safeValue = Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : null
  return (
    <div className="dw-progress">
      <div className="dw-progress__meta">
        <span>{label}</span>
        <strong>{safeValue === null ? 'Not tracked' : `${Math.round(safeValue)}%`}</strong>
      </div>
      <div
        className="dw-progress__track"
        role="progressbar"
        aria-label={label}
        aria-valuemin={safeValue === null ? undefined : 0}
        aria-valuemax={safeValue === null ? undefined : 100}
        aria-valuenow={safeValue === null ? undefined : Math.round(safeValue)}
      >
        {safeValue !== null && <span className={`dw-progress__fill dw-progress__fill--${tone}`} style={{ width: `${safeValue}%` }} />}
      </div>
      {detail && <small>{detail}</small>}
    </div>
  )
})

export const ActivityList = memo(function ActivityList({ items, loading, emptyMessage = 'No recent activity yet.' }) {
  if (loading) return <LoadingState label="Loading activity…" rows={4} />
  if (!items.length) return <EmptyState title="Nothing here yet" message={emptyMessage} />
  return (
    <ol className="dw-activity-list">
      {items.map((item) => (
        <li key={item.id}>
          <span className={`dw-activity-list__icon dw-activity-list__icon--${item.tone || 'purple'}`} aria-hidden="true">
            {item.icon}
          </span>
          <div>
            <strong>{item.title}</strong>
            <span>{item.meta}</span>
          </div>
          {item.to && <Link to={item.to} aria-label={`Open ${item.title}`}>View</Link>}
        </li>
      ))}
    </ol>
  )
})

export const DashboardCalendar = memo(function DashboardCalendar({ items, selectedDate, onSelectDate }) {
  const monthStart = useMemo(() => {
    const date = selectedDate ? new Date(selectedDate) : new Date()
    return new Date(date.getFullYear(), date.getMonth(), 1)
  }, [selectedDate])
  const todayKey = new Date().toISOString().slice(0, 10)
  const selectedKey = selectedDate || todayKey
  const days = useMemo(() => {
    const year = monthStart.getFullYear()
    const month = monthStart.getMonth()
    const firstWeekday = new Date(year, month, 1).getDay()
    const count = new Date(year, month + 1, 0).getDate()
    return [
      ...Array.from({ length: firstWeekday }, () => null),
      ...Array.from({ length: count }, (_, index) => {
        const day = index + 1
        const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
        return { day, key, events: items.filter((item) => item.dateKey === key) }
      }),
    ]
  }, [items, monthStart])

  const selectedItems = items.filter((item) => item.dateKey === selectedKey)
  return (
    <div className="dw-calendar">
      <div className="dw-calendar__month">
        {monthStart.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
      </div>
      <div className="dw-calendar__week" aria-hidden="true">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => <span key={`${day}-${index}`}>{day}</span>)}
      </div>
      <div className="dw-calendar__grid" role="grid" aria-label="Learning calendar">
        {days.map((entry, index) => entry ? (
          <button
            key={entry.key}
            type="button"
            className={[
              'dw-calendar__day',
              entry.key === todayKey ? 'is-today' : '',
              entry.key === selectedKey ? 'is-selected' : '',
              entry.events.length ? 'has-events' : '',
            ].filter(Boolean).join(' ')}
            onClick={() => onSelectDate(entry.key)}
            aria-label={`${formatDashboardDate(entry.key)}${entry.events.length ? `, ${entry.events.length} items` : ''}`}
            aria-pressed={entry.key === selectedKey}
          >
            {entry.day}
            {entry.events.length > 0 && <span aria-hidden="true" />}
          </button>
        ) : <span key={`blank-${index}`} />)}
      </div>
      <div className="dw-calendar__legend" aria-label="Calendar categories">
        <span><i className="dw-dot dw-dot--purple" />Study</span>
        <span><i className="dw-dot dw-dot--amber" />Deadline</span>
        <span><i className="dw-dot dw-dot--blue" />Event / Exam</span>
        <span><i className="dw-dot dw-dot--green" />Task</span>
      </div>
      <div className="dw-calendar__agenda" aria-live="polite">
        {selectedItems.length ? selectedItems.slice(0, 4).map((item) => (
          <div key={item.id}>
            <span className={`dw-dot dw-dot--${item.tone || 'purple'}`} />
            <span>{item.title}</span>
            <small>{item.kind}</small>
          </div>
        )) : <p>No scheduled items for this day.</p>}
      </div>
    </div>
  )
})

const NOTIFICATION_FILTERS = ['unread', 'read', 'pinned', 'academic', 'career', 'system']

export function NotificationCenter({ items, unread, loading, onMarkRead, onPin }) {
  const [filter, setFilter] = useState('unread')
  const filtered = items.filter((item) => {
    if (filter === 'unread') return !item.read
    if (filter === 'read') return item.read
    if (filter === 'pinned') return Boolean(item.pinnedAt)
    if (filter === 'academic') return ['academic', 'goal', 'milestone', 'roadmap', 'task', 'reminder', 'certificate'].includes(item.type)
    if (filter === 'career') return ['career', 'job', 'internship'].includes(item.type)
    return ['system', 'in-app', 'approval', 'report', 'discovery', 'ai'].includes(item.type)
  })

  return (
    <div className="dw-notifications">
      <div className="dw-filter-tabs" role="tablist" aria-label="Notification filters">
        {NOTIFICATION_FILTERS.map((name) => (
          <button
            type="button"
            role="tab"
            aria-selected={filter === name}
            className={filter === name ? 'is-active' : ''}
            onClick={() => setFilter(name)}
            key={name}
          >
            {name}{name === 'unread' && unread > 0 ? ` (${unread})` : ''}
          </button>
        ))}
      </div>
      {loading ? <LoadingState label="Loading notifications…" rows={3} /> : filtered.length ? (
        <ul className="dw-notification-list">
          {filtered.slice(0, 5).map((item) => (
            <li key={item._id} className={!item.read ? 'is-unread' : ''}>
              <span className={`dw-dot dw-dot--${item.type === 'career' ? 'green' : item.type === 'academic' ? 'blue' : 'purple'}`} />
              <div>
                <strong>{item.title}</strong>
                {item.body && <p>{item.body}</p>}
                <small>{formatDashboardDate(item.createdAt, true)}</small>
              </div>
              <div className="dw-notification-list__actions">
                <button type="button" onClick={() => onPin?.(item._id, !item.pinnedAt)} aria-label={`${item.pinnedAt ? 'Unpin' : 'Pin'} ${item.title}`}>
                  {item.pinnedAt ? '★' : '☆'}
                </button>
                {!item.read && <button type="button" onClick={() => onMarkRead(item._id)} aria-label={`Mark ${item.title} as read`}>✓</button>}
              </div>
            </li>
          ))}
        </ul>
      ) : <EmptyState title={`No ${filter} notifications`} message="New updates will appear here." />}
    </div>
  )
}

export const InsightGrid = memo(function InsightGrid({ items }) {
  return (
    <div className="dw-insight-grid">
      {items.map((item) => (
        <article key={item.key} className={`dw-insight dw-insight--${item.tone || 'purple'}`} data-integration-key={item.key}>
          <span aria-hidden="true">{item.icon}</span>
          <small>{item.label}</small>
          <strong>{item.value || 'Ready for recommendation'}</strong>
          <p>{item.detail || 'Personalized results will appear when this insight source is connected.'}</p>
          {item.to && <Link to={item.to}>Explore <span aria-hidden="true">→</span></Link>}
        </article>
      ))}
    </div>
  )
})

export function DashboardSearch({ open, onClose, query, onQueryChange, results, loading, error, sourceErrors }) {
  return (
    <Dialog open={open} title="Search your workspace" description="Search dashboard data and jump to connected student tools." onClose={onClose}>
      <label className="dw-search-dialog__label" htmlFor="dashboard-search-dialog">Search</label>
      <input
        id="dashboard-search-dialog"
        className="dw-search-dialog__input"
        type="search"
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        placeholder="Goals, tasks, books, certificates, careers, reports or notifications"
        autoFocus
      />
      <div className="dw-search-results" aria-live="polite">
        {error && <p role="alert">{error}</p>}
        <UnifiedSearchResults items={results} loading={loading} query={query} sourceErrors={sourceErrors} compact onNavigate={onClose} />
        <Link className="dw-search-results__global" to={`/search?q=${encodeURIComponent(query)}`} onClick={onClose}>
          Search all Dream Wave content <span aria-hidden="true">→</span>
        </Link>
      </div>
    </Dialog>
  )
}

const PRIORITY_TONES = { critical: 'red', high: 'amber', normal: 'purple', low: 'blue' }

export const AlertBanner = memo(function AlertBanner({ alerts = [] }) {
  if (!alerts.length) return null
  const alert = alerts[0]
  return (
    <div className={`dw-alert dw-alert--${alert.level || 'high'}`} role="status">
      <div>
        <strong>{alert.title}</strong>
        <p>{alert.message}</p>
      </div>
      {alert.url && <Link to={alert.url} className="btn btn-sm">Review</Link>}
    </div>
  )
})

export const DailyBriefCard = memo(function DailyBriefCard({ brief, loading, onPlanDay }) {
  if (loading) return <LoadingState label="Loading daily brief…" rows={2} />
  if (!brief) return <EmptyState title="Daily brief unavailable" message="Your priorities will appear when data is connected." />
  return (
    <div className="dw-daily-brief">
      <div className="dw-daily-brief__head">
        <div>
          <small>AI Daily Command Center</small>
          <h3>{brief.greeting}</h3>
        </div>
        {onPlanDay && (
          <button type="button" className="btn btn-sm btn-primary" onClick={onPlanDay}>
            Plan my day
          </button>
        )}
      </div>
      <p>{brief.summary}</p>
      {brief.highlights?.length > 1 && (
        <ul className="dw-daily-brief__list">
          {brief.highlights.map((line) => <li key={line}>{line}</li>)}
        </ul>
      )}
      {brief.source === 'deterministic' && <small className="dw-daily-brief__note">Based on your current goals, tasks and schedule.</small>}
      {brief.relationshipAware && <small className="dw-daily-brief__note">Connected to your goals, roadmap, and learning path.</small>}
    </div>
  )
})

export const NextBestActionCard = memo(function NextBestActionCard({ action, loading, onDismiss }) {
  if (loading) return <LoadingState label="Finding your next best action…" rows={2} />
  if (!action) return null
  return (
    <div className="dw-next-best">
      <div className="dw-next-best__head">
        <small>Recommended next action</small>
        {onDismiss && action.fingerprint && (
          <button type="button" className="btn btn-sm btn-ghost" onClick={() => onDismiss(action.fingerprint)} aria-label="Dismiss recommendation">
            Dismiss
          </button>
        )}
      </div>
      <h3>{action.title}</h3>
      <p>{action.reason}</p>
      {action.sourceSignals?.length > 0 && (
        <div className="dw-next-best__signals" aria-label="Why this recommendation">
          {action.sourceSignals.map((signal) => (
            <span key={signal} className="dw-signal-badge">{signal}</span>
          ))}
        </div>
      )}
      {action.action?.url && (
        <Link to={action.action.url} className="btn btn-sm btn-primary">{action.action.label || 'Take action'}</Link>
      )}
    </div>
  )
})

export const IntelligenceRecommendations = memo(function IntelligenceRecommendations({ items = [], loading, onDismiss }) {
  if (loading) return <LoadingState label="Loading recommendations…" rows={3} />
  if (!items.length) return null
  return (
    <ul className="dw-intel-recs">
      {items.map((item) => (
        <li key={item.fingerprint} className="dw-intel-recs__item">
          <div>
            <small>{item.type?.replace(/_/g, ' ')}</small>
            <strong>{item.title}</strong>
            <p>{item.reason}</p>
          </div>
          <div className="dw-intel-recs__actions">
            {item.action?.url && <Link to={item.action.url} className="btn btn-sm">Open</Link>}
            {onDismiss && item.fingerprint && (
              <button type="button" className="btn btn-sm btn-ghost" onClick={() => onDismiss(item.fingerprint)}>Not now</button>
            )}
          </div>
        </li>
      ))}
    </ul>
  )
})

export const PriorityList = memo(function PriorityList({ items = [], loading }) {
  if (loading) return <LoadingState label="Loading priorities…" rows={3} />
  if (!items.length) return <EmptyState title="No priorities queued" message="Create tasks or set a goal to get personalized priorities." />
  return (
    <ol className="dw-priority-list">
      {items.map((item, index) => (
        <li key={item.id} className={`dw-priority-list__item dw-priority-list__item--${PRIORITY_TONES[item.level] || 'purple'}`}>
          <span className="dw-priority-list__rank">{index + 1}</span>
          <div>
            <strong>{item.title}</strong>
            <small>{item.reason}</small>
          </div>
          {item.url && <Link to={item.url}>{item.action || 'Open'}</Link>}
        </li>
      ))}
    </ol>
  )
})

export const PlanMyDayDialog = memo(function PlanMyDayDialog({ open, preview, loading, error, onClose, onConfirm }) {
  return (
    <Dialog open={open} title="Plan my day" description="Preview your schedule before anything is saved." onClose={onClose}>
      {loading && <LoadingState label="Building your plan…" rows={4} />}
      {error && <p role="alert">{error}</p>}
      {!loading && preview && (
        <>
          {preview.aiSummary && <p className="dw-plan-summary">{preview.aiSummary}</p>}
          <ul className="dw-schedule-list">
            {(preview.items || []).filter((item) => item.selected !== false).map((item) => (
              <li key={item.taskId || item.title}>
                <span className="dw-list-icon">▣</span>
                <span>
                  <strong>{item.title}</strong>
                  <small>{item.startTime ? `${item.startTime} · ${item.durationMinutes} min` : `${item.durationMinutes || 30} min`}</small>
                </span>
              </li>
            ))}
          </ul>
          {(preview.warnings || []).length > 0 && (
            <ul className="dw-plan-warnings">
              {preview.warnings.map((warning) => <li key={warning}>{warning}</li>)}
            </ul>
          )}
          <div className="dw-plan-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="button" className="btn btn-primary" onClick={onConfirm} disabled={!(preview.items || []).length}>
              Confirm plan
            </button>
          </div>
        </>
      )}
    </Dialog>
  )
})

export const GroupedNotifications = memo(function GroupedNotifications({ groups = [], loading, onMarkRead }) {
  if (loading) return <LoadingState label="Loading notifications…" rows={3} />
  if (!groups.length) return <EmptyState title="No notifications" message="Updates will appear here." />
  return (
    <div className="dw-notification-groups">
      {groups.map((group) => (
        <section key={group.key} className="dw-notification-group">
          <header>
            <strong>{group.label}</strong>
            {group.unread > 0 && <span>{group.unread} unread</span>}
          </header>
          <ul className="dw-notification-list">
            {group.items.map((item) => (
              <li key={item.id} className={!item.read ? 'is-unread' : ''}>
                <span className={`dw-dot dw-dot--${group.key === 'career' ? 'green' : 'purple'}`} />
                <div>
                  <strong>{item.title}</strong>
                  {item.body && item.count === 1 && <p>{item.body}</p>}
                  <small>{item.band?.replace('_', ' ') || 'Update'}</small>
                </div>
                <div className="dw-notification-list__actions">
                  {item.link && <Link to={item.link}>Open</Link>}
                  {!item.read && <button type="button" onClick={() => onMarkRead?.(item.id)} aria-label="Mark read">✓</button>}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
})

export const WidgetSummary = memo(function WidgetSummary({ goal, roadmap, reading, career, focus, academics }) {
  return (
    <div className="dw-widget-summary">
      {goal && (
        <article className="dw-widget-summary__card">
          <small>Active goal</small>
          <strong>{goal.title}</strong>
          <ProgressMeter label="Progress" value={goal.progress} tone="purple" />
          {goal.milestone && <p>Next: {goal.milestone}</p>}
          <Link to={goal.url}>Open goal</Link>
        </article>
      )}
      {roadmap && (
        <article className="dw-widget-summary__card">
          <small>Roadmap</small>
          <strong>{roadmap.currentStage || roadmap.goalTitle}</strong>
          <ProgressMeter label="Stage progress" value={roadmap.stageProgress} tone="blue" />
          <Link to={roadmap.url}>Continue roadmap</Link>
        </article>
      )}
      {reading && (
        <article className="dw-widget-summary__card">
          <small>Continue reading</small>
          <strong>{reading.title}</strong>
          <ProgressMeter label="Reading" value={reading.percent} tone="green" />
          {reading.currentPage && reading.totalPages && <p>Page {reading.currentPage} of {reading.totalPages}</p>}
          <Link to={reading.url}>Resume</Link>
        </article>
      )}
      {career?.targetRole && (
        <article className="dw-widget-summary__card">
          <small>Career direction</small>
          <strong>{career.targetRole}</strong>
          {career.skillGap && <p>Skill focus: {career.skillGap}</p>}
          <Link to={career.url}>Career hub</Link>
        </article>
      )}
      {academics && (academics.upcomingExam || academics.dueAssignment || academics.subjectCount > 0) && (
        <article className="dw-widget-summary__card">
          <small>Academics</small>
          {academics.upcomingExam ? (
            <>
              <strong>{academics.upcomingExam.name}</strong>
              <p>{academics.upcomingExam.daysRemaining} day(s) to exam</p>
            </>
          ) : academics.dueAssignment ? (
            <>
              <strong>{academics.dueAssignment.title}</strong>
              <p>Assignment due soon</p>
            </>
          ) : (
            <>
              <strong>{academics.subjectCount} subject{academics.subjectCount === 1 ? '' : 's'}</strong>
              <p>{academics.setupRequired ? 'Complete academic setup' : 'Syllabus & revision tracked'}</p>
            </>
          )}
          <Link to={academics.url}>Open academics</Link>
        </article>
      )}
      {focus?.active && (
        <article className="dw-widget-summary__card">
          <small>Focus session</small>
          <strong>{focus.active.taskTitle}</strong>
          <p>{focus.active.durationMinutes || 25} min planned</p>
          <Link to={focus.url}>Return to focus</Link>
        </article>
      )}
    </div>
  )
})
