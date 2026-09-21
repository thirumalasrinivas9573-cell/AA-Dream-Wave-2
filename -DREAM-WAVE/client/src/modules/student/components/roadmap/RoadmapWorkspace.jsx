import { memo, useState } from 'react'
import { Button, EmptyState } from '@shared/components/ui'

export const ROADMAP_TABS = [
  ['overview', 'Overview'],
  ['stages', 'Learning Stages'],
  ['weekly', 'Weekly Plans'],
  ['monthly', 'Monthly Plans'],
  ['resources', 'Resources'],
  ['projects', 'Practice Projects'],
  ['revision', 'Revision Sessions'],
  ['assessments', 'Assessment Points'],
]

export const RoadmapNav = memo(function RoadmapNav({ active, onChange }) {
  return (
    <nav className="roadmap-nav" aria-label="Roadmap sections">
      {ROADMAP_TABS.map(([id, label]) => (
        <button type="button" className={active === id ? 'is-active' : ''} aria-current={active === id ? 'page' : undefined} onClick={() => onChange(id)} key={id}>
          {label}
        </button>
      ))}
    </nav>
  )
})

export function RoadmapSection({ title, description, action, children }) {
  return (
    <section className="roadmap-section">
      <header>
        <div><h2>{title}</h2>{description && <p>{description}</p>}</div>
        {action}
      </header>
      {children}
    </section>
  )
}

export function RoadmapStageEditor({ stages, onChange }) {
  const [form, setForm] = useState({ title: '', description: '', skills: '', targetDate: '' })
  const add = (event) => {
    event.preventDefault()
    if (!form.title.trim()) return
    onChange([...stages, {
      title: form.title,
      description: form.description,
      skills: form.skills.split(',').map((item) => item.trim()).filter(Boolean),
      targetDate: form.targetDate || undefined,
      order: stages.length + 1,
      status: stages.length ? 'locked' : 'available',
      progress: 0,
    }])
    setForm({ title: '', description: '', skills: '', targetDate: '' })
  }
  const update = (index, patch) => onChange(stages.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item))
  return (
    <>
      <form className="roadmap-add-form roadmap-add-form--stage" onSubmit={add}>
        <input className="input" value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder="Stage title" aria-label="Stage title" />
        <input className="input" value={form.skills} onChange={(event) => setForm((current) => ({ ...current, skills: event.target.value }))} placeholder="Skills, comma separated" aria-label="Stage skills" />
        <input className="input" type="date" value={form.targetDate} onChange={(event) => setForm((current) => ({ ...current, targetDate: event.target.value }))} aria-label="Stage target date" />
        <Button type="submit">Add stage</Button>
      </form>
      <div className="roadmap-stage-list">
        {stages.map((stage, index) => (
          <article className="roadmap-stage" key={stage._id || `${stage.title}-${index}`}>
            <header>
              <span>{index + 1}</span>
              <div><h3>{stage.title}</h3><small>{stage.status} · {stage.progress || 0}% complete</small></div>
              <select value={stage.status || 'available'} onChange={(event) => update(index, { status: event.target.value })} aria-label={`${stage.title} status`}>
                {['locked', 'available', 'in-progress', 'completed'].map((status) => <option value={status} key={status}>{status}</option>)}
              </select>
              <Button variant="ghost" className="btn-icon" onClick={() => onChange(stages.filter((_, itemIndex) => itemIndex !== index))} aria-label={`Delete ${stage.title}`}>×</Button>
            </header>
            {stage.description && <p>{stage.description}</p>}
            <input type="range" min="0" max="100" value={stage.progress || 0} onChange={(event) => update(index, { progress: Number(event.target.value), status: Number(event.target.value) >= 100 ? 'completed' : 'in-progress' })} aria-label={`${stage.title} progress`} />
            <div className="roadmap-stage__skills">{(stage.skills || []).map((skill) => <span key={skill}>{skill}</span>)}</div>
          </article>
        ))}
        {!stages.length && <EmptyState title="No learning stages" message="Add ordered stages to define skill progression." />}
      </div>
    </>
  )
}

export function PlanEditor({ type, items, onChange }) {
  const isWeekly = type === 'weekly'
  const [form, setForm] = useState({ focus: '', outcomes: '', studyHours: 0 })
  const add = (event) => {
    event.preventDefault()
    if (!form.focus.trim()) return
    onChange([...items, {
      [isWeekly ? 'week' : 'month']: items.length + 1,
      focus: form.focus,
      outcomes: form.outcomes.split(',').map((item) => item.trim()).filter(Boolean),
      ...(isWeekly ? { studyHours: Number(form.studyHours) || 0 } : {}),
      completed: false,
    }])
    setForm({ focus: '', outcomes: '', studyHours: 0 })
  }
  return (
    <>
      <form className="roadmap-add-form" onSubmit={add}>
        <input className="input" value={form.focus} onChange={(event) => setForm((current) => ({ ...current, focus: event.target.value }))} placeholder={`${isWeekly ? 'Week' : 'Month'} focus`} aria-label={`${type} plan focus`} />
        <input className="input" value={form.outcomes} onChange={(event) => setForm((current) => ({ ...current, outcomes: event.target.value }))} placeholder="Outcomes, comma separated" aria-label={`${type} plan outcomes`} />
        <Button type="submit">Add plan</Button>
      </form>
      <div className="roadmap-plan-list">
        {items.map((item, index) => (
          <article className="roadmap-plan-item" key={item._id || index}>
            <header>
              <input type="checkbox" checked={Boolean(item.completed)} onChange={(event) => onChange(items.map((entry, itemIndex) => itemIndex === index ? { ...entry, completed: event.target.checked } : entry))} aria-label={`Complete ${item.focus}`} />
              <div><h3>{isWeekly ? `Week ${item.week || index + 1}` : `Month ${item.month || index + 1}`} · {item.focus}</h3><small>{isWeekly ? `${item.studyHours || 0} study hours` : 'Monthly learning plan'}</small></div>
              <Button variant="ghost" className="btn-icon" onClick={() => onChange(items.filter((_, itemIndex) => itemIndex !== index))} aria-label={`Delete ${item.focus}`}>×</Button>
            </header>
            {(item.outcomes || []).length > 0 && <p>{item.outcomes.join(' · ')}</p>}
          </article>
        ))}
        {!items.length && <EmptyState title={`No ${type} plans`} message={`Add a ${type} plan to pace this roadmap.`} />}
      </div>
    </>
  )
}

export function CollectionEditor({ type, items, onChange }) {
  const [form, setForm] = useState({ title: '', detail: '', subtype: type === 'resources' ? 'course' : '' })
  const labels = {
    resources: ['Learning resources', 'Add books, courses, articles and videos.'],
    projects: ['Practice projects', 'Build evidence through applied projects.'],
    revision: ['Revision sessions', 'Schedule deliberate review sessions.'],
    assessments: ['Assessment points', 'Define checks for knowledge and skill mastery.'],
  }
  const add = (event) => {
    event.preventDefault()
    if (!form.title.trim()) return
    let next
    if (type === 'resources') next = { type: form.subtype, title: form.title, url: form.detail }
    else if (type === 'projects') next = { title: form.title, description: form.detail, status: 'planned' }
    else next = { title: form.title, scheduledAt: form.detail || undefined, completed: false }
    onChange([...items, next])
    setForm((current) => ({ ...current, title: '', detail: '' }))
  }
  return (
    <>
      <form className="roadmap-add-form" onSubmit={add}>
        {type === 'resources' && (
          <select className="select" value={form.subtype} onChange={(event) => setForm((current) => ({ ...current, subtype: event.target.value }))} aria-label="Resource type">
            {['book', 'course', 'article', 'video', 'other'].map((item) => <option key={item}>{item}</option>)}
          </select>
        )}
        <input className="input" value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder="Title" aria-label={`${type} title`} />
        <input className="input" type={['revision', 'assessments'].includes(type) ? 'datetime-local' : 'text'} value={form.detail} onChange={(event) => setForm((current) => ({ ...current, detail: event.target.value }))} placeholder={type === 'resources' ? 'URL' : 'Description'} aria-label={`${type} details`} />
        <Button type="submit">Add</Button>
      </form>
      <div className="roadmap-resource-grid">
        {items.map((item, index) => (
          <article key={item._id || `${item.title}-${index}`}>
            <h3>{item.title}</h3>
            <p>{item.description || item.url || (item.scheduledAt ? new Date(item.scheduledAt).toLocaleString() : item.type || item.status)}</p>
            {type !== 'resources' && (
              <label><input type="checkbox" checked={Boolean(item.completed || item.status === 'completed')} onChange={(event) => onChange(items.map((entry, itemIndex) => itemIndex === index ? { ...entry, completed: event.target.checked, ...(type === 'projects' ? { status: event.target.checked ? 'completed' : 'in-progress' } : {}) } : entry))} /> Complete</label>
            )}
            <Button variant="ghost" onClick={() => onChange(items.filter((_, itemIndex) => itemIndex !== index))}>Remove</Button>
          </article>
        ))}
        {!items.length && <EmptyState title={`No ${labels[type][0].toLowerCase()}`} message={labels[type][1]} />}
      </div>
    </>
  )
}
