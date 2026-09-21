import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ErrorState, EmptyState, LoadingState } from '@shared/components/ui'
import StudentLayout from '../layouts/StudentLayout'
import academicsService from '@shared/services/academicsService'
import '../styles/academics.css'

const TABS = ['overview', 'syllabus', 'notes', 'assignments', 'exams', 'revision']

export default function SubjectWorkspace() {
  const { id } = useParams()
  const [tab, setTab] = useState('overview')
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [syllabusText, setSyllabusText] = useState('')
  const [proposal, setProposal] = useState(null)
  const [noteForm, setNoteForm] = useState({ title: '', content: '' })
  const [assignmentForm, setAssignmentForm] = useState({ title: '', dueDate: '' })
  const [examForm, setExamForm] = useState({ name: '', scheduledAt: '' })
  const [paperText, setPaperText] = useState('')
  const [analysis, setAnalysis] = useState(null)
  const [studyPlan, setStudyPlan] = useState(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const { data } = await academicsService.subject(id, { force: true })
      setDetail(data)
    } catch (err) {
      setError(err.userMessage || err.message || 'Failed to load subject.')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { load() }, [load])

  const subject = detail?.subject
  const summary = detail?.summary

  const topics = useMemo(() => (subject?.units || []).flatMap((unit) =>
    (unit.topics || []).map((topic) => ({ ...topic, unitId: unit._id, unitTitle: unit.title })),
  ), [subject])

  async function proposeSyllabus() {
    setBusy(true)
    try {
      const { data } = await academicsService.api.proposeSyllabus(id, { rawText: syllabusText })
      setProposal(data.proposal)
    } catch (err) {
      setError(err.userMessage || err.message)
    } finally {
      setBusy(false)
    }
  }

  async function applySyllabus() {
    if (!proposal?.validated) return
    setBusy(true)
    try {
      await academicsService.api.applySyllabus(id, { units: proposal.validated, source: 'ai_proposed', documentHash: proposal.hash })
      setProposal(null)
      setSyllabusText('')
      academicsService.invalidate()
      await load()
    } catch (err) {
      setError(err.userMessage || err.message)
    } finally {
      setBusy(false)
    }
  }

  async function createNote(e) {
    e.preventDefault()
    setBusy(true)
    try {
      await academicsService.api.createNote({ subjectId: id, ...noteForm })
      setNoteForm({ title: '', content: '' })
      await load()
    } catch (err) {
      setError(err.userMessage || err.message)
    } finally {
      setBusy(false)
    }
  }

  async function createAssignment(e) {
    e.preventDefault()
    setBusy(true)
    try {
      await academicsService.api.createAssignment({ subjectId: id, ...assignmentForm, createTask: true })
      setAssignmentForm({ title: '', dueDate: '' })
      await load()
    } catch (err) {
      setError(err.userMessage || err.message)
    } finally {
      setBusy(false)
    }
  }

  async function createExam(e) {
    e.preventDefault()
    setBusy(true)
    try {
      await academicsService.api.createExam({ subjectId: id, ...examForm })
      setExamForm({ name: '', scheduledAt: '' })
      await load()
    } catch (err) {
      setError(err.userMessage || err.message)
    } finally {
      setBusy(false)
    }
  }

  async function uploadPaper() {
    setBusy(true)
    try {
      await academicsService.api.uploadQuestionPaper(id, { rawText: paperText, title: 'Uploaded paper' })
      setPaperText('')
      await load()
    } catch (err) {
      setError(err.userMessage || err.message)
    } finally {
      setBusy(false)
    }
  }

  async function loadAnalysis() {
    setBusy(true)
    try {
      const { data } = await academicsService.api.analyzePapers(id)
      setAnalysis(data)
    } catch (err) {
      setError(err.userMessage || err.message)
    } finally {
      setBusy(false)
    }
  }

  async function loadStudyPlan() {
    setBusy(true)
    try {
      const { data } = await academicsService.api.dailyStudyPlan()
      setStudyPlan(data.plan)
    } catch (err) {
      setError(err.userMessage || err.message)
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return <StudentLayout><div className="academics-shell"><LoadingState label="Loading subject workspace…" rows={8} /></div></StudentLayout>
  }

  if (error && !subject) {
    return <StudentLayout><ErrorState title="Subject unavailable" message={error} onRetry={load} /></StudentLayout>
  }

  return (
    <StudentLayout>
      <div className="academics-shell">
        <nav className="academics-breadcrumb"><Link to="/student/academics">Academics</Link> / <span>{subject?.name}</span></nav>
        <header className="academics-subject-header">
          <div>
            <h1>{subject?.name}</h1>
            {subject?.code && <p>{subject.code}</p>}
          </div>
          {summary?.nextExam && (
            <div className="academics-exam-countdown" aria-live="polite">
              <strong>{summary.nextExam.name}</strong>
              <span>{summary.nextExam.daysRemaining} day(s) remaining</span>
            </div>
          )}
        </header>

        <div className="academics-tabs" role="tablist" aria-label="Subject sections">
          {TABS.map((item) => (
            <button key={item} type="button" role="tab" aria-selected={tab === item} className={tab === item ? 'is-active' : ''} onClick={() => setTab(item)}>
              {item.charAt(0).toUpperCase() + item.slice(1)}
            </button>
          ))}
        </div>

        {error && <p className="academics-error" role="alert">{error}</p>}

        {tab === 'overview' && (
          <section className="academics-panel">
            <h2>Subject health</h2>
            <ul className="academics-health-list">
              <li>Syllabus: {summary?.completedTopics || 0}/{summary?.syllabusTopics || 0} topics studied</li>
              <li>Needs revision: {summary?.needsRevisionTopics || 0} topics</li>
              <li>Assignments: {summary?.assignmentCount || 0}</li>
              <li>Concepts tracked: {summary?.conceptCount || 0}</li>
            </ul>
            <button type="button" className="btn btn-secondary" onClick={loadStudyPlan} disabled={busy}>Generate today&apos;s study plan</button>
            {studyPlan && (
              <ul className="academics-plan-list">
                {studyPlan.items.map((item) => (
                  <li key={`${item.type}-${item.title}`}><strong>{item.title}</strong> — {item.minutes} min<small>{item.reason}</small></li>
                ))}
              </ul>
            )}
          </section>
        )}

        {tab === 'syllabus' && (
          <section className="academics-panel">
            <h2>Syllabus</h2>
            {topics.length ? (
              <ul className="academics-syllabus-list">
                {topics.map((topic) => (
                  <li key={topic._id}><span>{topic.unitTitle}</span><strong>{topic.title}</strong><em>{topic.status}</em></li>
                ))}
              </ul>
            ) : (
              <>
                <p>Paste syllabus text (Unit 1: …, numbered topics). Review extraction before saving.</p>
                <textarea value={syllabusText} onChange={(e) => setSyllabusText(e.target.value)} rows={8} aria-label="Syllabus text" placeholder="Unit 1: Introduction&#10;1. Topic one&#10;2. Topic two" />
                <div className="academics-actions">
                  <button type="button" className="btn btn-secondary" onClick={proposeSyllabus} disabled={busy || !syllabusText.trim()}>Preview extraction</button>
                  {proposal && (
                    <>
                      <p className="academics-disclaimer">{proposal.disclaimer}</p>
                      <pre className="academics-proposal">{JSON.stringify(proposal.validated, null, 2)}</pre>
                      <button type="button" className="btn btn-primary" onClick={applySyllabus} disabled={busy}>Confirm syllabus</button>
                    </>
                  )}
                </div>
              </>
            )}
          </section>
        )}

        {tab === 'notes' && (
          <section className="academics-panel">
            <h2>Private notes</h2>
            <form onSubmit={createNote} className="academics-form">
              <input value={noteForm.title} onChange={(e) => setNoteForm({ ...noteForm, title: e.target.value })} placeholder="Title" aria-label="Note title" required />
              <textarea value={noteForm.content} onChange={(e) => setNoteForm({ ...noteForm, content: e.target.value })} placeholder="Your notes…" aria-label="Note content" required />
              <button type="submit" className="btn btn-primary" disabled={busy}>Save note</button>
            </form>
            {detail?.notes?.length ? (
              <ul className="academics-note-list">
                {detail.notes.map((note) => <li key={note._id}><strong>{note.title || 'Note'}</strong><p>{note.content}</p></li>)}
              </ul>
            ) : <EmptyState title="No notes yet" message="Notes are private to you." />}
          </section>
        )}

        {tab === 'assignments' && (
          <section className="academics-panel">
            <h2>Assignments</h2>
            <form onSubmit={createAssignment} className="academics-form">
              <input value={assignmentForm.title} onChange={(e) => setAssignmentForm({ ...assignmentForm, title: e.target.value })} placeholder="Assignment title" required />
              <input type="date" value={assignmentForm.dueDate} onChange={(e) => setAssignmentForm({ ...assignmentForm, dueDate: e.target.value })} aria-label="Due date" />
              <button type="submit" className="btn btn-primary" disabled={busy}>Add assignment</button>
            </form>
            {detail?.assignments?.length ? (
              <ul className="academics-assignment-list">
                {detail.assignments.map((item) => (
                  <li key={item._id}><strong>{item.title}</strong><span>{item.dueDate ? new Date(item.dueDate).toLocaleDateString() : 'No due date'}</span><em>{item.status}</em></li>
                ))}
              </ul>
            ) : <EmptyState title="No assignments" message="Assignments can generate linked tasks automatically." />}
          </section>
        )}

        {tab === 'exams' && (
          <section className="academics-panel">
            <h2>Exams</h2>
            <form onSubmit={createExam} className="academics-form">
              <input value={examForm.name} onChange={(e) => setExamForm({ ...examForm, name: e.target.value })} placeholder="Exam name" required />
              <input type="datetime-local" value={examForm.scheduledAt} onChange={(e) => setExamForm({ ...examForm, scheduledAt: e.target.value })} aria-label="Exam date and time" required />
              <button type="submit" className="btn btn-primary" disabled={busy}>Add exam</button>
            </form>
            {detail?.exams?.length ? (
              <ul className="academics-exam-list">
                {detail.exams.map((exam) => (
                  <li key={exam._id}>
                    <strong>{exam.name}</strong>
                    <span>{new Date(exam.scheduledAt).toLocaleString()}</span>
                    <Link to={`/student/academics/subjects/${id}?exam=${exam._id}`} className="btn btn-sm">Prep plan</Link>
                  </li>
                ))}
              </ul>
            ) : <EmptyState title="No exams scheduled" message="Add exam dates you know — Dream Wave never invents dates." />}
            <h3>Question papers</h3>
            <textarea value={paperText} onChange={(e) => setPaperText(e.target.value)} rows={6} placeholder="Paste previous paper text…" aria-label="Question paper text" />
            <div className="academics-actions">
              <button type="button" className="btn btn-secondary" onClick={uploadPaper} disabled={busy || !paperText.trim()}>Upload & parse</button>
              <button type="button" className="btn btn-ghost" onClick={loadAnalysis} disabled={busy}>Analyze papers</button>
            </div>
            {analysis && (
              <div className="academics-analysis">
                <p>{analysis.analysis?.disclaimer}</p>
                <pre>{JSON.stringify(analysis.analysis?.topicFrequency || {}, null, 2)}</pre>
              </div>
            )}
          </section>
        )}

        {tab === 'revision' && (
          <section className="academics-panel">
            <h2>Revision queue</h2>
            <p>Based on concept mastery and practice evidence — not predicted exam questions.</p>
            <Link to="/student/mentor?mode=study" className="btn btn-secondary">Ask AI Mentor</Link>
          </section>
        )}
      </div>
    </StudentLayout>
  )
}
