const OpenAI = require('openai')
const { EVENT_AI_INTENTS } = require('../constants/eventOpportunity')
const { buildAiContext, getEventDetails } = require('./eventOpportunityService')

let openai = null
function getOpenAI() {
  if (!process.env.OPENAI_API_KEY?.trim()) return null
  if (!openai) openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  return openai
}

function buildRuleBasedInsight(intent, context, eventDetails = null) {
  const insight = {
    observation: '',
    evidence: {},
    interpretation: '',
    limitation: 'Recommendations use authorized student and event data only. Causation is not inferred.',
    nextAction: null,
  }

  switch (intent) {
    case 'EVENT_RECOMMENDATIONS':
    case 'HACKATHON_MATCH': {
      const items = context.availableEvents || []
      const hackathons = items.filter((e) => e.isHackathon || e.category === 'hackathon')
      const pool = intent === 'HACKATHON_MATCH' ? hackathons : items
      insight.observation = pool.length
        ? `${pool.length} event(s) available in your institution scope.`
        : 'No matching events found in current scope.'
      insight.evidence = { events: pool.slice(0, 5).map((e) => ({ title: e.title, category: e.category, deadline: e.registrationDeadline })) }
      insight.interpretation = pool.length
        ? 'These events match your institution and current discovery filters.'
        : 'Check back when new events are published.'
      break
    }
    case 'EVENT_PREPARATION':
    case 'SKILL_GAP': {
      if (!eventDetails) {
        insight.observation = 'Select an event for preparation guidance.'
        insight.interpretation = 'Event-specific preparation requires a specific event context.'
        break
      }
      const required = eventDetails.requiredSkills || []
      const studentSkills = (context.skills || []).map((s) => s.toLowerCase())
      const gaps = required.filter((s) => !studentSkills.includes(s.toLowerCase()))
      insight.observation = required.length
        ? `Event "${eventDetails.title}" lists ${required.length} skill requirement(s).`
        : 'No skill requirements listed for this event.'
      insight.evidence = { required, studentSkills: context.skills, gaps }
      insight.interpretation = gaps.length
        ? `Preparation focus: ${gaps.join(', ')}.`
        : 'Your evidenced skills overlap with listed requirements.'
      insight.limitation = 'Skill comparison uses profile evidence only — not a mastery assessment.'
      break
    }
    case 'DEADLINE_INFO': {
      if (eventDetails) {
        insight.observation = eventDetails.registrationDeadline
          ? `Registration deadline: ${new Date(eventDetails.registrationDeadline).toISOString()}`
          : 'Registration deadline: NOT PROVIDED'
        insight.evidence = { registrationDeadline: eventDetails.registrationDeadline, registrationOpen: eventDetails.registrationOpen }
        insight.interpretation = eventDetails.registrationOpen ? 'Registration is currently open.' : 'Registration is closed or deadline passed.'
      } else {
        insight.observation = 'No event selected for deadline lookup.'
      }
      break
    }
    default:
      insight.observation = 'Select a supported event intelligence intent.'
      insight.evidence = { supportedIntents: EVENT_AI_INTENTS }
  }

  return insight
}

async function generateEventInsights(userId, intent = 'EVENT_RECOMMENDATIONS', options = {}) {
  const normalizedIntent = EVENT_AI_INTENTS.includes(intent) ? intent : 'EVENT_RECOMMENDATIONS'
  const context = await buildAiContext(userId)
  let eventDetails = null
  if (options.source && options.sourceId) {
    try {
      eventDetails = await getEventDetails(userId, options.source, options.sourceId)
    } catch {
      eventDetails = null
    }
  }

  const contract = buildRuleBasedInsight(normalizedIntent, context, eventDetails)
  const result = {
    intent: normalizedIntent,
    mode: 'rule_based',
    insight: contract,
    disclaimer: 'Event insights reflect available records. Missing fields are reported as NOT PROVIDED.',
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
            'You are an event discovery assistant. Use ONLY provided JSON. Never invent dates, prizes, or organizers. Say NOT PROVIDED when data is missing.',
        },
        {
          role: 'user',
          content: `Intent: ${normalizedIntent}\nContext:\n${JSON.stringify({ context, eventDetails })}\n\nProvide helpful event guidance without inventing facts.`,
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
  generateEventInsights,
  buildRuleBasedInsight,
  EVENT_AI_INTENTS,
}
