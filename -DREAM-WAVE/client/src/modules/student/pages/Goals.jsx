import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '@shared/context/AuthContext'
import { goalApi } from '@shared/services/api'
import { Button, Dialog, EmptyState, ErrorState, LoadingState } from '@shared/components/ui'
import StudentLayout from '../layouts/StudentLayout'
import {
  GoalAnalytics,
  GoalCard,
  GoalDetailDialog,
  GoalFilters,
  GoalStats,
  GoalWizard,
  SmartGoalBuilder,
} from '../components/goals/GoalWorkspace'
import '../styles/goals-roadmap.css'

const EMPTY_ANALYTICS = {
  total: 0,
  active: 0,
  completed: 0,
  overdue: 0,
  paused: 0,
  archived: 0,
  completionPercentage: 0,
  weeklyProgress: 0,
  monthlyProgress: 0,
  studyHours: 0,
  weekly: [],
}

function effectiveStatus(goal) {
  return goal.completed ? 'completed' : goal.status || 'active'
}

export default function Goals() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [goals, setGoals] = useState([])
  const [analytics, setAnalytics] = useState(EMPTY_ANALYTICS)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [wizard, setWizard] = useState(null)
  const [aiBuilder, setAiBuilder] = useState(false)
  const [detailGoal, setDetailGoal] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [deleteGoal, setDeleteGoal] = useState(null)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')
  const [category, setCategory] = useState('all')
  const [priority, setPriority] = useState('all')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    const [goalsResult, analyticsResult] = await Promise.allSettled([goalApi.getAll(), goalApi.analytics()])
    if (goalsResult.status === 'fulfilled') setGoals(goalsResult.value.data.goals || [])
    else setError(goalsResult.reason.userMessage || 'Unable to load your goals.')
    if (analyticsResult.status === 'fulfilled') setAnalytics(analyticsResult.value.data.analytics || EMPTY_ANALYTICS)
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const openDetail = useCallback(async (goal) => {
    setDetailGoal(goal)
    setDetailLoading(true)
    setSearchParams((current) => {
      const next = new URLSearchParams(current)
      next.set('goalId', goal._id)
      return next
    }, { replace: true })
    try {
      const { data } = await goalApi.get(goal._id)
      setDetailGoal(data.goal)
    } catch (requestError) {
      setError(requestError.userMessage || 'Unable to load goal details.')
    } finally {
      setDetailLoading(false)
    }
  }, [setSearchParams])

  useEffect(() => {
    const goalId = searchParams.get('goalId')
    if (!loading && goalId && !detailGoal) {
      const target = goals.find((goal) => goal._id === goalId)
      if (target) openDetail(target)
    }
  }, [detailGoal, goals, loading, openDetail, searchParams])

  const closeDetail = () => {
    setDetailGoal(null)
    setSearchParams((current) => {
      const next = new URLSearchParams(current)
      next.delete('goalId')
      return next
    }, { replace: true })
  }

  const refreshGoal = async (goalId) => {
    const { data } = await goalApi.get(goalId)
    setDetailGoal(data.goal)
    setGoals((current) => current.map((goal) => goal._id === goalId ? data.goal : goal))
    goalApi.analytics().then((response) => setAnalytics(response.data.analytics || EMPTY_ANALYTICS)).catch(() => {})
    return data.goal
  }

  const runDetailAction = async (action) => {
    setError('')
    try {
      await action()
      await refreshGoal(detailGoal._id)
    } catch (requestError) {
      setError(requestError.userMessage || requestError.response?.data?.message || 'Unable to update this goal.')
    }
  }

  const saveGoal = async (payload) => {
    if (wizard?.goal) await goalApi.update(wizard.goal._id, payload)
    else await goalApi.create(payload)
    await load()
  }

  const updateStatus = async (goal, nextStatus) => {
    setError('')
    try {
      const { data } = await goalApi.update(goal._id, { status: nextStatus, completed: nextStatus === 'completed' })
      setGoals((current) => current.map((item) => item._id === goal._id ? data.goal : item))
      goalApi.analytics().then((response) => setAnalytics(response.data.analytics || EMPTY_ANALYTICS)).catch(() => {})
    } catch (requestError) {
      setError(requestError.userMessage || 'Unable to change goal status.')
    }
  }

  const confirmDelete = async () => {
    if (!deleteGoal) return
    setError('')
    try {
      await goalApi.delete(deleteGoal._id)
      setGoals((current) => current.filter((goal) => goal._id !== deleteGoal._id))
      if (detailGoal?._id === deleteGoal._id) closeDetail()
      setDeleteGoal(null)
      goalApi.analytics().then((response) => setAnalytics(response.data.analytics || EMPTY_ANALYTICS)).catch(() => {})
    } catch (requestError) {
      setError(requestError.userMessage || 'Unable to delete this goal.')
      setDeleteGoal(null)
    }
  }

  const counts = useMemo(() => ({
    all: goals.length,
    active: goals.filter((goal) => effectiveStatus(goal) === 'active').length,
    completed: goals.filter((goal) => effectiveStatus(goal) === 'completed').length,
    paused: goals.filter((goal) => effectiveStatus(goal) === 'paused').length,
    archived: goals.filter((goal) => effectiveStatus(goal) === 'archived').length,
  }), [goals])

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    return goals.filter((goal) => {
      const matchesQuery = !term || goal.title.toLowerCase().includes(term) || goal.category.toLowerCase().includes(term) || goal.description?.toLowerCase().includes(term)
      const matchesStatus = status === 'all' || effectiveStatus(goal) === status
      const normalizedCategory = goal.category === 'Education' ? 'Academic' : goal.category
      const matchesCategory = category === 'all' || normalizedCategory === category
      const matchesPriority = priority === 'all' || (goal.priority || 'Medium') === priority
      return matchesQuery && matchesStatus && matchesCategory && matchesPriority
    })
  }, [category, goals, priority, query, status])

  return (
    <StudentLayout>
      <div className="student-goals">
        <header className="goals-header">
          <div>
            <h1><span className="gradient-text">Goals</span> & Progress</h1>
            <p>Convert ambitions into structured, measurable learning journeys.</p>
        </div>
          <div className="goals-header__actions">
            <Button variant="secondary" onClick={() => document.getElementById('goal-analytics')?.scrollIntoView({ behavior: 'smooth' })}>View analytics</Button>
            <Button variant="secondary" onClick={() => setAiBuilder(true)}>AI Goal Builder</Button>
            <Button onClick={() => setWizard({ goal: null })}>+ Create goal</Button>
          </div>
        </header>

        {error && <ErrorState title="Goals are temporarily unavailable" message={error} onRetry={load} />}
        <GoalStats analytics={analytics} streak={user?.streak || 0} loading={loading} />

        <div id="goal-analytics">
          <GoalAnalytics analytics={analytics} />
      </div>

        <GoalFilters
          query={query}
          onQuery={setQuery}
          status={status}
          onStatus={setStatus}
          category={category}
          onCategory={setCategory}
          priority={priority}
          onPriority={setPriority}
          counts={counts}
        />

        {loading ? <LoadingState label="Loading learning goals…" rows={5} /> : filtered.length ? (
          <section className="goal-grid" aria-label="Goals">
            {filtered.map((goal) => (
              <GoalCard
                goal={goal}
                key={goal._id}
                onOpen={() => openDetail(goal)}
                onEdit={() => setWizard({ goal })}
                onStatus={(nextStatus) => updateStatus(goal, nextStatus)}
                onDelete={() => setDeleteGoal(goal)}
              />
            ))}
          </section>
        ) : (
          <section className="goal-empty">
            <span aria-hidden="true">🎯</span>
            <h2>{goals.length ? 'No goals match these filters' : 'Create your first learning goal'}</h2>
            <p>{goals.length ? 'Adjust your search or filters to find another goal.' : 'Define an ambition, set a target, and build a trackable learning journey.'}</p>
            {goals.length ? <Button variant="secondary" onClick={() => { setQuery(''); setStatus('all'); setCategory('all'); setPriority('all') }}>Clear filters</Button> : <Button onClick={() => setWizard({ goal: null })}>Create goal</Button>}
          </section>
        )}
      </div>

      {wizard && (
        <GoalWizard
          key={wizard.goal?._id || 'new-goal'}
          open
          goal={wizard.goal}
          onClose={() => setWizard(null)}
          onSave={saveGoal}
        />
      )}

      <GoalDetailDialog
        key={detailGoal?._id || 'goal-detail'}
        goal={detailGoal}
        open={Boolean(detailGoal)}
        loading={detailLoading}
        onClose={closeDetail}
        onAddMilestone={(payload) => runDetailAction(() => goalApi.addMilestone(detailGoal._id, payload))}
        onUpdateMilestone={(milestoneId, payload) => runDetailAction(() => goalApi.updateMilestone(detailGoal._id, milestoneId, payload))}
        onDeleteMilestone={(milestoneId) => runDetailAction(() => goalApi.deleteMilestone(detailGoal._id, milestoneId))}
        onAddProgress={(payload) => runDetailAction(() => goalApi.addProgress(detailGoal._id, payload))}
        onUpdateResources={(resources) => runDetailAction(() => goalApi.update(detailGoal._id, { resources }))}
        onAddNote={(text) => runDetailAction(() => goalApi.addNote(detailGoal._id, { text }))}
        onRefresh={() => refreshGoal(detailGoal._id)}
      />

      <SmartGoalBuilder
        open={aiBuilder}
        onClose={() => setAiBuilder(false)}
        onSaved={async (goal) => {
          await load()
          if (goal?._id) openDetail(goal)
        }}
      />

      <Dialog
        open={Boolean(deleteGoal)}
        title="Delete this goal?"
        description="This permanently deletes the goal, its roadmap and generated learning records."
        onClose={() => setDeleteGoal(null)}
        actions={(
          <>
            <Button variant="ghost" onClick={() => setDeleteGoal(null)}>Cancel</Button>
            <Button variant="danger" onClick={confirmDelete}>Delete goal</Button>
          </>
        )}
      >
        {deleteGoal ? <p>“{deleteGoal.title}” cannot be recovered after deletion.</p> : <EmptyState title="No goal selected" />}
      </Dialog>
    </StudentLayout>
  )
}
