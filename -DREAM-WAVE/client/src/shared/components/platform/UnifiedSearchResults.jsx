import { Link } from 'react-router-dom'
import { EmptyState, LoadingState } from '@shared/components/ui'

const LABELS = {
  goals: 'Goals', tasks: 'Tasks', books: 'Books', certificates: 'Certificates',
  courses: 'Courses', roadmaps: 'Roadmaps', jobs: 'Jobs', internships: 'Internships',
  reports: 'Reports', notifications: 'Notifications', profile: 'Student Profile',
  support: 'Support', companies: 'Companies', resumes: 'Resumes',
  career: 'Career', conversations: 'AI Conversations',
}

export function SearchSuggestions({ recent, suggestions, onSelect, onClear }) {
  if (!recent?.length && !suggestions?.length) return null
  return <section className="platform-search-suggestions" aria-label="Search suggestions">
    {recent?.length > 0 && <div><header><strong>Recent searches</strong><button type="button" onClick={onClear}>Clear</button></header><nav>{recent.map((item) => <button type="button" onClick={() => onSelect(item)} key={item}>↺ {item}</button>)}</nav></div>}
    {suggestions?.length > 0 && <div><header><strong>Suggestions</strong></header><nav>{suggestions.map((item) => <button type="button" onClick={() => onSelect(item)} key={item}>⌕ {item}</button>)}</nav></div>}
  </section>
}

export default function UnifiedSearchResults({ items, loading, query, sourceErrors = {}, compact = false, onNavigate, onReport }) {
  if (loading) return <LoadingState label="Searching Dream Wave…" rows={compact ? 4 : 8} />
  if (!items.length) return <EmptyState title={query ? 'No matching results' : 'Start searching your ecosystem'} message={query ? 'Try another keyword or a broader category.' : 'Search goals, tasks, books, certificates, courses, roadmaps, careers, reports, notifications and profile data.'} />
  const groups = items.reduce((result, item) => ({ ...result, [item.entityType]: [...(result[item.entityType] || []), item] }), {})
  return <div className={`platform-search-results ${compact ? 'is-compact' : ''}`}>
    {Object.entries(sourceErrors).length > 0 && <p className="platform-partial-warning" role="status">Some search sources are temporarily unavailable. Available results are shown.</p>}
    {Object.entries(groups).map(([type, results]) => <section key={type} aria-labelledby={`search-group-${type}`}><header><h2 id={`search-group-${type}`}>{LABELS[type] || type}</h2><span>{results.length}</span></header><div>{results.map((item) => <div className="platform-search-result-row" key={`${item.entityType}-${item.id}`}><Link to={item.url} onClick={onNavigate}><span className={`platform-result-icon platform-result-icon--${item.entityType}`} aria-hidden>{(LABELS[item.entityType] || item.entityType)[0]}</span><div><strong>{item.title}</strong><small>{item.subtitle}</small></div>{item.metadata?.status && <i>{item.metadata.status}</i>}<b aria-hidden>→</b></Link>{onReport && ['companies','jobs','internships','books'].includes(item.entityType) && <button type="button" onClick={() => onReport({ companies: 'company', jobs: 'job', internships: 'internship', books: 'book' }[item.entityType], item.id)}>Report</button>}</div>)}</div></section>)}
  </div>
}
