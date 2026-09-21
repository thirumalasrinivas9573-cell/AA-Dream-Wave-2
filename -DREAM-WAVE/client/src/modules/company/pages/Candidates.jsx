import { useEffect, useMemo, useState } from 'react'
import CompanyPageHeader from '../components/CompanyPageHeader'
import { companyService } from '../services/api'

/** Candidate directory derived from real applications (no demo list). */
export default function Candidates() {
  const [items, setItems] = useState([])
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    companyService.applications.list({ limit: 200 })
      .then((r) => setItems(r.data.items || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [])

  const candidates = useMemo(() => {
    const map = new Map()
    items.forEach((a) => {
      const id = a.studentId?._id || a.studentId || a._id
      const key = String(id)
      if (!map.has(key)) {
        map.set(key, {
          id: key,
          name: a.studentId?.name || 'Candidate',
          email: a.studentId?.email || '',
          applications: [],
        })
      }
      map.get(key).applications.push(a)
    })
    return [...map.values()].filter((c) => {
      const hay = `${c.name} ${c.email}`.toLowerCase()
      return !q.trim() || hay.includes(q.trim().toLowerCase())
    })
  }, [items, q])

  return (
    <div>
      <CompanyPageHeader
        title="Candidates"
        subtitle="Unique applicants across jobs and internships."
        actions={<input className="company-input" style={{ width: 220 }} placeholder="Search candidates…" value={q} onChange={(e) => setQ(e.target.value)} />}
      />
      {loading ? <p style={{ color: '#94A3B8' }}>Loading…</p> : candidates.length === 0 ? (
        <div className="company-glass company-empty">No candidates yet — applications will appear here.</div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {candidates.map((c) => (
            <div key={c.id} className="company-glass">
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div>
                  <strong>{c.name}</strong>
                  <div style={{ fontSize: '0.85rem', color: '#94A3B8' }}>{c.email || 'No email'}</div>
                </div>
                <span className="company-badge">{c.applications.length} application(s)</span>
              </div>
              <div style={{ marginTop: 10, fontSize: '0.85rem' }}>
                {c.applications.map((a) => (
                  <div key={a._id} style={{ padding: '4px 0', borderBottom: '1px solid rgba(148,163,184,0.1)' }}>
                    {a.targetType} · <span className="company-badge">{a.status}</span>
                    {a.resumeUrl && <> · <a href={a.resumeUrl} target="_blank" rel="noreferrer" style={{ color: '#60A5FA' }}>Resume</a></>}
                    {a.coverLetter && <div style={{ color: '#94A3B8', marginTop: 2 }}>{a.coverLetter.slice(0, 140)}</div>}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
