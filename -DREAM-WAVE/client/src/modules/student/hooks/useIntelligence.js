import { useCallback, useEffect, useMemo, useState } from 'react'
import intelligenceService from '@shared/services/intelligenceService'

export default function useIntelligence({ autoLoad = true } = {}) {
  const [home, setHome] = useState(null)
  const [insights, setInsights] = useState([])
  const [loading, setLoading] = useState(Boolean(autoLoad))
  const [error, setError] = useState('')

  const load = useCallback(async (options = {}) => {
    setLoading(true)
    setError('')
    try {
      const response = await intelligenceService.home(options)
      setHome(response.data)
    } catch (requestError) {
      setError(requestError.userMessage || 'Unable to load AI workspace.')
    } finally {
      setLoading(false)
    }
  }, [])

  const loadInsights = useCallback(async (options = {}) => {
    try {
      const response = await intelligenceService.insights(options)
      setInsights(response.data?.items || [])
      return response.data?.items || []
    } catch (requestError) {
      setError(requestError.userMessage || 'Unable to load AI insights.')
      return []
    }
  }, [])

  useEffect(() => {
    if (autoLoad) load()
  }, [autoLoad, load])

  const sections = useMemo(() => ({
    dailyBrief: home?.dailyBrief,
    learningPlan: home?.learningPlan,
    priorityGoals: home?.priorityGoals || [],
    recommendedTasks: home?.recommendedTasks || [],
    recommendations: home?.recommendations || {},
    careerSuggestions: home?.careerSuggestions || [],
    progressSummary: home?.progressSummary || {},
    learningDashboard: home?.learningDashboard || {},
    actionCenter: home?.actionCenter || [],
    knowledgeMemory: home?.knowledgeMemory || {},
    insights: home?.insights || {},
    personalProfile: home?.personalProfile || {},
  }), [home])

  return {
    home,
    sections,
    insights,
    loading,
    error,
    load,
    loadInsights,
    refresh: () => {
      intelligenceService.invalidate()
      return load({ force: true })
    },
  }
}
