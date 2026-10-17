const { getOpenAI, getApiKey, getModel } = require('../utils/openaiClient')
const { OPPORTUNITY_AI_INTENTS } = require('../constants/opportunityMatching')
const {
  getStudentFeed,
  getMatchExplanation,
  compareOpportunities,
  buildPreparationPlan,
  parseNaturalLanguageQuery,
  buildOpportunityContext,
} = require('./opportunityMatchingService')

function getClient() {
  if (!getApiKey()) return null
  try {
    return getOpenAI()
  } catch {
    return null
  }
}


function buildRuleBasedInsight(intent, context = {}, payload = {}) {
  const insight = {
    observation: '',
    evidence: {},
    interpretation: '',
    limitation: 'Recommendations use authorized student and opportunity data only. No employment outcomes are guaranteed.',
    nextAction: null,
  }

  switch (intent) {
    case 'OPPORTUNITY_DISCOVERY': {
      const count = context.feed?.totals?.all || 0
      const strong = context.feed?.strongMatches?.length || 0
      insight.observation = count
        ? `${count} opportunit${count === 1 ? 'y' : 'ies'} in scope; ${strong} strong match(es).`
        : 'No opportunities found in current institution scope.'
      insight.evidence = {
        strongMatches: (context.feed?.strongMatches || []).slice(0, 5).map((m) => ({
          title: m.title,
          kind: m.kind,
          matchLevel: m.match?.matchLevel,
          reasons: m.match?.reasons?.slice(0, 3),
        })),
        closingSoon: (context.feed?.closingSoon || []).slice(0, 3).map((m) => ({
          title: m.title,
          daysUntilDeadline: m.match?.daysUntilDeadline,
        })),
      }
      insight.interpretation = strong
        ? 'Strong matches combine eligibility, skill evidence, and career alignment.'
        : 'Update career goal or add skills to improve match quality.'
      break
    }
    case 'OPPORTUNITY_MATCH':
    case 'OPPORTUNITY_EXPLANATION': {
      const match = context.explanation?.match
      const opp = context.explanation?.opportunity
      if (!match || !opp) {
        insight.observation = 'Select an opportunity for match explanation.'
        break
      }
      insight.observation = `${opp.title} — ${match.matchLevel.replace(/_/g, ' ')}`
      insight.evidence = {
        matchStatus: match.matchStatus,
        reasons: match.reasons,
        missingRequirements: match.missingRequirements,
        explainableScore: match.explainableScore,
      }
      insight.interpretation = match.reasons.length
        ? match.reasons.map((r) => r.label).join('; ')
        : 'Limited matching signals available from current records.'
      insight.nextAction = match.nextAction
      break
    }
    case 'OPPORTUNITY_ELIGIBILITY': {
      const match = context.explanation?.match
      insight.observation = match
        ? `Eligibility: ${match.eligibility?.result || 'NEEDS_REVIEW'}`
        : 'No eligibility data for selected opportunity.'
      insight.evidence = { eligibility: match?.eligibility, hardBlocked: match?.hardBlocked }
      insight.interpretation = match?.hardBlocked?.length
        ? match.hardBlocked.join('; ')
        : 'Eligibility based on institution student record and opportunity rules.'
      break
    }
    case 'OPPORTUNITY_PREPARATION': {
      const plan = context.preparation
      if (!plan) {
        insight.observation = 'Select an opportunity for preparation guidance.'
        break
      }
      insight.observation = `Preparation for ${plan.opportunity.title}`
      insight.evidence = plan.checklist
      insight.interpretation = plan.checklist.missingSkills.length
        ? `Focus on: ${plan.checklist.missingSkills.join(', ')}`
        : 'Your evidenced skills overlap with listed requirements.'
      insight.nextAction = plan.nextAction
      insight.limitation = 'Preparation guidance does not claim skill mastery.'
      break
    }
    case 'OPPORTUNITY_DEADLINE': {
      const closing = context.feed?.closingSoon || []
      insight.observation = closing.length
        ? `${closing.length} opportunit${closing.length === 1 ? 'y' : 'ies'} closing within 14 days.`
        : 'No imminent deadlines in current scope.'
      insight.evidence = {
        closingSoon: closing.map((m) => ({
          title: m.title,
          deadline: m.deadline,
          daysUntilDeadline: m.match?.daysUntilDeadline,
        })),
      }
      insight.interpretation = closing.length
        ? 'Prioritize actionable opportunities with nearest deadlines.'
        : 'Explore all opportunities or update filters.'
      break
    }
    case 'OPPORTUNITY_COMPARISON': {
      const comps = context.comparison?.comparisons || []
      insight.observation = comps.length >= 2 ? `Comparing ${comps.length} opportunities.` : 'Provide 2–4 opportunities to compare.'
      insight.evidence = { comparisons: comps }
      insight.interpretation = comps.length
        ? comps.map((c) => `${c.title}: ${c.matchLevel}`).join(' | ')
        : 'Comparison requires real opportunity records.'
      break
    }
    default:
      insight.observation = 'Select a supported opportunity intelligence intent.'
      insight.evidence = { supportedIntents: OPPORTUNITY_AI_INTENTS }
  }

  return insight
}

async function generateOpportunityInsights(userId, intent = 'OPPORTUNITY_DISCOVERY', options = {}) {
  const normalizedIntent = OPPORTUNITY_AI_INTENTS.includes(intent) ? intent : 'OPPORTUNITY_DISCOVERY'
  const ctx = {}

  if (normalizedIntent === 'OPPORTUNITY_DISCOVERY' || normalizedIntent === 'OPPORTUNITY_DEADLINE') {
    ctx.feed = options.query
      ? (await parseNaturalLanguageQuery(userId, options.query)).feed
      : await getStudentFeed(userId, options.filters || {})
  }
  if (options.source && options.sourceId) {
    if (normalizedIntent === 'OPPORTUNITY_PREPARATION') {
      ctx.preparation = await buildPreparationPlan(userId, options.source, options.sourceId)
    } else {
      ctx.explanation = await getMatchExplanation(userId, options.source, options.sourceId)
    }
  }
  if (normalizedIntent === 'OPPORTUNITY_COMPARISON' && options.compareItems?.length) {
    ctx.comparison = await compareOpportunities(userId, options.compareItems)
  }

  const profileContext = await buildOpportunityContext(userId)
  const contract = buildRuleBasedInsight(normalizedIntent, { ...ctx, profileContext }, options)
  const result = {
    intent: normalizedIntent,
    mode: 'rule_based',
    insight: contract,
    disclaimer: 'Opportunity insights reflect available records. Missing fields reported as NOT PROVIDED.',
  }

  const client = getClient()
  if (!client) return result

  try {
    const completion = await client.chat.completions.create({
      model: getModel(),
      temperature: 0.2,
      max_tokens: 1000,
      messages: [
        {
          role: 'system',
          content:
            'You are an opportunity matching assistant. Use ONLY provided JSON. Never invent salaries, prizes, dates, eligibility, or skills. Say "Information not available" when data is missing. Explain recommendations with evidence.',
        },
        {
          role: 'user',
          content: `Intent: ${normalizedIntent}\nData:\n${JSON.stringify({ contract, ctx: { feedTotals: ctx.feed?.totals, explanation: ctx.explanation?.match?.reasons } })}\n\nProvide concise, evidence-based guidance.`,
        },
      ],
    })
    return {
      ...result,
      mode: 'ai_assisted',
      aiSummary: completion.choices[0]?.message?.content || '',
    }
  } catch {
    return result
  }
}

module.exports = {
  generateOpportunityInsights,
  buildRuleBasedInsight,
  OPPORTUNITY_AI_INTENTS,
}
