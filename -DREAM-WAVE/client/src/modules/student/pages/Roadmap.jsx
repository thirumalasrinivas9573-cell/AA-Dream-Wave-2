import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { goalApi, roadmapApi } from '@shared/services/api'
import goalIntelligenceService from '@shared/services/goalIntelligenceService'
import { Button, Dialog, EmptyState, ErrorState, LoadingState } from '@shared/components/ui'
import StudentLayout from '../layouts/StudentLayout'
import { usePdfExport } from '@shared/hooks/usePdfExport'
import { DownloadPdfButton } from '@shared/components/DownloadPdfButton'
import {
  CollectionEditor,
  PlanEditor,
  RoadmapNav,
  RoadmapSection,
  RoadmapStageEditor,
} from '../components/roadmap/RoadmapWorkspace'
import '../styles/goals-roadmap.css'

const architectureFields = [
  'learningStages',
  'weeklyPlans',
  'monthlyPlans',
  'learningResources',
  'practiceProjects',
  'revisionSessions',
  'assessmentPoints',
]

function normalizeRoadmap(document) {
  if (!document) return null
  return {
    ...document,
    learningStages: document.learningStages || [],
    weeklyPlans: document.weeklyPlans || [],
    monthlyPlans: document.monthlyPlans || [],
    learningResources: document.learningResources || [],
    practiceProjects: document.practiceProjects || [],
    revisionSessions: document.revisionSessions || [],
    assessmentPoints: document.assessmentPoints || [],
  }
}

export default function Roadmap() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [goals, setGoals] = useState([])
  const [selectedGoalId, setSelectedGoalId] = useState(searchParams.get('goalId') || '')
  const [roadmap, setRoadmap] = useState(null)
  const [draft, setDraft] = useState(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [loadingGoals, setLoadingGoals] = useState(true)
  const [loadingRoadmap, setLoadingRoadmap] = useState(false)
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [notFound, setNotFound] = useState(false)
  const [fallback, setFallback] = useState(false)
  const [error, setError] = useState('')
  const [confirmGenerate, setConfirmGenerate] = useState(false)
  const [adaptPreview, setAdaptPreview] = useState(null)
  const [adaptLoading, setAdaptLoading] = useState(false)
  const requestId = useRef(0)
  const { exporting, error: pdfError, setError: setPdfError, notice: pdfNotice, setNotice: setPdfNotice, exportPdf } = usePdfExport()

  const selectedGoal = useMemo(() => goals.find((goal) => goal._id === selectedGoalId) || null, [goals, selectedGoalId])
  const data = draft?.data || {}
  const progress = draft?.progress?.percent ?? selectedGoal?.progress ?? 0
  const dirty = useMemo(() => architectureFields.some((field) => JSON.stringify(draft?.[field] || []) !== JSON.stringify(roadmap?.[field] || [])), [draft, roadmap])
  const transparency = data?.transparency || null

  useEffect(() => {
    let cancelled = false
    setLoadingGoals(true)
    goalApi.getAll()
      .then((response) => {
        if (cancelled) return
        const items = response.data.goals || []
        setGoals(items)
        const requested = searchParams.get('goalId')
        setSelectedGoalId((current) => {
          if (requested && items.some((goal) => goal._id === requested)) return requested
          if (current && items.some((goal) => goal._id === current)) return current
          return '' // Do not default to first goal
        })
      })
      .catch((requestError) => !cancelled && setError(requestError.userMessage || 'Unable to load goals.'))
      .finally(() => !cancelled && setLoadingGoals(false))
    return () => { cancelled = true }
  }, [searchParams])

  const loadRoadmap = useCallback(async (goalId) => {
    if (!goalId) {
      setRoadmap(null)
      setDraft(null)
      setLoadingRoadmap(false)
      return
    }
    const currentRequest = ++requestId.current
    setLoadingRoadmap(true)
    setNotFound(false)
    setError('')
    setFallback(false)
    try {
      const response = await roadmapApi.get(goalId)
      if (requestId.current !== currentRequest) return
      const normalized = normalizeRoadmap(response.data.roadmap)
      setRoadmap(normalized)
      setDraft(normalized)
    } catch (requestError) {
      if (requestId.current !== currentRequest) return
      if (requestError.response?.status === 404) {
        setNotFound(true)
        setRoadmap(null)
        setDraft(null)
      } else {
        setError(requestError.response?.data?.message || requestError.userMessage || 'Unable to load this roadmap.')
      }
    } finally {
      if (requestId.current === currentRequest) setLoadingRoadmap(false)
    }
  }, [])

  useEffect(() => {
    if (selectedGoalId) {
      loadRoadmap(selectedGoalId)
    } else {
      setRoadmap(null)
      setDraft(null)
    }
  }, [loadRoadmap, selectedGoalId])

  const chooseGoal = (goalId) => {
    setSelectedGoalId(goalId)
    setRoadmap(null)
    setDraft(null)
    setError('')
    setNotFound(false)
    setActiveTab('overview')
    setSearchParams((current) => {
      const next = new URLSearchParams(current)
      if (goalId) next.set('goalId', goalId)
      else next.delete('goalId')
      return next
    }, { replace: true })
  }

  const initialize = async () => {
    if (!selectedGoalId) return
    setSaving(true)
    setError('')
    try {
      const response = await roadmapApi.initialize(selectedGoalId)
      const normalized = normalizeRoadmap(response.data.roadmap)
      setRoadmap(normalized)
      setDraft(normalized)
      setNotFound(false)
    } catch (requestError) {
      setError(requestError.userMessage || 'Unable to initialize this roadmap.')
    } finally {
      setSaving(false)
    }
  }

  const saveArchitecture = async () => {
    if (!draft || !selectedGoalId) return
    setSaving(true)
    setError('')
    try {
      const payload = Object.fromEntries(architectureFields.map((field) => [field, draft[field] || []]))
      const response = await roadmapApi.updateArchitecture(selectedGoalId, payload)
      const normalized = normalizeRoadmap(response.data.roadmap)
      setRoadmap(normalized)
      setDraft(normalized)
    } catch (requestError) {
      setError(requestError.userMessage || 'Unable to save roadmap changes.')
    } finally {
      setSaving(false)
    }
  }

  const generate = async () => {
    if (!selectedGoalId || generating) return
    setConfirmGenerate(false)
    setGenerating(true)
    setError('')
    try {
      const response = await roadmapApi.generate({ goalId: selectedGoalId })
      const normalized = normalizeRoadmap(response.data.roadmap)
      setRoadmap(normalized)
      setDraft(normalized)
      setFallback(Boolean(response.data.fallback))
      setNotFound(false)
      setActiveTab('overview')
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.userMessage || 'Roadmap generation failed.')
    } finally {
      setGenerating(false)
    }
  }

  const updateArchitectureField = (field, value) => {
    setDraft((current) => ({ ...current, [field]: value }))
  }

  const loadAdaptPreview = async () => {
    if (!selectedGoalId) return
    setAdaptLoading(true)
    setError('')
    try {
      const response = await goalIntelligenceService.adaptPreview(selectedGoalId)
      setAdaptPreview(response.data)
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Roadmap adaptation preview unavailable.')
    } finally {
      setAdaptLoading(false)
    }
  }

  const applyAdaptation = async () => {
    if (!selectedGoalId || !adaptPreview?.suggested) return
    setAdaptLoading(true)
    setError('')
    try {
      const response = await goalIntelligenceService.applyAdaptation(selectedGoalId, adaptPreview.suggested)
      const normalized = normalizeRoadmap(response.data?.roadmap)
      if (normalized) {
        setRoadmap(normalized)
        setDraft(normalized)
      }
      setAdaptPreview(null)
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to apply roadmap changes.')
    } finally {
      setAdaptLoading(false)
    }
  }

  const toggleGeneratedStep = async (index, completed) => {
    if (!selectedGoalId) return
    const previous = draft
    const nextSteps = (data.nextSteps || []).map((step, stepIndex) => stepIndex === index ? { ...step, completed } : step)
    setDraft((current) => ({ ...current, data: { ...current.data, nextSteps } }))
    try {
      const response = await roadmapApi.updateStep(selectedGoalId, { stepIndex: index, completed })
      const normalized = normalizeRoadmap(response.data.roadmap)
      setRoadmap(normalized)
      setDraft(normalized)
      setGoals((current) => current.map((goal) => goal._id === selectedGoalId ? { ...goal, progress: response.data.progress, completed: response.data.progress >= 100 } : goal))
    } catch (requestError) {
      setDraft(previous)
      setError(requestError.userMessage || 'Unable to update roadmap progress.')
    }
  }

  const generatedResources = useMemo(() => [
    ...(data.books || []).map((item) => ({ type: 'book', title: item.title || item.name || String(item), url: item.url || '' })),
    ...(data.courses || []).map((item) => ({ type: 'course', title: item.name || item.title || String(item), url: item.url || '' })),
  ], [data.books, data.courses])

  const hasStages = Boolean(roadmap && (draft?.learningStages?.length || roadmap?.learningStages?.length))

  const handleExportPdf = () => {
    if (!roadmap) return
    const titleForSlug = selectedGoal?.title || roadmap.title || draft?.data?.overview || 'roadmap'
    const slug = titleForSlug
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') || 'roadmap'
    const dateStr = new Date().toISOString().slice(0, 10)
    const fileName = `dreamwave-roadmap-${slug}-${dateStr}.pdf`

    const docBuilder = async (options = {}) => {
      const { RoadmapPdf } = await import('./RoadmapPdf')
      return <RoadmapPdf roadmap={draft || roadmap} goal={selectedGoal} options={options} />
    }
    exportPdf(docBuilder, fileName)
  }

  return (
    <StudentLayout>
      <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface p-6 rounded-stitch border border-divider shadow-sm">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-content-heading tracking-tight">
              <span className="gradient-text">Learning Roadmap</span>
            </h1>
            <p className="text-sm text-content-muted mt-1">Structure skill progression, plans, resources, practice and assessments.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {dirty && <Button onClick={saveArchitecture} disabled={saving || generating}>{saving ? 'Saving…' : 'Save changes'}</Button>}
            {roadmap && <Button variant="secondary" onClick={() => setConfirmGenerate(true)} disabled={generating}>{generating ? 'Generating roadmap…' : 'AI generation'}</Button>}
            {roadmap && <Button variant="secondary" onClick={loadAdaptPreview} disabled={adaptLoading || generating}>Suggest adjustments</Button>}
            <DownloadPdfButton
              onExport={handleExportPdf}
              loading={exporting}
              disabled={!hasStages}
              disabledReason={!roadmap ? 'No roadmap to export.' : 'This roadmap has no stages to export.'}
            />
          </div>
        </header>

        {generating && (
          <div className="p-4 bg-surface rounded-stitch border border-divider shadow-sm">
            <LoadingState label="Generating personalized roadmap and 30-day curriculum with AI… Please wait." rows={3} />
          </div>
        )}

        <section className="bg-surface p-6 rounded-stitch border border-divider shadow-sm flex flex-col sm:flex-row sm:items-center gap-4" aria-label="Select roadmap goal">
          <label htmlFor="roadmap-goal" className="text-sm font-semibold text-content-heading shrink-0">Goal</label>
          <select id="roadmap-goal" className="flex-1 bg-surface-elevated text-content-body border border-divider rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-brand-primary" value={selectedGoalId} onChange={(event) => chooseGoal(event.target.value)} disabled={loadingGoals}>
            <option value="">{goals.length ? '— Select a goal —' : 'No goals available'}</option>
            {goals.map((goal) => <option value={goal._id} key={goal._id}>{goal.title} · {goal.category}</option>)}
          </select>
          <Link className="px-4 py-2 text-sm font-medium bg-surface-elevated hover:bg-surface text-content-heading rounded-stitch border border-divider transition-colors shrink-0" to="/student/goals">Manage goals</Link>
        </section>

        {pdfError && (
          <div className="alert alert-error" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>⚠️ {pdfError}</span>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPdfError('')} style={{ padding: '2px 8px' }}>✕</button>
          </div>
        )}
        {pdfNotice && (
          <div className="alert alert-warning" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>ℹ️ {pdfNotice}</span>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPdfNotice('')} style={{ padding: '2px 8px' }}>✕</button>
          </div>
        )}

        {error && (
          <ErrorState
            title="Roadmap action failed"
            message={error}
            onRetry={() => {
              setError('')
              if (selectedGoalId) {
                if (notFound) {
                  generate()
                } else {
                  loadRoadmap(selectedGoalId)
                }
              }
            }}
          />
        )}
        {fallback && <div className="p-4 bg-amber-500/10 text-amber-600 border border-amber-500/20 rounded-stitch text-sm">The existing AI service used its fallback roadmap because the generation provider was unavailable.</div>}
        {transparency && (
          <div className="p-4 bg-brand-primary/10 text-content-body border border-brand-primary/20 rounded-stitch text-sm space-y-2">
            <strong className="text-brand-primary font-semibold block">{transparency.label === 'SYSTEM-GENERATED FALLBACK' ? 'SYSTEM-GENERATED FALLBACK' : 'Roadmap transparency'}</strong>
            <div className="grid grid-cols-1 gap-1 text-xs text-content-muted">
              {transparency.confirmedUserData?.length > 0 && <div>Confirmed user data: {transparency.confirmedUserData.join(', ')}</div>}
              {transparency.databaseSignals?.length > 0 && <div>Database signals: {transparency.databaseSignals.join(', ')}</div>}
              {transparency.aiInferences?.length > 0 && <div>AI/system inference: {transparency.aiInferences.join(', ')}</div>}
              {transparency.needsUserConfirmation?.length > 0 && <div>Needs confirmation: {transparency.needsUserConfirmation.join(', ')}</div>}
            </div>
          </div>
        )}

        {!loadingGoals && !goals.length && (
          <section className="bg-surface p-12 rounded-stitch border border-divider text-center flex flex-col items-center space-y-3 shadow-sm">
            <span aria-hidden="true" className="text-4xl">🗺️</span>
            <h2 className="text-lg font-semibold text-content-heading">Create a goal first</h2>
            <p className="text-sm text-content-muted max-w-md">Every roadmap belongs to a measurable learning goal.</p>
            <Link className="px-4 py-2 text-sm font-medium bg-brand-primary text-white rounded-stitch" to="/student/goals">Create a goal</Link>
          </section>
        )}

        {!loadingGoals && goals.length > 0 && !selectedGoalId && (
          <section className="bg-surface p-12 rounded-stitch border border-divider text-center flex flex-col items-center space-y-3 shadow-sm">
            <span aria-hidden="true" className="text-4xl">🎯</span>
            <h2 className="text-lg font-semibold text-content-heading">Select a learning goal</h2>
            <p className="text-sm text-content-muted max-w-md">Choose a goal from the dropdown above to view or generate its customized roadmap.</p>
          </section>
        )}

        {loadingRoadmap && <LoadingState label="Loading roadmap workspace…" rows={6} />}

        {!loadingRoadmap && selectedGoal && notFound && (
          <section className="bg-surface p-12 rounded-stitch border border-divider text-center flex flex-col items-center space-y-3 shadow-sm">
            <span aria-hidden="true" className="text-4xl">🧭</span>
            <h2 className="text-lg font-semibold text-content-heading">Start this learning roadmap</h2>
            <p className="text-sm text-content-muted max-w-md">Create a manual roadmap workspace for stages, weekly plans, resources, projects, revision sessions and assessments. AI is optional.</p>
            <Button onClick={initialize} disabled={saving}>{saving ? 'Starting…' : 'Initialize roadmap'}</Button>
          </section>
        )}

        {!loadingRoadmap && draft && (
          <>
            <section className="grid grid-cols-2 sm:grid-cols-4 gap-4" aria-label="Roadmap summary">
              <article className="bg-surface p-4 rounded-stitch border border-divider shadow-sm space-y-1"><strong className="text-xl font-bold text-brand-primary block">{progress}%</strong><small className="text-xs text-content-muted font-medium uppercase tracking-wider block">Completion</small></article>
              <article className="bg-surface p-4 rounded-stitch border border-divider shadow-sm space-y-1"><strong className="text-xl font-bold text-content-heading block">{draft.learningStages.length}</strong><small className="text-xs text-content-muted font-medium uppercase tracking-wider block">Learning stages</small></article>
              <article className="bg-surface p-4 rounded-stitch border border-divider shadow-sm space-y-1"><strong className="text-xl font-bold text-content-heading block">{draft.weeklyPlans.length}</strong><small className="text-xs text-content-muted font-medium uppercase tracking-wider block">Weekly plans</small></article>
              <article className="bg-surface p-4 rounded-stitch border border-divider shadow-sm space-y-1"><strong className="text-xl font-bold text-content-heading block">{draft.architecture?.estimatedCompletion ? new Date(draft.architecture.estimatedCompletion).toLocaleDateString() : selectedGoal.deadline ? new Date(selectedGoal.deadline).toLocaleDateString() : 'Flexible'}</strong><small className="text-xs text-content-muted font-medium uppercase tracking-wider block">Estimated completion</small></article>
            </section>

            <div className="roadmap-shell">
              <RoadmapNav active={activeTab} onChange={setActiveTab} />
              <main className="roadmap-workspace">
                {activeTab === 'overview' && (
                  <>
                    <RoadmapSection title="Roadmap Overview" description={`Version ${draft.version || 1} · ${draft.architecture?.source || 'manual'} architecture`}>
                      <p>{data.overview || selectedGoal.description || 'Use this workspace to structure the learning journey for this goal.'}</p>
                    </RoadmapSection>
                    <RoadmapSection title="Progress & Assessment Points" description="Generated journey steps remain compatible with the existing roadmap engine.">
                      {(data.nextSteps || []).map((step, index) => (
                        <label className="roadmap-step-check" key={step.id || `${step.title}-${index}`}>
                          <input type="checkbox" checked={Boolean(step.completed)} onChange={(event) => toggleGeneratedStep(index, event.target.checked)} />
                          <span><strong>{step.title || `Step ${index + 1}`}</strong><small>{step.description || step.duration}</small></span>
                          {step.duration && <small>{step.duration}</small>}
                        </label>
                      ))}
                      {!(data.nextSteps || []).length && <EmptyState title="No generated steps" message="Manual learning stages can be managed from the Learning Stages section." />}
                    </RoadmapSection>
                    {(selectedGoal.milestones || []).length > 0 && (
                      <RoadmapSection title="Goal Milestones" description="Milestones are managed from Goal Details.">
                        <div className="roadmap-plan-list">
                          {selectedGoal.milestones.map((item) => <article className="roadmap-plan-item" key={item._id}><header><div><h3>{item.title}</h3><small>{item.status} · {item.progress || 0}%</small></div></header></article>)}
                        </div>
                      </RoadmapSection>
                    )}
                  </>
                )}

                {activeTab === 'stages' && (
                  <RoadmapSection title="Learning Stages" description="Build ordered stages for progressive skill development.">
                    <RoadmapStageEditor stages={draft.learningStages} onChange={(value) => updateArchitectureField('learningStages', value)} />
                  </RoadmapSection>
                )}

                {activeTab === 'weekly' && (
                  <RoadmapSection title="Weekly Plans" description="Define weekly focus, outcomes and study commitment.">
                    <PlanEditor type="weekly" items={draft.weeklyPlans} onChange={(value) => updateArchitectureField('weeklyPlans', value)} />
                  </RoadmapSection>
                )}

                {activeTab === 'monthly' && (
                  <RoadmapSection title="Monthly Plans" description="Group learning outcomes into monthly review cycles.">
                    <PlanEditor type="monthly" items={draft.monthlyPlans} onChange={(value) => updateArchitectureField('monthlyPlans', value)} />
                  </RoadmapSection>
                )}

                {activeTab === 'resources' && (
                  <RoadmapSection title="Learning Resources" description="Books, courses, articles and videos connected to this roadmap.">
                    {generatedResources.length > 0 && (
                      <div className="alert alert-info">{generatedResources.length} resource suggestions are available in the existing generated roadmap. Add verified resources below.</div>
                    )}
                    <CollectionEditor type="resources" items={draft.learningResources} onChange={(value) => updateArchitectureField('learningResources', value)} />
                  </RoadmapSection>
                )}

                {activeTab === 'projects' && (
                  <RoadmapSection title="Practice Projects" description="Apply skills through portfolio-ready work.">
                    <CollectionEditor type="projects" items={draft.practiceProjects} onChange={(value) => updateArchitectureField('practiceProjects', value)} />
                  </RoadmapSection>
                )}

                {activeTab === 'revision' && (
                  <RoadmapSection title="Revision Sessions" description="Schedule spaced repetition and knowledge review.">
                    <CollectionEditor type="revision" items={draft.revisionSessions} onChange={(value) => updateArchitectureField('revisionSessions', value)} />
                  </RoadmapSection>
                )}

                {activeTab === 'assessments' && (
                  <RoadmapSection title="Assessment Points" description="Plan quizzes, reviews and skill demonstrations.">
                    <CollectionEditor type="assessments" items={draft.assessmentPoints} onChange={(value) => updateArchitectureField('assessmentPoints', value)} />
                  </RoadmapSection>
                )}
              </main>
            </div>
          </>
        )}
      </div>

      <Dialog
        open={Boolean(adaptPreview)}
        title="Review roadmap adjustments"
        description={adaptPreview?.summary || 'Compare current and suggested roadmap changes before applying.'}
        onClose={() => setAdaptPreview(null)}
        actions={(
          <>
            <Button variant="ghost" onClick={() => setAdaptPreview(null)}>Dismiss</Button>
            <Button onClick={applyAdaptation} disabled={adaptLoading}>{adaptLoading ? 'Applying…' : 'Apply changes'}</Button>
          </>
        )}
      >
        {adaptPreview && (
          <div className="roadmap-adapt-preview">
            {adaptPreview.diff?.stagesAdded?.length > 0 && <p><strong>Stages added:</strong> {adaptPreview.diff.stagesAdded.join(', ')}</p>}
            {adaptPreview.diff?.stagesRemoved?.length > 0 && <p><strong>Stages removed:</strong> {adaptPreview.diff.stagesRemoved.join(', ')}</p>}
            {adaptPreview.diff?.orderChanged && <p><strong>Stage order changed.</strong></p>}
            {(adaptPreview.suggested?.nextSteps || []).slice(0, 6).map((step, index) => (
              <p key={`${step.title}-${index}`}>{index + 1}. {step.title}</p>
            ))}
          </div>
        )}
      </Dialog>

      <Dialog
        open={confirmGenerate}
        title="Generate with the existing AI service?"
        description="This preserves the current AI feature but can replace generated learning tasks linked to this roadmap."
        onClose={() => !generating && setConfirmGenerate(false)}
        actions={(
          <>
            <Button variant="ghost" onClick={() => setConfirmGenerate(false)} disabled={generating}>Cancel</Button>
            <Button onClick={generate} disabled={generating}>{generating ? 'Generating…' : 'Generate roadmap'}</Button>
          </>
        )}
      >
        <p>Manual stages, plans, resources and assessment architecture are stored separately and will be preserved.</p>
      </Dialog>
    </StudentLayout>
  )
}
