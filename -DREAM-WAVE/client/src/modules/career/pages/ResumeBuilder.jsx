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
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface p-6 rounded-stitch border border-divider shadow-sm">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-brand-primary">ATS-friendly professional identity</span>
            <h1 className="text-2xl sm:text-3xl font-bold text-content-heading tracking-tight mt-1">Resume Builder</h1>
            <p className="text-sm text-content-muted mt-1">Create, edit, preview, autosave and export multiple professional resumes.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="secondary" onClick={() => setCreateOpen(true)}>+ New resume</Button>
            {resume && <Button onClick={download}>Download PDF</Button>}
          </div>
        </header>

        {error && <ErrorState title="Resume action failed" message={error} onRetry={() => setError('')} />}

        {!resume ? (
          <EmptyState title="Create your first professional resume" message="Start from your verified Dream Wave profile or build from a blank template." action={<Button onClick={() => setCreateOpen(true)}>Create resume</Button>} />
        ) : (
          <>
            <section className="bg-surface p-4 rounded-stitch border border-divider shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-4">
                <label className="flex items-center gap-2 text-xs font-semibold text-content-heading">
                  <span>Resume:</span>
                  <select className="bg-surface-elevated text-content-body border border-divider rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-brand-primary" value={resume._id} onChange={(event) => selectResume(event.target.value)}>
                    {resumes.map((item) => <option value={item._id} key={item._id}>{item.title}{item.isDefault ? ' · Default' : ''}</option>)}
                  </select>
                </label>
                <label className="flex items-center gap-2 text-xs font-semibold text-content-heading">
                  <span>Title:</span>
                  <input className="bg-surface-elevated text-content-body border border-divider rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-brand-primary" value={resume.title} onChange={(event) => setResume((current) => ({ ...current, title: event.target.value }))} />
                </label>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-surface-elevated border border-divider rounded-xl p-1 text-xs">
                  <button type="button" className={`px-3 py-1 font-semibold rounded-lg transition-colors ${view === 'editor' ? 'bg-brand-primary text-white' : 'text-content-muted hover:text-content-heading'}`} onClick={() => setView('editor')}>Editor</button>
                  <button type="button" className={`px-3 py-1 font-semibold rounded-lg transition-colors ${view === 'preview' ? 'bg-brand-primary text-white' : 'text-content-muted hover:text-content-heading'}`} onClick={() => setView('preview')}>Preview</button>
                  <button type="button" className={`px-3 py-1 font-semibold rounded-lg transition-colors ${view === 'analysis' ? 'bg-brand-primary text-white' : 'text-content-muted hover:text-content-heading'}`} onClick={() => setView('analysis')}>ATS Score</button>
                </div>
                <span className={`text-xs font-medium px-2 py-1 rounded ${saveState.includes('failed') ? 'text-red-500 bg-red-500/10' : 'text-content-muted'}`} role="status">{saveState || 'Autosave ready'}</span>
                <Button variant="ghost" onClick={remove}>Delete</Button>
              </div>
            </section>

            <TemplatePicker value={resume.template} onChange={(template) => setResume((current) => ({ ...current, template }))} />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className={view === 'editor' ? 'block' : 'hidden lg:block'}><ResumeEditor resume={resume} onChange={setResume} /></div>
              <div className={view === 'preview' ? 'block' : 'hidden lg:block'}><ResumePreview resume={resume} /></div>
              {view === 'analysis' && (
                <div className="lg:col-span-2 space-y-4">
                  <FormField label="Target job keywords" hint="Comma separated; used only by the deterministic matching architecture">
                    <input className="input" value={keywords} onChange={(event) => setKeywords(event.target.value)} placeholder="React, TypeScript, REST APIs" />
                  </FormField>
                  <ATSPanel analysis={resume.atsSnapshot} onAnalyze={analyze} loading={analyzing} />
                </div>
              )}
            </div>
          </>
        )}
      </div>
      <Dialog open={createOpen} title="Create resume" description="Choose a template and optionally seed sections from your Student Profile." onClose={() => setCreateOpen(false)}>
        <form className="resume-create-form" onSubmit={create}><FormField label="Resume title" required><input className="input" value={createForm.title} onChange={(event) => setCreateForm((current) => ({ ...current, title: event.target.value }))} /></FormField><TemplatePicker value={createForm.template} onChange={(template) => setCreateForm((current) => ({ ...current, template }))} /><label><input type="checkbox" checked={createForm.fromProfile} onChange={(event) => setCreateForm((current) => ({ ...current, fromProfile: event.target.checked }))} /> Import education, skills, projects, certificates and achievements from my profile</label><footer><Button variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Button><Button type="submit">Create resume</Button></footer></form>
      </Dialog>
    </StudentLayout>
  )
}
