import { useCallback, useEffect, useRef, useState } from 'react'
import plannerService from '@shared/services/plannerService'

function formatTimer(totalSeconds) {
  const s = Math.max(0, totalSeconds)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}

const TIMER_PRESETS = {
  custom: 0,
  25: 25 * 60,
  45: 45 * 60,
  60: 60 * 60,
}

export default function useFocusSession() {
  const [session, setSession] = useState(null)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const tickRef = useRef(null)
  const sessionRef = useRef(null)

  const syncElapsed = useCallback((activeSession) => {
    if (!activeSession) {
      setElapsedSeconds(0)
      return
    }
    if (activeSession.elapsedSeconds != null) {
      setElapsedSeconds(activeSession.elapsedSeconds)
      return
    }
    const start = new Date(activeSession.startedAt).getTime()
    let elapsed = Math.floor((Date.now() - start) / 1000)
    elapsed -= activeSession.pausedDurationSeconds || 0
    if (activeSession.status === 'paused' && activeSession.pausedAt) {
      elapsed -= Math.floor((Date.now() - new Date(activeSession.pausedAt).getTime()) / 1000)
    }
    setElapsedSeconds(Math.max(0, elapsed))
  }, [])

  const loadActive = useCallback(async () => {
    setError('')
    try {
      const active = await plannerService.getActiveFocus()
      setSession(active)
      sessionRef.current = active
      syncElapsed(active)
      return active
    } catch (err) {
      setError(err.userMessage || 'Could not load focus session.')
      return null
    } finally {
      setLoading(false)
    }
  }, [syncElapsed])

  useEffect(() => {
    loadActive()
  }, [loadActive])

  useEffect(() => {
    if (tickRef.current) clearInterval(tickRef.current)
    if (!session || session.status !== 'active') return undefined
    tickRef.current = setInterval(() => syncElapsed(sessionRef.current), 1000)
    return () => clearInterval(tickRef.current)
  }, [session, syncElapsed])

  const start = useCallback(async ({ taskId, timerMode = '45', plannedDurationMinutes } = {}) => {
    setError('')
    const data = await plannerService.startFocus({
      taskId,
      timerMode,
      plannedDurationMinutes: plannedDurationMinutes ?? (TIMER_PRESETS[timerMode] ? TIMER_PRESETS[timerMode] / 60 : 0),
    })
    setSession(data.session)
    sessionRef.current = data.session
    syncElapsed(data.session)
    return data
  }, [syncElapsed])

  const pause = useCallback(async () => {
    if (!session?._id) return null
    const data = await plannerService.pauseFocus(session._id)
    setSession(data.session)
    sessionRef.current = data.session
    syncElapsed(data.session)
    return data.session
  }, [session, syncElapsed])

  const resume = useCallback(async () => {
    if (!session?._id) return null
    const data = await plannerService.resumeFocus(session._id)
    setSession(data.session)
    sessionRef.current = data.session
    syncElapsed(data.session)
    return data.session
  }, [session, syncElapsed])

  const complete = useCallback(async ({ note, distractionNote, markTaskComplete } = {}) => {
    if (!session?._id) return null
    const data = await plannerService.completeFocus(session._id, { note, distractionNote, markTaskComplete })
    setSession(null)
    sessionRef.current = null
    setElapsedSeconds(0)
    return data.session
  }, [session])

  const cancel = useCallback(async () => {
    if (!session?._id) return null
    await plannerService.cancelFocus(session._id)
    setSession(null)
    sessionRef.current = null
    setElapsedSeconds(0)
  }, [session])

  const presetSeconds = session?.timerMode && TIMER_PRESETS[session.timerMode]
    ? TIMER_PRESETS[session.timerMode]
    : session?.plannedDurationMinutes
      ? session.plannedDurationMinutes * 60
      : 0

  return {
    session,
    elapsedSeconds,
    formattedElapsed: formatTimer(elapsedSeconds),
    presetSeconds,
    presetProgress: presetSeconds ? Math.min(100, Math.round((elapsedSeconds / presetSeconds) * 100)) : null,
    loading,
    error,
    setError,
    loadActive,
    start,
    pause,
    resume,
    complete,
    cancel,
    isActive: session?.status === 'active',
    isPaused: session?.status === 'paused',
    TIMER_PRESETS,
    formatTimer,
  }
}

export { formatTimer, TIMER_PRESETS }
