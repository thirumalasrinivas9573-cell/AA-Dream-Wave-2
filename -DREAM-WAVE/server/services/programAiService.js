const OpenAI = require('openai')
const {
  getProgramDashboard,
  getProgramById,
  assertProgramAccess,
  listStudentPrograms,
} = require('./institutionProgramService')
const { evaluateEligibility } = require('./institutionPlacementEligibilityService')
const InstitutionStudent = require('../models/InstitutionStudent')

let openai = null
function getOpenAI() {
  if (!process.env.OPENAI_API_KEY?.trim()) return null
  if (!openai) openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  return openai
}

function err(message, statusCode = 400) {
  const e = new Error(message)
  e.statusCode = statusCode
  return e
}

const ORGANIZER_INTENTS = [
  'PROGRAM_SUMMARY',
  'PARTICIPATION_GAPS',
  'UPCOMING_ACTIVITY',
  'MILESTONE_DROPOFF',
]

const STUDENT_INTENTS = [
  'STUDENT_PROGRESS',
  'NEXT_ACTIVITY',
  'SKILLS_GAINED',
  'MISSING_REQUIREMENTS',
  'CAREER_ALIGNMENT',
]

function buildOrganizerInsight(intent, dashboard = {}) {
  const p = dashboard.program || {}
  const counts = dashboard.participantCounts || dashboard.analytics || {}
  const insight = {
    observation: '',
    evidence: {},
    interpretation: '',
    limitation: 'Insights use authorized program data only. No participants or outcomes are invented.',
    nextAction: null,
  }

  switch (intent) {
    case 'PROGRAM_SUMMARY':
      insight.observation = `${p.title || 'Program'} — ${p.status || 'unknown'} (${p.programType || 'n/a'})`
      insight.evidence = {
        status: p.status,
        participants: counts,
        linkedEntities: (p.linkedEntities || []).length,
        milestones: (p.milestones || []).length,
      }
      insight.interpretation =
        p.status === 'active'
          ? `${counts.active || 0} active participant(s); ${dashboard.registrationCount || 0} total registrations.`
          : `Program is ${p.status}.`
      break
    case 'PARTICIPATION_GAPS': {
      const gaps = []
      if ((counts.registered || 0) > 0 && !(counts.approved || 0)) {
        gaps.push('Registrations pending approval.')
      }
      if (!(p.linkedEntities || []).length) gaps.push('No linked events or opportunities yet.')
      insight.observation = gaps.length ? gaps.join(' ') : 'No major participation gaps detected.'
      insight.evidence = { counts, linkedCount: (p.linkedEntities || []).length }
      break
    }
    case 'UPCOMING_ACTIVITY': {
      const upcoming = (p.milestones || []).filter((m) => m.status !== 'completed')
      insight.observation = upcoming.length
        ? `Next milestone: ${upcoming[0]?.title || 'n/a'}`
        : 'No pending milestones.'
      insight.evidence = { upcoming: upcoming.slice(0, 5).map((m) => m.title) }
      break
    }
    case 'MILESTONE_DROPOFF':
      insight.observation = `${counts.dropped || 0} dropped; ${counts.completed || 0} completed.`
      insight.evidence = counts
      insight.interpretation =
        (counts.dropped || 0) > (counts.completed || 0)
          ? 'Review milestone difficulty and support.'
          : 'Completion rate appears healthy for current data.'
      break
    default:
      insight.observation = 'Information not available.'
  }
  return insight
}

function buildStudentInsight(intent, { program, participant, student }) {
  const insight = {
    observation: '',
    evidence: {},
    interpretation: '',
    limitation: 'Based on your authorized program participation only.',
    nextAction: null,
  }
  const milestones = program?.milestones || []
  const pending = milestones.filter((m) => m.status !== 'completed')

  switch (intent) {
    case 'STUDENT_PROGRESS':
      insight.observation = participant
        ? `Status: ${participant.status.replace(/_/g, ' ')}`
        : 'Not registered for this program.'
      insight.evidence = { participantStatus: participant?.status, milestones: milestones.length }
      break
    case 'NEXT_ACTIVITY':
      insight.observation = pending.length
        ? `Next: ${pending[0]?.title}`
        : participant?.status === 'completed'
          ? 'Program completed.'
          : 'No pending milestones listed.'
      insight.nextAction = pending.length ? `Complete: ${pending[0]?.title}` : null
      break
    case 'SKILLS_GAINED':
      insight.observation = (program?.skills || []).length
        ? `Skills: ${program.skills.join(', ')}`
        : 'No skills listed for this program.'
      insight.evidence = { skills: program?.skills || [] }
      break
    case 'MISSING_REQUIREMENTS': {
      const elig = student && program
        ? evaluateEligibility(student, program.eligibilityRules || {})
        : null
      insight.observation = elig
        ? elig.eligible
          ? 'Eligibility requirements met.'
          : elig.reasons?.join('; ') || 'Not eligible'
        : 'Information not available.'
      insight.evidence = { eligibility: elig }
      break
    }
    case 'CAREER_ALIGNMENT':
      insight.observation = program?.objectives || program?.description || 'Information not available.'
      insight.interpretation = 'Align program objectives with your career goal in AI Mentor for deeper guidance.'
      break
    default:
      insight.observation = 'Information not available.'
  }
  return insight
}

async function generateOrganizerInsight({ programId, actor, intent = 'PROGRAM_SUMMARY' }) {
  if (!ORGANIZER_INTENTS.includes(intent)) throw err('Invalid intent')
  const dashboard = await getProgramDashboard(programId, actor)
  const ruleInsight = buildOrganizerInsight(intent, dashboard)
  return enrichWithAi(intent, ruleInsight, dashboard, 'organizer')
}

async function generateStudentInsight({ programId, studentUserId, intent = 'STUDENT_PROGRESS' }) {
  if (!STUDENT_INTENTS.includes(intent)) throw err('Invalid intent')
  const program = await getProgramById(programId)
  const participant = await require('../models/ProgramParticipant').findOne({
    programId,
    studentUserId,
  }).lean()
  const student = await InstitutionStudent.findOne({ linkedUserId: studentUserId }).lean()
  const ruleInsight = buildStudentInsight(intent, { program, participant, student })
  return enrichWithAi(intent, ruleInsight, { program, participant }, 'student')
}

async function enrichWithAi(intent, ruleInsight, context, role) {
  const client = getOpenAI()
  if (!client) {
    return { intent, source: 'rule', insight: ruleInsight, role }
  }
  try {
    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'Dream Wave program assistant. Use ONLY provided JSON. Never invent dates, participants, certificates, or outcomes.',
        },
        { role: 'user', content: JSON.stringify({ intent, ruleInsight, context: sanitizeContext(context) }) },
      ],
      max_tokens: 400,
      temperature: 0.2,
    })
    const text = completion.choices?.[0]?.message?.content?.trim()
    return {
      intent,
      source: 'ai',
      insight: { ...ruleInsight, interpretation: text || ruleInsight.interpretation },
      role,
    }
  } catch {
    return { intent, source: 'rule', insight: ruleInsight, role }
  }
}

function sanitizeContext(ctx) {
  const p = ctx.program?.toObject?.() || ctx.program || {}
  return {
    title: p.title,
    status: p.status,
    programType: p.programType,
    skills: p.skills,
    participantCounts: ctx.participantCounts || ctx.analytics,
    registrationCount: ctx.registrationCount,
    linkedCount: (p.linkedEntities || []).length,
    participantStatus: ctx.participant?.status,
  }
}

module.exports = {
  ORGANIZER_INTENTS,
  STUDENT_INTENTS,
  generateOrganizerInsight,
  generateStudentInsight,
  buildOrganizerInsight,
  buildStudentInsight,
}
