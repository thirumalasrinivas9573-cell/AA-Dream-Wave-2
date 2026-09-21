import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import StudentLayout from '../layouts/StudentLayout'
import { ErrorState, LoadingState } from '@shared/components/ui'
import { intelligenceApi } from '@shared/services/api'
import useIntelligence from '../hooks/useIntelligence'
import {
  ActionCenter,
  DailyBriefCard,
  InsightArchitectureGrid,
  IntelligencePanel,
  KnowledgeMemoryPanel,
  LearningDashboardPanel,
  LearningIntelligencePanel,
  LearningPlanPanel,
  PersonalProfileSummary,
  ProgressSummaryGrid,
  RecommendationList,
} from '../components/intelligence/IntelligenceWidgets'
import '../styles/intelligence.css'

const ASK_EXAMPLES = [
  'What should I learn for my current project?',
  'How does my project connect to my career?',
  'What skills am I missing?',
  'What should I do today?',
  'Which opportunities align with my project?',
  'What is blocking my progress?',
]

function BrainAskPanel() {
  const [message, setMessage] = useState('')
  const [summary, setSummary] = useState(null)
  const [result, setResult] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const loadSummary = useCallback(async () => {
    try {
      const res = await intelligenceApi.brainSummary()
      setSummary(res.data?.data || res.data)
    } catch {
      setSummary(null)
    }
  }, [])

  useEffect(() => {
    loadSummary()
  }, [loadSummary])

  const ask = async (text) => {
    const q = (text || message).trim()
    if (!q) return
    setBusy(true)
    setError('')
    setResult(null)
    try {
      const res = await intelligenceApi.brainAsk({ message: q, includeAgent: false })
      setResult(res.data?.data || res.data)
      setMessage(q)
    } catch (err) {
      setError(err.userMessage || 'Unified Brain could not answer.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="dw-brain">
      <div className="dw-brain__focus" aria-labelledby="brain-focus-title">
        <h3 id="brain-focus-title">Current intelligence</h3>
        {!summary ? (
          <p className="dw-brain__muted">Focus summary loads from goals, projects, learning, and Daily Life.</p>
        ) : (
          <ul className="dw-brain__focus-list">
            <li><strong>Goal:</strong> {summary.goal?.title || 'Not set'}</li>
            <li><strong>Project:</strong> {summary.project?.title || 'Not set'}</li>
            <li><strong>Learning:</strong> {summary.learning || 'Not set'}</li>
            <li><strong>Deadline:</strong> {summary.importantDeadline?.title || 'None upcoming'}</li>
            <li>
              <strong>Next action:</strong> {summary.recommendedNextAction?.title || '—'}
              {summary.why && <span className="dw-brain__muted"> — {summary.why}</span>}
            </li>
          </ul>
        )}
      </div>

      <label htmlFor="brain-ask-input">Ask across Goals, Projects, Learning, Research, Career, Events, Opportunities, Daily Life</label>
      <textarea
        id="brain-ask-input"
        rows={3}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="e.g. What should I learn for my current project?"
        aria-label="Unified Dream Wave AI question"
      />
      <div className="dw-brain__examples" role="group" aria-label="Example questions">
        {ASK_EXAMPLES.map((ex) => (
          <button key={ex} type="button" onClick={() => ask(ex)} disabled={busy}>{ex}</button>
        ))}
      </div>
      <div className="dw-brain__actions">
        <button type="button" className="btn btn-primary" disabled={busy || !message.trim()} onClick={() => ask()}>
          {busy ? 'Thinking…' : 'Ask Dream Wave AI'}
        </button>
        <Link className="btn btn-secondary" to="/student/knowledge">My Knowledge</Link>
        <Link className="btn btn-secondary" to="/student/personal-ai">My Intelligence</Link>
        <Link className="btn btn-secondary" to="/student/mentor">Open Mentor</Link>
        <Link className="btn btn-secondary" to="/student/agent">Open Agent</Link>
        <Link className="btn btn-secondary" to="/student/memory">AI Memory</Link>
      </div>

      {error && <p className="dw-brain__error" role="alert">{error}</p>}

      {busy && !result && <LoadingState label="Routing across systems…" rows={3} />}

      {result && (
        <div className="dw-brain__result" aria-live="polite">
          <p className="dw-brain__label">Answer</p>
          <p>{result.answer}</p>
          {result.why && (
            <>
              <p className="dw-brain__label">Why</p>
              <p>{result.why}</p>
            </>
          )}
          {result.recommendedAction && (
            <>
              <p className="dw-brain__label">Recommended action</p>
              <p>
                {result.recommendedAction.title}
                {result.recommendedAction.url && (
                  <> — <Link to={result.recommendedAction.url}>Open</Link></>
                )}
              </p>
            </>
          )}
          {result.transparency && <p className="dw-brain__muted">{result.transparency}</p>}
          {result.conflicts?.length > 0 && (
            <div className="dw-brain__conflict" role="status">
              <p className="dw-brain__label">Conflict</p>
              {result.conflicts.map((c, i) => (
                <p key={i}>{c.what} (sources: {(c.sources || []).join(', ')})</p>
              ))}
            </div>
          )}
          {result.relevantContext?.connections?.length > 0 && (
            <details>
              <summary>Relevant context</summary>
              <ul>
                {result.relevantContext.connections.map((c, i) => (
                  <li key={i}>{c.what} <small>({c.source} · {c.alignment})</small></li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </div>
  )
}

export default function IntelligenceHome() {
  const { sections, loading, error, refresh } = useIntelligence()

  return (
    <StudentLayout>
      <div className="dw-intelligence">
        <header className="dw-intelligence__hero">
          <div>
            <p className="dw-intelligence__eyebrow">Dream Wave AI</p>
            <h1>AI Intelligence Workspace</h1>
            <p>
              Unified brain across goals, projects, learning, research, career, events, and daily life —
              without treating modules as isolated silos.
            </p>
          </div>
          <div className="dw-intelligence__hero-actions">
            <button type="button" className="btn btn-secondary" onClick={() => refresh()} disabled={loading}>
              Refresh
            </button>
            <Link className="btn btn-primary" to="/student/mentor">Open Mentor</Link>
          </div>
        </header>

        {error && <ErrorState title="AI workspace unavailable" message={error} onRetry={refresh} />}

        <IntelligencePanel title="Dream Wave AI — Unified Brain" icon="✦" id="intel-brain">
          <BrainAskPanel />
        </IntelligencePanel>

        <ProgressSummaryGrid summary={sections.progressSummary} />

        <div className="dw-intelligence__layout">
          <div className="dw-intelligence__main">
            <IntelligencePanel title="Daily AI Brief" icon="🌅" id="intel-daily-brief">
              <DailyBriefCard brief={sections.dailyBrief} loading={loading} />
            </IntelligencePanel>

            <IntelligencePanel title="Today's Learning Plan" icon="📋" id="intel-learning-plan">
              <LearningPlanPanel plan={sections.learningPlan} loading={loading} />
            </IntelligencePanel>

            <IntelligencePanel title="Learning Intelligence" icon="🎓" id="intel-learning-intel">
              <LearningIntelligencePanel dashboard={sections.learningDashboard} loading={loading} />
            </IntelligencePanel>

            <div className="dw-intelligence__grid">
              <IntelligencePanel title="Priority Goals" icon="🎯" id="intel-goals">
                <RecommendationList
                  items={sections.priorityGoals.map((item) => ({
                    id: item.id,
                    title: item.title,
                    subtitle: `${item.progress || 0}% · ${item.priority || 'medium'}`,
                    url: item.url,
                  }))}
                  emptyLabel="Create a goal to see priorities here."
                />
              </IntelligencePanel>

              <IntelligencePanel title="Recommended Tasks" icon="✓" id="intel-tasks">
                <RecommendationList
                  items={sections.recommendedTasks.map((item) => ({
                    id: item.id,
                    title: item.title,
                    subtitle: item.dueDate ? `Due ${new Date(item.dueDate).toLocaleDateString()}` : item.priority,
                    url: item.url,
                  }))}
                  emptyLabel="Add tasks to get smart recommendations."
                />
              </IntelligencePanel>

              <IntelligencePanel title="Recommended Books" icon="📚" id="intel-books">
                <RecommendationList items={sections.recommendations.books?.items || []} />
              </IntelligencePanel>

              <IntelligencePanel title="Recommended Courses" icon="🎓" id="intel-courses">
                <RecommendationList items={sections.recommendations.courses?.items || []} />
              </IntelligencePanel>

              <IntelligencePanel title="Career Suggestions" icon="🧭" id="intel-career">
                <RecommendationList items={sections.careerSuggestions} />
              </IntelligencePanel>

              <IntelligencePanel title="Learning Progress Summary" icon="📈" id="intel-progress">
                <LearningDashboardPanel dashboard={sections.learningDashboard} loading={loading} />
              </IntelligencePanel>
            </div>

            <IntelligencePanel title="AI Insights" icon="🔮" id="intel-insights">
              <InsightArchitectureGrid insights={sections.insights} />
            </IntelligencePanel>

            <IntelligencePanel title="Knowledge Memory" icon="🧠" id="intel-memory">
              <KnowledgeMemoryPanel memory={sections.knowledgeMemory} />
            </IntelligencePanel>
          </div>

          <aside className="dw-intelligence__aside" aria-label="AI sidebar">
            <IntelligencePanel title="AI Action Center" icon="⚡" id="intel-actions">
              <ActionCenter actions={sections.actionCenter} />
            </IntelligencePanel>

            <IntelligencePanel title="Personal AI Profile" icon="👤" id="intel-profile">
              <PersonalProfileSummary profile={sections.personalProfile} />
            </IntelligencePanel>

            <IntelligencePanel title="Smart Learning Dashboard" icon="📊" id="intel-dashboard">
              <LearningDashboardPanel dashboard={sections.learningDashboard} loading={loading} />
            </IntelligencePanel>
          </aside>
        </div>
      </div>
    </StudentLayout>
  )
}
