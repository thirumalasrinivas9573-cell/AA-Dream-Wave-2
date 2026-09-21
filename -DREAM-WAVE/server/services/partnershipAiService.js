const OpenAI = require('openai')
const { getPartnershipWorkspace } = require('./partnershipCollaborationService')
const { SHARING_SCOPES } = require('../constants/partnership')

let openai = null
function getOpenAI() {
  if (!process.env.OPENAI_API_KEY?.trim()) return null
  if (!openai) openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  return openai
}

const AI_INTENTS = [
  'PARTNERSHIP_SUMMARY',
  'SCOPE_EXPLANATION',
  'COLLABORATION_GAPS',
  'ACTIVITY_SUMMARY',
  'PARTNER_MATCH',
  'COLLABORATION_BRIEF',
  'PROPOSAL_DRAFT',
  'RENEWAL_REVIEW',
  'PARTNERSHIP_HEALTH',
]

function buildRuleBasedInsight(intent, workspace = {}) {
  const p = workspace.partnership || {}
  const scopes = workspace.sharingScopes || []
  const shared = workspace.shared || {}

  const insight = {
    observation: '',
    evidence: {},
    interpretation: '',
    limitation:
      'Insights use only authorized partnership data. Status, organizations, and resources are never invented.',
    nextAction: null,
    dataAvailable: true,
  }

  switch (intent) {
    case 'PARTNERSHIP_SUMMARY': {
      const counterparty =
        p.institution?.name && p.company?.name
          ? `${p.institution.name} ↔ ${p.company.name}`
          : 'Partnership'
      insight.observation = `${counterparty} — ${p.status || 'unknown status'} (${p.relationshipType || 'n/a'})`
      insight.evidence = {
        status: p.status,
        relationshipType: p.relationshipType,
        sharingScopes: scopes,
        initiatedBy: p.initiatedBy,
        createdAt: p.createdAt,
      }
      insight.interpretation =
        p.status === 'active'
          ? `Active collaboration across ${scopes.length} shared area(s).`
          : p.status === 'pending'
            ? 'Awaiting partnership response before collaboration can begin.'
            : `Partnership is ${p.status}. Cross-organization sharing may be restricted.`
      break
    }
    case 'SCOPE_EXPLANATION': {
      insight.observation =
        scopes.length > 0
          ? `Enabled scopes: ${scopes.join(', ')}`
          : 'No sharing scopes are currently enabled.'
      insight.evidence = {
        enabled: scopes,
        available: SHARING_SCOPES,
        scopeAccess: workspace.scopeAccess,
      }
      insight.interpretation =
        scopes.includes('recruitment') || scopes.includes('placement')
          ? 'Recruitment and placement data remain eligibility-bound; private student records are not shared.'
          : 'Only explicitly enabled scopes permit cross-organization resource access.'
      break
    }
    case 'COLLABORATION_GAPS': {
      const gaps = []
      if (p.status === 'active') {
        if (scopes.includes('recruitment') && !(shared.jobs?.length || shared.internships?.length)) {
          gaps.push('Recruitment scope enabled but no linked jobs or internships yet.')
        }
        if (scopes.includes('events') && !shared.events?.length) {
          gaps.push('Events scope enabled but no linked events yet.')
        }
        if (scopes.includes('placement') && !shared.drives?.length) {
          gaps.push('Placement scope enabled but no campus drives linked.')
        }
      }
      insight.observation = gaps.length ? gaps.join(' ') : 'No obvious collaboration gaps detected.'
      insight.evidence = {
        sharedCounts: {
          jobs: shared.jobs?.length || 0,
          internships: shared.internships?.length || 0,
          drives: shared.drives?.length || 0,
          events: shared.events?.length || 0,
        },
      }
      insight.interpretation = gaps.length
        ? 'Consider linking shared opportunities or scheduling a joint event.'
        : 'Current shared resources align with enabled scopes.'
      insight.nextAction = gaps.length ? 'Review shared opportunities tab and link relevant resources.' : null
      break
    }
    case 'ACTIVITY_SUMMARY': {
      const activity = workspace.recentActivity || []
      insight.observation = activity.length
        ? `${activity.length} recent activity record(s). Latest: ${activity[0]?.title || 'n/a'}`
        : 'No recent partnership activity recorded.'
      insight.evidence = {
        recent: activity.slice(0, 5).map((a) => ({
          type: a.type,
          title: a.title,
          createdAt: a.createdAt,
        })),
      }
      insight.interpretation = activity.length
        ? 'Activity reflects audited partnership lifecycle events only.'
        : 'Activity will appear after requests, scope changes, or resource linking.'
      break
    }
    default:
      insight.observation = 'Information not available.'
      insight.dataAvailable = false
  }

  return insight
}

async function generateCollaborationInsight({ partnershipId, actor, intent = 'PARTNERSHIP_SUMMARY' }) {
  if (!AI_INTENTS.includes(intent)) {
    const err = new Error(`Invalid AI intent: ${intent}`)
    err.statusCode = 400
    throw err
  }

  const workspace = await getPartnershipWorkspace(partnershipId, actor)
  const ruleInsight = buildRuleBasedInsight(intent, workspace)

  const client = getOpenAI()
  if (!client) {
    return {
      intent,
      source: 'rule',
      insight: ruleInsight,
      workspaceSummary: {
        status: workspace.partnership?.status,
        scopes: workspace.sharingScopes,
      },
    }
  }

  try {
    const systemPrompt = `You are a collaboration assistant for Dream Wave AI institution-company partnerships.
Use ONLY the JSON context provided. Never invent partnerships, companies, institutions, jobs, events, candidates, or scopes.
If data is missing, say "Information not available."
Do not suggest creating partnerships without user confirmation.`

    const userPrompt = JSON.stringify({
      intent,
      ruleInsight,
      partnership: {
        status: workspace.partnership?.status,
        relationshipType: workspace.partnership?.relationshipType,
        sharingScopes: workspace.sharingScopes,
        initiatedBy: workspace.partnership?.initiatedBy,
      },
      sharedCounts: {
        jobs: workspace.shared?.jobs?.length || 0,
        internships: workspace.shared?.internships?.length || 0,
        drives: workspace.shared?.drives?.length || 0,
        events: workspace.shared?.events?.length || 0,
      },
      recentActivity: (workspace.recentActivity || []).slice(0, 5).map((a) => a.title),
    })

    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 500,
      temperature: 0.2,
    })

    const text = completion.choices?.[0]?.message?.content?.trim()
    return {
      intent,
      source: 'ai',
      insight: {
        ...ruleInsight,
        interpretation: text || ruleInsight.interpretation,
      },
      workspaceSummary: {
        status: workspace.partnership?.status,
        scopes: workspace.sharingScopes,
      },
    }
  } catch {
    return {
      intent,
      source: 'rule',
      insight: ruleInsight,
      workspaceSummary: {
        status: workspace.partnership?.status,
        scopes: workspace.sharingScopes,
      },
    }
  }
}

module.exports = {
  AI_INTENTS,
  generateCollaborationInsight,
  buildRuleBasedInsight,
}
