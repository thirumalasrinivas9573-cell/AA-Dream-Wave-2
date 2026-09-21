import { useEffect, useRef, useState } from 'react'
import { usePlatformData } from '../context/PlatformDataContext'

export default function useUnifiedSearch({ initialQuery = '', initialTypes = 'all', initialFilters = {}, scope = 'all', debounceMs = 250, enabled = true } = {}) {
  const { runSearch, searchResult, searchLoading, searchError, clearSearchHistory } = usePlatformData()
  const [query, setQuery] = useState(initialQuery)
  const [types, setTypes] = useState(initialTypes)
  const [filters, setFilters] = useState(initialFilters)
  const requestId = useRef(0)

  useEffect(() => {
    if (!enabled) return undefined
    const currentRequest = ++requestId.current
    const timeout = setTimeout(() => {
      runSearch(query, { ...filters, types, scope })
        .catch(() => {})
        .finally(() => {
          if (currentRequest !== requestId.current) return
        })
    }, debounceMs)
    return () => clearTimeout(timeout)
  }, [debounceMs, enabled, filters, query, runSearch, scope, types])

  return {
    query,
    setQuery,
    types,
    setTypes,
    filters,
    setFilter: (name, value) => setFilters((current) => ({ ...current, [name]: value })),
    results: searchResult.items,
    facets: searchResult.facets,
    suggestions: searchResult.suggestions,
    recent: searchResult.recent,
    sourceErrors: searchResult.errors,
    loading: searchLoading,
    error: searchError,
    run: (options) => runSearch(query, { ...filters, types, scope }, options),
    clearHistory: clearSearchHistory,
  }
}
