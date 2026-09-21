const { openai } = require('../utils/openaiClient')
const researchDocumentService = require('./researchDocumentService')
const ResearchSource = require('../models/ResearchSource')

async function proposeResearchPlan(project) {
  const question = project.question || project.title
  const fallback = {
    steps: [
      { title: 'Clarify research question', description: 'Refine scope and define what evidence would answer it.', order: 1 },
      { title: 'Gather sources', description: 'Add library books, documents, URLs, and academic notes.', order: 2 },
      { title: 'Extract key claims', description: 'Identify verifiable claims with citations from sources.', order: 3 },
      { title: 'Synthesize findings', description: 'Combine evidence into a structured summary.', order: 4 },
      { title: 'Connect to learning & career', description: 'Link insights to goals, skills, and projects.', order: 5 },
    ],
    disclaimer: 'Proposed plan — adjust based on your actual sources and deadline.',
    aiReady: false,
  }

  if (!process.env.OPENAI_API_KEY) return fallback

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.35,
      max_tokens: 800,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: 'Propose a practical student research plan. Do not invent specific sources, dates, or citations. JSON: { "steps": [{ "title", "description", "order" }], "disclaimer": string }',
        },
        {
          role: 'user',
          content: `Research question: ${question}\nDescription: ${project.description || 'None'}\nTopics: ${(project.topics || []).join(', ') || 'None'}`,
        },
      ],
    })
    const parsed = JSON.parse(completion.choices[0]?.message?.content || '{}')
    return {
      steps: (parsed.steps || fallback.steps).slice(0, 8).map((s, i) => ({
        title: String(s.title || `Step ${i + 1}`).slice(0, 200),
        description: String(s.description || '').slice(0, 1000),
        order: s.order || i + 1,
        completed: false,
      })),
      disclaimer: parsed.disclaimer || fallback.disclaimer,
      aiReady: true,
    }
  } catch {
    return fallback
  }
}

async function synthesizeProject(studentId, project) {
  const chunks = await researchDocumentService.retrieveProjectChunks(project._id, project.question || project.title, { limit: 10 })
  const sourceIds = [...new Set(chunks.map((c) => c.sourceId))]
  const sources = await ResearchSource.find({ _id: { $in: sourceIds }, studentId }).lean()
  const sourceMap = Object.fromEntries(sources.map((s) => [String(s._id), s]))

  const excerptBlock = chunks.map((c, i) => {
    const src = sourceMap[String(c.sourceId)]
    return `[${i + 1}] ${src?.title || 'Source'}: ${c.text.slice(0, 600)}`
  }).join('\n')

  const fallback = {
    synthesis: excerptBlock
      ? `Based on ${sources.length} source(s), key themes emerge from your collected materials. Review excerpts and add verified claims with citations.`
      : 'Add indexed sources before generating synthesis.',
    findings: [],
    connections: { skills: [], careerRoles: [], learningActions: [] },
    aiReady: false,
  }

  if (!process.env.OPENAI_API_KEY || !excerptBlock) return fallback

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.25,
      max_tokens: 1500,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `Synthesize research ONLY from provided excerpts. Cite as [n]. Never invent sources. JSON: { "synthesis": string, "findings": string[], "connections": { "skills": string[], "careerRoles": string[], "learningActions": string[] }, "reportSections": [{ "title", "content" }] }`,
        },
        {
          role: 'user',
          content: `Question: ${project.question || project.title}\nExcerpts:\n${excerptBlock}`,
        },
      ],
    })
    const parsed = JSON.parse(completion.choices[0]?.message?.content || '{}')
    return {
      synthesis: String(parsed.synthesis || '').slice(0, 20000),
      findings: (parsed.findings || []).slice(0, 10).map((f) => String(f).slice(0, 500)),
      connections: {
        skills: (parsed.connections?.skills || []).slice(0, 8),
        careerRoles: (parsed.connections?.careerRoles || []).slice(0, 5),
        learningActions: (parsed.connections?.learningActions || []).slice(0, 5),
      },
      reportSections: (parsed.reportSections || []).slice(0, 8).map((s) => ({
        title: String(s.title || '').slice(0, 120),
        content: String(s.content || '').slice(0, 3000),
      })),
      aiReady: true,
    }
  } catch {
    return fallback
  }
}

module.exports = { proposeResearchPlan, synthesizeProject }
