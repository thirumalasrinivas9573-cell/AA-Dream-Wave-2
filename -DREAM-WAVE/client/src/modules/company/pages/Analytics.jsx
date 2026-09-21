import { useEffect, useState } from 'react'
import CompanyPageHeader, { CompanyMetricGrid } from '../components/CompanyPageHeader'
import { companyService } from '../services/api'

function Bar({ label, value, max = 100 }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: 4 }}>
        <span>{label}</span><strong>{value}</strong>
      </div>
      <div style={{ height: 8, background: 'rgba(148,163,184,0.2)', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: 'linear-gradient(90deg,#1D4ED8,#60A5FA)' }} />
      </div>
    </div>
  )
}

export default function Analytics() {
  const [a, setA] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    companyService.analytics()
      .then((r) => setA(r.data.analytics))
      .catch((err) => setError(err.response?.data?.message || 'Analytics unavailable'))
      .finally(() => setLoading(false))
  }, [])

  const appMax = Math.max(1, ...(a?.applications || []).map((x) => x.count))

  return (
    <div>
      <CompanyPageHeader title="Analytics" subtitle="Applications, hiring rate, job views, followers, engagement, and AI company score." />
      {error && <div role="alert" style={{ color: '#F87171' }}>{error}</div>}
      {loading ? <p style={{ color: '#94A3B8' }}>Loading…</p> : a && (
        <>
          <CompanyMetricGrid metrics={[
            { label: 'Visitors', value: String(a.visitors || 0) },
            { label: 'Followers', value: String(a.followers || 0) },
            { label: 'Hiring rate', value: `${a.hiringRate || 0}%` },
            { label: 'Job views', value: String(a.jobViews || 0) },
            { label: 'Website clicks', value: String(a.websiteClicks || 0) },
            { label: 'Student engagement', value: String(a.studentEngagement || 0) },
            { label: 'Avg rating', value: String(a.avgRating || 0) },
            { label: 'AI company score', value: String(a.aiCompanyScore || 0) },
          ]} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 14 }}>
            <div className="company-glass">
              <h3 style={{ marginTop: 0, color: '#93C5FD' }}>Applications by status</h3>
              {(a.applications || []).length === 0 ? <p className="company-empty" style={{ padding: 8 }}>No data</p> : (
                a.applications.map((row) => <Bar key={row._id || 'x'} label={row._id || 'unknown'} value={row.count} max={appMax} />)
              )}
            </div>
            <div className="company-glass">
              <h3 style={{ marginTop: 0, color: '#93C5FD' }}>Top jobs</h3>
              {(a.topJobs || []).length === 0 ? <p className="company-empty" style={{ padding: 8 }}>No jobs</p> : (
                a.topJobs.slice(0, 8).map((j) => (
                  <div key={j._id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(148,163,184,0.12)', fontSize: '0.85rem' }}>
                    <span>{j.title}</span><strong>{j.applicationsCount || 0} apps</strong>
                  </div>
                ))
              )}
            </div>
            <div className="company-glass">
              <h3 style={{ marginTop: 0, color: '#93C5FD' }}>Internship performance</h3>
              {(a.internships || []).length === 0 ? <p className="company-empty" style={{ padding: 8 }}>No internships</p> : (
                a.internships.slice(0, 8).map((i) => (
                  <div key={i._id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid rgba(148,163,184,0.12)', fontSize: '0.85rem' }}>
                    <span>{i.title}</span><strong>{i.applicationsCount || 0} apps</strong>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
