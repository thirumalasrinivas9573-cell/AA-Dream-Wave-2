const OpenAI = require('openai')
const { AI_INTENTS } = require('../constants/institutionIntelligence')
const { buildAiContext, SUPPORT_THRESHOLDS } = require('./institutionIntelligenceService')

let openai = null
function getOpenAI() {
  if (!process.env.OPENAI_API_KEY?.trim()) return null
  if (!openai) openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  return openai
}

function buildRuleBasedInsights(intent, context) {
  const m = context.overview || {}
  const support = context.support || {}
  const admissions = context.admissions || {}
  const career = context.career || {}
  const programs = context.programs || {}
  const opportunities = context.opportunities || {}
  const insights = []

  switch (intent) {
    case 'INSTITUTION_OVERVIEW':
      insights.push({
        title: 'Institution Overview',
        points: [
          m.totalStudents ? `${m.totalStudents} students on record.` : 'No student records found.',
          m.faculty ? `${m.faculty} faculty members with institution access.` : 'No faculty members registered in institution roles.',
          m.researchProjects ? `${m.researchProjects} research projects tracked.` : null,
          m.activeOpportunities ? `${m.activeOpportunities} active campus opportunities.` : null,
        ].filter(Boolean),
        evidence: { metrics: m },
      })
      break

    case 'STUDENT_PROGRESS':
    case 'ACADEMIC_SUPPORT':
      insights.push({
        title: 'Academic Support Signals',
        points: [
          support.studentsWithSignals
            ? `${support.studentsWithSignals} students have support signals based on configured thresholds.`
            : 'No support signals detected with current data and thresholds.',
          `Attendance threshold: ${SUPPORT_THRESHOLDS.attendancePercent}%`,
          `CGPA attention threshold: ${SUPPORT_THRESHOLDS.cgpa}`,
        ],
        evidence: {
          studentsWithSignals: support.studentsWithSignals,
          thresholds: SUPPORT_THRESHOLDS,
          sample: support.sample,
        },
      })
      break

    case 'PROGRAM_ANALYSIS':
      insights.push({
        title: 'Program Analysis',
        points: (programs.topDepartments || []).slice(0, 5).map(
          (d) =>
            `${d.name}: ${d.studentCount} students${d.avgCgpa ? `, avg CGPA ${d.avgCgpa}` : ''}${d.placementRate !== null ? `, observed placement rate ${d.placementRate}%` : ''}.`,
        ),
        evidence: { departments: programs.topDepartments },
      })
      if (!programs.topDepartments?.length) {
        insights[0].points = ['Insufficient program data to analyze.']
      }
      break

    case 'COURSE_ANALYSIS':
      insights.push({
        title: 'Course Analysis',
        points: ['Course-level analytics available via the course intelligence endpoint.'],
        evidence: { note: 'Use course intelligence for per-course attendance and performance.' },
      })
      break

    case 'FACULTY_ACTIVITY':
      insights.push({
        title: 'Faculty Activity',
        points: [
          context.faculty?.totalFaculty
            ? `${context.faculty.totalFaculty} institution members with faculty-related roles.`
            : 'No faculty members found in institution membership records.',
        ],
        evidence: context.faculty,
      })
      break

    case 'ADMISSION_ANALYSIS':
      insights.push({
        title: 'Admission Activity',
        points: [
          admissions.totalEnrolled ? `${admissions.totalEnrolled} enrolled student records.` : 'No enrolled students.',
          admissions.pendingReview ? `${admissions.pendingReview} profiles pending review.` : null,
          admissions.incompleteProfiles ? `${admissions.incompleteProfiles} incomplete profiles.` : null,
        ].filter(Boolean),
        evidence: admissions,
      })
      break

    case 'PLACEMENT_ANALYSIS':
    case 'OPPORTUNITY_ANALYSIS':
      insights.push({
        title: intent === 'PLACEMENT_ANALYSIS' ? 'Placement Analysis' : 'Opportunity Analysis',
        points: [
          career.placementRate !== undefined
            ? `Observed placement rate: ${career.placementRate}% among eligible students.`
            : null,
          career.applicationsSubmitted
            ? `${career.applicationsSubmitted} applications submitted.`
            : null,
          opportunities.campusOpportunities?.active
            ? `${opportunities.campusOpportunities.active} active campus opportunities.`
            : null,
          opportunities.researchOpportunities?.active
            ? `${opportunities.researchOpportunities.active} active research opportunities.`
            : null,
        ].filter(Boolean),
        evidence: { career, opportunities },
      })
      break

    case 'RESEARCH_OVERVIEW':
      insights.push({
        title: 'Research Overview',
        points: [
          m.researchProjects ? `${m.researchProjects} research projects on record.` : 'No research projects recorded.',
        ],
        evidence: { researchProjects: m.researchProjects },
      })
      break

    case 'INCUBATION_OVERVIEW':
      insights.push({
        title: 'Incubation Overview',
        points: [
          m.incubationStartups ? `${m.incubationStartups} active startups in incubation.` : 'No active startups recorded.',
        ],
        evidence: { activeStartups: m.incubationStartups },
      })
      break

    default:
      insights.push({
        title: 'Institution Intelligence',
        points: ['Select a supported intent for targeted analysis.'],
        evidence: { supportedIntents: AI_INTENTS },
      })
  }

  return {
    intent,
    mode: 'rule_based',
    insights,
    disclaimer: 'Insights are grounded in authorized institution data. Wording reflects observed records, not causal claims.',
  }
}

async function generateInstitutionInsights(institutionId, intent = 'INSTITUTION_OVERVIEW', filters = {}) {
  const normalizedIntent = AI_INTENTS.includes(intent) ? intent : 'INSTITUTION_OVERVIEW'
  const context = await buildAiContext(institutionId, filters)
  const grounded = buildRuleBasedInsights(normalizedIntent, context)

  const client = getOpenAI()
  if (!client) return grounded

  try {
    const completion = await client.chat.completions.create({
      model: 'gpt-3.5-turbo',
      temperature: 0.2,
      max_tokens: 700,
      messages: [
        {
          role: 'system',
          content:
            'You are an institution intelligence assistant. Use ONLY the JSON context provided. Never invent statistics. Use phrases like "observed relationship" or "requires review". Do not label students negatively. Do not infer sensitive personal attributes. Cite evidence from the data.',
        },
        {
          role: 'user',
          content: `Intent: ${normalizedIntent}\n\nInstitution context:\n${JSON.stringify(context)}\n\nProvide 2-4 explainable insight bullets with evidence references.`,
        },
      ],
    })

    const aiText = completion.choices[0]?.message?.content || ''
    return {
      ...grounded,
      mode: 'ai_assisted',
      aiSummary: aiText,
      insights: [
        ...grounded.insights,
        {
          title: 'AI-Assisted Summary',
          points: aiText.split('\n').filter(Boolean).slice(0, 6),
          evidence: { source: 'openai', intent: normalizedIntent },
        },
      ],
    }
  } catch {
    return grounded
  }
}

module.exports = {
  generateInstitutionInsights,
  buildRuleBasedInsights,
  AI_INTENTS,
}
