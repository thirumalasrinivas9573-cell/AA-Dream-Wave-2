import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { companyApi } from '@shared/services/api'
import SeoHead from '../components/SeoHead'

export default function CompaniesCompare() {
  const [params] = useSearchParams()
  const ids = params.get('ids') || ''
  const [items, setItems] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!ids) {
      setError('Select at least two companies to compare')
      setLoading(false)
      return
    }
    companyApi.publicCompare(ids)
      .then((r) => setItems(r.data.items || []))
      .catch((err) => setError(err.response?.data?.message || 'Compare failed'))
      .finally(() => setLoading(false))
  }, [ids])

  const rows = [
    { label: 'Industry', get: (x) => x.company.industry || '—' },
    { label: 'Location', get: (x) => [x.company.contact?.city, x.company.contact?.state].filter(Boolean).join(', ') || '—' },
    { label: 'Founded', get: (x) => x.company.foundedYear || '—' },
    { label: 'Company size', get: (x) => x.company.companySize || '—' },
    { label: 'AI score', get: (x) => x.aiScore ?? x.company.stats?.aiScore ?? 0 },
    { label: 'Review rating', get: (x) => x.avgRating || 0 },
    { label: 'Open jobs', get: (x) => x.openJobs ?? 0 },
    { label: 'Open internships', get: (x) => x.openInternships ?? 0 },
    { label: 'Avg listed salary', get: (x) => x.avgSalary ? `₹${Number(x.avgSalary).toLocaleString()}` : '—' },
    { label: 'Benefits', get: (x) => (x.benefits || '—').slice(0, 120) },
    { label: 'Culture', get: (x) => (x.culture || '—').slice(0, 120) },
    { label: 'Growth', get: (x) => (x.growth || '—').slice(0, 120) },
    { label: 'Followers', get: (x) => x.company.stats?.followers ?? 0 },
    { label: 'Website', get: (x) => x.company.contact?.website || '—' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC', color: '#0F172A' }}>
      <SeoHead title="Compare Companies | Dream Wave" description="Compare jobs, internships, salary, benefits, culture, growth, and AI scores." canonical="/companies/compare" />
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 16px 60px' }}>
        <Link to="/companies" style={{ color: '#64748B', fontSize: '0.85rem' }}>← Companies</Link>
        <h1 style={{ margin: '10px 0', color: '#1E3A8A' }}>Compare companies</h1>
        <p style={{ color: '#64748B', marginBottom: 20 }}>Side-by-side metrics from live Dream Wave employer records only.</p>
        {error && <p role="alert" style={{ color: '#DC2626' }}>{error}</p>}
        {loading ? <p>Loading comparison…</p> : items.length >= 2 && (
          <div style={{ overflowX: 'auto', border: '1px solid #E2E8F0', borderRadius: 14, background: '#fff' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 640, fontSize: '0.88rem' }}>
              <thead>
                <tr>
                  <th style={th}>Metric</th>
                  {items.map((x) => (
                    <th key={x.company._id} style={th}>
                      <Link to={`/companies/${x.company.slug}`} style={{ color: '#2563EB' }}>{x.company.name}</Link>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.label}>
                    <td style={td}><strong>{row.label}</strong></td>
                    {items.map((x) => <td key={x.company._id + row.label} style={td}>{row.get(x)}</td>)}
                  </tr>
                ))}
                <tr>
                  <td style={td}><strong>Sample jobs</strong></td>
                  {items.map((x) => (
                    <td key={x.company._id + 'jobs'} style={td}>
                      {(x.jobs || []).slice(0, 4).map((j, i) => <div key={i}>{j.title}</div>) || '—'}
                    </td>
                  ))}
                </tr>
                <tr>
                  <td style={td}><strong>Sample internships</strong></td>
                  {items.map((x) => (
                    <td key={x.company._id + 'int'} style={td}>
                      {(x.internships || []).slice(0, 4).map((j, i) => <div key={i}>{j.title}</div>) || '—'}
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

const th = { textAlign: 'left', padding: '12px 14px', background: '#F1F5F9', borderBottom: '1px solid #E2E8F0', color: '#1E3A8A' }
const td = { padding: '10px 14px', borderBottom: '1px solid #E2E8F0', verticalAlign: 'top' }
