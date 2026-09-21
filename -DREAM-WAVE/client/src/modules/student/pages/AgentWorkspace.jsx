import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { agentApi } from '@shared/services/api'
import { EmptyState, ErrorState, LoadingState } from '@shared/components/ui'
import StudentLayout from '../layouts/StudentLayout'
import '../styles/agent.css'

const MODES = [
  { id: 'READ_ONLY', label: 'Read only' },
  { id: 'SUGGEST', label: 'Suggest' },
  { id: 'CONFIRM', label: 'Confirm writes' },
]

const EXAMPLES = [
  'Plan my day',
  'What should I learn next?',
  'What should I learn for my current project?',
  'What should I do this week to prepare for my AI internship?',
  'Prepare me for the hackathon',
  'How does my project connect to my career?',
  'Create task "Review system design notes"',
]

export default function AgentWorkspace() {
  const [message, setMessage] = useState('What should I learn for my current project?')
  const [mode, setMode] = useState('READ_ONLY')
  const [networkMode, setNetworkMode] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)
  const [history, setHistory] = useState([])
  const [tools, setTools] = useState([])
  const [specialists, setSpecialists] = useState([])
  const [planPreview, setPlanPreview] = useState(null)

  const loadMeta = useCallback(async () => {
    try {
      const [toolsRes, histRes, specRes] = await Promise.all([
        agentApi.tools({ agentType: 'student' }),
        agentApi.executions({ limit: 8 }),
        agentApi.specialists(),
      ])
      setTools(toolsRes.data?.data?.tools || toolsRes.data?.tools || [])
      setHistory(histRes.data?.data?.items || histRes.data?.items || [])
      setSpecialists(specRes.data?.data?.agents || [])
    } catch {
      // meta optional
    }
  }, [])

  useEffect(() => {
    loadMeta()
  }, [loadMeta])

  const previewPlan = async () => {
    try {
      const res = await agentApi.planSpecialists({ message })
      setPlanPreview(res.data?.data || res.data)
    } catch {
      setPlanPreview(null)
    }
  }

  useEffect(() => {
    if (networkMode && message.trim()) {
      const t = setTimeout(previewPlan, 400)
      return () => clearTimeout(t)
    }
    setPlanPreview(null)
    return undefined
  }, [message, networkMode])

  const run = async () => {
    setLoading(true)
    setError('')
    try {
      const response = networkMode
        ? await agentApi.runNetwork({
          message,
          mode: 'READ_ONLY',
          idempotencyKey: `ui-net-${Date.now()}`,
        })
        : await agentApi.run({
          message,
          mode,
          agentType: 'student',
          idempotencyKey: `ui-${Date.now()}`,
        })
      setResult(response.data?.data || response.data)
      await loadMeta()
    } catch (err) {
      setError(err.userMessage || 'Agent run failed.')
    } finally {
      setLoading(false)
    }
  }

  const confirm = async () => {
    if (!result?.previewId) return
    setLoading(true)
    setError('')
    try {
      const response = await agentApi.confirm({
        previewId: result.previewId,
        confirmed: true,
        confirmSteps: result.pendingWrites || [],
      })
      setResult(response.data?.data || response.data)
      await loadMeta()
    } catch (err) {
      setError(err.userMessage || 'Confirmation failed.')
    } finally {
      setLoading(false)
    }
  }

  const cancel = async () => {
    const id = result?.executionId || result?.previewId
    if (!id) return
    setLoading(true)
    try {
      if (networkMode) await agentApi.cancelNetwork(id)
      else await agentApi.cancel(id)
      setResult((prev) => prev ? { ...prev, state: 'CANCELLED' } : prev)
      await loadMeta()
    } catch (err) {
      setError(err.userMessage || 'Cancel failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <StudentLayout title="AI Agent">
      <div className="dw-agent">
        <header className="dw-agent__hero">
          <div>
            <p className="dw-agent__eyebrow">Multi-Agent Intelligence</p>
            <h1>Dream Wave Agent Network</h1>
            <p>
              One Dream Wave AI — specialist agents for Project, Learning, Research, Career,
              Daily Life, Opportunities, and Events under the existing orchestrator.
            </p>
          </div>
          <div className="dw-agent__hero-actions">
            <Link className="btn btn-secondary" to="/student/intelligence">Unified Brain</Link>
            <Link className="btn btn-secondary" to="/student/daily-life">Daily Life</Link>
          </div>
        </header>

        <section className="dw-agent__composer" aria-labelledby="agent-request">
          <h2 id="agent-request">Request</h2>
          <label htmlFor="agent-message">What should the agent network help with?</label>
          <textarea
            id="agent-message"
            rows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            aria-label="Agent request"
          />

          <div className="dw-agent__modes" role="group" aria-label="Execution mode">
            <button
              type="button"
              className={networkMode ? 'is-active' : ''}
              onClick={() => setNetworkMode(true)}
            >
              Specialist network
            </button>
            <button
              type="button"
              className={!networkMode ? 'is-active' : ''}
              onClick={() => setNetworkMode(false)}
            >
              Classic tool plan
            </button>
            {!networkMode && MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                className={mode === m.id ? 'is-active' : ''}
                onClick={() => setMode(m.id)}
              >
                {m.label}
              </button>
            ))}
          </div>

          {networkMode && planPreview?.specialists?.length > 0 && (
            <div className="dw-agent__plan-preview" aria-live="polite">
              <p className="dw-agent__label">Plan ({planPreview.mode})</p>
              <ol>
                {planPreview.specialists.map((s, i) => (
                  <li key={s.agent}>
                    {i + 1}. {s.agent}
                    {s.dependsOn?.length ? ` ← after ${s.dependsOn.join(', ')}` : ''}
                  </li>
                ))}
              </ol>
            </div>
          )}

          <div className="dw-agent__examples">
            {EXAMPLES.map((ex) => (
              <button key={ex} type="button" onClick={() => setMessage(ex)}>{ex}</button>
            ))}
          </div>

          <div className="dw-agent__actions">
            <button type="button" className="btn btn-primary" disabled={loading || !message.trim()} onClick={run}>
              {loading ? 'Running…' : networkMode ? 'Run specialist network' : 'Run agent'}
            </button>
            {result?.executionId && result?.state === 'RUNNING' && (
              <button type="button" className="btn btn-secondary" onClick={cancel}>Cancel</button>
            )}
          </div>
        </section>

        {error && <ErrorState message={error} />}

        {loading && !result && <LoadingState label="Understanding your request…" rows={4} />}

        {result && (
          <section className="dw-agent__result" aria-live="polite">
            <header>
              <h2>Result</h2>
              <span className="dw-agent__state" data-state={result.state}>{result.state}</span>
            </header>

            {result.activity?.length > 0 && (
              <ul className="dw-agent__activity" aria-label="Agent progress">
                {result.activity.map((a, i) => (
                  <li key={i}>{a.summary || a.status}</li>
                ))}
              </ul>
            )}

            {result.plan?.length > 0 && (
              <div className="dw-agent__plan">
                <p className="dw-agent__label">Executed plan</p>
                <ol>
                  {result.plan.map((step, i) => (
                    <li key={i}>{step.summary || step.agent || step.tool || JSON.stringify(step)}</li>
                  ))}
                </ol>
              </div>
            )}

            {(result.summary || result.resultSummary) && (
              <p className="dw-agent__summary"><strong>Summary:</strong> {result.summary || result.resultSummary}</p>
            )}

            {result.facts?.length > 0 && (
              <div>
                <p className="dw-agent__label">Facts</p>
                <ul>{result.facts.map((f, i) => <li key={i}>{f.text || f}</li>)}</ul>
              </div>
            )}

            {result.inferences?.length > 0 && (
              <div>
                <p className="dw-agent__label">Inferences</p>
                <ul>{result.inferences.map((f, i) => <li key={i}>{f.text || f}</li>)}</ul>
              </div>
            )}

            {result.recommendations?.length > 0 && (
              <div>
                <p className="dw-agent__label">Recommendations</p>
                <ul>{result.recommendations.map((f, i) => <li key={i}>{f.text || f}</li>)}</ul>
              </div>
            )}

            {result.conflicts?.length > 0 && (
              <div className="dw-agent__confirm" role="status">
                <p className="dw-agent__label">Data conflict</p>
                <ul>
                  {result.conflicts.map((c, i) => (
                    <li key={i}>{c.what} — {(c.sources || []).join(', ')}</li>
                  ))}
                </ul>
              </div>
            )}

            {result.availability?.failed?.length > 0 && (
              <p className="dw-agent__summary">
                Partial: unavailable — {result.availability.failed.join(', ')}
              </p>
            )}

            {result.confirmationRequired && (
              <div className="dw-agent__confirm" role="region" aria-label="Confirmation required">
                <p>Write actions require confirmation.</p>
                <div className="dw-agent__actions">
                  <button type="button" className="btn btn-primary" disabled={loading} onClick={confirm}>Confirm</button>
                  <button type="button" className="btn btn-secondary" disabled={loading} onClick={cancel}>Cancel</button>
                </div>
              </div>
            )}
          </section>
        )}

        <div className="dw-agent__grid">
          <section className="dw-agent__panel">
            <h2>Registered specialists</h2>
            {!specialists.length ? (
              <EmptyState title="No specialists" message="Specialist registry loads for your role." />
            ) : (
              <ul className="dw-agent__tools">
                {specialists.map((a) => (
                  <li key={a.name}>
                    <strong>{a.name}</strong>
                    <small>{a.domain} · {(a.capabilities || []).slice(0, 2).join(', ')}</small>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="dw-agent__panel">
            <h2>Allowlisted tools</h2>
            <ul className="dw-agent__tools">
              {tools.slice(0, 12).map((t) => (
                <li key={t.name}><strong>{t.name}</strong><small>{t.riskLevel}</small></li>
              ))}
            </ul>
          </section>

          <section className="dw-agent__panel">
            <h2>Recent executions</h2>
            {!history.length ? (
              <EmptyState title="No runs yet" message="Run a network or classic agent request." />
            ) : (
              <ul className="dw-agent__history">
                {history.map((item) => (
                  <li key={item.executionId || item.id}>
                    <strong>{(item.request || '').slice(0, 60)}</strong>
                    <small>{item.state} · {item.agentType}</small>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </StudentLayout>
  )
}
