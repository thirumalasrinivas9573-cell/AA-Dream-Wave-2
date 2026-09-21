import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ErrorState, EmptyState, LoadingState } from '@shared/components/ui'
import StudentLayout from '../layouts/StudentLayout'
import academicsService from '@shared/services/academicsService'
import '../styles/academics.css'

export default function AcademicsHome() {
  const [overview, setOverview] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ program: '', branch: '', subjectName: '', periodLabel: '' })
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const { data } = await academicsService.overview({ force: true })
      setOverview(data)
      setForm((prev) => ({
        ...prev,
        program: data?.profile?.program || '',
        branch: data?.profile?.branch || '',
      }))
    } catch (err) {
      setError(err.userMessage || err.message || 'Failed to load academic workspace.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function saveProfile(e) {
    e.preventDefault()
    setBusy(true)
    try {
      await academicsService.api.updateProfile({ program: form.program, branch: form.branch })
      await load()
    } catch (err) {
      setError(err.userMessage || err.message)
    } finally {
      setBusy(false)
    }
  }

  async function addPeriod(e) {
    e.preventDefault()
    if (!form.periodLabel.trim()) return
    setBusy(true)
    try {
      await academicsService.api.addPeriod({ label: form.periodLabel, setActive: true, system: 'semester' })
      setForm((prev) => ({ ...prev, periodLabel: '' }))
      await load()
    } catch (err) {
      setError(err.userMessage || err.message)
    } finally {
      setBusy(false)
    }
  }

  async function addSubject(e) {
    e.preventDefault()
    if (!form.subjectName.trim()) return
    setBusy(true)
    try {
      await academicsService.api.createSubject({ name: form.subjectName })
      setForm((prev) => ({ ...prev, subjectName: '' }))
      academicsService.invalidate()
      await load()
    } catch (err) {
      setError(err.userMessage || err.message)
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <StudentLayout>
        <div className="academics-shell"><LoadingState label="Loading academic workspace…" rows={8} /></div>
      </StudentLayout>
    )
  }

  if (error && !overview) {
    return (
      <StudentLayout>
        <ErrorState title="Academic workspace unavailable" message={error} onRetry={load} />
      </StudentLayout>
    )
  }

  const data = overview || {}

  return (
    <StudentLayout>
      <div className="academics-shell">
        <header className="academics-hero">
          <div>
            <span>Academic Intelligence 3.0</span>
            <h1>Your semester, subjects, and study plan — connected.</h1>
            <p>Track syllabus progress, assignments, exams, notes, and revision in one private workspace grounded in your data.</p>
          </div>
          <div className="academics-hero__stats">
            <div><strong>{data.stats?.subjectCount || 0}</strong><span>Subjects</span></div>
            <div><strong>{data.stats?.noteCount || 0}</strong><span>Notes</span></div>
            <div><strong>{data.stats?.examCount || 0}</strong><span>Exams</span></div>
          </div>
        </header>

        {data.setupRequired && (
          <section className="academics-setup">
            <h2>Set up your academic period</h2>
            <form onSubmit={addPeriod} className="academics-inline-form">
              <input value={form.periodLabel} onChange={(e) => setForm({ ...form, periodLabel: e.target.value })} placeholder="e.g. Semester 3 — 2026" aria-label="Academic period label" />
              <button type="submit" className="btn btn-primary" disabled={busy}>Add period</button>
            </form>
          </section>
        )}

        <section className="academics-grid">
          <article className="academics-panel">
            <header><h2>Academic profile</h2></header>
            <form onSubmit={saveProfile} className="academics-form">
              <label>Program<input value={form.program} onChange={(e) => setForm({ ...form, program: e.target.value })} placeholder="B.Tech, B.Sc, MBA…" /></label>
              <label>Branch / specialization<input value={form.branch} onChange={(e) => setForm({ ...form, branch: e.target.value })} placeholder="CSE, Physics…" /></label>
              <button type="submit" className="btn btn-secondary" disabled={busy}>Save profile</button>
            </form>
          </article>

          <article className="academics-panel">
            <header><h2>Priority today</h2></header>
            {data.upcomingExam ? (
              <div className="academics-priority">
                <strong>Exam: {data.upcomingExam.name}</strong>
                <p>{data.upcomingExam.daysRemaining} day(s) remaining</p>
                <Link to={`/student/academics/subjects/${data.upcomingExam.subjectId}`} className="btn btn-sm">Prepare</Link>
              </div>
            ) : data.dueAssignment ? (
              <div className="academics-priority">
                <strong>{data.dueAssignment.title}</strong>
                <p>Assignment due {data.dueAssignment.dueDate ? new Date(data.dueAssignment.dueDate).toLocaleDateString() : 'soon'}</p>
                <Link to={`/student/academics/subjects/${data.dueAssignment.subjectId}`} className="btn btn-sm">Open</Link>
              </div>
            ) : (
              <EmptyState title="No urgent academic items" message="Add subjects, exams, or assignments to get prioritized guidance." />
            )}
          </article>
        </section>

        <section className="academics-panel">
          <header>
            <div><h2>Subjects</h2><p>Each subject has syllabus, notes, assignments, exams, and revision.</p></div>
            <form onSubmit={addSubject} className="academics-inline-form">
              <input value={form.subjectName} onChange={(e) => setForm({ ...form, subjectName: e.target.value })} placeholder="Add subject name" aria-label="Subject name" />
              <button type="submit" className="btn btn-primary" disabled={busy}>Add</button>
            </form>
          </header>
          {data.subjects?.length ? (
            <ul className="academics-subject-list">
              {data.subjects.map((subject) => (
                <li key={subject.id}>
                  <Link to={`/student/academics/subjects/${subject.id}`}>
                    <strong>{subject.name}</strong>
                    <span>{subject.unitCount} units · {subject.topicCount} topics</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="No subjects yet" message="Add your first subject to begin syllabus and exam tracking." />
          )}
        </section>
      </div>
    </StudentLayout>
  )
}
