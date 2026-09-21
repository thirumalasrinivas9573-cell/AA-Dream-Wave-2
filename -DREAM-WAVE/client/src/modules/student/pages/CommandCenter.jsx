import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { intelligenceApi } from '@shared/services/api'
import { EmptyState, ErrorState, LoadingState } from '@shared/components/ui'
import StudentLayout from '../layouts/StudentLayout'
import '../styles/command-center.css'

export default function CommandCenter() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [ask, setAsk] = useState('')
  const [result, setResult] = useState(null)
  const [busy, setBusy] = useState(false)
  const [statusMsg, setStatusMsg] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await intelligenceApi.commandCenter()
      setData(res.data?.data || res.data)
    } catch (err) {
      setError(err.userMessage || 'Unable to load AI Command Center.')
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const runCommand = async (message, extra = {}) => {
    const msg = (message || ask).trim()
    if (!msg) return
    setBusy(true)
    setResult(null)
    setStatusMsg('')
    try {
      const res = await intelligenceApi.command({ message: msg, ...extra })
      const payload = res.data?.data || res.data
      setResult(payload)
      if (payload?.state === 'CONFIRMATION_REQUIRED') {
        setStatusMsg('Confirmation required before this action can run.')
      }
      await load()
    } catch (err) {
      setResult({
        state: 'ERROR',
        result: err.userMessage || 'Intelligence temporarily unavailable.',
        why: 'The platform remains usable — try again shortly.',
      })
    } finally {
      setBusy(false)
    }
  }

  const feedback = async (decisionId, value) => {
    if (!decisionId) return
    try {
      await intelligenceApi.decisionFeedback(decisionId, { feedback: value })
      setStatusMsg(value === 'helpful' ? 'Thanks — feedback saved.' : 'Feedback noted. Core data was not changed.')
    } catch (err) {
      setStatusMsg(err.userMessage || 'Could not save feedback.')
    }
  }

  const override = async (decisionId) => {
    if (!decisionId) return
    try {
      await intelligenceApi.decisionOverride(decisionId, {
        note: 'User rejected recommendation',
        accept: false,
      })
      setStatusMsg('Override saved. Your decision wins.')
      await load()
    } catch (err) {
      setStatusMsg(err.userMessage || 'Could not override.')
    }
  }

  const today = data?.today
  const primary = today?.primaryAction || result?.decision?.primary || result?.nextAction

  return (
    <StudentLayout title="AI Command Center">
      <div className="dw-cmd">
        <header className="dw-cmd__hero">
          <div>
            <p className="dw-cmd__eyebrow">Continuous intelligence</p>
            <h1>AI Command Center</h1>
            <p>
              Ask Dream Wave what matters now. Recommendations use live goals, tasks,
              learning, career, and approved memory — never a full database dump.
            </p>
          </div>
          <div className="dw-cmd__hero-actions">
            <Link className="btn btn-secondary" to="/student/personal-ai">My Intelligence</Link>
            <Link className="btn btn-secondary" to="/student/memory">Memory</Link>
            <button type="button" className="btn btn-primary" onClick={load} disabled={loading}>Refresh</button>
          </div>
        </header>

        {loading && <LoadingState label="Loading command center…" rows={6} />}
        {error && <ErrorState message={error} onRetry={load} />}

        {!loading && !error && (
          <>
            <section className="dw-cmd__panel" aria-labelledby="ask-ai">
              <h2 id="ask-ai">Ask Dream Wave</h2>
              <label htmlFor="cmd-ask" className="sr-only">Ask Dream Wave</label>
              <textarea
                id="cmd-ask"
                rows={3}
                value={ask}
                onChange={(e) => setAsk(e.target.value)}
                placeholder='e.g. What should I do today? Should I apply for this internship?'
                disabled={busy}
              />
              <div className="dw-cmd__row">
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={busy || !ask.trim()}
                  onClick={() => runCommand(ask)}
                >
                  {busy ? 'Thinking…' : 'Ask'}
                </button>
                {result?.requiresConfirmation && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={busy}
                    onClick={() => runCommand(ask, { confirmed: true })}
                  >
                    Confirm action
                  </button>
                )}
              </div>
              <div className="dw-cmd__quick" role="group" aria-label="Quick commands">
                {(data?.quickCommands || []).map((q) => (
                  <button
                    key={q.id}
                    type="button"
                    className="dw-cmd__chip"
                    disabled={busy}
                    onClick={() => { setAsk(q.message); runCommand(q.message) }}
                  >
                    {q.label}
                  </button>
                ))}
              </div>
              {statusMsg && <p className="dw-cmd__note" role="status">{statusMsg}</p>}
              {data?.offlineNote && <p className="dw-cmd__note">{data.offlineNote}</p>}
            </section>

            <section className="dw-cmd__panel" aria-labelledby="today">
              <h2 id="today">Today</h2>
              {primary ? (
                <div className="dw-cmd__primary">
                  <p className="dw-cmd__label">Primary action</p>
                  <h3>{primary.title || primary.label}</h3>
                  <p>{today?.why || result?.why || primary.why}</p>
                  {primary.url && (
                    <Link className="btn btn-primary" to={primary.url}>
                      {primary.label || 'Open'}
                    </Link>
                  )}
                  {(result?.decision?.decisionId || result?.decisionId) && (
                    <div className="dw-cmd__row">
                      <button type="button" className="btn btn-secondary" onClick={() => feedback(result.decision?.decisionId || result.decisionId, 'helpful')}>
                        Helpful
                      </button>
                      <button type="button" className="btn btn-secondary" onClick={() => feedback(result.decision?.decisionId || result.decisionId, 'not_helpful')}>
                        Not helpful
                      </button>
                      <button type="button" className="btn btn-secondary" onClick={() => override(result.decision?.decisionId || result.decisionId)}>
                        Override
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <EmptyState title="No primary action yet" message="Ask a question or set an active goal to unlock recommendations." />
              )}
              {(today?.alternatives || result?.decision?.alternatives || []).length > 0 && (
                <ul className="dw-cmd__alts">
                  {(today?.alternatives || result?.decision?.alternatives || []).map((a) => (
                    <li key={a.fingerprint || a.title}>
                      <strong>{a.role || 'Option'}:</strong> {a.title}
                      {a.tradeOff && <span> — {a.tradeOff}</span>}
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {result && (
              <section className="dw-cmd__panel" aria-labelledby="cmd-result" aria-live="polite">
                <h2 id="cmd-result">Result</h2>
                <p><strong>{result.state}</strong> · {result.class || 'COMMAND'}</p>
                <p>{result.result}</p>
                {result.why && <small>Why: {result.why}</small>}
                {result.partialFailures?.length > 0 && (
                  <p className="dw-cmd__note">Partial: some sources failed; available intelligence is shown.</p>
                )}
              </section>
            )}

            <div className="dw-cmd__grid">
              <section className="dw-cmd__panel" aria-labelledby="insights">
                <h2 id="insights">Insights</h2>
                {(data?.insights || []).length ? (
                  <ul className="dw-cmd__list">
                    {data.insights.map((i, idx) => (
                      <li key={idx}>
                        <p>{i.text}</p>
                        <small>{i.confidence}</small>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>No cross-system insights yet.</p>
                )}
              </section>

              <section className="dw-cmd__panel" aria-labelledby="progress">
                <h2 id="progress">Progress</h2>
                {data?.progress ? (
                  <>
                    <p>
                      In progress: {data.progress.inProgress} · Overdue: {data.progress.overdue} · Completed: {data.progress.completed}
                    </p>
                    {data.progress.bottleneck && (
                      <p>
                        <strong>Bottleneck:</strong> {data.progress.bottleneck.blocker}
                        {' — '}
                        {data.progress.bottleneck.why}
                      </p>
                    )}
                  </>
                ) : (
                  <p>Progress signals unavailable.</p>
                )}
                <div className="dw-cmd__row">
                  <Link className="btn btn-secondary" to="/student/goals">Goals</Link>
                  <Link className="btn btn-secondary" to="/student/learn">Learning</Link>
                  <Link className="btn btn-secondary" to="/student/career">Career</Link>
                </div>
              </section>
            </div>

            <section className="dw-cmd__panel" aria-labelledby="history">
              <h2 id="history">Recent commands</h2>
              {(data?.history || []).length ? (
                <ul className="dw-cmd__list">
                  {data.history.map((h) => (
                    <li key={h._id}>
                      <p>{h.request}</p>
                      <small>
                        {h.primaryAction || '—'} · {h.createdAt ? new Date(h.createdAt).toLocaleString() : ''}
                      </small>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No commands yet.</p>
              )}
            </section>
          </>
        )}
      </div>
    </StudentLayout>
  )
}
