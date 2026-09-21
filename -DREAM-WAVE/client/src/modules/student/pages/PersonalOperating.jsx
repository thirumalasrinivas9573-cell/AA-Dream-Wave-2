import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { intelligenceApi } from '@shared/services/api'
import { EmptyState, ErrorState, LoadingState } from '@shared/components/ui'
import StudentLayout from '../layouts/StudentLayout'
import '../styles/personal-operating.css'

function HealthPill({ label, status }) {
  if (!status) return null
  return (
    <div className="dw-pol__health-pill" data-status={status}>
      <span>{label}</span>
      <strong>{String(status).replace(/_/g, ' ')}</strong>
    </div>
  )
}

export default function PersonalOperating() {
  const [data, setData] = useState(null)
  const [controls, setControls] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [ask, setAsk] = useState('')
  const [planResult, setPlanResult] = useState(null)
  const [busy, setBusy] = useState(false)
  const [ctrlMsg, setCtrlMsg] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [home, ctrl] = await Promise.all([
        intelligenceApi.personal(),
        intelligenceApi.personalControls(),
      ])
      setData(home.data?.data || home.data)
      setControls(ctrl.data?.data || ctrl.data)
    } catch (err) {
      setError(err.userMessage || 'Unable to load personal intelligence.')
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const runPlan = async () => {
    if (!ask.trim()) return
    setBusy(true)
    setPlanResult(null)
    try {
      const res = await intelligenceApi.personalPlan({
        message: ask.trim(),
        includeAgents: /\b(prepare|internship|hackathon|week)\b/i.test(ask),
      })
      setPlanResult(res.data?.data || res.data)
    } catch (err) {
      setPlanResult({ answer: err.userMessage || 'Plan failed.', state: 'FAILED' })
    } finally {
      setBusy(false)
    }
  }

  const toggleControl = async (key) => {
    if (!controls?.notifications) return
    setCtrlMsg('')
    try {
      const next = {
        notifications: {
          ...controls.notifications,
          [key]: !controls.notifications[key],
        },
      }
      const res = await intelligenceApi.updatePersonalControls(next)
      setControls(res.data?.data || res.data)
      setCtrlMsg('Preferences saved.')
      await load()
    } catch (err) {
      setCtrlMsg(err.userMessage || 'Could not save preferences.')
    }
  }

  return (
    <StudentLayout title="My Intelligence">
      <div className="dw-pol">
        <header className="dw-pol__hero">
          <div>
            <p className="dw-pol__eyebrow">Personal AI Operating Layer</p>
            <h1>{data?.greeting || 'Welcome'}</h1>
            <p>
              Proactive goal and life intelligence — priorities, health, and next actions from your
              real Dream Wave data. You stay in control.
            </p>
          </div>
          <div className="dw-pol__hero-actions">
            <button type="button" className="btn btn-secondary" onClick={load} disabled={loading}>Refresh</button>
            <Link className="btn btn-secondary" to="/student/daily-life">Daily Life</Link>
            <Link className="btn btn-primary" to="/student/intelligence">AI Workspace</Link>
          </div>
        </header>

        {loading && <LoadingState label="Loading your intelligence…" rows={6} />}
        {error && <ErrorState message={error} onRetry={load} />}

        {!loading && !error && data && (
          <>
            <section className="dw-pol__focus" aria-labelledby="pol-focus">
              <h2 id="pol-focus">Current focus</h2>
              {data.currentFocus?.focus ? (
                <>
                  <p className="dw-pol__focus-title">{data.currentFocus.focus}</p>
                  <p>{data.currentFocus.why}</p>
                  <small>Source: {(data.currentFocus.sources || []).join(' + ') || '—'}</small>
                </>
              ) : (
                <EmptyState title="No focus yet" message="Add a goal, project, or task to establish focus." />
              )}
            </section>

            <section className="dw-pol__next" aria-labelledby="pol-next">
              <h2 id="pol-next">Recommended next action</h2>
              <p className="dw-pol__focus-title">{data.nextAction?.title}</p>
              <p><strong>Why:</strong> {data.nextAction?.why}</p>
              <p><strong>Type:</strong> {data.nextAction?.actionType}</p>
              <small>Source: {data.nextAction?.source}</small>
              {data.nextAction?.url && (
                <div className="dw-pol__actions">
                  <Link className="btn btn-primary" to={data.nextAction.url}>Open</Link>
                </div>
              )}
            </section>

            <div className="dw-pol__grid">
              <section className="dw-pol__panel">
                <h2>Project status</h2>
                <p>{data.currentState?.activeProject?.title || 'Not set'}</p>
                <HealthPill label="Project" status={data.health?.project?.status} />
                <small>{data.health?.project?.why}</small>
              </section>
              <section className="dw-pol__panel">
                <h2>Learning focus</h2>
                <p>{data.currentState?.learningFocus || 'Not set'}</p>
                <HealthPill label="Learning" status={data.health?.learning?.status} />
                <small>{data.health?.learning?.why}</small>
              </section>
              <section className="dw-pol__panel">
                <h2>Goal health</h2>
                <p>{data.currentState?.activeGoal?.title || 'Not set'}</p>
                <HealthPill label="Goal" status={data.health?.goal?.status} />
                <small>{data.health?.goal?.why}</small>
              </section>
              <section className="dw-pol__panel">
                <h2>Career</h2>
                <p>{data.currentState?.careerTarget || 'Not set'}</p>
                <HealthPill label="Career" status={data.health?.career?.status} />
                <small>{data.health?.career?.why}</small>
                {data.health?.career?.note && <small>{data.health.career.note}</small>}
              </section>
            </div>

            <section className="dw-pol__panel">
              <h2>Today</h2>
              <ol className="dw-pol__plan">
                {(data.dailyPlan?.steps || []).map((s) => (
                  <li key={s.order}>
                    <strong>{s.label}:</strong> {s.title}
                    <small>{s.why} · {s.source}</small>
                  </li>
                ))}
              </ol>
              <small>{data.dailyPlan?.note}</small>
            </section>

            <section className="dw-pol__panel">
              <h2>Upcoming deadlines</h2>
              {!data.deadlines?.length ? (
                <p>No dated deadlines in current open work.</p>
              ) : (
                <ul className="dw-pol__list">
                  {data.deadlines.slice(0, 6).map((d) => (
                    <li key={`${d.type}-${d.id}`}>
                      <strong>{d.title}</strong>
                      <span data-risk={d.risk}>{d.risk.replace(/_/g, ' ')}</span>
                      <small>{d.why}</small>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {data.overload?.overloaded && (
              <section className="dw-pol__warn" role="status">
                <h2>Schedule note</h2>
                <p>{data.overload.message}</p>
                <small>{data.overload.caution}</small>
              </section>
            )}

            {data.proactive?.items?.length > 0 && (
              <section className="dw-pol__panel">
                <h2>Proactive signals</h2>
                <ul className="dw-pol__list">
                  {data.proactive.items.map((item, i) => (
                    <li key={i}>
                      <strong>{item.title}</strong>
                      <span>{item.decision}</span>
                      <small>{item.why} · {item.source}</small>
                    </li>
                  ))}
                </ul>
                <small>{data.proactive.note}</small>
              </section>
            )}

            <section className="dw-pol__panel">
              <h2>Weekly review</h2>
              <p>Trend: {data.progressTrend?.trend?.replace(/_/g, ' ')} — {data.progressTrend?.why}</p>
              <div className="dw-pol__review">
                <div>
                  <h3>Completed</h3>
                  <ul>{(data.weeklyReview?.completed || []).slice(0, 5).map((t) => <li key={t}>{t}</li>)}</ul>
                </div>
                <div>
                  <h3>In progress</h3>
                  <ul>{(data.weeklyReview?.inProgress || []).slice(0, 5).map((t) => <li key={t}>{t}</li>)}</ul>
                </div>
                <div>
                  <h3>Missed / overdue</h3>
                  <ul>{(data.weeklyReview?.missed || []).slice(0, 5).map((t) => <li key={t}>{t}</li>)}</ul>
                </div>
              </div>
              <small>{data.weeklyReview?.tone}</small>
            </section>

            <section className="dw-pol__panel" aria-labelledby="pol-ask">
              <h2 id="pol-ask">Ask for a personal plan</h2>
              <label htmlFor="pol-input">What should Dream Wave help you plan?</label>
              <textarea
                id="pol-input"
                rows={3}
                value={ask}
                onChange={(e) => setAsk(e.target.value)}
                placeholder="e.g. Prepare my plan for the AI hackathon"
              />
              <div className="dw-pol__actions">
                <button type="button" className="btn btn-primary" disabled={busy || !ask.trim()} onClick={runPlan}>
                  {busy ? 'Planning…' : 'Build plan'}
                </button>
              </div>
              {planResult && (
                <div className="dw-pol__result" aria-live="polite">
                  <p><strong>Answer:</strong> {planResult.answer}</p>
                  {planResult.why && <p><strong>Why:</strong> {planResult.why}</p>}
                  {planResult.plan?.confirmationRequired && (
                    <p className="dw-pol__caution">Writes require confirmation — nothing was executed automatically.</p>
                  )}
                  {planResult.plan?.steps && (
                    <ol>
                      {planResult.plan.steps.map((s) => (
                        <li key={s.order}>{s.summary}</li>
                      ))}
                    </ol>
                  )}
                </div>
              )}
            </section>

            <section className="dw-pol__panel" aria-labelledby="pol-controls">
              <h2 id="pol-controls">Your controls</h2>
              <p>Proactive notifications and summaries stay under your preferences.</p>
              <div className="dw-pol__toggles">
                {[
                  ['proactiveIntelligence', 'Proactive intelligence'],
                  ['deadlineReminders', 'Deadline reminders'],
                  ['dailyNudge', 'Daily nudge'],
                  ['weeklyReport', 'Weekly report'],
                  ['opportunityAlerts', 'Opportunity alerts'],
                  ['quietHoursEnabled', 'Quiet hours'],
                ].map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    className={controls?.notifications?.[key] ? 'is-on' : ''}
                    onClick={() => toggleControl(key)}
                    aria-pressed={Boolean(controls?.notifications?.[key])}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {ctrlMsg && <p role="status">{ctrlMsg}</p>}
            </section>

            <p className="dw-pol__footnote">{data.memoryNote} · Current instruction overrides memory.</p>
          </>
        )}
      </div>
    </StudentLayout>
  )
}
