const OpenAI = require('openai')
const {
  ECOSYSTEM_AI_INTENTS,
  MULTI_AGENT_ECOSYSTEM_INTENTS,
} = require('../constants/ecosystemIntelligence')
const { buildEcosystemAiContext } = require('./ecosystemIntelligenceService')

let openai = null
function getOpenAI() {
  if (!process.env.OPENAI_API_KEY?.trim()) return null
  if (!openai) openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  return openai
}

function buildRuleInsight(intent, context = {}) {
  const insight = {
    observation: '',
    evidence: {},
    interpretation: '',
    limitation: 'Insights use authorized ecosystem data only. No outcomes, placements, or partners are invented.',
    nextAction: null,
    what: '',
    why: '',
    source: 'Ecosystem Intelligence Service',
  }

  const o = context.overview?.overview || {}
  const alignment = context.alignment || {}

  switch (intent) {
    case 'ECOSYSTEM_OVERVIEW':
      insight.observation = `${o.activePartnerships || 0} active partnerships; ${o.activePrograms || 0} active programs; ${o.upcomingEvents || 0} upcoming events.`
      insight.evidence = { overview: o }
      insight.interpretation = 'Cross-system snapshot from partnerships, programs, events, and recruitment records.'
      insight.what = insight.observation
      insight.why = 'Aggregated from canonical institution/company ecosystem modules.'
      break
    case 'INDUSTRY_SKILL_TRENDS': {
      const demand = alignment.skills?.demand?.slice(0, 5) || []
      insight.observation = demand.length
        ? `Top industry demand: ${demand.map((d) => d.skill).join(', ')}`
        : 'No skill demand data in current scope.'
      insight.evidence = { demand, supply: alignment.skills?.supply?.slice(0, 5) }
      insight.what = insight.observation
      insight.why = 'Derived from partner job/internship listings and opportunities.'
      break
    }
    case 'PROGRAM_ALIGNMENT':
      insight.observation = `Alignment level: ${(alignment.alignmentLevel || 'NEEDS_ATTENTION').replace(/_/g, ' ')}`
      insight.evidence = alignment.programAlignment
      insight.interpretation = alignment.explanation?.why || ''
      insight.what = alignment.explanation?.what
      insight.why = alignment.explanation?.why
      insight.source = alignment.explanation?.source
      break
    case 'PARTNERSHIP_INTELLIGENCE': {
      const p = context.partnerships?.stats || context.partnerships?.dashboard?.counts
      insight.observation = p
        ? `Active partners: ${p.activePartners ?? p.active ?? 0}; shared programs: ${context.partnerships?.sharedPrograms ?? 0}`
        : 'Partnership data unavailable.'
      insight.evidence = { partnerships: context.partnerships }
      break
    }
    case 'OPPORTUNITY_INTELLIGENCE':
      insight.observation = `${o.openJobs || 0} open jobs; ${o.openInternships || 0} internships in ecosystem scope.`
      insight.evidence = { opportunities: context.overview?.opportunities }
      break
    case 'RECRUITMENT_PIPELINE':
      insight.observation = `${o.applicationsSubmitted || 0} applications in recruitment/placement scope.`
      insight.evidence = {
        placement: context.overview?.placement,
        recruitment: context.overview?.recruitment,
      }
      break
    case 'PLACEMENT_OUTCOMES':
      insight.observation = `${o.studentsPlaced || 0} placement outcomes recorded in scope.`
      insight.evidence = { placement: context.overview?.placement }
      insight.limitation = 'Aggregate placement counts only; individual student data is not exposed.'
      break
    case 'SKILL_GAP_ANALYSIS': {
      const gaps = alignment.skills?.gaps?.slice(0, 5) || []
      insight.observation = gaps.length
        ? `Skill gaps: ${gaps.map((g) => g.skill).join(', ')}`
        : 'No skill gaps detected or insufficient data.'
      insight.evidence = { gaps, overlap: alignment.skills?.overlap?.slice(0, 5) }
      break
    }
    case 'COLLABORATION_GAPS': {
      const recs = context.recommendations || []
      insight.observation = recs.length
        ? `${recs.length} collaboration recommendation(s) available.`
        : 'No collaboration gaps flagged.'
      insight.evidence = { recommendations: recs }
      insight.nextAction = recs[0]?.title || null
      break
    }
    default:
      insight.observation = 'Information not available.'
  }

  return insight
}

async function generateEcosystemInsight({ orgId, role, intent, query = {} }) {
  if (!ECOSYSTEM_AI_INTENTS.includes(intent)) {
    const err = new Error(`Invalid intent: ${intent}`)
    err.statusCode = 400
    throw err
  }

  const context = await buildEcosystemAiContext(orgId, role, query)
  const ruleInsight = buildRuleInsight(intent, context)

  const client = getOpenAI()
  if (!client) {
    return { intent, source: 'rule', insight: ruleInsight, contextSummary: summarizeContext(context) }
  }

  try {
    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'Dream Wave Ecosystem Intelligence assistant. Use ONLY provided JSON. Never invent partners, programs, placements, or skills. If data missing say "Information not available." Do not expose chain-of-thought.',
        },
        { role: 'user', content: JSON.stringify({ intent, ruleInsight, context: summarizeContext(context) }) },
      ],
      max_tokens: 500,
      temperature: 0.2,
    })
    const text = completion.choices?.[0]?.message?.content?.trim()
    return {
      intent,
      source: 'ai',
      insight: { ...ruleInsight, interpretation: text || ruleInsight.interpretation },
      contextSummary: summarizeContext(context),
    }
  } catch {
    return { intent, source: 'rule', insight: ruleInsight, contextSummary: summarizeContext(context) }
  }
}

function summarizeContext(ctx) {
  return {
    activePartnerships: ctx.overview?.overview?.activePartnerships,
    activePrograms: ctx.overview?.overview?.activePrograms,
    alignmentLevel: ctx.alignment?.alignmentLevel,
    topDemandSkills: ctx.alignment?.skills?.demand?.slice(0, 5)?.map((d) => d.skill),
    programCount: ctx.programs?.totals?.count,
    recommendationCount: ctx.recommendations?.length,
  }
}

/** Multi-agent style: parallel specialist summaries merged (no duplicate MJ agents) */
async function runMultiAgentEcosystemRequest({ orgId, role, intent, query = {} }) {
  if (!MULTI_AGENT_ECOSYSTEM_INTENTS.includes(intent)) {
    const err = new Error(`Invalid multi-agent intent: ${intent}`)
    err.statusCode = 400
    throw err
  }

  const context = await buildEcosystemAiContext(orgId, role, query)

  const specialists = {
    institution: buildRuleInsight('ECOSYSTEM_OVERVIEW', context),
    partnership: buildRuleInsight('PARTNERSHIP_INTELLIGENCE', context),
    opportunity: buildRuleInsight('OPPORTUNITY_INTELLIGENCE', context),
    learning: {
      observation: context.learning?.hasData
        ? `Aggregate learning progress: ${context.learning.aggregateProgress ?? 'n/a'}% across ${context.learning.recordCount} records.`
        : 'No aggregate learning data available.',
      evidence: context.learning,
      source: 'Learning Intelligence (aggregate)',
    },
    placement: buildRuleInsight('PLACEMENT_OUTCOMES', context),
    skills: buildRuleInsight('SKILL_GAP_ANALYSIS', context),
  }

  let synthesis = ''
  switch (intent) {
    case 'IMPROVE_PLACEMENT':
      synthesis = [
        specialists.placement.observation,
        specialists.skills.observation,
        specialists.opportunity.observation,
      ]
        .filter(Boolean)
        .join(' ')
      break
    case 'STRENGTHEN_PARTNERSHIPS':
      synthesis = [specialists.partnership.observation, specialists.institution.observation].join(' ')
      break
    case 'ALIGN_CURRICULUM':
      synthesis = buildRuleInsight('PROGRAM_ALIGNMENT', context).interpretation
      break
    case 'BOOST_PROGRAM_ENGAGEMENT':
      synthesis = `Programs: ${context.programs?.totals?.count || 0} total; ${context.programs?.totals?.active || 0} active. ${specialists.opportunity.observation}`
      break
    default:
      synthesis = 'Information not available.'
  }

  return {
    intent,
    source: 'multi-agent-rule',
    specialists: Object.fromEntries(
      Object.entries(specialists).map(([k, v]) => [k, { observation: v.observation, source: v.source }]),
    ),
    synthesis,
    recommendations: context.recommendations?.slice(0, 5) || [],
    limitation: 'Specialist agents use authorized aggregate data only. Actions require user confirmation.',
  }
}

module.exports = {
  ECOSYSTEM_AI_INTENTS,
  MULTI_AGENT_ECOSYSTEM_INTENTS,
  generateEcosystemInsight,
  runMultiAgentEcosystemRequest,
  buildRuleInsight,
}
