import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { careerApi } from '@shared/services/api'
import { EmptyState, ErrorState, LoadingState } from '@shared/components/ui'
import StudentLayout from '../../student/layouts/StudentLayout'
import { ApplicationTimeline } from '../components/CareerWorkspace'
import '../styles/career.css'

const FILTERS = [
  ['all','All'],['pending','Applied'],['reviewing','Under Review'],['shortlisted','Shortlisted'],
  ['interview','Interview'],['accepted','Offers'],['rejected','Rejected'],['withdrawn','Withdrawn'],
]

export default function ApplicationTracker() {
  const [items, setItems] = useState([])
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const { data } = await careerApi.applications()
      setItems(data.items || [])
    } catch (requestError) {
      setError(requestError.userMessage || 'Unable to load applications.')
    } finally {
      setLoading(false)
    }
  }, [])
  useEffect(() => { load() }, [load])
  const filtered = useMemo(() => filter === 'all' ? items : items.filter((item) => item.status === filter), [filter, items])
  const withdraw = async (application) => {
    if (!window.confirm(`Withdraw your application for ${application.opportunity?.title || 'this opportunity'}?`)) return
    try {
      const { data } = await careerApi.withdraw(application._id)
      setItems((current) => current.map((item) => item._id === application._id ? { ...item, status: data.application.status, statusHistory: data.application.statusHistory } : item))
    } catch (requestError) {
      setError(requestError.userMessage || requestError.response?.data?.message || 'Unable to withdraw application.')
    }
  }
  return (
    <StudentLayout>
      <div className="career-shell">
        <header className="career-page-header"><div><span>Hiring pipeline</span><h1>Application Tracker</h1><p>Follow every application from submission through interview and offer.</p></div><strong>{items.length} total</strong></header>
        <nav className="application-filters" aria-label="Application status">{FILTERS.map(([id,label]) => <button type="button" className={filter === id ? 'is-active' : ''} onClick={() => setFilter(id)} key={id}>{label}<span>{id === 'all' ? items.length : items.filter((item) => item.status === id).length}</span></button>)}</nav>
        {error && <ErrorState title="Application tracker unavailable" message={error} onRetry={load} />}
        {loading ? <LoadingState label="Loading applications…" rows={7} /> : !filtered.length ? <EmptyState title="No applications in this stage" message={filter === 'all' ? 'Explore verified jobs and internships to submit your first application.' : 'Applications will move here when their hiring status changes.'} action={filter === 'all' ? <Link to="/student/career/jobs" className="btn btn-primary">Explore jobs</Link> : null} /> : <section className="application-list">{filtered.map((application) => <ApplicationTimeline application={application} onWithdraw={withdraw} key={application._id} />)}</section>}
      </div>
    </StudentLayout>
  )
}
