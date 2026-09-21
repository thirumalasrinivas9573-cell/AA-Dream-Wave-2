import { useCallback, useEffect, useRef, useState } from 'react'
import { Button, Dialog, EmptyState, ErrorState, FormField, LoadingState } from '@shared/components/ui'
import { careerApi } from '@shared/services/api'
import StudentLayout from '../../student/layouts/StudentLayout'
import { ATSPanel, ResumeEditor, ResumePreview, TemplatePicker } from '../components/ResumeWorkspace'
import '../styles/career.css'

export default function ResumeBuilder() {
  const [resumes, setResumes] = useState([])
  const [resume, setResume] = useState(null)
  const [view, setView] = useState('editor')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saveState, setSaveState] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState({ title: 'Professional Resume', template: 'modern', fromProfile: true })
  const [keywords, setKeywords] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const hydratedId = useRef(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const { data } = await careerApi.resumes()
      setResumes(data.items || [])
      if (data.items?.length) {
        const selected = data.items.find((item) => item.isDefault) || data.items[0]
        setResume(selected)
        hydratedId.current = selected._id
      }
    } catch (requestError) {
      setError(requestError.userMessage || 'Unable to load resumes.')
    } finally {
      setLoading(false)
    }
  }, [])
  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!resume?._id || hydratedId.current === resume._id) {
      hydratedId.current = null
      return undefined
    }
    setSaveState('Saving…')
    const timeout = setTimeout(async () => {
      try {
        const { data } = await careerApi.updateResume(resume._id, resume)
        setResume(data.resume)
        setResumes((current) => current.map((item) => item._id === data.resume._id ? data.resume : item))
        setSaveState(`Saved ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`)
        hydratedId.current = data.resume._id
      } catch (requestError) {
        setSaveState('Autosave failed')
        setError(requestError.response?.status === 409 ? 'This resume changed in another session. Reload before continuing.' : requestError.userMessage || 'Autosave failed.')
      }
    }, 900)
    return () => clearTimeout(timeout)
  }, [resume])

  const selectResume = async (id) => {
    try {
      const { data } = await careerApi.resume(id)
      hydratedId.current = id
      setResume(data.resume)
    } catch (requestError) {
      setError(requestError.userMessage || 'Unable to open resume.')
    }
  }
  const create = async (event) => {
    event.preventDefault()
    try {
      const { data } = await careerApi.createResume(createForm)
      setResumes((current) => [data.resume, ...current.map((item) => ({ ...item, isDefault: data.resume.isDefault ? false : item.isDefault }))])
      hydratedId.current = data.resume._id
      setResume(data.resume)
      setCreateOpen(false)
    } catch (requestError) {
      setError(requestError.userMessage || requestError.response?.data?.message || 'Unable to create resume.')
    }
  }
  const remove = async () => {
    if (!resume || !window.confirm(`Delete “${resume.title}”? Applications already submitted retain their resume link.`)) return
    try {
      await careerApi.deleteResume(resume._id)
      const next = resumes.filter((item) => item._id !== resume._id)
      setResumes(next)
      setResume(next[0] || null)
      hydratedId.current = next[0]?._id || null
    } catch (requestError) {
      setError(requestError.userMessage || 'Unable to delete resume.')
    }
  }
  const download = async () => {
    try {
      const { data } = await careerApi.downloadResume(resume._id)
      const url = URL.createObjectURL(data)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `${resume.title.replace(/[^a-z0-9]+/gi, '-') || 'resume'}.pdf`
      anchor.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (requestError) {
      setError(requestError.userMessage || 'PDF export failed.')
    }
  }
  const analyze = async () => {
    setAnalyzing(true)
    try {
      const { data } = await careerApi.analyzeResume(resume._id, { keywords: keywords.split(',').map((item) => item.trim()).filter(Boolean) })
      setResume((current) => ({ ...current, atsSnapshot: data.analysis }))
    } catch (requestError) {
      setError(requestError.userMessage || 'Resume analysis failed.')
    } finally {
      setAnalyzing(false)
    }
  }

  if (loading) return <StudentLayout><div className="career-shell"><LoadingState label="Loading Resume Builder…" rows={9} /></div></StudentLayout>
  return (
    <StudentLayout>
      <div className="career-shell resume-workspace">
        <header className="career-page-header resume-page-header">
          <div><span>ATS-friendly professional identity</span><h1>Resume Builder</h1><p>Create, edit, preview, autosave and export multiple professional resumes.</p></div>
          <nav><Button variant="secondary" onClick={() => setCreateOpen(true)}>+ New resume</Button>{resume && <Button onClick={download}>Download PDF</Button>}</nav>
        </header>
        {error && <ErrorState title="Resume action failed" message={error} onRetry={() => setError('')} />}
        {!resume ? <EmptyState title="Create your first professional resume" message="Start from your verified Dream Wave profile or build from a blank template." action={<Button onClick={() => setCreateOpen(true)}>Create resume</Button>} /> : <>
          <section className="resume-command-bar">
            <label><span>Resume</span><select value={resume._id} onChange={(event) => selectResume(event.target.value)}>{resumes.map((item) => <option value={item._id} key={item._id}>{item.title}{item.isDefault ? ' · Default' : ''}</option>)}</select></label>
            <label><span>Title</span><input value={resume.title} onChange={(event) => setResume((current) => ({ ...current, title: event.target.value }))} /></label>
            <div className="resume-view-toggle"><button type="button" className={view === 'editor' ? 'is-active' : ''} onClick={() => setView('editor')}>Editor</button><button type="button" className={view === 'preview' ? 'is-active' : ''} onClick={() => setView('preview')}>Preview</button><button type="button" className={view === 'analysis' ? 'is-active' : ''} onClick={() => setView('analysis')}>ATS Score</button></div>
            <span className={`resume-save-state ${saveState.includes('failed') ? 'is-error' : ''}`} role="status">{saveState || 'Autosave ready'}</span>
            <Button variant="ghost" onClick={remove}>Delete</Button>
          </section>
          <TemplatePicker value={resume.template} onChange={(template) => setResume((current) => ({ ...current, template }))} />
          <div className={`resume-main resume-main--${view}`}>
            <div className={view === 'editor' ? '' : 'resume-mobile-hidden'}><ResumeEditor resume={resume} onChange={setResume} /></div>
            <div className={view === 'preview' ? '' : 'resume-mobile-hidden'}><ResumePreview resume={resume} /></div>
            <div className={view === 'analysis' ? '' : 'resume-mobile-hidden'}><FormField label="Target job keywords" hint="Comma separated; used only by the deterministic matching architecture"><input className="input" value={keywords} onChange={(event) => setKeywords(event.target.value)} placeholder="React, TypeScript, REST APIs" /></FormField><ATSPanel analysis={resume.atsSnapshot} onAnalyze={analyze} loading={analyzing} /></div>
          </div>
        </>}
      </div>
      <Dialog open={createOpen} title="Create resume" description="Choose a template and optionally seed sections from your Student Profile." onClose={() => setCreateOpen(false)}>
        <form className="resume-create-form" onSubmit={create}><FormField label="Resume title" required><input className="input" value={createForm.title} onChange={(event) => setCreateForm((current) => ({ ...current, title: event.target.value }))} /></FormField><TemplatePicker value={createForm.template} onChange={(template) => setCreateForm((current) => ({ ...current, template }))} /><label><input type="checkbox" checked={createForm.fromProfile} onChange={(event) => setCreateForm((current) => ({ ...current, fromProfile: event.target.checked }))} /> Import education, skills, projects, certificates and achievements from my profile</label><footer><Button variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Button><Button type="submit">Create resume</Button></footer></form>
      </Dialog>
    </StudentLayout>
  )
}
