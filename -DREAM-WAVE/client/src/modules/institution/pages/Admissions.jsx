import { useCallback, useEffect, useState } from 'react'
import InstPageHeader from '../components/InstPageHeader'
import { institutionService } from '../services/api'
import { INSTITUTION_THEME } from '../theme'

export default function Admissions() {
  const t = INSTITUTION_THEME
  const [items, setItems] = useState([])
  const [inbound, setInbound] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ applicantName: '', applicantEmail: '', applicantPhone: '', notes: '', status: 'pending' })
  const [showForm, setShowForm] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const { data } = await institutionService.admissions.list({ limit: 100 })
      setItems(data.items || [])
      setInbound(data.inbound || [])
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load admissions')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const save = async (e) => {
    e.preventDefault()
    try {
      await institutionService.admissions.create(form)
      setShowForm(false)
      setForm({ applicantName: '', applicantEmail: '', applicantPhone: '', notes: '', status: 'pending' })
      await load()
    } catch (err) {
      setError(err.response?.data?.message || 'Create failed')
    }
  }

  const updateStatus = async (id, status, isInbound) => {
    try {
      if (isInbound) await institutionService.admissions.updateInbound(id, { status })
      else await institutionService.admissions.update(id, { status })
      await load()
    } catch (err) {
      setError(err.response?.data?.message || 'Update failed')
    }
  }

  const remove = async (id) => {
    if (!window.confirm('Delete this admission record?')) return
    await institutionService.admissions.delete(id)
    await load()
  }

  return (
    <div>
      <InstPageHeader
        title="Admissions"
        subtitle="Manual admissions plus inbound applications from the Dream Wave student portal."
        actions={(
          <>
            <button type="button" className="inst-btn" onClick={load}>Refresh</button>
            <button type="button" className="inst-btn inst-btn-primary" onClick={() => setShowForm(true)}>+ Add application</button>
          </>
        )}
      />
      {error && <div role="alert" style={{ color: '#DC2626', marginBottom: 12 }}>{error}</div>}

      {showForm && (
        <form onSubmit={save} className="inst-card" style={{ marginBottom: 16 }}>
          <div className="inst-form-grid">
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.8rem' }}>Applicant name<input className="inst-input" value={form.applicantName} onChange={(e) => setForm({ ...form, applicantName: e.target.value })} required /></label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.8rem' }}>Email<input className="inst-input" type="email" value={form.applicantEmail} onChange={(e) => setForm({ ...form, applicantEmail: e.target.value })} required /></label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.8rem' }}>Phone<input className="inst-input" value={form.applicantPhone} onChange={(e) => setForm({ ...form, applicantPhone: e.target.value })} /></label>
            <label className="full" style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.8rem' }}>Notes<textarea className="inst-input" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></label>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button type="submit" className="inst-btn inst-btn-primary">Save</button>
            <button type="button" className="inst-btn" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </form>
      )}

      {loading ? <p style={{ color: t.muted }}>Loading…</p> : (
        <>
          <h3 style={{ margin: '0 0 10px' }}>Portal applications ({inbound.length})</h3>
          {inbound.length === 0 ? <div className="inst-card inst-empty" style={{ marginBottom: 18 }}>No student-portal applications yet.</div> : (
            <div className="inst-table-wrap" style={{ marginBottom: 22 }}>
              <table className="inst-table">
                <thead><tr><th>Name</th><th>Email</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {inbound.map((a) => (
                    <tr key={a._id}>
                      <td>{a.applicantName}</td>
                      <td>{a.applicantEmail}</td>
                      <td><span className="inst-badge">{a.status}</span></td>
                      <td>
                        <button type="button" className="inst-btn" onClick={() => updateStatus(a._id, 'reviewing', true)}>Review</button>{' '}
                        <button type="button" className="inst-btn inst-btn-emerald" onClick={() => updateStatus(a._id, 'accepted', true)}>Accept</button>{' '}
                        <button type="button" className="inst-btn" onClick={() => updateStatus(a._id, 'rejected', true)}>Reject</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <h3 style={{ margin: '0 0 10px' }}>Manual records ({items.length})</h3>
          {items.length === 0 ? <div className="inst-card inst-empty">No manual admission records.</div> : (
            <div className="inst-table-wrap">
              <table className="inst-table">
                <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {items.map((a) => (
                    <tr key={a._id}>
                      <td>{a.applicantName}</td>
                      <td>{a.applicantEmail}</td>
                      <td>{a.applicantPhone || '—'}</td>
                      <td><span className="inst-badge">{a.status}</span></td>
                      <td>
                        <button type="button" className="inst-btn" onClick={() => updateStatus(a._id, 'accepted', false)}>Accept</button>{' '}
                        <button type="button" className="inst-btn" onClick={() => updateStatus(a._id, 'rejected', false)}>Reject</button>{' '}
                        <button type="button" className="inst-btn" onClick={() => remove(a._id)}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}
