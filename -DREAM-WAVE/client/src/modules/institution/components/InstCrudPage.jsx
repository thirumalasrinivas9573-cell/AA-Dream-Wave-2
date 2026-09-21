import { useCallback, useEffect, useState } from 'react'
import InstPageHeader from './InstPageHeader'
import { INSTITUTION_THEME } from '../theme'

/**
 * Institution-owned CRUD table (not shared with Student/Company UI).
 */
export default function InstCrudPage({
  title,
  subtitle,
  api,
  fields,
  columns,
  listParams,
  mapCreate,
  emptyHint = 'No records yet. Add the first one.',
  allowCreate = true,
  extraToolbar,
  renderRowExtra,
}) {
  const t = INSTITUTION_THEME
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [form, setForm] = useState({})
  const [editing, setEditing] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [q, setQ] = useState('')

  const canCreate = allowCreate && typeof api.create === 'function'
  const canUpdate = typeof api.update === 'function'
  const canDelete = typeof api.delete === 'function'

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = { limit: 100, ...(listParams || {}) }
      if (q.trim()) params.q = q.trim()
      const { data } = await api.list(params)
      setItems(data.items || [])
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load data')
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [api, listParams, q])

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
    setError('')
    try {
      let payload = { ...form }
      fields.forEach((f) => {
        if (f.type === 'number') payload[f.key] = Number(payload[f.key]) || 0
      })
      if (mapCreate && !editing) payload = mapCreate(payload)
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

  const filtered = items

  return (
    <div>
      <InstPageHeader
        title={title}
        subtitle={subtitle || emptyHint}
        actions={(
          <>
            {extraToolbar}
            <input
              className="inst-input"
              style={{ width: 180 }}
              placeholder="Search…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              aria-label={`Search ${title}`}
            />
            <button type="button" className="inst-btn" onClick={load}>Refresh</button>
            {canCreate && (
              <button type="button" className="inst-btn inst-btn-primary" onClick={openCreate}>+ Add</button>
            )}
          </>
        )}
      />

      {error && <div role="alert" style={{ color: '#DC2626', marginBottom: 12, fontSize: '0.85rem' }}>{error}</div>}

      {showForm && (
        <form onSubmit={save} className="inst-card" style={{ marginBottom: 18 }}>
          <h3 style={{ margin: '0 0 12px' }}>{editing ? 'Edit' : 'Create'} {title}</h3>
          <div className="inst-form-grid">
            {fields.map((f) => (
              <label key={f.key} className={f.type === 'textarea' ? 'full' : ''} style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: '0.8rem' }}>
                {f.label}
                {f.type === 'textarea' ? (
                  <textarea className="inst-input" rows={3} value={form[f.key] ?? ''} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })} required={f.required !== false && f.key === fields[0].key} />
                ) : f.type === 'select' ? (
                  <select className="inst-input" value={form[f.key] ?? ''} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}>
                    {(f.options || []).map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : (
                  <input
                    className="inst-input"
                    type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'}
                    value={form[f.key] ?? ''}
                    onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                    required={f.required !== false && f.key === fields[0].key}
                  />
                )}
              </label>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            <button type="submit" className="inst-btn inst-btn-primary">Save</button>
            <button type="button" className="inst-btn" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </form>
      )}

      {loading ? (
        <p style={{ color: t.muted }}>Loading…</p>
      ) : filtered.length === 0 ? (
        <div className="inst-card inst-empty">{emptyHint}</div>
      ) : (
        <div className="inst-table-wrap">
          <table className="inst-table">
            <thead>
              <tr>
                {columns.map((c) => <th key={c.key}>{c.label}</th>)}
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row._id}>
                  {columns.map((c) => (
                    <td key={c.key}>{String(row[c.key] ?? '—')}</td>
                  ))}
                  <td style={{ whiteSpace: 'nowrap' }}>
                    {renderRowExtra?.(row)}
                    {canUpdate && <button type="button" className="inst-btn" style={{ marginRight: 6 }} onClick={() => openEdit(row)}>Edit</button>}
                    {canDelete && <button type="button" className="inst-btn" onClick={() => remove(row._id)}>Delete</button>}
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
