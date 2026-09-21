const { openai } = require('../utils/openaiClient')

const text = (value, max) => String(value || '').trim().slice(0, max)

function sanitizeUserInput(input) {
  return text(input, 4000).replace(/<\/?system>/gi, '')
}

async function improvePostDraft({ content, postType, topics = [], skills = [] }) {
  const draft = sanitizeUserInput(content)
  if (!draft) {
    const error = new Error('Content is required for AI assistance')
    error.statusCode = 400
    throw error
  }
  try {
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      temperature: 0.4,
      max_tokens: 500,
      messages: [
        {
          role: 'system',
          content: 'You help students improve learning-focused community posts. Return JSON only: {"content":"...","topics":[],"skills":[]}. Do not invent achievements or credentials. Keep tone professional and concise.',
        },
        {
          role: 'user',
          content: JSON.stringify({
            postType: text(postType, 40) || 'GENERAL',
            content: draft,
            topics: topics.slice(0, 8),
            skills: skills.slice(0, 8),
          }),
        },
      ],
    })
    const raw = completion.choices?.[0]?.message?.content || '{}'
    const parsed = JSON.parse(raw.replace(/^```json|```$/g, '').trim())
    return {
      content: text(parsed.content, 5000) || draft,
      topics: Array.isArray(parsed.topics) ? parsed.topics.slice(0, 8).map((t) => text(t, 60)).filter(Boolean) : topics,
      skills: Array.isArray(parsed.skills) ? parsed.skills.slice(0, 8).map((s) => text(s, 60)).filter(Boolean) : skills,
      aiAssisted: true,
    }
  } catch (error) {
    const fallback = new Error('AI assistance is temporarily unavailable')
    fallback.statusCode = 503
    fallback.cause = error
    throw fallback
  }
}

async function suggestTags({ content, postType }) {
  const draft = sanitizeUserInput(content)
  if (!draft) return { topics: [], skills: [] }
  try {
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      temperature: 0.2,
      max_tokens: 200,
      messages: [
        {
          role: 'system',
          content: 'Suggest learning topics and skills for a student post. Return JSON only: {"topics":[],"skills":[]}. Max 5 each.',
        },
        { role: 'user', content: JSON.stringify({ postType: text(postType, 40), content: draft }) },
      ],
    })
    const raw = completion.choices?.[0]?.message?.content || '{}'
    const parsed = JSON.parse(raw.replace(/^```json|```$/g, '').trim())
    return {
      topics: Array.isArray(parsed.topics) ? parsed.topics.slice(0, 5).map((t) => text(t, 60)).filter(Boolean) : [],
      skills: Array.isArray(parsed.skills) ? parsed.skills.slice(0, 5).map((s) => text(s, 60)).filter(Boolean) : [],
    }
  } catch {
    return { topics: [], skills: [] }
  }
}

async function summarizeProject({ title, description, technologies = [] }) {
  const payload = {
    title: text(title, 200),
    description: sanitizeUserInput(description),
    technologies: technologies.slice(0, 12).map((t) => text(t, 60)).filter(Boolean),
  }
  if (!payload.title) {
    const error = new Error('Project title is required')
    error.statusCode = 400
    throw error
  }
  try {
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      temperature: 0.3,
      max_tokens: 350,
      messages: [
        {
          role: 'system',
          content: 'Write a concise professional project summary for a student portfolio. Return JSON only: {"summary":"...","highlights":[]}. Do not claim awards or metrics not provided.',
        },
        { role: 'user', content: JSON.stringify(payload) },
      ],
    })
    const raw = completion.choices?.[0]?.message?.content || '{}'
    const parsed = JSON.parse(raw.replace(/^```json|```$/g, '').trim())
    return {
      summary: text(parsed.summary, 1200),
      highlights: Array.isArray(parsed.highlights) ? parsed.highlights.slice(0, 5).map((h) => text(h, 200)).filter(Boolean) : [],
      aiAssisted: true,
    }
  } catch (error) {
    const fallback = new Error('AI project summary is temporarily unavailable')
    fallback.statusCode = 503
    fallback.cause = error
    throw fallback
  }
}

module.exports = {
  improvePostDraft,
  suggestTags,
  summarizeProject,
}
