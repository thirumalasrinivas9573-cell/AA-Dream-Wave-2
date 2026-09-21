import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { goalApi, roadmapApi } from '@shared/services/api'
import goalIntelligenceService from '@shared/services/goalIntelligenceService'
import { Button, Dialog, EmptyState, ErrorState, LoadingState } from '@shared/components/ui'
import StudentLayout from '../layouts/StudentLayout'
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
          return items[0]?._id || ''
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
        setError(requestError.userMessage || 'Unable to load this roadmap.')
      }
    } finally {
      if (requestId.current === currentRequest) setLoadingRoadmap(false)
    }
  }, [])

  useEffect(() => {
    loadRoadmap(selectedGoalId)
  }, [loadRoadmap, selectedGoalId])

  const chooseGoal = (goalId) => {
    setSelectedGoalId(goalId)
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
    if (!selectedGoalId) return
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
      setError(requestError.userMessage || 'Roadmap generation failed.')
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

  return (
    <StudentLayout>
      <div className="student-roadmap">
        <header className="roadmap-header">
          <div>
            <h1><span className="gradient-text">Learning Roadmap</span></h1>
            <p>Structure skill progression, plans, resources, practice and assessments.</p>
          </div>
          <div className="goals-header__actions">
            {dirty && <Button onClick={saveArchitecture} disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</Button>}
            {roadmap && <Button variant="secondary" onClick={() => setConfirmGenerate(true)} disabled={generating}>AI generation</Button>}
            {roadmap && <Button variant="secondary" onClick={loadAdaptPreview} disabled={adaptLoading}>Suggest adjustments</Button>}
          </div>
        </header>

        <section className="roadmap-selector" aria-label="Select roadmap goal">
          <label htmlFor="roadmap-goal">Goal</label>
          <select id="roadmap-goal" className="select" value={selectedGoalId} onChange={(event) => chooseGoal(event.target.value)} disabled={loadingGoals}>
            {!goals.length && <option value="">No goals available</option>}
            {goals.map((goal) => <option value={goal._id} key={goal._id}>{goal.title} · {goal.category}</option>)}
          </select>
          <Link className="btn btn-secondary" to="/student/goals">Manage goals</Link>
        </section>

        {error && <ErrorState title="Roadmap action failed" message={error} onRetry={() => loadRoadmap(selectedGoalId)} />}
        {fallback && <div className="alert alert-warning">The existing AI service used its fallback roadmap because the generation provider was unavailable.</div>}
        {transparency && (
          <div className="alert alert-info">
            <strong>{transparency.label === 'SYSTEM-GENERATED FALLBACK' ? 'SYSTEM-GENERATED FALLBACK' : 'Roadmap transparency'}</strong>
            <div style={{ marginTop: 8, display: 'grid', gap: 6 }}>
              {transparency.confirmedUserData?.length > 0 && <span>Confirmed user data: {transparency.confirmedUserData.join(', ')}</span>}
              {transparency.databaseSignals?.length > 0 && <span>Database signals: {transparency.databaseSignals.join(', ')}</span>}
              {transparency.aiInferences?.length > 0 && <span>AI/system inference: {transparency.aiInferences.join(', ')}</span>}
              {transparency.needsUserConfirmation?.length > 0 && <span>Needs confirmation: {transparency.needsUserConfirmation.join(', ')}</span>}
            </div>
          </div>
        )}
        {generating && <LoadingState label="Generating the existing AI roadmap and learning records…" rows={6} />}

        {!loadingGoals && !goals.length && (
          <section className="roadmap-empty">
            <span aria-hidden="true">🗺️</span>
            <h2>Create a goal first</h2>
            <p>Every roadmap belongs to a measurable learning goal.</p>
            <Link className="btn btn-primary" to="/student/goals">Create a goal</Link>
          </section>
        )}

        {loadingRoadmap && <LoadingState label="Loading roadmap workspace…" rows={6} />}

        {!loadingRoadmap && selectedGoal && notFound && (
          <section className="roadmap-empty">
            <span aria-hidden="true">🧭</span>
            <h2>Start this learning roadmap</h2>
            <p>Create a manual roadmap workspace for stages, weekly plans, resources, projects, revision sessions and assessments. AI is optional.</p>
            <Button onClick={initialize} disabled={saving}>{saving ? 'Starting…' : 'Initialize roadmap'}</Button>
          </section>
        )}

        {!loadingRoadmap && draft && (
          <>
            <section className="roadmap-summary" aria-label="Roadmap summary">
              <article><strong>{progress}%</strong><small>Completion</small></article>
              <article><strong>{draft.learningStages.length}</strong><small>Learning stages</small></article>
              <article><strong>{draft.weeklyPlans.length}</strong><small>Weekly plans</small></article>
              <article><strong>{draft.architecture?.estimatedCompletion ? new Date(draft.architecture.estimatedCompletion).toLocaleDateString() : selectedGoal.deadline ? new Date(selectedGoal.deadline).toLocaleDateString() : 'Flexible'}</strong><small>Estimated completion</small></article>
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
        onClose={() => setConfirmGenerate(false)}
        actions={(
          <>
            <Button variant="ghost" onClick={() => setConfirmGenerate(false)}>Cancel</Button>
            <Button onClick={generate}>Generate roadmap</Button>
          </>
        )}
      >
        <p>Manual stages, plans, resources and assessment architecture are stored separately and will be preserved.</p>
      </Dialog>
    </StudentLayout>
  )
}
