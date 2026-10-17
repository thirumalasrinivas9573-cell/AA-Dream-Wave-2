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
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface p-6 rounded-stitch border border-divider shadow-sm">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-brand-primary">Multi-Agent Intelligence</span>
            <h1 className="text-2xl sm:text-3xl font-bold text-content-heading tracking-tight mt-1">Dream Wave Agent Network</h1>
            <p className="text-sm text-content-muted mt-1 max-w-2xl">
              One Dream Wave AI — specialist agents for Project, Learning, Research, Career,
              Daily Life, Opportunities, and Events under the existing orchestrator.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link className="px-4 py-2 text-sm font-medium bg-surface-elevated hover:bg-surface text-content-heading rounded-stitch border border-divider transition-colors" to="/student/intelligence">Unified Brain</Link>
            <Link className="px-4 py-2 text-sm font-medium bg-surface-elevated hover:bg-surface text-content-heading rounded-stitch border border-divider transition-colors" to="/student/daily-life">Daily Life</Link>
          </div>
        </header>

        <section className="bg-surface p-6 rounded-stitch border border-divider shadow-sm space-y-4" aria-labelledby="agent-request">
          <h2 id="agent-request" className="text-lg font-semibold text-content-heading">Request</h2>
          <label htmlFor="agent-message" className="text-xs font-medium text-content-muted uppercase tracking-wider block">What should the agent network help with?</label>
          <textarea
            id="agent-message"
            rows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full bg-surface-elevated text-content-body border border-divider rounded-stitch p-3 text-sm focus:outline-none focus:border-brand-primary"
            aria-label="Agent request"
          />

          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Execution mode">
            <button
              type="button"
              className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all ${
                networkMode
                  ? 'bg-brand-primary text-white shadow-sm'
                  : 'bg-surface-elevated hover:bg-surface text-content-muted border border-divider'
              }`}
              onClick={() => setNetworkMode(true)}
            >
              Specialist network
            </button>
            <button
              type="button"
              className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all ${
                !networkMode
                  ? 'bg-brand-primary text-white shadow-sm'
                  : 'bg-surface-elevated hover:bg-surface text-content-muted border border-divider'
              }`}
              onClick={() => setNetworkMode(false)}
            >
              Classic tool plan
            </button>
            {!networkMode && MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all ${
                  mode === m.id
                    ? 'bg-brand-primary text-white shadow-sm'
                    : 'bg-surface-elevated hover:bg-surface text-content-muted border border-divider'
                }`}
                onClick={() => setMode(m.id)}
              >
                {m.label}
              </button>
            ))}
          </div>

          {networkMode && planPreview?.specialists?.length > 0 && (
            <div className="p-4 bg-surface-elevated rounded-stitch border border-divider space-y-2" aria-live="polite">
              <p className="text-xs font-semibold text-content-heading">Plan ({planPreview.mode})</p>
              <ol className="space-y-1 text-xs text-content-body">
                {planPreview.specialists.map((s, i) => (
                  <li key={s.agent}>
                    {i + 1}. <span className="font-medium text-brand-primary">{s.agent}</span>
                    {s.dependsOn?.length ? ` ← after ${s.dependsOn.join(', ')}` : ''}
                  </li>
                ))}
              </ol>
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-1">
            {EXAMPLES.map((ex) => (
              <button key={ex} type="button" className="px-3 py-1 text-xs font-medium bg-surface-elevated hover:bg-brand-primary/10 text-content-body hover:text-brand-primary border border-divider rounded-full transition-colors" onClick={() => setMessage(ex)}>{ex}</button>
            ))}
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button type="button" className="px-5 py-2.5 text-sm font-medium bg-brand-primary hover:bg-brand-primary-hover text-white rounded-stitch transition-colors disabled:opacity-50" disabled={loading || !message.trim()} onClick={run}>
              {loading ? 'Running…' : networkMode ? 'Run specialist network' : 'Run agent'}
            </button>
            {result?.executionId && result?.state === 'RUNNING' && (
              <button type="button" className="px-4 py-2.5 text-sm font-medium bg-surface-elevated hover:bg-surface text-content-heading rounded-stitch border border-divider transition-colors" onClick={cancel}>Cancel</button>
            )}
          </div>
        </section>

        {error && <ErrorState message={error} />}

        {loading && !result && <LoadingState label="Understanding your request…" rows={4} />}

        {result && (
          <section className="bg-surface p-6 rounded-stitch border border-divider shadow-sm space-y-4" aria-live="polite">
            <header className="flex items-center justify-between pb-3 border-b border-divider">
              <h2 className="text-lg font-semibold text-content-heading">Result</h2>
              <span className="px-2.5 py-1 text-xs font-semibold uppercase tracking-wider bg-brand-primary/10 text-brand-primary rounded-full border border-brand-primary/20">{result.state}</span>
            </header>

            {result.activity?.length > 0 && (
              <ul className="space-y-1 text-xs text-content-body" aria-label="Agent progress">
                {result.activity.map((a, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <span className="text-brand-primary">•</span> {a.summary || a.status}
                  </li>
                ))}
              </ul>
            )}

            {result.plan?.length > 0 && (
              <div className="p-4 bg-surface-elevated rounded-stitch border border-divider space-y-2">
                <p className="text-xs font-semibold text-content-heading">Executed plan</p>
                <ol className="space-y-1 text-xs text-content-body">
                  {result.plan.map((step, i) => (
                    <li key={i}>{i + 1}. {step.summary || step.agent || step.tool || JSON.stringify(step)}</li>
                  ))}
                </ol>
              </div>
            )}

            {(result.summary || result.resultSummary) && (
              <p className="text-sm text-content-body"><strong className="text-content-heading">Summary:</strong> {result.summary || result.resultSummary}</p>
            )}

            {result.facts?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-content-heading mb-1">Facts</p>
                <ul className="list-disc list-inside text-xs text-content-body space-y-0.5">{result.facts.map((f, i) => <li key={i}>{f.text || f}</li>)}</ul>
              </div>
            )}

            {result.inferences?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-content-heading mb-1">Inferences</p>
                <ul className="list-disc list-inside text-xs text-content-body space-y-0.5">{result.inferences.map((f, i) => <li key={i}>{f.text || f}</li>)}</ul>
              </div>
            )}

            {result.recommendations?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-content-heading mb-1">Recommendations</p>
                <ul className="list-disc list-inside text-xs text-content-body space-y-0.5">{result.recommendations.map((f, i) => <li key={i}>{f.text || f}</li>)}</ul>
              </div>
            )}

            {result.conflicts?.length > 0 && (
              <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-stitch space-y-2" role="status">
                <p className="text-xs font-semibold text-amber-600">Data conflict</p>
                <ul className="text-xs text-content-body space-y-1">
                  {result.conflicts.map((c, i) => (
                    <li key={i}>{c.what} — {(c.sources || []).join(', ')}</li>
                  ))}
                </ul>
              </div>
            )}

            {result.availability?.failed?.length > 0 && (
              <p className="text-xs text-content-muted">
                Partial: unavailable — {result.availability.failed.join(', ')}
              </p>
            )}

            {result.confirmationRequired && (
              <div className="p-4 bg-brand-primary/10 border border-brand-primary/20 rounded-stitch space-y-3" role="region" aria-label="Confirmation required">
                <p className="text-xs font-medium text-brand-primary">Write actions require confirmation.</p>
                <div className="flex items-center gap-2">
                  <button type="button" className="px-3 py-1.5 text-xs font-medium bg-brand-primary text-white rounded-lg" disabled={loading} onClick={confirm}>Confirm</button>
                  <button type="button" className="px-3 py-1.5 text-xs font-medium bg-surface text-content-muted rounded-lg border border-divider" disabled={loading} onClick={cancel}>Cancel</button>
                </div>
              </div>
            )}
          </section>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <section className="bg-surface p-6 rounded-stitch border border-divider shadow-sm space-y-4">
            <h2 className="text-base font-semibold text-content-heading">Registered specialists</h2>
            {!specialists.length ? (
              <EmptyState title="No specialists" message="Specialist registry loads for your role." />
            ) : (
              <ul className="space-y-3">
                {specialists.map((a) => (
                  <li key={a.name} className="p-3 bg-surface-elevated rounded-stitch border border-divider space-y-1">
                    <strong className="text-xs font-semibold text-content-heading block">{a.name}</strong>
                    <small className="text-[11px] text-content-muted block">{a.domain} · {(a.capabilities || []).slice(0, 2).join(', ')}</small>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="bg-surface p-6 rounded-stitch border border-divider shadow-sm space-y-4">
            <h2 className="text-base font-semibold text-content-heading">Allowlisted tools</h2>
            <ul className="space-y-2">
              {tools.slice(0, 12).map((t) => (
                <li key={t.name} className="flex items-center justify-between p-2.5 bg-surface-elevated rounded-lg border border-divider">
                  <strong className="text-xs font-medium text-content-body">{t.name}</strong>
                  <small className="text-[10px] font-semibold text-content-muted uppercase">{t.riskLevel}</small>
                </li>
              ))}
            </ul>
          </section>

          <section className="bg-surface p-6 rounded-stitch border border-divider shadow-sm space-y-4">
            <h2 className="text-base font-semibold text-content-heading">Recent executions</h2>
            {!history.length ? (
              <EmptyState title="No runs yet" message="Run a network or classic agent request." />
            ) : (
              <ul className="space-y-3">
                {history.map((item) => (
                  <li key={item.executionId || item.id} className="p-3 bg-surface-elevated rounded-stitch border border-divider space-y-1">
                    <strong className="text-xs font-medium text-content-heading block truncate">{(item.request || '').slice(0, 60)}</strong>
                    <small className="text-[11px] text-content-muted block">{item.state} · {item.agentType}</small>
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
