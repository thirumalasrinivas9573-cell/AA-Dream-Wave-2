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
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface p-6 rounded-stitch border border-divider shadow-sm">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-brand-primary">Personal AI Memory 2.0</span>
            <h1 className="text-2xl sm:text-3xl font-bold text-content-heading tracking-tight mt-1">My Memory</h1>
            <p className="text-sm text-content-muted mt-1 max-w-2xl">
              Useful, minimal, and under your control. Dream Wave keeps confirmed context —
              not every conversation. Current instructions always win over old memory.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link className="px-4 py-2 text-sm font-medium bg-surface-elevated hover:bg-surface text-content-heading rounded-stitch border border-divider transition-colors" to="/student/mentor">AI Mentor</Link>
            <Link className="px-4 py-2 text-sm font-medium bg-surface-elevated hover:bg-surface text-content-heading rounded-stitch border border-divider transition-colors" to="/student/personal-ai">Personal AI</Link>
            <button type="button" className="px-4 py-2 text-sm font-medium bg-brand-primary hover:bg-brand-primary-hover text-white rounded-stitch transition-colors" onClick={load} disabled={loading}>Refresh</button>
          </div>
        </header>

        {loading && <LoadingState label="Loading memory…" rows={5} />}
        {error && <ErrorState message={error} onRetry={load} />}

        {!loading && !error && (
          <>
            <section className="bg-surface p-6 rounded-stitch border border-divider shadow-sm space-y-4" aria-labelledby="memory-settings">
              <h2 id="memory-settings" className="text-lg font-semibold text-content-heading">Memory settings</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <label className="flex items-center gap-3 p-3 bg-surface-elevated rounded-stitch border border-divider text-sm text-content-body cursor-pointer">
                  <input
                    type="checkbox"
                    className="rounded border-divider text-brand-primary focus:ring-brand-primary"
                    checked={settings?.memoryEnabled !== false}
                    onChange={() => toggleSetting('memoryEnabled')}
                    disabled={busy}
                  />
                  Personalization memory
                </label>
                <label className="flex items-center gap-3 p-3 bg-surface-elevated rounded-stitch border border-divider text-sm text-content-body cursor-pointer">
                  <input
                    type="checkbox"
                    className="rounded border-divider text-brand-primary focus:ring-brand-primary"
                    checked={settings?.personalizationEnabled !== false}
                    onChange={() => toggleSetting('personalizationEnabled')}
                    disabled={busy}
                  />
                  Use memory in AI
                </label>
                <label className="flex items-center gap-3 p-3 bg-surface-elevated rounded-stitch border border-divider text-sm text-content-body cursor-pointer">
                  <input
                    type="checkbox"
                    className="rounded border-divider text-brand-primary focus:ring-brand-primary"
                    checked={settings?.proactiveMemoryUse !== false}
                    onChange={() => toggleSetting('proactiveMemoryUse')}
                    disabled={busy}
                  />
                  Proactive use
                </label>
                <label className="flex items-center gap-3 p-3 bg-surface-elevated rounded-stitch border border-divider text-sm text-content-body cursor-pointer">
                  <input
                    type="checkbox"
                    className="rounded border-divider text-brand-primary focus:ring-brand-primary"
                    checked={settings?.allowAiDerivedProposals !== false}
                    onChange={() => toggleSetting('allowAiDerivedProposals')}
                    disabled={busy}
                  />
                  Allow AI proposals
                </label>
              </div>
            </section>

            <section className="bg-surface p-6 rounded-stitch border border-divider shadow-sm space-y-2" aria-labelledby="memory-review">
              <h2 id="memory-review" className="text-lg font-semibold text-content-heading">What Dream Wave remembers</h2>
              <p className="text-sm text-content-body">{review?.summary || "I don't have that saved."}</p>
              <small className="text-xs text-content-muted block pt-1">Memory is DATA — not truth. Canonical goals and projects come from live system data.</small>
            </section>

            {pending.length > 0 && (
              <section className="bg-surface p-6 rounded-stitch border border-divider shadow-sm space-y-4" aria-labelledby="memory-pending">
                <h2 id="memory-pending" className="text-lg font-semibold text-content-heading">Confirm before saving</h2>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {pending.map((m) => (
                    <li key={m.id} className="p-4 bg-surface-elevated rounded-stitch border border-divider space-y-3">
                      <div className="flex items-center justify-between">
                        <strong className="text-sm font-semibold text-content-heading">{String(m.type).replace(/_/g, ' ')}</strong>
                        <span className="px-2 py-0.5 text-xs font-medium bg-amber-500/10 text-amber-600 rounded-full">Pending</span>
                      </div>
                      <p className="text-sm text-content-body">{m.content}</p>
                      <div className="flex items-center gap-2 pt-2">
                        <button type="button" className="px-3 py-1.5 text-xs font-medium bg-brand-primary hover:bg-brand-primary-hover text-white rounded-lg transition-colors" disabled={busy} onClick={() => confirmPending(m.id, true)}>
                          Remember
                        </button>
                        <button type="button" className="px-3 py-1.5 text-xs font-medium bg-surface hover:bg-surface-elevated text-content-muted rounded-lg border border-divider transition-colors" disabled={busy} onClick={() => confirmPending(m.id, false)}>
                          Dismiss
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section className="bg-surface p-6 rounded-stitch border border-divider shadow-sm space-y-4" aria-labelledby="memory-add">
              <h2 id="memory-add" className="text-lg font-semibold text-content-heading">Remember something</h2>
              <div className="space-y-3">
                <label htmlFor="memory-draft" className="text-xs font-medium text-content-muted uppercase tracking-wider block">What should AI remember?</label>
                <textarea
                  id="memory-draft"
                  rows={3}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="e.g. I prefer concise explanations"
                  className="w-full bg-surface-elevated text-content-body border border-divider rounded-stitch p-3 text-sm focus:outline-none focus:border-brand-primary"
                />
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <label htmlFor="memory-type" className="text-sm text-content-muted">Category:</label>
                    <select id="memory-type" value={draftType} onChange={(e) => setDraftType(e.target.value)} className="bg-surface-elevated text-content-body border border-divider rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-brand-primary">
                      {(meta?.types || CATEGORIES.filter((c) => c.key !== 'ALL').map((c) => c.key)).map((t) => (
                        <option key={t} value={t}>{String(t).replace(/_/g, ' ')}</option>
                      ))}
                    </select>
                  </div>
                  <button type="button" className="px-4 py-2 text-sm font-medium bg-brand-primary hover:bg-brand-primary-hover text-white rounded-stitch transition-colors disabled:opacity-50" disabled={busy || !draft.trim()} onClick={createMemory}>
                    Remember
                  </button>
                </div>
              </div>
              {message && <p className="p-3 bg-brand-primary/10 text-brand-primary rounded-stitch text-xs font-medium" role="status">{message}</p>}
            </section>

            <section className="space-y-4" aria-label="Search and filter">
              <input
                type="search"
                placeholder="Search memories…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full bg-surface text-content-body border border-divider rounded-stitch p-3 text-sm focus:outline-none focus:border-brand-primary shadow-sm"
                aria-label="Search memories"
              />
              <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none" role="tablist" aria-label="Memory categories">
                {CATEGORIES.map((c) => (
                  <button
                    key={c.key}
                    type="button"
                    role="tab"
                    aria-selected={category === c.key}
                    className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all whitespace-nowrap ${
                      category === c.key
                        ? 'bg-brand-primary text-white shadow-sm'
                        : 'bg-surface hover:bg-surface-elevated text-content-muted hover:text-content-heading border border-divider'
                    }`}
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
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filtered.map((m) => (
                  <li key={m.id} className="bg-surface p-5 rounded-stitch border border-divider shadow-sm space-y-3 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <strong className="text-sm font-semibold text-content-heading">{String(m.type).replace(/_/g, ' ')}</strong>
                        <span className="text-xs font-medium text-content-muted">{m.importance || 'USEFUL'} · {m.confidence}</span>
                      </div>
                      {editingId === m.id ? (
                        <div className="space-y-2">
                          <textarea rows={3} value={editContent} onChange={(e) => setEditContent(e.target.value)} className="w-full bg-surface-elevated text-content-body border border-divider rounded-stitch p-2 text-sm focus:outline-none focus:border-brand-primary" />
                          <div className="flex items-center gap-2">
                            <button type="button" className="px-3 py-1 text-xs font-medium bg-brand-primary text-white rounded-lg" disabled={busy} onClick={() => saveEdit(m.id)}>Save</button>
                            <button type="button" className="px-3 py-1 text-xs font-medium bg-surface-elevated text-content-muted rounded-lg border border-divider" onClick={() => setEditingId(null)}>Cancel</button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-content-body">{m.content}</p>
                      )}
                      <div className="space-y-0.5 text-xs text-content-muted pt-2 border-t border-divider/50">
                        <div>Source: {sourceLabel(m.source)}</div>
                        <div>Updated: {m.updatedAt ? new Date(m.updatedAt).toLocaleString() : '—'}</div>
                        {m.previousContent && <div>Previous: {m.previousContent.slice(0, 60)}{m.previousContent.length > 60 ? '…' : ''}</div>}
                        {m.metadata?.whyRemembered && <div>Why: {m.metadata.whyRemembered}</div>}
                        {m.expiresAt && <div>Expires: {new Date(m.expiresAt).toLocaleDateString()}</div>}
                      </div>
                    </div>
                    {editingId !== m.id && (
                      <div className="flex items-center gap-2 pt-3 border-t border-divider">
                        <button
                          type="button"
                          className="px-3 py-1 text-xs font-medium bg-surface-elevated hover:bg-surface text-content-body rounded-lg border border-divider transition-colors"
                          onClick={() => { setEditingId(m.id); setEditContent(m.content) }}
                        >
                          Edit
                        </button>
                        <button type="button" className="px-3 py-1 text-xs font-medium bg-surface-elevated hover:bg-surface text-content-body rounded-lg border border-divider transition-colors" disabled={busy} onClick={() => archive(m.id)}>
                          Archive
                        </button>
                        <button type="button" className="px-3 py-1 text-xs font-medium bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-colors ml-auto" disabled={busy} onClick={() => remove(m.id, m.content)}>
                          Forget
                        </button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}

            <section className="bg-surface p-6 rounded-stitch border border-divider shadow-sm space-y-2">
              <h2 className="text-base font-semibold text-content-heading">Privacy</h2>
              <p className="text-xs text-content-muted leading-relaxed">
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
