const OpenAI = require('openai')
const { POST_TYPES } = require('../constants/community')

let openai = null
function getOpenAI() {
  if (!process.env.OPENAI_API_KEY?.trim()) return null
  if (!openai) openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  return openai
}

function ruleBasedClassification({ content, title, postType, linkedEntity }) {
  const text = `${title || ''} ${content || ''}`.toLowerCase()
  let classification = postType || 'GENERAL'
  const tags = []

  if (linkedEntity?.entityType === 'project') classification = 'PROJECT'
  else if (linkedEntity?.entityType === 'learning') classification = 'LEARNING'
  else if (['job', 'internship', 'campus_opportunity'].includes(linkedEntity?.entityType)) {
    classification = 'OPPORTUNITY'
  } else if (text.includes('?') && text.length < 300) classification = 'QUESTION'
  else if (text.includes('research')) classification = 'RESEARCH'
  else if (text.includes('learn') || text.includes('course')) classification = 'LEARNING'
  else if (text.includes('hiring') || text.includes('internship') || text.includes('job')) {
    classification = 'OPPORTUNITY'
  }

  for (const skill of linkedEntity?.snapshot?.requiredSkills || []) tags.push(skill)
  for (const tech of linkedEntity?.snapshot?.technologies || []) tags.push(tech)
  if (linkedEntity?.snapshot?.topic) tags.push(linkedEntity.snapshot.topic)

  return {
    classification,
    tags: [...new Set(tags)].slice(0, 8),
    mode: 'rule_based',
  }
}

async function classifyPost(input) {
  const grounded = ruleBasedClassification(input)
  const client = getOpenAI()
  if (!client) return grounded

  try {
    const completion = await client.chat.completions.create({
      model: 'gpt-3.5-turbo',
      temperature: 0.1,
      max_tokens: 120,
      messages: [
        {
          role: 'system',
          content: `Classify community post into one of: ${POST_TYPES.join(', ')}. Return JSON {"classification":"TYPE","tags":["tag"]}. Do not rewrite user content.`,
        },
        {
          role: 'user',
          content: JSON.stringify({
            title: input.title,
            content: input.content?.slice(0, 500),
            postType: input.postType,
            linkedEntityType: input.linkedEntity?.entityType,
          }),
        },
      ],
    })
    const raw = completion.choices[0]?.message?.content || ''
    const match = raw.match(/\{[\s\S]*\}/)
    if (match) {
      const parsed = JSON.parse(match[0])
      if (POST_TYPES.includes(parsed.classification)) {
        return {
          classification: parsed.classification,
          tags: Array.isArray(parsed.tags) ? parsed.tags.slice(0, 8) : grounded.tags,
          mode: 'ai_assisted',
        }
      }
    }
  } catch {
    /* fallback */
  }
  return grounded
}

async function buildFeedSuggestions(post) {
  const grounded = [
    'What was the biggest challenge here?',
    'Would you recommend this approach to others?',
    'Happy to collaborate if useful.',
  ]

  const client = getOpenAI()
  if (!client) return { suggestions: grounded, mode: 'rule_based' }

  try {
    const completion = await client.chat.completions.create({
      model: 'gpt-3.5-turbo',
      temperature: 0.3,
      max_tokens: 200,
      messages: [
        {
          role: 'system',
          content:
            'Suggest 3 professional, respectful comment prompts for a learning/career community post. Return one per line. Do not invent facts about the author.',
        },
        {
          role: 'user',
          content: JSON.stringify({
            title: post.title,
            postType: post.postType,
            linkedEntity: post.linkedEntity?.snapshot || null,
          }),
        },
      ],
    })
    const lines = (completion.choices[0]?.message?.content || '')
      .split('\n')
      .map((l) => l.replace(/^[-*\d.)\s]+/, '').trim())
      .filter(Boolean)
      .slice(0, 3)
    return { suggestions: lines.length ? lines : grounded, mode: 'ai_assisted' }
  } catch {
    return { suggestions: grounded, mode: 'rule_based' }
  }
}

module.exports = {
  classifyPost,
  buildFeedSuggestions,
  ruleBasedClassification,
}
