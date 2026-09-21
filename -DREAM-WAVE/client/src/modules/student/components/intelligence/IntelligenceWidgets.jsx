import { memo } from 'react'
import { Link } from 'react-router-dom'
import { EmptyState, LoadingState } from '@shared/components/ui'
import { formatDashboardDate } from '../dashboard/DashboardWidgets'

export const IntelligencePanel = memo(function IntelligencePanel({
  title,
  icon,
  action,
  children,
  className = '',
  id,
}) {
  const headingId = id || `intel-${title.replace(/\s+/g, '-').toLowerCase()}`
  return (
    <section className={`dw-intel-panel ${className}`.trim()} aria-labelledby={headingId}>
      <header className="dw-intel-panel__header">
        <div className="dw-intel-panel__title">
          <h2 id={headingId}>
            {icon && <span aria-hidden="true">{icon}</span>}
            {title}
          </h2>
        </div>
        {action}
      </header>
      <div className="dw-intel-panel__body">{children}</div>
    </section>
  )
})

export const DailyBriefCard = memo(function DailyBriefCard({ brief, loading }) {
  if (loading) return <LoadingState label="Preparing your daily brief…" rows={3} />
  if (!brief) return <EmptyState title="Daily brief unavailable" message="Check back after your next learning activity." />
  return (
    <article className="dw-intel-brief" aria-label="Daily AI brief">
      <p className="dw-intel-brief__greeting">{brief.greeting}</p>
      <p className="dw-intel-brief__summary">{brief.summary}</p>
      {brief.highlights?.length > 0 && (
        <ul className="dw-intel-brief__list">
          {brief.highlights.map((item) => <li key={item}>{item}</li>)}
        </ul>
      )}
    </article>
  )
})

export const LearningPlanPanel = memo(function LearningPlanPanel({ plan, loading }) {
  if (loading) return <LoadingState label="Building learning plan…" rows={4} />
  if (!plan?.items?.length) return <EmptyState title="No plan yet" message="Complete a goal or task to generate your plan." />
  return (
    <ol className="dw-intel-plan">
      {plan.items.map((item, index) => (
        <li key={item.id}>
          <span className="dw-intel-plan__step" aria-hidden="true">{index + 1}</span>
          <div className="dw-intel-plan__item">
            <strong>{item.title}</strong>
            <small>{item.duration}</small>
            {item.url && <Link to={item.url}>Start <span aria-hidden="true">→</span></Link>}
          </div>
        </li>
      ))}
    </ol>
  )
})

export const RecommendationList = memo(function RecommendationList({ items = [], emptyLabel = 'No recommendations yet.' }) {
  if (!items.length) return <EmptyState title="Nothing to show" message={emptyLabel} />
  return (
    <ul className="dw-intel-recs">
      {items.map((item) => (
        <li key={item.id}>
          <Link to={item.url || '#'} className="dw-intel-recs__row">
            <span>
              <strong>{item.title}</strong>
              {item.subtitle && <small>{item.subtitle}</small>}
            </span>
            <span aria-hidden="true">→</span>
          </Link>
        </li>
      ))}
    </ul>
  )
})

export const ActionCenter = memo(function ActionCenter({ actions = [] }) {
  return (
    <nav className="dw-intel-actions" aria-label="AI action center">
      {actions.map((action) => (
        <Link key={action.key} to={action.url} className="dw-intel-actions__btn">
          <span aria-hidden="true">{action.icon}</span>
          <span>{action.label}</span>
        </Link>
      ))}
    </nav>
  )
})

function WeeklyChart({ data }) {
  return (
    <div className="dw-intel-weekly" role="img" aria-label="Weekly learning minutes">
      {data.map((day) => (
        <div key={day.label} className="dw-intel-weekly__bar">
          <span style={{ height: `${Math.min(100, day.minutes)}%` }} />
          <small>{day.label}</small>
        </div>
      ))}
    </div>
  )
}

function TagList({ items, label, className = '' }) {
  return (
    <div className={`dw-intel-tags ${className}`.trim()} aria-label={label}>
      {items.map((item) => <span key={item}>{item}</span>)}
    </div>
  )
}

function DeadlineList({ items }) {
  return (
    <ul className="dw-intel-deadlines">
      {items.map((item) => (
        <li key={`${item.type}-${item.id}`}>
          <Link to={item.url}>
            <strong>{item.title}</strong>
            <small>{formatDashboardDate(item.dueDate)}</small>
          </Link>
        </li>
      ))}
    </ul>
  )
}

export const LearningDashboardPanel = memo(function LearningDashboardPanel({ dashboard, loading }) {
  if (loading) return <LoadingState label="Loading learning dashboard…" rows={5} />
  if (!dashboard) return null
  const li = dashboard.learningIntelligence
  return (
    <div className="dw-intel-learning">
      <div className="dw-intel-learning__stats">
        <article>
          <small>Learning streak</small>
          <strong>{dashboard.streak || 0} days</strong>
        </article>
        {dashboard.recommendedNextStep && (
          <article>
            <small>Recommended next step</small>
            <strong>{dashboard.recommendedNextStep.title}</strong>
            {dashboard.recommendedNextStep.why && <p className="dw-intel-learning__why">{dashboard.recommendedNextStep.why}</p>}
            {dashboard.recommendedNextStep.url && <Link to={dashboard.recommendedNextStep.url}>Go</Link>}
          </article>
        )}
        {li?.overview?.currentGoal && (
          <article>
            <small>Current goal</small>
            <strong>{li.overview.currentGoal.title}</strong>
            <p>{li.overview.currentGoal.progress}% · {li.overview.currentGoal.status}</p>
          </article>
        )}
        {li?.overview?.currentTopic && (
          <article>
            <small>Current topic</small>
            <strong>{li.overview.currentTopic}</strong>
          </article>
        )}
      </div>

      {li?.skillGaps?.items?.length > 0 && (
        <section className="dw-intel-learning__section" aria-labelledby="li-skill-gaps">
          <h3 id="li-skill-gaps">Skill gaps</h3>
          <p className="dw-intel-learning__note">{li.skillGaps.summary}</p>
          <ul className="dw-intel-learning__gaps">
            {li.skillGaps.items.slice(0, 6).map((item) => (
              <li key={item.skill} data-state={item.state}>
                <strong>{item.skill}</strong>
                <span>{item.label}</span>
                {item.gap && <small>{item.recommendedNextStep}</small>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {li?.adaptive?.items?.length > 0 && (
        <section className="dw-intel-learning__section" aria-labelledby="li-adaptive">
          <h3 id="li-adaptive">Adaptive roadmap suggestions</h3>
          <p className="dw-intel-learning__note">{li.adaptive.note}</p>
          <ul>
            {li.adaptive.items.map((item) => (
              <li key={`${item.type}-${item.title}`}>
                <span className="dw-origin-label">{item.label}</span>
                <strong>{item.title}</strong>
                <p>{item.reason}</p>
                {item.action?.url && <Link to={item.action.url}>{item.action.label || 'Open'}</Link>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {li?.resources?.items?.length > 0 && (
        <section className="dw-intel-learning__section" aria-labelledby="li-resources">
          <h3 id="li-resources">Relevant resources</h3>
          <ul className="dw-intel-recs">
            {li.resources.items.slice(0, 5).map((item) => (
              <li key={`${item.origin}-${item.title}`}>
                <Link to={item.url || '/student/books'} className="dw-intel-recs__row">
                  <span>
                    <strong>{item.title}</strong>
                    <small>{item.reason}</small>
                  </span>
                  <span aria-hidden="true">→</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {!li && !dashboard.recommendedNextStep && (
        <EmptyState title="No learning activity yet" message="Create a goal or start a roadmap to unlock adaptive learning intelligence." />
      )}

      {dashboard.weeklyProgress?.length > 0 && <WeeklyChart data={dashboard.weeklyProgress} />}
      {dashboard.knowledgeAreas?.length > 0 && <TagList items={dashboard.knowledgeAreas} label="Knowledge areas" />}
      {dashboard.upcomingDeadlines?.length > 0 && <DeadlineList items={dashboard.upcomingDeadlines} />}
    </div>
  )
})

export const LearningIntelligencePanel = memo(function LearningIntelligencePanel({ dashboard, loading }) {
  if (loading) return <LoadingState label="Loading learning intelligence…" rows={4} />
  const li = dashboard?.learningIntelligence
  if (!li) {
    return (
      <EmptyState
        title="Learning Intelligence"
        message="Create a goal with required skills, or generate a roadmap, to see next-best learning actions."
      />
    )
  }
  const prompts = [
    { q: 'What should I learn next?', action: 'learning-next' },
    { q: 'What skill am I missing?', action: 'skill-gap' },
    { q: 'Which resource should I use?', action: 'recommend-books' },
    { q: 'Help me revise this topic.', action: 'revision-plan' },
  ]
  return (
    <div className="dw-learning-intel">
      <div className="dw-learning-intel__hero">
        <p className="dw-origin-label">NEXT BEST LEARNING ACTION</p>
        <h3>{li.nextAction?.study ? `Study: ${li.nextAction.study}` : li.nextAction?.title}</h3>
        <p>{li.nextAction?.why}</p>
        {li.nextAction?.url && (
          <Link className="btn btn-primary" to={li.nextAction.url}>Continue</Link>
        )}
      </div>
      <div className="dw-learning-intel__grid">
        <section>
          <h4>Today</h4>
          <ul>
            {(li.plan?.steps?.slice(0, 4) || []).map((step) => (
              <li key={`${step.order}-${step.title}`}>{step.title}</li>
            ))}
            {!li.plan?.steps?.length && <li>No plan steps yet.</li>}
          </ul>
          {li.plan?.label && <span className="dw-origin-label">{li.plan.label}</span>}
        </section>
        <section>
          <h4>Project → Learning</h4>
          {!li.projectLearning?.items?.length ? (
            <p className="dw-intel-learning__note">No in-progress project learning needs.</p>
          ) : (
            <ul>
              {li.projectLearning.items.slice(0, 3).map((item) => (
                <li key={item.projectId}>
                  <strong>{item.projectTitle}</strong>
                  {item.recommendation && <small>{item.recommendation.study}: {item.recommendation.why}</small>}
                </li>
              ))}
            </ul>
          )}
        </section>
        <section>
          <h4>Research → Learning</h4>
          {!li.researchGaps?.items?.length ? (
            <p className="dw-intel-learning__note">No research-linked study suggestions.</p>
          ) : (
            <ul>
              {li.researchGaps.items.slice(0, 3).map((item) => (
                <li key={`${item.researchId}-${item.gap}`}>
                  <span className="dw-origin-label">{item.label}</span>
                  <strong>{item.gap}</strong>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
      <section className="dw-learning-intel__assistant" aria-labelledby="li-assistant">
        <h4 id="li-assistant">AI Learning Assistant</h4>
        <ul className="dw-learning-intel__prompts">
          {prompts.map((item) => (
            <li key={item.action}>
              <Link to={`/student/mentor?action=${item.action}&q=${encodeURIComponent(item.q)}`}>{item.q}</Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
})

export const InsightArchitectureGrid = memo(function InsightArchitectureGrid({ insights }) {
  const widgets = insights?.widgets || []
  if (!widgets.length) return <EmptyState title="Insights architecture" message="Widgets will populate as learning signals grow." />
  return (
    <div className="dw-intel-insight-grid">
      {widgets.map((widget) => (
        <article key={widget.key} className="dw-intel-insight" data-status={widget.status}>
          <header>
            <h3>{widget.title}</h3>
            <span>{widget.status}</span>
          </header>
          {widget.value !== undefined && (
            <strong className="dw-intel-insight__value">
              {widget.value}
              {(widget.key === 'career-readiness' || widget.key === 'learning-consistency') ? '%' : ''}
            </strong>
          )}
          {widget.streak !== undefined && <p>Streak: {widget.streak} days</p>}
          {widget.items?.length > 0 && (
            <ul>
              {widget.items.slice(0, 3).map((item, index) => (
                <li key={`${widget.key}-${index}`}>{item.name || 'Signal ready'}</li>
              ))}
            </ul>
          )}
          <small>{widget.integration}</small>
        </article>
      ))}
    </div>
  )
})

export const KnowledgeMemoryPanel = memo(function KnowledgeMemoryPanel({ memory }) {
  if (!memory) return null
  const sections = [
    { key: 'learningHistory', title: 'Learning History', items: memory.learningHistory },
    { key: 'completedSessions', title: 'Completed Sessions', items: memory.completedSessions },
    { key: 'bookmarks', title: 'Bookmarks', items: memory.bookmarks },
    { key: 'savedConversations', title: 'Saved AI Conversations', items: memory.savedConversations },
    { key: 'favoriteResources', title: 'Favorite Resources', items: memory.favoriteResources },
    { key: 'recentSuggestions', title: 'Recent AI Suggestions', items: memory.recentSuggestions },
  ]
  return (
    <div className="dw-intel-memory">
      {sections.map((section) => (
        <section key={section.key} aria-labelledby={`memory-${section.key}`}>
          <h3 id={`memory-${section.key}`}>{section.title}</h3>
          {!section.items?.length ? <p className="dw-intel-memory__empty">No entries yet.</p> : (
            <ul>
              {section.items.slice(0, 5).map((item) => (
                <li key={`${section.key}-${item.id || item.session || item.title}`}>
                  {item.url ? <Link to={item.url}>{item.title || item.snippet || item.session}</Link> : (item.title || item.snippet || item.session)}
                  {item.progress !== undefined && <small>{Math.round(item.progress)}%</small>}
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
      {memory.architecture && <p className="dw-intel-memory__arch">{memory.architecture.storage}</p>}
    </div>
  )
})

export const PersonalProfileSummary = memo(function PersonalProfileSummary({ profile }) {
  if (!profile) return null
  const facts = [
    { label: 'Goals tracked', value: profile.goals },
    { label: 'Tasks completed', value: profile.completedTasks },
    { label: 'Books in progress', value: profile.readingHistory },
    { label: 'Minutes this week', value: profile.learningTime?.minutesThisWeek || 0 },
  ]
  return (
    <div className="dw-intel-profile">
      <dl>
        {facts.map((fact) => (
          <div key={fact.label}>
            <dt>{fact.label}</dt>
            <dd>{fact.value}</dd>
          </div>
        ))}
      </dl>
      {profile.skills?.length > 0 && <TagList items={profile.skills} label="Tracked skills" />}
      {profile.preferredTopics?.length > 0 && (
        <TagList items={profile.preferredTopics} label="Preferred topics" className="dw-intel-tags--topics" />
      )}
    </div>
  )
})

export const ProgressSummaryGrid = memo(function ProgressSummaryGrid({ summary }) {
  if (!summary) return null
  const items = [
    { label: 'Learning progress', value: `${summary.learningProgress || 0}%`, tone: 'purple' },
    { label: 'Active goals', value: summary.goals || 0, tone: 'blue' },
    { label: 'Tasks done', value: summary.completedTasks || 0, tone: 'green' },
    { label: 'Books reading', value: summary.booksInProgress || 0, tone: 'amber' },
    { label: 'Streak', value: `${summary.streak || 0}d`, tone: 'purple' },
  ]
  return (
    <div className="dw-intel-progress-grid">
      {items.map((item) => (
        <article key={item.label} className={`dw-intel-progress dw-intel-progress--${item.tone}`}>
          <strong>{item.value}</strong>
          <small>{item.label}</small>
        </article>
      ))}
    </div>
  )
})
