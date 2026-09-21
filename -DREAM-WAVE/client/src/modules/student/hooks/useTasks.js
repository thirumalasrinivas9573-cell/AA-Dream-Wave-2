import { useCallback, useEffect, useState } from 'react'
import { goalApi, roadmapApi, taskApi } from '@shared/services/api'

const EMPTY_ANALYTICS = {
  total: 0,
  today: 0,
  upcoming: 0,
  completed: 0,
  overdue: 0,
  archived: 0,
  weeklyCompleted: 0,
  monthlyCompleted: 0,
  completionRate: 0,
  focusMinutes: 0,
  studyHours: 0,
  streak: 0,
  daily: [],
  byStatus: {},
  byPriority: {},
}

export default function useTasks() {
  const [tasks, setTasks] = useState([])
  const [goals, setGoals] = useState([])
  const [roadmaps, setRoadmaps] = useState([])
  const [analytics, setAnalytics] = useState(EMPTY_ANALYTICS)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    setLoading(true)
    setError('')
    const results = await Promise.allSettled([
      taskApi.getAll(),
      goalApi.getAll(),
      roadmapApi.getAll(),
      taskApi.analytics(),
    ])
    if (results[0].status === 'fulfilled') setTasks(results[0].value.data.tasks || [])
    else setError(results[0].reason.userMessage || 'Unable to load tasks.')
    if (results[1].status === 'fulfilled') setGoals(results[1].value.data.goals || [])
    if (results[2].status === 'fulfilled') setRoadmaps(results[2].value.data.roadmaps || [])
    if (results[3].status === 'fulfilled') setAnalytics(results[3].value.data.analytics || EMPTY_ANALYTICS)
    setLoading(false)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const refreshAnalytics = useCallback(() => {
    taskApi.analytics().then((response) => setAnalytics(response.data.analytics || EMPTY_ANALYTICS)).catch(() => {})
  }, [])

  const createTask = async (payload) => {
    const { data } = await taskApi.create(payload)
    setTasks((current) => [data.task, ...current])
    refreshAnalytics()
    return data.task
  }

  const updateTask = async (task, payload) => {
    const previous = task
    setTasks((current) => current.map((item) => item._id === task._id ? { ...item, ...payload, completed: payload.status ? payload.status === 'completed' : payload.completed ?? item.completed } : item))
    try {
      const { data } = await taskApi.update(task._id, payload)
      setTasks((current) => current.map((item) => item._id === task._id ? data.task : item))
      refreshAnalytics()
      return data.task
    } catch (error) {
      setTasks((current) => current.map((item) => item._id === task._id ? previous : item))
      throw error
    }
  }

  const deleteTask = async (task) => {
    const previous = tasks
    setTasks((current) => current.filter((item) => item._id !== task._id))
    try {
      await taskApi.delete(task._id)
      refreshAnalytics()
    } catch (error) {
      setTasks(previous)
      throw error
    }
  }

  const duplicateTask = async (task) => {
    const { data } = await taskApi.duplicate(task._id)
    setTasks((current) => [data.task, ...current])
    refreshAnalytics()
    return data.task
  }

  return {
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
  }
}
