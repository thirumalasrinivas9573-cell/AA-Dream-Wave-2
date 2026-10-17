import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ErrorState, EmptyState, LoadingState } from '@shared/components/ui'
import StudentLayout from '../layouts/StudentLayout'
import academicsService from '@shared/services/academicsService'

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

  useEffect(() => {
    load()
  }, [load])

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
        <LoadingState label="Loading academic workspace…" rows={8} />
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
      <div className="flex flex-col gap-6 w-full">
        {/* Page Hero */}
        <header className="p-6 md:p-8 rounded-stitch bg-surface border border-divider shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1 max-w-xl">
            <span className="text-xs font-bold tracking-widest text-brand-primary uppercase">
              ACADEMIC INTELLIGENCE 3.0
            </span>
            <h1 className="text-2xl md:text-3xl font-heading font-bold text-content-heading tracking-tight">
              Syllabus, Subjects & Exams — Connected
            </h1>
            <p className="text-xs text-content-muted leading-relaxed">
              Track syllabus progress, assignments, exams, notes, and revision in one workspace grounded in your profile data.
            </p>
          </div>

          <div className="flex items-center gap-3 bg-surface-elevated p-4 rounded-2xl border border-divider shrink-0">
            <div className="text-center px-3">
              <span className="text-2xl font-heading font-bold text-content-heading block">
                {data.stats?.subjectCount || 0}
              </span>
              <span className="text-[10px] font-semibold text-content-muted uppercase">Subjects</span>
            </div>
            <div className="w-px h-8 bg-divider" />
            <div className="text-center px-3">
              <span className="text-2xl font-heading font-bold text-content-heading block">
                {data.stats?.noteCount || 0}
              </span>
              <span className="text-[10px] font-semibold text-content-muted uppercase">Notes</span>
            </div>
            <div className="w-px h-8 bg-divider" />
            <div className="text-center px-3">
              <span className="text-2xl font-heading font-bold text-brand-primary block">
                {data.stats?.examCount || 0}
              </span>
              <span className="text-[10px] font-semibold text-content-muted uppercase">Exams</span>
            </div>
          </div>
        </header>

        {data.setupRequired && (
          <section className="p-5 rounded-stitch bg-brand-primary/10 border border-brand-primary/20 space-y-3">
            <h2 className="font-heading font-bold text-sm text-content-heading">Set Up Academic Period</h2>
            <form onSubmit={addPeriod} className="flex items-center gap-3">
              <input
                value={form.periodLabel}
                onChange={(e) => setForm({ ...form, periodLabel: e.target.value })}
                placeholder="e.g. Semester 3 — 2026"
                aria-label="Academic period label"
                className="flex-1 h-10 px-4 rounded-xl bg-surface border border-divider text-xs font-medium text-content-heading focus:outline-none focus:border-brand-primary"
              />
              <button
                type="submit"
                disabled={busy}
                className="h-10 px-5 rounded-xl bg-brand-primary text-white text-xs font-semibold hover:bg-brand-hover transition-all"
              >
                Add Period
              </button>
            </form>
          </section>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Academic Profile Panel */}
          <article className="p-6 rounded-stitch bg-surface border border-divider shadow-xs space-y-4">
            <h2 className="font-heading font-bold text-base text-content-heading">Academic Profile</h2>
            <form onSubmit={saveProfile} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-content-muted block">Program</label>
                <input
                  value={form.program}
                  onChange={(e) => setForm({ ...form, program: e.target.value })}
                  placeholder="B.Tech, B.Sc, MBA…"
                  className="w-full h-10 px-3 rounded-xl bg-canvas border border-divider text-xs font-medium text-content-heading focus:outline-none focus:border-brand-primary"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold text-content-muted block">Branch / Specialization</label>
                <input
                  value={form.branch}
                  onChange={(e) => setForm({ ...form, branch: e.target.value })}
                  placeholder="Computer Science, Physics…"
                  className="w-full h-10 px-3 rounded-xl bg-canvas border border-divider text-xs font-medium text-content-heading focus:outline-none focus:border-brand-primary"
                />
              </div>
              <button
                type="submit"
                disabled={busy}
                className="h-10 px-4 rounded-xl bg-surface-elevated border border-divider text-content-heading text-xs font-semibold hover:bg-surface transition-all"
              >
                Save Profile
              </button>
            </form>
          </article>

          {/* Priority Today Panel */}
          <article className="p-6 rounded-stitch bg-surface border border-divider shadow-xs space-y-4">
            <h2 className="font-heading font-bold text-base text-content-heading">Priority Today</h2>
            {data.upcomingExam ? (
              <div className="p-4 rounded-xl bg-brand-primary/10 border border-brand-primary/20 space-y-2">
                <div className="font-bold text-sm text-content-heading">Exam: {data.upcomingExam.name}</div>
                <div className="text-xs text-brand-primary font-semibold">{data.upcomingExam.daysRemaining} day(s) remaining</div>
                <Link
                  to={`/student/academics/subjects/${data.upcomingExam.subjectId}`}
                  className="inline-flex items-center gap-1 h-8 px-3 rounded-lg bg-brand-primary text-white text-xs font-semibold"
                >
                  Prepare Now
                </Link>
              </div>
            ) : data.dueAssignment ? (
              <div className="p-4 rounded-xl bg-surface-elevated border border-divider space-y-2">
                <div className="font-bold text-sm text-content-heading">{data.dueAssignment.title}</div>
                <div className="text-xs text-content-muted">
                  Due {data.dueAssignment.dueDate ? new Date(data.dueAssignment.dueDate).toLocaleDateString() : 'soon'}
                </div>
                <Link
                  to={`/student/academics/subjects/${data.dueAssignment.subjectId}`}
                  className="inline-flex items-center gap-1 h-8 px-3 rounded-lg bg-brand-primary text-white text-xs font-semibold"
                >
                  Open
                </Link>
              </div>
            ) : (
              <EmptyState title="No urgent items" message="Add subjects, exams, or assignments to get prioritized guidance." />
            )}
          </article>
        </div>

        {/* Subjects List Panel */}
        <section className="p-6 rounded-stitch bg-surface border border-divider shadow-xs space-y-4">
          <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="font-heading font-bold text-base text-content-heading">Subjects</h2>
              <p className="text-xs text-content-muted">Each subject includes syllabus, notes, assignments, exams, and revision logs.</p>
            </div>
            <form onSubmit={addSubject} className="flex items-center gap-2">
              <input
                value={form.subjectName}
                onChange={(e) => setForm({ ...form, subjectName: e.target.value })}
                placeholder="Add subject name..."
                aria-label="Subject name"
                className="h-10 px-3 rounded-xl bg-canvas border border-divider text-xs font-medium text-content-heading focus:outline-none focus:border-brand-primary"
              />
              <button
                type="submit"
                disabled={busy}
                className="h-10 px-4 rounded-xl bg-brand-primary text-white text-xs font-semibold hover:bg-brand-hover transition-all"
              >
                Add Subject
              </button>
            </form>
          </header>

          {data.subjects?.length ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
              {data.subjects.map((subject) => (
                <Link
                  key={subject.id}
                  to={`/student/academics/subjects/${subject.id}`}
                  className="p-4 rounded-stitch bg-canvas border border-divider hover:border-brand-primary transition-all flex flex-col justify-between group"
                >
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-[24px] text-brand-primary">school</span>
                    <div>
                      <div className="font-heading font-bold text-sm text-content-heading group-hover:text-brand-primary transition-colors">
                        {subject.name}
                      </div>
                      <div className="text-xs text-content-muted">
                        {subject.unitCount} units · {subject.topicCount} topics
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState title="No subjects yet" message="Add your first subject to begin syllabus and exam tracking." />
          )}
        </section>
      </div>
    </StudentLayout>
  )
}
