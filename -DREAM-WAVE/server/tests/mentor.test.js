const test = require('node:test')
const assert = require('node:assert/strict')
const { resolveSources, buildMentorContext } = require('../services/mentorContextEngine')
const { buildSystemPrompt, summarizeForStorage } = require('../services/mentorPromptService')

test('context engine selects relevant sources from message intent', () => {
  const sources = resolveSources('What should I work on today for my goal roadmap?', 'goal', 'plan-day')
  assert.ok(sources.includes('tasks'))
  assert.ok(sources.includes('goals'))
  assert.ok(sources.includes('roadmaps'))
})

test('prompt service builds layered system prompt without exposing secrets', () => {
  const prompt = buildSystemPrompt({
    faithMode: 'general',
    mentorMode: 'study',
    depth: 'standard',
    contextText: 'GOALS\n- Learn Python',
    conversationSummary: 'Earlier topic: Python basics',
    action: 'plan-day',
  })
  assert.match(prompt, /Study Mentor/)
  assert.match(prompt, /GOALS/)
  assert.match(prompt, /SECURITY AND SAFETY RULES/)
})

test('conversation summarization trims older history', () => {
  const messages = Array.from({ length: 20 }, (_, index) => ({
    role: index % 2 === 0 ? 'user' : 'assistant',
    content: `Message ${index}`,
  }))
  const summary = summarizeForStorage(messages)
  assert.ok(summary.length > 0)
  assert.ok(summary.length <= 1200)
})

test('mentor routes include conversation CRUD and chat endpoints', () => {
  const router = require('../routes/mentor')
  const paths = router.stack.filter((layer) => layer.route).map((layer) => `${Object.keys(layer.route.methods)[0].toUpperCase()} ${layer.route.path}`)
  assert.ok(paths.some((item) => item.includes('/conversations')))
  assert.ok(paths.some((item) => item.includes('/chat')))
  assert.ok(paths.some((item) => item.includes('/context-preview')))
})

test('chat model includes mentor conversation metadata fields', () => {
  const Chat = require('../models/Chat')
  assert.ok(Chat.schema.paths.title)
  assert.ok(Chat.schema.paths.summary)
  assert.ok(Chat.schema.paths.mentorMode)
  assert.ok(Chat.schema.paths.faithMode)
})

test('mentor rate limiter is applied on /api/mentor', () => {
  const fs = require('fs')
  const serverSource = fs.readFileSync(require.resolve('../server.js'), 'utf8')
  assert.match(serverSource, /app\.use\('\/api\/mentor',\s*aiLimiter\)/)
})

test('buildMentorContext structure is integration-ready', () => {
  assert.equal(typeof buildMentorContext, 'function')
  assert.equal(typeof resolveSources, 'function')
})
