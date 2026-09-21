import { useCallback, useEffect, useState } from 'react'
import CompanyPageHeader from '../components/CompanyPageHeader'
import { companyService } from '../services/api'
import { safeExternalUrl } from '@shared/utils/safeUrl'

export default function Applications() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await companyService.applications.list({ limit: 100, status: status || undefined })
      setItems(data.items || [])
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load applications')
    } finally {
      setLoading(false)
    }
  }, [status])

  useEffect(() => { load() }, [load])

  const update = async (id, next) => {
    try {
      await companyService.applications.update(id, { status: next })
      await load()
    } catch (err) {
      setError(err.response?.data?.message || 'Update failed')
    }
  }

  return (
    <div>
      <CompanyPageHeader
        title="Applications"
        subtitle="Review candidates, resumes, and move applications through the hiring pipeline."
        actions={(
          <>
            <select className="company-input" style={{ width: 160 }} value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter status">
              <option value="">All statuses</option>
              {['pending', 'reviewing', 'shortlisted', 'interview', 'accepted', 'rejected'].map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <button type="button" className="company-btn company-btn-secondary" onClick={load}>Refresh</button>
          </>
        )}
      />
      {error && <div role="alert" style={{ color: '#F87171' }}>{error}</div>}
      {loading ? <p style={{ color: '#94A3B8' }}>Loading…</p> : items.length === 0 ? (
        <div className="company-glass company-empty">No applications yet.</div>
      ) : (
        <div className="company-table-wrap company-glass" style={{ padding: 0 }}>
          <table className="company-table">
            <thead>
              <tr>
                <th>Candidate</th>
                <th>Email</th>
                <th>Type</th>
                <th>Status</th>
                <th>Resume</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((a) => (
                <tr key={a._id}>
                  <td>{a.studentId?.name || '—'}</td>
                  <td>{a.studentId?.email || '—'}</td>
                  <td>{a.targetType}</td>
                  <td><span className="company-badge">{a.status}</span></td>
                  <td>{safeExternalUrl(a.resumeUrl, { allowRelative: true }) ? <a href={safeExternalUrl(a.resumeUrl, { allowRelative: true })} target="_blank" rel="noreferrer" style={{ color: '#60A5FA' }}>View</a> : '—'}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <button type="button" className="company-btn company-btn-secondary" onClick={() => update(a._id, 'shortlisted')}>Shortlist</button>{' '}
                    <button type="button" className="company-btn company-btn-secondary" onClick={() => update(a._id, 'interview')}>Interview</button>{' '}
                    <button type="button" className="company-btn company-btn-primary" onClick={() => update(a._id, 'accepted')}>Hire</button>{' '}
                    <button type="button" className="company-btn company-btn-secondary" onClick={() => update(a._id, 'rejected')}>Reject</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
