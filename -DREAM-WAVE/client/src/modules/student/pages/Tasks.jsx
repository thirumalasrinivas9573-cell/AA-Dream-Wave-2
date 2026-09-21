import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '@shared/context/AuthContext'
import { taskApi } from '@shared/services/api'
import { Button, Dialog, ErrorState } from '@shared/components/ui'
import { ConfettiBurst, XPBurst } from '@shared/components/animations/TaskCompleteEffect'
import StudentLayout from '../layouts/StudentLayout'
import useTasks from '../hooks/useTasks'
import {
  relationId,
  TaskAnalyticsView,
  TaskCalendarView,
  TaskDetailDialog,
  TaskFormDialog,
  TaskKanbanView,
  TaskListView,
  TaskStats,
  TaskTimelineView,
  TaskToolbar,
} from '../components/tasks/TaskWorkspace'
import '../styles/tasks.css'

function localDateKey(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function effectiveStatus(task) {
  return task.completed ? 'completed' : task.status || 'todo'
}

export default function Tasks() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const {
    tasks,
    goals,
    roadmaps,
    analytics,
    loading,
    error,
    setError,
    refresh,
    createTask,
    updateTask,
    deleteTask,
    duplicateTask,
    setTasks,
    refreshAnalytics,
  } = useTasks()
  const [view, setView] = useState(searchParams.get('view') || 'list')
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState({ status: 'all', priority: 'all', when: 'all' })
  const [formTask, setFormTask] = useState(undefined)
  const [formOpen, setFormOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState(null)
  const [deleteCandidate, setDeleteCandidate] = useState(null)
  const [focusTaskId, setFocusTaskId] = useState('')
  const [generateGoalId, setGenerateGoalId] = useState('')
  const [generating, setGenerating] = useState(false)
  const [generateConfirm, setGenerateConfirm] = useState(false)
  const [effects, setEffects] = useState([])

  const goalMap = useMemo(() => new Map(goals.map((goal) => [goal._id, goal])), [goals])
  const counts = useMemo(() => ({
    all: tasks.length,
    pending: tasks.filter((task) => !task.completed && !['completed', 'archived'].includes(task.status)).length,
    todo: tasks.filter((task) => effectiveStatus(task) === 'todo').length,
    'in-progress': tasks.filter((task) => effectiveStatus(task) === 'in-progress').length,
    paused: tasks.filter((task) => effectiveStatus(task) === 'paused').length,
    completed: tasks.filter((task) => effectiveStatus(task) === 'completed').length,
    archived: tasks.filter((task) => effectiveStatus(task) === 'archived').length,
  }), [tasks])

  const filteredTasks = useMemo(() => {
    const term = query.trim().toLowerCase()
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(today.getDate() + 1)
    const weekEnd = new Date(today)
    weekEnd.setDate(today.getDate() + 7)
    return tasks.filter((task) => {
      const matchesQuery = !term
        || task.title.toLowerCase().includes(term)
        || task.description?.toLowerCase().includes(term)
        || task.category?.toLowerCase().includes(term)
        || (task.tags || []).some((tag) => tag.toLowerCase().includes(term))
      const matchesStatus = filter.status === 'all'
        || (filter.status === 'pending' ? !task.completed && !['completed', 'archived'].includes(task.status) : effectiveStatus(task) === filter.status)
      const matchesPriority = filter.priority === 'all' || task.priority === filter.priority
      let matchesDate = true
      if (filter.when === 'today') matchesDate = localDateKey(task.dueDate) === localDateKey(today)
      if (filter.when === 'tomorrow') matchesDate = localDateKey(task.dueDate) === localDateKey(tomorrow)
      if (filter.when === 'week') matchesDate = Boolean(task.dueDate && new Date(task.dueDate) >= today && new Date(task.dueDate) <= weekEnd)
      return matchesQuery && matchesStatus && matchesPriority && matchesDate
    })
  }, [filter, query, tasks])

  useEffect(() => {
    const taskId = searchParams.get('taskId')
    if (taskId && !selectedTask) {
      const target = tasks.find((task) => task._id === taskId)
      if (target) setSelectedTask(target)
    }
  }, [searchParams, selectedTask, tasks])

  const changeView = (nextView) => {
    setView(nextView)
    setSearchParams((current) => {
      const next = new URLSearchParams(current)
      next.set('view', nextView)
      return next
    }, { replace: true })
  }

  const openTask = (task) => {
    setSelectedTask(task)
    setSearchParams((current) => {
      const next = new URLSearchParams(current)
      next.set('taskId', task._id)
      return next
    }, { replace: true })
  }

  const closeTask = () => {
    setSelectedTask(null)
    setSearchParams((current) => {
      const next = new URLSearchParams(current)
      next.delete('taskId')
      return next
    }, { replace: true })
  }

  const saveTask = async (payload) => {
    if (formTask) {
      const updated = await updateTask(formTask, payload)
      if (selectedTask?._id === updated._id) setSelectedTask(updated)
    } else {
      await createTask(payload)
    }
  }

  const handleUpdate = async (task, payload) => {
    setError('')
    try {
      const updated = await updateTask(task, payload)
      if (selectedTask?._id === updated._id) setSelectedTask(updated)
      return updated
    } catch (requestError) {
      setError(requestError.userMessage || 'Unable to update task.')
      return null
    }
  }

  const completeTask = async (task) => {
    const completed = !task.completed
    const updated = await handleUpdate(task, { completed })
    if (updated && completed) {
      const id = Date.now()
      setEffects((current) => [...current, { id, type: 'confetti' }, { id: id + 1, type: 'xp' }])
    }
  }

  const handleDuplicate = async (task) => {
    setError('')
    try {
      await duplicateTask(task)
    } catch (requestError) {
      setError(requestError.userMessage || 'Unable to duplicate task.')
    }
  }

  const confirmDelete = async () => {
    if (!deleteCandidate) return
    setError('')
    try {
      await deleteTask(deleteCandidate)
      if (selectedTask?._id === deleteCandidate._id) closeTask()
      setDeleteCandidate(null)
    } catch (requestError) {
      setError(requestError.userMessage || 'Unable to delete task.')
      setDeleteCandidate(null)
    }
  }

  const startFocus = async () => {
    if (!selectedTask) return
    try {
      await taskApi.startFocus(selectedTask._id)
      setFocusTaskId(selectedTask._id)
    } catch (requestError) {
      setError(requestError.userMessage || 'Unable to start focus session.')
    }
  }

  const stopFocus = async () => {
    if (!selectedTask) return
    try {
      const response = await taskApi.stopFocus(selectedTask._id)
      const minutes = Math.max(1, Math.round((response.data.session.durationSeconds || 0) / 60))
      const next = { ...selectedTask, actualMinutes: (selectedTask.actualMinutes || 0) + minutes }
      setSelectedTask(next)
      setTasks((current) => current.map((task) => task._id === next._id ? next : task))
      setFocusTaskId('')
      refreshAnalytics()
    } catch (requestError) {
      setError(requestError.userMessage || 'Unable to stop focus session.')
    }
  }

  const generatePlan = async () => {
    const roadmap = roadmaps.find((item) => relationId(item.goalId) === generateGoalId)
    if (!generateGoalId || !roadmap) {
      setError('Initialize a roadmap for this goal before generating learning tasks.')
      setGenerateConfirm(false)
      return
    }
    setGenerating(true)
    setGenerateConfirm(false)
    setError('')
    try {
      await taskApi.generate({ goalId: generateGoalId, roadmapId: roadmap._id })
      await refresh()
    } catch (requestError) {
      setError(requestError.userMessage || 'Unable to generate roadmap tasks.')
    } finally {
      setGenerating(false)
    }
  }

  const sharedViewProps = {
    tasks: filteredTasks,
    loading,
    goalMap,
    onOpen: openTask,
    onComplete: completeTask,
    onStatus: (task, status) => handleUpdate(task, { status, completed: status === 'completed' }),
    onDuplicate: handleDuplicate,
    onEdit: (task) => { setFormTask(task); setFormOpen(true) },
    onDelete: setDeleteCandidate,
  }

  return (
    <StudentLayout>
      <div className="task-workspace">
        <header className="task-header">
          <div>
            <h1><span className="gradient-text">Tasks</span> & Productivity</h1>
            <p>Plan, prioritize and complete focused learning activities.</p>
          </div>
          <div className="task-header__actions">
            <Button variant="secondary" onClick={() => changeView('analytics')}>Productivity</Button>
            <Button onClick={() => { setFormTask(null); setFormOpen(true) }}>+ Create task</Button>
          </div>
        </header>

        {error && <ErrorState title="Task action failed" message={error} onRetry={refresh} />}
        <TaskStats analytics={analytics} userStreak={user?.streak || 0} loading={loading} />

        <section className="task-generator">
          <header>
            <div><h2>Roadmap task generator</h2><p>Preserves manual tasks and replaces only previously generated roadmap tasks.</p></div>
            <div className="task-generator__controls">
              <select className="select" value={generateGoalId} onChange={(event) => setGenerateGoalId(event.target.value)} aria-label="Goal for roadmap task generation">
                <option value="">Select goal</option>
                {goals.filter((goal) => !goal.completed && goal.status !== 'archived').map((goal) => <option value={goal._id} key={goal._id}>{goal.title}</option>)}
              </select>
              <Button variant="secondary" disabled={!generateGoalId || generating} onClick={() => setGenerateConfirm(true)}>{generating ? 'Generating…' : 'Generate learning plan'}</Button>
            </div>
          </header>
        </section>

        <TaskToolbar view={view} onView={changeView} query={query} onQuery={setQuery} filter={filter} onFilter={setFilter} counts={counts} />

        {view === 'list' && <TaskListView {...sharedViewProps} />}
        {view === 'kanban' && <TaskKanbanView {...sharedViewProps} />}
        {view === 'calendar' && <TaskCalendarView tasks={filteredTasks} onOpen={openTask} />}
        {view === 'timeline' && <TaskTimelineView tasks={filteredTasks} onOpen={openTask} />}
        {view === 'analytics' && <TaskAnalyticsView analytics={analytics} />}
      </div>

      {formOpen && (
        <TaskFormDialog
          key={formTask?._id || 'new-task'}
          open
          task={formTask}
          goals={goals}
          roadmaps={roadmaps}
          onClose={() => { setFormOpen(false); setFormTask(undefined) }}
          onSave={saveTask}
        />
      )}

      <TaskDetailDialog
        key={selectedTask?._id || 'task-detail'}
        task={selectedTask}
        open={Boolean(selectedTask)}
        goals={goals}
        onClose={closeTask}
        onUpdate={(payload) => handleUpdate(selectedTask, payload)}
        onStartFocus={startFocus}
        onStopFocus={stopFocus}
        focusActive={focusTaskId === selectedTask?._id}
      />

      <Dialog
        open={Boolean(deleteCandidate)}
        title="Delete this task?"
        description="The task and its focus history will be permanently deleted."
        onClose={() => setDeleteCandidate(null)}
        actions={<><Button variant="ghost" onClick={() => setDeleteCandidate(null)}>Cancel</Button><Button variant="danger" onClick={confirmDelete}>Delete task</Button></>}
      >
        <p>{deleteCandidate ? `“${deleteCandidate.title}” cannot be recovered.` : ''}</p>
      </Dialog>

      <Dialog
        open={generateConfirm}
        title="Generate tasks from this roadmap?"
        description="Existing generated tasks for this roadmap will be replaced. Manual and duplicated tasks are preserved."
        onClose={() => setGenerateConfirm(false)}
        actions={<><Button variant="ghost" onClick={() => setGenerateConfirm(false)}>Cancel</Button><Button onClick={generatePlan}>Generate tasks</Button></>}
      >
        <p>Completion progress may change when the generated learning plan is replaced.</p>
      </Dialog>

      {effects.map((effect) => effect.type === 'confetti'
        ? <ConfettiBurst key={effect.id} x={window.innerWidth / 2} y={window.innerHeight / 2} onDone={() => setEffects((current) => current.filter((item) => item.id !== effect.id))} />
        : <XPBurst key={effect.id} amount={10} x={window.innerWidth / 2 - 20} y={window.innerHeight / 2 - 40} onDone={() => setEffects((current) => current.filter((item) => item.id !== effect.id))} />
      )}
    </StudentLayout>
  )
}
