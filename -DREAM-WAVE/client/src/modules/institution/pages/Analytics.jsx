import { useEffect, useState } from 'react'
import InstPageHeader from '../components/InstPageHeader'
import InstStatCard from '../components/InstStatCard'
import { institutionService } from '../services/api'
import { INSTITUTION_THEME } from '../theme'

function Bar({ label, value, max = 100, color = '#2563EB' }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: 4 }}>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
      <div style={{ height: 8, background: '#E2E8F0', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 99 }} />
      </div>
    </div>
  )
}

export default function Analytics() {
  const t = INSTITUTION_THEME
  const [a, setA] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    institutionService.analytics()
      .then((r) => setA(r.data.analytics))
      .catch((err) => setError(err.response?.data?.message || 'Analytics unavailable'))
      .finally(() => setLoading(false))
  }, [])

  const admissionMax = Math.max(1, ...(a?.admissions || []).map((x) => x.count))
  const courseMax = Math.max(1, ...(a?.popularCourses || []).map((c) => c.enrolled || 0))

  return (
    <div>
      <InstPageHeader
        title="Analytics"
        subtitle="Admissions, visitors, course popularity, placements, reviews, and AI institution score — derived from live data."
      />
      {error && <div role="alert" style={{ color: '#DC2626' }}>{error}</div>}
      {loading ? <p style={{ color: t.muted }}>Loading analytics…</p> : a && (
        <>
          <div className="inst-grid-stats">
            <InstStatCard label="Visitors" value={a.visitors || 0} />
            <InstStatCard label="Followers" value={a.followers || 0} />
            <InstStatCard label="Applications" value={a.applicationsCount || 0} />
            <InstStatCard label="Course views" value={a.courseViews || 0} />
            <InstStatCard label="Gallery views" value={a.galleryViews || 0} />
            <InstStatCard label="Placement views" value={a.placementViews || 0} />
            <InstStatCard label="Student interest" value={a.studentInterest || 0} />
            <InstStatCard label="Avg rating" value={a.avgRating || 0} accent={t.emerald} />
            <InstStatCard label="Placement %" value={a.placementPct || 0} />
            <InstStatCard label="AI score" value={a.aiInstitutionScore || 0} accent={t.accentMid} />
            <InstStatCard label="Promo views" value={a.engagement?.views || 0} />
          </div>

          <div className="inst-grid-2">
            <div className="inst-card">
              <h3 style={{ marginTop: 0 }}>Admissions by status</h3>
              {(a.admissions || []).length === 0 ? <p className="inst-empty" style={{ padding: 8 }}>No admission data</p> : (
                a.admissions.map((row) => (
                  <Bar key={row._id || 'none'} label={row._id || 'unknown'} value={row.count} max={admissionMax} color="#1E3A5F" />
                ))
              )}
            </div>
            <div className="inst-card">
              <h3 style={{ marginTop: 0 }}>Course popularity (enrollment)</h3>
              {(a.popularCourses || []).length === 0 ? <p className="inst-empty" style={{ padding: 8 }}>No courses</p> : (
                a.popularCourses.slice(0, 8).map((c) => (
                  <Bar key={c._id} label={c.title} value={c.enrolled || 0} max={courseMax} color="#2563EB" />
                ))
              )}
            </div>
            <div className="inst-card">
              <h3 style={{ marginTop: 0 }}>Top packages</h3>
              {(a.placements || []).length === 0 ? <p className="inst-empty" style={{ padding: 8 }}>No placements</p> : (
                a.placements.slice(0, 8).map((p) => (
                  <div key={p._id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--inst-border)', fontSize: '0.85rem' }}>
                    <span>{p.company} · {p.role}</span>
                    <strong>₹{Number(p.package || 0).toLocaleString()}</strong>
                  </div>
                ))
              )}
            </div>
            <div className="inst-card">
              <h3 style={{ marginTop: 0 }}>Student reviews</h3>
              {(a.reviews || []).length === 0 ? <p className="inst-empty" style={{ padding: 8 }}>No approved reviews yet</p> : (
                a.reviews.slice(0, 6).map((r) => (
                  <div key={r._id} style={{ padding: '8px 0', borderBottom: '1px solid var(--inst-border)', fontSize: '0.85rem' }}>
                    <strong>{r.rating}/5</strong> — {r.comment || r.text || 'Review'}
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
