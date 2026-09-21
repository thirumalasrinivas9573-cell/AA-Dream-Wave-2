import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from './AuthContext'
import cacheService from '../services/cacheService'
import notificationService from '../services/notificationService'
import searchService from '../services/searchService'

const PlatformDataContext = createContext(null)

export function PlatformDataProvider({ children }) {
  const { user } = useAuth()
  const [notifications, setNotifications] = useState([])
  const [unread, setUnread] = useState(0)
  const [notificationsLoading, setNotificationsLoading] = useState(false)
  const [notificationError, setNotificationError] = useState('')
  const [searchResult, setSearchResult] = useState({ items: [], facets: {}, suggestions: [], recent: [], errors: {} })
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [connection, setConnection] = useState(() => navigator.onLine === false ? 'offline' : 'online')
  const searchRequest = useRef(0)

  useEffect(() => {
    const online = () => setConnection('online')
    const offline = () => setConnection('offline')
    window.addEventListener('online', online)
    window.addEventListener('offline', offline)
    return () => {
      window.removeEventListener('online', online)
      window.removeEventListener('offline', offline)
    }
  }, [])

  useEffect(() => {
    setNotifications([])
    setUnread(0)
    setNotificationError('')
    cacheService.clear()
  }, [user?._id, user?.id])

  const loadNotifications = useCallback(async (params = {}, options = {}) => {
    if (!user) return { items: [], unread: 0 }
    setNotificationsLoading(true)
    setNotificationError('')
    try {
      const data = await notificationService.list(params, options)
      setNotifications(data.items || [])
      setUnread(data.unread || 0)
      return data
    } catch (error) {
      setNotificationError(error.userMessage || 'Unable to load notifications.')
      throw error
    } finally {
      setNotificationsLoading(false)
    }
  }, [user])

  const updateNotification = useCallback((id, patch) => {
    setNotifications((current) => current.map((item) => item._id === id ? { ...item, ...patch } : item))
  }, [])

  const hydrateNotifications = useCallback((payload = {}) => {
    setNotifications(payload.items || [])
    setUnread(payload.unread || 0)
    setNotificationError('')
  }, [])

  const markRead = useCallback(async (id) => {
    const item = notifications.find((entry) => entry._id === id)
    if (!item || item.read) return
    updateNotification(id, { read: true })
    setUnread((value) => Math.max(0, value - 1))
    try {
      await notificationService.markRead(id)
    } catch (error) {
      updateNotification(id, { read: false })
      setUnread((value) => value + 1)
      throw error
    }
  }, [notifications, updateNotification])

  const markAllRead = useCallback(async () => {
    const previous = notifications
    setNotifications((current) => current.map((item) => ({ ...item, read: true })))
    setUnread(0)
    try {
      await notificationService.markAllRead()
    } catch (error) {
      setNotifications(previous)
      setUnread(previous.filter((item) => !item.read).length)
      throw error
    }
  }, [notifications])

  const archiveNotification = useCallback(async (id) => {
    const item = notifications.find((entry) => entry._id === id)
    setNotifications((current) => current.filter((entry) => entry._id !== id))
    if (item && !item.read) setUnread((value) => Math.max(0, value - 1))
    try {
      await notificationService.archive(id)
    } catch (error) {
      if (item) setNotifications((current) => [item, ...current])
      if (item && !item.read) setUnread((value) => value + 1)
      throw error
    }
  }, [notifications])

  const restoreNotification = useCallback(async (id) => {
    await notificationService.restore(id)
    setNotifications((current) => current.filter((entry) => entry._id !== id))
  }, [])

  const pinNotification = useCallback(async (id, pinned) => {
    const previous = notifications.find((item) => item._id === id)?.pinnedAt
    updateNotification(id, { pinnedAt: pinned ? new Date().toISOString() : null })
    try {
      await notificationService.pin(id, pinned)
    } catch (error) {
      updateNotification(id, { pinnedAt: previous })
      throw error
    }
  }, [notifications, updateNotification])

  const removeNotification = useCallback(async (id) => {
    const item = notifications.find((entry) => entry._id === id)
    setNotifications((current) => current.filter((entry) => entry._id !== id))
    if (item && !item.read) setUnread((value) => Math.max(0, value - 1))
    try {
      await notificationService.remove(id)
    } catch (error) {
      if (item) setNotifications((current) => [item, ...current])
      if (item && !item.read) setUnread((value) => value + 1)
      throw error
    }
  }, [notifications])

  const setNotificationPriority = useCallback(async (id, priority) => {
    const previous = notifications.find((item) => item._id === id)?.priority
    updateNotification(id, { priority })
    try {
      await notificationService.priority(id, priority)
    } catch (error) {
      updateNotification(id, { priority: previous })
      throw error
    }
  }, [notifications, updateNotification])

  const runSearch = useCallback(async (query, params = {}, options = {}) => {
    const requestId = ++searchRequest.current
    setSearchLoading(true)
    setSearchError('')
    try {
      const response = await searchService.search(query, params, options)
      const next = response.data || { items: [], facets: {}, suggestions: [], recent: [], errors: {} }
      if (requestId === searchRequest.current) setSearchResult(next)
      return next
    } catch (error) {
      if (requestId === searchRequest.current && error.name !== 'AbortError' && error.name !== 'CanceledError') setSearchError(error.userMessage || 'Search is temporarily unavailable.')
      throw error
    } finally {
      if (requestId === searchRequest.current) setSearchLoading(false)
    }
  }, [])

  const value = useMemo(() => ({
    notifications,
    unread,
    notificationsLoading,
    notificationError,
    loadNotifications,
    hydrateNotifications,
    markRead,
    markAllRead,
    archiveNotification,
    restoreNotification,
    pinNotification,
    removeNotification,
    setNotificationPriority,
    searchResult,
    searchLoading,
    searchError,
    runSearch,
    clearSearchHistory: searchService.clearHistory,
    connection,
  }), [
    notifications, unread, notificationsLoading, notificationError, loadNotifications, hydrateNotifications, markRead,
    markAllRead, archiveNotification, restoreNotification, pinNotification, removeNotification,
    setNotificationPriority, searchResult, searchLoading, searchError, runSearch, connection,
  ])

  return <PlatformDataContext.Provider value={value}>{children}</PlatformDataContext.Provider>
}

export function usePlatformData() {
  const context = useContext(PlatformDataContext)
  if (!context) throw new Error('usePlatformData must be used within PlatformDataProvider')
  return context
}
