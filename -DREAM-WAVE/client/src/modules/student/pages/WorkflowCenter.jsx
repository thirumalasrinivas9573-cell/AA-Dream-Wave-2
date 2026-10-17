import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { agentApi } from '@shared/services/api'
import { EmptyState, ErrorState, LoadingState } from '@shared/components/ui'
import StudentLayout from '../layouts/StudentLayout'
import '../styles/workflow.css'

export default function WorkflowCenter() {
  const [list, setList] = useState([])
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('Prepare my Dream Wave project for the upcoming hackathon and create task for checklist')
  const [busy, setBusy] = useState(false)
  const [statusMsg, setStatusMsg] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await agentApi.workflows({ limit: 20 })
      setList(res.data?.data?.workflows || [])
    } catch (err) {
      setError(err.userMessage || 'Unable to load workflows.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const open = async (id) => {
    setBusy(true)
    try {
      const res = await agentApi.getWorkflow(id)
      setSelected(res.data?.data || res.data)
    } catch (err) {
      setStatusMsg(err.userMessage || 'Failed to load workflow.')
    } finally {
      setBusy(false)
    }
  }

  const create = async () => {
    if (!message.trim()) return
    setBusy(true)
    setStatusMsg('')
    try {
      const res = await agentApi.createWorkflow({ message: message.trim() })
      const wf = res.data?.data || res.data
      setSelected(wf)
      await load()
      setStatusMsg(wf.errorCode === 'PROMPT_INJECTION_BLOCKED' ? wf.resultSummary : `Created: ${wf.name} (${wf.state})`)
    } catch (err) {
      setStatusMsg(err.userMessage || 'Create failed.')
    } finally {
      setBusy(false)
    }
  }

  const act = async (fn, payload) => {
    if (!selected?.workflowId) return
    setBusy(true)
    try {
      const res = await fn(selected.workflowId, payload)
      setSelected(res.data?.data || res.data)
      await load()
      setStatusMsg(`State: ${(res.data?.data || res.data)?.state}`)
    } catch (err) {
      setStatusMsg(err.userMessage || 'Action failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <StudentLayout title="Workflows">
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface p-6 rounded-stitch border border-divider shadow-sm">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-brand-primary">Autonomous Project Execution</span>
            <h1 className="text-2xl sm:text-3xl font-bold text-content-heading tracking-tight mt-1">Workflow Center</h1>
            <p className="text-sm text-content-muted mt-1 max-w-2xl">
              Plan → approve → execute → verify. Writes never run silently.
              Shell, force-push, and external submit stay blocked.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link className="px-4 py-2 text-sm font-medium bg-surface-elevated hover:bg-surface text-content-heading rounded-stitch border border-divider transition-colors" to="/student/agent">AI Agent</Link>
            <Link className="px-4 py-2 text-sm font-medium bg-brand-primary hover:bg-brand-primary-hover text-white rounded-stitch transition-colors" to="/student/personal-ai">My Intelligence</Link>
          </div>
        </header>

        <section className="bg-surface p-6 rounded-stitch border border-divider shadow-sm space-y-4">
          <h2 className="text-lg font-semibold text-content-heading">Start a workflow</h2>
          <label htmlFor="wf-msg" className="text-xs font-medium text-content-muted uppercase tracking-wider block">What should Dream Wave prepare?</label>
          <textarea id="wf-msg" rows={3} value={message} onChange={(e) => setMessage(e.target.value)} className="w-full bg-surface-elevated text-content-body border border-divider rounded-stitch p-3 text-sm focus:outline-none focus:border-brand-primary" />
          <button type="button" className="px-5 py-2.5 text-sm font-medium bg-brand-primary hover:bg-brand-primary-hover text-white rounded-stitch transition-colors disabled:opacity-50" disabled={busy || !message.trim()} onClick={create}>
            {busy ? 'Working…' : 'Plan workflow'}
          </button>
          {statusMsg && <p className="p-3 bg-brand-primary/10 text-brand-primary rounded-stitch text-xs font-medium" role="status">{statusMsg}</p>}
        </section>

        {loading && <LoadingState label="Loading workflows…" rows={4} />}
        {error && <ErrorState message={error} onRetry={load} />}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <section className="bg-surface p-6 rounded-stitch border border-divider shadow-sm space-y-4">
            <h2 className="text-base font-semibold text-content-heading">Active & recent</h2>
            {!list.length && !loading ? (
              <EmptyState title="No workflows yet" message="Create a preparation plan above." />
            ) : (
              <ul className="space-y-2">
                {list.map((w) => (
                  <li key={w.workflowId}>
                    <button type="button" className="w-full p-3 bg-surface-elevated hover:bg-surface-elevated/80 rounded-stitch border border-divider text-left transition-colors space-y-1 block" onClick={() => open(w.workflowId)}>
                      <strong className="text-xs font-semibold text-content-heading block truncate">{w.name}</strong>
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-brand-primary/10 text-brand-primary rounded-full">{w.state?.replace(/_/g, ' ')}</span>
                        <small className="text-[11px] text-content-muted">{w.template}</small>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="lg:col-span-2 bg-surface p-6 rounded-stitch border border-divider shadow-sm space-y-4" aria-live="polite">
            <h2 className="text-base font-semibold text-content-heading">Workflow details</h2>
            {!selected ? (
              <p className="text-sm text-content-muted">Select a workflow to inspect the plan.</p>
            ) : (
              <>
                <p className="text-sm text-content-heading"><strong className="text-base">{selected.name}</strong> · <span className="text-brand-primary font-semibold">{selected.state?.replace(/_/g, ' ')}</span></p>
                <p className="text-xs text-content-muted">Scope: {(selected.scope || []).join(', ') || '—'}</p>
                <p className="text-sm text-content-body">{selected.resultSummary}</p>

                <h3 className="text-sm font-semibold text-content-heading pt-2 border-t border-divider">Plan</h3>
                <ol className="space-y-3">
                  {(selected.steps || []).map((s) => (
                    <li key={s.stepId} className="p-3 bg-surface-elevated rounded-stitch border border-divider space-y-1">
                      <span className="px-2 py-0.5 text-[10px] font-bold uppercase bg-brand-primary/10 text-brand-primary rounded-full inline-block mb-1">{s.class}</span>
                      <strong className="text-xs font-semibold text-content-heading block">{s.summary}</strong>
                      <small className="text-[11px] text-content-muted block">{s.type} · {s.status}{s.verified ? ' · verified' : ''}</small>
                      {s.error && <small className="text-[11px] text-red-500 block">{s.error}</small>}
                    </li>
                  ))}
                </ol>

                {selected.state === 'AWAITING_APPROVAL' && (
                  <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-stitch space-y-3">
                    <h3 className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Action requires approval</h3>
                    <p className="text-xs text-content-body">The following writes will happen if you approve:</p>
                    <ul className="list-disc list-inside text-xs text-content-body space-y-1">
                      {(selected.pendingWrites || []).map((w) => (
                        <li key={w.stepId}>{w.summary} ({w.tool})</li>
                      ))}
                    </ul>
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <button type="button" className="px-3.5 py-1.5 text-xs font-semibold bg-brand-primary text-white rounded-lg" disabled={busy}
                        onClick={() => act(agentApi.approveWorkflow, { confirmed: true, planHash: selected.planHash })}>
                        Approve
                      </button>
                      <button type="button" className="px-3.5 py-1.5 text-xs font-semibold bg-surface hover:bg-surface-elevated text-content-muted border border-divider rounded-lg" disabled={busy}
                        onClick={() => act(agentApi.rejectWorkflow, { reason: 'User rejected' })}>
                        Reject
                      </button>
                      <button type="button" className="px-3.5 py-1.5 text-xs font-semibold bg-surface hover:bg-surface-elevated text-content-muted border border-divider rounded-lg" disabled={busy}
                        onClick={() => act(agentApi.editWorkflow, { userOverride: 'Do Task B first' })}>
                        Edit plan
                      </button>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2 pt-2">
                  {['RUNNING', 'AWAITING_APPROVAL', 'PLANNED'].includes(selected.state) && (
                    <button type="button" className="px-3.5 py-1.5 text-xs font-medium bg-surface-elevated hover:bg-surface text-content-heading rounded-lg border border-divider" disabled={busy} onClick={() => act(agentApi.pauseWorkflow)}>Pause</button>
                  )}
                  {selected.state === 'PAUSED' && (
                    <button type="button" className="px-3.5 py-1.5 text-xs font-medium bg-surface-elevated hover:bg-surface text-content-heading rounded-lg border border-divider" disabled={busy} onClick={() => act(agentApi.resumeWorkflow)}>Resume</button>
                  )}
                  {!['COMPLETED', 'CANCELLED', 'FAILED'].includes(selected.state) && (
                    <button type="button" className="px-3.5 py-1.5 text-xs font-medium bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg" disabled={busy} onClick={() => act(agentApi.cancelWorkflow)}>Cancel</button>
                  )}
                </div>

                {selected.verification?.summary && (
                  <p className="text-xs text-content-body pt-2 border-t border-divider"><strong>Verification:</strong> {selected.verification.passed ? 'Passed' : 'Issues'} — {selected.verification.summary}</p>
                )}

                <h3 className="text-xs font-semibold text-content-heading pt-2 border-t border-divider">Activity</h3>
                <ul className="space-y-1 text-xs text-content-muted">
                  {(selected.events || []).slice().reverse().map((e, i) => (
                    <li key={i}><strong className="text-content-heading">{e.type}</strong> — {e.summary}</li>
                  ))}
                </ul>
              </>
            )}
          </section>
        </div>
      </div>
    </StudentLayout>
  )
}
