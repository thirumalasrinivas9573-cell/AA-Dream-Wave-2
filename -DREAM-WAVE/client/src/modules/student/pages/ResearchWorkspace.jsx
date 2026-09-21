import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ErrorState, EmptyState, LoadingState } from '@shared/components/ui'
import StudentLayout from '../layouts/StudentLayout'
import researchService from '@shared/services/researchService'
import '../styles/research.css'

const TABS = ['overview', 'intelligence', 'sources', 'chat', 'notes', 'claims', 'synthesis', 'report']

export default function ResearchWorkspace() {
  const { id } = useParams()
  const [tab, setTab] = useState('overview')
  const [workspace, setWorkspace] = useState(null)
  const [dashboard, setDashboard] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [sourceForm, setSourceForm] = useState({ title: '', excerpt: '', url: '', author: '', sourceType: 'WEB_SOURCE', authority: 'USER_PROVIDED' })
  const [collectQuery, setCollectQuery] = useState('')
  const [noteForm, setNoteForm] = useState({ content: '', contentType: 'USER_NOTE' })
  const [chatQ, setChatQ] = useState('')
  const [chatResult, setChatResult] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [workspaceRes, dashboardRes] = await Promise.all([
        researchService.workspace(id, { force: true }),
        researchService.api.dashboard(id),
      ])
      setWorkspace(workspaceRes.workspace)
      setDashboard(dashboardRes.data?.dashboard || dashboardRes.dashboard)
    } catch (err) {
      setError(err.userMessage || err.message || 'Failed to load workspace.')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { load() }, [load])
  const report = workspace?.reports?.at(-1) || null
  const sourceCount = workspace?.sources?.length || 0
  const contradictions = workspace?.synthesis?.contradictions || []
  const qualityIssues = report?.qualityIssues || []
  const claimRows = workspace?.claims || []
  const timeline = useMemo(() => (workspace?.timeline || []).slice().reverse().slice(0, 12), [workspace])

  async function addSource(e) {
    e.preventDefault()
    setBusy(true)
    try {
      await researchService.api.addSource(id, sourceForm)
      setSourceForm({ title: '', excerpt: '', url: '', author: '', sourceType: 'WEB_SOURCE', authority: 'USER_PROVIDED' })
      researchService.invalidate()
      await load()
    } catch (err) {
      setError(err.userMessage || err.message)
    } finally {
      setBusy(false)
    }
  }

  async function collectSources(e) {
    e.preventDefault()
    setBusy(true)
    try {
      await researchService.api.collectSources(id, { query: collectQuery.trim() || workspace?.researchQuestion, limit: 8 })
      setCollectQuery('')
      researchService.invalidate()
      await load()
    } catch (err) {
      setError(err.userMessage || err.message)
    } finally {
      setBusy(false)
    }
  }

  async function addNote(e) {
    e.preventDefault()
    setBusy(true)
    try {
      await researchService.api.addNote(id, noteForm)
      setNoteForm({ content: '', contentType: 'USER_NOTE' })
      researchService.invalidate()
      await load()
    } catch (err) {
      setError(err.userMessage || err.message)
    } finally {
      setBusy(false)
    }
  }

  async function askChat(e) {
    e.preventDefault()
    setBusy(true)
    try {
      const { data } = await researchService.api.chat(id, { question: chatQ })
      setChatResult(data)
    } catch (err) {
      setError(err.userMessage || err.message)
    } finally {
      setBusy(false)
    }
  }

  async function extractEvidence() {
    setBusy(true)
    try {
      await researchService.api.extractEvidence(id)
      researchService.invalidate()
      await load()
    } catch (err) {
      setError(err.userMessage || err.message)
    } finally {
      setBusy(false)
    }
  }

  async function runSynthesis() {
    setBusy(true)
    try {
      await researchService.api.synthesize(id)
      researchService.invalidate()
      await load()
    } catch (err) {
      setError(err.userMessage || err.message)
    } finally {
      setBusy(false)
    }
  }

  async function generateReport() {
    setBusy(true)
    try {
      await researchService.api.generateReport(id, {
        template: 'ACADEMIC_RESEARCH',
        title: workspace?.title,
      })
      researchService.invalidate()
      await load()
    } catch (err) {
      setError(err.userMessage || err.message)
    } finally {
      setBusy(false)
    }
  }

  async function reviewReport() {
    if (!report?.reportId) return
    setBusy(true)
    try {
      await researchService.api.reviewReport(id, report.reportId)
      researchService.invalidate()
      await load()
    } catch (err) {
      setError(err.userMessage || err.message)
    } finally {
      setBusy(false)
    }
  }

  async function approveReport() {
    if (!report?.reportId) return
    setBusy(true)
    try {
      await researchService.api.approveReport(id, report.reportId)
      researchService.invalidate()
      await load()
    } catch (err) {
      setError(err.userMessage || err.message)
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return <StudentLayout><div className="research-shell"><LoadingState label="Loading research workspace…" rows={8} /></div></StudentLayout>
  }

  if (error && !workspace) {
    return <StudentLayout><ErrorState title="Workspace unavailable" message={error} onRetry={load} /></StudentLayout>
  }

  return (
    <StudentLayout>
      <div className="research-shell">
        <nav className="research-breadcrumb"><Link to="/student/research">Research</Link> / <span>{workspace?.title}</span></nav>
        <header className="research-project-header">
          <div>
            <h1>{workspace?.title}</h1>
            {workspace?.researchQuestion && <p>{workspace.researchQuestion}</p>}
            <span className="research-status">{workspace?.status}</span>
            {dashboard?.reports?.length > 0 && <span className="research-badge">{dashboard.reports.length} report version(s)</span>}
          </div>
          <div className="research-header-actions">
            <button type="button" className="btn btn-secondary" onClick={extractEvidence} disabled={busy || !sourceCount}>Extract evidence</button>
            <button type="button" className="btn btn-secondary" onClick={runSynthesis} disabled={busy || !sourceCount}>Run synthesis</button>
            <button type="button" className="btn btn-primary" onClick={generateReport} disabled={busy || !sourceCount}>Generate report</button>
          </div>
        </header>

        <div className="research-tabs" role="tablist" aria-label="Research sections">
          {TABS.map((item) => (
            <button key={item} type="button" role="tab" aria-selected={tab === item} className={tab === item ? 'is-active' : ''} onClick={() => setTab(item)}>
              {item.charAt(0).toUpperCase() + item.slice(1)}
            </button>
          ))}
        </div>

        {error && <p className="research-error" role="alert">{error}</p>}

        {tab === 'overview' && (
          <section className="research-panel">
            <p>{workspace?.description || 'Add sources, run synthesis, and generate a structured report from evidence-backed material.'}</p>
            {dashboard?.plan?.length > 0 && (
              <ol className="research-plan-list">
                {dashboard.plan.map((step) => <li key={step.order}><strong>{step.step}</strong><span>{step.agentId}</span></li>)}
              </ol>
            )}
            <div className="research-intel-grid">
              <div><strong>{sourceCount}</strong><span>Sources</span></div>
              <div><strong>{workspace?.evidence?.length || 0}</strong><span>Evidence</span></div>
              <div><strong>{claimRows.length}</strong><span>Claims</span></div>
              <div><strong>{workspace?.reports?.length || 0}</strong><span>Reports</span></div>
            </div>
            {timeline.length > 0 && (
              <>
                <h3>Recent activity</h3>
                <ul className="research-note-list">
                  {timeline.map((item) => (
                    <li key={`${item.event}-${item.timestamp}`}>
                      <span className="research-badge">{item.event}</span>
                      <strong>{item.description}</strong>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>
        )}

        {tab === 'intelligence' && (
          <section className="research-panel research-intelligence">
            {!dashboard ? <LoadingState label="Analyzing research workspace…" rows={4} /> : (
              <>
                <div className="research-intel-grid">
                  <div><strong>Lifecycle</strong><span>{dashboard.status}</span></div>
                  <div><strong>Sources</strong><span>{dashboard.sourceCount}</span></div>
                  <div><strong>Evidence</strong><span>{dashboard.evidenceCount}</span></div>
                  <div><strong>Claims</strong><span>{dashboard.claimCount}</span></div>
                </div>

                <h3>Next best action</h3>
                <ul className="research-action-list">
                  {dashboard.plan?.map((item) => (
                    <li key={`${item.order}-${item.step}`}><strong>Step {item.order}</strong><span>{item.step}</span></li>
                  ))}
                </ul>

                <h3>Potential research gaps</h3>
                {dashboard.gaps.length ? (
                  <ul className="research-gap-list">
                    {dashboard.gaps.map((gap) => (
                      <li key={gap.label}>
                        <span className="research-badge">POTENTIAL RESEARCH GAP</span>
                        <strong>{gap}</strong>
                      </li>
                    ))}
                  </ul>
                ) : <p>No obvious gaps detected from current workspace data.</p>}

                <h3>Potential conflicts</h3>
                {dashboard.contradictions.length ? (
                  <ul className="research-gap-list">
                    {dashboard.contradictions.map((item, index) => (
                      <li key={`${item.sourceA}-${item.sourceB}-${index}`}>
                        <span className="research-badge">POTENTIAL CONFLICT</span>
                        <p>{item.description}</p>
                      </li>
                    ))}
                  </ul>
                ) : <p>No potential claim conflicts detected.</p>}
              </>
            )}
            <button type="button" className="btn btn-ghost" onClick={load} disabled={busy}>Refresh intelligence</button>
          </section>
        )}

        {tab === 'sources' && (
          <section className="research-panel">
            <form onSubmit={addSource} className="research-form">
              <input value={sourceForm.title} onChange={(e) => setSourceForm({ ...sourceForm, title: e.target.value })} placeholder="Source title" required aria-label="Source title" />
              <input value={sourceForm.author} onChange={(e) => setSourceForm({ ...sourceForm, author: e.target.value })} placeholder="Author (if known)" aria-label="Author" />
              <input value={sourceForm.url} onChange={(e) => setSourceForm({ ...sourceForm, url: e.target.value })} placeholder="URL (optional)" aria-label="Source URL" />
              <select value={sourceForm.sourceType} onChange={(e) => setSourceForm({ ...sourceForm, sourceType: e.target.value })} aria-label="Source type">
                <option value="WEB_SOURCE">Website / article</option>
                <option value="PAPER">Paper / academic</option>
                <option value="DOCUMENT">Document / PDF text</option>
                <option value="BOOK">Book</option>
                <option value="NOTE">Note</option>
                <option value="STRUCTURED_RECORD">Structured record</option>
              </select>
              <textarea value={sourceForm.excerpt} onChange={(e) => setSourceForm({ ...sourceForm, excerpt: e.target.value })} rows={6} placeholder="Paste a source excerpt or evidence summary…" aria-label="Source excerpt" />
              <button type="submit" className="btn btn-primary" disabled={busy}>Add source</button>
            </form>
            <form onSubmit={collectSources} className="research-inline-form" style={{ marginTop: 12 }}>
              <input value={collectQuery} onChange={(e) => setCollectQuery(e.target.value)} placeholder="Search and collect related sources using the current query…" aria-label="Collect query" />
              <button type="submit" className="btn btn-secondary" disabled={busy}>Collect sources</button>
            </form>
            {workspace?.sources?.length ? (
              <>
                <ul className="research-source-list">
                  {workspace.sources.map((s) => (
                    <li key={s.sourceRefId}>
                      <strong>{s.title}</strong>
                      <span>{s.sourceType} · {s.authority}{s.author !== 'UNKNOWN' ? ` · ${s.author}` : ''}</span>
                      <p className="research-excerpt">{s.excerpt || 'No excerpt saved.'}</p>
                    </li>
                  ))}
                </ul>
              </>
            ) : <EmptyState title="No sources yet" message="Add documents, notes, or pasted text to ground AI answers." />}
          </section>
        )}

        {tab === 'chat' && (
          <section className="research-panel">
            <p>Answers are grounded in your project sources when available. AI interpretation is never treated as a source.</p>
            <form onSubmit={askChat} className="research-inline-form">
              <input value={chatQ} onChange={(e) => setChatQ(e.target.value)} placeholder="Ask about your research…" aria-label="Research question" required />
              <button type="submit" className="btn btn-primary" disabled={busy}>Ask</button>
            </form>
            {chatResult && (
              <article className="research-chat-result">
                <span className="research-badge">{chatResult.contentType || 'AI_INTERPRETATION'}</span>
                <p>{chatResult.answer}</p>
              </article>
            )}
          </section>
        )}

        {tab === 'notes' && (
          <section className="research-panel">
            <form onSubmit={addNote} className="research-form">
              <select value={noteForm.contentType} onChange={(e) => setNoteForm({ ...noteForm, contentType: e.target.value })} aria-label="Note type">
                <option value="USER_NOTE">User note</option>
                <option value="AI_SUMMARY">AI summary</option>
                <option value="AI_RECOMMENDATION">AI recommendation</option>
              </select>
              <textarea value={noteForm.content} onChange={(e) => setNoteForm({ ...noteForm, content: e.target.value })} placeholder="Research notes…" required aria-label="Note content" />
              <button type="submit" className="btn btn-primary" disabled={busy}>Save note</button>
            </form>
            {workspace?.notes?.length ? (
              <ul className="research-note-list">
                {workspace.notes.map((n) => (
                  <li key={n._id || `${n.contentType}-${n.createdAt}`}>
                    <span className="research-badge">{n.contentType || 'USER_NOTE'}</span>
                    <p>{n.content}</p>
                  </li>
                ))}
              </ul>
            ) : <EmptyState title="No notes" message="Private research notes stay in your workspace." />}
          </section>
        )}

        {tab === 'claims' && (
          <section className="research-panel">
            <p>Claims are extracted from workspace evidence and validated during report review.</p>
            {claimRows.length ? (
              <ul className="research-claim-list">
                {claimRows.map((c) => (
                  <li key={c.claimId}>
                    <span className="research-badge">{c.type}</span>
                    <strong>{c.text}</strong>
                    <span>{c.status} · {(c.supportingSourceRefs || []).length} source refs</span>
                  </li>
                ))}
              </ul>
            ) : <EmptyState title="No claims yet" message="Run evidence extraction to build source-backed claims." />}
          </section>
        )}

        {tab === 'synthesis' && (
          <section className="research-panel">
            <button type="button" className="btn btn-secondary" onClick={runSynthesis} disabled={busy || !sourceCount}>Generate synthesis from sources</button>
            {(workspace?.synthesis?.keyFindings || []).length > 0 ? (
              <div className="research-synthesis">
                <span className="research-badge">AI_SYNTHESIS</span>
                {(workspace.synthesis.keyFindings || []).map((item) => (
                  <p key={`${item.label}-${item.text.slice(0, 20)}`}><strong>{item.label}</strong>: {item.text}</p>
                ))}
                {contradictions.length > 0 && (
                  <>
                    <h3>Contradictions</h3>
                    {contradictions.map((item, index) => <p key={`${item.sourceA}-${index}`}>{item.description}</p>)}
                  </>
                )}
              </div>
            ) : <EmptyState title="No synthesis yet" message="Run synthesis after adding sources." />}
          </section>
        )}

        {tab === 'report' && (
          <section className="research-panel">
            {report?.sections?.length ? (
              <>
                <div className="research-actions">
                  <button type="button" className="btn btn-secondary" onClick={reviewReport} disabled={busy}>Review report</button>
                  <button type="button" className="btn btn-secondary" onClick={approveReport} disabled={busy || qualityIssues.some((issue) => issue.includes('Unsupported factual claim'))}>Approve report</button>
                  <a className="btn btn-ghost" href={`/api/research/workspace/${id}/reports/${report.reportId}/export`} target="_blank" rel="noreferrer">Export CSV</a>
                </div>
                <p className="research-disclaimer">Report sections are generated from workspace evidence and should be reviewed before sharing.</p>
                {qualityIssues.length > 0 && (
                  <ul className="research-gap-list">
                    {qualityIssues.map((issue) => <li key={issue}><span className="research-badge">QUALITY ISSUE</span><p>{issue}</p></li>)}
                  </ul>
                )}
                {report.sections.map((section) => (
                  <article key={section.title} className="research-report-section">
                    <span className="research-badge">{section.key}</span>
                    <h3>{section.title}</h3>
                    <p>{section.content}</p>
                  </article>
                ))}
              </>
            ) : (
              <EmptyState title="No report yet" message="Generate a report after collecting sources and running synthesis." action={<button type="button" className="btn btn-sm" onClick={generateReport}>Generate report</button>} />
            )}
          </section>
        )}
      </div>
    </StudentLayout>
  )
}
