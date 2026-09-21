import { memo, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button, Dialog, EmptyState, FormField, LoadingState } from '@shared/components/ui'
import goalIntelligenceService from '@shared/services/goalIntelligenceService'
import { GoalResourcePanel } from '../../../digital-library/components/LibraryIntelligence'

export const GOAL_CATEGORIES = [
  'Career', 'Academic', 'Education', 'Skill', 'Technical Skill', 'Soft Skill',
  'Certification', 'Project', 'Research', 'Placement', 'Internship',
  'Entrepreneurship', 'Personal Development', 'Personal', 'Custom',
]
export const GOAL_PRIORITIES = ['Low', 'Medium', 'High', 'Critical']
export const GOAL_DIFFICULTIES = ['Beginner', 'Intermediate', 'Advanced']
export const GOAL_STATUSES = ['all', 'planning', 'active', 'completed', 'paused', 'archived']

const CATEGORY_ICONS = {
  Career: '🚀',
  Academic: '🎓',
  Education: '🎓',
  Skill: '⚡',
  Certification: '🏅',
  Personal: '🌱',
  Health: '♥',
  Finance: '◈',
}

const blankGoal = {
  title: '',
  description: '',
  category: 'Career',
  priority: 'Medium',
  estimatedDuration: '',
  deadline: '',
  weeklyStudyHours: 5,
  difficulty: 'Intermediate',
}

const blankSuggestion = () => ({
  title: '',
  description: '',
  category: 'Career',
  priority: 'Medium',
  difficulty: 'Intermediate',
  estimatedDuration: '',
  skills: [],
  milestones: [],
  roadmapStages: [],
  suggestedTasks: [],
  resources: [],
})

export function SmartGoalBuilder({ open, onClose, onSaved }) {
  const [ambition, setAmbition] = useState('')
  const [category, setCategory] = useState('Career')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [suggestion, setSuggestion] = useState(null)
  const [clarify, setClarify] = useState(null)

  const generate = async () => {
    if (!ambition.trim()) {
      setError('Describe your ambition to get AI suggestions.')
      return
    }
    setLoading(true)
    setError('')
    setClarify(null)
    try {
      const response = await goalIntelligenceService.suggest(ambition.trim(), category)
      setSuggestion(response.data?.suggestion || blankSuggestion())
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.userMessage || 'AI suggestions are unavailable right now.')
    } finally {
      setLoading(false)
    }
  }

  const refine = async () => {
    if (!ambition.trim()) return
    setLoading(true)
    setError('')
    try {
      const response = await goalIntelligenceService.clarify(ambition.trim())
      setClarify(response.data)
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to clarify this goal.')
    } finally {
      setLoading(false)
    }
  }

  const updateSuggestion = (field, value) => setSuggestion((current) => ({ ...current, [field]: value }))
  const removeListItem = (field, index) => setSuggestion((current) => ({
    ...current,
    [field]: (current[field] || []).filter((_, itemIndex) => itemIndex !== index),
  }))

  const save = async () => {
    if (!suggestion?.title?.trim()) {
      setError('Goal title is required before saving.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const response = await goalIntelligenceService.saveFromSuggestion(suggestion)
      await onSaved?.(response.goal)
      onClose()
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to save this goal.')
    } finally {
      setSaving(false)
    }
  }

  const close = () => {
    setAmbition('')
    setSuggestion(null)
    setClarify(null)
    setError('')
    onClose()
  }

  return (
    <Dialog open={open} title="Smart Goal Builder" description="AI suggests a structured goal — you review and save." onClose={close}>
      {!suggestion ? (
        <div className="goal-ai-builder">
          <FormField label="What do you want to achieve?" required>
            <textarea className="textarea" rows="4" value={ambition} onChange={(event) => setAmbition(event.target.value)} placeholder="I want to become an AI engineer." />
          </FormField>
          <FormField label="Preferred category">
            <select className="select" value={category} onChange={(event) => setCategory(event.target.value)}>
              {GOAL_CATEGORIES.map((item) => <option key={item}>{item}</option>)}
            </select>
          </FormField>
          {clarify?.refinedGoals?.length > 0 && (
            <section className="goal-ai-clarify">
              <h3>Refined directions</h3>
              <ul>
                {clarify.refinedGoals.map((item) => (
                  <li key={item.title}>
                    <button type="button" onClick={() => { setAmbition(item.title); setSuggestion(null) }}>
                      <strong>{item.title}</strong>
                      <span>{item.description}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {error && <div className="alert alert-error" role="alert">{error}</div>}
          <footer className="goal-wizard__actions">
            <Button variant="ghost" onClick={close}>Cancel</Button>
            <Button variant="secondary" onClick={refine} disabled={loading || !ambition.trim()}>Clarify goal</Button>
            <Button onClick={generate} disabled={loading}>{loading ? 'Generating…' : 'Get AI suggestions'}</Button>
          </footer>
        </div>
      ) : (
        <div className="goal-ai-preview">
          <FormField label="Goal title">
            <input className="input" value={suggestion.title} onChange={(event) => updateSuggestion('title', event.target.value)} />
          </FormField>
          <FormField label="Description">
            <textarea className="textarea" rows="4" value={suggestion.description} onChange={(event) => updateSuggestion('description', event.target.value)} />
          </FormField>
          <div className="goal-form-grid goal-form-grid--two">
            <FormField label="Category">
              <select className="select" value={suggestion.category} onChange={(event) => updateSuggestion('category', event.target.value)}>
                {GOAL_CATEGORIES.map((item) => <option key={item}>{item}</option>)}
              </select>
            </FormField>
            <FormField label="Priority">
              <select className="select" value={suggestion.priority} onChange={(event) => updateSuggestion('priority', event.target.value)}>
                {GOAL_PRIORITIES.map((item) => <option key={item}>{item}</option>)}
              </select>
            </FormField>
          </div>
          {(suggestion.milestones || []).length > 0 && (
            <section>
              <h3>Suggested milestones</h3>
              <ul className="goal-ai-list">
                {suggestion.milestones.map((item, index) => (
                  <li key={`${item.title}-${index}`}>
                    <strong>{item.title}</strong>
                    {item.description && <small>{item.description}</small>}
                    <Button variant="ghost" className="btn-icon" onClick={() => removeListItem('milestones', index)} aria-label={`Remove ${item.title}`}>×</Button>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {(suggestion.roadmapStages || []).length > 0 && (
            <section>
              <h3>Suggested roadmap stages</h3>
              <ol className="goal-ai-list">
                {suggestion.roadmapStages.map((item, index) => (
                  <li key={`${item.title}-${index}`}>
                    <strong>{item.title}</strong>
                    {item.description && <small>{item.description}</small>}
                  </li>
                ))}
              </ol>
            </section>
          )}
          {(suggestion.suggestedTasks || []).length > 0 && (
            <section>
              <h3>Suggested tasks (not saved until you accept after goal creation)</h3>
              <ul className="goal-ai-list">
                {suggestion.suggestedTasks.map((item, index) => (
                  <li key={`${item.title}-${index}`}>
                    <strong>{item.title}</strong>
                    <small>{item.reason}</small>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {(suggestion.resources || []).length > 0 && (
            <section>
              <h3>Resources</h3>
              <ul className="goal-ai-list">
                {suggestion.resources.map((item, index) => (
                  <li key={`${item.title}-${index}`}>
                    <strong>{item.title}</strong>
                    <small>{item.source === 'dream_wave_library' ? 'Available in Dream Wave Library' : item.source || 'Suggested resource'}</small>
                    {item.url && item.source === 'dream_wave_library' && <Link to={item.url}>Open in library</Link>}
                  </li>
                ))}
              </ul>
            </section>
          )}
          {error && <div className="alert alert-error" role="alert">{error}</div>}
          <footer className="goal-wizard__actions">
            <Button variant="ghost" onClick={() => setSuggestion(null)}>Back</Button>
            <Button variant="secondary" onClick={generate} disabled={loading}>Regenerate</Button>
            <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save goal'}</Button>
          </footer>
        </div>
      )}
    </Dialog>
  )
}

function GoalIntelligencePanel({ goal, onRefresh }) {
  const [loading, setLoading] = useState(false)
  const [review, setReview] = useState(null)
  const [nextAction, setNextAction] = useState(null)
  const [taskSuggestions, setTaskSuggestions] = useState([])
  const [selectedTasks, setSelectedTasks] = useState({})
  const [error, setError] = useState('')

  const loadReview = async () => {
    if (!goal?._id) return
    setLoading(true)
    setError('')
    try {
      const [reviewResponse, actionResponse] = await Promise.all([
        goalIntelligenceService.review(goal._id),
        goalIntelligenceService.nextAction(goal._id),
      ])
      setReview(reviewResponse.data)
      setNextAction(actionResponse.data)
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Goal review unavailable.')
    } finally {
      setLoading(false)
    }
  }

  const loadTaskSuggestions = async () => {
    if (!goal?._id) return
    setLoading(true)
    setError('')
    try {
      const response = await goalIntelligenceService.suggestTasks(goal._id)
      setTaskSuggestions(response.data?.tasks || [])
      setSelectedTasks(Object.fromEntries((response.data?.tasks || []).map((item) => [item.title, true])))
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Task suggestions unavailable.')
    } finally {
      setLoading(false)
    }
  }

  const acceptTasks = async () => {
    const tasks = taskSuggestions.filter((item) => selectedTasks[item.title])
    if (!tasks.length) return
    setLoading(true)
    setError('')
    try {
      await goalIntelligenceService.acceptTasks(goal._id, tasks)
      setTaskSuggestions([])
      await onRefresh?.()
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to save selected tasks.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="goal-ai-panel">
      <p>AI guidance uses your real goal, milestone, task and roadmap data. Nothing is saved without your approval.</p>
      <div className="goal-ai-panel__actions">
        <Button variant="secondary" onClick={loadReview} disabled={loading}>Run goal review</Button>
        <Button variant="secondary" onClick={loadTaskSuggestions} disabled={loading}>Suggest tasks</Button>
        <Link className="btn btn-secondary" to={`/student/roadmap?goalId=${goal._id}`}>Open roadmap</Link>
        <Link className="btn btn-secondary" to={`/student/mentor?mode=goal&goalId=${goal._id}`}>Ask AI Mentor</Link>
      </div>
      {loading && <LoadingState label="Loading AI guidance…" rows={3} />}
      {error && <div className="alert alert-error" role="alert">{error}</div>}
      {nextAction && (
        <article className="goal-next-action">
          <h3>Next best action</h3>
          <strong>{nextAction.title}</strong>
          <p>{nextAction.reason}</p>
          {nextAction.url && <Link to={nextAction.url}>Take action</Link>}
        </article>
      )}
      {review && (
        <article className="goal-review-card">
          <h3>Goal review</h3>
          <dl>
            <div><dt>Progress</dt><dd>{review.progress?.percent ?? goal.progress ?? 0}%</dd></div>
            <div><dt>Completed tasks</dt><dd>{review.completedTasks ?? 0}</dd></div>
            <div><dt>Pending tasks</dt><dd>{review.pendingTasks ?? 0}</dd></div>
          </dl>
          {review.adaptationHint && <p className="alert alert-warning">{review.adaptationHint}</p>}
          {(review.blockers || []).map((item) => <p key={item.type} className="alert alert-warning">{item.message}</p>)}
          {(review.pendingMilestones || []).length > 0 && (
            <div>
              <h4>Pending milestones</h4>
              <ul>{review.pendingMilestones.map((item) => <li key={item}>{item}</li>)}</ul>
            </div>
          )}
        </article>
      )}
      {taskSuggestions.length > 0 && (
        <section className="goal-task-suggestions">
          <h3>Suggested tasks</h3>
          {taskSuggestions.map((item) => (
            <label key={item.title}>
              <input type="checkbox" checked={Boolean(selectedTasks[item.title])} onChange={(event) => setSelectedTasks((current) => ({ ...current, [item.title]: event.target.checked }))} />
              <span><strong>{item.title}</strong><small>{item.reason}</small></span>
            </label>
          ))}
          <Button onClick={acceptTasks} disabled={loading}>Accept selected tasks</Button>
        </section>
      )}
      {(goal.aiPlan || []).length > 0 && (
        <section>
          <h3>Stored plan outline</h3>
          <ol>{goal.aiPlan.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}</ol>
        </section>
      )}
    </section>
  )
}

const goalToForm = (goal) => goal ? {
  title: goal.title || '',
  description: goal.description || '',
  category: GOAL_CATEGORIES.includes(goal.category) ? goal.category : goal.category === 'Education' ? 'Academic' : 'Personal',
  priority: goal.priority || 'Medium',
  estimatedDuration: goal.estimatedDuration || '',
  deadline: goal.deadline?.slice(0, 10) || '',
  weeklyStudyHours: goal.weeklyStudyHours || 0,
  difficulty: goal.difficulty || 'Intermediate',
} : blankGoal

export function GoalWizard({ open, goal, onClose, onSave }) {
  const [step, setStep] = useState(0)
  const [form, setForm] = useState(() => goalToForm(goal))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const steps = ['Goal', 'Plan', 'Review']
  const setField = (field, value) => setForm((current) => ({ ...current, [field]: value }))

  const next = () => {
    if (!form.title.trim()) {
      setError('Enter a goal title to continue.')
      return
    }
    setError('')
    setStep((current) => Math.min(2, current + 1))
  }

  const submit = async (event) => {
    event.preventDefault()
    if (step < 2) {
      next()
      return
    }
    setSaving(true)
    setError('')
    try {
      await onSave({ ...form, weeklyStudyHours: Number(form.weeklyStudyHours), deadline: form.deadline || null })
      onClose()
    } catch (requestError) {
      setError(requestError.userMessage || requestError.response?.data?.message || 'Unable to save this goal.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open={open}
      title={goal ? 'Edit learning goal' : 'Create a learning goal'}
      description="Turn an ambition into a measurable learning journey."
      onClose={onClose}
    >
      <form className="goal-wizard" onSubmit={submit}>
        <ol className="goal-wizard__steps" aria-label="Goal creation progress">
          {steps.map((label, index) => (
            <li className={index === step ? 'is-current' : index < step ? 'is-complete' : ''} key={label}>
              <span>{index < step ? '✓' : index + 1}</span>{label}
            </li>
          ))}
        </ol>

        {step === 0 && (
          <div className="goal-form-grid">
            <FormField label="Goal title" required>
              <input className="input" value={form.title} maxLength={160} onChange={(event) => setField('title', event.target.value)} placeholder="Become a full-stack engineer" autoFocus />
            </FormField>
            <FormField label="Goal category" required>
              <select className="select" value={form.category} onChange={(event) => setField('category', event.target.value)}>
                {GOAL_CATEGORIES.map((category) => <option key={category}>{category}</option>)}
              </select>
            </FormField>
            <FormField label="Description" hint={`${form.description.length}/4000`}>
              <textarea className="textarea" rows="5" maxLength={4000} value={form.description} onChange={(event) => setField('description', event.target.value)} placeholder="Describe what success looks like and why this goal matters." />
            </FormField>
          </div>
        )}

        {step === 1 && (
          <div className="goal-form-grid goal-form-grid--two">
            <FormField label="Priority">
              <select className="select" value={form.priority} onChange={(event) => setField('priority', event.target.value)}>
                {GOAL_PRIORITIES.map((priority) => <option key={priority}>{priority}</option>)}
              </select>
            </FormField>
            <FormField label="Difficulty">
              <select className="select" value={form.difficulty} onChange={(event) => setField('difficulty', event.target.value)}>
                {GOAL_DIFFICULTIES.map((difficulty) => <option key={difficulty}>{difficulty}</option>)}
              </select>
            </FormField>
            <FormField label="Estimated duration" hint="For example: 6 months">
              <input className="input" maxLength={80} value={form.estimatedDuration} onChange={(event) => setField('estimatedDuration', event.target.value)} placeholder="6 months" />
            </FormField>
            <FormField label="Expected completion date">
              <input className="input" type="date" value={form.deadline} onChange={(event) => setField('deadline', event.target.value)} />
            </FormField>
            <FormField label="Weekly study hours">
              <input className="input" type="number" min="0" max="168" step="0.5" value={form.weeklyStudyHours} onChange={(event) => setField('weeklyStudyHours', event.target.value)} />
            </FormField>
          </div>
        )}

        {step === 2 && (
          <div className="goal-review">
            <span className="goal-review__icon" aria-hidden="true">{CATEGORY_ICONS[form.category]}</span>
            <div>
              <small>{form.category} goal</small>
              <h3>{form.title}</h3>
              <p>{form.description || 'No description added.'}</p>
            </div>
            <dl>
              <div><dt>Priority</dt><dd>{form.priority}</dd></div>
              <div><dt>Difficulty</dt><dd>{form.difficulty}</dd></div>
              <div><dt>Duration</dt><dd>{form.estimatedDuration || 'Flexible'}</dd></div>
              <div><dt>Weekly study</dt><dd>{form.weeklyStudyHours || 0} hours</dd></div>
              <div><dt>Target date</dt><dd>{form.deadline || 'Open-ended'}</dd></div>
            </dl>
          </div>
        )}

        {error && <div className="alert alert-error" role="alert">{error}</div>}
        <footer className="goal-wizard__actions">
          {step > 0 && <Button variant="secondary" onClick={() => setStep((current) => current - 1)}>Back</Button>}
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={saving}>{saving ? 'Saving…' : step < 2 ? 'Continue' : goal ? 'Update goal' : 'Create goal'}</Button>
        </footer>
      </form>
    </Dialog>
  )
}

export const GoalStats = memo(function GoalStats({ analytics, streak, loading }) {
  const stats = [
    ['Total Goals', analytics.total, '◎', 'purple'],
    ['Active Goals', analytics.active, '▶', 'blue'],
    ['Completed', analytics.completed, '✓', 'green'],
    ['Overdue', analytics.overdue, '!', 'red'],
    ['Weekly Progress', `${analytics.weeklyProgress || 0}%`, '↗', 'purple'],
    ['Monthly Progress', `${analytics.monthlyProgress || 0}%`, '▥', 'blue'],
    ['Completion', `${analytics.completionPercentage || 0}%`, '◉', 'green'],
    ['Learning Streak', `${streak || 0} days`, '🔥', 'amber'],
  ]
  return (
    <section className="goal-stats" aria-label="Goal performance">
      {stats.map(([label, value, icon, tone]) => (
        <article className={`goal-stat goal-stat--${tone}`} key={label}>
          <span aria-hidden="true">{icon}</span>
          <div><strong>{loading ? '—' : value}</strong><small>{label}</small></div>
        </article>
      ))}
    </section>
  )
})

export function GoalAnalytics({ analytics }) {
  const weekly = analytics.weekly || []
  const maxProgress = Math.max(...weekly.map((item) => item.progress || 0), 1)
  const maxStudy = Math.max(...weekly.map((item) => item.studyHours || 0), 1)
  return (
    <section className="goal-analytics" aria-label="Goal visual analytics">
      <article>
        <header><h2>Weekly progress</h2><strong>{analytics.weeklyProgress || 0}%</strong></header>
        <div className="goal-bars">
          {weekly.map((item) => (
            <div key={item.date}>
              <span style={{ height: `${Math.max(4, (item.progress || 0) / maxProgress * 100)}%` }} />
              <small>{new Date(`${item.date}T00:00:00`).toLocaleDateString(undefined, { weekday: 'narrow' })}</small>
            </div>
          ))}
        </div>
      </article>
      <article>
        <header><h2>Study time</h2><strong>{analytics.studyHours || 0}h</strong></header>
        <div className="goal-bars goal-bars--study">
          {weekly.map((item) => (
            <div key={item.date}>
              <span style={{ height: `${Math.max(4, (item.studyHours || 0) / maxStudy * 100)}%` }} />
              <small>{new Date(`${item.date}T00:00:00`).toLocaleDateString(undefined, { weekday: 'narrow' })}</small>
            </div>
          ))}
        </div>
      </article>
      <article className="goal-completion-ring">
        <div style={{ '--goal-completion': `${analytics.completionPercentage || 0}%` }}>
          <strong>{analytics.completionPercentage || 0}%</strong>
          <span>complete</span>
        </div>
        <p>{analytics.completed || 0} of {analytics.total || 0} goals completed</p>
      </article>
      <article className="goal-milestone-summary">
        <header><h2>Monthly progress</h2><strong>{analytics.monthlyProgress || 0}%</strong></header>
        <div className="goal-linear-progress"><span style={{ width: `${analytics.monthlyProgress || 0}%` }} /></div>
        <p>Progress check-ins recorded during the current month.</p>
      </article>
    </section>
  )
}

export function GoalFilters({ query, onQuery, status, onStatus, category, onCategory, priority, onPriority, counts }) {
  return (
    <section className="goal-filters" aria-label="Search and filter goals">
      <label className="goal-search">
        <span aria-hidden="true">⌕</span>
        <span className="sr-only">Search goals</span>
        <input type="search" value={query} onChange={(event) => onQuery(event.target.value)} placeholder="Search goal name or category" />
      </label>
      <div className="goal-status-tabs" role="tablist" aria-label="Goal status">
        {GOAL_STATUSES.map((item) => (
          <button type="button" role="tab" aria-selected={status === item} className={status === item ? 'is-active' : ''} onClick={() => onStatus(item)} key={item}>
            {item} <span>{counts[item] || 0}</span>
          </button>
        ))}
      </div>
      <select className="select" aria-label="Filter by category" value={category} onChange={(event) => onCategory(event.target.value)}>
        <option value="all">All categories</option>
        {GOAL_CATEGORIES.map((item) => <option key={item}>{item}</option>)}
      </select>
      <select className="select" aria-label="Filter by priority" value={priority} onChange={(event) => onPriority(event.target.value)}>
        <option value="all">All priorities</option>
        {GOAL_PRIORITIES.map((item) => <option key={item}>{item}</option>)}
      </select>
    </section>
  )
}

export const GoalCard = memo(function GoalCard({ goal, onOpen, onEdit, onStatus, onDelete }) {
  const status = goal.completed ? 'completed' : goal.status || 'active'
  const overdue = !goal.completed && goal.deadline && new Date(goal.deadline) < new Date()
  const milestones = goal.milestones || []
  const milestoneDone = milestones.filter((item) => item.status === 'completed' || item.progress >= 100).length
  return (
    <article className={`goal-card goal-card--${status}`}>
      <header>
        <span className="goal-card__category" aria-hidden="true">{CATEGORY_ICONS[goal.category] || '◎'}</span>
        <div>
          <small>{goal.category} · {goal.priority || 'Medium'} priority</small>
          <button type="button" onClick={onOpen}><h2>{goal.title}</h2></button>
        </div>
        <span className={`goal-status goal-status--${overdue ? 'overdue' : status}`}>{overdue ? 'overdue' : status}</span>
      </header>
      <p>{goal.description || 'No description added.'}</p>
      <div className="goal-card__progress">
        <div><span>Progress</span><strong>{goal.progress || 0}%</strong></div>
        <div className="goal-linear-progress"><span style={{ width: `${goal.progress || 0}%` }} /></div>
      </div>
      <dl>
        <div><dt>Milestones</dt><dd>{milestoneDone}/{milestones.length}</dd></div>
        <div><dt>Weekly</dt><dd>{goal.weeklyStudyHours || 0}h</dd></div>
        <div><dt>Difficulty</dt><dd>{goal.difficulty || '—'}</dd></div>
        <div><dt>Due</dt><dd>{goal.deadline ? new Date(goal.deadline).toLocaleDateString() : 'Open'}</dd></div>
      </dl>
      <footer>
        <Button variant="secondary" onClick={onOpen}>Open details</Button>
        <Link className="btn btn-primary" to={`/student/roadmap?goalId=${goal._id}`}>Roadmap</Link>
        <div className="goal-card__menu">
          <Button variant="ghost" className="btn-icon" onClick={onEdit} aria-label={`Edit ${goal.title}`}>✎</Button>
          <select value={status} onChange={(event) => onStatus(event.target.value)} aria-label={`Change status for ${goal.title}`}>
            {GOAL_STATUSES.slice(1).map((item) => <option value={item} key={item}>{item}</option>)}
          </select>
          <Button variant="ghost" className="btn-icon" onClick={onDelete} aria-label={`Delete ${goal.title}`}>⌫</Button>
        </div>
      </footer>
    </article>
  )
})

export function GoalDetailDialog({
  goal,
  open,
  loading,
  onClose,
  onAddMilestone,
  onUpdateMilestone,
  onDeleteMilestone,
  onAddProgress,
  onUpdateResources,
  onAddNote,
  onRefresh,
}) {
  const [tab, setTab] = useState('overview')
  const [milestoneForm, setMilestoneForm] = useState({ title: '', targetDate: '', description: '', dependencyId: '' })
  const [progressForm, setProgressForm] = useState({ progress: goal?.progress || 0, studyHours: 0, note: '' })
  const [note, setNote] = useState('')
  const [resource, setResource] = useState({ kind: 'courses', title: '', url: '' })
  const tabs = ['overview', 'timeline', 'progress', 'milestones', 'resources', 'notes', 'ai suggestions']

  const timeline = useMemo(() => [
    { id: 'created', title: 'Goal created', date: goal?.createdAt },
    ...(goal?.progressHistory || []).map((item) => ({ id: item._id, title: `${item.progress}% progress${item.note ? ` · ${item.note}` : ''}`, date: item.date })),
    ...(goal?.milestones || []).filter((item) => item.completedAt).map((item) => ({ id: item._id, title: `Milestone completed · ${item.title}`, date: item.completedAt })),
  ].filter((item) => item.date).sort((a, b) => new Date(b.date) - new Date(a.date)), [goal])

  if (!goal && !loading) return null
  return (
    <Dialog open={open} title={goal?.title || 'Goal details'} description={goal ? `${goal.category} · ${goal.status || 'active'}` : ''} onClose={onClose}>
      {loading ? <LoadingState label="Loading goal details…" rows={5} /> : (
        <div className="goal-detail">
          <div className="goal-detail__tabs" role="tablist" aria-label="Goal details">
            {tabs.map((item) => <button type="button" role="tab" aria-selected={tab === item} className={tab === item ? 'is-active' : ''} onClick={() => setTab(item)} key={item}>{item}</button>)}
          </div>

          {tab === 'overview' && (
            <section className="goal-detail__overview">
              <p>{goal.description || 'No description added.'}</p>
              <dl>
                <div><dt>Status</dt><dd>{goal.status || 'active'}</dd></div>
                <div><dt>Priority</dt><dd>{goal.priority || 'Medium'}</dd></div>
                <div><dt>Difficulty</dt><dd>{goal.difficulty || 'Intermediate'}</dd></div>
                <div><dt>Duration</dt><dd>{goal.estimatedDuration || 'Flexible'}</dd></div>
                <div><dt>Weekly study</dt><dd>{goal.weeklyStudyHours || 0} hours</dd></div>
                <div><dt>Expected completion</dt><dd>{goal.deadline ? new Date(goal.deadline).toLocaleDateString() : 'Open-ended'}</dd></div>
              </dl>
            </section>
          )}

          {tab === 'timeline' && (
            <ol className="goal-timeline">
              {timeline.map((item) => <li key={item.id}><span /><div><strong>{item.title}</strong><small>{new Date(item.date).toLocaleString()}</small></div></li>)}
              {!timeline.length && <EmptyState title="No timeline activity" message="Progress updates and milestones will appear here." />}
            </ol>
          )}

          {tab === 'progress' && (
            <form className="goal-detail-form" onSubmit={(event) => { event.preventDefault(); onAddProgress(progressForm) }}>
              <FormField label="Completion percentage">
                <input type="range" min="0" max="100" value={progressForm.progress} onChange={(event) => setProgressForm((current) => ({ ...current, progress: event.target.value }))} />
              </FormField>
              <strong className="goal-progress-value">{progressForm.progress}%</strong>
              <FormField label="Study hours today">
                <input className="input" type="number" min="0" max="24" step="0.25" value={progressForm.studyHours} onChange={(event) => setProgressForm((current) => ({ ...current, studyHours: event.target.value }))} />
              </FormField>
              <FormField label="Progress note">
                <textarea className="textarea" maxLength="500" value={progressForm.note} onChange={(event) => setProgressForm((current) => ({ ...current, note: event.target.value }))} />
              </FormField>
              <Button type="submit">Record progress</Button>
            </form>
          )}

          {tab === 'milestones' && (
            <section className="goal-milestones">
              <form className="goal-detail-form goal-detail-form--inline" onSubmit={(event) => {
                event.preventDefault()
                if (!milestoneForm.title.trim()) return
                onAddMilestone({
                  title: milestoneForm.title,
                  targetDate: milestoneForm.targetDate,
                  description: milestoneForm.description,
                  dependencies: milestoneForm.dependencyId ? [milestoneForm.dependencyId] : [],
                })
                setMilestoneForm({ title: '', targetDate: '', description: '', dependencyId: '' })
              }}>
                <input className="input" value={milestoneForm.title} onChange={(event) => setMilestoneForm((current) => ({ ...current, title: event.target.value }))} placeholder="New milestone" aria-label="Milestone title" />
                <input className="input" type="date" value={milestoneForm.targetDate} onChange={(event) => setMilestoneForm((current) => ({ ...current, targetDate: event.target.value }))} aria-label="Milestone target date" />
                <select className="select" value={milestoneForm.dependencyId} onChange={(event) => setMilestoneForm((current) => ({ ...current, dependencyId: event.target.value }))} aria-label="Milestone dependency">
                  <option value="">No dependency</option>
                  {(goal.milestones || []).map((item) => <option value={item._id} key={item._id}>{item.title}</option>)}
                </select>
                <Button type="submit">Add</Button>
              </form>
              {(goal.milestones || []).map((milestone) => (
                <article key={milestone._id}>
                  <label>
                    <input type="checkbox" checked={milestone.status === 'completed'} onChange={(event) => onUpdateMilestone(milestone._id, { status: event.target.checked ? 'completed' : 'in-progress', progress: event.target.checked ? 100 : Math.min(milestone.progress || 0, 99) })} />
                  <span><strong>{milestone.title}</strong><small>{milestone.targetDate ? `Due ${new Date(milestone.targetDate).toLocaleDateString()}` : 'No target date'} · {milestone.status}{milestone.dependencies?.length ? ` · ${milestone.dependencies.length} dependency` : ''}</small></span>
                  </label>
                  <input type="range" min="0" max="100" value={milestone.progress || 0} aria-label={`${milestone.title} completion`} onChange={(event) => onUpdateMilestone(milestone._id, { progress: Number(event.target.value) })} />
                  <strong>{milestone.progress || 0}%</strong>
                  <Button variant="ghost" className="btn-icon" onClick={() => onDeleteMilestone(milestone._id)} aria-label={`Delete ${milestone.title}`}>×</Button>
                </article>
              ))}
              {!(goal.milestones || []).length && <EmptyState title="No milestones yet" message="Break this goal into measurable checkpoints." />}
            </section>
          )}

          {tab === 'resources' && (
            <section className="goal-resources">
              <h3>Recommended from Dream Wave Library</h3>
              <GoalResourcePanel goalId={goal._id} />
              <form className="goal-detail-form goal-detail-form--inline" onSubmit={(event) => {
                event.preventDefault()
                if (!resource.title.trim()) return
                const resources = goal.resources || { books: [], courses: [], projects: [] }
                onUpdateResources({ ...resources, [resource.kind]: [...(resources[resource.kind] || []), resource.kind === 'projects' ? { title: resource.title, description: resource.url } : { title: resource.title, url: resource.url }] })
                setResource((current) => ({ ...current, title: '', url: '' }))
              }}>
                <select className="select" value={resource.kind} onChange={(event) => setResource((current) => ({ ...current, kind: event.target.value }))} aria-label="Resource type">
                  <option value="books">Book</option><option value="courses">Course</option><option value="projects">Project</option>
                </select>
                <input className="input" value={resource.title} onChange={(event) => setResource((current) => ({ ...current, title: event.target.value }))} placeholder="Resource title" aria-label="Resource title" />
                <input className="input" value={resource.url} onChange={(event) => setResource((current) => ({ ...current, url: event.target.value }))} placeholder="URL or project description" aria-label="Resource URL or description" />
                <Button type="submit">Add</Button>
              </form>
              {['books', 'courses', 'projects'].map((kind) => (
                <div key={kind}>
                  <h3>{kind}</h3>
                  {(goal.resources?.[kind] || []).map((item, index) => (
                    <p key={item._id || `${kind}-${index}`}>
                      <span>{kind === 'books' ? '📚' : kind === 'courses' ? '🎓' : '🛠'}</span>
                      <strong>{item.title}</strong>
                      {(item.url || item.description) && (
                        item.source === 'dream_wave_library' && item.url
                          ? <Link to={item.url}>Open in library</Link>
                          : <small>{item.url || item.description}</small>
                      )}
                    </p>
                  ))}
                  {!(goal.resources?.[kind] || []).length && <small>No {kind} added.</small>}
                </div>
              ))}
            </section>
          )}

          {tab === 'notes' && (
            <section className="goal-notes">
              <form onSubmit={(event) => { event.preventDefault(); if (note.trim()) { onAddNote(note); setNote('') } }}>
                <textarea className="textarea" value={note} maxLength="4000" onChange={(event) => setNote(event.target.value)} placeholder="Capture a reflection, decision or learning note." aria-label="New goal note" />
                <Button type="submit">Add note</Button>
              </form>
              {(goal.notes || []).slice().reverse().map((item) => <article key={item._id}><p>{item.text}</p><small>{new Date(item.createdAt).toLocaleString()}</small></article>)}
              {!(goal.notes || []).length && <EmptyState title="No notes yet" message="Use notes to capture context and reflections." />}
            </section>
          )}

          {tab === 'ai suggestions' && (
            <GoalIntelligencePanel goal={goal} onRefresh={onRefresh} />
          )}
        </div>
      )}
    </Dialog>
  )
}
