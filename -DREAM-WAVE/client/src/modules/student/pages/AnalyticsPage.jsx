import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import StudentLayout from '../layouts/StudentLayout'
import { goalApi, taskApi, reportApi, communityApi } from '@shared/services/api'
import { AnimatedStat, HBar } from '../components/AnimatedChart'
import NeuralBg from '@shared/components/animations/NeuralBg'

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
    const done = tasks.filter(t => t.completed).length
    const activeGoals = goals.filter(g => !g.completed).length
    const rate = tasks.length ? Math.round((done / tasks.length) * 100) : 0
    return [
      { label: 'Active goals', value: activeGoals, color: '#8B5CF6' },
      { label: 'Tasks done', value: done, color: '#10B981' },
      { label: 'Completion %', value: rate, color: '#6366F1' },
      { label: 'Reports', value: Array.isArray(reports) ? reports.length : 0, color: '#A855F7' },
      { label: 'Community posts', value: posts.length, color: '#C084FC' },
    ]
  }, [goals, tasks, reports, posts])

  const bars = [
    { label: 'Goals', value: goals.length, max: Math.max(goals.length, 5), color: '#8B5CF6' },
    { label: 'Tasks', value: tasks.length, max: Math.max(tasks.length, 5), color: '#10B981' },
    { label: 'Done', value: tasks.filter(t => t.completed).length, max: Math.max(tasks.length, 5), color: '#6366F1' },
    { label: 'Reports', value: Array.isArray(reports) ? reports.length : 0, max: Math.max(Array.isArray(reports) ? reports.length : 0, 3), color: '#A855F7' },
  ]

  return (
    <StudentLayout>
      <div style={{ position: 'relative', borderRadius: 20, overflow: 'hidden', marginBottom: 22, minHeight: 160, border: '1px solid rgba(139,92,246,0.25)' }}>
        <NeuralBg nodeCount={20} color="#8B5CF6" opacity={0.25} />
        <div style={{ position: 'relative', zIndex: 1, padding: 24, background: 'linear-gradient(90deg, rgba(5,5,10,0.85), transparent)' }}>
          <h1 style={{ margin: 0 }}>Analytics</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Learning, tasks, reports, and community — one command view.</p>
        </div>
      </div>

      {loading ? (
        <div className="spinner spinner-lg" />
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(140px,1fr))', gap: 12, marginBottom: 20 }}>
            {metrics.map((m, i) => (
              <motion.div key={m.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="card" style={{ padding: 16, textAlign: 'center' }}>
                <AnimatedStat value={m.value} label={m.label} color={m.color} />
              </motion.div>
            ))}
          </div>

          <div className="card" style={{ padding: 18, marginBottom: 16 }}>
            <h3 style={{ marginTop: 0 }}>Activity mix</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {bars.map(b => (
                <HBar key={b.label} label={b.label} value={b.value} max={b.max} color={b.color} />
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Link to="/student/reports" className="btn btn-secondary">Open R&D Reports</Link>
            <Link to="/student/dashboard" className="btn btn-primary">Back to Dashboard</Link>
          </div>
        </>
      )}
    </StudentLayout>
  )
}
