const { openai } = require('../utils/openaiClient')

const text = (value, max) => String(value || '').trim().slice(0, max)

function sanitizeInput(input) {
  return text(input, 4000).replace(/<\/?system>/gi, '')
}

async function callProfileAi(systemPrompt, payload) {
  try {
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      temperature: 0.35,
      max_tokens: 500,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: JSON.stringify(payload) },
      ],
    })
    const raw = completion.choices?.[0]?.message?.content || '{}'
    return JSON.parse(raw.replace(/^```json|```$/g, '').trim())
  } catch (error) {
    const fallback = new Error('AI profile assistance is temporarily unavailable')
    fallback.statusCode = 503
    fallback.cause = error
    throw fallback
  }
}

async function improveHeadline({ headline, bio, skills = [], targetRole = '' }) {
  const draft = sanitizeInput(headline || bio)
  if (!draft) {
    const error = new Error('Provide a headline or about text to improve')
    error.statusCode = 400
    throw error
  }
  const parsed = await callProfileAi(
    'Improve a student professional headline. Return JSON only: {"headline":"..."}. Do not invent employers, awards, grades, or credentials.',
    { headline: sanitizeInput(headline), bio: sanitizeInput(bio), skills: skills.slice(0, 8), targetRole: text(targetRole, 120) },
  )
  return { headline: text(parsed.headline, 180) || draft, aiAssisted: true }
}

async function improveAbout({ bio, headline, skills = [], projects = [] }) {
  const draft = sanitizeInput(bio)
  if (!draft) {
    const error = new Error('About text is required')
    error.statusCode = 400
    throw error
  }
  const parsed = await callProfileAi(
    'Improve a student About section for a learning portfolio. Return JSON only: {"bio":"..."}. Use only provided facts. Do not invent achievements or experience.',
    {
      bio: draft,
      headline: sanitizeInput(headline),
      skills: skills.slice(0, 8),
      projects: projects.slice(0, 5).map((item) => ({ title: item.title, status: item.status })),
    },
  )
  return { bio: text(parsed.bio, 2000) || draft, aiAssisted: true }
}

async function improveProjectDescription({ title, description, technologies = [] }) {
  const parsed = await callProfileAi(
    'Improve a student project description for a portfolio. Return JSON only: {"description":"..."}. Do not invent metrics, awards, or users.',
    {
      title: text(title, 200),
      description: sanitizeInput(description),
      technologies: technologies.slice(0, 12),
    },
  )
  return { description: text(parsed.description, 5000) || sanitizeInput(description), aiAssisted: true }
}

async function portfolioSuggestions({ profile }) {
  const parsed = await callProfileAi(
    'Suggest portfolio improvements for a student using only provided profile facts. Return JSON only: {"suggestions":[{"title":"","message":""}]}. Max 5 suggestions. Never invent missing credentials or jobs.',
    {
      displayName: profile.displayName,
      headline: profile.headline,
      bio: profile.bio,
      skills: (profile.skills || []).slice(0, 12).map((item) => item.name),
      projects: (profile.projects || []).slice(0, 8).map((item) => ({ title: item.title, visibility: item.visibility, featured: item.featured })),
      credentials: (profile.credentials || []).slice(0, 8).map((item) => ({ title: item.title, visibility: item.visibility })),
      achievements: (profile.achievements || []).slice(0, 8).map((item) => ({ title: item.title, visibility: item.visibility })),
      careerDirection: profile.careerDirection,
    },
  )
  return {
    suggestions: Array.isArray(parsed.suggestions)
      ? parsed.suggestions.slice(0, 5).map((item) => ({
        title: text(item.title, 120),
        message: text(item.message, 400),
      })).filter((item) => item.title && item.message)
      : [],
    aiAssisted: true,
  }
}

module.exports = {
  improveHeadline,
  improveAbout,
  improveProjectDescription,
  portfolioSuggestions,
}
