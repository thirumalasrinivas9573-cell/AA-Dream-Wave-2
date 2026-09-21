import { useEffect, useState } from 'react'
import { Button, ErrorState, LoadingState, EmptyState } from '@shared/components/ui'
import { careerApi } from '@shared/services/api'
import StudentLayout from '../../student/layouts/StudentLayout'
import { ApplyDialog, OpportunityCard, OpportunityFilters } from '../components/CareerWorkspace'
import { useOpportunities } from '../hooks/useCareerData'
import '../styles/career.css'

export default function OpportunityExplorer({ type }) {
  const { items, filters, query, updateQuery, page, setPage, total, loading, error, load, patchItem } = useOpportunities(type)
  const [resumes, setResumes] = useState([])
  const [applyItem, setApplyItem] = useState(null)
  const [message, setMessage] = useState('')
  const title = type === 'job' ? 'Job Explorer' : 'Internship Explorer'
  const detail = type === 'job' ? 'Find verified roles aligned with your skills and preferences.' : 'Discover internships that turn learning into professional experience.'

  useEffect(() => {
    careerApi.resumes().then((response) => setResumes(response.data.items || [])).catch(() => setResumes([]))
  }, [])

  const onSaved = (id, saved) => {
    patchItem(id, { saved })
    setMessage(saved ? 'Opportunity saved.' : 'Removed from saved opportunities.')
  }
  return (
    <StudentLayout>
      <div className="career-shell">
        <header className="career-page-header"><div><span>Live company opportunities</span><h1>{title}</h1><p>{detail}</p></div><strong>{total} open</strong></header>
        <OpportunityFilters type={type} query={query} filters={filters} onChange={updateQuery} />
        {message && <p className="career-message" role="status">{message}</p>}
        {error && <ErrorState title={`${title} unavailable`} message={error} onRetry={load} />}
        {loading ? <LoadingState label={`Loading ${type}s…`} rows={8} /> : !items.length ? <EmptyState title={`No ${type}s match these filters`} message="Try broadening your search, location, skill or work-mode filters." /> : <section className="opportunity-grid">{items.map((item) => <OpportunityCard item={item} type={type} onApply={setApplyItem} onSaved={onSaved} onError={setMessage} key={item._id} />)}</section>}
        {total > 18 && <nav className="career-pagination" aria-label={`${type} result pages`}><Button variant="secondary" disabled={page === 1} onClick={() => setPage((value) => value - 1)}>Previous</Button><span>Page {page} of {Math.ceil(total / 18)}</span><Button variant="secondary" disabled={page >= Math.ceil(total / 18)} onClick={() => setPage((value) => value + 1)}>Next</Button></nav>}
      </div>
      {applyItem && <ApplyDialog item={applyItem} type={type} resumes={resumes} onClose={() => setApplyItem(null)} onApplied={() => { setMessage('Application submitted successfully.'); load() }} />}
    </StudentLayout>
  )
}

export function JobExplorer() {
  return <OpportunityExplorer type="job" />
}

export function InternshipExplorer() {
  return <OpportunityExplorer type="internship" />
}
