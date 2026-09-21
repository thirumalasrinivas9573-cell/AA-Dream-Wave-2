import { useEffect, useState } from 'react'
import CompanyPageHeader from '../components/CompanyPageHeader'
import { companyService } from '../services/api'

export default function Reports() {
  const [report, setReport] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    companyService.reports()
      .then((r) => setReport(r.data.report))
      .catch((err) => setError(err.response?.data?.message || 'Report failed'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const download = () => {
    if (!report) return
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `company-report-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const s = report?.summaries || {}

  return (
    <div>
      <CompanyPageHeader
        title="Reports"
        subtitle="Hiring, applications, interviews, and internship operational reports."
        actions={(
          <>
            <button type="button" className="company-btn company-btn-secondary" onClick={load}>Regenerate</button>
            <button type="button" className="company-btn company-btn-primary" onClick={download} disabled={!report}>Download JSON</button>
          </>
        )}
      />
      {error && <div role="alert" style={{ color: '#F87171' }}>{error}</div>}
      {loading ? <p style={{ color: '#94A3B8' }}>Generating…</p> : report && (
        <>
          <p style={{ color: '#94A3B8', fontSize: '0.85rem' }}>{report.company?.name} · {new Date(report.generatedAt).toLocaleString()}</p>
          <div className="company-stat-grid">
            {Object.entries(s).map(([k, v]) => (
              <div key={k} className="company-glass" style={{ padding: 14 }}>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#60A5FA' }}>{v}</div>
                <div style={{ fontSize: '0.78rem', color: '#94A3B8' }}>{k}</div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
