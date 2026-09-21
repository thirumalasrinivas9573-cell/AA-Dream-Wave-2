import { useCallback, useEffect, useState } from 'react'
import { careerApi } from '@shared/services/api'

export function useCareerDashboard() {
  const [dashboard, setDashboard] = useState(null)
  const [readiness, setReadiness] = useState(null)
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    const results = await Promise.allSettled([careerApi.dashboard(), careerApi.readiness(), careerApi.notifications()])
    if (results[0].status === 'fulfilled') setDashboard(results[0].value.data.dashboard)
    if (results[1].status === 'fulfilled') setReadiness(results[1].value.data)
    if (results[2].status === 'fulfilled') setNotifications(results[2].value.data.items || [])
    const failed = results.find((result) => result.status === 'rejected')
    if (failed && results[0].status === 'rejected') setError(failed.reason.userMessage || 'Unable to load Career Hub.')
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])
  return { dashboard, readiness, notifications, loading, error, load }
}

export function useOpportunities(type) {
  const [items, setItems] = useState([])
  const [filters, setFilters] = useState(null)
  const [query, setQuery] = useState({ type, q: '', location: '', workMode: '', skill: '', industry: '', company: '', jobType: '', minSalary: '', experience: '' })
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const { data } = await careerApi.opportunities({ ...query, type, page, limit: 18 })
      setItems(data.items || [])
      setTotal(data.total || 0)
    } catch (requestError) {
      setError(requestError.userMessage || `Unable to load ${type === 'job' ? 'jobs' : 'internships'}.`)
    } finally {
      setLoading(false)
    }
  }, [page, query, type])

  useEffect(() => {
    careerApi.filters().then((response) => setFilters(response.data.options)).catch(() => setFilters({}))
  }, [])
  useEffect(() => {
    const timeout = setTimeout(load, 250)
    return () => clearTimeout(timeout)
  }, [load])

  const updateQuery = (field, value) => {
    setPage(1)
    setQuery((current) => ({ ...current, [field]: value }))
  }
  const patchItem = (id, patch) => setItems((current) => current.map((item) => item._id === id ? { ...item, ...patch } : item))
  return { items, filters, query, updateQuery, page, setPage, total, loading, error, load, patchItem }
}
