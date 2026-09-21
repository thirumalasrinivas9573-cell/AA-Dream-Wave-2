import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { intelligenceApi } from '@shared/services/api'
import { EmptyState, ErrorState, LoadingState } from '@shared/components/ui'
import StudentLayout from '../layouts/StudentLayout'
import '../styles/knowledge-center.css'

export default function KnowledgeCenter() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [q, setQ] = useState('')
  const [search, setSearch] = useState(null)
  const [ask, setAsk] = useState('')
  const [answer, setAnswer] = useState(null)
  const [busy, setBusy] = useState(false)
  const [edgeDetail, setEdgeDetail] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await intelligenceApi.knowledgeCenter()
      setData(res.data?.data || res.data)
    } catch (err) {
      setError(err.userMessage || 'Unable to load knowledge center.')
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const runSearch = async (e) => {
    e?.preventDefault?.()
    if (!q.trim()) return
    setBusy(true)
    try {
      const res = await intelligenceApi.knowledgeSearch({ q: q.trim() })
      setSearch(res.data?.data || res.data)
    } catch (err) {
      setSearch({ results: [], note: err.userMessage || 'Search failed.' })
    } finally {
      setBusy(false)
    }
  }

  const runAsk = async () => {
    if (!ask.trim()) return
    setBusy(true)
    setAnswer(null)
    try {
      const res = await intelligenceApi.knowledgeAsk({ message: ask.trim() })
      setAnswer(res.data?.data || res.data)
    } catch (err) {
      setAnswer({ answer: err.userMessage || 'Ask failed.', state: 'FAILED' })
    } finally {
      setBusy(false)
    }
  }

  const explainEdge = async (edgeId) => {
    try {
      const res = await intelligenceApi.knowledgeExplain(edgeId)
      setEdgeDetail(res.data?.data || res.data)
    } catch (err) {
      setEdgeDetail({ evidence: err.userMessage || 'Unable to explain relationship.' })
    }
  }

  const sync = async () => {
    setBusy(true)
    try {
      await intelligenceApi.knowledgeSync()
      await load()
    } catch (err) {
      setError(err.userMessage || 'Sync failed.')
    } finally {
      setBusy(false)
    }
  }

  const map = data?.personalMap
  const edges = map?.graph?.edges || []

  return (
    <StudentLayout title="My Knowledge">
      <div className="dw-kc">
        <header className="dw-kc__hero">
          <div>
            <p className="dw-kc__eyebrow">Personal Knowledge Graph</p>
            <h1>My Knowledge</h1>
            <p>
              Goals, skills, projects, research, and documents — connected with evidence.
              Documents are treated as data, never instructions.
            </p>
          </div>
          <div className="dw-kc__hero-actions">
            <button type="button" className="btn btn-secondary" onClick={sync} disabled={busy}>Sync graph</button>
            <Link className="btn btn-secondary" to="/student/research">Research</Link>
            <Link className="btn btn-primary" to="/student/intelligence">AI Workspace</Link>
          </div>
        </header>

        {loading && <LoadingState label="Loading knowledge…" rows={5} />}
        {error && <ErrorState message={error} onRetry={load} />}

        {!loading && !error && data && (
          <>
            <section className="dw-kc__panel" aria-labelledby="kc-search">
              <h2 id="kc-search">Search</h2>
              <form className="dw-kc__search" onSubmit={runSearch}>
                <label htmlFor="kc-q" className="sr-only">Search knowledge</label>
                <input
                  id="kc-q"
                  type="search"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search knowledge…"
                />
                <button type="submit" className="btn btn-primary" disabled={busy || !q.trim()}>Search</button>
              </form>
              {search && (
                <ul className="dw-kc__results">
                  {(search.results || []).length === 0 && <li>No authorized matches.</li>}
                  {(search.results || []).map((r) => (
                    <li key={`${r.type}-${r.id}`}>
                      <span className="dw-kc__type">{r.type}</span>
                      {r.url ? <Link to={r.url}>{r.title}</Link> : <strong>{r.title}</strong>}
                      {r.excerpt && <small>{r.excerpt}</small>}
                      {r.location && <small>{r.location} · {r.note}</small>}
                    </li>
                  ))}
                </ul>
              )}
              {search?.note && <small className="dw-kc__muted">{search.note}</small>}
            </section>

            <div className="dw-kc__grid">
              <section className="dw-kc__panel">
                <h2>Recent knowledge</h2>
                <div className="dw-kc__cols">
                  <div>
                    <h3>Projects</h3>
                    <ul>{(data.recent?.projects || []).map((p) => <li key={p.id}>{p.title}</li>)}</ul>
                  </div>
                  <div>
                    <h3>Research</h3>
                    <ul>
                      {(data.recent?.research || []).map((r) => (
                        <li key={r.id}><Link to={r.url}>{r.title}</Link></li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h3>Documents</h3>
                    <ul>
                      {(data.recent?.documents || []).map((d) => (
                        <li key={d.id}>
                          <Link to={d.url}>{d.title}</Link>
                          <small>{d.processingStatus} · {d.trustClass}</small>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </section>

              <section className="dw-kc__panel">
                <h2>Connected knowledge</h2>
                <ol className="dw-kc__chain">
                  <li><strong>Goals</strong> — {(data.connected?.goals || []).map((g) => g.title).join('; ') || '—'}</li>
                  <li><strong>Skills</strong> — {(data.connected?.skills || []).map((s) => s.name).join(', ') || '—'}</li>
                  <li><strong>Projects</strong> — {(data.connected?.projects || []).map((p) => p.title).join('; ') || '—'}</li>
                  <li><strong>Research</strong> — {(data.connected?.research || []).map((r) => r.title).join('; ') || '—'}</li>
                  <li><strong>Career</strong> — {data.connected?.career?.target || '—'}</li>
                </ol>
                <small className="dw-kc__muted">
                  Graph edges: {data.graphSummary?.edgeCount ?? 0} · depth ≤ {map?.graph?.limits?.maxDepth}
                </small>
              </section>
            </div>

            <section className="dw-kc__panel" aria-labelledby="kc-graph">
              <h2 id="kc-graph">Relationship graph</h2>
              {!edges.length ? (
                <EmptyState title="No relationships yet" message="Add goals, projects, or research to build your graph." />
              ) : (
                <ul className="dw-kc__edges">
                  {edges.slice(0, 20).map((e) => (
                    <li key={e.id}>
                      <button type="button" onClick={() => explainEdge(e.id)}>
                        <strong>{e.relation}</strong>
                        <span>{e.from.type} → {e.to.type}</span>
                        <small>{e.originLabel}{e.evidence ? ` · ${e.evidence}` : ''}</small>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {edgeDetail && (
                <div className="dw-kc__explain" role="status">
                  <p><strong>Relationship:</strong> {edgeDetail.relationship}</p>
                  <p><strong>Evidence:</strong> {edgeDetail.evidence}</p>
                  <p><strong>Origin:</strong> {edgeDetail.origin}</p>
                  {edgeDetail.note && <small>{edgeDetail.note}</small>}
                </div>
              )}
            </section>

            <section className="dw-kc__panel" aria-labelledby="kc-ask">
              <h2 id="kc-ask">AI research assistant</h2>
              <label htmlFor="kc-ask-input">Ask about your knowledge</label>
              <textarea
                id="kc-ask-input"
                rows={3}
                value={ask}
                onChange={(e) => setAsk(e.target.value)}
                placeholder="e.g. What do my research notes say about RAG?"
              />
              <div className="dw-kc__hero-actions">
                <button type="button" className="btn btn-primary" disabled={busy || !ask.trim()} onClick={runAsk}>
                  {busy ? 'Thinking…' : 'Ask'}
                </button>
              </div>
              {answer && (
                <div className="dw-kc__answer" aria-live="polite">
                  <p><strong>Answer:</strong> {answer.structure?.ANSWER || answer.answer}</p>
                  {(answer.structure?.KEY_FINDINGS || []).length > 0 && (
                    <div>
                      <h3>Key findings</h3>
                      <ul>
                        {answer.structure.KEY_FINDINGS.map((f, i) => (
                          <li key={i}>
                            {f.finding}
                            <small>
                              Source: {f.source?.title}
                              {f.source?.location ? ` · ${f.source.location}` : ''}
                              {f.source?.freshness ? ` · ${f.source.freshness}` : ''}
                            </small>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {(answer.conflicts || []).length > 0 && (
                    <div>
                      <h3>Source conflicts</h3>
                      <ul>{answer.conflicts.map((c, i) => <li key={i}>{c.message || c.handling || JSON.stringify(c)}</li>)}</ul>
                    </div>
                  )}
                  {(answer.gaps || []).length > 0 && (
                    <div>
                      <h3>Possible gaps</h3>
                      <ul>{answer.gaps.map((g, i) => <li key={i}>{g.message}<small>{g.note}</small></li>)}</ul>
                    </div>
                  )}
                  {answer.structure?.POSSIBLE_NEXT_STEP && (
                    <p>
                      <strong>Next step:</strong> {answer.structure.POSSIBLE_NEXT_STEP.title}
                      {answer.structure.POSSIBLE_NEXT_STEP.url && (
                        <> — <Link to={answer.structure.POSSIBLE_NEXT_STEP.url}>Open</Link></>
                      )}
                    </p>
                  )}
                  <small className="dw-kc__muted">{answer.memorySeparation?.separation}</small>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </StudentLayout>
  )
}
