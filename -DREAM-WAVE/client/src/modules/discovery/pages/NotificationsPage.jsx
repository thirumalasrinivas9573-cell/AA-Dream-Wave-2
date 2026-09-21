import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@shared/context/AuthContext'
import { usePlatformData } from '@shared/context/PlatformDataContext'
import useNotifications from '@shared/hooks/useNotifications'
import NotificationItem from '@shared/components/platform/NotificationItem'
import { EmptyState, LoadingState } from '@shared/components/ui'
import '@shared/components/platform/platform.css'

const FILTERS = ['all', 'unread', 'pinned', 'academic', 'career', 'library', 'system', 'archived']
const academicTypes = new Set(['goal', 'milestone', 'roadmap', 'task', 'reminder', 'academic', 'certificate'])
const careerTypes = new Set(['job', 'internship', 'career'])

export default function NotificationsPage() {
  const { user } = useAuth()
  const { connection } = usePlatformData()
  const notifications = useNotifications()
  const [filter, setFilter] = useState('all')
  const [actionError, setActionError] = useState('')

  useEffect(() => {
    if (!user) return
    notifications.load({ archived: filter === 'archived' }, { force: false }).catch(() => {})
    // The shared notification loader is stable for this provider lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, user])

  const items = useMemo(() => notifications.items.filter((item) => {
    if (filter === 'unread') return !item.read
    if (filter === 'pinned') return Boolean(item.pinnedAt)
    if (filter === 'academic') return academicTypes.has(item.type)
    if (filter === 'career') return careerTypes.has(item.type)
    if (filter === 'library') return ['library', 'book'].includes(item.type)
    if (filter === 'system') return ['system', 'in-app', 'approval', 'report', 'discovery', 'ai'].includes(item.type)
    return true
  }), [filter, notifications.items])

  const act = async (operation) => {
    setActionError('')
    try {
      await operation()
    } catch (error) {
      setActionError(error.userMessage || 'The notification update failed. Please retry.')
    }
  }

  if (!user) return <div style={{ padding: 40, color: '#94A3B8' }}><Link to="/student/login">Sign in</Link> to view notifications.</div>

  return <main style={{ minHeight: '100vh', background: '#0B0F1A', color: '#E2E8F0', padding: '28px 20px' }}>
    <div style={{ maxWidth: 820, margin: '0 auto' }}>
      <Link to={user.role === 'student' ? '/student/dashboard' : '/discover'} style={{ color: '#94A3B8' }}>← Back</Link>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div><h1 style={{ margin: '12px 0 4px' }}>Notification Center {notifications.unread ? `(${notifications.unread})` : ''}</h1><p style={{ margin: 0, color: '#64748B', fontSize: '.78rem' }}>Academic, career, library, task, certificate, system and AI updates in one place.</p></div>
        <button type="button" disabled={!notifications.unread} onClick={() => act(notifications.markAllRead)} style={buttonStyle}>Mark all read</button>
      </header>

      {connection === 'offline' && <p role="status" style={{ color: '#FBBF24' }}>You are offline. Cached notifications remain visible; updates will retry when connected.</p>}
      {(notifications.error || actionError) && <div role="alert" style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#F87171' }}><span>{actionError || notifications.error}</span><button type="button" onClick={() => notifications.load({ archived: filter === 'archived' }, { force: true }).catch(() => {})} style={buttonStyle}>Retry</button></div>}

      <nav aria-label="Notification filters" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', margin: '20px 0 14px' }}>
        {FILTERS.map((item) => <button type="button" aria-pressed={filter === item} onClick={() => setFilter(item)} key={item} style={{ ...buttonStyle, color: filter === item ? '#0F172A' : '#CBD5E1', background: filter === item ? '#38BDF8' : 'transparent', textTransform: 'capitalize' }}>{item}{item === 'unread' && notifications.unread ? ` (${notifications.unread})` : ''}</button>)}
      </nav>

      {notifications.loading && !notifications.items.length ? <LoadingState label="Loading notifications…" rows={6} /> : items.length ? items.map((item) => <NotificationItem
        key={item._id}
        item={item}
        archivedView={filter === 'archived'}
        onRead={(id) => act(() => notifications.markRead(id))}
        onArchive={(id) => act(() => notifications.archive(id))}
        onRestore={(id) => act(() => notifications.restore(id))}
        onPin={(id, pinned) => act(() => notifications.pin(id, pinned))}
        onDelete={(id) => act(() => notifications.remove(id))}
        onPriority={(id, priority) => act(() => notifications.setPriority(id, priority))}
      />) : <EmptyState title={`No ${filter === 'all' ? '' : filter} notifications`} message="Updates from connected Dream Wave modules will appear here." />}
    </div>
  </main>
}

const buttonStyle = { padding: '8px 12px', borderRadius: 9, border: '1px solid #334155', background: 'transparent', color: '#CBD5E1', cursor: 'pointer', font: 'inherit', fontSize: '.68rem' }
