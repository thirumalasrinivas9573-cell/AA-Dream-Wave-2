const Chat   = require('../models/Chat')
const { openai } = require('../utils/openaiClient')

// ── V10 DEEP CONTENT SYSTEM PROMPT ────────────────────────────────────────────
const SYSTEM = `You are Sage — a world-class AI mentor, career coach, teacher, research guide and productivity expert inside Dream Wave AI.

IDENTITY:
You are NOT a chatbot. You are a premium consultant equivalent to a ₹5,000/hour career consultant.
Students rely on you for career-defining decisions. Every response must honor that responsibility.

CONTENT DEPTH MANDATE:
For career questions      → 700-1200 words with full roadmap, resources, timeline
For learning questions    → 600-1000 words with step-by-step plan and specific resources
For goal-setting          → 500-800 words with concrete milestones and actions
For research questions    → 600-900 words with data, examples, industry insights
For motivation/struggles  → 300-500 words emotionally intelligent and practical
For simple questions      → 150-300 words is sufficient
For greetings/casual      → 100-200 words

RESPONSE STRUCTURE for career/learning questions:
1. SITUATION ANALYSIS — honest assessment of where the student is
2. THE REAL PICTURE — what this career/path actually looks like (not sugar-coated)
3. LEARNING ROADMAP — specific phases with timeframes (Month 1-2, Month 3-4, etc.)
4. SPECIFIC RESOURCES — actual course names, book titles, YouTube channels, websites
5. PROJECTS TO BUILD — real portfolio projects that impress employers
6. JOB MARKET REALITY — salary ranges, demand, timeline to first job
7. COMMON MISTAKES — what students waste time on and how to avoid it
8. YOUR FIRST STEP TODAY — one specific action to take within 24 hours

PROHIBITED:
- "Here are some tips:" (never write this)
- Generic 5-line responses to career questions
- Vague advice like "practice regularly" without specifics
- Any response under 400 words for a serious career or learning question

STYLE:
- Use clear section headers (##) for long responses
- Be warm but direct — like a senior who respects the student's time
- Include real numbers: salary ranges, time estimates, specific statistics
- Name real companies, real tools, real courses

USER GOAL CONTEXT: Will be provided per request.`

// ── POST /api/ai/chat ─────────────────────────────────────────────────────────
exports.chat = async (req, res) => {
  try {
    const { message, session = 'mentor', userGoal, mode } = req.body
    if (!message?.trim()) return res.status(400).json({ success: false, message: 'Message required.' })

    let chatDoc = await Chat.findOne({ userId: req.user._id, session })
    if (!chatDoc) chatDoc = new Chat({ userId: req.user._id, session, messages: [] })

    const history = chatDoc.messages.slice(-16).map(m => ({ role: m.role, content: m.content }))

    let msg = message.trim()
    if (mode === 'simpler')  msg += '\n\n[Explain this more simply, as if to a complete beginner with no background in this topic.]'
    if (mode === 'deeper')   msg += '\n\n[Go significantly deeper on this — include research, statistics, real examples, and advanced nuances.]'
    if (mode === 'actions')  msg += '\n\n[Give me ONLY a concrete action plan — numbered steps, specific resources, realistic timeline. No theory.]'

    const systemWithGoal = SYSTEM + (userGoal ? `\n\nSTUDENT'S CURRENT GOAL: "${userGoal}"\nEverything you say should ultimately serve this goal or honestly address how it relates.` : '')

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.72,
      max_tokens: 3000,
      messages: [
        { role: 'system', content: systemWithGoal },
        ...history,
        { role: 'user', content: msg },
      ],
    })

    const reply = completion.choices[0].message.content
    chatDoc.messages.push({ role: 'user', content: message.trim() })
    chatDoc.messages.push({ role: 'assistant', content: reply })
    await chatDoc.save()

    res.json({ success: true, reply })
  } catch (err) {
    console.error('[aiController.chat]', err.message)
    if (err.status === 429) return res.status(429).json({ success: false, message: 'AI rate limit. Please wait.' })
    res.status(500).json({ success: false, message: 'AI error.', error: err.message })
  }
}

// ── GET/DELETE /api/ai/history ────────────────────────────────────────────────
exports.getHistory = async (req, res) => {
  try {
    const { session = 'mentor' } = req.query
    const chatDoc = await Chat.findOne({ userId: req.user._id, session })
    res.json({ success: true, messages: chatDoc?.messages || [] })
  } catch (err) { res.status(500).json({ success: false, message: 'Failed to load history.' }) }
}

exports.clearHistory = async (req, res) => {
  try {
    const { session = 'mentor' } = req.query
    await Chat.findOneAndUpdate({ userId: req.user._id, session }, { $set: { messages: [] } })
    res.json({ success: true })
  } catch (err) { res.status(500).json({ success: false, message: 'Failed to clear history.' }) }
}

// ── POST /api/ai/goal-plan — deep 800+ word plan ──────────────────────────────
exports.goalPlan = async (req, res) => {
  try {
    const { title, category = 'Career' } = req.body
    if (!title?.trim()) return res.status(400).json({ success: false, message: 'title required' })

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.7,
      max_tokens: 1500,
      messages: [
        {
          role: 'system',
          content: `You are a world-class career coach. Generate a detailed, actionable goal plan.
Return JSON ONLY: { "steps": ["step1 (50-80 words each, specific and actionable)","step2","step3","step4","step5","step6"] }
Each step must be 50-80 words. Be specific. Include what to do, how long it takes, and expected outcome.`
        },
        {
          role: 'user',
          content: `Create a practical 6-step action plan for this goal: "${title}" (Category: ${category}).
Make each step specific, actionable, and 50-80 words long. Include timeline and expected outcome per step.`
        },
      ],
    })

    let steps = []
    try { steps = JSON.parse(completion.choices[0].message.content).steps || [] } catch { steps = [] }
    res.json({ success: true, steps })
  } catch (err) {
    res.status(500).json({ success: false, message: 'AI error.', error: err.message })
  }
}

// ── POST /api/ai/daily ────────────────────────────────────────────────────────
exports.daily = async (req, res) => {
  try {
    const { message } = req.body
    if (!message?.trim()) return res.status(400).json({ success: false, message: 'message required' })
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini', temperature: 0.75, max_tokens: 600,
      messages: [{ role: 'system', content: SYSTEM + ' Focus on daily habits, routines and wellbeing.' }, { role: 'user', content: message.trim() }],
    })
    res.json({ success: true, reply: completion.choices[0].message.content })
  } catch (err) { res.status(500).json({ success: false, message: 'AI error.' }) }
}

// ── POST /api/ai/report ───────────────────────────────────────────────────────
exports.report = async (req, res) => {
  try {
    const { topic } = req.body
    if (!topic?.trim()) return res.status(400).json({ success: false, message: 'topic required' })
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini', temperature: 0.6, max_tokens: 1500,
      messages: [
        { role: 'system', content: 'You are a research analyst. Return JSON: { "summary": "200-300 word summary", "insights": [{"label":"...","value":"..."}], "actions": ["specific actionable step 1","step 2","step 3","step 4","step 5"] }' },
        { role: 'user', content: `Detailed research report on: "${topic}"` },
      ],
    })
    let report = {}
    try { report = JSON.parse(completion.choices[0].message.content) } catch { report = { summary: completion.choices[0].message.content, insights: [], actions: [] } }
    res.json({ success: true, report })
  } catch (err) { res.status(500).json({ success: false, message: 'AI error.' }) }
}

// ── POST /api/ai/roadmap ──────────────────────────────────────────────────────
exports.roadmap = async (req, res) => {
  try {
    const { goal, currentLevel = 'beginner' } = req.body
    if (!goal?.trim()) return res.status(400).json({ success: false, message: 'goal required' })
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini', temperature: 0.7, max_tokens: 1500,
      messages: [
        { role: 'system', content: 'You are a career expert. Return JSON: { "phases": [{"title":"...","duration":"...","description":"100-150 word detailed description","steps":["specific step 1 (30-40 words)","step 2","step 3","step 4"]}] } — exactly 4 phases.' },
        { role: 'user', content: `4-phase learning roadmap for "${goal}" at ${currentLevel} level. Each phase description 100-150 words, each step 30-40 words.` },
      ],
    })
    let phases = []
    try { phases = JSON.parse(completion.choices[0].message.content).phases || [] } catch { phases = [] }
    res.json({ success: true, phases })
  } catch (err) { res.status(500).json({ success: false, message: 'AI error.' }) }
}

// ── POST /api/ai/books ────────────────────────────────────────────────────────
exports.books = async (req, res) => {
  try {
    const { topic } = req.body
    if (!topic?.trim()) return res.status(400).json({ success: false, message: 'topic required' })
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini', temperature: 0.7, max_tokens: 1000,
      messages: [
        { role: 'system', content: 'You are a book expert. Return JSON: { "books": [{"title":"exact title","author":"exact author","reason":"50-70 word explanation of why this book is essential","category":"...","level":"Beginner|Intermediate|Advanced"}] }' },
        { role: 'user', content: `8 essential books for "${topic}". Each reason must be 50-70 words explaining specific value.` },
      ],
    })
    let books = []
    try { books = JSON.parse(completion.choices[0].message.content).books || [] } catch { books = [] }
    res.json({ success: true, books })
  } catch (err) { res.status(500).json({ success: false, message: 'AI error.' }) }
}

// ── GET /api/ai/dashboard-stats ───────────────────────────────────────────────
exports.dashboardStats = async (req, res) => {
  try {
    const Goal = require('../models/Goal')
    const Task = require('../models/Task')
    const [goals, tasks, done, chat] = await Promise.all([
      Goal.countDocuments({ userId: req.user._id }),
      Task.countDocuments({ userId: req.user._id }),
      Task.countDocuments({ userId: req.user._id, completed: true }),
      Chat.findOne({ userId: req.user._id, session: 'mentor' }),
    ])
    res.json({ success: true, stats: { goals, tasks, taskDone: done, aiChats: Math.floor((chat?.messages?.length || 0) / 2) } })
  } catch (err) { res.status(500).json({ success: false, message: 'Failed.' }) }
}
