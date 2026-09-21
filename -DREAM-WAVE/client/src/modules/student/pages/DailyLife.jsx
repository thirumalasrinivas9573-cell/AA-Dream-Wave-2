import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@shared/context/AuthContext'
import { intelligenceApi } from '@shared/services/api'
import { EmptyState, ErrorState, LoadingState } from '@shared/components/ui'
import StudentLayout from '../layouts/StudentLayout'
import '../styles/daily-life.css'

const ASK_PROMPTS = [
  { q: 'What should I do now?', action: 'next-action' },
  { q: 'Plan my day', action: 'plan-day' },
  { q: 'What am I falling behind on?', action: 'progress-risk' },
  { q: 'What am I missing?', action: 'gap-review' },
  { q: 'What should I learn today?', action: 'learning-next' },
]

function BucketList({ title, items }) {
  if (!items?.length) return null
  return (
    <section className="dw-daily__bucket" aria-labelledby={`bucket-${title}`}>
      <h3 id={`bucket-${title}`}>{title}</h3>
      <ul>
        {items.map((item) => (
          <li key={item.id}>
            <div>
              <strong>{item.title}</strong>
              <p>{item.reason}</p>
              <small>Source: {item.source}</small>
              {item.goalAlignment && <small className="dw-daily__align">{item.goalAlignment.explanation}</small>}
              {item.roadmapAlignment && <small className="dw-daily__align">{item.roadmapAlignment.explanation}</small>}
            </div>
            <div className="dw-daily__row-actions">
              {item.url && <Link to={item.url}>Open</Link>}
              {item.focusUrl && <Link to={item.focusUrl}>Focus</Link>}
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

export default function DailyLife() {
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [breakdownTitle, setBreakdownTitle] = useState('')
  const [proposal, setProposal] = useState(null)
  const [actionBusy, setActionBusy] = useState(false)
  const [actionMessage, setActionMessage] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await intelligenceApi.dailyLife()
      setData(response.data?.data || response.data)
    } catch (err) {
      setError(err.userMessage || 'Unable to load Daily Life.')
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const proposeBreakdown = async () => {
    if (!breakdownTitle.trim()) return
    setActionBusy(true)
    setActionMessage('')
    try {
      const response = await intelligenceApi.dailyLifeBreakdown({ title: breakdownTitle.trim() })
      setProposal(response.data?.data || response.data)
    } catch (err) {
      setActionMessage(err.userMessage || 'Could not propose breakdown.')
    } finally {
      setActionBusy(false)
    }
  }

  const confirmProposal = async () => {
    if (!proposal?.previewId) return
    setActionBusy(true)
    setActionMessage('')
    try {
      const response = await intelligenceApi.dailyLifeConfirmAction({
        previewId: proposal.previewId,
        confirmed: true,
      })
      const result = response.data?.data || response.data
      setActionMessage(`Created ${result.created?.length || 0} task(s).`)
      setProposal(null)
      setBreakdownTitle('')
      await load()
    } catch (err) {
      setActionMessage(err.userMessage || 'Confirmation failed.')
    } finally {
      setActionBusy(false)
    }
  }

  const briefing = data?.briefing
  const next = data?.nextAction
  const plan = data?.plan

  return (
    <StudentLayout>
      <div className="dw-daily">
        <header className="dw-daily__hero">
          <div>
            <p className="dw-daily__eyebrow">Personal AI Operating Layer</p>
            <h1>{briefing?.greeting || `Hello, ${user?.name?.split(' ')[0] || 'there'}`}</h1>
            <p>Coordinate goals, tasks, learning, projects, research, and career with explainable priorities.</p>
          </div>
          <div className="dw-daily__hero-actions">
            <button type="button" className="btn btn-secondary" onClick={load} disabled={loading}>Refresh</button>
            <Link className="btn btn-secondary" to="/student/personal-ai">My Intelligence</Link>
            <Link className="btn btn-primary" to="/student/mentor?action=plan-day">Ask Mentor</Link>
          </div>
        </header>

        {error && <ErrorState title="Daily Life unavailable" message={error} onRetry={load} />}
        {loading && !data && <LoadingState label="Building your daily intelligence…" rows={6} />}

        {!loading && data?.empty && (
          <EmptyState
            title="No daily context yet"
            message="Create a goal or task to unlock next-action and today priorities. Nothing is invented."
          />
        )}

        {data && !data.empty && (
          <>
            <section className="dw-daily__now" aria-labelledby="daily-now">
              <p className="dw-daily__label">What should I do now?</p>
              <h2 id="daily-now">{next?.title}</h2>
              <p><strong>Why:</strong> {next?.why}</p>
              <p><strong>Source:</strong> {next?.source}</p>
              {next?.goalAlignment && <p className="dw-daily__align">{next.goalAlignment.explanation}</p>}
              {next?.roadmapAlignment && <p className="dw-daily__align">{next.roadmapAlignment.explanation}</p>}
              <div className="dw-daily__now-actions">
                {next?.url && <Link className="btn btn-primary" to={next.url}>Open</Link>}
                {next?.focusUrl && <Link className="btn btn-secondary" to={next.focusUrl}>Start Focus</Link>}
              </div>
            </section>

            <div className="dw-daily__grid">
              <div className="dw-daily__main">
                <section className="dw-daily__panel" aria-labelledby="daily-today">
                  <h2 id="daily-today">Today</h2>
                  <p className="dw-daily__note">{plan?.note}</p>
                  <p className="dw-daily__note">{plan?.calendarNote}</p>
                  <BucketList title="Critical" items={plan?.buckets?.Critical} />
                  <BucketList title="Important" items={plan?.buckets?.Important} />
                  <BucketList title="Recommended" items={plan?.buckets?.Recommended} />
                  <BucketList title="Optional" items={plan?.buckets?.Optional} />
                  {!plan?.ordered?.length && (
                    <EmptyState title="No priorities yet" message="Add tasks with deadlines or start a roadmap stage." />
                  )}
                </section>

                <section className="dw-daily__panel" aria-labelledby="daily-deadlines">
                  <h2 id="daily-deadlines">Deadlines & attention</h2>
                  {!data.risks?.items?.length ? (
                    <p className="dw-daily__note">No overdue or stalled signals from available data.</p>
                  ) : (
                    <ul className="dw-daily__risks">
                      {data.risks.items.map((item) => (
                        <li key={`${item.area}-${item.title}`}>
                          <span className="dw-daily__label">{item.language}</span>
                          <strong>{item.title}</strong>
                          <p>{item.detail}</p>
                          {item.url && <Link to={item.url}>Review</Link>}
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              </div>

              <aside className="dw-daily__side">
                <section className="dw-daily__panel" aria-labelledby="daily-learning">
                  <h2 id="daily-learning">Learning</h2>
                  {briefing?.learning?.topic ? (
                    <>
                      <strong>{briefing.learning.topic}</strong>
                      <p>{briefing.learning.why}</p>
                      {briefing.learning.url && <Link to={briefing.learning.url}>Continue</Link>}
                    </>
                  ) : (
                    <p className="dw-daily__note">{briefing?.learning?.note || 'No learning action derived.'}</p>
                  )}
                </section>

                <section className="dw-daily__panel" aria-labelledby="daily-project">
                  <h2 id="daily-project">Project</h2>
                  {briefing?.project?.title ? (
                    <>
                      <strong>{briefing.project.title}</strong>
                      <p>{briefing.project.note}</p>
                      <Link to={briefing.project.url || '/student/profile'}>Open</Link>
                    </>
                  ) : (
                    <p className="dw-daily__note">{briefing?.project?.note}</p>
                  )}
                </section>

                <section className="dw-daily__panel" aria-labelledby="daily-career">
                  <h2 id="daily-career">Career</h2>
                  {briefing?.career?.title ? (
                    <>
                      <strong>{briefing.career.title}</strong>
                      <p>{briefing.career.why}</p>
                      <small>Source: {briefing.career.source}</small>
                      {briefing.career.url && <Link to={briefing.career.url}>Open</Link>}
                    </>
                  ) : (
                    <p className="dw-daily__note">{briefing?.career?.note}</p>
                  )}
                </section>

                <section className="dw-daily__panel" aria-labelledby="daily-events">
                  <h2 id="daily-events">Events</h2>
                  {briefing?.events?.title ? (
                    <>
                      <strong>{briefing.events.title}</strong>
                      <p>{briefing.events.why}</p>
                      <small>Source: {briefing.events.source}</small>
                    </>
                  ) : (
                    <p className="dw-daily__note">{briefing?.events?.note}</p>
                  )}
                </section>

                <section className="dw-daily__panel" aria-labelledby="daily-ai-note">
                  <h2 id="daily-ai-note">AI note</h2>
                  <strong>{briefing?.aiNote?.what}</strong>
                  <p>{briefing?.aiNote?.why}</p>
                  <small>Source: {briefing?.aiNote?.source}</small>
                </section>
              </aside>
            </div>

            <section className="dw-daily__panel" aria-labelledby="daily-assistant">
              <h2 id="daily-assistant">AI Assistant</h2>
              <ul className="dw-daily__prompts">
                {ASK_PROMPTS.map((item) => (
                  <li key={item.action}>
                    <Link to={`/student/mentor?action=${item.action}&q=${encodeURIComponent(item.q)}`}>{item.q}</Link>
                  </li>
                ))}
              </ul>

              <div className="dw-daily__breakdown">
                <h3>Break down a complex task</h3>
                <p className="dw-daily__note">Suggestions require your confirmation before any tasks are created.</p>
                <div className="dw-daily__breakdown-form">
                  <label htmlFor="breakdown-title">Task title</label>
                  <input
                    id="breakdown-title"
                    value={breakdownTitle}
                    onChange={(e) => setBreakdownTitle(e.target.value)}
                    placeholder="e.g. Build AI recommendation system"
                  />
                  <button type="button" className="btn btn-secondary" onClick={proposeBreakdown} disabled={actionBusy || !breakdownTitle.trim()}>
                    Suggest steps
                  </button>
                </div>
                {proposal?.breakdown && (
                  <div className="dw-daily__proposal" role="region" aria-label="Suggested task breakdown">
                    <span className="dw-daily__label">{proposal.label}</span>
                    <ol>
                      {proposal.breakdown.steps.map((step) => (
                        <li key={step.order}>{step.title}</li>
                      ))}
                    </ol>
                    <p className="dw-daily__note">{proposal.note}</p>
                    <div className="dw-daily__now-actions">
                      <button type="button" className="btn btn-primary" onClick={confirmProposal} disabled={actionBusy}>
                        Confirm & create tasks
                      </button>
                      <button type="button" className="btn btn-secondary" onClick={() => setProposal(null)} disabled={actionBusy}>
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
                {actionMessage && <p className="dw-daily__note" role="status">{actionMessage}</p>}
              </div>
            </section>
          </>
        )}

        {data?.setupActions?.length > 0 && (
          <section className="dw-daily__setup" aria-label="Setup actions">
            {data.setupActions.map((action) => (
              <Link key={action.url} className="btn btn-secondary" to={action.url}>{action.label}</Link>
            ))}
          </section>
        )}
      </div>
    </StudentLayout>
  )
}
