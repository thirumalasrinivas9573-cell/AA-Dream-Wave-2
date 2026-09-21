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
      <div className="dw-wf">
        <header className="dw-wf__hero">
          <div>
            <p className="dw-wf__eyebrow">Autonomous Project Execution</p>
            <h1>Workflow Center</h1>
            <p>
              Plan → approve → execute → verify. Writes never run silently.
              Shell, force-push, and external submit stay blocked.
            </p>
          </div>
          <div className="dw-wf__actions">
            <Link className="btn btn-secondary" to="/student/agent">AI Agent</Link>
            <Link className="btn btn-primary" to="/student/personal-ai">My Intelligence</Link>
          </div>
        </header>

        <section className="dw-wf__panel">
          <h2>Start a workflow</h2>
          <label htmlFor="wf-msg">What should Dream Wave prepare?</label>
          <textarea id="wf-msg" rows={3} value={message} onChange={(e) => setMessage(e.target.value)} />
          <button type="button" className="btn btn-primary" disabled={busy || !message.trim()} onClick={create}>
            {busy ? 'Working…' : 'Plan workflow'}
          </button>
          {statusMsg && <p role="status">{statusMsg}</p>}
        </section>

        {loading && <LoadingState label="Loading workflows…" rows={4} />}
        {error && <ErrorState message={error} onRetry={load} />}

        <div className="dw-wf__grid">
          <section className="dw-wf__panel">
            <h2>Active & recent</h2>
            {!list.length && !loading ? (
              <EmptyState title="No workflows yet" message="Create a preparation plan above." />
            ) : (
              <ul className="dw-wf__list">
                {list.map((w) => (
                  <li key={w.workflowId}>
                    <button type="button" onClick={() => open(w.workflowId)}>
                      <strong>{w.name}</strong>
                      <span data-state={w.state}>{w.state?.replace(/_/g, ' ')}</span>
                      <small>{w.template}</small>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="dw-wf__panel" aria-live="polite">
            <h2>Workflow details</h2>
            {!selected ? (
              <p className="dw-wf__muted">Select a workflow to inspect the plan.</p>
            ) : (
              <>
                <p><strong>{selected.name}</strong> · {selected.state?.replace(/_/g, ' ')}</p>
                <p className="dw-wf__muted">Scope: {(selected.scope || []).join(', ') || '—'}</p>
                <p className="dw-wf__muted">{selected.resultSummary}</p>

                <h3>Plan</h3>
                <ol className="dw-wf__steps">
                  {(selected.steps || []).map((s) => (
                    <li key={s.stepId} data-status={s.status}>
                      <span className="dw-wf__badge" data-class={s.class}>{s.class}</span>
                      <strong>{s.summary}</strong>
                      <small>{s.type} · {s.status}{s.verified ? ' · verified' : ''}</small>
                      {s.error && <small className="dw-wf__err">{s.error}</small>}
                    </li>
                  ))}
                </ol>

                {selected.state === 'AWAITING_APPROVAL' && (
                  <div className="dw-wf__approve">
                    <h3>Action requires approval</h3>
                    <p>The following writes will happen if you approve:</p>
                    <ul>
                      {(selected.pendingWrites || []).map((w) => (
                        <li key={w.stepId}>{w.summary} ({w.tool})</li>
                      ))}
                    </ul>
                    <div className="dw-wf__actions">
                      <button type="button" className="btn btn-primary" disabled={busy}
                        onClick={() => act(agentApi.approveWorkflow, { confirmed: true, planHash: selected.planHash })}>
                        Approve
                      </button>
                      <button type="button" className="btn btn-secondary" disabled={busy}
                        onClick={() => act(agentApi.rejectWorkflow, { reason: 'User rejected' })}>
                        Reject
                      </button>
                      <button type="button" className="btn btn-secondary" disabled={busy}
                        onClick={() => act(agentApi.editWorkflow, { userOverride: 'Do Task B first' })}>
                        Edit plan
                      </button>
                    </div>
                  </div>
                )}

                <div className="dw-wf__actions">
                  {['RUNNING', 'AWAITING_APPROVAL', 'PLANNED'].includes(selected.state) && (
                    <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => act(agentApi.pauseWorkflow)}>Pause</button>
                  )}
                  {selected.state === 'PAUSED' && (
                    <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => act(agentApi.resumeWorkflow)}>Resume</button>
                  )}
                  {!['COMPLETED', 'CANCELLED', 'FAILED'].includes(selected.state) && (
                    <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => act(agentApi.cancelWorkflow)}>Cancel</button>
                  )}
                </div>

                {selected.verification?.summary && (
                  <p><strong>Verification:</strong> {selected.verification.passed ? 'Passed' : 'Issues'} — {selected.verification.summary}</p>
                )}

                <h3>Activity</h3>
                <ul className="dw-wf__events">
                  {(selected.events || []).slice().reverse().map((e, i) => (
                    <li key={i}><strong>{e.type}</strong> — {e.summary}</li>
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
