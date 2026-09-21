import { useCallback, useEffect, useState } from 'react'
import CompanyPageHeader from './CompanyPageHeader'
import { COMPANY_THEME } from '../theme'

/** Company-owned CRUD table (not shared Student/Institution UI). */
export default function CompanyCrudPage({
  title,
  subtitle,
  api,
  fields,
  columns,
  emptyHint = 'No records yet.',
  mapRow,
}) {
  const t = COMPANY_THEME
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [form, setForm] = useState({})
  const [editing, setEditing] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [q, setQ] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const { data } = await api.list({ limit: 100, q: q.trim() || undefined })
      setItems((data.items || []).map((row) => (mapRow ? mapRow(row) : row)))
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load')
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [api, q, mapRow])

  useEffect(() => { load() }, [load])

  const openCreate = () => {
    const init = {}
    fields.forEach((f) => { init[f.key] = f.default ?? '' })
    setForm(init)
    setEditing(null)
    setShowForm(true)
  }

  const openEdit = (row) => {
    const init = {}
    fields.forEach((f) => {
      const v = row[f.key]
      init[f.key] = Array.isArray(v) ? v.join(', ') : (v ?? (f.default ?? ''))
    })
    setForm(init)
    setEditing(row._id)
    setShowForm(true)
  }

  const save = async (e) => {
    e.preventDefault()
    try {
      const payload = { ...form }
      fields.forEach((f) => {
        if (f.type === 'number') payload[f.key] = Number(payload[f.key]) || 0
      })
      if (editing) await api.update(editing, payload)
      else await api.create(payload)
      setShowForm(false)
      await load()
    } catch (err) {
      setError(err.response?.data?.message || 'Save failed')
    }
  }

  const remove = async (id) => {
    if (!window.confirm('Delete this record?')) return
    try {
      await api.delete(id)
      await load()
    } catch (err) {
      setError(err.response?.data?.message || 'Delete failed')
    }
  }

  return (
    <div>
      <CompanyPageHeader
        title={title}
        subtitle={subtitle || emptyHint}
        actions={(
          <>
            <input className="company-input" style={{ width: 180 }} placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} aria-label={`Search ${title}`} />
            <button type="button" className="company-btn company-btn-secondary" onClick={load}>Refresh</button>
            {typeof api.create === 'function' && (
              <button type="button" className="company-btn company-btn-primary" onClick={openCreate}>+ Add</button>
            )}
          </>
        )}
      />
      {error && <div role="alert" style={{ color: '#F87171', marginBottom: 12 }}>{error}</div>}
      {showForm && (
        <form onSubmit={save} className="company-glass" style={{ marginBottom: 16 }}>
          <h3 style={{ marginTop: 0 }}>{editing ? 'Edit' : 'Create'}</h3>
          <div className="company-form-grid">
            {fields.map((f) => (
              <label key={f.key} className={f.type === 'textarea' ? 'full' : ''} style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.8rem' }}>
                {f.label}
                {f.type === 'textarea' ? (
                  <textarea className="company-input" rows={3} value={form[f.key] ?? ''} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} />
                ) : f.type === 'select' ? (
                  <select className="company-input" value={form[f.key] ?? ''} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}>
                    {(f.options || []).map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : (
                  <input className="company-input" type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : f.type === 'datetime-local' ? 'datetime-local' : 'text'} value={form[f.key] ?? ''} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} required={f.key === fields[0].key} />
                )}
              </label>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <button type="submit" className="company-btn company-btn-primary">Save</button>
            <button type="button" className="company-btn company-btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </form>
      )}
      {loading ? <p style={{ color: t.muted }}>Loading…</p> : items.length === 0 ? (
        <div className="company-glass company-empty">{emptyHint}</div>
      ) : (
        <div className="company-table-wrap company-glass" style={{ padding: 0 }}>
          <table className="company-table">
            <thead>
              <tr>
                {columns.map((c) => <th key={c.key}>{c.label}</th>)}
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row._id}>
                  {columns.map((c) => <td key={c.key}>{String(row[c.key] ?? '—')}</td>)}
                  <td style={{ whiteSpace: 'nowrap' }}>
                    {typeof api.update === 'function' && <button type="button" className="company-btn company-btn-secondary" style={{ marginRight: 6 }} onClick={() => openEdit(row)}>Edit</button>}
                    {typeof api.delete === 'function' && <button type="button" className="company-btn company-btn-secondary" onClick={() => remove(row._id)}>Delete</button>}
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
