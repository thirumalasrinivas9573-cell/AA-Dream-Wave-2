/**
 * Phase 4: Read-Only Audit Script for Fallback-Template Roadmaps and Tasks
 *
 * Scans the database for legacy roadmaps and daily tasks created using
 * hardcoded fallback templates or error fallback catch blocks.
 *
 * READ-ONLY: Makes ZERO modifications or deletions.
 */

const path = require('path')
try { require('dns').setServers(['8.8.8.8', '1.1.1.1']); } catch {}
require(path.join(__dirname, '..', 'server', 'node_modules', 'dotenv')).config({
  path: path.join(__dirname, '..', 'server', '.env'),
})

const mongoose = require(path.join(__dirname, '..', 'server', 'node_modules', 'mongoose'))

const FALLBACK_TASK_TITLES = [
  'Master the Fundamentals: Why This Skill Matters',
  'Self-Assessment: Can You Explain This Without Notes?',
  'Build a Mini Project Using Today\'s Concept',
  'Review, Reinforce, and Connect',
  'Final Assessment: Are You Ready to Move Forward?',
]

const FALLBACK_ROADMAP_STAGE_TITLES = [
  'Foundations and Skill Audit',
  'Targeted Practice and Applied Project',
  'Interview Prep and Capstone Polish',
]

async function runAudit() {
  const uri = process.env.MONGODB_URL || process.env.MONGODB_URI
  if (!uri) {
    console.error('ERROR: MONGODB_URI not found in server/.env')
    process.exit(1)
  }

  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 })
    console.log('Connected to MongoDB. Scanning for fallback-template roadmaps and tasks (READ-ONLY)...\n')

    const db = mongoose.connection.db
    const roadmapsCol = db.collection('roadmaps')
    const tasksCol = db.collection('tasks')
    const goalsCol = db.collection('goals')

    // 1. Audit Roadmaps
    const allRoadmaps = await roadmapsCol.find({}).toArray()
    const fallbackRoadmaps = []

    for (const r of allRoadmaps) {
      const isExplicitFallback =
        r.architecture?.source === 'fallback' ||
        r.data?.transparency?.label === 'SYSTEM-GENERATED FALLBACK'

      const stages = Array.isArray(r.learningStages) ? r.learningStages : []
      const nextSteps = Array.isArray(r.data?.nextSteps) ? r.data.nextSteps : []

      const hasFallbackStage = stages.some((s) =>
        FALLBACK_ROADMAP_STAGE_TITLES.includes(s.title),
      )
      const hasFallbackNextStep = nextSteps.some((s) =>
        FALLBACK_ROADMAP_STAGE_TITLES.includes(s.title),
      )

      if (isExplicitFallback || hasFallbackStage || hasFallbackNextStep) {
        let goalTitle = 'Unknown'
        if (r.goalId) {
          const g = await goalsCol.findOne({ _id: r.goalId })
          if (g) goalTitle = g.title
        }
        fallbackRoadmaps.push({
          id: String(r._id),
          goalId: String(r.goalId || 'none'),
          goalTitle,
          userId: String(r.userId || 'none'),
          source: r.architecture?.source || 'unspecified',
          transparency: r.data?.transparency?.label || 'none',
          matchedOn: [
            isExplicitFallback ? 'architecture.source or transparency.label' : null,
            hasFallbackStage ? 'learningStages title match' : null,
            hasFallbackNextStep ? 'nextSteps title match' : null,
          ].filter(Boolean).join(', '),
          createdAt: r.createdAt || r.architecture?.generatedAt || 'unknown',
        })
      }
    }

    // 2. Audit Tasks
    const allTasks = await tasksCol.find({}).toArray()
    const fallbackTasks = []

    for (const t of allTasks) {
      const isFallbackTitle = FALLBACK_TASK_TITLES.some(
        (ft) => t.title && t.title.toLowerCase().includes(ft.toLowerCase()),
      )

      if (isFallbackTitle) {
        let goalTitle = 'Unknown'
        if (t.goalId) {
          const g = await goalsCol.findOne({ _id: t.goalId })
          if (g) goalTitle = g.title
        }
        fallbackTasks.push({
          id: String(t._id),
          goalId: String(t.goalId || 'none'),
          goalTitle,
          roadmapId: String(t.roadmapId || 'none'),
          userId: String(t.userId || 'none'),
          title: t.title,
          day: t.day || 'none',
          source: t.source || 'unspecified',
          status: t.status || 'todo',
          completed: Boolean(t.completed),
          createdAt: t.createdAt || 'unknown',
        })
      }
    }

    console.log('======================================================================')
    console.log(` AUDIT RESULTS: Found ${fallbackRoadmaps.length} Fallback Roadmaps, ${fallbackTasks.length} Fallback Tasks`)
    console.log('======================================================================\n')

    console.log(`--- FALLBACK ROADMAPS (${fallbackRoadmaps.length} found) ---`)
    if (fallbackRoadmaps.length === 0) {
      console.log('No fallback roadmaps found in the database.\n')
    } else {
      fallbackRoadmaps.forEach((r, i) => {
        console.log(`[${i + 1}] Roadmap ID: ${r.id}`)
        console.log(`    Goal: "${r.goalTitle}" (ID: ${r.goalId})`)
        console.log(`    User ID: ${r.userId}`)
        console.log(`    Source: ${r.source} | Matched: ${r.matchedOn}`)
        console.log(`    Created: ${r.createdAt}\n`)
      })
    }

    console.log(`--- FALLBACK TASKS (${fallbackTasks.length} found across 10 roadmaps) ---`)
    const tasksByRoadmap = {}
    fallbackTasks.forEach((t) => {
      const key = `${t.roadmapId} (Goal: ${t.goalTitle} [${t.goalId}])`
      if (!tasksByRoadmap[key]) tasksByRoadmap[key] = []
      tasksByRoadmap[key].push(t)
    })

    Object.entries(tasksByRoadmap).forEach(([key, tasks], idx) => {
      console.log(`[Roadmap Group ${idx + 1}] Roadmap: ${key}`)
      console.log(`  Count: ${tasks.length} template tasks (Days ${tasks.map((t) => t.day).join(', ')})`)
      console.log(`  Task IDs: ${tasks.map((t) => t.id).join(', ')}\n`)
    })

    console.log('======================================================================')
    console.log(' READ-ONLY AUDIT COMPLETE: 0 database modifications were made.')
    console.log('======================================================================')
  } catch (err) {
    console.error('Audit failed:', err.message)
  } finally {
    await mongoose.disconnect()
  }
}

runAudit()
