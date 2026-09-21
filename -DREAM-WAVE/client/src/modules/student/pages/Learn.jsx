import { useState, useEffect, lazy, Suspense } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import StudentLayout from '../layouts/StudentLayout'
import { lessonApi } from '@shared/services/api'
import MessageRenderer from '../components/MessageRenderer'
import AIOrb from '@shared/components/animations/AIOrb'
import NeuralBg from '@shared/components/animations/NeuralBg'
import { ProcessVisual } from '../components/VisualLearning'

const CinematicPlayer = lazy(() => import('../components/CinematicPlayer'))
const LessonVideoEngine = lazy(() => import('../components/LessonVideoEngine'))

const SCENE_ICONS = { introduction: '🎬', concept: '💡', example: '⚙️', demo: '🖥️', summary: '✅' }
const DIFF_COLORS = { Beginner: '#10B981', Intermediate: '#F59E0B', Advanced: '#EF4444', Expert: '#A855F7' }

// ── Mind Map SVG renderer ─────────────────────────────────────────────────────
function MindMap({ data }) {
  if (!data) return null
  const { center, branches = [] } = data
  const cx = 300, cy = 200, r1 = 90, r2 = 170

  const branchAngles = branches.map((_, i) => (i / branches.length) * Math.PI * 2 - Math.PI / 2)
  const branchColors = ['#8B5CF6','#6366F1','#10B981','#F59E0B','#EC4899','#06B6D4']

  return (
    <div style={{ width: '100%', overflowX: 'auto' }}>
      <svg viewBox="0 0 600 400" style={{ width: '100%', maxWidth: 600, display: 'block', margin: '0 auto' }}>
        {/* Center node */}
        <motion.circle cx={cx} cy={cy} r={48} fill="rgba(139,92,246,0.2)" stroke="#8B5CF6" strokeWidth={2}
          initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.1, type: 'spring' }} />
        <motion.circle cx={cx} cy={cy} r={52} fill="none" stroke="#8B5CF680" strokeWidth={1}
          animate={{ r: [52, 58, 52] }} transition={{ duration: 3, repeat: Infinity }} />
        <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" fill="#F8FAFC" fontSize="11" fontWeight="700">
          {center && center.length > 12 ? center.slice(0, 12) + '...' : center}
        </text>

        {branches.map((branch, i) => {
          const angle = branchAngles[i]
          const bx = cx + Math.cos(angle) * r1
          const by = cy + Math.sin(angle) * r1
          const color = branchColors[i % branchColors.length]

          return (
            <g key={i}>
              {/* Line to branch */}
              <motion.line x1={cx} y1={cy} x2={bx} y2={by} stroke={color + '80'} strokeWidth={2}
                initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.2 + i * 0.1, duration: 0.5 }} />

              {/* Branch node */}
              <motion.circle cx={bx} cy={by} r={28} fill={color + '22'} stroke={color} strokeWidth={1.5}
                initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.3 + i * 0.1, type: 'spring' }} />
              <text x={bx} y={by} textAnchor="middle" dominantBaseline="middle" fill={color} fontSize="9" fontWeight="700">
                {branch.label && branch.label.length > 10 ? branch.label.slice(0, 10) : branch.label}
              </text>

              {/* Children */}
              {(branch.children || []).slice(0, 3).map((child, j) => {
                const childAngle = angle + (j - 1) * 0.55
                const childR = r2
                const chx = cx + Math.cos(childAngle) * childR
                const chy = cy + Math.sin(childAngle) * childR
                return (
                  <g key={j}>
                    <motion.line x1={bx} y1={by} x2={chx} y2={chy} stroke={color + '50'} strokeWidth={1}
                      initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.5 + i * 0.1 + j * 0.06 }} />
                    <motion.circle cx={chx} cy={chy} r={18} fill={color + '15'} stroke={color + '50'} strokeWidth={1}
                      initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.6 + i * 0.1 + j * 0.06, type: 'spring' }} />
                    <text x={chx} y={chy} textAnchor="middle" dominantBaseline="middle" fill="#94A3B8" fontSize="8">
                      {child && child.length > 8 ? child.slice(0, 8) : child}
                    </text>
                  </g>
                )
              })}
            </g>
          )
        })}
      </svg>
    </div>
  )
}

// ── Quiz component ────────────────────────────────────────────────────────────
function QuizEngine({ questions, onComplete }) {
  const [current, setCurrent] = useState(0)
  const [answers, setAnswers]  = useState({})
  const [revealed, setRevealed]= useState({})
  const [score, setScore]      = useState(null)

  const q = questions[current]
  const isAnswered = revealed[current]
  const isCorrect  = isAnswered && (
    q.type === 'true_false'
      ? answers[current] === (q.correct ? 0 : 1)
      : answers[current] === q.correct
  )

  const opts = q.type === 'true_false' ? ['True', 'False'] : (q.options || [])

  const answer = (idx) => {
    if (isAnswered) return
    setAnswers(p => ({ ...p, [current]: idx }))
    setRevealed(p => ({ ...p, [current]: true }))
  }

  const next = () => {
    if (current < questions.length - 1) { setCurrent(c => c + 1) }
    else {
      const correct = questions.filter((q, i) => {
        const ans = answers[i]
        return q.type === 'true_false' ? ans === (q.correct ? 0 : 1) : ans === q.correct
      }).length
      setScore(Math.round(correct / questions.length * 100))
      onComplete && onComplete(Math.round(correct / questions.length * 100))
    }
  }

  if (score !== null) {
    return (
      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={{ textAlign: 'center', padding: '40px 20px' }}>
        <div style={{ fontSize: '3.5rem', marginBottom: 16 }}>{score >= 80 ? '🏆' : score >= 60 ? '👍' : '📚'}</div>
        <h2 className="gradient-text" style={{ fontSize: '2rem', marginBottom: 8 }}>{score}%</h2>
        <p style={{ marginBottom: 20 }}>
          {score >= 80 ? 'Excellent! You have mastered this lesson.' : score >= 60 ? 'Good work! Review the explanations to reinforce.' : 'Keep practicing — review this lesson again.'}
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button className="btn btn-secondary" onClick={() => { setCurrent(0); setAnswers({}); setRevealed({}); setScore(null) }}>Retry Quiz</button>
          <button className="btn btn-primary" onClick={() => onComplete && onComplete(score)}>Continue Learning</button>
        </div>
      </motion.div>
    )
  }

  return (
    <div style={{ maxWidth: 600, margin: '0 auto' }}>
      {/* Progress */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Question {current + 1} of {questions.length}</span>
        <span className={`badge ${q.type === 'scenario' ? 'badge-purple' : q.type === 'true_false' ? 'badge-blue' : 'badge-yellow'}`} style={{ fontSize: '0.7rem' }}>{q.type.replace('_', ' ')}</span>
      </div>
      <div className="progress-bar" style={{ marginBottom: 20 }}>
        <div className="progress-fill" style={{ width: `${(current / questions.length) * 100}%` }} />
      </div>

      {/* Question */}
      <motion.div key={current} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.25 }}>
        <p style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.65, marginBottom: 20 }}>{q.question}</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
          {opts.map((opt, i) => {
            const isSelected = answers[current] === i
            const isRight    = i === q.correct
            let bg = 'rgba(255,255,255,0.04)'
            let border = 'var(--border)'
            if (isAnswered) {
              if (isRight) { bg = 'rgba(16,185,129,0.12)'; border = '#10B981' }
              else if (isSelected) { bg = 'rgba(239,68,68,0.12)'; border = '#EF4444' }
            } else if (isSelected) { bg = 'rgba(139,92,246,0.12)'; border = 'var(--purple)' }

            return (
              <motion.button key={i} whileHover={!isAnswered ? { x: 4 } : {}} onClick={() => answer(i)}
                style={{ width: '100%', padding: '12px 16px', background: bg, border: `1px solid ${border}`, borderRadius: 10, cursor: isAnswered ? 'default' : 'pointer', textAlign: 'left', color: 'var(--text-primary)', fontFamily: 'inherit', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: 10, transition: 'all 0.2s' }}>
                <span style={{ width: 28, height: 28, borderRadius: 8, background: isAnswered && isRight ? '#10B98120' : 'rgba(255,255,255,0.06)', border: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700, flexShrink: 0 }}>
                  {isAnswered ? (isRight ? '✓' : isSelected ? '✗' : String.fromCharCode(65 + i)) : String.fromCharCode(65 + i)}
                </span>
                {opt}
              </motion.button>
            )
          })}
        </div>

        {/* Explanation */}
        <AnimatePresence>
          {isAnswered && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} style={{ overflow: 'hidden' }}>
              <div className={`alert ${isCorrect ? 'alert-success' : 'alert-error'}`} style={{ marginBottom: 16 }}>
                <strong>{isCorrect ? '✓ Correct!' : '✗ Not quite.'}</strong>
              </div>
              <div className="card card-sm" style={{ background: 'rgba(139,92,246,0.06)', border: '1px solid var(--border-purple)', marginBottom: 16 }}>
                <p style={{ fontSize: '0.875rem', lineHeight: 1.7, color: 'var(--text-primary)' }}><strong style={{ color: 'var(--purple-light)' }}>Explanation:</strong> {q.explanation}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {isAnswered && (
          <button className="btn btn-primary" onClick={next} style={{ width: '100%' }}>
            {current < questions.length - 1 ? 'Next Question →' : 'See Results'}
          </button>
        )}
      </motion.div>
    </div>
  )
}

// ── Scene Player — cinematic lesson scene ─────────────────────────────────────
function ScenePlayer({ scene, index, isActive, onSelect }) {
  const meta = SCENE_ICONS[scene.type] || '📚'
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0, transition: { delay: index * 0.07 } }}
      onClick={() => onSelect(index)}
      style={{ cursor: 'pointer', marginBottom: 10 }}
    >
      <div className={`card card-sm ${isActive ? '' : 'card-lift'}`} style={{
        border: isActive ? '1px solid var(--purple)' : '1px solid var(--border)',
        background: isActive ? 'rgba(139,92,246,0.1)' : 'var(--bg-card)',
        boxShadow: isActive ? '0 0 20px rgba(139,92,246,0.15)' : 'none',
        transition: 'all 0.2s',
      }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: isActive ? 'rgba(139,92,246,0.25)' : 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', flexShrink: 0 }}>
            {isActive ? <motion.span animate={{ rotate: [0, 10, -10, 0] }} transition={{ duration: 1, repeat: Infinity, repeatDelay: 2 }}>{meta}</motion.span> : meta}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: '0.845rem', color: isActive ? 'var(--purple-light)' : 'var(--text-primary)', marginBottom: 2 }}>
              {index + 1}. {scene.title}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', gap: 8 }}>
              <span>⏱ {scene.duration}</span>
              <span className={`badge ${scene.type === 'introduction' ? 'badge-blue' : scene.type === 'example' ? 'badge-green' : 'badge-purple'}`} style={{ fontSize: '0.62rem' }}>{scene.type}</span>
            </div>
          </div>
          {isActive && <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--purple)', flexShrink: 0, marginTop: 4 }} className="animate-pulse" />}
        </div>
      </div>
    </motion.div>
  )
}

// ── Video Progress Bar — simulates cinematic scene playback ──────────────────
function VideoProgressBar({ scene, lessonColor = '#8B5CF6', onComplete }) {
  const [progress, setProgress] = useState(0)
  const [playing, setPlaying]   = useState(true)
  const [elapsed, setElapsed]   = useState(0)

  // Parse duration string to seconds (e.g. "3 min" → 180, "45s" → 45)
  const totalSec = (() => {
    if (!scene?.duration) return 120
    const m = scene.duration.match(/(\d+)\s*min/)
    const s = scene.duration.match(/(\d+)\s*s/)
    return (m ? parseInt(m[1]) * 60 : 0) + (s ? parseInt(s[1]) : 0) || 120
  })()

  useEffect(() => {
    setProgress(0); setElapsed(0); setPlaying(true)
  }, [scene?.id])

  useEffect(() => {
    if (!playing) return
    const interval = setInterval(() => {
      setElapsed(e => {
        const next = e + 0.5
        setProgress(Math.min((next / totalSec) * 100, 100))
        if (next >= totalSec) {
          clearInterval(interval)
          setPlaying(false)
          onComplete?.()
        }
        return next
      })
    }, 500)
    return () => clearInterval(interval)
  }, [playing, totalSec, onComplete])

  const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            onClick={() => setPlaying(v => !v)}
            style={{
              width: 28, height: 28, borderRadius: '50%',
              background: `${lessonColor}22`, border: `1px solid ${lessonColor}44`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', fontSize: '0.7rem', color: lessonColor,
            }}
          >
            {playing ? '⏸' : '▶'}
          </button>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
            {fmt(elapsed)} / {fmt(totalSec)}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            onClick={() => { setProgress(0); setElapsed(0); setPlaying(true) }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.72rem', padding: '2px 6px', borderRadius: 4, transition: 'var(--t)', fontFamily: 'inherit' }}
            onMouseEnter={e => e.currentTarget.style.color='var(--text-primary)'}
            onMouseLeave={e => e.currentTarget.style.color='var(--text-muted)'}
          >
            ↺ Replay
          </button>
          {progress >= 100 && (
            <span className="badge badge-green" style={{ fontSize: '0.65rem' }}>✓ Scene Done</span>
          )}
        </div>
      </div>
      {/* Progress track */}
      <div style={{ height: 4, background: 'rgba(255,255,255,0.07)', borderRadius: 999, overflow: 'hidden', cursor: 'pointer' }}
        onClick={e => {
          const rect = e.currentTarget.getBoundingClientRect()
          const pct = (e.clientX - rect.left) / rect.width
          const newElapsed = pct * totalSec
          setElapsed(newElapsed)
          setProgress(pct * 100)
        }}
      >
        <motion.div
          style={{ height: '100%', borderRadius: 999, background: `linear-gradient(90deg, ${lessonColor}, ${lessonColor}cc)`, boxShadow: `0 0 8px ${lessonColor}66` }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: 'linear' }}
        />
      </div>
    </div>
  )
}

// ── Active Scene Display ───────────────────────────────────────────────────────
function ActiveScene({ scene, lessonColor = '#8B5CF6', onSceneComplete }) {
  return (
    <motion.div key={scene.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      {/* Scene header */}
      <div style={{ background: `linear-gradient(135deg, ${lessonColor}18, rgba(13,13,23,0.9))`, border: `1px solid ${lessonColor}30`, borderRadius: 'var(--r-lg)', padding: '20px 24px', marginBottom: 16, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, opacity: 0.4 }}><NeuralBg nodeCount={20} color={lessonColor} opacity={0.3} /></div>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10, marginBottom: 10 }}>
            <div>
              <span style={{ fontSize: '1.5rem', marginRight: 10 }}>{SCENE_ICONS[scene.type] || '📚'}</span>
              <span style={{ fontWeight: 800, fontSize: '1.125rem', color: 'var(--text-primary)' }}>{scene.title}</span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <span className="badge badge-purple">⏱ {scene.duration}</span>
              <span className="badge badge-blue" style={{ textTransform: 'capitalize' }}>{scene.type}</span>
            </div>
          </div>
          {scene.keyPoints?.length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {scene.keyPoints.map((kp, i) => <span key={i} className="tag" style={{ fontSize: '0.72rem' }}>✦ {kp}</span>)}
            </div>
          )}
          {/* Video progress bar */}
          <div style={{ marginTop: 14 }}>
            <VideoProgressBar scene={scene} lessonColor={lessonColor} onComplete={onSceneComplete} />
          </div>
        </div>
      </div>

      {/* Visual description */}
      <div className="card" style={{ marginBottom: 14, background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.2)' }}>
        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#818CF8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>🎬 Visual Scene</div>
        <p style={{ fontSize: '0.875rem', lineHeight: 1.7, color: 'var(--text-primary)', fontStyle: 'italic' }}>{scene.visual}</p>
        {scene.animation && (
          <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 4 }}>ANIMATION</div>
            <p style={{ fontSize: '0.82rem', color: '#94A3B8', lineHeight: 1.6 }}>{scene.animation}</p>
          </div>
        )}
      </div>

      {/* Narration */}
      <div className="card" style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
          <AIOrb state="responding" size={36} color={lessonColor} />
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--purple-light)', marginBottom: 2 }}>AI Teacher Narration</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{(scene.narration?.split(' ').length || 0)} words</div>
          </div>
        </div>
        <div style={{ fontSize: '0.9rem', lineHeight: 1.85, color: 'var(--text-primary)', borderLeft: `3px solid ${lessonColor}`, paddingLeft: 16 }}>
          <MessageRenderer content={scene.narration} />
        </div>
      </div>

      {/* Key points process visual — show for concept/example scenes with 3+ key points */}
      {(scene.type === 'concept' || scene.type === 'example' || scene.type === 'demo') && scene.keyPoints?.length >= 3 && (
        <div className="card" style={{ marginBottom: 14, background: `${lessonColor}06`, border: `1px solid ${lessonColor}20` }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: lessonColor, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>🔀 Concept Flow</div>
          <ProcessVisual
            color={lessonColor}
            horizontal
            steps={scene.keyPoints.map((kp, i) => ({
              label: kp,
              icon: ['💡', '⚙️', '🔗', '✅', '🚀'][i] || '📌',
            }))}
          />
        </div>
      )}

      {/* Code example */}
      {scene.codeExample && scene.codeExample !== 'null' && (        <div className="card" style={{ marginBottom: 14, background: '#0D0D17', border: '1px solid rgba(139,92,246,0.25)' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--purple-light)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>💻 Code Example</div>
          <pre style={{ margin: 0, fontSize: '0.85rem', lineHeight: 1.65, color: '#E2E8F0', overflowX: 'auto', whiteSpace: 'pre-wrap' }}>
            {scene.codeExample}
          </pre>
        </div>
      )}
    </motion.div>
  )
}

// ── Main Learning Studio Page ─────────────────────────────────────────────────
export default function Learn() {
  const [topic, setTopic]         = useState('')
  const [category, setCategory]   = useState('Career')
  const [difficulty, setDiff]     = useState('Beginner')
  const [lesson, setLesson]       = useState(null)
  const [generating, setGen]      = useState(false)
  const [error, setError]         = useState('')
  const [activeScene, setScene]   = useState(0)
  const [activeTab, setTab]       = useState('lesson')
  const [quizScore, setQuizScore] = useState(null)
  const [suggestions, setSuggest] = useState([])
  const [orbState, setOrbState]   = useState('idle')
  const [videoScript, setVideoScript] = useState(null)
  const [genScript, setGenScript]     = useState(false)
  const [videoMode, setVideoMode]     = useState(false)
  const [engine, setEngine]           = useState('lesson') // 'lesson' | 'cinematic' — both engines preserved


  const handleSceneComplete = () => {
    if (!lesson) return
    const next = activeScene + 1
    if (next < (lesson.scenes || []).length) {
      setTimeout(() => setScene(next), 500)
    }
  }

  useEffect(() => {
    lessonApi.suggestions().then(r => setSuggest(r.data.suggestions || [])).catch(() => {})
  }, [])

  const generate = async (e) => {
    e?.preventDefault()
    if (!topic.trim()) return
    setGen(true); setError(''); setLesson(null); setScene(0); setTab('lesson'); setOrbState('thinking')
    try {
      const { data } = await lessonApi.generate({ topic: topic.trim(), category, difficulty })
      setLesson(data.lesson)
      setOrbState('responding')
      setTimeout(() => setOrbState('idle'), 3000)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to generate lesson.')
      setOrbState('idle')
    }
    setGen(false)
  }

  const generateScript = async () => {
    if (!topic.trim() && !lesson) return
    setGenScript(true)
    try {
      const { data } = await lessonApi.videoScript({
        topic: topic.trim() || lesson?.title || '',
        category,
        difficulty,
      })
      setVideoScript(data.script)
      setTab('videoscript')
    } catch {}
    setGenScript(false)
  }

  const TABS = [
    { id: 'lesson',      icon: '🎬', label: 'Lesson'       },
    { id: 'quiz',        icon: '❓', label: 'Quiz'         },
    { id: 'mindmap',     icon: '🧠', label: 'Mind Map'     },
    { id: 'practice',    icon: '⚒️', label: 'Practice'    },
    { id: 'videoscript', icon: '🎥', label: 'Video Script' },
    { id: 'resources',   icon: '📚', label: 'Resources'    },
  ]

  const diffColor = lesson ? (DIFF_COLORS[lesson.difficulty] || '#8B5CF6') : '#8B5CF6'

  return (
    <StudentLayout>
      {/* Page header */}
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1>🎓 <span className="gradient-text">AI Learning Studio</span></h1>
            <p>Cinematic AI-powered lessons — scenes, narration, visuals, quizzes, mind maps</p>
          </div>
          {lesson && <div style={{ display: 'flex', gap: 8 }}>
            <span className="badge badge-purple">{lesson.totalDuration}</span>
            <span className="badge" style={{ background: `${diffColor}20`, color: diffColor, border: `1px solid ${diffColor}30` }}>{lesson.difficulty}</span>
          </div>}
        </div>
      </div>

      {/* Topic input */}
      <div className="card card-purple" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
          <AIOrb state={orbState} size={48} color="#8B5CF6" />
          <div>
            <h3 style={{ marginBottom: 3 }}>What do you want to learn today?</h3>
            <p style={{ fontSize: '0.82rem' }}>Enter any topic — programming, math, science, career, history — and get a cinematic AI lesson</p>
          </div>
        </div>

        <form onSubmit={generate} style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <input className="input" value={topic} onChange={e => setTopic(e.target.value)}
            placeholder="e.g. HTML Basics, Python Loops, Photosynthesis, Machine Learning..."
            style={{ flex: '1 1 280px' }} disabled={generating} />
          <select className="select" value={category} onChange={e => setCategory(e.target.value)} style={{ flex: '0 0 140px' }}>
            {['Career','Education','Technology','Science','Math','Business','Personal'].map(c => <option key={c}>{c}</option>)}
          </select>
          <select className="select" value={difficulty} onChange={e => setDiff(e.target.value)} style={{ flex: '0 0 140px' }}>
            {['Beginner','Intermediate','Advanced','Expert'].map(d => <option key={d}>{d}</option>)}
          </select>
          <button type="submit" className="btn btn-primary" disabled={generating || !topic.trim()} style={{ flexShrink: 0 }}>
            {generating ? <><div className="spinner" style={{ borderTopColor: 'white' }} /> Generating Lesson...</> : '▶ Start Learning'}
          </button>
        </form>

        {error && <div className="alert alert-error" style={{ marginTop: 12 }}>⚠️ {error}</div>}

        {/* Suggestions */}
        {!lesson && suggestions.length > 0 && (
          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Suggested from your goals</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {suggestions.slice(0, 5).map((s, i) => (
                <button key={i} className="tag" onClick={() => { setTopic(s.topic); setCategory(s.category || 'Career') }}
                  style={{ cursor: 'pointer', background: 'rgba(139,92,246,0.08)', border: '1px solid var(--border-purple)', color: 'var(--purple-light)' }}>
                  {s.icon || '🎯'} {s.topic}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Generating state */}
      {generating && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card card-purple" style={{ textAlign: 'center', padding: '40px 20px', marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
            <AIOrb state="thinking" size={72} color="#8B5CF6" />
          </div>
          <h2 className="gradient-text" style={{ marginBottom: 8 }}>Building Your Cinematic Lesson</h2>
          <p style={{ marginBottom: 16 }}>Creating scenes, narration, visuals, quiz, and mind map for: <strong style={{ color: 'var(--purple-light)' }}>{topic}</strong></p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
            {['Writing narration...', 'Creating scenes...', 'Building quiz...', 'Mapping concepts...'].map((s, i) => (
              <motion.span key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.4 }}
                className="badge badge-purple" style={{ fontSize: '0.72rem' }}>{s}</motion.span>
            ))}
          </div>
        </motion.div>
      )}

      {/* Lesson content */}
      {lesson && !generating && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>

          {/* ── BIG VIDEO LAUNCH BANNER ───────────────────────────── */}
          {!videoMode && (
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              style={{
                marginBottom: 16,
                background: `linear-gradient(135deg, ${diffColor}20, #F3EEFA)`,
                border: `1px solid ${diffColor}55`,
                borderRadius: 'var(--r-xl)',
                padding: '18px 22px',
                display: 'flex', alignItems: 'center', gap: 18,
                flexWrap: 'wrap',
                boxShadow: `0 8px 40px rgba(140,122,230,0.12)`,
              }}
            >
              {/* Pulse orb */}
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <motion.div
                  animate={{ scale: [1, 1.25, 1], opacity: [0.6, 0, 0.6] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  style={{
                    position: 'absolute', inset: -8, borderRadius: '50%',
                    border: `2px solid ${diffColor}`, pointerEvents: 'none',
                  }}
                />
                <div style={{
                  width: 54, height: 54, borderRadius: '50%',
                  background: `linear-gradient(135deg, ${diffColor}, ${diffColor}88)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.4rem',
                  boxShadow: `0 0 24px ${diffColor}66`,
                }}>
                  🎬
                </div>
              </div>
              <div style={{ flex: 1, minWidth: 180 }}>
                <div style={{ fontWeight: 800, fontSize: '1rem', color: '#3A3153', marginBottom: 2 }}>
                  {lesson.title}
                </div>
                <div style={{ fontSize: '0.78rem', color: '#5D5477', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <span>⏱ {lesson.totalDuration}</span>
                  <span>🎬 {(lesson.scenes||[]).length} Scenes</span>
                  <span>❓ {(lesson.quiz||[]).length} Questions</span>
                  <span style={{ color: diffColor }}>● {lesson.difficulty}</span>
                </div>
              </div>
              {/* THE BIG BUTTON */}
              <motion.button
                whileHover={{ scale: 1.04, boxShadow: `0 8px 32px ${diffColor}66` }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setVideoMode(true)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '13px 28px',
                  background: `linear-gradient(135deg, ${diffColor}, ${diffColor}bb)`,
                  border: 'none', borderRadius: 14,
                  color: 'white', cursor: 'pointer',
                  fontSize: '1rem', fontWeight: 800,
                  fontFamily: 'Inter, sans-serif',
                  letterSpacing: '-0.01em',
                  boxShadow: `0 4px 20px ${diffColor}55`,
                  whiteSpace: 'nowrap', flexShrink: 0,
                }}
              >
                <span style={{ fontSize: '1.2rem' }}>▶</span>
                Watch Animated Video
              </motion.button>
              <button
                onClick={() => setVideoMode(false)}
                style={{
                  padding: '10px 18px', borderRadius: 12,
                  border: '1px solid rgba(139,132,163,0.2)',
                  background: '#FFFFFF', color: '#5D5477',
                  cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600,
                  fontFamily: 'Inter, sans-serif', flexShrink: 0,
                }}
              >
                📖 Text Mode
              </button>
            </motion.div>
          )}

          {/* Back to text mode bar when video is playing */}
          {videoMode && (
            <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <button
                onClick={() => setVideoMode(false)}
                style={{
                  padding: '7px 16px', borderRadius: 9,
                  border: '1px solid rgba(139,132,163,0.2)',
                  background: '#FFFFFF', color: '#5D5477',
                  cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600,
                  fontFamily: 'Inter, sans-serif',
                }}
              >
                ← Back to Text Mode
              </button>
              <span style={{ fontSize: '0.72rem', color: '#8B84A3' }}>
                🎬 {(lesson.scenes||[]).length} Scenes · {lesson.totalDuration}
              </span>
              <span className="badge badge-purple" style={{ fontSize: '0.65rem' }}>Canvas Animation</span>
            </div>
          )}

          {/* Key takeaways — compact row */}
          {!videoMode && (
            <div className="card" style={{ marginBottom: 16, background: `linear-gradient(135deg, ${diffColor}08, rgba(13,13,23,0.9))`, border: `1px solid ${diffColor}20`, padding: '14px 18px' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: diffColor, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
                🎯 What You'll Learn
              </div>
              <div className="grid-2">
                {(lesson.keyTakeaways || []).map((t, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    <span style={{ color: diffColor, fontWeight: 800, flexShrink: 0, fontSize: '0.8rem' }}>✓</span>
                    <span style={{ fontSize: '0.845rem', color: 'var(--text-primary)', lineHeight: 1.55 }}>{t}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Cinematic Video Player — both LessonVideoEngine and CinematicPlayer preserved */}
          {videoMode && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 20 }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ fontSize: '0.75rem', opacity: engine === 'lesson' ? 1 : 0.65 }}
                  onClick={() => setEngine('lesson')}
                >
                  Lesson Engine
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ fontSize: '0.75rem', opacity: engine === 'cinematic' ? 1 : 0.65 }}
                  onClick={() => setEngine('cinematic')}
                >
                  Cinematic Player
                </button>
              </div>
              <Suspense fallback={<div className="spinner" style={{ margin: '24px auto' }} aria-label="Loading video player" />}>
                {engine === 'cinematic' ? (
                  <CinematicPlayer
                    lesson={lesson}
                    color={diffColor}
                    onComplete={() => { setVideoMode(false); setTab('quiz') }}
                  />
                ) : (
                  <LessonVideoEngine
                    lesson={lesson}
                    color={diffColor}
                    onComplete={() => { setVideoMode(false); setTab('quiz') }}
                  />
                )}
              </Suspense>
            </motion.div>
          )}

          {/* Studio layout — shown in text mode */}
          {!videoMode && (
          <div className="learning-studio-grid">
            {/* Scene list sidebar */}
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
                {(lesson.scenes || []).length} Scenes
              </div>
              {(lesson.scenes || []).map((s, i) => (
                <ScenePlayer key={i} scene={s} index={i} isActive={activeScene === i && activeTab === 'lesson'} onSelect={() => { setScene(i); setTab('lesson') }} />
              ))}
              <div className="divider" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {TABS.filter(t => t.id !== 'lesson').map(t => (
                  <button key={t.id} onClick={() => setTab(t.id)}
                    style={{ display: 'flex', gap: 9, alignItems: 'center', padding: '9px 12px', borderRadius: 9, border: `1px solid ${activeTab === t.id ? 'var(--border-purple)' : 'var(--border)'}`, background: activeTab === t.id ? 'rgba(139,92,246,0.1)' : 'transparent', cursor: 'pointer', color: activeTab === t.id ? 'var(--purple-light)' : 'var(--text-secondary)', fontSize: '0.845rem', fontWeight: 500, fontFamily: 'inherit', transition: 'all 0.15s' }}>
                    {t.icon} {t.label}
                    {t.id === 'quiz' && quizScore !== null && <span className="badge badge-green" style={{ marginLeft: 'auto', fontSize: '0.65rem' }}>{quizScore}%</span>}
                  </button>
                ))}
              </div>
            </div>

            {/* Main content area */}
            <div>
              <AnimatePresence mode="wait">
                {activeTab === 'lesson' && <ActiveScene key="scene" scene={(lesson.scenes || [])[activeScene] || {}} lessonColor={diffColor} onSceneComplete={handleSceneComplete} />}

                {activeTab === 'quiz' && (
                  <motion.div key="quiz" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                    <div className="card" style={{ marginBottom: 16, background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)' }}>
                      <h2 style={{ marginBottom: 4 }}>❓ Lesson Quiz</h2>
                      <p style={{ fontSize: '0.84rem' }}>Test your understanding of "{lesson.title}". {(lesson.quiz || []).length} questions with detailed explanations.</p>
                    </div>
                    {lesson.quiz?.length > 0
                      ? <QuizEngine questions={lesson.quiz} onComplete={setQuizScore} />
                      : <div className="empty-state"><span className="icon">❓</span><p>No quiz available for this lesson</p></div>
                    }
                  </motion.div>
                )}

                {activeTab === 'mindmap' && (
                  <motion.div key="mindmap" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                    <div className="card" style={{ marginBottom: 16 }}>
                      <h2 style={{ marginBottom: 4 }}>🧠 Concept Mind Map</h2>
                      <p style={{ fontSize: '0.84rem' }}>Visual relationship map of all concepts in this lesson</p>
                    </div>
                    <div className="card"><MindMap data={lesson.mindMap} /></div>
                  </motion.div>
                )}

                {activeTab === 'practice' && lesson.practiceExercise && (
                  <motion.div key="practice" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                    <div className="card card-purple" style={{ marginBottom: 16 }}>
                      <h2 style={{ marginBottom: 8 }}>⚒️ {lesson.practiceExercise.title}</h2>
                      <div style={{ fontSize: '0.9rem', lineHeight: 1.8, color: 'var(--text-primary)', marginBottom: 16 }}>
                        <MessageRenderer content={lesson.practiceExercise.description} />
                      </div>
                      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Steps</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {(lesson.practiceExercise.steps || []).map((step, i) => (
                          <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0, transition: { delay: i * 0.08 } }}
                            style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                            <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg,var(--purple),var(--purple-mid))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.8rem', color: 'white', flexShrink: 0 }}>{i + 1}</div>
                            <div className="card card-sm" style={{ flex: 1, background: 'rgba(255,255,255,0.03)' }}>
                              <MessageRenderer content={step} />
                            </div>
                          </motion.div>
                        ))}
                      </div>
                      {lesson.practiceExercise.expectedOutcome && (
                        <div style={{ marginTop: 16, padding: '12px 16px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 10 }}>
                          <span style={{ fontWeight: 600, color: '#34D399' }}>Expected Outcome: </span>
                          <span style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>{lesson.practiceExercise.expectedOutcome}</span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}

                {activeTab === 'videoscript' && (
                  <motion.div key="videoscript" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                    <div className="card" style={{ marginBottom: 16, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                        <div>
                          <h2 style={{ marginBottom: 4 }}>🎥 AI Video Script</h2>
                          <p style={{ fontSize: '0.84rem' }}>Full cinematic script with narration, motion graphics, and voice direction</p>
                        </div>
                        {!videoScript && (
                          <button className="btn btn-primary btn-sm" onClick={generateScript} disabled={genScript}>
                            {genScript ? <><div className="spinner" style={{ borderTopColor: 'white', width: 13, height: 13 }} /> Generating...</> : '🎬 Generate Script'}
                          </button>
                        )}
                      </div>
                    </div>
                    {genScript && (
                      <div className="card" style={{ textAlign: 'center', padding: '32px 20px' }}>
                        <AIOrb state="thinking" size={56} color="#EF4444" />
                        <p style={{ marginTop: 16 }}>Writing your cinematic video script...</p>
                      </div>
                    )}
                    {videoScript && !genScript && (
                      <div>
                        {/* Header info */}
                        <div className="card card-sm" style={{ marginBottom: 14, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)' }}>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                            <span className="badge badge-red">⏱ {videoScript.totalDuration}</span>
                            <span className="badge badge-gray">{videoScript.format}</span>
                            {videoScript.musicMood && <span className="badge" style={{ background: 'rgba(168,85,247,0.12)', color: '#C084FC', border: '1px solid rgba(168,85,247,0.2)', fontSize: '0.68rem' }}>🎵 {videoScript.musicMood}</span>}
                          </div>
                          {videoScript.hook && (
                            <div style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.04)', borderRadius: 8, borderLeft: '3px solid #EF4444' }}>
                              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#F87171', display: 'block', marginBottom: 4 }}>HOOK LINE</span>
                              <p style={{ fontSize: '0.9rem', fontStyle: 'italic', color: 'var(--text-primary)', margin: 0 }}>"{videoScript.hook}"</p>
                            </div>
                          )}
                        </div>

                        {/* Scenes */}
                        {(videoScript.scenes || []).map((scene, i) => (
                          <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0, transition: { delay: i * 0.07 } }}>
                            <div className="card" style={{ marginBottom: 12, borderLeft: '3px solid #EF4444' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                                  <div style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(239,68,68,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.8rem', color: '#F87171' }}>
                                    {scene.sceneNumber}
                                  </div>
                                  <span style={{ fontWeight: 700, fontSize: '0.9375rem' }}>{scene.title}</span>
                                </div>
                                <span className="badge badge-red" style={{ fontSize: '0.68rem' }}>⏱ {scene.duration}</span>
                              </div>

                              {/* Narration */}
                              <div style={{ marginBottom: 12, padding: '12px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: 8 }}>
                                <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#F87171', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>📢 Narration</div>
                                <p style={{ fontSize: '0.875rem', lineHeight: 1.8, color: 'var(--text-primary)', fontStyle: 'italic', margin: 0 }}>
                                  "{scene.narration}"
                                </p>
                              </div>

                              {/* Motion Graphics */}
                              <div style={{ marginBottom: 12, padding: '12px 14px', background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: 8 }}>
                                <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#818CF8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>🎨 Motion Graphics</div>
                                <p style={{ fontSize: '0.845rem', lineHeight: 1.7, color: 'var(--text-secondary)', margin: 0 }}>{scene.motionGraphics}</p>
                              </div>

                              {/* Voice direction + On-screen elements */}
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                {scene.voiceDirection && (
                                  <div style={{ padding: '10px 12px', background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)', borderRadius: 8 }}>
                                    <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#FBBF24', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>🎙 Voice Direction</div>
                                    <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.55 }}>{scene.voiceDirection}</p>
                                  </div>
                                )}
                                {scene.onScreen?.length > 0 && (
                                  <div style={{ padding: '10px 12px', background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)', borderRadius: 8 }}>
                                    <div style={{ fontSize: '0.65rem', fontWeight: 700, color: '#34D399', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>🖥 On Screen</div>
                                    {scene.onScreen.map((el, j) => (
                                      <div key={j} style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: 2 }}>• {el}</div>
                                    ))}
                                  </div>
                                )}
                              </div>

                              {scene.transition && (
                                <div style={{ marginTop: 10, fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <span>→</span> <span style={{ fontStyle: 'italic' }}>Transition: {scene.transition}</span>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        ))}

                        {/* Key concept visuals */}
                        {videoScript.keyConceptVisuals?.length > 0 && (
                          <div className="card" style={{ marginTop: 16 }}>
                            <h3 style={{ marginBottom: 12 }}>🎨 Key Concept Visuals</h3>
                            {videoScript.keyConceptVisuals.map((v, i) => (
                              <div key={i} className="card card-sm" style={{ marginBottom: 8, background: 'rgba(139,92,246,0.06)', border: '1px solid var(--border-purple)' }}>
                                <span style={{ fontWeight: 700, color: 'var(--purple-light)', marginRight: 8 }}>{v.concept}:</span>
                                <span style={{ fontSize: '0.845rem', color: 'var(--text-secondary)' }}>{v.visual}</span>
                                {v.animation && <div style={{ marginTop: 4, fontSize: '0.78rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>✨ {v.animation}</div>}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* CTA */}
                        {videoScript.callToAction && (
                          <div className="card" style={{ marginTop: 14, background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)' }}>
                            <span style={{ fontWeight: 700, color: '#34D399' }}>📣 Call to Action: </span>
                            <span style={{ fontSize: '0.875rem' }}>{videoScript.callToAction}</span>
                          </div>
                        )}
                      </div>
                    )}
                    {!videoScript && !genScript && (
                      <div className="card" style={{ textAlign: 'center', padding: '40px 20px', border: '1px dashed rgba(239,68,68,0.3)' }}>
                        <div style={{ fontSize: '3rem', marginBottom: 12 }}>🎬</div>
                        <h3 style={{ marginBottom: 8 }}>Generate a cinematic video script</h3>
                        <p style={{ marginBottom: 16 }}>Get a complete motion graphics script with narration, scene breakdowns, and voice direction for "{topic || lesson?.title || 'your topic'}"</p>
                        <button className="btn btn-primary" onClick={generateScript} disabled={genScript}>
                          🎥 Generate Video Script
                        </button>
                      </div>
                    )}
                  </motion.div>
                )}

                {activeTab === 'resources' && (                  <motion.div key="resources" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                    <div className="card" style={{ marginBottom: 16 }}>
                      <h2 style={{ marginBottom: 4 }}>📚 Learning Resources</h2>
                      <p style={{ fontSize: '0.84rem' }}>Curated resources to go deeper on "{lesson.title}"</p>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {(lesson.resources || []).map((r, i) => {
                        const typeIcon = { documentation: '📄', book: '📖', practice: '⚒️', video: '🎬' }[r.type] || '🔗'
                        const typeColor = { documentation: '#6366F1', book: '#8B5CF6', practice: '#10B981', video: '#F59E0B' }[r.type] || '#6366F1'
                        return (
                          <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0, transition: { delay: i * 0.06 } }}>
                            <div className="card card-sm card-lift" style={{ display: 'flex', gap: 14 }}>
                              <div style={{ width: 40, height: 40, borderRadius: 10, background: `${typeColor}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', flexShrink: 0 }}>{typeIcon}</div>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: 3 }}>{r.title}</div>
                                <p style={{ fontSize: '0.8rem', lineHeight: 1.55 }}>{r.description}</p>
                              </div>
                              <span className="badge" style={{ background: `${typeColor}15`, color: typeColor, border: `1px solid ${typeColor}25`, fontSize: '0.68rem', alignSelf: 'flex-start', flexShrink: 0, textTransform: 'capitalize' }}>{r.type}</span>
                            </div>
                          </motion.div>
                        )
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Scene navigation */}
              {activeTab === 'lesson' && (
                <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                  {activeScene > 0 && (
                    <button className="btn btn-secondary btn-sm" onClick={() => setScene(s => s - 1)}>← Previous Scene</button>
                  )}
                  {activeScene < (lesson.scenes || []).length - 1 ? (
                    <button className="btn btn-primary btn-sm" onClick={() => setScene(s => s + 1)} style={{ marginLeft: 'auto' }}>Next Scene →</button>
                  ) : (
                    <button className="btn btn-primary btn-sm" onClick={() => setTab('quiz')} style={{ marginLeft: 'auto' }}>Take the Quiz →</button>
                  )}
                </div>
              )}
            </div>
          </div>
          )} {/* end !videoMode */}
        </motion.div>
      )}

      {/* Welcome empty state */}
      {!lesson && !generating && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0, transition: { delay: 0.2 } }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 14 }}>
            {[
              { icon: '🎬', title: 'Cinematic Scenes', desc: '4-6 structured learning scenes with narration and visuals' },
              { icon: '🧠', title: 'Mind Maps', desc: 'Visual concept maps showing how ideas connect' },
              { icon: '❓', title: 'Smart Quiz', desc: '5 adaptive questions with detailed explanations' },
              { icon: '⚒️', title: 'Practice Exercise', desc: 'Step-by-step hands-on project to apply your learning' },
              { icon: '💻', title: 'Code Examples', desc: 'Live code examples for technical topics' },
              { icon: '📚', title: 'Curated Resources', desc: 'Books, courses, and platforms to go deeper' },
            ].map((f, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0, transition: { delay: 0.1 + i * 0.06 } }}>
                <div className="card card-lift" style={{ textAlign: 'center', padding: '20px 16px' }}>
                  <div style={{ fontSize: '1.75rem', marginBottom: 8 }}>{f.icon}</div>
                  <div style={{ fontWeight: 700, fontSize: '0.875rem', marginBottom: 5 }}>{f.title}</div>
                  <p style={{ fontSize: '0.78rem', lineHeight: 1.55 }}>{f.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </StudentLayout>
  )
}
