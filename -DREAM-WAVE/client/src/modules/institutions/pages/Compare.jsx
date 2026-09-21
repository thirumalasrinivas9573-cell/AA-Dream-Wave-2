import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { institutionApi } from '@shared/services/api'
import SeoHead from '../components/SeoHead'

export default function InstitutionsCompare() {
  const [params] = useSearchParams()
  const ids = params.get('ids') || ''
  const [items, setItems] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!ids) {
      setError('Select at least two institutions to compare')
      setLoading(false)
      return
    }
    institutionApi.publicCompare(ids)
      .then((r) => setItems(r.data.items || []))
      .catch((err) => setError(err.response?.data?.message || 'Compare failed'))
      .finally(() => setLoading(false))
  }, [ids])

  const rows = [
    { label: 'Type', get: (x) => x.institution.institutionType || '—' },
    { label: 'Location', get: (x) => [x.institution.contact?.city, x.institution.contact?.state].filter(Boolean).join(', ') || '—' },
    { label: 'Established', get: (x) => x.institution.establishedYear || '—' },
    { label: 'AI Score', get: (x) => x.aiScore ?? x.institution.stats?.aiRating ?? 0 },
    { label: 'Placement %', get: (x) => `${x.institution.stats?.placementRate ?? 0}%` },
    { label: 'Highest package', get: (x) => `₹${Number(x.institution.stats?.highestPackage || 0).toLocaleString()}` },
    { label: 'Average package', get: (x) => `₹${Number(x.institution.stats?.averagePackage || 0).toLocaleString()}` },
    { label: 'Avg course fees', get: (x) => `₹${Number(x.avgFee || 0).toLocaleString()}` },
    { label: 'Courses', get: (x) => (x.courses || []).map((c) => c.title).slice(0, 5).join(', ') || '—' },
    { label: 'Faculty count', get: (x) => x.facultyCount ?? 0 },
    { label: 'Hostel', get: (x) => (x.hostel ? 'Available' : 'Not listed') },
    { label: 'Campus library', get: (x) => x.campusSummary?.library || '—' },
    { label: 'Sports', get: (x) => x.campusSummary?.sports || '—' },
    { label: 'Followers', get: (x) => x.institution.stats?.followers ?? 0 },
    { label: 'Visitors', get: (x) => x.institution.stats?.visitors ?? 0 },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', color: '#0F172A' }}>
      <SeoHead title="Compare Institutions | Dream Wave" description="Compare placements, fees, courses, campus, hostel, faculty, and AI scores." canonical="/institutions/compare" />
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 16px 60px' }}>
        <Link to="/institutions" style={{ color: '#64748B', fontSize: '0.85rem' }}>← Institutions</Link>
        <h1 style={{ margin: '10px 0', color: '#1E3A5F' }}>Compare institutions</h1>
        <p style={{ color: '#64748B', marginBottom: 20 }}>Side-by-side metrics from live Dream Wave records only.</p>
        {error && <p role="alert" style={{ color: '#DC2626' }}>{error}</p>}
        {loading ? <p>Loading comparison…</p> : items.length >= 2 && (
          <div style={{ overflowX: 'auto', border: '1px solid #E2E8F0', borderRadius: 14, background: '#fff' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 640, fontSize: '0.88rem' }}>
              <thead>
                <tr>
                  <th style={th}>Metric</th>
                  {items.map((x) => (
                    <th key={x.institution._id} style={th}>
                      <Link to={`/institutions/${x.institution.slug}`} style={{ color: '#2563EB' }}>{x.institution.name}</Link>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.label}>
                    <td style={td}><strong>{row.label}</strong></td>
                    {items.map((x) => <td key={x.institution._id + row.label} style={td}>{row.get(x)}</td>)}
                  </tr>
                ))}
                <tr>
                  <td style={td}><strong>Top recruiters / packages</strong></td>
                  {items.map((x) => (
                    <td key={x.institution._id + 'pl'} style={td}>
                      {(x.placements || []).slice(0, 3).map((p) => (
                        <div key={p._id}>{p.company} — ₹{p.package}</div>
                      )) || '—'}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

const th = { textAlign: 'left', padding: '12px 14px', background: '#F1F5F9', borderBottom: '1px solid #E2E8F0', color: '#1E3A5F' }
const td = { padding: '10px 14px', borderBottom: '1px solid #E2E8F0', verticalAlign: 'top' }
