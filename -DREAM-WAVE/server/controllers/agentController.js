const Chat        = require('../models/Chat')
const UserProfile = require('../models/UserProfile')
const Goal        = require('../models/Goal')
const Task        = require('../models/Task')
const agentSvc    = require('../services/agentService')

// ── Helper: get or create UserProfile ────────────────────────────────────────
const getOrCreateProfile = async (userId) => {
  let profile = await UserProfile.findOne({ userId })
  if (!profile) profile = await UserProfile.create({ userId })
  return profile
}

// ── POST /api/ai/agent ────────────────────────────────────────────────────────
exports.agentChat = async (req, res) => {
  try {
    const { agentType = 'mentor', message, session } = req.body
    if (!message?.trim()) return res.status(400).json({ message: 'message required' })

    const validAgents = ['mentor', 'productivity', 'research', 'career']
    const type = validAgents.includes(agentType) ? agentType : 'mentor'

    // Use agent-specific session key so history is isolated per agent
    const sessionKey = session || `agent_${type}`

    // Load chat history for this agent session
    let chatDoc = await Chat.findOne({ userId: req.user._id, session: sessionKey })
    if (!chatDoc) chatDoc = new Chat({ userId: req.user._id, session: sessionKey, messages: [] })

    const history = chatDoc.messages.slice(-20).map(m => ({ role: m.role, content: m.content }))

    // Load user profile for personalization
    const profile = await getOrCreateProfile(req.user._id)

    // Run the agent
    const { reply, agentName } = await agentSvc.runAgent(type, message.trim(), history, profile)

    // Persist conversation
    chatDoc.messages.push({ role: 'user',      content: message.trim() })
    chatDoc.messages.push({ role: 'assistant', content: reply })
    await chatDoc.save()

    // Increment usage counter
    const usageKey = `usage.${type}Chats`
    await UserProfile.findOneAndUpdate(
      { userId: req.user._id },
      { $inc: { [usageKey]: 1 } },
      { upsert: true }
    )

    res.json({ success: true, reply, agentName, agentType: type })
  } catch (err) {
    console.error('[agentController.agentChat]', err.message)
    if (err.status === 429) return res.status(429).json({ message: 'OpenAI rate limit. Please wait.' })
    res.status(500).json({ message: 'Agent error.', error: err.message })
  }
}

// ── POST /api/ai/resume ───────────────────────────────────────────────────────
exports.buildResume = async (req, res) => {
  try {
    const { name, email, phone, summary, skills, experience, education, targetRole } = req.body
    if (!name?.trim() || !skills || !experience) {
      return res.status(400).json({ message: 'name, skills, and experience are required.' })
    }

    const result = await agentSvc.buildResume({ name, email, phone, summary, skills, experience, education, targetRole })

    // Track usage
    await UserProfile.findOneAndUpdate(
      { userId: req.user._id },
      { $inc: { 'usage.resumeBuilds': 1 } },
      { upsert: true }
    )

    res.json({ success: true, resume: result })
  } catch (err) {
    console.error('[agentController.buildResume]', err.message)
    res.status(500).json({ message: 'Resume generation failed.', error: err.message })
  }
}

// ── POST /api/ai/video ────────────────────────────────────────────────────────
exports.buildVideo = async (req, res) => {
  try {
    const { topic, duration = 60 } = req.body
    if (!topic?.trim()) return res.status(400).json({ message: 'topic required' })

    const script = await agentSvc.buildVideoScript(topic.trim(), Number(duration))
    res.json({ success: true, script })
  } catch (err) {
    console.error('[agentController.buildVideo]', err.message)
    res.status(500).json({ message: 'Video script generation failed.', error: err.message })
  }
}

// ── GET /api/ai/nudge ─────────────────────────────────────────────────────────
exports.getNudge = async (req, res) => {
  try {
    const [goalCount, taskTotal, taskDone, chatDoc, profile] = await Promise.all([
      Goal.countDocuments({ userId: req.user._id }),
      Task.countDocuments({ userId: req.user._id }),
      Task.countDocuments({ userId: req.user._id, completed: true }),
      Chat.findOne({ userId: req.user._id, session: 'mentor' }),
      getOrCreateProfile(req.user._id),
    ])

    const stats = {
      goals:    goalCount,
      tasks:    taskTotal,
      taskDone,
      aiChats:  Math.floor((chatDoc?.messages?.length || 0) / 2),
    }

    const nudge = await agentSvc.generateNudge(stats, profile)
    res.json({ success: true, nudge })
  } catch (err) {
    console.error('[agentController.getNudge]', err.message)
    res.status(500).json({ message: 'Nudge generation failed.' })
  }
}

// ── GET /api/ai/user-profile ──────────────────────────────────────────────────
exports.getProfile = async (req, res) => {
  try {
    const profile = await getOrCreateProfile(req.user._id)
    res.json({ success: true, profile })
  } catch (err) {
    res.status(500).json({ message: 'Failed to load profile.' })
  }
}

// ── PUT /api/ai/user-profile ──────────────────────────────────────────────────
exports.updateProfile = async (req, res) => {
  try {
    const allowed = [
      'tone', 'interests', 'currentRole', 'targetRole', 'skills', 'notifications',
      'preferredTopics', 'careerPreferences', 'learningPreferences', 'knowledgeMemory',
    ]
    const updates = {}
    allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = req.body[k] })

    const profile = await UserProfile.findOneAndUpdate(
      { userId: req.user._id },
      { $set: updates },
      { new: true, upsert: true }
    )
    res.json({ success: true, profile })
  } catch (err) {
    res.status(500).json({ message: 'Failed to update profile.' })
  }
}
