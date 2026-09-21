import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { memoryApi } from '@shared/services/api'
import { EmptyState, ErrorState, LoadingState } from '@shared/components/ui'
import StudentLayout from '../layouts/StudentLayout'
import '../styles/memory.css'

const CATEGORIES = [
  { key: 'ALL', label: 'All' },
  { key: 'CAREER_CONTEXT', label: 'Career' },
  { key: 'LEARNING_CONTEXT', label: 'Learning' },
  { key: 'PROJECT_CONTEXT', label: 'Projects' },
  { key: 'PREFERENCE', label: 'Preferences' },
  { key: 'COMMUNICATION_STYLE', label: 'Communication' },
  { key: 'GOAL_CONTEXT', label: 'Goals' },
  { key: 'IMPORTANT_CONTEXT', label: 'Important' },
  { key: 'TEMPORARY_CONTEXT', label: 'Temporary' },
  { key: 'WORKFLOW_PREFERENCE', label: 'Workflow' },
  { key: 'DECISION', label: 'Decisions' },
  { key: 'PERSONALIZATION', label: 'Personalization' },
]

function sourceLabel(source) {
  if (source === 'USER_EXPLICIT') return 'You'
  if (source === 'USER_CONFIRMED') return 'Confirmed'
  if (source === 'SYSTEM_VERIFIED') return 'System verified'
  if (source === 'AI_DERIVED') return 'AI proposed'
  if (!source) return 'System'
  return source.replace(/_/g, ' ').toLowerCase()
}

export default function MemoryManagement() {
  const [memories, setMemories] = useState([])
  const [pending, setPending] = useState([])
  const [review, setReview] = useState(null)
  const [meta, setMeta] = useState(null)
  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [category, setCategory] = useState('ALL')
  const [query, setQuery] = useState('')
  const [draft, setDraft] = useState('')
  const [draftType, setDraftType] = useState('PREFERENCE')
  const [editingId, setEditingId] = useState(null)
  const [editContent, setEditContent] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [centerRes, reviewRes, metaRes] = await Promise.all([
        memoryApi.center(),
        memoryApi.review(),
        memoryApi.meta(),
      ])
      const center = centerRes.data?.data || {}
      const groups = center.groups || {}
      const flat = [
        ...(groups.Career || []),
        ...(groups.Learning || []),
        ...(groups.Projects || []),
        ...(groups.Preferences || []),
        ...(groups.Important || []),
      ]
      // Deduplicate by id
      const byId = new Map()
      for (const m of flat) byId.set(m.id, m)
      setMemories([...byId.values()])
      setPending(center.pendingConfirmation || [])
      setSettings(center.settings || null)
      setReview(reviewRes.data?.data || null)
      setMeta(metaRes.data?.data || null)
    } catch (err) {
      setError(err.userMessage || 'Unable to load AI memory.')
      setMemories([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const filtered = useMemo(() => {
    return memories.filter((m) => {
      if (category !== 'ALL' && m.type !== category) return false
      if (query && !String(m.content).toLowerCase().includes(query.toLowerCase())) return false
      return true
    })
  }, [memories, category, query])

  const createMemory = async () => {
    if (!draft.trim()) return
    setBusy(true)
    setMessage('')
    try {
      await memoryApi.create({
        content: draft.trim(),
        type: draftType,
        source: 'USER_EXPLICIT',
        confidence: 'EXPLICIT',
        confirm: true,
        force: true,
        conflictGroup: ['PREFERENCE', 'COMMUNICATION_STYLE', 'WORKFLOW_PREFERENCE'].includes(draftType)
          ? `pref:${draftType}`
          : draftType === 'CAREER_CONTEXT' || draftType === 'GOAL_CONTEXT'
            ? 'career-goal'
            : undefined,
      })
      setDraft('')
      setMessage('Memory saved.')
      await load()
    } catch (err) {
      setMessage(err.userMessage || 'Could not save memory.')
    } finally {
      setBusy(false)
    }
  }

  const saveEdit = async (id) => {
    setBusy(true)
    setMessage('')
    try {
      await memoryApi.update(id, { content: editContent.trim() })
      setEditingId(null)
      setMessage('Memory updated.')
      await load()
    } catch (err) {
      setMessage(err.userMessage || 'Could not update memory.')
    } finally {
      setBusy(false)
    }
  }

  const archive = async (id) => {
    setBusy(true)
    try {
      await memoryApi.archive(id)
      setMessage('Memory archived.')
      await load()
    } catch (err) {
      setMessage(err.userMessage || 'Could not archive.')
    } finally {
      setBusy(false)
    }
  }

  const remove = async (id, content) => {
    if (!window.confirm(`Forget this memory?\n\n“${content}”`)) return
    setBusy(true)
    try {
      await memoryApi.remove(id, { confirm: true })
      setMessage('Memory forgotten.')
      await load()
    } catch (err) {
      setMessage(err.userMessage || 'Could not delete memory.')
    } finally {
      setBusy(false)
    }
  }

  const confirmPending = async (id, accept) => {
    setBusy(true)
    try {
      await memoryApi.confirm(id, { accept })
      setMessage(accept ? 'Memory confirmed.' : 'Proposal dismissed.')
      await load()
    } catch (err) {
      setMessage(err.userMessage || 'Could not update proposal.')
    } finally {
      setBusy(false)
    }
  }

  const toggleSetting = async (key) => {
    if (!settings) return
    setBusy(true)
    try {
      const next = { [key]: !settings[key] }
      const res = await memoryApi.updateSettings(next)
      setSettings(res.data?.data || { ...settings, ...next })
      setMessage('Memory settings updated.')
    } catch (err) {
      setMessage(err.userMessage || 'Could not update settings.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <StudentLayout title="My Memory">
      <div className="dw-memory">
        <header className="dw-memory__hero">
          <div>
            <p className="dw-memory__eyebrow">Personal AI Memory 2.0</p>
            <h1>My Memory</h1>
            <p>
              Useful, minimal, and under your control. Dream Wave keeps confirmed context —
              not every conversation. Current instructions always win over old memory.
            </p>
          </div>
          <div className="dw-memory__hero-actions">
            <Link className="btn btn-secondary" to="/student/mentor">AI Mentor</Link>
            <Link className="btn btn-secondary" to="/student/personal-ai">Personal AI</Link>
            <button type="button" className="btn btn-primary" onClick={load} disabled={loading}>Refresh</button>
          </div>
        </header>

        {loading && <LoadingState label="Loading memory…" rows={5} />}
        {error && <ErrorState message={error} onRetry={load} />}

        {!loading && !error && (
          <>
            <section className="dw-memory__panel" aria-labelledby="memory-settings">
              <h2 id="memory-settings">Memory settings</h2>
              <div className="dw-memory__toggles">
                <label>
                  <input
                    type="checkbox"
                    checked={settings?.memoryEnabled !== false}
                    onChange={() => toggleSetting('memoryEnabled')}
                    disabled={busy}
                  />
                  Personalization memory
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={settings?.personalizationEnabled !== false}
                    onChange={() => toggleSetting('personalizationEnabled')}
                    disabled={busy}
                  />
                  Use memory in AI
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={settings?.proactiveMemoryUse !== false}
                    onChange={() => toggleSetting('proactiveMemoryUse')}
                    disabled={busy}
                  />
                  Proactive use
                </label>
                <label>
                  <input
                    type="checkbox"
                    checked={settings?.allowAiDerivedProposals !== false}
                    onChange={() => toggleSetting('allowAiDerivedProposals')}
                    disabled={busy}
                  />
                  Allow AI proposals
                </label>
              </div>
            </section>

            <section className="dw-memory__panel" aria-labelledby="memory-review">
              <h2 id="memory-review">What Dream Wave remembers</h2>
              <p>{review?.summary || "I don't have that saved."}</p>
              <small>Memory is DATA — not truth. Canonical goals and projects come from live system data.</small>
            </section>

            {pending.length > 0 && (
              <section className="dw-memory__panel" aria-labelledby="memory-pending">
                <h2 id="memory-pending">Confirm before saving</h2>
                <ul className="dw-memory__list">
                  {pending.map((m) => (
                    <li key={m.id} className="dw-memory__card">
                      <div className="dw-memory__card-head">
                        <strong>{String(m.type).replace(/_/g, ' ')}</strong>
                        <span>Pending</span>
                      </div>
                      <p>{m.content}</p>
                      <div className="dw-memory__actions">
                        <button type="button" className="btn btn-primary" disabled={busy} onClick={() => confirmPending(m.id, true)}>
                          Remember
                        </button>
                        <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => confirmPending(m.id, false)}>
                          Dismiss
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section className="dw-memory__panel" aria-labelledby="memory-add">
              <h2 id="memory-add">Remember something</h2>
              <label htmlFor="memory-draft">What should AI remember?</label>
              <textarea
                id="memory-draft"
                rows={3}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="e.g. I prefer concise explanations"
              />
              <div className="dw-memory__row">
                <label htmlFor="memory-type">
                  Category
                  <select id="memory-type" value={draftType} onChange={(e) => setDraftType(e.target.value)}>
                    {(meta?.types || CATEGORIES.filter((c) => c.key !== 'ALL').map((c) => c.key)).map((t) => (
                      <option key={t} value={t}>{String(t).replace(/_/g, ' ')}</option>
                    ))}
                  </select>
                </label>
                <button type="button" className="btn btn-primary" disabled={busy || !draft.trim()} onClick={createMemory}>
                  Remember
                </button>
              </div>
              {message && <p className="dw-memory__note" role="status">{message}</p>}
            </section>

            <section className="dw-memory__toolbar" aria-label="Search and filter">
              <input
                type="search"
                placeholder="Search memories"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Search memories"
              />
              <div className="dw-memory__cats" role="tablist" aria-label="Memory categories">
                {CATEGORIES.map((c) => (
                  <button
                    key={c.key}
                    type="button"
                    role="tab"
                    aria-selected={category === c.key}
                    className={category === c.key ? 'is-active' : ''}
                    onClick={() => setCategory(c.key)}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </section>

            {!filtered.length ? (
              <EmptyState
                title="No memories in this view"
                message="Save a preference or important context to personalize Dream Wave over time."
              />
            ) : (
              <ul className="dw-memory__list">
                {filtered.map((m) => (
                  <li key={m.id} className="dw-memory__card">
                    <div className="dw-memory__card-head">
                      <strong>{String(m.type).replace(/_/g, ' ')}</strong>
                      <span>{m.importance || 'USEFUL'} · {m.confidence}</span>
                    </div>
                    {editingId === m.id ? (
                      <div className="dw-memory__edit">
                        <textarea rows={3} value={editContent} onChange={(e) => setEditContent(e.target.value)} />
                        <div className="dw-memory__actions">
                          <button type="button" className="btn btn-primary" disabled={busy} onClick={() => saveEdit(m.id)}>Save</button>
                          <button type="button" className="btn btn-secondary" onClick={() => setEditingId(null)}>Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <p>{m.content}</p>
                    )}
                    <div className="dw-memory__meta">
                      <small>Source: {sourceLabel(m.source)}</small>
                      <small>Updated: {m.updatedAt ? new Date(m.updatedAt).toLocaleString() : '—'}</small>
                      {m.previousContent && <small>Previous: {m.previousContent.slice(0, 60)}{m.previousContent.length > 60 ? '…' : ''}</small>}
                      {m.metadata?.whyRemembered && <small>Why: {m.metadata.whyRemembered}</small>}
                      {m.expiresAt && <small>Expires: {new Date(m.expiresAt).toLocaleDateString()}</small>}
                    </div>
                    {editingId !== m.id && (
                      <div className="dw-memory__actions">
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => { setEditingId(m.id); setEditContent(m.content) }}
                        >
                          Edit
                        </button>
                        <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => archive(m.id)}>
                          Archive
                        </button>
                        <button type="button" className="btn btn-danger" disabled={busy} onClick={() => remove(m.id, m.content)}>
                          Forget
                        </button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}

            <section className="dw-memory__panel dw-memory__footnote">
              <h2>Privacy</h2>
              <p>
                Memories are private to your student account. Institution and company portals cannot
                read them. Secrets and sensitive attributes are blocked. Saying “give me a detailed
                explanation” always overrides a concise-preference memory.
              </p>
            </section>
          </>
        )}
      </div>
    </StudentLayout>
  )
}
