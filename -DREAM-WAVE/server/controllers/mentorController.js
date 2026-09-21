const Chat = require('../models/Chat')
const UserProfile = require('../models/UserProfile')
const PlatformAnalytics = require('../models/PlatformAnalytics')
const { openai } = require('../utils/openaiClient')
const { buildMentorContext } = require('../services/mentorContextEngine')
const studentContextEngine = require('../services/studentContextEngine')
const knowledgeGraphService = require('../services/knowledgeGraphService')

async function resolveMentorContext(userId, options) {
  if (!knowledgeGraphService.isEnabled()) {
    return buildMentorContext(userId, options)
  }
  const v3 = await studentContextEngine.buildStudentContext(userId, options)
  return {
    sources: v3.provenance.map((item) => item.source),
    contextText: v3.text,
    intent: v3.intent,
    dataConfidence: v3.dataConfidence,
  }
}
const {
  buildSystemPrompt,
  buildMessagePayload,
  summarizeForStorage,
} = require('../services/mentorPromptService')

const VALID_FAITH = ['general', 'hindu', 'christian', 'muslim']
const VALID_MENTOR_MODES = ['general', 'study', 'goal', 'career', 'learning', 'project', 'research']
const VALID_DEPTH = ['quick', 'simple', 'standard', 'detailed', 'deep']
const LEGACY_SESSION = (faith) => `mentor_${faith}`
const CONV_SESSION = (id) => `mentor:conv:${id}`

function isLegacySession(session = '') {
  return /^mentor_(general|hindu|christian|muslim)$/.test(session)
}

function defaultTitle(message = '') {
  const clean = String(message || '').trim()
  if (!clean) return 'New conversation'
  return clean.length > 60 ? `${clean.slice(0, 57)}…` : clean
}

async function getOwnedChat(userId, conversationId) {
  const chat = await Chat.findOne({ _id: conversationId, userId })
  if (!chat) return null
  if (!chat.session.startsWith('mentor:') && !isLegacySession(chat.session)) return null
  return chat
}

async function trackUsage(userId, meta = {}) {
  PlatformAnalytics.create({
    eventType: 'mentor_chat',
    path: '/api/mentor/chat',
    userId,
    meta,
    day: new Date().toISOString().slice(0, 10),
  }).catch(() => {})
  UserProfile.findOneAndUpdate(
    { userId },
    { $inc: { 'usage.mentorChats': 1 }, $set: { lastActivity: new Date() } },
    { upsert: true },
  ).catch(() => {})
}

function serializeConversation(chat) {
  const last = [...(chat.messages || [])].reverse().find((item) => item.role === 'user')
    || [...(chat.messages || [])].reverse()[0]
  return {
    id: String(chat._id),
    title: chat.title || defaultTitle(last?.content),
    pinned: Boolean(chat.pinned),
    mentorMode: chat.mentorMode || 'general',
    faithMode: chat.faithMode || (isLegacySession(chat.session) ? chat.session.replace('mentor_', '') : 'general'),
    explanationDepth: chat.explanationDepth || 'standard',
    updatedAt: chat.updatedAt,
    createdAt: chat.createdAt,
    messageCount: chat.messages?.length || 0,
    preview: last?.content?.slice(0, 120) || '',
    legacy: isLegacySession(chat.session),
  }
}

exports.listConversations = async (req, res) => {
  try {
    const chats = await Chat.find({
      userId: req.user._id,
      archived: { $ne: true },
      $or: [
        { session: { $regex: /^mentor:/ } },
        { session: { $regex: /^mentor_(general|hindu|christian|muslim)$/ } },
      ],
    }).sort({ pinned: -1, updatedAt: -1 }).limit(50).lean()

    return res.json({ success: true, conversations: chats.map(serializeConversation) })
  } catch (error) {
    console.error('[mentor.listConversations]', error.message)
    return res.status(500).json({ success: false, message: 'Failed to load conversations.' })
  }
}

exports.createConversation = async (req, res) => {
  try {
    const faithMode = VALID_FAITH.includes(req.body.faithMode) ? req.body.faithMode : 'general'
    const mentorMode = VALID_MENTOR_MODES.includes(req.body.mentorMode) ? req.body.mentorMode : 'general'
    const explanationDepth = VALID_DEPTH.includes(req.body.explanationDepth) ? req.body.explanationDepth : 'standard'
    const chat = await Chat.create({
      userId: req.user._id,
      session: 'pending',
      title: req.body.title?.trim() || 'New conversation',
      mentorMode,
      faithMode,
      explanationDepth,
      messages: [],
    })
    chat.session = CONV_SESSION(chat._id)
    await chat.save()
    return res.status(201).json({ success: true, conversation: serializeConversation(chat) })
  } catch (error) {
    console.error('[mentor.createConversation]', error.message)
    return res.status(500).json({ success: false, message: 'Failed to create conversation.' })
  }
}

exports.getConversation = async (req, res) => {
  try {
    const chat = await getOwnedChat(req.user._id, req.params.id)
    if (!chat) return res.status(404).json({ success: false, message: 'Conversation not found.' })
    return res.json({
      success: true,
      conversation: serializeConversation(chat),
      messages: (chat.messages || []).slice(-60),
      summary: chat.summary || '',
    })
  } catch (error) {
    console.error('[mentor.getConversation]', error.message)
    return res.status(500).json({ success: false, message: 'Failed to load conversation.' })
  }
}

exports.updateConversation = async (req, res) => {
  try {
    const chat = await getOwnedChat(req.user._id, req.params.id)
    if (!chat) return res.status(404).json({ success: false, message: 'Conversation not found.' })

    if (req.body.title !== undefined) chat.title = String(req.body.title).trim().slice(0, 160)
    if (req.body.pinned !== undefined) chat.pinned = Boolean(req.body.pinned)
    if (req.body.mentorMode && VALID_MENTOR_MODES.includes(req.body.mentorMode)) chat.mentorMode = req.body.mentorMode
    if (req.body.faithMode && VALID_FAITH.includes(req.body.faithMode)) chat.faithMode = req.body.faithMode
    if (req.body.explanationDepth && VALID_DEPTH.includes(req.body.explanationDepth)) chat.explanationDepth = req.body.explanationDepth
    await chat.save()

    if (req.body.saveToMemory) {
      const snippet = [...(chat.messages || [])].reverse().find((item) => item.role === 'assistant')?.content?.slice(0, 200) || chat.title
      await UserProfile.findOneAndUpdate(
        { userId: req.user._id },
        {
          $push: {
            'knowledgeMemory.savedConversations': {
              $each: [{
                session: chat.session,
                snippet,
                savedAt: new Date(),
                confidence: 'explicit_user',
              }],
              $slice: -30,
            },
          },
        },
        { upsert: true },
      )
    }

    return res.json({ success: true, conversation: serializeConversation(chat) })
  } catch (error) {
    console.error('[mentor.updateConversation]', error.message)
    return res.status(500).json({ success: false, message: 'Failed to update conversation.' })
  }
}

exports.deleteConversation = async (req, res) => {
  try {
    const chat = await getOwnedChat(req.user._id, req.params.id)
    if (!chat) return res.status(404).json({ success: false, message: 'Conversation not found.' })
    await Chat.deleteOne({ _id: chat._id, userId: req.user._id })
    return res.json({ success: true, deleted: true })
  } catch (error) {
    console.error('[mentor.deleteConversation]', error.message)
    return res.status(500).json({ success: false, message: 'Failed to delete conversation.' })
  }
}

exports.searchConversations = async (req, res) => {
  try {
    const q = String(req.query.q || '').trim().slice(0, 120)
    if (!q) return res.json({ success: true, conversations: [] })
    const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
    const chats = await Chat.find({
      userId: req.user._id,
      archived: { $ne: true },
      $or: [
        { title: rx },
        { summary: rx },
        { 'messages.content': rx },
      ],
    }).sort({ updatedAt: -1 }).limit(20).lean()
    return res.json({ success: true, conversations: chats.map(serializeConversation) })
  } catch (error) {
    console.error('[mentor.searchConversations]', error.message)
    return res.status(500).json({ success: false, message: 'Conversation search failed.' })
  }
}

exports.getContextPreview = async (req, res) => {
  try {
    const context = await resolveMentorContext(req.user._id, {
      message: String(req.query.message || ''),
      mentorMode: req.query.mentorMode || 'general',
      action: req.query.action || '',
    })
    return res.json({ success: true, data: { sources: context.sources, preview: context.contextText.slice(0, 1200) } })
  } catch (error) {
    console.error('[mentor.contextPreview]', error.message)
    return res.status(500).json({ success: false, message: 'Context preview unavailable.' })
  }
}

async function resolveChatDocument(userId, { conversationId, faithMode = 'general' }) {
  if (conversationId) {
    const chat = await getOwnedChat(userId, conversationId)
    if (!chat) throw Object.assign(new Error('Conversation not found.'), { statusCode: 404 })
    return chat
  }

  const validFaith = VALID_FAITH.includes(faithMode) ? faithMode : 'general'
  const sessionKey = LEGACY_SESSION(validFaith)
  let chat = await Chat.findOne({ userId, session: sessionKey })
  if (!chat) {
    chat = new Chat({
      userId,
      session: sessionKey,
      title: `${validFaith.charAt(0).toUpperCase()}${validFaith.slice(1)} mentor chat`,
      faithMode: validFaith,
      mentorMode: 'general',
      messages: [],
    })
  }
  return chat
}

exports.mentorChat = async (req, res) => {
  try {
    const {
      message,
      mode,
      faithMode = mode,
      mentorMode = 'general',
      conversationId,
      action = '',
      explanationDepth,
    } = req.body

    if (!message?.trim()) {
      return res.status(400).json({ success: false, message: 'Message is required.' })
    }

    const chat = await resolveChatDocument(req.user._id, { conversationId, faithMode })
    const depth = VALID_DEPTH.includes(explanationDepth)
      ? explanationDepth
      : (VALID_DEPTH.includes(chat.explanationDepth) ? chat.explanationDepth : 'standard')
    const resolvedFaith = VALID_FAITH.includes(faithMode || mode) ? (faithMode || mode) : (chat.faithMode || 'general')
    const resolvedMentorMode = VALID_MENTOR_MODES.includes(mentorMode) ? mentorMode : (chat.mentorMode || 'general')

    chat.faithMode = resolvedFaith
    chat.mentorMode = resolvedMentorMode
    chat.explanationDepth = depth
    if (!chat.title || chat.title === 'New conversation') chat.title = defaultTitle(message)

    const context = await resolveMentorContext(req.user._id, {
      message: message.trim(),
      mentorMode: resolvedMentorMode,
      action,
    })

    const summary = chat.summary || summarizeForStorage(chat.messages || [])
    const systemPrompt = buildSystemPrompt({
      faithMode: resolvedFaith,
      mentorMode: resolvedMentorMode,
      depth,
      contextText: context.contextText,
      conversationSummary: summary,
      action,
    })

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.72,
      max_tokens: depth === 'quick' ? 900 : depth === 'simple' ? 1400 : 3000,
      messages: buildMessagePayload({
        systemPrompt,
        history: chat.messages || [],
        userMessage: message.trim(),
      }),
    })

    const reply = completion.choices[0]?.message?.content || 'I could not generate a response. Please try again.'

    chat.messages.push({
      role: 'user',
      content: message.trim(),
      metadata: { action, mentorMode: resolvedMentorMode },
    })
    chat.messages.push({ role: 'assistant', content: reply })
    if ((chat.messages || []).length > 16) chat.summary = summarizeForStorage(chat.messages)
    await chat.save()

    await trackUsage(req.user._id, {
      conversationId: String(chat._id),
      mentorMode: resolvedMentorMode,
      faithMode: resolvedFaith,
      action,
      success: true,
      tokens: completion.usage?.total_tokens || null,
    })

    return res.json({
      success: true,
      reply,
      conversationId: String(chat._id),
      mode: resolvedFaith,
      mentorMode: resolvedMentorMode,
      contextSources: context.sources,
      suggestions: buildSuggestions(context, resolvedMentorMode),
    })
  } catch (error) {
    console.error('[mentorController.mentorChat]', error.message)
    await trackUsage(req.user._id, { success: false, error: error.message }).catch(() => {})
    if (error.statusCode === 404) return res.status(404).json({ success: false, message: error.message })
    if (error.status === 429) return res.status(429).json({ success: false, message: 'AI rate limit. Please wait a moment.' })
    return res.status(500).json({ success: false, message: 'Mentor is temporarily unavailable. Please try again.' })
  }
}

function buildSuggestions(context, mentorMode) {
  const items = []
  if (context.loaded?.goals?.length) items.push({ label: 'Open top goal', url: `/student/goals?goalId=${context.loaded.goals[0]._id}` })
  if (context.loaded?.tasks?.length) items.push({ label: 'Open tasks', url: '/student/tasks' })
  if (context.loaded?.roadmaps?.length) items.push({ label: 'View roadmap', url: `/student/roadmap?goalId=${context.loaded.roadmaps[0].goalId?._id || ''}` })
  if (context.loaded?.reading?.length) items.push({ label: 'Continue reading', url: `/library/books/${context.loaded.reading[0].bookId._id}` })
  if (mentorMode === 'career') items.push({ label: 'Career hub', url: '/student/career' })
  if (mentorMode !== 'general') items.push({ label: 'AI Home', url: '/student/intelligence' })
  return items.slice(0, 4)
}

exports.getMentorAdvice = async (req, res) => {
  req.body.faithMode = req.body.faithMode || req.body.mode || 'general'
  return exports.mentorChat(req, res)
}

exports.getMentorHistory = async (req, res) => {
  try {
    const { mode, conversationId } = req.query
    if (conversationId) {
      const chat = await getOwnedChat(req.user._id, conversationId)
      if (!chat) return res.status(404).json({ success: false, message: 'Conversation not found.' })
      return res.json({ success: true, messages: chat.messages?.slice(-40) || [], conversationId: String(chat._id) })
    }

    const validMode = VALID_FAITH.includes(mode) ? mode : 'general'
    const chatDoc = await Chat.findOne({ userId: req.user._id, session: LEGACY_SESSION(validMode) })
    const messages = chatDoc?.messages?.slice(-40) || []
    return res.json({
      success: true,
      messages,
      conversationId: chatDoc ? String(chatDoc._id) : null,
    })
  } catch (error) {
    console.error('[mentorController.history]', error.message)
    return res.status(500).json({ success: false, message: 'Failed to load history.' })
  }
}

exports.clearMentorHistory = async (req, res) => {
  try {
    const { mode, conversationId } = req.query
    if (conversationId) {
      const chat = await getOwnedChat(req.user._id, conversationId)
      if (!chat) return res.status(404).json({ success: false, message: 'Conversation not found.' })
      chat.messages = []
      chat.summary = ''
      await chat.save()
      return res.json({ success: true, message: 'Conversation cleared.' })
    }

    const validMode = VALID_FAITH.includes(mode) ? mode : 'general'
    await Chat.findOneAndUpdate(
      { userId: req.user._id, session: LEGACY_SESSION(validMode) },
      { $set: { messages: [], summary: '' } },
    )
    return res.json({ success: true, message: 'Chat history cleared.' })
  } catch (error) {
    console.error('[mentorController.clear]', error.message)
    return res.status(500).json({ success: false, message: 'Failed to clear history.' })
  }
}

exports.removeSavedMemory = async (req, res) => {
  try {
    const index = Number(req.params.index)
    const profile = await UserProfile.findOne({ userId: req.user._id })
    if (!profile) return res.json({ success: true, removed: false })
    const saved = profile.knowledgeMemory?.savedConversations || []
    if (Number.isInteger(index) && index >= 0 && index < saved.length) {
      saved.splice(index, 1)
      profile.knowledgeMemory.savedConversations = saved
      await profile.save()
    }
    return res.json({ success: true, removed: true })
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update saved memory.' })
  }
}
