import { useCallback, useEffect, useState } from 'react'
import plannerService from '@shared/services/plannerService'

export default function usePlanner() {
  const [today, setToday] = useState(null)
  const [week, setWeek] = useState(null)
  const [metrics, setMetrics] = useState(null)
  const [preferences, setPreferences] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [planPreview, setPlanPreview] = useState(null)
  const [generating, setGenerating] = useState(false)

  const refreshToday = useCallback(async (date) => {
    setError('')
    try {
      const data = await plannerService.getToday(date)
      setToday(data)
      return data
    } catch (err) {
      setError(err.userMessage || 'Could not load today\'s plan.')
      throw err
    }
  }, [])

  const refreshWeek = useCallback(async (start) => {
    setError('')
    try {
      const data = await plannerService.getWeek(start)
      setWeek(data)
      return data
    } catch (err) {
      setError(err.userMessage || 'Could not load weekly plan.')
      throw err
    }
  }, [])

  const refreshMetrics = useCallback(async () => {
    try {
      const data = await plannerService.getMetrics()
      setMetrics(data)
      return data
    } catch {
      return null
    }
  }, [])

  const loadPreferences = useCallback(async () => {
    try {
      const prefs = await plannerService.getPreferences()
      setPreferences(prefs)
      return prefs
    } catch {
      return null
    }
  }, [])

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      await Promise.all([refreshToday(), refreshWeek(), refreshMetrics(), loadPreferences()])
    } finally {
      setLoading(false)
    }
  }, [refreshToday, refreshWeek, refreshMetrics, loadPreferences])

  useEffect(() => {
    refresh()
  }, [refresh])

  const suggestDaily = useCallback(async (options = {}) => {
    setGenerating(true)
    setError('')
    try {
      const preview = await plannerService.suggestDaily(options)
      setPlanPreview(preview)
      return preview
    } catch (err) {
      setError(err.userMessage || 'Could not generate daily plan.')
      throw err
    } finally {
      setGenerating(false)
    }
  }, [])

  const suggestWeekly = useCallback(async (options = {}) => {
    setGenerating(true)
    setError('')
    try {
      const preview = await plannerService.suggestWeekly(options)
      setPlanPreview(preview)
      return preview
    } catch (err) {
      setError(err.userMessage || 'Could not generate weekly plan.')
      throw err
    } finally {
      setGenerating(false)
    }
  }, [])

  const applyPlan = useCallback(async (items, mode = 'selected') => {
    setError('')
    const result = await plannerService.applyPlan(items, mode)
    setPlanPreview(null)
    await refresh()
    return result
  }, [refresh])

  const updatePreferences = useCallback(async (data) => {
    const prefs = await plannerService.updatePreferences(data)
    setPreferences(prefs)
    await refreshToday()
    return prefs
  }, [refreshToday])

  return {
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
    refreshWeek,
    suggestDaily,
    suggestWeekly,
    applyPlan,
    updatePreferences,
  }
}
