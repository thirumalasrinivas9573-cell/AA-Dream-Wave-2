import { memo, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button, Dialog, EmptyState, FormField, LoadingState } from '@shared/components/ui'

export const TASK_STATUSES = ['todo', 'in-progress', 'paused', 'completed', 'archived']
export const TASK_PRIORITIES = ['High', 'Medium', 'Low']
export const TASK_VIEWS = [
  ['list', 'List'],
  ['kanban', 'Kanban'],
  ['calendar', 'Calendar'],
  ['timeline', 'Timeline'],
  ['analytics', 'Analytics'],
]

const STATUS_LABEL = {
  todo: 'To do',
  'in-progress': 'In progress',
  paused: 'Paused',
  completed: 'Completed',
  archived: 'Archived',
}

const blankTask = {
  title: '',
  description: '',
  goalId: '',
  roadmapId: '',
  priority: 'Medium',
  category: 'General',
  dueDate: '',
  startDate: '',
  estimatedMinutes: 30,
  reminderAt: '',
  reminder: { enabled: false, daily: false, dueSoon: true, overdue: true, weeklySummary: true },
  status: 'todo',
  tags: '',
}

export function relationId(value) {
  return typeof value === 'object' ? value?._id || '' : value || ''
}

function taskToForm(task) {
  if (!task) return blankTask
  return {
    title: task.title || '',
    description: task.description || '',
    goalId: relationId(task.goalId),
    roadmapId: relationId(task.roadmapId),
    priority: task.priority || 'Medium',
    category: task.category || 'General',
    dueDate: task.dueDate?.slice(0, 16) || '',
    startDate: task.startDate?.slice(0, 16) || '',
    estimatedMinutes: task.estimatedMinutes || 0,
    reminderAt: task.reminderAt?.slice(0, 16) || '',
    reminder: task.reminder || blankTask.reminder,
    status: task.completed ? 'completed' : task.status || 'todo',
    tags: (task.tags || []).join(', '),
  }
}

export function TaskFormDialog({ open, task, goals, roadmaps, onClose, onSave }) {
  const [form, setForm] = useState(() => taskToForm(task))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const setField = (field, value) => setForm((current) => ({ ...current, [field]: value }))
  const availableRoadmaps = roadmaps.filter((roadmap) => !form.goalId || relationId(roadmap.goalId) === form.goalId)
  const submit = async (event) => {
    event.preventDefault()
    if (!form.title.trim()) return
    setSaving(true)
    setError('')
    try {
      await onSave({
        ...form,
        goalId: form.goalId || null,
        roadmapId: form.roadmapId || null,
        dueDate: form.dueDate || null,
        startDate: form.startDate || null,
        reminderAt: form.reminderAt || null,
        estimatedMinutes: Number(form.estimatedMinutes) || 0,
        tags: form.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
      })
      onClose()
    } catch (requestError) {
      setError(requestError.userMessage || requestError.response?.data?.message || 'Unable to save task.')
    } finally {
      setSaving(false)
    }
  }
  return (
    <Dialog open={open} title={task ? 'Edit task' : 'Create task'} description="Plan a focused learning activity." onClose={onClose}>
      <form className="task-form" onSubmit={submit}>
        <FormField label="Task title" required>
          <input className="input" maxLength="200" value={form.title} onChange={(event) => setField('title', event.target.value)} autoFocus />
        </FormField>
        <FormField label="Description">
          <textarea className="textarea" rows="4" maxLength="10000" value={form.description} onChange={(event) => setField('description', event.target.value)} />
        </FormField>
        <div className="task-form__grid">
          <FormField label="Linked goal">
            <select className="select" value={form.goalId} onChange={(event) => { setField('goalId', event.target.value); setField('roadmapId', '') }}>
              <option value="">No goal</option>
              {goals.map((goal) => <option value={goal._id} key={goal._id}>{goal.title}</option>)}
            </select>
          </FormField>
          <FormField label="Linked roadmap">
            <select className="select" value={form.roadmapId} onChange={(event) => setField('roadmapId', event.target.value)}>
              <option value="">No roadmap</option>
              {availableRoadmaps.map((roadmap) => <option value={roadmap._id} key={roadmap._id}>{roadmap.goalId?.title || 'Learning roadmap'}</option>)}
            </select>
          </FormField>
          <FormField label="Priority">
            <select className="select" value={form.priority} onChange={(event) => setField('priority', event.target.value)}>
              {TASK_PRIORITIES.map((priority) => <option key={priority}>{priority}</option>)}
            </select>
          </FormField>
          <FormField label="Status">
            <select className="select" value={form.status} onChange={(event) => setField('status', event.target.value)}>
              {TASK_STATUSES.map((status) => <option value={status} key={status}>{STATUS_LABEL[status]}</option>)}
            </select>
          </FormField>
          <FormField label="Category">
            <input className="input" maxLength="100" value={form.category} onChange={(event) => setField('category', event.target.value)} />
          </FormField>
          <FormField label="Estimated duration">
            <div className="task-duration-input"><input className="input" type="number" min="0" max="1440" value={form.estimatedMinutes} onChange={(event) => setField('estimatedMinutes', event.target.value)} /><span>minutes</span></div>
          </FormField>
          <FormField label="Start date">
            <input className="input" type="datetime-local" value={form.startDate} onChange={(event) => setField('startDate', event.target.value)} />
          </FormField>
          <FormField label="Due date">
            <input className="input" type="datetime-local" value={form.dueDate} onChange={(event) => setField('dueDate', event.target.value)} />
          </FormField>
          <FormField label="Reminder">
            <input className="input" type="datetime-local" value={form.reminderAt} onChange={(event) => {
              setField('reminderAt', event.target.value)
              setField('reminder', { ...form.reminder, enabled: Boolean(event.target.value) })
            }} />
          </FormField>
          <FormField label="Tags" hint="Comma separated">
            <input className="input" value={form.tags} onChange={(event) => setField('tags', event.target.value)} placeholder="javascript, exam, revision" />
          </FormField>
        </div>
        <fieldset className="task-reminder-options">
          <legend>Reminder architecture</legend>
          {[
            ['daily', 'Daily reminder'],
            ['dueSoon', 'Due soon'],
            ['overdue', 'Overdue'],
            ['weeklySummary', 'Weekly summary'],
          ].map(([key, label]) => (
            <label key={key}><input type="checkbox" checked={Boolean(form.reminder[key])} onChange={(event) => setField('reminder', { ...form.reminder, [key]: event.target.checked })} />{label}</label>
          ))}
        </fieldset>
        {error && <div className="alert alert-error" role="alert">{error}</div>}
        <footer className="task-form__actions">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={saving}>{saving ? 'Saving…' : task ? 'Update task' : 'Create task'}</Button>
        </footer>
      </form>
    </Dialog>
  )
}

export const TaskStats = memo(function TaskStats({ analytics, userStreak, loading }) {
  const stats = [
    ['Total Tasks', analytics.total, '▤', 'purple'],
    ["Today's Tasks", analytics.today, '☀', 'blue'],
    ['Upcoming', analytics.upcoming, '↗', 'purple'],
    ['Completed', analytics.completed, '✓', 'green'],
    ['Overdue', analytics.overdue, '!', 'red'],
    ['Weekly Productivity', analytics.weeklyCompleted, '▥', 'blue'],
    ['Current Streak', `${analytics.streak || userStreak || 0} days`, '🔥', 'amber'],
  ]
  return (
    <section className="task-stats" aria-label="Task productivity summary">
      {stats.map(([label, value, icon, tone]) => (
        <article className={`task-stat task-stat--${tone}`} key={label}>
          <span aria-hidden="true">{icon}</span>
          <div><strong>{loading ? '—' : value || 0}</strong><small>{label}</small></div>
        </article>
      ))}
    </section>
  )
})

export function TaskToolbar({ view, onView, query, onQuery, filter, onFilter, counts }) {
  return (
    <section className="task-toolbar" aria-label="Task views and filters">
      <div className="task-view-tabs" role="tablist" aria-label="Task view">
        {TASK_VIEWS.map(([id, label]) => <button type="button" role="tab" aria-selected={view === id} className={view === id ? 'is-active' : ''} onClick={() => onView(id)} key={id}>{label}</button>)}
      </div>
      <label className="task-search"><span aria-hidden="true">⌕</span><input type="search" value={query} onChange={(event) => onQuery(event.target.value)} placeholder="Search title, tag or category" aria-label="Search tasks" /></label>
      <select className="select" value={filter.when} onChange={(event) => onFilter({ ...filter, when: event.target.value })} aria-label="Filter by date">
        <option value="all">Any date</option><option value="today">Today</option><option value="tomorrow">Tomorrow</option><option value="week">This week</option>
      </select>
      <select className="select" value={filter.status} onChange={(event) => onFilter({ ...filter, status: event.target.value })} aria-label="Filter by status">
        <option value="all">All statuses ({counts.all || 0})</option>
        <option value="pending">Pending ({counts.pending || 0})</option>
        {TASK_STATUSES.map((status) => <option value={status} key={status}>{STATUS_LABEL[status]} ({counts[status] || 0})</option>)}
      </select>
      <select className="select" value={filter.priority} onChange={(event) => onFilter({ ...filter, priority: event.target.value })} aria-label="Filter by priority">
        <option value="all">All priorities</option>{TASK_PRIORITIES.map((priority) => <option key={priority}>{priority}</option>)}
      </select>
    </section>
  )
}

export const TaskCard = memo(function TaskCard({ task, goal, onOpen, onComplete, onStatus, onDuplicate, onEdit, onDelete }) {
  const status = task.completed ? 'completed' : task.status || 'todo'
  const overdue = !task.completed && task.dueDate && new Date(task.dueDate) < new Date()
  const checklistDone = (task.checklist || []).filter((item) => item.done).length
  const subtasksDone = (task.subtasks || []).filter((item) => item.completed).length
  return (
    <article className={`task-card task-card--${status}`}>
      <button className={`task-check ${task.completed ? 'is-done' : ''}`} type="button" onClick={onComplete} aria-label={`${task.completed ? 'Reopen' : 'Complete'} ${task.title}`}>{task.completed ? '✓' : ''}</button>
      <div className="task-card__content">
        <header>
          <button type="button" onClick={onOpen}><h3>{task.title}</h3></button>
          <span className={`task-priority task-priority--${task.priority?.toLowerCase()}`}>{task.priority || 'Medium'}</span>
        </header>
        {task.description && <p>{task.description}</p>}
        <div className="task-card__meta">
          <span className={`task-status task-status--${overdue ? 'overdue' : status}`}>{overdue ? 'overdue' : STATUS_LABEL[status]}</span>
          {task.dueDate && <span>Due {new Date(task.dueDate).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>}
          {task.estimatedMinutes > 0 && <span>{task.estimatedMinutes} min</span>}
          {goal && <Link to={`/student/goals?goalId=${goal._id}`}>🎯 {goal.title}</Link>}
        </div>
        {(task.tags || []).length > 0 && <div className="task-tags">{task.tags.map((tag) => <span key={tag}>#{tag}</span>)}</div>}
        {((task.checklist || []).length > 0 || (task.subtasks || []).length > 0) && (
          <small className="task-card__items">{checklistDone}/{(task.checklist || []).length} checklist · {subtasksDone}/{(task.subtasks || []).length} subtasks</small>
        )}
      </div>
      <div className="task-card__actions">
        <Button variant="ghost" className="btn-icon" onClick={onEdit} aria-label={`Edit ${task.title}`}>✎</Button>
        <Button variant="ghost" className="btn-icon" onClick={onDuplicate} aria-label={`Duplicate ${task.title}`}>⧉</Button>
        <select value={status} onChange={(event) => onStatus(event.target.value)} aria-label={`Move ${task.title}`}>
          {TASK_STATUSES.map((item) => <option value={item} key={item}>{STATUS_LABEL[item]}</option>)}
        </select>
        <Button variant="ghost" className="btn-icon" onClick={onDelete} aria-label={`Delete ${task.title}`}>⌫</Button>
      </div>
    </article>
  )
})

export function TaskListView(props) {
  const { tasks, loading } = props
  if (loading) return <LoadingState label="Loading tasks…" rows={6} />
  if (!tasks.length) return <EmptyState title="No tasks found" message="Create a task or adjust your filters." />
  return <div className="task-list">{tasks.map((task) => <TaskCard {...props} task={task} goal={props.goalMap.get(relationId(task.goalId))} key={task._id} onOpen={() => props.onOpen(task)} onComplete={() => props.onComplete(task)} onStatus={(status) => props.onStatus(task, status)} onDuplicate={() => props.onDuplicate(task)} onEdit={() => props.onEdit(task)} onDelete={() => props.onDelete(task)} />)}</div>
}

export function TaskKanbanView(props) {
  const columns = TASK_STATUSES
  return (
    <div className="task-kanban" aria-label="Kanban task board">
      {columns.map((status) => {
        const items = props.tasks.filter((task) => (task.completed ? 'completed' : task.status || 'todo') === status)
        return (
          <section key={status}>
            <header><h2>{STATUS_LABEL[status]}</h2><span>{items.length}</span></header>
            <div>
              {items.map((task) => (
                <article className="task-kanban-card" key={task._id}>
                  <button type="button" onClick={() => props.onOpen(task)}><strong>{task.title}</strong></button>
                  <small>{task.category} · {task.priority}</small>
                  {task.dueDate && <p>{new Date(task.dueDate).toLocaleDateString()}</p>}
                  <select value={status} onChange={(event) => props.onStatus(task, event.target.value)} aria-label={`Move ${task.title} to column`}>
                    {columns.map((column) => <option value={column} key={column}>{STATUS_LABEL[column]}</option>)}
                  </select>
                </article>
              ))}
              {!items.length && <p className="task-kanban__empty">No tasks</p>}
            </div>
          </section>
        )
      })}
    </div>
  )
}

function localDateKey(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function TaskCalendarView({ tasks, onOpen }) {
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  const days = useMemo(() => {
    const first = month.getDay()
    const count = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
    return [
      ...Array.from({ length: first }, () => null),
      ...Array.from({ length: count }, (_, index) => {
        const date = new Date(month.getFullYear(), month.getMonth(), index + 1)
        const key = localDateKey(date)
        return { number: index + 1, key, tasks: tasks.filter((task) => localDateKey(task.dueDate) === key) }
      }),
    ]
  }, [month, tasks])
  return (
    <section className="task-calendar">
      <header>
        <Button variant="ghost" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))} aria-label="Previous month">←</Button>
        <h2>{month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</h2>
        <Button variant="ghost" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))} aria-label="Next month">→</Button>
      </header>
      <div className="task-calendar__week" aria-hidden="true">{['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((day) => <span key={day}>{day}</span>)}</div>
      <div className="task-calendar__grid" role="grid" aria-label="Task due date calendar">
        {days.map((day, index) => day ? (
          <div role="gridcell" key={day.key}>
            <strong>{day.number}</strong>
            {day.tasks.slice(0, 3).map((task) => <button type="button" className={`is-${task.completed ? 'completed' : task.priority?.toLowerCase()}`} onClick={() => onOpen(task)} key={task._id}>{task.title}</button>)}
            {day.tasks.length > 3 && <small>+{day.tasks.length - 3} more</small>}
          </div>
        ) : <span key={`blank-${index}`} />)}
      </div>
    </section>
  )
}

export function TaskTimelineView({ tasks, onOpen }) {
  const scheduled = tasks.filter((task) => task.startDate || task.dueDate).sort((a, b) => new Date(a.startDate || a.dueDate) - new Date(b.startDate || b.dueDate))
  if (!scheduled.length) return <EmptyState title="No scheduled tasks" message="Add start or due dates to build your timeline." />
  return (
    <ol className="task-timeline">
      {scheduled.map((task) => (
        <li key={task._id}>
          <span />
          <time>{new Date(task.startDate || task.dueDate).toLocaleDateString()}</time>
          <button type="button" onClick={() => onOpen(task)}><strong>{task.title}</strong><small>{task.startDate && task.dueDate ? `${new Date(task.startDate).toLocaleString()} → ${new Date(task.dueDate).toLocaleString()}` : task.dueDate ? `Due ${new Date(task.dueDate).toLocaleString()}` : `Starts ${new Date(task.startDate).toLocaleString()}`}</small></button>
        </li>
      ))}
    </ol>
  )
}

export function TaskAnalyticsView({ analytics }) {
  const daily = analytics.daily || []
  const maxCompleted = Math.max(...daily.map((item) => item.completed || 0), 1)
  const maxStudy = Math.max(...daily.map((item) => item.studyMinutes || 0), 1)
  return (
    <div className="task-analytics">
      <article>
        <header><h2>Weekly productivity</h2><strong>{analytics.weeklyCompleted || 0} completed</strong></header>
        <div className="task-chart">
          {daily.map((item) => <div key={item.date}><span style={{ height: `${Math.max(5, item.completed / maxCompleted * 100)}%` }} /><small>{new Date(`${item.date}T00:00:00`).toLocaleDateString(undefined, { weekday: 'narrow' })}</small></div>)}
        </div>
      </article>
      <article>
        <header><h2>Study time</h2><strong>{analytics.studyHours || 0} hours</strong></header>
        <div className="task-chart task-chart--study">
          {daily.map((item) => <div key={item.date}><span style={{ height: `${Math.max(5, item.studyMinutes / maxStudy * 100)}%` }} /><small>{new Date(`${item.date}T00:00:00`).toLocaleDateString(undefined, { weekday: 'narrow' })}</small></div>)}
        </div>
      </article>
      <article className="task-analytics__completion">
        <div style={{ '--task-rate': `${analytics.completionRate || 0}%` }}><strong>{analytics.completionRate || 0}%</strong><span>completion</span></div>
        <p>{analytics.completed || 0} completed · {analytics.overdue || 0} overdue</p>
      </article>
      <article>
        <header><h2>Completion trends</h2><strong>{analytics.monthlyCompleted || 0} this month</strong></header>
        {Object.entries(analytics.byStatus || {}).map(([status, count]) => (
          <div className="task-trend" key={status}><span>{STATUS_LABEL[status]}</span><div><i style={{ width: `${analytics.total ? count / analytics.total * 100 : 0}%` }} /></div><strong>{count}</strong></div>
        ))}
      </article>
    </div>
  )
}

export function TaskDetailDialog({ task, open, goals, onClose, onUpdate, onStartFocus, onStopFocus, focusActive }) {
  const [tab, setTab] = useState('overview')
  const [subtask, setSubtask] = useState('')
  const [checkItem, setCheckItem] = useState('')
  const [note, setNote] = useState('')
  const [attachment, setAttachment] = useState({ name: '', url: '' })
  if (!task) return null
  const goal = goals.find((item) => item._id === relationId(task.goalId))
  const tabs = ['overview', 'subtasks', 'checklist', 'notes', 'attachments']
  const patchArray = (field, value) => onUpdate({ [field]: value })
  return (
    <Dialog open={open} title={task.title} description={`${task.category || 'General'} · ${STATUS_LABEL[task.completed ? 'completed' : task.status || 'todo']}`} onClose={onClose}>
      <div className="task-detail">
        <div className="task-detail__tabs" role="tablist" aria-label="Task details">
          {tabs.map((item) => <button type="button" role="tab" aria-selected={tab === item} className={tab === item ? 'is-active' : ''} onClick={() => setTab(item)} key={item}>{item}</button>)}
        </div>
        {tab === 'overview' && (
          <section className="task-detail__overview">
            <p>{task.description || 'No description added.'}</p>
            <div className="task-progress-control">
              <label htmlFor="task-progress">Progress</label><strong>{task.progress || 0}%</strong>
              <input id="task-progress" type="range" min="0" max="100" value={task.progress || 0} onChange={(event) => onUpdate({ progress: Number(event.target.value) })} />
            </div>
            <dl>
              <div><dt>Priority</dt><dd>{task.priority}</dd></div>
              <div><dt>Due</dt><dd>{task.dueDate ? new Date(task.dueDate).toLocaleString() : 'Not scheduled'}</dd></div>
              <div><dt>Estimate</dt><dd>{task.estimatedMinutes || 0} min</dd></div>
              <div><dt>Focused</dt><dd>{task.actualMinutes || 0} min</dd></div>
            </dl>
            <div className="task-focus">
              <div><strong>Focus timer</strong><small>{focusActive ? 'Session in progress' : 'Track focused study time for this task.'}</small></div>
              {focusActive ? <Button variant="danger" onClick={onStopFocus}>Stop focus</Button> : <Button onClick={onStartFocus}>Start focus</Button>}
            </div>
            {goal && <Link to={`/student/goals?goalId=${goal._id}`}>Open linked goal: {goal.title}</Link>}
            {task.roadmapId && goal && <Link to={`/student/roadmap?goalId=${goal._id}`}>Open linked roadmap</Link>}
          </section>
        )}
        {tab === 'subtasks' && (
          <TaskItems
            items={task.subtasks || []}
            value={subtask}
            onValue={setSubtask}
            placeholder="New subtask"
            getText={(item) => item.title}
            getDone={(item) => item.completed}
            onAdd={() => { if (subtask.trim()) { patchArray('subtasks', [...(task.subtasks || []), { title: subtask, completed: false }]); setSubtask('') } }}
            onToggle={(index, done) => patchArray('subtasks', task.subtasks.map((item, itemIndex) => itemIndex === index ? { ...item, completed: done } : item))}
            onDelete={(index) => patchArray('subtasks', task.subtasks.filter((_, itemIndex) => itemIndex !== index))}
          />
        )}
        {tab === 'checklist' && (
          <TaskItems
            items={task.checklist || []}
            value={checkItem}
            onValue={setCheckItem}
            placeholder="New checklist item"
            getText={(item) => item.text}
            getDone={(item) => item.done}
            onAdd={() => { if (checkItem.trim()) { patchArray('checklist', [...(task.checklist || []), { text: checkItem, done: false }]); setCheckItem('') } }}
            onToggle={(index, done) => patchArray('checklist', task.checklist.map((item, itemIndex) => itemIndex === index ? { ...item, done } : item))}
            onDelete={(index) => patchArray('checklist', task.checklist.filter((_, itemIndex) => itemIndex !== index))}
          />
        )}
        {tab === 'notes' && (
          <section className="task-notes">
            <form onSubmit={(event) => { event.preventDefault(); if (note.trim()) { patchArray('notes', [...(task.notes || []), { text: note }]); setNote('') } }}>
              <textarea className="textarea" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Add a task note" />
              <Button type="submit">Add note</Button>
            </form>
            {(task.notes || []).slice().reverse().map((item, index) => <article key={item._id || index}><p>{item.text}</p><small>{item.createdAt ? new Date(item.createdAt).toLocaleString() : 'Just now'}</small></article>)}
          </section>
        )}
        {tab === 'attachments' && (
          <section className="task-attachments">
            <p>Attachment metadata is ready for a future managed upload service. Add secure document links now.</p>
            <form onSubmit={(event) => { event.preventDefault(); if (attachment.name && attachment.url) { patchArray('attachments', [...(task.attachments || []), attachment]); setAttachment({ name: '', url: '' }) } }}>
              <input className="input" value={attachment.name} onChange={(event) => setAttachment((current) => ({ ...current, name: event.target.value }))} placeholder="File name" />
              <input className="input" type="url" value={attachment.url} onChange={(event) => setAttachment((current) => ({ ...current, url: event.target.value }))} placeholder="https://…" />
              <Button type="submit">Attach link</Button>
            </form>
            {(task.attachments || []).map((item, index) => <article key={item._id || index}><a href={item.url} target="_blank" rel="noreferrer">{item.name}</a><Button variant="ghost" onClick={() => patchArray('attachments', task.attachments.filter((_, itemIndex) => itemIndex !== index))}>Remove</Button></article>)}
          </section>
        )}
      </div>
    </Dialog>
  )
}

function TaskItems({ items, value, onValue, placeholder, getText, getDone, onAdd, onToggle, onDelete }) {
  return (
    <section className="task-items">
      <form onSubmit={(event) => { event.preventDefault(); onAdd() }}>
        <input className="input" value={value} onChange={(event) => onValue(event.target.value)} placeholder={placeholder} />
        <Button type="submit">Add</Button>
      </form>
      {items.map((item, index) => (
        <article key={item._id || index}>
          <label><input type="checkbox" checked={getDone(item)} onChange={(event) => onToggle(index, event.target.checked)} /><span>{getText(item)}</span></label>
          <Button variant="ghost" className="btn-icon" onClick={() => onDelete(index)} aria-label={`Delete ${getText(item)}`}>×</Button>
        </article>
      ))}
      {!items.length && <EmptyState title="Nothing added yet" message={`Add the first ${placeholder.toLowerCase()}.`} />}
    </section>
  )
}
