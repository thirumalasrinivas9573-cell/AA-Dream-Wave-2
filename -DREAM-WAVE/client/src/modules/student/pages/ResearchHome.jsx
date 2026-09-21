import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { EmptyState, LoadingState } from '@shared/components/ui'
import StudentLayout from '../layouts/StudentLayout'
import researchService from '@shared/services/researchService'
import '../styles/research.css'

export default function ResearchHome() {
  const [workspaces, setWorkspaces] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ title: '', researchQuestion: '', description: '' })
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const response = await researchService.list({ force: true })
      setWorkspaces(response.items || [])
    } catch (err) {
      setError(err.userMessage || err.message || 'Failed to load research workspace.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function createWorkspace(e) {
    e.preventDefault()
    if (!form.title.trim() || !form.researchQuestion.trim()) return
    setBusy(true)
    try {
      await researchService.api.create({
        title: form.title.trim(),
        researchQuestion: form.researchQuestion.trim(),
        description: form.description.trim(),
      })
      setForm({ title: '', researchQuestion: '', description: '' })
      researchService.invalidate()
      await load()
    } catch (err) {
      setError(err.userMessage || err.message)
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return <StudentLayout><div className="research-shell"><LoadingState label="Loading research workspace…" rows={8} /></div></StudentLayout>
  }

  const activeCount = workspaces.filter((item) => !['COMPLETED', 'ARCHIVED'].includes(item.status)).length
  const completedCount = workspaces.filter((item) => item.status === 'COMPLETED').length

  return (
    <StudentLayout>
      <div className="research-shell">
        <header className="research-hero">
          <div>
            <span>AI Research & Knowledge Workspace</span>
            <h1>Understand, verify, organize, and reuse knowledge.</h1>
            <p>Move from question to sources, grounded AI, citations, synthesis, and actionable learning — not generic chat.</p>
          </div>
          <div className="research-hero__stats">
            <div><strong>{activeCount}</strong><span>Active</span></div>
            <div><strong>{completedCount}</strong><span>Completed</span></div>
          </div>
        </header>

        <section className="research-panel">
          <header>
            <h2>New research workspace</h2>
            <form onSubmit={createWorkspace} className="research-form">
              <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Project title" aria-label="Project title" required />
              <input value={form.researchQuestion} onChange={(e) => setForm({ ...form, researchQuestion: e.target.value })} placeholder="Research question" aria-label="Research question" required />
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} placeholder="Objective, scope, or source notes (optional)" aria-label="Research description" />
              <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Creating…' : 'Create workspace'}</button>
            </form>
          </header>
        </section>

        {error && <p className="research-error" role="alert">{error}</p>}

        <section className="research-panel">
          <h2>Your workspaces</h2>
          {workspaces.length ? (
            <ul className="research-project-list">
              {workspaces.map((workspace) => (
                <li key={workspace._id}>
                  <Link to={`/student/research/${workspace._id}`}>
                    <strong>{workspace.title}</strong>
                    <span>{workspace.researchQuestion || 'No question set'}</span>
                    <em>{workspace.status} · {(workspace.sources || []).length} sources · {(workspace.reports || []).length} reports</em>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No research workspaces yet" message="Start with a clear question, add sources, and build evidence-backed reports." />
          )}
        </section>
      </div>
    </StudentLayout>
  )
}
