import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import StudentLayout from '../layouts/StudentLayout'
import researchService from '@shared/services/researchService'
import { EmptyState, ErrorState, LoadingState } from '@shared/components/ui'

export default function Reports() {
  const [workspaces, setWorkspaces] = useState([])
  const [selectedId, setSelectedId] = useState('')
  const [form, setForm] = useState({ title: '', researchQuestion: '', description: '' })
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    setError('')
    try {
      const response = await researchService.list({ force: true })
      const items = response.items || []
      setWorkspaces(items)
      setSelectedId((current) => current || items.find((item) => item.reports?.length)?._id || items[0]?._id || '')
    } catch (err) {
      setError(err.userMessage || err.message || 'Failed to load reports.')
    } finally {
      setLoading(false)
    }
  }

  async function generate(e) {
    e.preventDefault()
    if (!form.title.trim() || !form.researchQuestion.trim()) return
    setGenerating(true)
    setError('')
    try {
      const createRes = await researchService.api.create({
        title: form.title.trim(),
        researchQuestion: form.researchQuestion.trim(),
        description: form.description.trim(),
      })
      const workspaceId = createRes.data?.workspace?._id || createRes.workspace?._id
      if (!workspaceId) throw new Error('Workspace was created, but no identifier was returned.')
      await researchService.api.collectSources(workspaceId, { query: form.researchQuestion.trim(), limit: 8 })
      await researchService.api.extractEvidence(workspaceId)
      await researchService.api.synthesize(workspaceId)
      await researchService.api.generateReport(workspaceId, { template: 'ACADEMIC_RESEARCH', title: form.title.trim() })
      setForm({ title: '', researchQuestion: '', description: '' })
      researchService.invalidate()
      await load()
      setSelectedId(workspaceId)
    } catch (err) {
      setError(err.response?.data?.message || err.userMessage || 'Report generation failed. Please try again.')
    } finally {
      setGenerating(false)
    }
  }

  const selected = useMemo(() => workspaces.find((item) => item._id === selectedId) || null, [workspaces, selectedId])
  const selectedReport = selected?.reports?.at(-1) || null

  return (
    <StudentLayout>
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1>📊 <span className="gradient-text">R&D Reports</span></h1>
            <p>Create source-grounded research workspaces and generate structured reports from evidence, not fake progress states.</p>
          </div>
          <Link className="btn btn-secondary btn-sm" to="/student/research">Open research workspace</Link>
        </div>
      </div>

      <div className="card card-purple" style={{ marginBottom: 20 }}>
        <div style={{ marginBottom: 14 }}>
          <h3 style={{ marginBottom: 4 }}>🧠 Generate Source-Grounded Report</h3>
          <p style={{ fontSize: '0.845rem' }}>This creates a real workspace, collects sources, extracts evidence, synthesizes findings, and only then generates a report.</p>
        </div>
        <form onSubmit={generate} className="research-form">
          <input className="input" value={form.title} onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))} placeholder="Report title" disabled={generating} />
          <input className="input" value={form.researchQuestion} onChange={(e) => setForm((prev) => ({ ...prev, researchQuestion: e.target.value }))} placeholder="Research question" disabled={generating} />
          <textarea className="input" value={form.description} onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))} placeholder="Optional scope, context, or source notes" rows={4} disabled={generating} />
          <button type="submit" className="btn btn-primary" disabled={generating} style={{ width: 'fit-content' }}>
            {generating ? 'Generating report…' : 'Generate report'}
          </button>
        </form>
        {error && <div className="alert alert-error" style={{ marginTop: 12 }}>⚠️ {error}</div>}
      </div>

      {loading ? <LoadingState label="Loading reports…" rows={6} />
      : error && !workspaces.length ? <ErrorState title="Reports unavailable" message={error} onRetry={load} />
      : workspaces.length === 0 ? (
        <EmptyState title="No reports yet" message="Create your first research-backed report to populate this workspace." />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 18, alignItems: 'flex-start' }} className="reports-layout">
          <div className="card" style={{ padding: 10, position: 'sticky', top: 20 }}>
            <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10, padding: '0 4px' }}>Workspaces ({workspaces.length})</div>
            {workspaces.map((item) => (
              <div key={item._id} onClick={() => setSelectedId(item._id)} style={{ padding: '9px 10px', borderRadius: 8, cursor: 'pointer', marginBottom: 3, background: selectedId === item._id ? 'rgba(139,92,246,0.12)' : 'transparent', borderLeft: selectedId === item._id ? '2px solid var(--purple)' : '2px solid transparent', transition: 'var(--t)' }}>
                <div style={{ fontWeight: 500, fontSize: '0.835rem', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{item.status} · {item.reports?.length || 0} reports</div>
              </div>
            ))}
          </div>

          {selected ? (
            <div>
              <div className="card card-purple" style={{ marginBottom: 14 }}>
                <h2 style={{ marginBottom: 5 }}>{selected.title}</h2>
                <p style={{ fontSize: '0.8rem', marginBottom: 10 }}>{selected.researchQuestion || 'No question recorded.'}</p>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <span className="badge badge-purple">📚 {selected.sources?.length || 0} Sources</span>
                  <span className="badge badge-blue">🧾 {selected.reports?.length || 0} Reports</span>
                  <span className="badge badge-green">📌 {selected.claims?.length || 0} Claims</span>
                </div>
              </div>

              {selectedReport?.sections?.length ? (
                <div className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
                    <strong>{selectedReport.title || 'Latest report'}</strong>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <a className="btn btn-secondary btn-sm" href={`/api/research/workspace/${selected._id}/reports/${selectedReport.reportId}/export`} target="_blank" rel="noreferrer">Export CSV</a>
                      <Link className="btn btn-ghost btn-sm" to={`/student/research/${selected._id}`}>Open workspace</Link>
                    </div>
                  </div>
                  {selectedReport.qualityIssues?.length > 0 && (
                    <div className="alert alert-error" style={{ marginBottom: 12 }}>
                      {selectedReport.qualityIssues.join(' ')}
                    </div>
                  )}
                  <div style={{ display: 'grid', gap: 12 }}>
                    {selectedReport.sections.map((section) => (
                      <article key={section.key} className="card" style={{ padding: 16 }}>
                        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 8 }}>{section.key}</div>
                        <h3 style={{ marginBottom: 8 }}>{section.title}</h3>
                        <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>{section.content}</p>
                      </article>
                    ))}
                  </div>
                </div>
              ) : (
                <EmptyState title="No report generated yet" message="Open the workspace to add sources or generate the first report." action={<Link className="btn btn-sm" to={`/student/research/${selected._id}`}>Open workspace</Link>} />
              )}
            </div>
          ) : (
            <div className="card"><div className="empty-state"><span className="icon">📊</span><p>Select a workspace from the left</p></div></div>
          )}
        </div>
      )}
    </StudentLayout>
  )
}
