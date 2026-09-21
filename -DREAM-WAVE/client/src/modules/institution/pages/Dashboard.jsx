import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@shared/context/AuthContext'
import { institutionService } from '../services/api'
import InstStatCard from '../components/InstStatCard'
import InstPageHeader from '../components/InstPageHeader'
import { INSTITUTION_THEME, institutionPath } from '../theme'

export default function InstitutionDashboard() {
  const { user } = useAuth()
  const t = INSTITUTION_THEME
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        await institutionService.bootstrap({ name: user?.organizationName }).catch(() => {})
        const res = await institutionService.dashboard()
        if (!cancelled) setData(res.data)
      } catch (err) {
        if (!cancelled) setError(err.response?.data?.message || 'Could not load dashboard')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [user])

  const s = data?.stats || {}
  const inst = data?.institution

  return (
    <div>
      <InstPageHeader
        title={`${inst?.name || user?.organizationName || 'Institution'} Dashboard`}
        subtitle="Live campus operations — counts from your institution database only."
        actions={inst?.slug ? (
          <a href={`/institutions/${inst.slug}`} className="inst-btn" style={{ textDecoration: 'none' }}>Public profile</a>
        ) : null}
      />

      {inst && (
        <p style={{ margin: '-8px 0 18px', fontSize: '0.85rem', color: t.muted }}>
          Status:{' '}
          <span className={inst.status === 'approved' ? 'inst-badge inst-badge-ok' : 'inst-badge inst-badge-warn'}>
            {inst.status}
          </span>
          {inst.slug && <> · /i/{inst.slug}</>}
        </p>
      )}

      {error && <div role="alert" style={{ color: '#DC2626', marginBottom: 12 }}>{error}</div>}
      {loading ? <p style={{ color: t.muted }}>Loading dashboard…</p> : (
        <>
          <div className="inst-grid-stats">
            <InstStatCard label="Students" value={s.students} to="students" />
            <InstStatCard label="Departments" value={s.departments} to="departments" />
            <InstStatCard label="Courses" value={s.courses} to="courses" />
            <InstStatCard label="Faculty" value={s.faculty} to="faculty" />
            <InstStatCard label="Admissions" value={s.admissions} to="admissions" accent={t.emerald} />
            <InstStatCard label="Placements" value={s.placements} to="placements" />
            <InstStatCard label="Library books" value={s.library} />
            <InstStatCard label="Events" value={s.events} to="events" />
            <InstStatCard label="Announcements" value={s.announcements} to="announcements" />
            <InstStatCard label="Gallery" value={s.gallery} to="gallery" />
            <InstStatCard label="Visitors" value={s.visitors} />
            <InstStatCard label="Rating" value={s.rating ?? 0} accent={t.accentMid} />
          </div>

          <div className="inst-card" style={{ marginBottom: 18 }}>
            <h3 style={{ margin: '0 0 12px' }}>Quick actions</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {(data?.quickActions || []).map((a) => (
                <Link key={a.to} to={institutionPath(a.to)} className="inst-btn inst-btn-primary" style={{ textDecoration: 'none' }}>
                  {a.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="inst-grid-2">
            <div className="inst-card">
              <h3 style={{ margin: '0 0 12px' }}>Recent admissions</h3>
              {(data?.recentAdmissions || []).length === 0 ? (
                <p className="inst-empty" style={{ padding: 12 }}>No admission records yet</p>
              ) : data.recentAdmissions.map((a) => (
                <div key={a._id} style={{ padding: '8px 0', borderBottom: '1px solid var(--inst-border)', fontSize: '0.85rem' }}>
                  <strong>{a.applicantName}</strong> — {a.applicantEmail}
                  <span className="inst-badge" style={{ marginLeft: 8 }}>{a.status}</span>
                </div>
              ))}
            </div>
            <div className="inst-card">
              <h3 style={{ margin: '0 0 12px' }}>Upcoming events</h3>
              {(data?.recentEvents || []).length === 0 ? (
                <p className="inst-empty" style={{ padding: 12 }}>No events scheduled</p>
              ) : data.recentEvents.map((ev) => (
                <div key={ev._id} style={{ padding: '8px 0', borderBottom: '1px solid var(--inst-border)', fontSize: '0.85rem' }}>
                  {ev.title} — {ev.startDate ? new Date(ev.startDate).toLocaleDateString() : 'TBD'}
                </div>
              ))}
            </div>
            <div className="inst-card">
              <h3 style={{ margin: '0 0 12px' }}>Announcements</h3>
              {(data?.recentAnnouncements || []).length === 0 ? (
                <p className="inst-empty" style={{ padding: 12 }}>No announcements published</p>
              ) : data.recentAnnouncements.map((n) => (
                <div key={n._id} style={{ padding: '8px 0', borderBottom: '1px solid var(--inst-border)', fontSize: '0.85rem' }}>
                  {n.title}
                </div>
              ))}
            </div>
            <div className="inst-card">
              <h3 style={{ margin: '0 0 12px' }}>Placement snapshot</h3>
              <div style={{ display: 'grid', gap: 8, fontSize: '0.9rem' }}>
                <div>Highest package: <strong>₹{Number(s.highestPackage || 0).toLocaleString()}</strong></div>
                <div>Average package: <strong>₹{Number(s.averagePackage || 0).toLocaleString()}</strong></div>
                <div>Placement rate: <strong>{s.placementRate ?? 0}%</strong></div>
                <Link to={institutionPath('placements')} className="inst-btn" style={{ width: 'fit-content', textDecoration: 'none', marginTop: 6 }}>Manage placements</Link>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
