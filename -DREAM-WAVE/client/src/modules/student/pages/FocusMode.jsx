import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Button, Dialog, EmptyState, ErrorState, LoadingState } from '@shared/components/ui'
import { taskApi } from '@shared/services/api'
import useFocusSession, { TIMER_PRESETS, formatTimer } from '../hooks/useFocusSession'
import { studentPath } from '../theme'
import '../styles/planner.css'

export default function FocusMode() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const taskIdParam = searchParams.get('task')
  const {
    session,
    elapsedSeconds,
    formattedElapsed,
    presetSeconds,
    presetProgress,
    loading,
    error,
    setError,
    start,
    pause,
    resume,
    complete,
    cancel,
    isActive,
    isPaused,
  } = useFocusSession()

  const [task, setTask] = useState(null)
  const [timerMode, setTimerMode] = useState('45')
  const [finishOpen, setFinishOpen] = useState(false)
  const [note, setNote] = useState('')
  const [distraction, setDistraction] = useState('')
  const [markComplete, setMarkComplete] = useState(false)
  const [starting, setStarting] = useState(false)

  useEffect(() => {
    if (!taskIdParam) return
    taskApi.get(taskIdParam)
      .then(({ data }) => setTask(data.task || data))
      .catch(() => setError('Task not found.'))
  }, [taskIdParam, setError])

  const taskTitle = session?.taskId?.title || task?.title || 'Focus session'
  const goalTitle = session?.goalId?.title || task?.goalId?.title

  const handleStart = async () => {
    if (!taskIdParam && !task?._id) {
      setError('Select a task to start focus.')
      return
    }
    setStarting(true)
    try {
      await start({ taskId: taskIdParam || task._id, timerMode })
    } catch (err) {
      setError(err.userMessage || 'Could not start focus session.')
    } finally {
      setStarting(false)
    }
  }

  const handleFinish = async () => {
    try {
      await complete({ note, distractionNote: distraction, markTaskComplete: markComplete })
      setFinishOpen(false)
      navigate(studentPath('planner'))
    } catch (err) {
      setError(err.userMessage || 'Could not finish session.')
    }
  }

  const presetLabel = useMemo(() => {
    if (timerMode === 'custom') return 'Custom timer'
    return `${timerMode}-minute focus`
  }, [timerMode])

  if (loading && !session) return <LoadingState label="Loading focus session…" />

  return (
    <div className="focus-mode">
      <header className="focus-mode__header">
        <Link to={studentPath('planner')} className="focus-mode__exit">← Exit focus</Link>
      </header>

      <main className="focus-mode__main">
        {error && <ErrorState message={error} onRetry={() => setError('')} />}

        {!session ? (
          <div className="focus-mode__ready">
            <h1>Focus Mode</h1>
            <p className="focus-mode__task">{taskTitle}</p>
            {goalTitle && <p className="focus-mode__goal">Goal: {goalTitle}</p>}

            <div className="focus-mode__modes">
              {Object.keys(TIMER_PRESETS).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  className={timerMode === mode ? 'is-active' : ''}
                  onClick={() => setTimerMode(mode)}
                >
                  {mode === 'custom' ? 'Custom' : `${mode} min`}
                </button>
              ))}
            </div>

            {taskIdParam || task?._id ? (
              <Button size="lg" disabled={starting} onClick={handleStart}>
                {starting ? 'Starting…' : 'Start focus'}
              </Button>
            ) : (
              <EmptyState title="No task selected" description="Open a task from the planner or tasks page to start focus." />
            )}
          </div>
        ) : (
          <div className="focus-mode__active">
            <h1>{taskTitle}</h1>
            {goalTitle && <p className="focus-mode__goal">{goalTitle}</p>}
            <div className="focus-mode__timer" aria-live="polite" aria-label={`Elapsed time ${formattedElapsed}`}>
              {formattedElapsed}
            </div>
            {presetSeconds > 0 && (
              <div className="focus-mode__progress">
                <div style={{ width: `${presetProgress || 0}%` }} />
                <span>{presetLabel}</span>
              </div>
            )}
            <p className="focus-mode__status">{isPaused ? 'Paused' : isActive ? 'In focus' : session.status}</p>
            <div className="focus-mode__controls">
              {isActive && <Button onClick={pause}>Pause</Button>}
              {isPaused && <Button onClick={resume}>Resume</Button>}
              <Button variant="secondary" onClick={() => setFinishOpen(true)}>Finish session</Button>
              <Button variant="ghost" onClick={cancel}>Cancel</Button>
            </div>
          </div>
        )}
      </main>

      <Dialog
        open={finishOpen}
        title="Finish focus session"
        description="Finishing the timer does not automatically complete the task."
        onClose={() => setFinishOpen(false)}
      >
        <div className="focus-finish">
          <p>Focused for <strong>{formatTimer(elapsedSeconds)}</strong> on {taskTitle}</p>
          <label>Session note (optional)<textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} /></label>
          <label>Distraction note (optional)<input value={distraction} onChange={(e) => setDistraction(e.target.value)} placeholder="Phone, tired, topic difficult…" /></label>
          <label className="focus-finish__check">
            <input type="checkbox" checked={markComplete} onChange={(e) => setMarkComplete(e.target.checked)} />
            Mark task complete
          </label>
          <div className="planner-preview__actions">
            <Button variant="ghost" onClick={() => setFinishOpen(false)}>Continue later</Button>
            <Button onClick={handleFinish}>Finish session</Button>
          </div>
        </div>
      </Dialog>
    </div>
  )
}
