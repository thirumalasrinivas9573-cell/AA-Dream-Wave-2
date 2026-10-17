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
    taskApi
      .get(taskIdParam)
      .then(({ data }) => setTask(data.task || data))
      .catch(() => setError('Task not found.'))
  }, [taskIdParam, setError])

  const taskTitle = session?.taskId?.title || task?.title || 'Focus Session'
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
    if (timerMode === 'custom') return 'Custom Timer'
    return `${timerMode}-Minute Focus`
  }, [timerMode])

  if (loading && !session)
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center p-4">
        <LoadingState label="Loading focus session…" />
      </div>
    )

  return (
    <div className="min-h-screen bg-canvas text-content-heading flex flex-col justify-between p-4 md:p-8 font-body select-none">
      {/* Top Exit Header */}
      <header className="flex items-center justify-between max-w-4xl mx-auto w-full">
        <Link
          to={studentPath('planner')}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-surface border border-divider text-xs font-semibold text-content-body hover:text-content-heading hover:border-brand-primary transition-all"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          <span>Exit Focus Mode</span>
        </Link>
        <span className="px-3 py-1 rounded-full bg-brand-primary/10 text-brand-primary text-xs font-bold uppercase tracking-wider">
          Zen Mode
        </span>
      </header>

      {/* Main Focus Center Container */}
      <main className="max-w-2xl mx-auto w-full my-auto py-8">
        {error && <ErrorState message={error} onRetry={() => setError('')} />}

        {!session ? (
          <div className="p-8 md:p-12 rounded-stitch bg-surface border border-divider text-center shadow-xl space-y-6">
            <div className="w-16 h-16 rounded-full bg-brand-primary/10 text-brand-primary mx-auto flex items-center justify-center">
              <span className="material-symbols-outlined text-[32px]">center_focus_strong</span>
            </div>

            <div>
              <h1 className="text-3xl font-heading font-bold text-content-heading tracking-tight">Focus Mode</h1>
              <p className="text-base font-semibold text-brand-primary mt-2">{taskTitle}</p>
              {goalTitle && <p className="text-xs text-content-muted mt-1">Goal: {goalTitle}</p>}
            </div>

            {/* Timer Presets Selection */}
            <div className="flex items-center justify-center gap-2 flex-wrap pt-2">
              {Object.keys(TIMER_PRESETS).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setTimerMode(mode)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                    timerMode === mode
                      ? 'bg-brand-primary text-white shadow-md shadow-brand-primary/25'
                      : 'bg-surface-elevated border border-divider text-content-muted hover:text-content-heading'
                  }`}
                >
                  {mode === 'custom' ? 'Custom' : `${mode} min`}
                </button>
              ))}
            </div>

            <div className="pt-4">
              {taskIdParam || task?._id ? (
                <button
                  type="button"
                  disabled={starting}
                  onClick={handleStart}
                  className="w-full md:w-auto px-8 h-12 rounded-xl bg-brand-primary text-white text-sm font-semibold hover:bg-brand-hover transition-all shadow-lg shadow-brand-primary/25 cursor-pointer"
                >
                  {starting ? 'Starting Session…' : 'Start Focus Timer'}
                </button>
              ) : (
                <EmptyState
                  title="No task selected"
                  description="Open a task from the planner or tasks page to start a dedicated focus session."
                />
              )}
            </div>
          </div>
        ) : (
          <div className="p-8 md:p-12 rounded-stitch bg-surface border border-divider text-center shadow-2xl space-y-6">
            <div>
              <h1 className="text-2xl md:text-3xl font-heading font-bold text-content-heading">{taskTitle}</h1>
              {goalTitle && <p className="text-xs font-semibold text-brand-primary mt-1">{goalTitle}</p>}
            </div>

            {/* Large Digital Timer */}
            <div
              className="text-6xl md:text-7xl font-heading font-bold tracking-tight text-brand-primary py-4 font-mono"
              aria-live="polite"
              aria-label={`Elapsed time ${formattedElapsed}`}
            >
              {formattedElapsed}
            </div>

            {/* Progress Bar */}
            {presetSeconds > 0 && (
              <div className="space-y-2 max-w-sm mx-auto">
                <div className="w-full bg-canvas h-2 rounded-full overflow-hidden border border-divider">
                  <div
                    className="bg-brand-primary h-full rounded-full transition-all duration-300"
                    style={{ width: `${presetProgress || 0}%` }}
                  />
                </div>
                <span className="text-xs font-medium text-content-muted block">{presetLabel}</span>
              </div>
            )}

            <p className="text-xs font-semibold uppercase tracking-widest text-content-muted">
              {isPaused ? '⏸ Paused' : isActive ? '⚡ In Focus' : session.status}
            </p>

            {/* Timer Controls */}
            <div className="flex items-center justify-center gap-3 pt-4 flex-wrap">
              {isActive && (
                <button
                  type="button"
                  onClick={pause}
                  className="h-11 px-6 rounded-xl bg-brand-primary text-white text-xs font-semibold hover:bg-brand-hover transition-all shadow-md shadow-brand-primary/25"
                >
                  Pause
                </button>
              )}
              {isPaused && (
                <button
                  type="button"
                  onClick={resume}
                  className="h-11 px-6 rounded-xl bg-brand-primary text-white text-xs font-semibold hover:bg-brand-hover transition-all shadow-md shadow-brand-primary/25"
                >
                  Resume
                </button>
              )}
              <button
                type="button"
                onClick={() => setFinishOpen(true)}
                className="h-11 px-6 rounded-xl bg-surface-elevated border border-divider text-content-heading text-xs font-semibold hover:bg-surface transition-all"
              >
                Finish Session
              </button>
              <button
                type="button"
                onClick={cancel}
                className="h-11 px-4 rounded-xl text-xs font-medium text-rose-500 hover:bg-rose-500/10 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </main>

      <Dialog
        open={finishOpen}
        title="Finish focus session"
        description="Finishing the timer does not automatically complete the task unless checked."
        onClose={() => setFinishOpen(false)}
      >
        <div className="space-y-4 pt-2">
          <p className="text-xs text-content-body">
            Focused for <strong className="text-brand-primary">{formatTimer(elapsedSeconds)}</strong> on {taskTitle}
          </p>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-content-heading block">Session note (optional)</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              className="w-full p-3 rounded-xl bg-canvas border border-divider text-xs text-content-heading focus:outline-none focus:border-brand-primary"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-content-heading block">Distraction note (optional)</label>
            <input
              value={distraction}
              onChange={(e) => setDistraction(e.target.value)}
              placeholder="Phone, tired, topic difficult…"
              className="w-full h-10 px-3 rounded-xl bg-canvas border border-divider text-xs text-content-heading focus:outline-none focus:border-brand-primary"
            />
          </div>
          <label className="flex items-center gap-2 text-xs font-semibold text-content-heading cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={markComplete}
              onChange={(e) => setMarkComplete(e.target.checked)}
              className="rounded accent-brand-primary"
            />
            <span>Mark task complete</span>
          </label>
          <div className="flex items-center justify-end gap-3 pt-3">
            <Button variant="ghost" onClick={() => setFinishOpen(false)}>
              Continue Later
            </Button>
            <Button onClick={handleFinish}>Finish Session</Button>
          </div>
        </div>
      </Dialog>
    </div>
  )
}
