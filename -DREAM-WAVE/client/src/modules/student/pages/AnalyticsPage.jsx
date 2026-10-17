import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import StudentLayout from '../layouts/StudentLayout'
import { goalApi, taskApi, reportApi, communityApi } from '@shared/services/api'
import { AnimatedStat, HBar } from '../components/AnimatedChart'

export default function AnalyticsPage() {
  const [goals, setGoals] = useState([])
  const [tasks, setTasks] = useState([])
  const [reports, setReports] = useState([])
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      goalApi.getAll().catch(() => ({ data: { goals: [] } })),
      taskApi.getAll().catch(() => ({ data: { tasks: [] } })),
      reportApi.getAll().catch(() => ({ data: { reports: [] } })),
      communityApi.getPosts().catch(() => ({ data: { posts: [] } })),
    ])
      .then(([g, t, r, c]) => {
        setGoals(g.data.goals || [])
        setTasks(t.data.tasks || [])
        setReports(r.data.reports || r.data || [])
        setPosts(c.data.posts || [])
      })
      .finally(() => setLoading(false))
  }, [])

  const metrics = useMemo(() => {
    const done = tasks.filter((t) => t.completed).length
    const activeGoals = goals.filter((g) => !g.completed).length
    const rate = tasks.length ? Math.round((done / tasks.length) * 100) : 0
    return [
      { label: 'Active goals', value: activeGoals, icon: 'flag', subtitle: `${goals.length} total` },
      { label: 'Tasks done', value: done, icon: 'task_alt', subtitle: `${done} of ${tasks.length} logged` },
      { label: 'Completion %', value: `${rate}%`, icon: 'donut_large', subtitle: 'Target: 80%+' },
      { label: 'R&D Reports', value: Array.isArray(reports) ? reports.length : 0, icon: 'analytics', subtitle: 'Published' },
      { label: 'Community posts', value: posts.length, icon: 'groups', subtitle: 'Discussions' },
    ]
  }, [goals, tasks, reports, posts])

  const bars = [
    { label: 'Goals Created', value: goals.length, max: Math.max(goals.length, 5), color: 'var(--primary)' },
    { label: 'Total Tasks', value: tasks.length, max: Math.max(tasks.length, 5), color: 'var(--secondary)' },
    { label: 'Tasks Completed', value: tasks.filter((t) => t.completed).length, max: Math.max(tasks.length, 5), color: 'var(--primary-hover)' },
    { label: 'R&D Reports', value: Array.isArray(reports) ? reports.length : 0, max: Math.max(Array.isArray(reports) ? reports.length : 0, 3), color: 'var(--primary)' },
  ]

  return (
    <StudentLayout>
      <div className="flex flex-col gap-6 w-full">
        {/* Page Header */}
        <header className="flex flex-wrap items-center justify-between gap-4 w-full">
          <div className="flex flex-col gap-1 min-w-0">
            <span className="text-xs font-bold tracking-widest text-brand-primary uppercase">
              INSIGHTS & TELEMETRY
            </span>
            <h1 className="text-3xl font-heading font-bold tracking-tight text-content-heading">
              Analytics
            </h1>
            <p className="text-sm text-content-muted">
              Learning, tasks, reports, and community — one unified command view.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/student/reports"
              className="h-10 px-4 rounded-xl flex items-center gap-2 text-xs font-semibold text-content-heading bg-surface border border-divider hover:border-brand-primary transition-all shadow-xs"
            >
              <span className="material-symbols-outlined text-[18px] text-brand-primary">description</span>
              <span>Open R&D Reports</span>
            </Link>
            <Link
              to="/student/dashboard"
              className="h-10 px-5 rounded-xl flex items-center gap-2 text-xs font-semibold text-white bg-brand-primary hover:bg-brand-hover transition-all shadow-md shadow-brand-primary/25"
            >
              <span className="material-symbols-outlined text-[18px]">arrow_back</span>
              <span>Back to Dashboard</span>
            </Link>
          </div>
        </header>

        {loading ? (
          <div className="flex items-center justify-center min-h-[300px]">
            <div className="spinner spinner-lg" />
          </div>
        ) : (
          <>
            {/* 5 Stat Bento Cards */}
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 w-full">
              {metrics.map((m, i) => (
                <motion.div
                  key={m.label}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="p-5 rounded-stitch bg-surface border border-divider shadow-xs hover:border-brand-primary transition-all flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-content-muted">{m.label}</span>
                    <span className="w-8 h-8 rounded-full flex items-center justify-center bg-brand-primary/10 text-brand-primary">
                      <span className="material-symbols-outlined text-[18px]">{m.icon}</span>
                    </span>
                  </div>
                  <div className="mt-4 flex items-baseline justify-between">
                    <span className="text-3xl font-heading font-bold text-content-heading">{m.value}</span>
                    <span className="text-[11px] font-semibold text-content-muted">{m.subtitle}</span>
                  </div>
                </motion.div>
              ))}
            </section>

            {/* Activity Mix Chart Section */}
            <section className="p-6 rounded-stitch bg-surface border border-divider shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-heading font-bold text-lg text-content-heading">Activity Mix & Metrics</h3>
                  <p className="text-xs text-content-muted">Distribution of progress across goals, tasks, and research reports</p>
                </div>
                <span className="px-3 py-1 rounded-full bg-brand-primary/10 text-brand-primary text-xs font-bold">Live Data</span>
              </div>
              <div className="space-y-3 pt-2">
                {bars.map((b) => (
                  <HBar key={b.label} label={b.label} value={b.value} max={b.max} color={b.color} />
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </StudentLayout>
  )
}
