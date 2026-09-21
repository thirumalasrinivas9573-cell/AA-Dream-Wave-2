import { useState } from 'react'
import { Button, Dialog, FormField } from '@shared/components/ui'
import { SKILL_TYPES } from './ProfileWorkspace'

const csv = (value) => Array.isArray(value) ? value.join(', ') : value || ''
const split = (value) => String(value || '').split(',').map((item) => item.trim()).filter(Boolean)

export function ProfileEditDialog({ open, profile, onClose, onSave }) {
  const [form, setForm] = useState(() => ({
    username: profile.username || '',
    displayName: profile.displayName || '',
    headline: profile.headline || '',
    bio: profile.bio || '',
    location: profile.location || '',
    languages: csv(profile.languages),
    links: profile.links?.length ? profile.links : [{ label: '', url: '' }],
    academic: {
      institution: profile.academic?.institution || '',
      department: profile.academic?.department || '',
      course: profile.academic?.course || '',
      semester: profile.academic?.semester || '',
      year: profile.academic?.year || '',
      cgpa: profile.academic?.cgpa || '',
      completedCourses: csv(profile.academic?.completedCourses),
      activeCourses: csv(profile.academic?.activeCourses),
    },
    careerDirection: {
      targetRole: profile.careerDirection?.targetRole || '',
      interests: csv(profile.careerDirection?.interests),
      visibility: profile.careerDirection?.visibility || 'public',
    },
  }))
  const [tab, setTab] = useState('identity')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const set = (field, value) => setForm((current) => ({ ...current, [field]: value }))
  const setAcademic = (field, value) => setForm((current) => ({ ...current, academic: { ...current.academic, [field]: value } }))
  const submit = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      await onSave({
        ...form,
        languages: split(form.languages),
        links: form.links.filter((item) => item.label && item.url),
        academic: {
          ...form.academic,
          cgpa: Number(form.academic.cgpa) || 0,
          activeCourses: split(form.academic.activeCourses),
          completedCourses: split(form.academic.completedCourses),
        },
        careerDirection: {
          targetRole: String(form.careerDirection.targetRole || '').trim(),
          interests: split(form.careerDirection.interests),
          visibility: form.careerDirection.visibility,
        },
      })
      onClose()
    } catch (requestError) {
      setError(requestError.userMessage || requestError.response?.data?.message || 'Unable to update profile.')
    } finally {
      setSaving(false)
    }
  }
  return (
    <Dialog open={open} title="Edit digital identity" description="Keep your learning and academic identity current." onClose={onClose}>
      <form className="identity-form" onSubmit={submit}>
        <div className="identity-form__tabs" role="tablist">{['identity', 'academic', 'career', 'links'].map((item) => <button type="button" role="tab" aria-selected={tab === item} className={tab === item ? 'is-active' : ''} onClick={() => setTab(item)} key={item}>{item}</button>)}</div>
        {tab === 'identity' && <div className="identity-form__grid">
          <FormField label="Full name" required><input className="input" value={form.displayName} onChange={(event) => set('displayName', event.target.value)} /></FormField>
          <FormField label="Username" required hint="Used in your public portfolio URL"><input className="input" value={form.username} onChange={(event) => set('username', event.target.value.toLowerCase())} /></FormField>
          <FormField label="Professional headline"><input className="input" value={form.headline} onChange={(event) => set('headline', event.target.value)} /></FormField>
          <FormField label="Location"><input className="input" value={form.location} onChange={(event) => set('location', event.target.value)} /></FormField>
          <FormField label="Bio" className="identity-form__wide"><textarea className="textarea" rows="5" value={form.bio} onChange={(event) => set('bio', event.target.value)} /></FormField>
          <FormField label="Languages" hint="Comma separated" className="identity-form__wide"><input className="input" value={form.languages} onChange={(event) => set('languages', event.target.value)} placeholder="English, Hindi, Telugu" /></FormField>
        </div>}
        {tab === 'academic' && <div className="identity-form__grid">
          {[
            ['institution', 'Institution'], ['department', 'Department'], ['course', 'Course'],
            ['semester', 'Semester'], ['year', 'Year'], ['cgpa', 'CGPA'],
          ].map(([field, label]) => <FormField label={label} key={field}><input className="input" type={field === 'cgpa' ? 'number' : 'text'} min={field === 'cgpa' ? 0 : undefined} max={field === 'cgpa' ? 10 : undefined} step={field === 'cgpa' ? .01 : undefined} value={form.academic[field]} onChange={(event) => setAcademic(field, event.target.value)} /></FormField>)}
          <FormField label="Active courses" hint="Comma separated" className="identity-form__wide"><input className="input" value={form.academic.activeCourses} onChange={(event) => setAcademic('activeCourses', event.target.value)} /></FormField>
          <FormField label="Completed courses" hint="Comma separated" className="identity-form__wide"><input className="input" value={form.academic.completedCourses} onChange={(event) => setAcademic('completedCourses', event.target.value)} /></FormField>
        </div>}
        {tab === 'career' && <div className="identity-form__grid">
          <FormField label="Target role"><input className="input" value={form.careerDirection.targetRole} onChange={(event) => setForm((current) => ({ ...current, careerDirection: { ...current.careerDirection, targetRole: event.target.value } }))} placeholder="Frontend Engineer, AI Researcher" /></FormField>
          <FormField label="Career interests" hint="Comma separated" className="identity-form__wide"><input className="input" value={form.careerDirection.interests} onChange={(event) => setForm((current) => ({ ...current, careerDirection: { ...current.careerDirection, interests: event.target.value } }))} placeholder="Machine Learning, Web Development" /></FormField>
          <FormField label="Career visibility"><select className="select" value={form.careerDirection.visibility} onChange={(event) => setForm((current) => ({ ...current, careerDirection: { ...current.careerDirection, visibility: event.target.value } }))}><option value="public">Public</option><option value="unlisted">Unlisted</option><option value="private">Private</option></select></FormField>
        </div>}
        {tab === 'links' && <div className="identity-links-editor">
          {form.links.map((link, index) => <div key={index}><input className="input" value={link.label} placeholder="Label" onChange={(event) => set('links', form.links.map((item, itemIndex) => itemIndex === index ? { ...item, label: event.target.value } : item))} /><input className="input" type="url" value={link.url} placeholder="https://…" onChange={(event) => set('links', form.links.map((item, itemIndex) => itemIndex === index ? { ...item, url: event.target.value } : item))} /><Button variant="ghost" onClick={() => set('links', form.links.filter((_, itemIndex) => itemIndex !== index))}>×</Button></div>)}
          <Button variant="secondary" onClick={() => set('links', [...form.links, { label: '', url: '' }])}>+ Add link</Button>
        </div>}
        {error && <div className="alert alert-error" role="alert">{error}</div>}
        <footer className="identity-form__actions"><Button variant="ghost" onClick={onClose}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save profile'}</Button></footer>
      </form>
    </Dialog>
  )
}

const defaults = {
  skills: { name: '', type: 'technical', proficiency: 50, years: 0, visibility: 'public' },
  projects: { title: '', description: '', technologies: '', githubUrl: '', demoUrl: '', screenshots: '', status: 'in-progress', visibility: 'public', featured: false },
  achievements: { title: '', type: 'award', issuer: '', description: '', evidenceUrl: '', awardedAt: '', visibility: 'public', featured: false },
  credentials: { title: '', category: 'course', issuer: '', credentialId: '', verificationUrl: '', documentUrl: '', skills: '', issuedAt: '', expiresAt: '', visibility: 'public', featured: false },
  academicJourney: { level: 'undergraduate', institution: '', program: '', specialization: '', startYear: '', endYear: '', status: 'in-progress', visibility: 'public' },
  experience: { title: '', organization: '', type: 'internship', description: '', startDate: '', endDate: '', current: false, visibility: 'public' },
}

export function EntityDialog({ open, section, item, onClose, onSave, onUpload }) {
  const [form, setForm] = useState(() => ({
    ...defaults[section],
    ...item,
    technologies: csv(item?.technologies),
    screenshots: csv(item?.screenshots),
    skills: csv(item?.skills),
    startedAt: item?.startedAt?.slice(0, 10) || '',
    completedAt: item?.completedAt?.slice(0, 10) || '',
    awardedAt: item?.awardedAt?.slice(0, 10) || '',
    issuedAt: item?.issuedAt?.slice(0, 10) || '',
    startDate: item?.startDate?.slice(0, 10) || '',
    endDate: item?.endDate?.slice(0, 10) || '',
  }))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const set = (field, value) => setForm((current) => ({ ...current, [field]: value }))
  const submit = async (event) => {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      const payload = { ...form }
      if (section === 'projects') {
        payload.technologies = split(form.technologies)
        payload.screenshots = split(form.screenshots)
      }
      if (section === 'credentials') payload.skills = split(form.skills)
      await onSave(payload)
      onClose()
    } catch (requestError) {
      setError(requestError.userMessage || requestError.response?.data?.message || `Unable to save ${section}.`)
    } finally {
      setSaving(false)
    }
  }
  const title = section === 'credentials' ? 'certificate' : section === 'academicJourney' ? 'education entry' : section.slice(0, -1)
  return (
    <Dialog open={open} title={`${item ? 'Edit' : 'Add'} ${title}`} description={`Build your ${section} identity.`} onClose={onClose}>
      <form className="identity-form" onSubmit={submit}>
        {section === 'skills' && <div className="identity-form__grid">
          <FormField label="Skill name" required><input className="input" value={form.name} onChange={(event) => set('name', event.target.value)} /></FormField>
          <FormField label="Skill type"><select className="select" value={form.type} onChange={(event) => set('type', event.target.value)}>{SKILL_TYPES.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></FormField>
          <FormField label={`Proficiency: ${form.proficiency}%`}><input type="range" min="0" max="100" value={form.proficiency} onChange={(event) => set('proficiency', Number(event.target.value))} /></FormField>
          <FormField label="Years"><input className="input" type="number" min="0" max="80" value={form.years} onChange={(event) => set('years', event.target.value)} /></FormField>
        </div>}
        {section === 'projects' && <div className="identity-form__grid">
          <FormField label="Project title" required><input className="input" value={form.title} onChange={(event) => set('title', event.target.value)} /></FormField>
          <FormField label="Status"><select className="select" value={form.status} onChange={(event) => set('status', event.target.value)}>{['planned','in-progress','completed','archived'].map((value) => <option value={value} key={value}>{value}</option>)}</select></FormField>
          <FormField label="Description" className="identity-form__wide"><textarea className="textarea" rows="4" value={form.description} onChange={(event) => set('description', event.target.value)} /></FormField>
          <FormField label="Technology stack" hint="Comma separated"><input className="input" value={form.technologies} onChange={(event) => set('technologies', event.target.value)} /></FormField>
          <FormField label="Screenshot URLs" hint="Comma separated"><input className="input" value={form.screenshots} onChange={(event) => set('screenshots', event.target.value)} /></FormField>
          <FormField label="GitHub URL"><input className="input" type="url" value={form.githubUrl} onChange={(event) => set('githubUrl', event.target.value)} /></FormField>
          <FormField label="Demo URL"><input className="input" type="url" value={form.demoUrl} onChange={(event) => set('demoUrl', event.target.value)} /></FormField>
        </div>}
        {section === 'achievements' && <div className="identity-form__grid">
          <FormField label="Achievement title" required><input className="input" value={form.title} onChange={(event) => set('title', event.target.value)} /></FormField>
          <FormField label="Type"><select className="select" value={form.type} onChange={(event) => set('type', event.target.value)}>{['competition','hackathon','sports','research','award','badge','academic','project','certification','leadership','community','other'].map((value) => <option key={value}>{value}</option>)}</select></FormField>
          <FormField label="Issuer / organizer"><input className="input" value={form.issuer} onChange={(event) => set('issuer', event.target.value)} /></FormField>
          <FormField label="Date"><input className="input" type="date" value={form.awardedAt} onChange={(event) => set('awardedAt', event.target.value)} /></FormField>
          <FormField label="Description" className="identity-form__wide"><textarea className="textarea" rows="4" value={form.description} onChange={(event) => set('description', event.target.value)} /></FormField>
          <FormField label="Evidence URL"><input className="input" type="url" value={form.evidenceUrl} onChange={(event) => set('evidenceUrl', event.target.value)} /></FormField>
        </div>}
        {section === 'credentials' && <div className="identity-form__grid">
          <FormField label="Certificate title" required><input className="input" value={form.title} onChange={(event) => set('title', event.target.value)} /></FormField>
          <FormField label="Issuer" required><input className="input" value={form.issuer} onChange={(event) => set('issuer', event.target.value)} /></FormField>
          <FormField label="Category"><select className="select" value={form.category} onChange={(event) => set('category', event.target.value)}>{['academic','course','skill','competition','professional','other'].map((value) => <option key={value}>{value}</option>)}</select></FormField>
          <FormField label="Credential ID"><input className="input" value={form.credentialId} onChange={(event) => set('credentialId', event.target.value)} /></FormField>
          <FormField label="Issue date"><input className="input" type="date" value={form.issuedAt} onChange={(event) => set('issuedAt', event.target.value)} /></FormField>
          <FormField label="Expiry date"><input className="input" type="date" value={form.expiresAt} onChange={(event) => set('expiresAt', event.target.value)} /></FormField>
          <FormField label="Verification URL"><input className="input" type="url" value={form.verificationUrl} onChange={(event) => set('verificationUrl', event.target.value)} /></FormField>
          <FormField label="Document URL"><input className="input" value={form.documentUrl} onChange={(event) => set('documentUrl', event.target.value)} /></FormField>
          <FormField label="Skills" hint="Comma separated"><input className="input" value={form.skills} onChange={(event) => set('skills', event.target.value)} /></FormField>
          {onUpload && <FormField label="Upload certificate" hint="PDF, JPEG, PNG or WebP; max 8 MB"><input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={async (event) => {
            const file = event.target.files?.[0]
            if (!file) return
            try {
              set('documentUrl', await onUpload(file))
            } catch (requestError) {
              setError(requestError.userMessage || requestError.response?.data?.message || 'Certificate upload failed.')
            }
          }} /></FormField>}
        </div>}
        {section === 'academicJourney' && <div className="identity-form__grid">
          <FormField label="Level"><select className="select" value={form.level} onChange={(event) => set('level', event.target.value)}>{['school','intermediate','diploma','undergraduate','postgraduate','other'].map((value) => <option key={value}>{value}</option>)}</select></FormField>
          <FormField label="Institution" required><input className="input" value={form.institution} onChange={(event) => set('institution', event.target.value)} /></FormField>
          <FormField label="Program"><input className="input" value={form.program} onChange={(event) => set('program', event.target.value)} /></FormField>
          <FormField label="Specialization"><input className="input" value={form.specialization} onChange={(event) => set('specialization', event.target.value)} /></FormField>
          <FormField label="Start year"><input className="input" type="number" value={form.startYear} onChange={(event) => set('startYear', event.target.value)} /></FormField>
          <FormField label="End year"><input className="input" type="number" value={form.endYear} onChange={(event) => set('endYear', event.target.value)} /></FormField>
          <FormField label="Status"><select className="select" value={form.status} onChange={(event) => set('status', event.target.value)}>{['planned','in-progress','completed'].map((value) => <option key={value}>{value}</option>)}</select></FormField>
        </div>}
        {section === 'experience' && <div className="identity-form__grid">
          <FormField label="Role title" required><input className="input" value={form.title} onChange={(event) => set('title', event.target.value)} /></FormField>
          <FormField label="Organization"><input className="input" value={form.organization} onChange={(event) => set('organization', event.target.value)} /></FormField>
          <FormField label="Type"><select className="select" value={form.type} onChange={(event) => set('type', event.target.value)}>{['internship','employment','volunteer','research','freelance','leadership','other'].map((value) => <option key={value}>{value}</option>)}</select></FormField>
          <FormField label="Start date"><input className="input" type="date" value={form.startDate} onChange={(event) => set('startDate', event.target.value)} /></FormField>
          <FormField label="End date"><input className="input" type="date" value={form.endDate} onChange={(event) => set('endDate', event.target.value)} disabled={form.current} /></FormField>
          <FormField label="Description" className="identity-form__wide"><textarea className="textarea" rows="4" value={form.description} onChange={(event) => set('description', event.target.value)} /></FormField>
          <label><input type="checkbox" checked={Boolean(form.current)} onChange={(event) => set('current', event.target.checked)} /> Current role</label>
        </div>}
        {section !== 'skills' && section !== 'academicJourney' && section !== 'experience' && <div className="identity-form__options"><label><input type="checkbox" checked={Boolean(form.featured)} onChange={(event) => set('featured', event.target.checked)} /> Featured</label></div>}
        <FormField label="Visibility"><select className="select" value={form.visibility || 'public'} onChange={(event) => set('visibility', event.target.value)}><option value="public">Public</option><option value="unlisted">Unlisted</option><option value="private">Private</option></select></FormField>
        {error && <div className="alert alert-error" role="alert">{error}</div>}
        <footer className="identity-form__actions"><Button variant="ghost" onClick={onClose}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? 'Saving…' : `Save ${title}`}</Button></footer>
      </form>
    </Dialog>
  )
}
