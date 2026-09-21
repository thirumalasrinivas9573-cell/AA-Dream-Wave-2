// ── Multi-Agent AI Service ────────────────────────────────────────────────────
// Each agent has a distinct personality, focus area, and system prompt.
// The user's tone preference and history summary are injected for personalization.

const { openai } = require('../utils/openaiClient')

// ── Agent definitions ─────────────────────────────────────────────────────────
const AGENTS = {
  mentor: {
    name: 'Sage (Mentor)',
    prompt: `You are Sage, an advanced AI life mentor. You are calm, wise, and precise -- inspired by Krishna-like clarity. You guide users through life decisions, discipline, habits, and personal growth. Every answer must be goal-aligned, practical, and structured. Never give vague or generic responses. Follow this structure: (1) Direct connection to goal, (2) Practical explanation, (3) Real-world application, (4) Short conclusion. Max 10 lines.`,
    temperature: 0.68,
    max_tokens: 500,
  },
  productivity: {
    name: 'Flux (Productivity)',
    prompt: `You are Flux, a sharp AI productivity coach. You help users build systems, eliminate distractions, and execute goals with precision. Every response must be goal-aligned and action-oriented. Give specific, time-bound steps. No fluff. Structure: (1) Goal connection, (2) Specific action, (3) Implementation, (4) Outcome. Max 10 lines.`,
    temperature: 0.60,
    max_tokens: 450,
  },
  research: {
    name: 'Atlas (Research)',
    prompt: `You are Atlas, a meticulous AI research analyst. You synthesize complex topics into clear, structured insights always connected to the user's goal. Be analytical, objective, and thorough. Structure responses with clear sections. Accuracy is paramount -- zero hallucination tolerance. Max 10 lines.`,
    temperature: 0.45,
    max_tokens: 600,
  },
  career: {
    name: 'Nexus (Career)',
    prompt: `You are Nexus, a strategic AI career advisor. You help users navigate career transitions, skill development, job searching, and professional growth. Every answer must be industry-specific and goal-aligned. Give concrete, actionable guidance. Structure: (1) Goal relevance, (2) Strategy, (3) Action steps, (4) Expected outcome. Max 10 lines.`,
    temperature: 0.62,
    max_tokens: 550,
  },
}

/**
 * Build a goal-aware, personalized system prompt
 */
const buildPersonalizedPrompt = (basePrompt, profile, tone) => {
  const toneMap = {
    motivational: 'Be highly encouraging and energetic in your delivery.',
    strict:       'Be direct, firm, and hold the user accountable. No excuses.',
    calm:         'Be measured, thoughtful, and reassuring in your tone.',
    friendly:     'Be warm, conversational, and supportive like a trusted friend.',
  }

  let context = basePrompt

  // Tone instruction
  if (tone && toneMap[tone]) context += `\n\nTone: ${toneMap[tone]}`

  // Goal-aware rules -- the core intelligence upgrade
  if (profile?.targetRole || profile?.currentRole) {
    const goal = profile.targetRole || profile.currentRole
    context += `\n\nUser's Primary Goal: "${goal}"`
    context += `\nSTRICT RULE: Every response must be framed around this goal. If the user asks something unrelated, connect it back intelligently. Never give generic answers.`
  }

  // Additional context
  if (profile?.interests?.length) context += `\nUser interests: ${profile.interests.join(', ')}.`
  if (profile?.historySummary)    context += `\nUser context: ${profile.historySummary}`

  // Word restriction rule
  context += `\n\nIf the user sends abusive, spammy, or nonsense input, respond ONLY with: "I am here to guide you towards your goal. Please ask meaningful questions."`

  return context
}

/**
 * Run an agent with full conversation history + personalization
 * @param {string} agentType - 'mentor' | 'productivity' | 'research' | 'career'
 * @param {string} message - current user message
 * @param {Array}  history - [{role, content}] last N messages
 * @param {Object} profile - UserProfile document (optional)
 */
const runAgent = async (agentType, message, history = [], profile = null) => {
  const agent = AGENTS[agentType] || AGENTS.mentor
  const systemPrompt = buildPersonalizedPrompt(agent.prompt, profile, profile?.tone)

  const completion = await openai.chat.completions.create({
    model:       'gpt-3.5-turbo',
    temperature: agent.temperature,
    max_tokens:  agent.max_tokens,
    messages: [
      { role: 'system', content: systemPrompt },
      ...history,
      { role: 'user', content: message },
    ],
  })

  return {
    reply:     completion.choices[0].message.content,
    agentName: agent.name,
    agentType,
  }
}

/**
 * Generate a resume from structured user data
 */
const buildResume = async (data) => {
  const { name, email, phone, summary, skills, experience, education, targetRole } = data

  const completion = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    temperature: 0.6,
    max_tokens: 1000,
    messages: [
      { role: 'system', content: 'You are an expert resume writer. Create professional, ATS-optimized resume content.' },
      { role: 'user',   content: `Create a professional resume for:
Name: ${name}
Email: ${email || 'N/A'}
Phone: ${phone || 'N/A'}
Target Role: ${targetRole || 'Not specified'}
Summary: ${summary || 'Not provided'}
Skills: ${Array.isArray(skills) ? skills.join(', ') : skills}
Experience: ${experience}
Education: ${education}

Return JSON: {
  "headline": "string",
  "summary": "2-3 sentence professional summary",
  "skills": ["skill1", "skill2", ...],
  "experience": [{"title":"string","company":"string","duration":"string","bullets":["string","string"]}],
  "education": [{"degree":"string","institution":"string","year":"string"}],
  "tips": ["improvement tip 1", "improvement tip 2"]
}` },
    ],
  })

  try {
    return JSON.parse(completion.choices[0].message.content)
  } catch {
    return { raw: completion.choices[0].message.content }
  }
}

/**
 * Generate a video script from a topic
 */
const buildVideoScript = async (topic, duration = 60) => {
  const completion = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    temperature: 0.75,
    max_tokens: 800,
    messages: [
      { role: 'system', content: 'You are a professional educational video scriptwriter. Create engaging, clear scripts for short-form learning videos.' },
      { role: 'user',   content: `Write a ${duration}-second educational video script about: "${topic}".
Return JSON: {
  "title": "string",
  "hook": "opening 5-second hook sentence",
  "sections": [{"heading":"string","script":"string","duration_seconds":number}],
  "callToAction": "closing CTA sentence",
  "totalDuration": ${duration},
  "keywords": ["keyword1","keyword2","keyword3"]
}` },
    ],
  })

  try {
    return JSON.parse(completion.choices[0].message.content)
  } catch {
    return { raw: completion.choices[0].message.content }
  }
}

/**
 * Generate a smart AI nudge notification for a user
 */
const generateNudge = async (stats, profile) => {
  const completion = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    temperature: 0.8,
    max_tokens: 150,
    messages: [
      { role: 'system', content: 'You generate short, motivating push notification messages for a productivity app. Be specific, personal, and action-oriented. Max 2 sentences.' },
      { role: 'user',   content: `User stats: ${stats.taskDone} tasks done out of ${stats.tasks} total. ${stats.goals} goals set. AI chats: ${stats.aiChats}. Tone preference: ${profile?.tone || 'calm'}. Generate a personalized nudge message.` },
    ],
  })
  return completion.choices[0].message.content
}

module.exports = { runAgent, buildResume, buildVideoScript, generateNudge, AGENTS }
