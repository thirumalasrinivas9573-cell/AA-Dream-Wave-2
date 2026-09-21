import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@shared/context/AuthContext'
import { companyService } from '../services/api'
import CompanyPageHeader, { CompanyMetricGrid } from '../components/CompanyPageHeader'
import { companyPath } from '../theme'

export default function CompanyDashboard() {
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        await companyService.bootstrap({ name: user?.organizationName }).catch(() => {})
        const res = await companyService.dashboard()
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
  const company = data?.company

  return (
    <div>
      <CompanyPageHeader
        badge="Executive overview"
        title={`${company?.name || user?.organizationName || 'Company'} Dashboard`}
        subtitle="Live hiring pipeline and workforce metrics from your company database."
        actions={company?.slug ? <a className="company-btn company-btn-secondary" href={`/companies/${company.slug}`} style={{ textDecoration: 'none' }}>Public profile</a> : null}
      />
      {error && <div role="alert" style={{ color: '#F87171' }}>{error}</div>}
      {loading ? <p style={{ color: '#94A3B8' }}>Loading dashboard…</p> : (
        <>
          <CompanyMetricGrid metrics={[
            { label: 'Profile completion', value: `${s.profileCompletion ?? 0}%` },
            { label: 'Active jobs', value: String(s.jobs ?? 0) },
            { label: 'Active internships', value: String(s.internships ?? 0) },
            { label: 'Applications', value: String(s.applications ?? 0) },
            { label: 'Interviews scheduled', value: String(s.interviews ?? 0) },
            { label: 'Offers released', value: String(s.offers ?? 0) },
            { label: 'Employees', value: String(s.employees ?? 0) },
            { label: 'Followers', value: String(s.followers ?? 0) },
            { label: 'Company rating', value: String(s.rating ?? 0) },
            { label: 'AI company score', value: String(s.aiScore ?? 0) },
          ]} />

          <div className="company-glass" style={{ marginBottom: 16 }}>
            <h3 style={{ margin: '0 0 12px', color: '#93C5FD' }}>Quick actions</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {(data?.quickActions || []).map((a) => (
                <Link key={a.to} to={companyPath(a.to)} className="company-btn company-btn-primary" style={{ textDecoration: 'none' }}>{a.label}</Link>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 14 }}>
            <div className="company-glass">
              <h3 style={{ marginTop: 0, color: '#93C5FD' }}>Recent notifications</h3>
              {(data?.notifications || []).length === 0 ? (
                <p className="company-empty" style={{ padding: 8 }}>No recent activity</p>
              ) : data.notifications.map((n, i) => (
                <div key={i} style={{ padding: '8px 0', borderBottom: '1px solid rgba(148,163,184,0.12)', fontSize: '0.85rem' }}>
                  <span className="company-badge" style={{ marginRight: 8 }}>{n.type}</span>
                  {n.text}
                </div>
              ))}
            </div>
            <div className="company-glass">
              <h3 style={{ marginTop: 0, color: '#93C5FD' }}>Status</h3>
              <p style={{ fontSize: '0.9rem' }}>Account: <strong>{company?.status}</strong></p>
              <p style={{ fontSize: '0.9rem' }}>Public: <strong>{company?.isPublic !== false ? 'Visible' : 'Hidden'}</strong></p>
              {company?.slug && <p style={{ fontSize: '0.85rem', color: '#94A3B8' }}>/companies/{company.slug}</p>}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
