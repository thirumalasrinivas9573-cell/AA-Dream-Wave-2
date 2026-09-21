const OpenAI = require('openai')
const { BI_INTENTS, INSIGHT_CONTRACT_FIELDS } = require('../constants/businessIntelligence')
const { buildBiContext } = require('./businessIntelligenceService')

let openai = null
function getOpenAI() {
  if (!process.env.OPENAI_API_KEY?.trim()) return null
  if (!openai) openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  return openai
}

function buildContractInsight(intent, context) {
  const dashboard = context.dashboard || context.analytics || {}
  const period = context.filters?.periodLabel || 'all_time'

  const insight = {
    observation: '',
    evidence: {},
    interpretation: '',
    limitation: 'The system does not contain enough data to determine causation.',
    nextAction: null,
  }

  switch (intent) {
    case 'INSTITUTION_OVERVIEW': {
      const o = dashboard.overview || {}
      insight.observation = `Institution overview for period: ${period}.`
      insight.evidence = {
        students: o.students ?? 0,
        activeStudents: o.activeStudents ?? 0,
        faculty: o.faculty ?? 0,
        admissionsEnrolled: o.admissionsEnrolled ?? 0,
      }
      insight.interpretation = o.students
        ? `${o.students} student records are on file; ${o.activeStudents ?? 0} are active.`
        : 'No student records found for this institution.'
      break
    }
    case 'ADMISSION_TREND': {
      const trend = dashboard.trends?.admissions
      insight.observation = trend?.hasTrend
        ? 'Enrollment records show a measurable trend over time.'
        : trend?.message || 'Insufficient admission history.'
      insight.evidence = { admissionsTrend: trend?.points || [] }
      insight.interpretation = trend?.hasTrend
        ? 'Enrollment activity varies across recorded periods.'
        : 'Not enough historical enrollment data for trend analysis.'
      break
    }
    case 'PLACEMENT_FUNNEL':
    case 'RECRUITMENT_ACTIVITY': {
      const career = dashboard.career || dashboard.recruitment || {}
      const funnel = dashboard.funnel?.counts || career.candidatePipelineDistribution || {}
      insight.observation = `Recruitment pipeline activity for period: ${period}.`
      insight.evidence = {
        applications: funnel.applications ?? career.totalApplications ?? career.applications ?? 0,
        hired: funnel.hired ?? funnel.hired ?? 0,
        offers: career.offers ?? career.offersReleased ?? 0,
      }
      insight.interpretation = insight.evidence.applications
        ? `${insight.evidence.applications} applications recorded in scope.`
        : 'No applications recorded in the selected scope.'
      break
    }
    case 'SKILL_GAP': {
      const skills = dashboard.skills || {}
      insight.observation = skills.gaps?.length
        ? `${skills.gaps.length} skill gap(s) identified at aggregate level.`
        : 'No skill gaps detected or insufficient skill data.'
      insight.evidence = { demand: skills.demand?.slice(0, 5), gaps: skills.gaps?.slice(0, 5) }
      insight.interpretation = skills.gaps?.length
        ? 'Some in-demand skills are not represented in aggregate student/candidate evidence.'
        : 'Demand and supply data are aligned or incomplete.'
      insight.limitation = 'Aggregate skill comparison does not assess individual readiness.'
      break
    }
    case 'APPLICATION_TREND': {
      const trend = dashboard.trends?.applications
      insight.observation = trend?.hasTrend
        ? 'Application volume shows variation across periods.'
        : trend?.message || 'Insufficient application history.'
      insight.evidence = { applicationTrend: trend?.points || [] }
      insight.interpretation = trend?.hasTrend
        ? 'Application counts changed between recorded periods.'
        : 'Not enough historical application data for trend analysis.'
      if (trend?.hasTrend && trend.points.length >= 2) {
        const last = trend.points[trend.points.length - 1].count
        const prev = trend.points[trend.points.length - 2].count
        if (last > prev) {
          insight.observation = `Applications increased from ${prev} to ${last} between the last two recorded periods.`
        } else if (last < prev) {
          insight.observation = `Applications decreased from ${prev} to ${last} between the last two recorded periods.`
        }
      }
      break
    }
    case 'DATA_QUALITY': {
      const dq = dashboard.dataQuality || {}
      insight.observation = dq.hasIssues
        ? `${dq.warnings?.length || 0} data quality warning(s) detected.`
        : 'No data quality warnings detected.'
      insight.evidence = { warnings: dq.warnings || [] }
      insight.interpretation = dq.hasIssues
        ? 'Review flagged records before relying on derived metrics.'
        : 'Core fields appear populated for scoped records.'
      break
    }
    case 'STUDENT_CAREER': {
      const a = dashboard
      insight.observation = `Student career summary: ${a.applications ?? 0} applications, ${a.offers ?? 0} offers.`
      insight.evidence = {
        applications: a.applications ?? 0,
        interviews: a.interviews ?? 0,
        offers: a.offers ?? 0,
        skills: a.skills?.count ?? 0,
      }
      insight.interpretation = a.applications
        ? 'Application activity is recorded for this account.'
        : 'No application activity recorded yet.'
      insight.limitation = 'Career reasoning and private notes are not included.'
      break
    }
    default:
      insight.observation = 'Select a supported analytics intent.'
      insight.evidence = { supportedIntents: BI_INTENTS }
      insight.interpretation = 'No analysis performed for unknown intent.'
  }

  return insight
}

async function generateBiInsights(scope, scopeId, intent = 'INSTITUTION_OVERVIEW', query = {}) {
  const normalizedIntent = BI_INTENTS.includes(intent) ? intent : 'INSTITUTION_OVERVIEW'
  const context = await buildBiContext(scope, scopeId, query)
  const contract = buildContractInsight(normalizedIntent, context)

  const result = {
    intent: normalizedIntent,
    scope,
    mode: 'rule_based',
    insight: contract,
    contractFields: INSIGHT_CONTRACT_FIELDS,
    disclaimer:
      'Insights reflect observed records within authorized scope. Correlation is reported; causation is not inferred.',
  }

  const client = getOpenAI()
  if (!client) return result

  try {
    const completion = await client.chat.completions.create({
      model: 'gpt-3.5-turbo',
      temperature: 0.2,
      max_tokens: 500,
      messages: [
        {
          role: 'system',
          content:
            'You are a business intelligence assistant. Use ONLY the JSON context. Never invent statistics or causes. Structure response as: Observation, Evidence, Interpretation, Limitation. If insufficient data, say so.',
        },
        {
          role: 'user',
          content: `Intent: ${normalizedIntent}\nScope: ${scope}\nContext:\n${JSON.stringify(context)}\n\nExplain this analytics data without inventing causes.`,
        },
      ],
    })
    const aiText = completion.choices[0]?.message?.content || ''
    return {
      ...result,
      mode: 'ai_assisted',
      aiSummary: aiText,
    }
  } catch {
    return result
  }
}

module.exports = {
  generateBiInsights,
  buildContractInsight,
  BI_INTENTS,
}
