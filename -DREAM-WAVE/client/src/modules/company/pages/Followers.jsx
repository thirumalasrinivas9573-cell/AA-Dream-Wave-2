import { useEffect, useState } from 'react'
import CompanyPageHeader from '../components/CompanyPageHeader'
import { companyService } from '../services/api'

export default function Followers() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    companyService.followers()
      .then((r) => setItems(r.data.items || []))
      .catch((err) => setError(err.response?.data?.message || 'Could not load followers'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div>
      <CompanyPageHeader title="Followers" subtitle="Students following your company on Dream Wave." />
      {error && <div role="alert" style={{ color: '#F87171' }}>{error}</div>}
      {loading ? <p style={{ color: '#94A3B8' }}>Loading…</p> : items.length === 0 ? (
        <div className="company-glass company-empty">No followers yet.</div>
      ) : (
        <div className="company-table-wrap company-glass" style={{ padding: 0 }}>
          <table className="company-table">
            <thead>
              <tr><th>Name</th><th>Email</th><th>Followed at</th></tr>
            </thead>
            <tbody>
              {items.map((f) => (
                <tr key={f._id}>
                  <td>{f.studentId?.name || 'Student'}</td>
                  <td>{f.studentId?.email || '—'}</td>
                  <td>{f.createdAt ? new Date(f.createdAt).toLocaleString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
