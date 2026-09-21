const OpenAI = require('openai')
const {
  buildRuleBasedCandidateSummary,
  buildRuleBasedJobAnalysis,
  buildInterviewQuestionSuggestions,
  buildSafeCandidateProfile,
} = require('./recruitmentIntelligenceService')

let openai = null
function getOpenAI() {
  if (!process.env.OPENAI_API_KEY?.trim()) return null
  if (!openai) openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  return openai
}

async function generateCandidateSummary(student, application, opportunity = null) {
  const grounded = buildRuleBasedCandidateSummary(student, application, opportunity)
  const client = getOpenAI()
  if (!client) return grounded

  const profile = buildSafeCandidateProfile(student, application)
  try {
    const completion = await client.chat.completions.create({
      model: 'gpt-3.5-turbo',
      temperature: 0.2,
      max_tokens: 700,
      messages: [
        {
          role: 'system',
          content:
            'You summarize recruitment candidates using ONLY the JSON provided. Never invent qualifications. Use phrases like "evidence suggests" or "requires review". Do not claim definite suitability.',
        },
        {
          role: 'user',
          content: `Summarize this candidate for a recruiter:\n${JSON.stringify({ profile, roleTitle: application?.roleTitle || opportunity?.title })}`,
        },
      ],
    })
    const text = completion.choices[0]?.message?.content || grounded.candidateSummary
    return {
      ...grounded,
      mode: 'ai_assisted',
      candidateSummary: text,
    }
  } catch {
    return grounded
  }
}

async function analyzeJobDescription(job) {
  const grounded = buildRuleBasedJobAnalysis(job)
  const client = getOpenAI()
  if (!client || !job.description) return grounded

  try {
    const completion = await client.chat.completions.create({
      model: 'gpt-3.5-turbo',
      temperature: 0.2,
      max_tokens: 500,
      messages: [
        {
          role: 'system',
          content:
            'Extract skills, experience, education, and responsibilities from a job description. Return concise bullet lists. Mark uncertain items as "unknown". Do not rewrite the original posting.',
        },
        { role: 'user', content: job.description },
      ],
    })
    return {
      ...grounded,
      mode: 'ai_assisted',
      aiNotes: completion.choices[0]?.message?.content || '',
    }
  } catch {
    return grounded
  }
}

async function suggestInterviewQuestions(job, student) {
  const grounded = buildInterviewQuestionSuggestions(job, student)
  const client = getOpenAI()
  if (!client) return grounded

  const profile = buildSafeCandidateProfile(student)
  try {
    const completion = await client.chat.completions.create({
      model: 'gpt-3.5-turbo',
      temperature: 0.3,
      max_tokens: 500,
      messages: [
        {
          role: 'system',
          content:
            'Generate professional interview questions based only on the job and candidate evidence provided. No sensitive personal attributes.',
        },
        {
          role: 'user',
          content: JSON.stringify({ job: { title: job.title, requiredSkills: job.requiredSkills }, candidate: profile }),
        },
      ],
    })
    const lines = (completion.choices[0]?.message?.content || '')
      .split('\n')
      .map((l) => l.replace(/^[-*\d.]+\s*/, '').trim())
      .filter(Boolean)
    return {
      ...grounded,
      mode: 'ai_assisted',
      questions: lines.length ? lines.slice(0, 8) : grounded.questions,
    }
  } catch {
    return grounded
  }
}

module.exports = {
  generateCandidateSummary,
  analyzeJobDescription,
  suggestInterviewQuestions,
}
