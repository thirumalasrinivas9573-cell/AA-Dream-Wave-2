import { memo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button, Dialog, EmptyState, FormField } from '@shared/components/ui'
import { careerApi, interactionApi } from '@shared/services/api'

const STATUS_STEPS = [
  ['pending', 'Applied'],
  ['reviewing', 'Under Review'],
  ['shortlisted', 'Shortlisted'],
  ['interview', 'Interview Scheduled'],
  ['accepted', 'Offer Received'],
]

export const CareerStats = memo(function CareerStats({ dashboard }) {
  const stats = [
    ['Profile Completion', `${dashboard?.profileCompletion || 0}%`, 'identity'],
    ['Resume Score', `${dashboard?.resumeScore || 0}%`, 'resume'],
    ['Applications', dashboard?.applicationsSubmitted || 0, 'applications'],
    ['Interviews', dashboard?.interviewInvitations || 0, 'interviews'],
    ['Internships', dashboard?.internshipsAvailable || 0, 'internships'],
    ['Jobs', dashboard?.jobsAvailable || 0, 'jobs'],
    ['Saved', dashboard?.savedOpportunities || 0, 'saved'],
    ['Career Progress', `${dashboard?.careerProgress || 0}%`, 'progress'],
  ]
  return <section className="career-stats" aria-label="Career dashboard statistics">{stats.map(([label, value, icon]) => <article key={label}><span className={`career-stat-icon career-stat-icon--${icon}`} aria-hidden>{icon[0].toUpperCase()}</span><div><strong>{value}</strong><small>{label}</small></div></article>)}</section>
})

export function OpportunityFilters({ type, query, filters, onChange }) {
  return (
    <section className="career-filters" aria-label={`${type} filters`}>
      <label className="career-search"><span aria-hidden>⌕</span><input type="search" value={query.q} onChange={(event) => onChange('q', event.target.value)} placeholder={`Search ${type === 'job' ? 'jobs, roles, skills' : 'internships, roles, skills'}`} aria-label={`Search ${type}s`} /></label>
      <select value={query.location} onChange={(event) => onChange('location', event.target.value)} aria-label="Location"><option value="">All locations</option>{filters?.locations?.map((item) => <option key={item}>{item}</option>)}</select>
      <select value={query.workMode} onChange={(event) => onChange('workMode', event.target.value)} aria-label="Work mode"><option value="">All work modes</option>{filters?.workModes?.map((item) => <option key={item}>{item}</option>)}</select>
      <select value={query.industry} onChange={(event) => onChange('industry', event.target.value)} aria-label="Industry"><option value="">All industries</option>{filters?.industries?.map((item) => <option key={item}>{item}</option>)}</select>
      <select value={query.company} onChange={(event) => onChange('company', event.target.value)} aria-label="Company"><option value="">All companies</option>{filters?.companies?.map((item) => <option value={item.slug || item.name} key={item._id}>{item.name}</option>)}</select>
      <select value={query.skill} onChange={(event) => onChange('skill', event.target.value)} aria-label="Skill"><option value="">All skills</option>{filters?.skills?.map((item) => <option key={item}>{item}</option>)}</select>
      {type === 'job' && <><select value={query.jobType} onChange={(event) => onChange('jobType', event.target.value)} aria-label="Job type"><option value="">All job types</option>{filters?.jobTypes?.map((item) => <option key={item}>{item}</option>)}</select><input type="number" min="0" value={query.minSalary} onChange={(event) => onChange('minSalary', event.target.value)} placeholder="Min salary" aria-label="Minimum salary" /></>}
    </section>
  )
}

export const OpportunityCard = memo(function OpportunityCard({ item, type, onApply, onSaved, onError }) {
  const company = item.companyId || {}
  const detailPath = type === 'job' ? `/companies/jobs/${item._id}` : `/companies/internships/${item._id}`
  const save = async () => {
    try {
      const { data } = await interactionApi.bookmark({ targetType: type, targetId: item._id })
      onSaved(item._id, data.bookmarked)
    } catch (requestError) {
      onError(requestError.userMessage || 'Unable to update saved opportunities.')
    }
  }
  return (
    <article className="opportunity-card">
      <header>
        <Link to={`/companies/${company.slug}`} className="opportunity-company-logo">{company.logo ? <img src={company.logo} alt="" loading="lazy" /> : (company.name || '?')[0]}</Link>
        <div><Link to={detailPath}><h2>{item.title}</h2></Link><Link to={`/companies/${company.slug}`}>{company.name || 'Company'}</Link></div>
        <button type="button" className={item.saved ? 'is-saved' : ''} onClick={save} aria-label={item.saved ? 'Remove saved opportunity' : 'Save opportunity'}>{item.saved ? '★' : '☆'}</button>
      </header>
      <div className="opportunity-meta">
        <span>⌖ {item.location || 'Location flexible'}</span>
        <span>◫ {item.workMode || 'onsite'}</span>
        {type === 'job' ? <><span>◈ {item.type || 'full-time'}</span><span>₹ {item.salaryMin || 0}–{item.salaryMax || 0}</span><span>◷ {item.experience || 'Entry level'}</span></> : <><span>◷ {item.duration || 'Duration flexible'}</span><span>₹ {item.stipend || 0}/month</span></>}
      </div>
      <p>{item.description || 'View the opportunity for complete role information.'}</p>
      <div className="opportunity-skills">{item.skills?.slice(0, 6).map((skill) => <span key={skill}>{skill}</span>)}</div>
      <footer>
        <span>{item.deadline ? `Apply by ${new Date(item.deadline).toLocaleDateString()}` : 'Open until filled'}</span>
        <div><Link to={detailPath} className="btn btn-secondary">Details</Link><Button onClick={() => onApply(item)}>Apply</Button></div>
      </footer>
    </article>
  )
})

export function ApplyDialog({ item, type, resumes, onClose, onApplied }) {
  const [resumeId, setResumeId] = useState(resumes.find((resume) => resume.isDefault)?._id || resumes[0]?._id || '')
  const [coverLetter, setCoverLetter] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const submit = async (event) => {
    event.preventDefault()
    setLoading(true)
    setError('')
    try {
      await careerApi.apply(type, item._id, { resumeId, coverLetter })
      onApplied(item)
      onClose()
    } catch (requestError) {
      setError(requestError.userMessage || requestError.response?.data?.message || 'Unable to submit application.')
    } finally {
      setLoading(false)
    }
  }
  return (
    <Dialog open title={`Apply for ${item.title}`} description="Your selected resume is securely shared with the hiring company." onClose={onClose}>
      <form className="career-apply-form" onSubmit={submit}>
        {!resumes.length ? <EmptyState title="Resume required" message="Create a resume before applying." action={<Link className="btn btn-primary" to="/student/career/resume">Build resume</Link>} /> : <>
          <FormField label="Resume" required><select className="select" value={resumeId} onChange={(event) => setResumeId(event.target.value)}>{resumes.map((resume) => <option value={resume._id} key={resume._id}>{resume.title}{resume.isDefault ? ' · Default' : ''}</option>)}</select></FormField>
          <FormField label="Cover letter" hint={`${coverLetter.length}/5000`}><textarea className="textarea" rows="7" maxLength="5000" value={coverLetter} onChange={(event) => setCoverLetter(event.target.value)} placeholder="Explain why your experience aligns with this role." /></FormField>
          {error && <div className="alert alert-error" role="alert">{error}</div>}
          <footer><Button variant="ghost" onClick={onClose}>Cancel</Button><Button type="submit" disabled={loading}>{loading ? 'Submitting…' : 'Submit application'}</Button></footer>
        </>}
      </form>
    </Dialog>
  )
}

export function ApplicationTimeline({ application, onWithdraw }) {
  const status = application.status
  const terminal = ['rejected', 'withdrawn'].includes(status)
  const currentIndex = STATUS_STEPS.findIndex(([id]) => id === status)
  return (
    <article className="application-card">
      <header><div>{application.company?.logo ? <img src={application.company.logo} alt="" /> : (application.company?.name || '?')[0]}</div><section><span>{application.targetType}</span><h2>{application.opportunity?.title || 'Opportunity unavailable'}</h2><Link to={`/companies/${application.company?.slug}`}>{application.company?.name || 'Company'}</Link></section><strong className={`application-status application-status--${status}`}>{status === 'accepted' ? 'Offer received' : status.replaceAll('-', ' ')}</strong></header>
      <ol className={`application-timeline ${terminal ? 'is-terminal' : ''}`}>
        {STATUS_STEPS.map(([id, label], index) => <li className={(index <= currentIndex && !terminal) || id === status ? 'is-complete' : ''} key={id}><i /><span>{label}</span></li>)}
      </ol>
      {terminal && <p className="application-terminal">Application {status}.</p>}
      <footer><span>Submitted {new Date(application.createdAt).toLocaleDateString()}</span>{!['accepted','rejected','withdrawn'].includes(status) && <Button variant="ghost" onClick={() => onWithdraw(application)}>Withdraw</Button>}</footer>
    </article>
  )
}

export function CareerArchitecture({ readiness }) {
  const roadmap = readiness?.roadmap
  const interviews = readiness?.interviews
  return (
    <div className="career-architecture">
      <section className="career-panel">
        <header><div><span>Architecture ready</span><h2>Career Roadmap</h2></div><strong>{roadmap?.placementReadiness || 0}%</strong></header>
        <dl><div><dt>Target career</dt><dd>{roadmap?.targetCareer || 'Set your target role'}</dd></div><div><dt>Skill readiness</dt><dd>{roadmap?.learningProgress || 0}%</dd></div><div><dt>Resume strength</dt><dd>{roadmap?.resumeStatus?.strength || 0}%</dd></div></dl>
        {roadmap?.missingSkills?.length ? <div className="career-missing-skills"><span>Skills to develop</span>{roadmap.missingSkills.map((skill) => <i key={skill}>{skill}</i>)}</div> : <p>Add required skills to your career preferences to build a deterministic readiness map.</p>}
      </section>
      <section className="career-panel">
        <header><div><span>Future AI integration</span><h2>Interview Preparation</h2></div><strong>{interviews?.invitations || 0} invites</strong></header>
        <div className="interview-modules">{interviews?.modules?.map((module) => <article key={module.id}><span>{module.id === 'technical' ? '</>' : module.id === 'hr' ? 'HR' : module.id === 'mock' ? '◉' : '◎'}</span><div><strong>{module.label}</strong><small>Integration contract ready</small></div></article>)}</div>
      </section>
    </div>
  )
}

export function CareerProfileDialog({ profile, onClose, onSave }) {
  const [form, setForm] = useState({
    ...profile,
    targetRoles: (profile.targetRoles || []).join(', '),
    preferredLocations: (profile.preferredLocations || []).join(', '),
    preferredIndustries: (profile.preferredIndustries || []).join(', '),
    requiredSkills: (profile.requiredSkills || []).join(', '),
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const split = (value) => value.split(',').map((item) => item.trim()).filter(Boolean)
  const submit = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      await onSave({
        ...form,
        targetRoles: split(form.targetRoles),
        preferredLocations: split(form.preferredLocations),
        preferredIndustries: split(form.preferredIndustries),
        requiredSkills: split(form.requiredSkills),
      })
      onClose()
    } catch (requestError) {
      setError(requestError.userMessage || 'Unable to save career preferences.')
    } finally {
      setSaving(false)
    }
  }
  return <Dialog open title="Career preferences" description="These signals power deterministic opportunity filters and placement readiness." onClose={onClose}><form className="career-profile-form" onSubmit={submit}><FormField label="Target career"><input className="input" value={form.targetCareer || ''} onChange={(event) => setForm((current) => ({ ...current, targetCareer: event.target.value }))} placeholder="Frontend Engineer" /></FormField><FormField label="Target roles" hint="Comma separated"><input className="input" value={form.targetRoles} onChange={(event) => setForm((current) => ({ ...current, targetRoles: event.target.value }))} /></FormField><FormField label="Required skills" hint="Comma separated"><input className="input" value={form.requiredSkills} onChange={(event) => setForm((current) => ({ ...current, requiredSkills: event.target.value }))} /></FormField><FormField label="Preferred locations" hint="Comma separated"><input className="input" value={form.preferredLocations} onChange={(event) => setForm((current) => ({ ...current, preferredLocations: event.target.value }))} /></FormField><FormField label="Preferred industries" hint="Comma separated"><input className="input" value={form.preferredIndustries} onChange={(event) => setForm((current) => ({ ...current, preferredIndustries: event.target.value }))} /></FormField><div className="career-profile-checks"><label><input type="checkbox" checked={form.openToJobs !== false} onChange={(event) => setForm((current) => ({ ...current, openToJobs: event.target.checked }))} /> Open to jobs</label><label><input type="checkbox" checked={form.openToInternships !== false} onChange={(event) => setForm((current) => ({ ...current, openToInternships: event.target.checked }))} /> Open to internships</label><label><input type="checkbox" checked={Boolean(form.recruiterVisible)} onChange={(event) => setForm((current) => ({ ...current, recruiterVisible: event.target.checked }))} /> Recruiter visible</label></div>{error && <div className="alert alert-error">{error}</div>}<footer><Button variant="ghost" onClick={onClose}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save preferences'}</Button></footer></form></Dialog>
}
