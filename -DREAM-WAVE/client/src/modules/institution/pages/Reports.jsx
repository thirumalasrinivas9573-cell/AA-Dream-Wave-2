import { useEffect, useState } from 'react'
import InstPageHeader from '../components/InstPageHeader'
import { institutionService } from '../services/api'
import { INSTITUTION_THEME } from '../theme'

export default function Reports() {
  const t = INSTITUTION_THEME
  const [report, setReport] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    institutionService.reports()
      .then((r) => setReport(r.data.report))
      .catch((err) => setError(err.response?.data?.message || 'Could not generate report'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const downloadJson = () => {
    if (!report) return
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `institution-report-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const s = report?.summaries || {}

  return (
    <div>
      <InstPageHeader
        title="Reports"
        subtitle="Operational snapshot generated from live institution records."
        actions={(
          <>
            <button type="button" className="inst-btn" onClick={load}>Regenerate</button>
            <button type="button" className="inst-btn inst-btn-primary" onClick={downloadJson} disabled={!report}>Download JSON</button>
          </>
        )}
      />
      {error && <div role="alert" style={{ color: '#DC2626' }}>{error}</div>}
      {loading ? <p style={{ color: t.muted }}>Generating report…</p> : report && (
        <>
          <p style={{ color: t.muted, fontSize: '0.85rem' }}>
            {report.institution?.name} · Generated {new Date(report.generatedAt).toLocaleString()}
          </p>
          <div className="inst-grid-stats">
            {Object.entries(s).map(([k, v]) => (
              <div key={k} className="inst-card inst-stat">
                <div className="inst-stat-value">{v}</div>
                <div className="inst-stat-label">{k}</div>
              </div>
            ))}
          </div>
          <div className="inst-grid-2">
            {[
              ['Recent students', report.students],
              ['Faculty', report.faculty],
              ['Courses', report.courses],
              ['Admissions', report.admissions],
              ['Placements', report.placements],
              ['Scholarships', report.scholarships],
            ].map(([label, rows]) => (
              <div key={label} className="inst-card">
                <h3 style={{ marginTop: 0 }}>{label}</h3>
                {(rows || []).length === 0 ? <p className="inst-empty" style={{ padding: 8 }}>None</p> : (
                  <ul style={{ margin: 0, paddingLeft: 18, fontSize: '0.85rem' }}>
                    {(rows || []).slice(0, 8).map((r) => (
                      <li key={r._id}>{r.name || r.title || r.applicantName || r.company || r._id}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
