import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { PORTAL_LOGIN } from '../../auth/portalSession'
import { Button, Card, Dialog, EmptyState, ErrorState, LoadingState } from '../ui'
import './device-sessions.css'

export default function DeviceSessions() {
  const { user, listSessions, revokeSession, revokeAllSessions, logout } = useAuth()
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [confirmAction, setConfirmAction] = useState(null)

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const { data } = await listSessions()
      setSessions(data.sessions || [])
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load sessions')
    } finally {
      setLoading(false)
    }
  }, [listSessions])

  useEffect(() => { load() }, [load])

  const onRevoke = async (id, isCurrent) => {
    if (isCurrent) {
      setConfirmAction({ type: 'current', id })
      return
    }
    await revokeSession(id)
    await load()
  }

  const onRevokeAll = async () => {
    setConfirmAction({ type: 'all' })
  }

  const confirmRevoke = async () => {
    const action = confirmAction
    setConfirmAction(null)
    if (action?.type === 'all') {
      await revokeAllSessions()
      await logout(false)
    } else {
      await logout(false)
    }
    window.location.assign(PORTAL_LOGIN[user?.role] || '/')
  }

  return (
    <Card className="device-sessions">
      <h3>Device sessions</h3>
      {loading && <LoadingState label="Loading sessions…" rows={2} />}
      {error && <ErrorState message={error} onRetry={load} />}
      {!loading && sessions.length === 0 && (
        <EmptyState title="No active sessions" message="Your signed-in devices will appear here." />
      )}
      <div className="device-sessions__list">
        {sessions.map((s) => (
          <div key={s.id} className="device-sessions__row">
            <div>
              <div className="device-sessions__name">
                {s.device || 'Device'} · {s.browser || 'Browser'}
                {s.current ? ' · This device' : ''}
              </div>
              <div className="device-sessions__meta">
                Login {s.loginAt ? new Date(s.loginAt).toLocaleString() : '—'}
                {' · '}
                Last activity {s.lastActivity || s.lastUsedAt
                  ? new Date(s.lastActivity || s.lastUsedAt).toLocaleString()
                  : '—'}
                {s.remember ? ' · Remembered' : ' · Short session'}
              </div>
            </div>
            <Button variant="ghost" className="btn-sm" onClick={() => onRevoke(s.id, s.current)}>Revoke</Button>
          </div>
        ))}
      </div>
      {sessions.length > 1 && (
        <Button variant="secondary" className="btn-sm device-sessions__all" onClick={onRevokeAll}>
          Sign out all devices
        </Button>
      )}
      <Dialog
        open={Boolean(confirmAction)}
        title={confirmAction?.type === 'all' ? 'Sign out all devices?' : 'Sign out this device?'}
        description="You will need to sign in again."
        onClose={() => setConfirmAction(null)}
        actions={(
          <>
            <Button variant="ghost" onClick={() => setConfirmAction(null)}>Cancel</Button>
            <Button variant="danger" onClick={confirmRevoke}>Sign out</Button>
          </>
        )}
      />
    </Card>
  )
}
